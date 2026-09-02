import FinanceDataReader as fdr
import pandas as pd

from data.base import DataFeed


class KRDataFeed(DataFeed):
    """한국 주식(코스피/코스닥) 시세. symbol은 종목코드 (예: '005930' 삼성전자)."""

    def get_ohlcv(self, symbol: str, start: str, end: str) -> pd.DataFrame:
        df = fdr.DataReader(symbol, start, end)
        df = df[["Open", "High", "Low", "Close", "Volume"]].dropna()
        df.index = pd.to_datetime(df.index)
        return df.sort_index()
