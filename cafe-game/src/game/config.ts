export interface MenuItem {
  id: string;
  name: string;
  emoji: string;
  /** base coins earned when this order is served */
  reward: number;
  /** coins needed to unlock this item */
  unlockCost: number;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "coffee", name: "커피", emoji: "☕", reward: 5, unlockCost: 0 },
  { id: "juice", name: "주스", emoji: "🧃", reward: 8, unlockCost: 80 },
  { id: "sandwich", name: "샌드위치", emoji: "🥪", reward: 14, unlockCost: 250 },
  { id: "cake", name: "케이크", emoji: "🍰", reward: 22, unlockCost: 600 },
  { id: "pasta", name: "파스타", emoji: "🍝", reward: 35, unlockCost: 1500 },
];

export const MAX_TABLES = 8;
export const STARTING_TABLES = 3;

/** cost to unlock the Nth table (index = tables already owned) */
export function tableCost(currentTableCount: number): number {
  return Math.round(60 * Math.pow(1.9, currentTableCount - STARTING_TABLES));
}

export const MAX_STAFF_LEVEL = 5;

/** cost to hire/upgrade the barista to the given level */
export function staffCost(currentLevel: number): number {
  return Math.round(150 * Math.pow(2.2, currentLevel));
}

/** how often (ms) the auto-barista serves a customer at each level; 0 = no staff */
export function staffServeIntervalMs(level: number): number {
  if (level <= 0) return 0;
  return Math.max(1200, 6000 - level * 900);
}

export const CUSTOMER_PATIENCE_MS = 9000;
export const BASE_SPAWN_INTERVAL_MS = 3200;

export const SAVE_KEY = "cafe-idle-save-v1";

export const OFFLINE_EARNINGS_CAP_MS = 8 * 60 * 60 * 1000; // 8 hours
/** fraction of the active auto-barista income counted while offline */
export const OFFLINE_EARNINGS_RATE = 0.5;
