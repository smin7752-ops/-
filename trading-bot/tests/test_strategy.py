import pandas as pd

from backtest.engine import BacktestEngine
from strategies.moving_average import MovingAverageCrossStrategy


def make_price_df(prices):
    idx = pd.date_range("2020-01-01", periods=len(prices), freq="D")
    return pd.DataFrame(
        {"Open": prices, "High": prices, "Low": prices, "Close": prices, "Volume": [1000] * len(prices)},
        index=idx,
    )


def test_generates_buy_then_sell_signal():
    prices = [10] * 5 + list(range(10, 30)) + list(range(30, 10, -1))
    df = make_price_df(prices)
    strategy = MovingAverageCrossStrategy(short_window=3, long_window=5)
    result = strategy.generate_signals(df)

    assert (result["signal"] == 1).any()
    assert (result["signal"] == -1).any()


def test_backtest_engine_tracks_equity():
    prices = [10] * 5 + list(range(10, 30)) + list(range(30, 10, -1))
    df = make_price_df(prices)
    strategy = MovingAverageCrossStrategy(short_window=3, long_window=5)
    df = strategy.generate_signals(df)

    engine = BacktestEngine(initial_cash=1_000_000, commission_rate=0.0015)
    result = engine.run(df)

    assert result["final_equity"] > 0
    assert len(result["equity_curve"]) == len(df)
