import pandas as pd
import yfinance as yf

from data.base import DataFeed


class USDataFeed(DataFeed):
    """미국 주식 시세. symbol은 티커 (예: 'AAPL')."""

    def get_ohlcv(self, symbol: str, start: str, end: str) -> pd.DataFrame:
        df = yf.download(symbol, start=start, end=end, progress=False, auto_adjust=True)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df = df[["Open", "High", "Low", "Close", "Volume"]].dropna()
        df.index = pd.to_datetime(df.index)
        return df.sort_index()
