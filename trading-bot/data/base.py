from abc import ABC, abstractmethod

import pandas as pd


class DataFeed(ABC):
    """시세 데이터를 가져오는 표준 인터페이스.

    어떤 시장이든 get_ohlcv()는 Open/High/Low/Close/Volume 컬럼을 가진
    DataFrame(인덱스=날짜, 오름차순)을 반환해야 한다.
    """

    @abstractmethod
    def get_ohlcv(self, symbol: str, start: str, end: str) -> pd.DataFrame:
        ...
