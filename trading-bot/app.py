"""백테스트 웹 UI.

실행:
    streamlit run app.py
"""

import pandas as pd
import streamlit as st

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

FEEDS = {
    "국내 주식 (코스피/코스닥)": ("kr", KRDataFeed),
    "미국 주식": ("us", USDataFeed),
}

st.set_page_config(page_title="주식 백테스트", page_icon="📈", layout="wide")

st.title("📈 주식 백테스트")
st.caption("과거 데이터로 매매 전략을 미리 시험해보는 도구입니다. 실제 돈으로 거래하지 않습니다.")

with st.sidebar:
    st.header("설정")

    market_label = st.selectbox("시장", list(FEEDS.keys()))
    market, feed_cls = FEEDS[market_label]

    default_symbol = "005930" if market == "kr" else "AAPL"
    symbol = st.text_input(
        "종목코드 / 티커",
        value=default_symbol,
        help="국내는 종목코드(예: 005930 삼성전자), 미국은 티커(예: AAPL)를 입력하세요.",
    )

    col1, col2 = st.columns(2)
    start_date = col1.date_input("시작일", value=pd.Timestamp("2020-01-01"))
    end_date = col2.date_input("종료일", value=pd.Timestamp.today())

    st.subheader("전략: 이동평균 교차")
    short_window = st.number_input("단기 이동평균(일)", min_value=2, max_value=200, value=DEFAULT_SHORT_WINDOW)
    long_window = st.number_input("장기 이동평균(일)", min_value=3, max_value=400, value=DEFAULT_LONG_WINDOW)

    st.subheader("자금")
    cash = st.number_input("초기 자금", min_value=100_000, value=DEFAULT_INITIAL_CASH, step=100_000)
    commission = st.number_input(
        "수수료율", min_value=0.0, max_value=0.01, value=DEFAULT_COMMISSION_RATE, step=0.0001, format="%.5f"
    )

    run = st.button("백테스트 실행", type="primary", use_container_width=True)

if not run:
    st.info("왼쪽에서 종목과 기간을 설정한 뒤 **백테스트 실행** 버튼을 눌러주세요.")
    st.stop()

if short_window >= long_window:
    st.error("단기 이동평균 기간은 장기 이동평균 기간보다 짧아야 합니다.")
    st.stop()

if start_date >= end_date:
    st.error("시작일은 종료일보다 빨라야 합니다.")
    st.stop()

with st.spinner("데이터를 가져오는 중..."):
    try:
        feed = feed_cls()
        df = feed.get_ohlcv(symbol, start_date.isoformat(), end_date.isoformat())
    except Exception as e:
        st.error(f"데이터를 가져오지 못했습니다. 종목코드/티커가 맞는지 확인해주세요.\n\n({e})")
        st.stop()

if df.empty:
    st.error("해당 기간에 데이터가 없습니다. 종목코드와 기간을 확인해주세요.")
    st.stop()

strategy = MovingAverageCrossStrategy(short_window=short_window, long_window=long_window)
df = strategy.generate_signals(df)

engine = BacktestEngine(initial_cash=cash, commission_rate=commission)
result = engine.run(df)

st.subheader(f"{market_label} · {symbol}  ({df.index[0].date()} ~ {df.index[-1].date()})")

c1, c2, c3, c4, c5, c6 = st.columns(6)
c1.metric("최종 자산", f"{result['final_equity']:,.0f}")
c2.metric("총 수익률", f"{result['total_return'] * 100:.2f}%")
c3.metric("연평균 수익률", f"{result['cagr'] * 100:.2f}%")
c4.metric("최대 낙폭(MDD)", f"{result['mdd'] * 100:.2f}%")
c5.metric("샤프 비율", f"{result['sharpe']:.2f}")
c6.metric("매매 횟수", str(result["num_trades"]), help=f"승률 {result['win_rate'] * 100:.0f}%")

st.subheader("자산 변화")
chart_df = pd.DataFrame(
    {
        "전략": result["equity_curve"],
        "단순 보유 (Buy & Hold)": df["Close"] / df["Close"].iloc[0] * cash,
    }
)
st.line_chart(chart_df)

if not result["trades"].empty:
    st.subheader("매매 내역")
    trades_view = result["trades"].rename(
        columns={"date": "청산일", "entry_price": "매수가", "exit_price": "매도가", "pnl": "손익"}
    )
    for col in ["매수가", "매도가", "손익"]:
        trades_view[col] = trades_view[col].round(0)
    st.dataframe(
        trades_view,
        use_container_width=True,
        hide_index=True,
        column_config={
            "매수가": st.column_config.NumberColumn(format="%d"),
            "매도가": st.column_config.NumberColumn(format="%d"),
            "손익": st.column_config.NumberColumn(format="%d"),
        },
    )
else:
    st.caption("이 기간에는 매매가 발생하지 않았습니다.")
