"""백테스트 실행 진입점.

예시:
    python main.py --market kr --symbol 005930 --start 2020-01-01 --end 2024-01-01
    python main.py --market us --symbol AAPL --short 10 --long 30 --plot
"""

import argparse

import matplotlib.pyplot as plt

from backtest.engine import BacktestEngine
from config import (
    DEFAULT_COMMISSION_RATE,
    DEFAULT_INITIAL_CASH,
    DEFAULT_LONG_WINDOW,
    DEFAULT_SHORT_WINDOW,
)
from data.kr_feed import KRDataFeed
from data.us_feed import USDataFeed
from strategies.moving_average import MovingAverageCrossStrategy

FEEDS = {"kr": KRDataFeed, "us": USDataFeed}


def parse_args():
    parser = argparse.ArgumentParser(description="이동평균 교차 전략 백테스트")
    parser.add_argument("--market", choices=FEEDS.keys(), required=True, help="kr 또는 us")
    parser.add_argument("--symbol", required=True, help="종목코드(kr) 또는 티커(us)")
    parser.add_argument("--start", default="2019-01-01")
    parser.add_argument("--end", default=None, help="비우면 오늘까지")
    parser.add_argument("--short", type=int, default=DEFAULT_SHORT_WINDOW)
    parser.add_argument("--long", type=int, default=DEFAULT_LONG_WINDOW)
    parser.add_argument("--cash", type=float, default=DEFAULT_INITIAL_CASH)
    parser.add_argument("--commission", type=float, default=DEFAULT_COMMISSION_RATE)
    parser.add_argument("--plot", action="store_true", help="results/에 자산곡선 차트 저장")
    return parser.parse_args()


def main():
    args = parse_args()

    feed = FEEDS[args.market]()
    df = feed.get_ohlcv(args.symbol, args.start, args.end)
    if df.empty:
        print(f"데이터를 가져오지 못했습니다: market={args.market} symbol={args.symbol}")
        return

    strategy = MovingAverageCrossStrategy(short_window=args.short, long_window=args.long)
    df = strategy.generate_signals(df)

    engine = BacktestEngine(initial_cash=args.cash, commission_rate=args.commission)
    result = engine.run(df)

    print(f"종목: {args.market}/{args.symbol}  기간: {df.index[0].date()} ~ {df.index[-1].date()}")
    print(f"전략: MA({args.short}/{args.long})  초기자금: {args.cash:,.0f}")
    print("-" * 50)
    print(f"최종 자산     : {result['final_equity']:,.0f}")
    print(f"총 수익률     : {result['total_return'] * 100:.2f}%")
    print(f"연평균 수익률 : {result['cagr'] * 100:.2f}%")
    print(f"최대 낙폭(MDD): {result['mdd'] * 100:.2f}%")
    print(f"샤프 비율     : {result['sharpe']:.2f}")
    print(f"매매 횟수     : {result['num_trades']}")
    print(f"승률          : {result['win_rate'] * 100:.2f}%")

    if args.plot:
        # 한글 폰트가 없는 환경에서도 깨지지 않도록 차트 라벨은 영어로 고정
        fig, ax = plt.subplots(figsize=(10, 5))
        result["equity_curve"].plot(ax=ax, label="Strategy")
        (df["Close"] / df["Close"].iloc[0] * args.cash).plot(ax=ax, label="Buy & Hold", alpha=0.6)
        ax.set_title(f"{args.market}/{args.symbol} backtest result")
        ax.set_ylabel("Equity")
        ax.legend()
        out_path = f"results/{args.market}_{args.symbol}_equity.png"
        fig.savefig(out_path, dpi=120, bbox_inches="tight")
        print(f"차트 저장: {out_path}")


if __name__ == "__main__":
    main()
