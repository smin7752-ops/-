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

/** 설비는 층마다 따로 사야 하고, 위층일수록 비쌉니다 */
export function equipmentCost(def: EquipmentDef, floorIndex: number): number {
  return Math.round(def.cost * floorPriceScale(floorIndex));
}

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

/**
 * 위층일수록 모든 값이 비싸집니다 (설비값·고용비·인건비 공통).
 * 1층 = 1배, 2층 = 1.7배, 3층 = 2.4배, 4층 = 3.1배.
 */
export function floorPriceScale(floorIndex: number): number {
  return 1 + floorIndex * 0.7;
}

/** floorIndex 층(0부터)을 여는 데 드는 비용 */
export function floorUnlockCost(floorIndex: number): number {
  return Math.round(5000 * Math.pow(4, floorIndex - 1));
}

/** 그 층에 테이블을 하나 더 놓는 비용. 놓을수록 훨씬 가파르게 비싸집니다 */
export function tableCost(tablesOnFloor: number, floorIndex: number): number {
  return Math.round(
    150 * Math.pow(2.6, tablesOnFloor - STARTING_TABLES) * (1 + floorIndex * 0.6),
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
    desc: "문 앞에서 손님을 맞아요. 강화할수록 손님이 더 자주 오고 팁도 더 받습니다",
    baseCost: 1200,
    wage: 300,
    maxCount: 5,
    upgradable: true,
  },
};

/** 다음 한 명을 더 뽑는 데 드는 비용 (인원이 많을수록, 위층일수록 비쌉니다) */
export function roleCost(role: Role, currentCount: number, floorIndex: number): number {
  const base = ROLE_INFO[role].baseCost;
  return Math.round(
    base * Math.pow(2.2, currentCount) * floorPriceScale(floorIndex),
  );
}

/** 그 직급 한 명의 하루 인건비 (위층 직원이 더 비쌉니다) */
export function roleWage(role: Role, floorIndex: number): number {
  return Math.round(ROLE_INFO[role].wage * floorPriceScale(floorIndex));
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

/* ------------------------------ 평점 ------------------------------ */
/* 손님을 제때 응대하면 오르고, 화나서 나가면 떨어집니다.
   평점이 높으면 소문이 나서 손님이 더 자주 옵니다. */

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_START = 3;
/** 한 명 잘 응대했을 때 오르는 폭 */
export const RATING_UP_PER_SERVE = 0.02;
/** 한 명 화나서 나갔을 때 떨어지는 폭 */
export const RATING_DOWN_PER_ANGRY = 0.15;

/** 평점에 따른 손님 등장 간격 배수 (별 5 = 0.8배로 더 자주) */
export function ratingSpawnScale(rating: number): number {
  return 1.3 - rating * 0.1;
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

export const CUSTOMER_PATIENCE_MS = 18000;
export const WALK_TIME_MS = 950;
export const EAT_TIME_MS = 3500;

/* ------------------------------ 저장 ------------------------------ */

export const SAVE_KEY = "cafe-idle-save-v2";

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
  /** 화난 손님에게 깎이는 평점을 덜어주는 비율 */
  ratingGuard?: number;
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
  { id: "barista_roaster", name: "로스터 앞치마", slot: "barista", cost: 3000,
    shirt: 0x8a5a34, accent: 0xe0c9a6, equip: { makeSpeed: 0.3 }, own: { price: 0.05 } },
  { id: "barista_master", name: "마스터 셰프복", slot: "barista", cost: 15000,
    shirt: 0x3f4a5c, accent: 0xf5c542, equip: { makeSpeed: 0.7 }, own: { price: 0.12 } },

  // 홀 직원 — 서빙 속도
  { id: "server_basic", name: "기본 유니폼", slot: "server", cost: 0,
    shirt: 0x86caa5, accent: 0xfffaf2, equip: {}, own: {} },
  { id: "server_runner", name: "러너 유니폼", slot: "server", cost: 2500,
    shirt: 0x4fa3d1, accent: 0xfffaf2, equip: { serveSpeed: 0.35 }, own: { patience: 0.05 } },
  { id: "server_veteran", name: "베테랑 조끼", slot: "server", cost: 12000,
    shirt: 0x7b4a86, accent: 0xf5c542, equip: { serveSpeed: 0.8 }, own: { patience: 0.1 } },

  // 매니저 — 팁
  { id: "manager_basic", name: "기본 정장", slot: "manager", cost: 0,
    shirt: 0x4a4756, accent: 0xe4595f, equip: {}, own: {} },
  { id: "manager_concierge", name: "컨시어지 정장", slot: "manager", cost: 8000,
    shirt: 0x2f3a52, accent: 0xf5c542, equip: { tip: 0.08 }, own: { ratingGuard: 0.15 } },
  { id: "manager_director", name: "디렉터 수트", slot: "manager", cost: 30000,
    shirt: 0x1f2733, accent: 0xc0a062, equip: { tip: 0.18 }, own: { ratingGuard: 0.3 } },

  // 총괄 매니저 — 인건비
  { id: "gm_basic", name: "기본 수트", slot: "gm", cost: 0,
    shirt: 0x5b5f6e, accent: 0xdfe3ea, equip: {}, own: {} },
  { id: "gm_chief", name: "총괄 수트", slot: "gm", cost: 40000,
    shirt: 0x37506b, accent: 0xdfe3ea, equip: { wageCut: 0.1 }, own: { supplyCut: 0.05 } },
  { id: "gm_founder", name: "창업자 코트", slot: "gm", cost: 120000,
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
  if (e.ratingGuard) parts.push(`평점 하락 −${Math.round(e.ratingGuard * 100)}%`);
  if (e.supplyCut) parts.push(`발주 원가 −${Math.round(e.supplyCut * 100)}%`);
  return parts.length ? parts.join(" · ") : "없음";
}
