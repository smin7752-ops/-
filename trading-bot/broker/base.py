from abc import ABC, abstractmethod


class Broker(ABC):
    """실전 자동매매를 붙일 때 구현할 증권사 어댑터 인터페이스.

    지금은 백테스트만 지원하므로 구현체가 없다. 나중에 한국투자증권(KIS),
    키움 Open API 등을 붙일 때 이 인터페이스를 구현한 클래스를 추가하면 된다.
    """

    @abstractmethod
    def get_balance(self) -> float:
        ...

    @abstractmethod
    def place_order(self, symbol: str, quantity: int, side: str) -> dict:
        ...
