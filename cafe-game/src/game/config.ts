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
  /** 설비를 산 뒤, 발주 탭에서 이 메뉴를 처음 살 때 드는 비용 (한 번만) */
  launchCost: number;
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
    cost: 900,
    desc: "디저트를 진열해서 팔 수 있어요",
  },
  {
    id: "tea_station",
    name: "티 스테이션",
    emoji: "🫖",
    cost: 7000,
    desc: "차 종류를 만들 수 있어요",
  },
  {
    id: "blender",
    name: "블렌더",
    emoji: "🥤",
    cost: 26000,
    desc: "에이드·스무디를 만들 수 있어요",
  },
  {
    id: "oven",
    name: "오븐",
    emoji: "🥖",
    cost: 80000,
    desc: "갓 구운 베이커리를 만들 수 있어요",
  },
];

export const STARTING_EQUIPMENT = ["coffee_machine"];

/** 설비는 층마다 따로 사야 하고, 위층일수록 비쌉니다 */
export function equipmentCost(def: EquipmentDef, floorIndex: number): number {
  return Math.round(def.cost * floorPriceScale(floorIndex));
}

/* ----------------------------- 메뉴 ----------------------------- */
/* 배열 순서는 표시 순서일 뿐입니다. 각 메뉴는 설비를 산 뒤 발주 탭에서
   한 번 사야 팔 수 있게 열립니다 (state.ts의 launched 목록 참고). */

export const DRINKS: MenuDef[] = [
  { id: "americano", name: "아메리카노", emoji: "☕", category: "drink", equipmentId: "coffee_machine", basePrice: 22, supplyCost: 4, makeTimeMs: 1200, launchCost: 0 },
  { id: "latte", name: "카페라떼", emoji: "🥛", category: "drink", equipmentId: "coffee_machine", basePrice: 38, supplyCost: 8, makeTimeMs: 1600, launchCost: 700 },
  { id: "icetea", name: "아이스티", emoji: "🧊", category: "drink", equipmentId: "tea_station", basePrice: 58, supplyCost: 13, makeTimeMs: 1400, launchCost: 1000 },
  { id: "ade", name: "레몬에이드", emoji: "🍋", category: "drink", equipmentId: "blender", basePrice: 84, supplyCost: 19, makeTimeMs: 1800, launchCost: 1500 },
  { id: "smoothie", name: "딸기스무디", emoji: "🍓", category: "drink", equipmentId: "blender", basePrice: 124, supplyCost: 28, makeTimeMs: 2200, launchCost: 2200 },
  { id: "matcha", name: "말차라떼", emoji: "🍵", category: "drink", equipmentId: "tea_station", basePrice: 180, supplyCost: 42, makeTimeMs: 2000, launchCost: 3200 },
];

export const DESSERTS: MenuDef[] = [
  { id: "cookie", name: "쿠키", emoji: "🍪", category: "dessert", equipmentId: "showcase", basePrice: 28, supplyCost: 6, makeTimeMs: 600, launchCost: 500 },
  { id: "croissant", name: "크루아상", emoji: "🥐", category: "dessert", equipmentId: "oven", basePrice: 48, supplyCost: 11, makeTimeMs: 900, launchCost: 850 },
  { id: "cheesecake", name: "치즈케이크", emoji: "🍰", category: "dessert", equipmentId: "showcase", basePrice: 74, supplyCost: 17, makeTimeMs: 800, launchCost: 1300 },
  { id: "macaron", name: "마카롱", emoji: "🍬", category: "dessert", equipmentId: "showcase", basePrice: 110, supplyCost: 25, makeTimeMs: 700, launchCost: 2000 },
  { id: "tiramisu", name: "티라미수", emoji: "🍮", category: "dessert", equipmentId: "showcase", basePrice: 160, supplyCost: 37, makeTimeMs: 1000, launchCost: 2900 },
  { id: "tart", name: "딸기타르트", emoji: "🥧", category: "dessert", equipmentId: "oven", basePrice: 240, supplyCost: 56, makeTimeMs: 1100, launchCost: 4300 },
];

export const ALL_MENU: MenuDef[] = [...DRINKS, ...DESSERTS];

export function menuById(id: string): MenuDef {
  // 카페 메뉴를 먼저 찾고(가장 흔한 경우라 빠르게), 없으면 다른 가게(분식집·포차)
  // 메뉴까지 뒤집니다. id는 가게마다 겹치지 않으므로 안전합니다.
  const found = ALL_MENU.find((m) => m.id === id) ?? ALL_RESTAURANTS_MENU.find((m) => m.id === id);
  if (!found) throw new Error(`unknown menu id: ${id}`);
  return found;
}

export function menuListOf(category: Category): MenuDef[] {
  return category === "drink" ? DRINKS : DESSERTS;
}

/** 처음부터 발주 없이 바로 팔 수 있는 메뉴 (커피머신이 기본 설비인 것과 짝) */
export const STARTING_LAUNCHED = ["americano"];

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

/** 별 강화의 마지막 단계가 Lv.300을 요구하므로, 레벨도 그만큼 오를 수 있어야 합니다 */
export const MAX_MENU_LEVEL = 300;

/** 다음 레벨까지 필요한 판매 횟수 */
export function expToNext(level: number): number {
  return 5 + (level - 1) * 4;
}

/**
 * 레벨에 따른 판매가 배수 (레벨 1 = 1.0).
 * 레벨 20까지만 값이 오르고, 그 뒤로는 오르지 않습니다 — 20레벨 이후의 레벨은
 * 오직 별 강화 조건(강화는 Lv.20/50/100/200/300에 열립니다)으로만 쓰여서,
 * 판매가는 레벨이 아니라 별로 계속 올려야 합니다.
 */
export function priceMultiplier(level: number): number {
  return 1 + (Math.min(level, 20) - 1) * 0.1;
}

/* --------------------------- 메뉴 강화(별) --------------------------- */
/* 레벨과는 별개로, 메뉴마다 최대 5성까지 "강화"로 올릴 수 있습니다.
   강화는 돈을 내고 도전하는 확률성 뽑기이고, 실패해도 별이 깎이진 않습니다.
   별이 오를수록 그 메뉴 판매가가 더 붙습니다.
   각 별은 그 메뉴 레벨이 일정 수준을 넘어야 도전할 수 있습니다. */

export const MAX_MENU_STARS = 5;

/** 별 하나하나를 강화하려면 도달해야 하는 메뉴 레벨 (0성→1성은 Lv.20, ... 4성→5성은 Lv.300) */
export const MENU_STAR_UNLOCK_LEVELS = [20, 50, 100, 200, 300];

/** 지금 별(currentStars)에서 다음 별로 가려면 필요한 레벨 */
export function enhanceRequiredLevel(currentStars: number): number {
  return MENU_STAR_UNLOCK_LEVELS[currentStars] ?? Infinity;
}

/** 별 등급에 따른 판매가 배수 (0성 = 1.0) */
export function starMultiplier(stars: number): number {
  return 1 + stars * 0.15;
}

