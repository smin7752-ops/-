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
    cost: 250,
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
  { id: "americano", name: "아메리카노", emoji: "☕", category: "drink", equipmentId: "coffee_machine", basePrice: 22, supplyCost: 4, makeTimeMs: 1200, unlockPrevLevel: 0 },
  { id: "latte", name: "카페라떼", emoji: "🥛", category: "drink", equipmentId: "coffee_machine", basePrice: 38, supplyCost: 8, makeTimeMs: 1600, unlockPrevLevel: 3 },
  { id: "icetea", name: "아이스티", emoji: "🧊", category: "drink", equipmentId: "tea_station", basePrice: 58, supplyCost: 13, makeTimeMs: 1400, unlockPrevLevel: 5 },
  { id: "ade", name: "레몬에이드", emoji: "🍋", category: "drink", equipmentId: "blender", basePrice: 84, supplyCost: 19, makeTimeMs: 1800, unlockPrevLevel: 7 },
  { id: "smoothie", name: "딸기스무디", emoji: "🍓", category: "drink", equipmentId: "blender", basePrice: 124, supplyCost: 28, makeTimeMs: 2200, unlockPrevLevel: 9 },
  { id: "matcha", name: "말차라떼", emoji: "🍵", category: "drink", equipmentId: "tea_station", basePrice: 180, supplyCost: 42, makeTimeMs: 2000, unlockPrevLevel: 11 },
];

export const DESSERTS: MenuDef[] = [
  { id: "cookie", name: "쿠키", emoji: "🍪", category: "dessert", equipmentId: "showcase", basePrice: 28, supplyCost: 6, makeTimeMs: 600, unlockPrevLevel: 0 },
  { id: "croissant", name: "크루아상", emoji: "🥐", category: "dessert", equipmentId: "oven", basePrice: 48, supplyCost: 11, makeTimeMs: 900, unlockPrevLevel: 3 },
  { id: "cheesecake", name: "치즈케이크", emoji: "🍰", category: "dessert", equipmentId: "showcase", basePrice: 74, supplyCost: 17, makeTimeMs: 800, unlockPrevLevel: 5 },
  { id: "macaron", name: "마카롱", emoji: "🍬", category: "dessert", equipmentId: "showcase", basePrice: 110, supplyCost: 25, makeTimeMs: 700, unlockPrevLevel: 7 },
  { id: "tiramisu", name: "티라미수", emoji: "🍮", category: "dessert", equipmentId: "showcase", basePrice: 160, supplyCost: 37, makeTimeMs: 1000, unlockPrevLevel: 9 },
  { id: "tart", name: "딸기타르트", emoji: "🥧", category: "dessert", equipmentId: "oven", basePrice: 240, supplyCost: 56, makeTimeMs: 1100, unlockPrevLevel: 11 },
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
/** 테이블 하나에 앉을 수 있는 손님 수 (양옆 의자 두 개) */
export const SEATS_PER_TABLE = 2;
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

export const ROLE_ORDER: Role[] = ["barista", "server", "manager"];

/** 화면에 세워둘 자리를 잡을 때 쓰는, 직급을 통틀어 가장 많은 인원 */
export const MAX_ROLE_COUNT = 4;

export const ROLE_INFO: Record<
  Role,
  {
    name: string;
    emoji: string;
    desc: string;
    baseCost: number;
    wage: number;
    /** 한 층에 이 직급을 몇 명까지 둘 수 있는지 */
    maxCount: number;
  }
> = {
  barista: {
    name: "바리스타",
    emoji: "👩‍🍳",
    desc: "주문을 자동으로 만들어줘요 (없으면 손님을 눌러 직접 만들어야 해요)",
    baseCost: 400,
    wage: 150,
    maxCount: 4,
  },
  server: {
    name: "홀 직원",
    emoji: "🧑‍💼",
    desc: "자동으로 서빙하고 테이블을 치워요 (없으면 직접 눌러야 해요)",
    baseCost: 300,
    wage: 110,
    maxCount: 4,
  },
  manager: {
    name: "매니저",
    emoji: "🕴️",
    desc: "문 앞에서 손님을 맞아요. 손님이 더 자주 들어옵니다 (한 층에 1명)",
    baseCost: 1200,
    wage: 300,
    maxCount: 1,
  },
};

/** 다음 한 명을 더 뽑는 데 드는 비용 (이미 있는 인원이 많을수록 비쌉니다) */
export function roleCost(role: Role, currentCount: number, floorIndex: number): number {
  const base = ROLE_INFO[role].baseCost;
  return Math.round(base * Math.pow(2.2, currentCount) * (1 + floorIndex * 0.8));
}

/** 그 직급 한 명의 하루 인건비 */
export function roleWage(role: Role): number {
  return ROLE_INFO[role].wage;
}

/** 그 직급을 한 층에 몇 명까지 둘 수 있는지 */
export function roleMax(role: Role): number {
  return ROLE_INFO[role].maxCount;
}

/** 바리스타 제조 속도 배수 (사람 수만큼 빨라집니다). 0 = 미고용(수동) */
export function baristaSpeed(count: number): number {
  return count <= 0 ? 0 : count;
}

/** 홀 직원이 서빙까지 걸리는 시간(ms). Infinity = 미고용(수동) */
export function serveDelayMs(serverCount: number): number {
  return serverCount <= 0 ? Infinity : 2600 / serverCount;
}

/** 홀 직원이 테이블을 치우는 데 걸리는 시간(ms). Infinity = 미고용(수동) */
export function cleanDelayMs(serverCount: number): number {
  return serverCount <= 0 ? Infinity : 3200 / serverCount;
}

/* 테이블 하나에 두 명이 앉게 되어 자리가 두 배로 늘었으므로,
   손님도 그만큼 자주 들어와야 자리가 채워집니다. */
export const BASE_SPAWN_INTERVAL_MS = 2600;

/** 매니저가 문 앞에 있으면 손님이 더 자주 들어옵니다 */
export function spawnIntervalMs(managerCount: number): number {
  return BASE_SPAWN_INTERVAL_MS / (1 + managerCount * 0.8);
}

/* ------------------------- 영업시간 / 하루 ------------------------- */

/** 아침 10시에 열고 밤 10시에 닫습니다 */
export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 22;

/** 실제 1초가 게임 속 몇 분인지 → 하루(12시간)가 실제 4분입니다 */
export const GAME_MINUTES_PER_SECOND = 3;

/** 매출표에 남겨두는 지난 날 기록 수 */
export const LEDGER_HISTORY_MAX = 14;

/** 마감 정산을 안 눌러도 이 시간이 지나면 다음 날로 넘어갑니다 */
export const DAY_CLOSE_AUTO_MS = 5000;

/* --------------------------- 총괄 매니저 --------------------------- */

export const GENERAL_MANAGER_COST = 40000;
/** 총괄 매니저가 자동 발주를 넣는 재고 기준선 */
export const AUTO_RESTOCK_THRESHOLD = 8;
export const AUTO_RESTOCK_BATCH = 20;

/* ------------------------------ 발주 ------------------------------ */

export const SUPPLY_BATCH = 10;
export const STARTING_STOCK = 30;
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
