import numpy as np
import pandas as pd


def cagr(equity: pd.Series, periods_per_year: int = 252) -> float:
    total_return = equity.iloc[-1] / equity.iloc[0]
    years = len(equity) / periods_per_year
    if years <= 0:
        return 0.0
    return total_return ** (1 / years) - 1


def mdd(equity: pd.Series) -> float:
    running_max = equity.cummax()
    drawdown = equity / running_max - 1
    return drawdown.min()


def sharpe_ratio(returns: pd.Series, periods_per_year: int = 252, risk_free: float = 0.0) -> float:
    excess = returns - risk_free / periods_per_year
    std = excess.std()
    if std == 0 or np.isnan(std):
        return 0.0
    return (excess.mean() / std) * np.sqrt(periods_per_year)


def win_rate(trades: pd.DataFrame) -> float:
    if trades.empty:
        return 0.0
    return (trades["pnl"] > 0).mean()
