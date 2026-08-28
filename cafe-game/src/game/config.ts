/* ------------------------------------------------------------------ *
 * 게임 밸런스 값 모음.
 * 숫자를 바꾸고 저장하면 바로 화면에 반영됩니다.
 * ------------------------------------------------------------------ */

export type Category = "drink" | "dessert";

export interface MenuDef {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  /** 이 메뉴를 팔려면 필요한 설비 */
  equipmentId: string;
  /** 레벨 1 기준 판매가 */
  basePrice: number;
  /** 발주할 때 재고 1개당 원가 */
  supplyCost: number;
  /** 만드는 데 걸리는 시간(ms) */
  makeTimeMs: number;
  /** 같은 분류의 "앞 메뉴"가 이 레벨에 도달하면 해금 (첫 메뉴는 0) */
  unlockPrevLevel: number;
}

export interface EquipmentDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  desc: string;
}

export interface SetDef {
  id: string;
  name: string;
  emoji: string;
  drinkId: string;
  dessertId: string;
  /** 두 메뉴 값의 합에 곱해지는 보너스 */
  bonusRate: number;
}

/* ----------------------------- 설비 ----------------------------- */

export const EQUIPMENT: EquipmentDef[] = [
  {
    id: "coffee_machine",
    name: "커피머신",
    emoji: "☕",
    cost: 0,
    desc: "기본으로 드려요. 커피를 만들 수 있어요",
  },
  {
    id: "showcase",
    name: "쇼케이스",
    emoji: "🧁",
    cost: 400,
    desc: "디저트를 진열해서 팔 수 있어요",
  },
  {
    id: "tea_station",
    name: "티 스테이션",
    emoji: "🫖",
    cost: 1800,
    desc: "차 종류를 만들 수 있어요",
  },
  {
    id: "blender",
    name: "블렌더",
    emoji: "🥤",
    cost: 6000,
    desc: "에이드·스무디를 만들 수 있어요",
  },
  {
    id: "oven",
    name: "오븐",
    emoji: "🥖",
    cost: 18000,
    desc: "갓 구운 베이커리를 만들 수 있어요",
  },
];

export const STARTING_EQUIPMENT = ["coffee_machine"];

/* ----------------------------- 메뉴 ----------------------------- */
/* 배열 순서 = 해금 순서입니다. 앞 메뉴를 일정 레벨까지 키우면 다음이 열려요. */

export const DRINKS: MenuDef[] = [
  { id: "americano", name: "아메리카노", emoji: "☕", category: "drink", equipmentId: "coffee_machine", basePrice: 10, supplyCost: 3, makeTimeMs: 1200, unlockPrevLevel: 0 },
  { id: "latte", name: "카페라떼", emoji: "🥛", category: "drink", equipmentId: "coffee_machine", basePrice: 18, supplyCost: 5, makeTimeMs: 1600, unlockPrevLevel: 3 },
  { id: "icetea", name: "아이스티", emoji: "🧊", category: "drink", equipmentId: "tea_station", basePrice: 30, supplyCost: 8, makeTimeMs: 1400, unlockPrevLevel: 5 },
  { id: "ade", name: "레몬에이드", emoji: "🍋", category: "drink", equipmentId: "blender", basePrice: 48, supplyCost: 13, makeTimeMs: 1800, unlockPrevLevel: 7 },
  { id: "smoothie", name: "딸기스무디", emoji: "🍓", category: "drink", equipmentId: "blender", basePrice: 76, supplyCost: 20, makeTimeMs: 2200, unlockPrevLevel: 9 },
  { id: "matcha", name: "말차라떼", emoji: "🍵", category: "drink", equipmentId: "tea_station", basePrice: 120, supplyCost: 32, makeTimeMs: 2000, unlockPrevLevel: 11 },
];

export const DESSERTS: MenuDef[] = [
  { id: "cookie", name: "쿠키", emoji: "🍪", category: "dessert", equipmentId: "showcase", basePrice: 14, supplyCost: 4, makeTimeMs: 600, unlockPrevLevel: 0 },
  { id: "croissant", name: "크루아상", emoji: "🥐", category: "dessert", equipmentId: "oven", basePrice: 26, supplyCost: 7, makeTimeMs: 900, unlockPrevLevel: 3 },
  { id: "cheesecake", name: "치즈케이크", emoji: "🍰", category: "dessert", equipmentId: "showcase", basePrice: 42, supplyCost: 12, makeTimeMs: 800, unlockPrevLevel: 5 },
  { id: "macaron", name: "마카롱", emoji: "🍬", category: "dessert", equipmentId: "showcase", basePrice: 66, supplyCost: 18, makeTimeMs: 700, unlockPrevLevel: 7 },
  { id: "tiramisu", name: "티라미수", emoji: "🍮", category: "dessert", equipmentId: "showcase", basePrice: 104, supplyCost: 28, makeTimeMs: 1000, unlockPrevLevel: 9 },
  { id: "tart", name: "딸기타르트", emoji: "🥧", category: "dessert", equipmentId: "oven", basePrice: 165, supplyCost: 45, makeTimeMs: 1100, unlockPrevLevel: 11 },
];

export const ALL_MENU: MenuDef[] = [...DRINKS, ...DESSERTS];

export function menuById(id: string): MenuDef {
  const found = ALL_MENU.find((m) => m.id === id);
  if (!found) throw new Error(`unknown menu id: ${id}`);
  return found;
}

export function menuListOf(category: Category): MenuDef[] {
  return category === "drink" ? DRINKS : DESSERTS;
}

/* ---------------------------- 세트 메뉴 --------------------------- */

