from abc import ABC, abstractmethod

import pandas as pd


class Strategy(ABC):
    """매매 전략 표준 인터페이스.

    generate_signals()는 원본 df에 최소한 'signal' 컬럼을 추가해 반환해야 한다.
    signal: 1 = 매수 진입, -1 = 매도(청산), 0 = 유지.
    """

    @abstractmethod
    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        ...