/** 다음 별로 강화할 때 드는 비용 (메뉴 기본가 기준, 별이 높을수록 훨씬 비쌉니다) */
export function enhanceCost(menu: MenuDef, currentStars: number): number {
  return Math.round(menu.basePrice * 160 * Math.pow(3.8, currentStars));
}

/** 다음 별로 강화 성공할 확률 (별이 높을수록 어려워집니다) */
export function enhanceChance(currentStars: number): number {
  const chances = [0.8, 0.6, 0.45, 0.3, 0.18];
  return chances[currentStars] ?? 0.1;
}

/* ------------------------------ 매장 ------------------------------ */

export const MAX_FLOORS = 4;
export const TABLES_PER_FLOOR = 6;
/** 테이블 하나에 앉을 수 있는 손님 수 (양옆 의자 두 개) */
export const SEATS_PER_TABLE = 2;
export const STARTING_TABLES = 3;

/**
 * 위층일수록 모든 값이 비싸집니다 (설비값·고용비·인건비 공통).
 * 1층 = 1배, 2층 = 1.7배, 3층 = 2.4배, 4층 = 3.1배.
 */
export function floorPriceScale(floorIndex: number): number {
  return 1 + floorIndex * 0.7;
}

/**
 * floorIndex 층(0부터)을 여는 데 드는 비용.
 * costScale은 가게 전체가 어느 "값 단위"에 있는지를 나타냅니다 (카페 = 1배).
 * 다른 가게(분식집·포차)는 이전 가게의 4층 비용을 이어받아 costScale이 훨씬 큽니다.
 */
export function floorUnlockCost(floorIndex: number, costScale = 1): number {
  return Math.round(20000 * costScale * Math.pow(6, floorIndex - 1));
}

