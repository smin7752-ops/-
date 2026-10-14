import pandas as pd

from backtest.metrics import cagr, mdd, sharpe_ratio, win_rate


class BacktestEngine:
    """전량 매수/전량 매도 방식의 단순 백테스트 엔진.

    signal == 1 인 날 종가로 전액 매수, signal == -1 인 날 종가로 전액 매도.
    분할매수/레버리지는 다루지 않는다 (전략 비교용 단순 모델).
    """

    def __init__(self, initial_cash: float, commission_rate: float = 0.0):
        self.initial_cash = initial_cash
        self.commission_rate = commission_rate

    def run(self, df: pd.DataFrame) -> dict:
        cash = self.initial_cash
        shares = 0
        equity_curve = []
        trades = []
        entry_price = None

        for date, row in df.iterrows():
            price = row["Close"]
            signal = row["signal"]

            if signal == 1 and shares == 0:
                shares = (cash * (1 - self.commission_rate)) // price
                cash -= shares * price * (1 + self.commission_rate)
                entry_price = price
            elif signal == -1 and shares > 0:
                proceeds = shares * price * (1 - self.commission_rate)
                cash += proceeds
                pnl = proceeds - shares * entry_price
                trades.append({"date": date, "entry_price": entry_price, "exit_price": price, "pnl": pnl})
                shares = 0
                entry_price = None

            equity_curve.append(cash + shares * price)

        df = df.copy()
        df["equity"] = equity_curve
        returns = df["equity"].pct_change().fillna(0)
        trades_df = pd.DataFrame(trades)

        return {
            "equity_curve": df["equity"],
            "trades": trades_df,
            "final_equity": df["equity"].iloc[-1],
            "total_return": df["equity"].iloc[-1] / self.initial_cash - 1,
            "cagr": cagr(df["equity"]),
            "mdd": mdd(df["equity"]),
            "sharpe": sharpe_ratio(returns),
            "win_rate": win_rate(trades_df),
            "num_trades": len(trades_df),
        }
