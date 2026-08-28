import {
  MENU_ITEMS,
  OFFLINE_EARNINGS_CAP_MS,
  OFFLINE_EARNINGS_RATE,
  SAVE_KEY,
  STARTING_TABLES,
  staffServeIntervalMs,
} from "./config";

export interface SaveData {
  coins: number;
  tables: number;
  staffLevel: number;
  unlockedMenuIds: string[];
  lastSavedAt: number;
  totalEarned: number;
}

function defaultSave(): SaveData {
  return {
    coins: 20,
    tables: STARTING_TABLES,
    staffLevel: 0,
    unlockedMenuIds: [MENU_ITEMS[0].id],
    lastSavedAt: Date.now(),
    totalEarned: 0,
  };
}

class GameState {
  data: SaveData;
  /** coins earned while the player was away, computed once at load time */
  offlineEarnings = 0;
  offlineDurationMs = 0;

  constructor() {
    this.data = this.load();
    this.applyOfflineEarnings();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return { ...defaultSave(), ...parsed };
    } catch {
      return defaultSave();
    }
  }

  save() {
    this.data.lastSavedAt = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // storage unavailable (private mode etc.) — silently skip
    }
  }

  private applyOfflineEarnings() {
    const elapsed = Math.min(
      Date.now() - this.data.lastSavedAt,
      OFFLINE_EARNINGS_CAP_MS,
    );
    if (elapsed < 15000 || this.data.staffLevel <= 0) {
      this.offlineEarnings = 0;
      this.offlineDurationMs = 0;
      return;
    }
    const interval = staffServeIntervalMs(this.data.staffLevel);
    const avgReward = this.averageUnlockedReward();
    const serves = elapsed / interval;
    const earned = Math.round(serves * avgReward * OFFLINE_EARNINGS_RATE);
    this.offlineEarnings = earned;
    this.offlineDurationMs = elapsed;
    if (earned > 0) {
      this.data.coins += earned;
      this.data.totalEarned += earned;
    }
  }

  private averageUnlockedReward(): number {
    const unlocked = MENU_ITEMS.filter((m) =>
      this.data.unlockedMenuIds.includes(m.id),
    );
    if (unlocked.length === 0) return MENU_ITEMS[0].reward;
    return unlocked.reduce((sum, m) => sum + m.reward, 0) / unlocked.length;
  }

  addCoins(amount: number) {
    this.data.coins += amount;
    if (amount > 0) this.data.totalEarned += amount;
  }

  spendCoins(amount: number): boolean {
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    return true;
  }

  unlockedMenu() {
    return MENU_ITEMS.filter((m) => this.data.unlockedMenuIds.includes(m.id));
  }

  nextLockedMenu() {
    return MENU_ITEMS.find(
      (m) => !this.data.unlockedMenuIds.includes(m.id),
    );
  }
}

export type { GameState };
export const gameState = new GameState();