/** 그 층에 테이블을 하나 더 놓는 비용. 놓을수록 훨씬 가파르게 비싸집니다 */
export function tableCost(tablesOnFloor: number, floorIndex: number, costScale = 1): number {
  return Math.round(
    500 * costScale * Math.pow(3.4, tablesOnFloor - STARTING_TABLES) * (1 + floorIndex * 0.6),
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
    /** 한 층에 이 직급을 몇 명까지 둘 수 있는지 (매니저는 등급 상한) */
    maxCount: number;
    /**
     * true 면 사람 수가 아니라 한 명을 강화하는 직급입니다.
     * 매니저가 여기 해당해서, 화면에도 "3명" 대신 "Lv.3" 으로 나옵니다.
     */
    upgradable?: boolean;
  }
> = {
  barista: {
    name: "바리스타",
    emoji: "👩‍🍳",
    desc: "주문을 자동으로 만들어줘요 (없으면 손님을 눌러 직접 만들어야 해요)",
    baseCost: 1400,
    wage: 150,
    maxCount: 4,
  },
  server: {
    name: "홀 직원",
    emoji: "🧑‍💼",
    desc: "자동으로 서빙하고 테이블을 치워요 (없으면 직접 눌러야 해요)",
    baseCost: 1000,
    wage: 110,
    maxCount: 4,
  },
  manager: {
    name: "매니저",
    emoji: "🕴️",
    desc: "문 앞에서 손님을 맞아요. 강화할수록 손님이 더 자주 오고 팁도 더 받습니다",
    baseCost: 4000,
    wage: 300,
    maxCount: 5,
    upgradable: true,
  },
};

/** 다음 한 명을 더 뽑는 데 드는 비용 (인원이 많을수록, 위층일수록 비쌉니다) */
export function roleCost(role: Role, currentCount: number, floorIndex: number, costScale = 1): number {
  const base = ROLE_INFO[role].baseCost;
  return Math.round(
    base * Math.pow(2.8, currentCount) * floorPriceScale(floorIndex) * costScale,
  );
}

/** 그 직급 한 명의 하루 인건비 (위층 직원이 더 비쌉니다) */
export function roleWage(role: Role, floorIndex: number, costScale = 1): number {
  return Math.round(ROLE_INFO[role].wage * floorPriceScale(floorIndex) * costScale);
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
  return serverCount <= 0 ? Infinity : 3500 / serverCount;
}

/** 직원 한 명이 자리 하나를 치우는 데 붙어 있는 시간(ms) — 이 사이에서 무작위로 걸립니다 */
export const CLEAN_STAY_MIN_MS = 3000;
export const CLEAN_STAY_MAX_MS = 5000;

/** 직원이 배정되고 나서 실제로 도착할 때까지 걸어가는 시간(ms).
    이 시간 동안은 청소 게이지가 아직 안 뜹니다 (도착 전에 차오르면 이상해 보여서). */
export const CLEAN_TRAVEL_MS = 900;

/** 자리를 비운 동안 대략 얼마나 빨리 치워질지 어림잡을 때 쓰는 평균값(ms). Infinity = 미고용(수동) */
export function cleanDelayMs(serverCount: number): number {
  return serverCount <= 0 ? Infinity : (CLEAN_STAY_MIN_MS + CLEAN_STAY_MAX_MS) / 2 / serverCount;
}

/* 테이블 하나에 두 명이 앉게 되어 자리가 두 배로 늘었으므로,
   손님도 그만큼 자주 들어와야 자리가 채워집니다. */
export const BASE_SPAWN_INTERVAL_MS = 3500;

/** 매니저가 문 앞에 있으면 손님이 더 자주 들어옵니다 (등급이 높을수록 더) */
export function spawnIntervalMs(managerLevel: number): number {
  return BASE_SPAWN_INTERVAL_MS / (1 + managerLevel * 0.45);
}

/** 매니저 등급만큼 붙는 팁 (판매가에 얹어 받습니다) */
export function managerTipRate(managerLevel: number): number {
  return managerLevel * 0.06;
}

/* ------------------------------ 인지도 등장 배수 ------------------------------ */
/* 인지도가 쌓일수록 소문이 나서 손님이 더 자주 옵니다. 인지도가 없으면 1배,
   많이 쌓일수록 점점 빨라져서 최대 2배(0.5배 간격)까지 빨라집니다. */

/** 인지도에 따른 손님 등장 간격 배수 (인지도 0 = 1배, 많이 쌓일수록 0.5배까지) */
export function fameSpawnScale(fame: number): number {
  return 1 - 0.5 * (fame / (fame + 500));
}

/* ------------------------- 영업시간 / 하루 ------------------------- */

/** 아침 10시에 열고 밤 10시에 닫습니다 */
export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 22;

/** 실제 1초가 게임 속 몇 분인지 → 하루(12시간)가 실제 4분입니다 */
export const GAME_MINUTES_PER_SECOND = 3;

/** 매출표 한 주 단위 (주간 정리에도 씁니다) */
export const LEDGER_WEEK_DAYS = 7;
/** 대략 한 달(4주)이 넘어가면, 하루씩 조금씩이 아니라 가장 오래된 한 주를
    통째로 지웁니다 — 그래서 지난 매출은 항상 21~28일치만 남아요. */
export const LEDGER_HISTORY_MAX_DAYS = LEDGER_WEEK_DAYS * 4;

/** 마감 정산을 안 눌러도 이 시간이 지나면 다음 날로 넘어갑니다 */
export const DAY_CLOSE_AUTO_MS = 5000;

/* --------------------------- 총괄 매니저 --------------------------- */

export const GENERAL_MANAGER_COST = 150000;
/** 총괄 매니저가 자동 발주를 넣는 재고 기준선 */
export const AUTO_RESTOCK_THRESHOLD = 8;
export const AUTO_RESTOCK_BATCH = 20;

/* ------------------------------ 발주 ------------------------------ */

export const SUPPLY_BATCH = 10;
export const STARTING_STOCK = 30;
export const MAX_STOCK = 999;

/* ------------------------ 손님 / 시간 관련 ------------------------ */

export const CUSTOMER_PATIENCE_MS = 18000;
export const WALK_TIME_MS = 950;
export const EAT_TIME_MS = 3500;

/* ------------------------------ 저장 ------------------------------ */

export const SAVE_KEY = "cafe-idle-save-v4";

export const OFFLINE_EARNINGS_CAP_MS = 8 * 60 * 60 * 1000;
/** 이만큼은 자리를 비워야 "다시 오셨네요" 정산을 합니다 (잠깐 나갔다 온 건 제외) */
export const OFFLINE_MIN_AWAY_MS = 2 * 60 * 1000;
/** 총괄 매니저가 없으면 재고가 금방 떨어지므로 이 시간까지만 인정 */
export const OFFLINE_NO_GM_CAP_MS = 60 * 60 * 1000;
/** 자리를 비운 동안에는 이 비율만큼만 벌어요 */
export const OFFLINE_EARNINGS_RATE = 0.6;

/* ------------------------------ 유니폼 ------------------------------ */
/* 직급마다 옷을 갈아입힐 수 있습니다.
   - 장착 효과: 그 옷을 입은 직급에게 붙는 효과
   - 보유 효과: 옷장에 있기만 해도 가게 전체에 붙는 효과 (안 입어도 적용)
   유니폼은 층이 아니라 가게 전체 공용입니다. */

/** 총괄 매니저까지 네 자리에 옷을 입힙니다 */
export type UniformSlot = Role | "gm";

export const UNIFORM_SLOTS: UniformSlot[] = ["barista", "server", "manager", "gm"];

export const SLOT_NAME: Record<UniformSlot, string> = {
  barista: "바리스타",
  server: "홀 직원",
  manager: "매니저",
  gm: "점장",
};

/** 입었을 때 붙는 효과 */
export interface UniformEquipEffect {
  /** 제조 속도 추가 배수 (0.3 = 30% 빨라짐) */
  makeSpeed?: number;
  /** 서빙·정리 속도 추가 배수 */
  serveSpeed?: number;
  /** 판매가에 얹히는 팁 비율 */
  tip?: number;
  /** 인건비 절감 비율 */
  wageCut?: number;
}

/** 옷장에 있기만 해도 붙는 효과 (여러 벌이면 더해집니다) */
export interface UniformOwnEffect {
  /** 모든 판매가 추가 비율 */
  price?: number;
  /** 손님 인내심 추가 비율 */
  patience?: number;
  /** 인지도를 더 받는 비율 */
  fameBoost?: number;
  /** 발주 원가 절감 비율 */
  supplyCut?: number;
}

export interface UniformDef {
  id: string;
  name: string;
  slot: UniformSlot;
  cost: number;
  /** 그림에 쓰는 옷 색과 포인트 색 */
  shirt: number;
  accent: number;
  equip: UniformEquipEffect;
  own: UniformOwnEffect;
}

export const UNIFORMS: UniformDef[] = [
  // 바리스타 — 만드는 속도
  { id: "barista_basic", name: "기본 앞치마", slot: "barista", cost: 0,
    shirt: 0x6f9ec4, accent: 0xfffaf2, equip: {}, own: {} },
  { id: "barista_roaster", name: "로스터 앞치마", slot: "barista", cost: 10000,
    shirt: 0x8a5a34, accent: 0xe0c9a6, equip: { makeSpeed: 0.3 }, own: { price: 0.05 } },
  { id: "barista_master", name: "마스터 셰프복", slot: "barista", cost: 60000,
    shirt: 0x3f4a5c, accent: 0xf5c542, equip: { makeSpeed: 0.7 }, own: { price: 0.12 } },

  // 홀 직원 — 서빙 속도
  { id: "server_basic", name: "기본 유니폼", slot: "server", cost: 0,
    shirt: 0x86caa5, accent: 0xfffaf2, equip: {}, own: {} },
  { id: "server_runner", name: "러너 유니폼", slot: "server", cost: 8000,
    shirt: 0x4fa3d1, accent: 0xfffaf2, equip: { serveSpeed: 0.35 }, own: { patience: 0.05 } },
  { id: "server_veteran", name: "베테랑 조끼", slot: "server", cost: 45000,
    shirt: 0x7b4a86, accent: 0xf5c542, equip: { serveSpeed: 0.8 }, own: { patience: 0.1 } },

  // 매니저 — 팁
  { id: "manager_basic", name: "기본 정장", slot: "manager", cost: 0,
    shirt: 0x4a4756, accent: 0xe4595f, equip: {}, own: {} },
  { id: "manager_concierge", name: "컨시어지 정장", slot: "manager", cost: 28000,
    shirt: 0x2f3a52, accent: 0xf5c542, equip: { tip: 0.08 }, own: { fameBoost: 0.15 } },
  { id: "manager_director", name: "디렉터 수트", slot: "manager", cost: 130000,
    shirt: 0x1f2733, accent: 0xc0a062, equip: { tip: 0.18 }, own: { fameBoost: 0.3 } },

  // 총괄 매니저 — 인건비
  { id: "gm_basic", name: "기본 수트", slot: "gm", cost: 0,
    shirt: 0x5b5f6e, accent: 0xdfe3ea, equip: {}, own: {} },
  { id: "gm_chief", name: "총괄 수트", slot: "gm", cost: 150000,
    shirt: 0x37506b, accent: 0xdfe3ea, equip: { wageCut: 0.1 }, own: { supplyCut: 0.05 } },
  { id: "gm_founder", name: "창업자 코트", slot: "gm", cost: 500000,
    shirt: 0x5c2f3a, accent: 0xf5c542, equip: { wageCut: 0.22 }, own: { supplyCut: 0.12 } },
];

/** 처음부터 갖고 있는 기본 옷 (자리마다 하나씩) */
export const STARTING_UNIFORMS = UNIFORMS.filter((u) => u.cost === 0).map((u) => u.id);

export function uniformById(id: string): UniformDef | undefined {
  return UNIFORMS.find((u) => u.id === id);
}

export function uniformsOfSlot(slot: UniformSlot): UniformDef[] {
  return UNIFORMS.filter((u) => u.slot === slot);
}

/** 사람이 읽을 수 있는 효과 설명 */
export function equipEffectText(e: UniformEquipEffect): string {
  const parts: string[] = [];
  if (e.makeSpeed) parts.push(`제조 속도 +${Math.round(e.makeSpeed * 100)}%`);
  if (e.serveSpeed) parts.push(`서빙 속도 +${Math.round(e.serveSpeed * 100)}%`);
  if (e.tip) parts.push(`팁 +${Math.round(e.tip * 100)}%`);
  if (e.wageCut) parts.push(`인건비 −${Math.round(e.wageCut * 100)}%`);
  return parts.length ? parts.join(" · ") : "특별한 효과 없음";
}

export function ownEffectText(e: UniformOwnEffect): string {
  const parts: string[] = [];
  if (e.price) parts.push(`판매가 +${Math.round(e.price * 100)}%`);
  if (e.patience) parts.push(`손님 인내심 +${Math.round(e.patience * 100)}%`);
  if (e.fameBoost) parts.push(`인지도 +${Math.round(e.fameBoost * 100)}%`);
  if (e.supplyCut) parts.push(`발주 원가 −${Math.round(e.supplyCut * 100)}%`);
  return parts.length ? parts.join(" · ") : "없음";
}

/* ------------------------------ 인테리어 ------------------------------ */
/* 바닥·벽지·테이블·의자·출입문을 다른 모양으로 꾸밀 수 있습니다.
   유니폼처럼 가게 전체 공용이고, 자리마다 한 번에 하나씩만 씁니다.
   지금 쓰고 있는(장착한) 인테리어에서만 효과가 붙습니다. */

export type DecorSlot =
  | "floor"
  | "wallpaper"
  | "table"
  | "chair"
  | "door"
  | "counter"
  | "register";

export const DECOR_SLOTS: DecorSlot[] = [
  "floor",
  "wallpaper",
  "table",
  "chair",
  "door",
  "counter",
  "register",
];

export const DECOR_SLOT_NAME: Record<DecorSlot, string> = {
  floor: "바닥",
  wallpaper: "벽지",
  table: "테이블",
  chair: "의자",
  door: "출입문",
  counter: "주방 테이블",
  register: "캐셔 포스기",
};

/** 색만 다르면 되므로, 자리마다 뜻은 다르지만 세 색만 씁니다. */
export interface DecorColors {
  primary: number;
  secondary: number;
  accent: number;
}

/** 지금 장착 중일 때만 붙는 효과 (여러 자리를 합쳐서 더해집니다) */
export interface DecorEffect {
  /** 모든 판매가 추가 비율 */
  price?: number;
  /** 손님 인내심 추가 비율 */
  patience?: number;
  /** 손님이 더 자주 들어오는 비율 */
  spawnBoost?: number;
  /** 인지도를 더 받는 비율 */
  fameBoost?: number;
}

export interface DecorDef {
  id: string;
  name: string;
  slot: DecorSlot;
  cost: number;
  colors: DecorColors;
  /** 지금 그 자리에 쓰고 있을 때만 붙는 효과 */
  equipEffect: DecorEffect;
  /** 사두기만 해도(안 쓰고 있어도) 가게 전체에 붙는 효과 */
  ownEffect: DecorEffect;
}

export const DECOR: DecorDef[] = [
  // 바닥 — primary: 밝은 타일, secondary: 어두운 타일, accent: 문 앞 매트
  // 쓰는 동안: 인지도 / 갖고만 있어도: 손님 인내심
  { id: "floor_classic", name: "클래식 타일", slot: "floor", cost: 0,
    colors: { primary: 0xe4d0ad, secondary: 0xd8c096, accent: 0xc9a97a }, equipEffect: {}, ownEffect: {} },
  { id: "floor_mono", name: "모노 타일", slot: "floor", cost: 2000,
    colors: { primary: 0xe9e6df, secondary: 0xd2cdc0, accent: 0xb7b0a0 },
    equipEffect: { fameBoost: 0.05 }, ownEffect: { patience: 0.03 } },
  { id: "floor_mint", name: "민트 타일", slot: "floor", cost: 6000,
    colors: { primary: 0xdcefe4, secondary: 0xb7ddc9, accent: 0x8fc7ac },
    equipEffect: { fameBoost: 0.1 }, ownEffect: { patience: 0.06 } },
  { id: "floor_slate", name: "다크 슬레이트", slot: "floor", cost: 15000,
    colors: { primary: 0x6b6f76, secondary: 0x53565c, accent: 0x3f4146 },
    equipEffect: { fameBoost: 0.18 }, ownEffect: { patience: 0.1 } },

  // 벽지 — primary: 벽 색 (하나뿐이라 세 값 다 같습니다)
  // 쓰는 동안: 판매가 / 갖고만 있어도: 인지도
  { id: "wall_classic", name: "클래식 벽지", slot: "wallpaper", cost: 0,
    colors: { primary: 0xd9c3a0, secondary: 0xd9c3a0, accent: 0xd9c3a0 }, equipEffect: {}, ownEffect: {} },
  { id: "wall_sky", name: "하늘색 벽지", slot: "wallpaper", cost: 2000,
    colors: { primary: 0xd3e8f0, secondary: 0xd3e8f0, accent: 0xd3e8f0 },
    equipEffect: { price: 0.03 }, ownEffect: { fameBoost: 0.02 } },
  { id: "wall_rose", name: "로즈 벽지", slot: "wallpaper", cost: 6000,
    colors: { primary: 0xf1dbe0, secondary: 0xf1dbe0, accent: 0xf1dbe0 },
    equipEffect: { price: 0.06 }, ownEffect: { fameBoost: 0.04 } },
  { id: "wall_night", name: "미드나잇 벽지", slot: "wallpaper", cost: 15000,
    colors: { primary: 0x3a3550, secondary: 0x3a3550, accent: 0x3a3550 },
    equipEffect: { price: 0.1 }, ownEffect: { fameBoost: 0.06 } },

  // 테이블 — primary: 상판, secondary: 다리·받침, accent: 나뭇결
  // 쓰는 동안: 판매가 / 갖고만 있어도: 손님 방문
  { id: "table_classic", name: "클래식 테이블", slot: "table", cost: 0,
    colors: { primary: 0xb98350, secondary: 0x5a3b22, accent: 0x8a5a34 }, equipEffect: {}, ownEffect: {} },
  { id: "table_white", name: "화이트 테이블", slot: "table", cost: 2500,
    colors: { primary: 0xf3ede1, secondary: 0xcac0ac, accent: 0xd8cdb8 },
    equipEffect: { price: 0.04 }, ownEffect: { spawnBoost: 0.02 } },
  { id: "table_marble", name: "마블 테이블", slot: "table", cost: 7000,
    colors: { primary: 0xe4e1e6, secondary: 0x8f96a3, accent: 0xc3c7cf },
    equipEffect: { price: 0.08 }, ownEffect: { spawnBoost: 0.05 } },
  { id: "table_walnut", name: "월넛 테이블", slot: "table", cost: 16000,
    colors: { primary: 0x6b4630, secondary: 0x3a2617, accent: 0x8a5a34 },
    equipEffect: { price: 0.14 }, ownEffect: { spawnBoost: 0.08 } },

  // 의자 — primary: 기둥·좌판, secondary: 등받이
  // 쓰는 동안: 손님 인내심 / 갖고만 있어도: 판매가
  { id: "chair_classic", name: "클래식 의자", slot: "chair", cost: 0,
    colors: { primary: 0x5a3b22, secondary: 0x8a5a34, accent: 0x8a5a34 }, equipEffect: {}, ownEffect: {} },
  { id: "chair_white", name: "화이트 의자", slot: "chair", cost: 2500,
    colors: { primary: 0xcac0ac, secondary: 0xf3ede1, accent: 0xf3ede1 },
    equipEffect: { patience: 0.05 }, ownEffect: { price: 0.03 } },
  { id: "chair_teal", name: "틸 의자", slot: "chair", cost: 7000,
    colors: { primary: 0x2f6f6a, secondary: 0x4a9d94, accent: 0x4a9d94 },
    equipEffect: { patience: 0.1 }, ownEffect: { price: 0.06 } },
  { id: "chair_walnut", name: "월넛 의자", slot: "chair", cost: 16000,
    colors: { primary: 0x3a2617, secondary: 0x6b4630, accent: 0x6b4630 },
    equipEffect: { patience: 0.16 }, ownEffect: { price: 0.1 } },

  // 출입문 — primary: 문틀, secondary: 유리, accent: 간판
  // 쓰는 동안: 손님 등장 속도 / 갖고만 있어도: 판매가
  { id: "door_classic", name: "클래식 문", slot: "door", cost: 0,
    colors: { primary: 0x5a3b22, secondary: 0xdff0f5, accent: 0x86caa5 }, equipEffect: {}, ownEffect: {} },
  { id: "door_black", name: "블랙 프레임 문", slot: "door", cost: 3000,
    colors: { primary: 0x2b2b2f, secondary: 0xe7f2f5, accent: 0xc0a062 },
    equipEffect: { spawnBoost: 0.05 }, ownEffect: { price: 0.03 } },
  { id: "door_red", name: "레드 도어", slot: "door", cost: 8000,
    colors: { primary: 0x8a3b34, secondary: 0xf5e6d8, accent: 0xf5c542 },
    equipEffect: { spawnBoost: 0.1 }, ownEffect: { price: 0.06 } },
  { id: "door_glass", name: "올글라스 도어", slot: "door", cost: 18000,
    colors: { primary: 0x9fb4bd, secondary: 0xeaf6f8, accent: 0x4a9d94 },
    equipEffect: { spawnBoost: 0.16 }, ownEffect: { price: 0.1 } },

  // 주방 테이블(카운터) — primary: 몸통, secondary: 위쪽 상판, accent: 테두리 장식
  // 쓰는 동안: 손님 인내심 / 갖고만 있어도: 인지도
  { id: "counter_classic", name: "클래식 주방 테이블", slot: "counter", cost: 0,
    colors: { primary: 0x8a5a34, secondary: 0xb98350, accent: 0x5a3b22 }, equipEffect: {}, ownEffect: {} },
  { id: "counter_white", name: "화이트 주방 테이블", slot: "counter", cost: 3500,
    colors: { primary: 0xd8cdb8, secondary: 0xf3ede1, accent: 0xcac0ac },
    equipEffect: { patience: 0.05 }, ownEffect: { fameBoost: 0.03 } },
  { id: "counter_marble", name: "마블 주방 테이블", slot: "counter", cost: 9500,
    colors: { primary: 0x8f96a3, secondary: 0xe4e1e6, accent: 0xc3c7cf },
    equipEffect: { patience: 0.1 }, ownEffect: { fameBoost: 0.06 } },
  { id: "counter_slate", name: "다크 슬레이트 주방 테이블", slot: "counter", cost: 22000,
    colors: { primary: 0x53565c, secondary: 0x6b6f76, accent: 0x3f4146 },
    equipEffect: { patience: 0.18 }, ownEffect: { fameBoost: 0.1 } },

  // 캐셔 포스기 — primary: 몸통, secondary: 화면, accent: 버튼·테두리
  // 쓰는 동안: 판매가 / 갖고만 있어도: 손님 인내심
  { id: "register_classic", name: "클래식 포스기", slot: "register", cost: 0,
    colors: { primary: 0xc9ccd4, secondary: 0x3f4146, accent: 0x8f96a3 }, equipEffect: {}, ownEffect: {} },
  { id: "register_silver", name: "실버 포스기", slot: "register", cost: 1800,
    colors: { primary: 0xe4e1e6, secondary: 0x2b2b2f, accent: 0x4a9d94 },
    equipEffect: { price: 0.04 }, ownEffect: { patience: 0.02 } },
  { id: "register_gold", name: "골드 포스기", slot: "register", cost: 5000,
    colors: { primary: 0xf5c542, secondary: 0x2b2b2f, accent: 0xffe08a },
    equipEffect: { price: 0.08 }, ownEffect: { patience: 0.05 } },
  { id: "register_deluxe", name: "디럭스 포스기", slot: "register", cost: 12000,
    colors: { primary: 0x1f2733, secondary: 0x4a9d94, accent: 0xc0a062 },
    equipEffect: { price: 0.14 }, ownEffect: { patience: 0.08 } },
];

/** 사람이 읽을 수 있는 인테리어 효과 설명 */
export function decorEffectText(e: DecorEffect): string {
  const parts: string[] = [];
  if (e.price) parts.push(`판매가 +${Math.round(e.price * 100)}%`);
  if (e.patience) parts.push(`손님 인내심 +${Math.round(e.patience * 100)}%`);
  if (e.spawnBoost) parts.push(`손님 방문 +${Math.round(e.spawnBoost * 100)}%`);
  if (e.fameBoost) parts.push(`인지도 +${Math.round(e.fameBoost * 100)}%`);
  return parts.length ? parts.join(" · ") : "없음";
}

/** 처음부터 갖고 있는 기본 인테리어 (자리마다 하나씩) */
export const STARTING_DECOR = DECOR.filter((d) => d.cost === 0).map((d) => d.id);

export function decorById(id: string): DecorDef | undefined {
  return DECOR.find((d) => d.id === id);
}

export function decorOfSlot(slot: DecorSlot): DecorDef[] {
  return DECOR.filter((d) => d.slot === slot);
}

/* ------------------------------ 인지도 ------------------------------ */
/* 평점(별점)과는 별개로, 손님이 한 명 왔다 갈 때마다 "인지도"를 얻습니다.
   서비스를 얼마나 여유 있게(인내심을 많이 남기고) 마쳤는지에 따라 1~10 사이로 달라져요.
   인지도는 기부로도 모을 수 있고, 아래 취미 활동을 사는 데 씁니다. */

export const FAME_MIN_PER_VISIT = 1;
export const FAME_MAX_PER_VISIT = 10;

/** 손님이 남긴 인내심 비율(0~1)에 따라 이번 방문에서 받는 인지도 */
export function fameForVisit(patienceRatio: number): number {
  const ratio = Math.min(1, Math.max(0, patienceRatio));
  return FAME_MIN_PER_VISIT + Math.round(ratio * (FAME_MAX_PER_VISIT - FAME_MIN_PER_VISIT));
}

/** 기부 버튼에 보여줄 금액 목록 */
export const DONATION_PRESETS = [500, 2000, 10000, 50000, 200000, 1000000];

/** 기부한 코인 액수에 따라 받는 인지도. 많이 낼수록 코인당 받는 인지도가 조금씩 더 좋아집니다 */
export function donationFame(amount: number): number {
  if (amount < 100) return 0;
  const bonus = 1 + Math.log10(amount / 100) * 0.15;
  return Math.max(1, Math.round((amount / 100) * bonus));
}

/* ------------------------------ 취미 활동 ------------------------------ */
/* 인지도로 살 수 있는 취미 활동입니다. 유니폼의 "보유 효과"처럼, 사두기만
   하면(따로 장착 안 해도) 계속 효과가 붙습니다. 살수록 쌓입니다. */

export interface HobbyEffect {
  /** 모든 판매가 추가 비율 */
  price?: number;
  /** 손님 인내심 추가 비율 */
  patience?: number;
  /** 손님이 더 자주 들어오는 비율 */
  spawnBoost?: number;
  /** 인지도를 더 받는 비율 */
  fameBoost?: number;
}

export interface HobbyDef {
  id: string;
  name: string;
  emoji: string;
  /** 이만큼 인지도가 쌓여야 돈으로 살 수 있게 열립니다 (인지도 자체를 쓰는 건 아니에요) */
  fameRequired: number;
  desc: string;
  effect: HobbyEffect;
}

export const HOBBIES: HobbyDef[] = [
  { id: "reading", name: "독서", emoji: "📚", fameRequired: 80,
    desc: "짬짬이 책을 읽으며 마음의 여유를 챙겨요.", effect: { fameBoost: 0.02 } },
  { id: "yoga", name: "요가", emoji: "🧘", fameRequired: 150,
    desc: "몸을 풀고 나면 손님을 대하는 여유도 늘어나요.", effect: { patience: 0.02 } },
  { id: "running", name: "러닝", emoji: "🏃", fameRequired: 250,
    desc: "아침 조깅으로 하루를 시작하니 발걸음이 가벼워요.", effect: { spawnBoost: 0.02 } },
  { id: "painting", name: "그림 그리기", emoji: "🎨", fameRequired: 400,
    desc: "가게 분위기에 어울리는 그림을 그려봐요.", effect: { price: 0.02 } },
  { id: "photography", name: "사진", emoji: "📷", fameRequired: 600,
    desc: "예쁜 카페 사진을 SNS에 올리니 입소문이 나요.", effect: { fameBoost: 0.02 } },
  { id: "cooking", name: "요리", emoji: "🍳", fameRequired: 900,
    desc: "새 레시피를 연구하며 실력을 갈고닦아요.", effect: { fameBoost: 0.03 } },
  { id: "gardening", name: "가드닝", emoji: "🌱", fameRequired: 1300,
    desc: "작은 화분을 가꾸니 가게에도 생기가 돌아요.", effect: { patience: 0.03 } },
  { id: "pet", name: "반려동물", emoji: "🐶", fameRequired: 1800,
    desc: "퇴근하면 반겨주는 존재가 있어 힘이 나요.", effect: { spawnBoost: 0.03 } },
  { id: "instrument", name: "악기 연주", emoji: "🎸", fameRequired: 2500,
    desc: "연주 실력이 늘어서 가끔 가게에서 들려드려요.", effect: { price: 0.03 } },
  { id: "meditation", name: "명상", emoji: "🧘‍♀️", fameRequired: 3400,
    desc: "차분히 명상하며 마음을 다잡아요.", effect: { fameBoost: 0.03 } },
  { id: "cycling", name: "자전거", emoji: "🚴", fameRequired: 4600,
    desc: "주말마다 라이딩을 다니며 체력을 길러요.", effect: { fameBoost: 0.04 } },
  { id: "wine", name: "와인 테이스팅", emoji: "🍷", fameRequired: 6200,
    desc: "취향이 고급스러워지면서 가게 안목도 늘어요.", effect: { price: 0.04 } },
  { id: "pottery", name: "도자기 공예", emoji: "🏺", fameRequired: 8200,
    desc: "직접 빚은 그릇에 디저트를 담아보고 싶어져요.", effect: { patience: 0.04 } },
  { id: "golf", name: "골프", emoji: "⛳", fameRequired: 11000,
    desc: "인맥이 넓어지면서 단골도 하나둘 늘어나요.", effect: { spawnBoost: 0.04 } },
  { id: "travel", name: "여행", emoji: "✈️", fameRequired: 15000,
    desc: "여행에서 본 이야기가 손님들과의 대화거리가 돼요.", effect: { fameBoost: 0.04 } },
  { id: "sailing", name: "요트 세일링", emoji: "⛵", fameRequired: 20000,
    desc: "성공한 사장님의 여유, 바다 위에서 즐겨요.", effect: { price: 0.05 } },
];

export function hobbyById(id: string): HobbyDef | undefined {
  return HOBBIES.find((h) => h.id === id);
}

/** 취미 활동을 실제로 살 때 드는 코인 값 (필요 인지도에 비례합니다) */
export function hobbyCoinCost(h: HobbyDef): number {
  return h.fameRequired * 15;
}

/** 사람이 읽을 수 있는 취미 효과 설명 */
export function hobbyEffectText(e: HobbyEffect): string {
  const parts: string[] = [];
  if (e.price) parts.push(`판매가 +${Math.round(e.price * 100)}%`);
  if (e.patience) parts.push(`손님 인내심 +${Math.round(e.patience * 100)}%`);
  if (e.spawnBoost) parts.push(`손님 방문 +${Math.round(e.spawnBoost * 100)}%`);
  if (e.fameBoost) parts.push(`인지도 +${Math.round(e.fameBoost * 100)}%`);
  return parts.length ? parts.join(" · ") : "없음";
}

/* ------------------------------ 다른 가게 ------------------------------ */
/* 카페 말고도 분식집·포차를 지을 수 있습니다. 메뉴·설비·세트는 가게마다
   완전히 따로지만(같은 구조를 재사용), 코인·인지도·점장 같은 공용 자원은
   가게 전체가 하나로 씁니다(state.ts 참고).
   각 가게는 "값 단위(costScale)"가 있어서, 분식집은 카페의 4층 증축
   비용에서, 포차는 분식집의 4층 증축 비용에서 시작합니다 — 그래서 새
   가게를 지을 때마다 그 가게 안의 모든 값(설비·메뉴·직원)도 한 단계
   위로 뛰어오릅니다. */

export type RestaurantId = "cafe" | "bunsik" | "pocha";

export const RESTAURANT_ORDER: RestaurantId[] = ["cafe", "bunsik", "pocha"];

export interface RestaurantConfig {
  id: RestaurantId;
  name: string;
  /** 메뉴판에서 두 칸의 이름 (카페는 "음료"/"디저트") */
  mainLabel: string;
  sideLabel: string;
  drinks: MenuDef[];
  desserts: MenuDef[];
  sets: SetDef[];
  equipment: EquipmentDef[];
  startingEquipment: string[];
  startingLaunched: string[];
  /** 이 가게 안의 층·테이블·직원 값에 곱해지는 값 단위 (카페 = 1) */
  costScale: number;
  /** 이 가게를 짓는 데 드는 비용 (카페는 처음부터 있으니 0) */
  buildCost: number;
}

/** 카페의 4층(floorIndex=3) 증축 비용 — 분식집을 짓는 기준값이 됩니다 */
const CAFE_TOP_FLOOR_COST = floorUnlockCost(3, 1);
const BUNSIK_COST_SCALE = Math.round(CAFE_TOP_FLOOR_COST / 20000);
/** 분식집의 4층 증축 비용 — 포차를 짓는 기준값이 됩니다 */
const BUNSIK_TOP_FLOOR_COST = floorUnlockCost(3, BUNSIK_COST_SCALE);
const POCHA_COST_SCALE = Math.round(BUNSIK_TOP_FLOOR_COST / 20000);

/** 분식집 설비 — 커피머신(기본)·쇼케이스·티스테이션·블렌더·오븐 자리를 그대로 잇습니다 */
export const BUNSIK_EQUIPMENT: EquipmentDef[] = [
  { id: "bunsik_stove", name: "떡볶이 화로", emoji: "🔥", cost: 0,
    desc: "기본으로 드려요. 떡볶이를 만들 수 있어요" },
  { id: "bunsik_display", name: "분식 진열대", emoji: "🍥", cost: Math.round(900 * BUNSIK_COST_SCALE),
    desc: "김밥·순대를 진열해서 팔 수 있어요" },
  { id: "bunsik_noodle_pot", name: "라면 냄비", emoji: "🍜", cost: Math.round(7000 * BUNSIK_COST_SCALE),
    desc: "라면류를 만들 수 있어요" },
  { id: "bunsik_fryer", name: "튀김기", emoji: "🍤", cost: Math.round(26000 * BUNSIK_COST_SCALE),
    desc: "튀김류를 만들 수 있어요" },
  { id: "bunsik_grill", name: "즉석 조리대", emoji: "🍳", cost: Math.round(80000 * BUNSIK_COST_SCALE),
    desc: "즉석 요리를 만들 수 있어요" },
];

export const BUNSIK_MAIN: MenuDef[] = [
  { id: "bunsik_tteokbokki", name: "떡볶이", emoji: "🍢", category: "drink", equipmentId: "bunsik_stove", basePrice: 792, supplyCost: 144, makeTimeMs: 1200, launchCost: 0 },
  { id: "bunsik_rabokki", name: "라볶이", emoji: "🍜", category: "drink", equipmentId: "bunsik_stove", basePrice: 1368, supplyCost: 288, makeTimeMs: 1600, launchCost: 25200 },
  { id: "bunsik_ramen", name: "라면", emoji: "🍲", category: "drink", equipmentId: "bunsik_noodle_pot", basePrice: 2088, supplyCost: 468, makeTimeMs: 1400, launchCost: 36000 },
  { id: "bunsik_twigim", name: "모둠튀김", emoji: "🍤", category: "drink", equipmentId: "bunsik_fryer", basePrice: 3024, supplyCost: 684, makeTimeMs: 1800, launchCost: 54000 },
  { id: "bunsik_odeng_tang", name: "즉석오뎅탕", emoji: "🍥", category: "drink", equipmentId: "bunsik_fryer", basePrice: 4464, supplyCost: 1008, makeTimeMs: 2200, launchCost: 79200 },
  { id: "bunsik_jjajang_tteok", name: "짜장떡볶이", emoji: "⚫", category: "drink", equipmentId: "bunsik_noodle_pot", basePrice: 6480, supplyCost: 1512, makeTimeMs: 2000, launchCost: 115200 },
];

export const BUNSIK_SIDE: MenuDef[] = [
  { id: "bunsik_sundae", name: "순대", emoji: "🌭", category: "dessert", equipmentId: "bunsik_display", basePrice: 1008, supplyCost: 216, makeTimeMs: 600, launchCost: 18000 },
  { id: "bunsik_hotteok", name: "호떡", emoji: "🥞", category: "dessert", equipmentId: "bunsik_grill", basePrice: 1728, supplyCost: 396, makeTimeMs: 900, launchCost: 30600 },
  { id: "bunsik_gimbap", name: "김밥", emoji: "🍙", category: "dessert", equipmentId: "bunsik_display", basePrice: 2664, supplyCost: 612, makeTimeMs: 800, launchCost: 46800 },
  { id: "bunsik_tuna_gimbap", name: "참치김밥", emoji: "🍙", category: "dessert", equipmentId: "bunsik_display", basePrice: 3960, supplyCost: 900, makeTimeMs: 700, launchCost: 72000 },
  { id: "bunsik_odeng_skewer", name: "꼬치어묵", emoji: "🍡", category: "dessert", equipmentId: "bunsik_display", basePrice: 5760, supplyCost: 1332, makeTimeMs: 1000, launchCost: 104400 },
  { id: "bunsik_toast", name: "계란마요토스트", emoji: "🍞", category: "dessert", equipmentId: "bunsik_grill", basePrice: 8640, supplyCost: 2016, makeTimeMs: 1100, launchCost: 154800 },
];

export const BUNSIK_SETS: SetDef[] = [
  { id: "bunsik_basic_set", name: "떡순세트", emoji: "🍢", drinkId: "bunsik_tteokbokki", dessertId: "bunsik_sundae", bonusRate: 1.15 },
  { id: "bunsik_hotteok_set", name: "라볶이호떡세트", emoji: "🥞", drinkId: "bunsik_rabokki", dessertId: "bunsik_hotteok", bonusRate: 1.2 },
  { id: "bunsik_gimbap_set", name: "라면김밥세트", emoji: "🍙", drinkId: "bunsik_ramen", dessertId: "bunsik_gimbap", bonusRate: 1.25 },
  { id: "bunsik_twigim_set", name: "튀김참치김밥세트", emoji: "🍤", drinkId: "bunsik_twigim", dessertId: "bunsik_tuna_gimbap", bonusRate: 1.3 },
  { id: "bunsik_odeng_set", name: "오뎅탕꼬치세트", emoji: "🍥", drinkId: "bunsik_odeng_tang", dessertId: "bunsik_odeng_skewer", bonusRate: 1.35 },
  { id: "bunsik_signature_set", name: "짜장떡볶이스페셜세트", emoji: "👑", drinkId: "bunsik_jjajang_tteok", dessertId: "bunsik_toast", bonusRate: 1.45 },
];

/** 포차 설비 */
export const POCHA_EQUIPMENT: EquipmentDef[] = [
  { id: "pocha_stove", name: "화로", emoji: "🔥", cost: 0,
    desc: "기본으로 드려요. 계란말이를 만들 수 있어요" },
  { id: "pocha_display", name: "안주 진열대", emoji: "🍢", cost: Math.round(900 * POCHA_COST_SCALE),
    desc: "튀김·전을 진열해서 팔 수 있어요" },
  { id: "pocha_soup_pot", name: "국물솥", emoji: "🍲", cost: Math.round(7000 * POCHA_COST_SCALE),
    desc: "국물 안주를 만들 수 있어요" },
  { id: "pocha_charcoal_grill", name: "숯불그릴", emoji: "🍗", cost: Math.round(26000 * POCHA_COST_SCALE),
    desc: "숯불 안주를 만들 수 있어요" },
  { id: "pocha_special_station", name: "특선 조리대", emoji: "🦑", cost: Math.round(80000 * POCHA_COST_SCALE),
    desc: "고급 안주를 만들 수 있어요" },
];

export const POCHA_MAIN: MenuDef[] = [
  { id: "pocha_gyeranmari", name: "계란말이", emoji: "🍳", category: "drink", equipmentId: "pocha_stove", basePrice: 28512, supplyCost: 5184, makeTimeMs: 1200, launchCost: 0 },
  { id: "pocha_dakkochi", name: "닭꼬치", emoji: "🍢", category: "drink", equipmentId: "pocha_stove", basePrice: 49248, supplyCost: 10368, makeTimeMs: 1600, launchCost: 907200 },
  { id: "pocha_odengtang", name: "오뎅탕", emoji: "🍲", category: "drink", equipmentId: "pocha_soup_pot", basePrice: 75168, supplyCost: 16848, makeTimeMs: 1400, launchCost: 1296000 },
  { id: "pocha_golbaengi", name: "골뱅이무침", emoji: "🥗", category: "drink", equipmentId: "pocha_charcoal_grill", basePrice: 108864, supplyCost: 24624, makeTimeMs: 1800, launchCost: 1944000 },
  { id: "pocha_jokbal", name: "족발", emoji: "🍖", category: "drink", equipmentId: "pocha_charcoal_grill", basePrice: 160704, supplyCost: 36288, makeTimeMs: 2200, launchCost: 2851200 },
  { id: "pocha_haemul_pajeon", name: "해물파전", emoji: "🥘", category: "drink", equipmentId: "pocha_soup_pot", basePrice: 233280, supplyCost: 54432, makeTimeMs: 2000, launchCost: 4147200 },
];

export const POCHA_SIDE: MenuDef[] = [
  { id: "pocha_gamja_twigim", name: "감자튀김", emoji: "🍟", category: "dessert", equipmentId: "pocha_display", basePrice: 36288, supplyCost: 7776, makeTimeMs: 600, launchCost: 648000 },
  { id: "pocha_chicken_gangjeong", name: "치킨강정", emoji: "🍗", category: "dessert", equipmentId: "pocha_special_station", basePrice: 62208, supplyCost: 14256, makeTimeMs: 900, launchCost: 1101600 },
  { id: "pocha_gyeranjjim", name: "계란찜", emoji: "🍳", category: "dessert", equipmentId: "pocha_display", basePrice: 95904, supplyCost: 22032, makeTimeMs: 800, launchCost: 1684800 },
  { id: "pocha_ojingeo_bokkeum", name: "오징어볶음", emoji: "🦑", category: "dessert", equipmentId: "pocha_display", basePrice: 142560, supplyCost: 32400, makeTimeMs: 700, launchCost: 2592000 },
  { id: "pocha_yangnyeom_tongdak", name: "양념통닭", emoji: "🍗", category: "dessert", equipmentId: "pocha_display", basePrice: 207360, supplyCost: 47952, makeTimeMs: 1000, launchCost: 3758400 },
  { id: "pocha_modum_jeon", name: "모둠전", emoji: "🥘", category: "dessert", equipmentId: "pocha_special_station", basePrice: 311040, supplyCost: 72576, makeTimeMs: 1100, launchCost: 5572800 },
];

export const POCHA_SETS: SetDef[] = [
  { id: "pocha_basic_set", name: "계란말이감자세트", emoji: "🍳", drinkId: "pocha_gyeranmari", dessertId: "pocha_gamja_twigim", bonusRate: 1.15 },
  { id: "pocha_dak_set", name: "닭꼬치강정세트", emoji: "🍗", drinkId: "pocha_dakkochi", dessertId: "pocha_chicken_gangjeong", bonusRate: 1.2 },
  { id: "pocha_guk_set", name: "오뎅탕계란찜세트", emoji: "🍲", drinkId: "pocha_odengtang", dessertId: "pocha_gyeranjjim", bonusRate: 1.25 },
  { id: "pocha_anju_set", name: "골뱅이오징어세트", emoji: "🥗", drinkId: "pocha_golbaengi", dessertId: "pocha_ojingeo_bokkeum", bonusRate: 1.3 },
  { id: "pocha_premium_set", name: "족발통닭세트", emoji: "🍖", drinkId: "pocha_jokbal", dessertId: "pocha_yangnyeom_tongdak", bonusRate: 1.35 },
  { id: "pocha_signature_set", name: "해물파전모둠전세트", emoji: "👑", drinkId: "pocha_haemul_pajeon", dessertId: "pocha_modum_jeon", bonusRate: 1.45 },
];

export const RESTAURANTS: Record<RestaurantId, RestaurantConfig> = {
  cafe: {
    id: "cafe", name: "카페", mainLabel: "음료", sideLabel: "디저트",
    drinks: DRINKS, desserts: DESSERTS, sets: SETS, equipment: EQUIPMENT,
    startingEquipment: STARTING_EQUIPMENT, startingLaunched: STARTING_LAUNCHED,
    costScale: 1, buildCost: 0,
  },
  bunsik: {
    id: "bunsik", name: "분식집", mainLabel: "메인", sideLabel: "사이드",
    drinks: BUNSIK_MAIN, desserts: BUNSIK_SIDE, sets: BUNSIK_SETS, equipment: BUNSIK_EQUIPMENT,
    startingEquipment: [BUNSIK_EQUIPMENT[0].id], startingLaunched: [BUNSIK_MAIN[0].id],
    costScale: BUNSIK_COST_SCALE, buildCost: CAFE_TOP_FLOOR_COST,
  },
  pocha: {
    id: "pocha", name: "포차", mainLabel: "메인", sideLabel: "사이드",
    drinks: POCHA_MAIN, desserts: POCHA_SIDE, sets: POCHA_SETS, equipment: POCHA_EQUIPMENT,
    startingEquipment: [POCHA_EQUIPMENT[0].id], startingLaunched: [POCHA_MAIN[0].id],
    costScale: POCHA_COST_SCALE, buildCost: BUNSIK_TOP_FLOOR_COST,
  },
};

/** 어느 가게든 상관없이 메뉴 id로 정의를 찾습니다 (id가 가게마다 겹치지 않습니다) */
export const ALL_RESTAURANTS_MENU: MenuDef[] = RESTAURANT_ORDER.flatMap(
  (id) => [...RESTAURANTS[id].drinks, ...RESTAURANTS[id].desserts],
);

/** 어느 가게든 상관없이 설비 id로 정의를 찾을 때 씁니다 */
export const ALL_RESTAURANTS_EQUIPMENT: EquipmentDef[] = RESTAURANT_ORDER.flatMap(
  (id) => RESTAURANTS[id].equipment,
);

export function restaurantConfig(id: RestaurantId): RestaurantConfig {
  return RESTAURANTS[id];
}