export const SETS: SetDef[] = [
  { id: "morning", name: "모닝세트", emoji: "🌅", drinkId: "americano", dessertId: "cookie", bonusRate: 1.15 },
  { id: "brunch", name: "브런치세트", emoji: "🥯", drinkId: "latte", dessertId: "croissant", bonusRate: 1.2 },
  { id: "afternoon", name: "애프터눈세트", emoji: "🫖", drinkId: "icetea", dessertId: "cheesecake", bonusRate: 1.25 },
  { id: "sweet", name: "스위트세트", emoji: "🍭", drinkId: "ade", dessertId: "macaron", bonusRate: 1.3 },
  { id: "premium", name: "프리미엄세트", emoji: "✨", drinkId: "smoothie", dessertId: "tiramisu", bonusRate: 1.35 },
  { id: "signature", name: "시그니처세트", emoji: "👑", drinkId: "matcha", dessertId: "tart", bonusRate: 1.45 },
];

/** 세트를 팔 수 있을 때, 손님이 단품 대신 세트를 주문할 확률 */
export const SET_ORDER_CHANCE = 0.4;

/* ---------------------------- 메뉴 레벨 --------------------------- */

export const MAX_MENU_LEVEL = 20;

/** 다음 레벨까지 필요한 판매 횟수 */
export function expToNext(level: number): number {
  return 5 + (level - 1) * 4;
}

/** 레벨에 따른 판매가 배수 (레벨 1 = 1.0) */
export function priceMultiplier(level: number): number {
  return 1 + (level - 1) * 0.1;
}

/* ------------------------------ 매장 ------------------------------ */

export const MAX_FLOORS = 4;
export const TABLES_PER_FLOOR = 6;
export const STARTING_TABLES = 3;

/** floorIndex 층(0부터)을 여는 데 드는 비용 */
export function floorUnlockCost(floorIndex: number): number {
  return Math.round(5000 * Math.pow(4, floorIndex - 1));
}

/** 그 층에 테이블을 하나 더 놓는 비용 */
export function tableCost(tablesOnFloor: number, floorIndex: number): number {
  return Math.round(
    120 * Math.pow(2, tablesOnFloor - STARTING_TABLES) * (1 + floorIndex * 0.6),
  );
}

/* ------------------------------ 직원 ------------------------------ */

export type Role = "barista" | "server" | "manager";

export const MAX_ROLE_LEVEL = 3;

export const ROLE_INFO: Record<
  Role,
  { name: string; emoji: string; desc: string; baseCost: number }
> = {
  barista: {
    name: "바리스타",
    emoji: "👩‍🍳",
    desc: "주문을 자동으로 만들어줘요 (없으면 손님을 눌러 직접 만들어야 해요)",
    baseCost: 500,
  },
  server: {
    name: "직원",
    emoji: "🧑‍💼",
    desc: "자동으로 서빙하고 테이블을 치워요 (없으면 직접 눌러야 해요)",
    baseCost: 800,
  },
  manager: {
    name: "매니저",
    emoji: "🕴️",
    desc: "손님이 더 빨리 들어와요",
    baseCost: 2000,
  },
};

export function roleCost(role: Role, currentLevel: number, floorIndex: number): number {
  const base = ROLE_INFO[role].baseCost;
  return Math.round(base * Math.pow(2.6, currentLevel) * (1 + floorIndex * 0.8));
}

/** 바리스타 제조 속도 배수. 0 = 미고용(수동) */
export function baristaSpeed(level: number): number {
  return level <= 0 ? 0 : 1 + (level - 1) * 0.7;
}

/** 직원이 서빙까지 걸리는 시간(ms). Infinity = 미고용(수동) */
export function serveDelayMs(serverLevel: number): number {
  return serverLevel <= 0 ? Infinity : 2600 - serverLevel * 600;
}

/** 직원이 테이블을 치우는 데 걸리는 시간(ms). Infinity = 미고용(수동) */
export function cleanDelayMs(serverLevel: number): number {
  return serverLevel <= 0 ? Infinity : 3200 - serverLevel * 700;
}

export const BASE_SPAWN_INTERVAL_MS = 4200;

/** 매니저 레벨에 따른 손님 등장 간격(ms) */
export function spawnIntervalMs(managerLevel: number): number {
  return BASE_SPAWN_INTERVAL_MS / (1 + managerLevel * 0.4);
}

/* --------------------------- 총괄 매니저 --------------------------- */

export const GENERAL_MANAGER_COST = 40000;
/** 총괄 매니저가 자동 발주를 넣는 재고 기준선 */
export const AUTO_RESTOCK_THRESHOLD = 8;
export const AUTO_RESTOCK_BATCH = 20;

/* ------------------------------ 발주 ------------------------------ */

export const SUPPLY_BATCH = 10;
export const STARTING_STOCK = 20;
export const MAX_STOCK = 999;

/* ------------------------ 손님 / 시간 관련 ------------------------ */

export const CUSTOMER_PATIENCE_MS = 14000;
export const WALK_TIME_MS = 700;
export const EAT_TIME_MS = 2600;

/* ------------------------------ 저장 ------------------------------ */

export const SAVE_KEY = "cafe-idle-save-v2";

export const OFFLINE_EARNINGS_CAP_MS = 8 * 60 * 60 * 1000;
/** 이만큼은 자리를 비워야 "다시 오셨네요" 정산을 합니다 (잠깐 나갔다 온 건 제외) */
export const OFFLINE_MIN_AWAY_MS = 2 * 60 * 1000;
/** 총괄 매니저가 없으면 재고가 금방 떨어지므로 이 시간까지만 인정 */
export const OFFLINE_NO_GM_CAP_MS = 60 * 60 * 1000;
/** 자리를 비운 동안에는 이 비율만큼만 벌어요 */
export const OFFLINE_EARNINGS_RATE = 0.6;
