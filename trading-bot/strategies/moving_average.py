import pandas as pd

from strategies.base import Strategy


class MovingAverageCrossStrategy(Strategy):
    """이동평균 교차 전략 (골든크로스/데드크로스).

    단기 이동평균이 장기 이동평균을 위로 뚫으면 매수, 아래로 뚫으면 매도.
    """

    def __init__(self, short_window: int = 20, long_window: int = 60):
        if short_window >= long_window:
            raise ValueError("short_window는 long_window보다 작아야 합니다.")
        self.short_window = short_window
        self.long_window = long_window

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["ma_short"] = df["Close"].rolling(self.short_window).mean()
        df["ma_long"] = df["Close"].rolling(self.long_window).mean()

        df["position"] = 0
        df.loc[df["ma_short"] > df["ma_long"], "position"] = 1
        df["position"] = df["position"].where(df["ma_long"].notna(), 0)

        df["signal"] = df["position"].diff().fillna(0).clip(-1, 1)
        return df
