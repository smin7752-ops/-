import {
  AUTO_RESTOCK_BATCH,
  AUTO_RESTOCK_THRESHOLD,
  DECOR,
  DECOR_SLOTS,
  DESSERTS,
  DRINKS,
  donationFame,
  EAT_TIME_MS,
  GENERAL_MANAGER_COST,
  HOBBIES,
  hobbyCoinCost,
  MAX_FLOORS,
  MAX_MENU_LEVEL,
  MAX_MENU_STARS,
  LEDGER_HISTORY_MAX_DAYS,
  LEDGER_WEEK_DAYS,
  MAX_STOCK,
  OPEN_HOUR,
  RESTAURANT_ORDER,
  ROLE_ORDER,
  STARTING_UNIFORMS,
  UNIFORMS,
  UNIFORM_SLOTS,
  uniformById,
  uniformsOfSlot,
  fameForVisit,
  hobbyById,
  restaurantConfig,
  type DecorEffect,
  type HobbyEffect,
  type RestaurantConfig,
  type RestaurantId,
  type UniformEquipEffect,
  type UniformOwnEffect,
  type UniformSlot,
  equipmentCost,
  roleWage,
  WAGE_COST_SCALE,
  OFFLINE_EARNINGS_CAP_MS,
  OFFLINE_EARNINGS_RATE,
  OFFLINE_MIN_AWAY_MS,
  OFFLINE_NO_GM_CAP_MS,
  PRESTIGE_BONUS_PER_LEVEL,
  PRESTIGE_EXP_BONUS_PER_LEVEL,
  SAVE_KEY,
  STARTING_DECOR,
  STARTING_STOCK,
  STARTING_TABLES,
  baristaSpeed,
  cleanDelayMs,
  decorById,
  decorOfSlot,
  enhanceChance,
  enhanceCost,
  enhanceRequiredLevel,
  expToNext,
  menuById,
  priceMultiplier,
  serveDelayMs,
  spawnIntervalMs,
  starMultiplier,
  type Category,
  type DecorSlot,
  type MenuDef,
  type Role,
  type SetDef,
} from "./config";

export interface MenuProgress {
  level: number;
  exp: number;
  stock: number;
  /** 강화로 올린 별 (0~MAX_MENU_STARS) */
  stars: number;
}

export interface FloorData {
  unlocked: boolean;
  tables: number;
  barista: number;
  server: number;
  /** 매니저는 인원이 아니라 등급입니다 (0 = 없음) */
  manager: number;
  /** 이 층에 들여놓은 설비. 층마다 따로 사야 합니다 */
  equipment: string[];
}

/** 가게 하나만의 하루치 매출 (카페/분식집/포차 각각) */
export interface RestaurantDayStats {
  revenue: number;
  supplyCost: number;
  wageCost: number;
  served: number;
}

function emptyRestaurantDayStats(): RestaurantDayStats {
  return { revenue: 0, supplyCost: 0, wageCost: 0, served: 0 };
}

/** 하루치 장부 — 매출표에 그대로 보여줍니다. 가게 전체(카페+분식집+포차) 합산이면서,
 * byRestaurant 에 가게별로도 나눠 담아둡니다. */
export interface DayLedger {
  day: number;
  /** 손님에게 받은 돈 */
  revenue: number;
  /** 재료비 (발주에 쓴 돈) */
  supplyCost: number;
  /** 인건비 (마감할 때 한 번에 나갑니다) */
  wageCost: number;
  /** 그날 응대한 손님 수 */
  served: number;
  /** 가게별로 나눈 그날 매출. 이 기능이 생기기 전에 마감된 지난 날들은 없을 수 있습니다 */
  byRestaurant?: Record<RestaurantId, RestaurantDayStats>;
}

/** 지난 날짜라 byRestaurant가 없을 수도 있는 장부에서, 안전하게 가게별 몫을 꺼냅니다 */
export function restaurantStatsOf(l: DayLedger, id: RestaurantId): RestaurantDayStats {
  return l.byRestaurant?.[id] ?? emptyRestaurantDayStats();
}

/** 세트 메뉴의 레벨 (재고는 단품 쪽에서 빠지므로 따로 없습니다) */
export interface SetProgress {
  level: number;
  exp: number;
}

/** 가게 하나(카페/분식집/포차)마다 따로 갖는 데이터 */
export interface RestaurantSaveData {
  /** 지어서 실제로 영업 중인가 (분식집·포차는 지어야 열립니다) */
  constructed: boolean;
  menu: Record<string, MenuProgress>;
  /** 발주 탭에서 한 번 사서 열어둔 메뉴 id 목록 */
  launched: string[];
  sets: Record<string, SetProgress>;
  floors: FloorData[];
  /** 이 가게의 총괄 매니저 — 가게마다 따로 고용합니다. 고용하면 이 가게만
   * 자동 발주가 되고, 다음 가게를 지을 자격이 생깁니다 */
  generalManager: boolean;
  /** 사둔 유니폼 (옷장, 총괄 매니저 옷 포함) */
  uniforms: string[];
  equipped: Record<UniformSlot, string>;
  /** 사둔 인테리어 (바닥·벽지·테이블·의자·문) */
  decor: string[];
  decorEquipped: Record<DecorSlot, string>;
  /** 실제 시계 기준으로, 이 가게를 마지막으로 보고 있었던 시각 (다른 가게에 가 있는 동안 번 돈 정산용) */
  lastVisitedAt: number;
  /** 초원 어느 칸에 지었는지 (아직 안 지었으면 null). 플레이어가 원하는
   * 빈 칸을 골라서 짓기 때문에 자리가 고정이 아닙니다. */
  plot: { gx: number; gy: number } | null;
}

export interface SaveData {
  /** 가게 전체가 하나로 쓰는 공용 자원 */
  coins: number;
  fame: number;
  hobbies: string[];
  totalDonated: number;
  lastSavedAt: number;
  totalEarned: number;
  /** 며칠째 영업 중인지 (1일차부터) */
  day: number;
  /** 게임 속 시각 — 자정부터 흐른 분 */
  clock: number;
  /** 아직 마감하지 않은 오늘 장부 (모든 지점 합산) */
  today: DayLedger;
  /** 마감이 끝난 지난 날들 (최근 것이 앞) */
  history: DayLedger[];
  /** 지금 보고 있는 가게 */
  activeRestaurant: RestaurantId;
  restaurants: Record<RestaurantId, RestaurantSaveData>;
  /** 환생한 횟수 — 환생할 때마다 모든 가게 판매가가 영구히 올라갑니다 */
  prestigeCount: number;
}

/** 손님 한 명의 주문 (단품 또는 세트) */
export interface Order {
  kind: "single" | "set";
  /** 세트 주문일 때만. 세트 경험치를 어디에 줄지 정합니다 */
  setId?: string;
  /** 단품이면 1개, 세트면 [음료, 디저트] */
  itemIds: string[];
  name: string;
  price: number;
  makeTimeMs: number;
}

function defaultFloor(cfg: RestaurantConfig, index: number): FloorData {
  return {
    unlocked: index === 0,
    tables: index === 0 ? STARTING_TABLES : 0,
    // 1층은 바리스타 한 명과 함께 시작합니다.
    barista: index === 0 ? 1 : 0,
    server: 0,
    manager: 0,
    // 어느 층이든 그 가게의 기본 설비는 깔아드립니다.
    equipment: [...cfg.startingEquipment],
  };
}

/** 자리마다 기본 옷을 입고 시작합니다 */
function defaultEquipped(): Record<UniformSlot, string> {
  const out = {} as Record<UniformSlot, string>;
  for (const slot of UNIFORM_SLOTS) {
    out[slot] = uniformsOfSlot(slot)[0].id;
  }
  return out;
}

/** 자리마다 기본 인테리어로 시작합니다 */
function defaultDecorEquipped(): Record<DecorSlot, string> {
  const out = {} as Record<DecorSlot, string>;
  for (const slot of DECOR_SLOTS) {
    out[slot] = decorOfSlot(slot)[0].id;
  }
  return out;
}

function defaultRestaurantData(id: RestaurantId): RestaurantSaveData {
  const cfg = restaurantConfig(id);
  const menu: Record<string, MenuProgress> = {};
  for (const item of [...cfg.drinks, ...cfg.desserts]) {
    menu[item.id] = { level: 1, exp: 0, stock: 0, stars: 0 };
  }
  // 첫 메뉴는 재고를 조금 채워서 시작합니다.
  if (cfg.drinks[0]) menu[cfg.drinks[0].id].stock = STARTING_STOCK;

  const sets: Record<string, SetProgress> = {};
  for (const set of cfg.sets) sets[set.id] = { level: 1, exp: 0 };

  return {
    constructed: id === "cafe",
    menu,
    launched: [...cfg.startingLaunched],
    sets,
    floors: Array.from({ length: MAX_FLOORS }, (_, i) => defaultFloor(cfg, i)),
    generalManager: false,
    uniforms: [...STARTING_UNIFORMS],
    equipped: defaultEquipped(),
    decor: [...STARTING_DECOR],
    decorEquipped: defaultDecorEquipped(),
    lastVisitedAt: Date.now(),
    // 카페는 항상 지어진 채로 시작하니 자리도 처음부터 가운데에 잡아둡니다.
    plot: id === "cafe" ? { gx: 0, gy: 0 } : null,
  };
}

function defaultSave(): SaveData {
  const restaurants = {} as Record<RestaurantId, RestaurantSaveData>;
  for (const id of RESTAURANT_ORDER) restaurants[id] = defaultRestaurantData(id);

  return {
    coins: 100,
    fame: 0,
    hobbies: [],
    totalDonated: 0,
    lastSavedAt: Date.now(),
    totalEarned: 0,
    day: 1,
    clock: OPEN_HOUR * 60,
    today: emptyLedger(1),
    history: [],
    activeRestaurant: "cafe",
    restaurants,
    prestigeCount: 0,
  };
}

export function emptyLedger(day: number): DayLedger {
  const byRestaurant = {} as Record<RestaurantId, RestaurantDayStats>;
  for (const id of RESTAURANT_ORDER) byRestaurant[id] = emptyRestaurantDayStats();
  return { day, revenue: 0, supplyCost: 0, wageCost: 0, served: 0, byRestaurant };
}

/** 장부 한 줄의 지출 합계와 순이익 */
export function ledgerExpense(l: DayLedger): number {
  return l.supplyCost + l.wageCost;
}

export function ledgerProfit(l: DayLedger): number {
  return l.revenue - ledgerExpense(l);
}

/** 게임 속 시각을 "14:30" 처럼 보여줍니다 */
export function clockText(minutes: number): string {
  const total = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 예전(가게가 카페 하나뿐이던 시절) 저장본 하나를 새 구조의 카페 자리로 옮겨 담습니다 */
function mergeRestaurantData(
  id: RestaurantId,
  base: RestaurantSaveData,
  saved: Partial<RestaurantSaveData> | undefined,
): RestaurantSaveData {
  const cfg = restaurantConfig(id);
  if (!saved) return base;

  const merged: RestaurantSaveData = { ...base, ...saved };
  merged.constructed = typeof saved.constructed === "boolean" ? saved.constructed : base.constructed;

  merged.menu = { ...base.menu };
  for (const [itemId, progress] of Object.entries(saved.menu ?? {})) {
    if (merged.menu[itemId]) merged.menu[itemId] = { ...merged.menu[itemId], ...progress };
  }

  // 예전에는 설비가 가게 전체 공용이었습니다. 그때 산 설비는 열려 있던
  // 층 모두에 그대로 놓아드려, 업데이트로 손해 보는 일이 없게 합니다.
  const legacyEquipment = (saved as { equipment?: string[] }).equipment ?? [];
  merged.floors = base.floors.map((floor, i) => {
    const savedFloor = saved.floors?.[i];
    const floorMerged: FloorData = { ...floor, ...(savedFloor ?? {}) };
    floorMerged.equipment = Array.from(
      new Set([
        ...cfg.startingEquipment,
        ...(savedFloor?.equipment ?? []),
        ...(floorMerged.unlocked ? legacyEquipment : []),
      ]),
    );
    return floorMerged;
  });

  // 이미 "돈 주고 산" 설비(기본 설비 말고)가 있는 메뉴는 예전 규칙대로
  // 팔리고 있었을 테니, 다시 사라고 하지 않고 그대로 열어드립니다.
  const purchasedEquipmentIds = new Set(
    merged.floors.flatMap((f) => f.equipment.filter((e) => !cfg.startingEquipment.includes(e))),
  );
  const grandfathered = [...cfg.drinks, ...cfg.desserts]
    .filter((m) => purchasedEquipmentIds.has(m.equipmentId))
    .map((m) => m.id);
  merged.launched = Array.from(
    new Set([...cfg.startingLaunched, ...grandfathered, ...(saved.launched ?? [])]),
  );

  merged.generalManager =
    typeof saved.generalManager === "boolean" ? saved.generalManager : base.generalManager;

  merged.uniforms = Array.from(new Set([...STARTING_UNIFORMS, ...(saved.uniforms ?? [])]));
  merged.equipped = { ...defaultEquipped(), ...(saved.equipped ?? {}) };
  for (const slot of UNIFORM_SLOTS) {
    if (!merged.uniforms.includes(merged.equipped[slot])) {
      merged.equipped[slot] = uniformsOfSlot(slot)[0].id;
    }
  }

  merged.decor = Array.from(new Set([...STARTING_DECOR, ...(saved.decor ?? [])]));
  merged.decorEquipped = { ...defaultDecorEquipped(), ...(saved.decorEquipped ?? {}) };
  for (const slot of DECOR_SLOTS) {
    if (!merged.decor.includes(merged.decorEquipped[slot])) {
      merged.decorEquipped[slot] = decorOfSlot(slot)[0].id;
    }
  }

  merged.sets = { ...base.sets };
  for (const [setId, progress] of Object.entries(saved.sets ?? {})) {
    if (merged.sets[setId]) merged.sets[setId] = { ...merged.sets[setId], ...progress };
  }

  merged.lastVisitedAt = typeof saved.lastVisitedAt === "number" ? saved.lastVisitedAt : Date.now();

  // 자리를 직접 고를 수 있게 되기 전(예전 저장본)에는 매장마다 자리가
  // 고정이었습니다. 이미 지어놓은 매장이 갑자기 사라져 보이지 않도록,
  // 그 예전 고정 자리를 그대로 물려받게 합니다.
  const legacyPlot: Record<RestaurantId, { gx: number; gy: number }> = {
    cafe: { gx: 0, gy: 0 },
    pocha: { gx: -2, gy: -2 },
    bunsik: { gx: 2, gy: 2 },
    // 치킨집·편의점은 자유 배치가 생긴 뒤에 추가된 가게라 "고정 자리"였던
    // 적이 없습니다 — 옛날 저장본이 이 두 가게를 지은 상태로 가져올 일도
    // 없지만, 타입을 맞추기 위해 자리만 채워둡니다.
    chicken: { gx: 3, gy: -3 },
    mart: { gx: -3, gy: 3 },
  };
  const savedPlot = (saved as { plot?: { gx: number; gy: number } | null }).plot;
  if (savedPlot && typeof savedPlot.gx === "number" && typeof savedPlot.gy === "number") {
    merged.plot = savedPlot;
  } else if (merged.constructed) {
    merged.plot = legacyPlot[id];
  } else {
    merged.plot = null;
  }

  return merged;
}

class GameState {
  data: SaveData;
  offlineEarnings = 0;
  offlineDurationMs = 0;
  offlineServes = 0;

  /** "다시 오셨네요" 팝업을 한 번 보여준 뒤에는 반드시 불러서, 같은 가게를
   * 다시 들어올 때(자리를 비운 게 아닌데도) 이 오래된 값이 또 뜨지 않게 합니다. */
  clearOfflineEarnings() {
    this.offlineEarnings = 0;
    this.offlineDurationMs = 0;
    this.offlineServes = 0;
  }

  constructor() {
    this.data = this.load();
  }

  /* ------------------------- 지금 보고 있는 가게 ------------------------- */

  /** 지금 활성화된 가게의 설정(메뉴·설비·세트·값 단위) */
  cfg(): RestaurantConfig {
    return restaurantConfig(this.data.activeRestaurant);
  }

  /** 지금 활성화된 가게의 저장 데이터 */
  private rdata(): RestaurantSaveData {
    return this.data.restaurants[this.data.activeRestaurant];
  }

  restaurantData(id: RestaurantId): RestaurantSaveData {
    return this.data.restaurants[id];
  }

  isConstructed(id: RestaurantId): boolean {
    return this.data.restaurants[id].constructed;
  }

  /** 그 가게에 총괄 매니저가 있는가 (안 주면 지금 보고 있는 가게 기준) */
  hasGeneralManager(id: RestaurantId = this.data.activeRestaurant): boolean {
    return this.data.restaurants[id].generalManager;
  }

  /** 그 가게의 총괄 매니저 고용비 (안 주면 지금 보고 있는 가게 기준) */
  generalManagerCost(id: RestaurantId = this.data.activeRestaurant): number {
    return Math.round(GENERAL_MANAGER_COST * restaurantConfig(id).costScale);
  }

  /** 지금 보고 있는 가게에 총괄 매니저를 고용합니다 */
  hireGeneralManager(): boolean {
    if (this.hasGeneralManager()) return false;
    if (!this.spendCoins(this.generalManagerCost())) return false;
    this.rdata().generalManager = true;
    return true;
  }

  /** 이 가게를 지을 수 있는가 (아직 안 지었고, 짓는 비용만큼 돈이 있는가 —
   * 순서는 따로 없어서 돈만 모이면 어느 가게든 먼저 지을 수 있습니다) */
  canBuildRestaurant(id: RestaurantId): boolean {
    const r = this.data.restaurants[id];
    if (r.constructed) return false;
    return this.data.coins >= restaurantConfig(id).buildCost;
  }

  /** 그 칸에 이미 다른 매장이 지어져 있는가 */
  isPlotTaken(gx: number, gy: number): boolean {
    return RESTAURANT_ORDER.some((id) => {
      const p = this.data.restaurants[id].plot;
      return p !== null && p.gx === gx && p.gy === gy;
    });
  }

  /** 새 가게를 짓습니다. 비용을 내고, 플레이어가 고른 빈 칸에 자리를 잡습니다 */
  buildRestaurant(id: RestaurantId, gx: number, gy: number): boolean {
    const r = this.data.restaurants[id];
    if (r.constructed) return false;
    if (this.isPlotTaken(gx, gy)) return false;
    if (!this.spendCoins(restaurantConfig(id).buildCost)) return false;
    r.constructed = true;
    r.plot = { gx, gy };
    r.lastVisitedAt = Date.now();
    return true;
  }

  /** 지금 보고 있는 가게를 바꿉니다. 자리를 비운 동안 번 돈이 있으면 정산해서 보여줍니다 */
  switchRestaurant(id: RestaurantId) {
    if (id === this.data.activeRestaurant) return;
    if (!this.data.restaurants[id].constructed) return;
    this.rdata().lastVisitedAt = Date.now();
    this.save();

    const target = this.data.restaurants[id];
    const cap = target.generalManager ? OFFLINE_EARNINGS_CAP_MS : OFFLINE_NO_GM_CAP_MS;
    const elapsed = Math.min(Math.max(0, Date.now() - target.lastVisitedAt), cap);

    this.data.activeRestaurant = id;
    this.applyOfflineEarningsFor(elapsed);
    this.rdata().lastVisitedAt = Date.now();
    this.save();
  }

  /**
   * 하루가 마감되기 직전에 호출합니다. 지금 들어가 있지 않은 다른
   * 가게들은, 그 가게에 들어갔을 때(또는 앱을 다시 열었을 때)만 자리
   * 비운 동안 번 돈이 들어오므로, 하루 종일 한 번도 안 들어갔다 오면
   * 그 가게는 매출 0원인 채로 인건비만 나가는 것처럼 보일 수 있습니다.
   * 그래서 마감 직전에 다른 가게들도 한 번씩 미리 정산해 넣어, 지어둔
   * 가게 전부가 그날 매출표에 제대로 반영되게 합니다. 지금 활성 가게는
   * 이미 실시간으로 반영되고 있으니 건드리지 않습니다.
   */
  settleInactiveRestaurantsForDayClose() {
    const activeId = this.data.activeRestaurant;
    for (const id of RESTAURANT_ORDER) {
      if (id === activeId) continue;
      const r = this.data.restaurants[id];
      if (!r.constructed) continue;

      const cap = r.generalManager ? OFFLINE_EARNINGS_CAP_MS : OFFLINE_NO_GM_CAP_MS;
      const elapsed = Math.min(Math.max(0, Date.now() - r.lastVisitedAt), cap);

      this.data.activeRestaurant = id;
      this.applyOfflineEarningsFor(elapsed);
      r.lastVisitedAt = Date.now();
    }
    this.data.activeRestaurant = activeId;
  }

  /* ------------------------------ 저장 ------------------------------ */

  private load(): SaveData {
    const base = defaultSave();
    let parsed: Record<string, unknown> | null = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
    if (!parsed) return base;

    // v4 이하(가게가 카페 하나뿐이던 시절) 저장본은 flat한 구조입니다.
    // 그 저장본을 통째로 새 구조의 "카페" 자리로 옮겨 담습니다.
    const isLegacyFlat = !parsed.restaurants && Array.isArray(parsed.floors);
    const restaurantsSource = (
      isLegacyFlat
        ? { cafe: parsed as Partial<RestaurantSaveData> }
        : ((parsed.restaurants as Record<string, Partial<RestaurantSaveData>>) ?? {})
    ) as Partial<Record<RestaurantId, Partial<RestaurantSaveData>>>;

    const merged: SaveData = { ...base, ...parsed } as SaveData;
    merged.restaurants = {} as Record<RestaurantId, RestaurantSaveData>;
    for (const id of RESTAURANT_ORDER) {
      merged.restaurants[id] = mergeRestaurantData(id, base.restaurants[id], restaurantsSource[id]);
    }
    merged.activeRestaurant = RESTAURANT_ORDER.includes(parsed.activeRestaurant as RestaurantId)
      ? (parsed.activeRestaurant as RestaurantId)
      : "cafe";

    // 한동안 총괄 매니저가 회사 전체 공용이던 저장본(가게별 자리가 따로
    // 없던 시절)은, 그 총괄 매니저를 카페 자리로 옮겨 담습니다.
    if (!isLegacyFlat && typeof parsed.generalManager === "boolean") {
      const cafeSaved = restaurantsSource.cafe;
      if (!cafeSaved || typeof cafeSaved.generalManager !== "boolean") {
        merged.restaurants.cafe.generalManager = parsed.generalManager;
      }
      const legacyGmUniforms = (parsed.gmUniforms as string[] | undefined) ?? [];
      if (legacyGmUniforms.length) {
        merged.restaurants.cafe.uniforms = Array.from(
          new Set([...merged.restaurants.cafe.uniforms, ...legacyGmUniforms]),
        );
      }
      const legacyGmEquipped = parsed.gmEquipped as string | undefined;
      if (legacyGmEquipped && merged.restaurants.cafe.uniforms.includes(legacyGmEquipped)) {
        merged.restaurants.cafe.equipped.gm = legacyGmEquipped;
      }
    }

    // 인지도 · 취미 활동 · 기부 총액도 나중에 추가된 기능이라 예전 저장본에는 없습니다.
    merged.fame = typeof parsed.fame === "number" ? parsed.fame : 0;
    merged.hobbies = Array.isArray(parsed.hobbies) ? (parsed.hobbies as string[]) : [];
    merged.totalDonated = typeof parsed.totalDonated === "number" ? parsed.totalDonated : 0;
    // 환생도 나중에 추가된 기능이라 예전 저장본에는 없습니다.
    merged.prestigeCount = typeof parsed.prestigeCount === "number" ? parsed.prestigeCount : 0;

    // 매출표는 나중에 추가된 기능이라, 예전 저장본에는 없습니다.
    merged.today = { ...emptyLedger(merged.day), ...((parsed.today as Partial<DayLedger>) ?? {}) };
    merged.history = Array.isArray(parsed.history) ? (parsed.history as DayLedger[]) : [];
    return merged;
  }

  save() {
    this.data.lastSavedAt = Date.now();
    this.rdata().lastVisitedAt = this.data.lastSavedAt;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // 저장 공간을 못 쓰는 환경(시크릿 모드 등)에서는 조용히 넘어갑니다.
    }
  }

  reset() {
    this.data = defaultSave();
    this.offlineEarnings = 0;
    this.offlineDurationMs = 0;
    this.offlineServes = 0;
    this.save();
  }

  /* ------------------------------ 재화 ------------------------------ */

  addCoins(amount: number) {
    this.data.coins += amount;
    if (amount > 0) this.data.totalEarned += amount;
  }

  spendCoins(amount: number): boolean {
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    return true;
  }

  /* --------------------------- 하루 / 장부 --------------------------- */

  /** 손님에게 받은 돈을 오늘 매출에 적습니다 (가게 전체 합산 + 지금 활성 가게별) */
  recordSale(amount: number) {
    this.data.today.revenue += amount;
    this.data.today.served += 1;
    const stats = this.data.today.byRestaurant?.[this.data.activeRestaurant];
    if (stats) {
      stats.revenue += amount;
      stats.served += 1;
    }
  }

  /* ----------------------------- 유니폼 ----------------------------- */

  ownsUniform(id: string): boolean {
    return this.rdata().uniforms.includes(id);
  }

  equippedUniform(slot: UniformSlot): string {
    return this.rdata().equipped[slot];
  }

  buyUniform(id: string): boolean {
    const def = uniformById(id);
    if (!def || this.ownsUniform(id)) return false;
    if (!this.spendCoins(def.cost)) return false;
    this.rdata().uniforms.push(id);
    return true;
  }

  equipUniform(id: string): boolean {
    const def = uniformById(id);
    if (!def || !this.ownsUniform(id)) return false;
    this.rdata().equipped[def.slot] = id;
    return true;
  }

  /** 그 자리가 지금 입고 있는 옷의 장착 효과 */
  equipEffect(slot: UniformSlot): UniformEquipEffect {
    return uniformById(this.equippedUniform(slot))?.equip ?? {};
  }

  /** 옷장에 있는 모든 옷의 보유 효과를 더한 값 */
  ownedBonus(): Required<UniformOwnEffect> {
    const total = { price: 0, patience: 0, fameBoost: 0, supplyCut: 0 };
    for (const id of this.rdata().uniforms) {
      const own = uniformById(id)?.own;
      if (!own) continue;
      total.price += own.price ?? 0;
      total.patience += own.patience ?? 0;
      total.fameBoost += own.fameBoost ?? 0;
      total.supplyCut += own.supplyCut ?? 0;
    }
    return total;
  }

  /** 옷장을 몇 벌 채웠는지 (화면 표시용) */
  uniformProgress(): { owned: number; total: number } {
    return { owned: this.rdata().uniforms.length, total: UNIFORMS.length };
  }

  /** 유니폼 + 인테리어(장착·보유) + 취미 효과를 합친 값. 실제 계산은 다 이걸 씁니다 */
  totalBonus(): Required<UniformOwnEffect> & { spawnBoost: number } {
    const u = this.ownedBonus();
    const d = this.decorBonus();
    const dOwn = this.decorOwnedBonus();
    const h = this.hobbyBonus();
    return {
      price: u.price + d.price + dOwn.price + h.price,
      patience: u.patience + d.patience + dOwn.patience + h.patience,
      fameBoost: u.fameBoost + d.fameBoost + dOwn.fameBoost + h.fameBoost,
      supplyCut: u.supplyCut,
      spawnBoost: d.spawnBoost + dOwn.spawnBoost + h.spawnBoost,
    };
  }

  /* ----------------------------- 인테리어 ----------------------------- */

  ownsDecor(id: string): boolean {
    return this.rdata().decor.includes(id);
  }

  equippedDecor(slot: DecorSlot): string {
    return this.rdata().decorEquipped[slot];
  }

  /** 지금 그 자리에 쓰고 있는 인테리어의 색 (바닥·벽지 그리기용) */
  decorColors(slot: DecorSlot) {
    const def = decorById(this.equippedDecor(slot));
    return def?.colors ?? decorOfSlot(slot)[0].colors;
  }

  buyDecor(id: string): boolean {
    const def = decorById(id);
    if (!def || this.ownsDecor(id)) return false;
    if (!this.spendCoins(def.cost)) return false;
    this.rdata().decor.push(id);
    return true;
  }

  wearDecor(id: string): boolean {
    const def = decorById(id);
    if (!def || !this.ownsDecor(id)) return false;
    this.rdata().decorEquipped[def.slot] = id;
    return true;
  }

  /** 인테리어를 몇 개 모았는지 (화면 표시용) */
  decorProgress(): { owned: number; total: number } {
    return { owned: this.rdata().decor.length, total: DECOR.length };
  }

  /** 지금 자리마다 장착 중인 인테리어의 효과를 더한 값 (안 쓰는 건 효과 없음) */
  decorBonus(): Required<DecorEffect> {
    const total = { price: 0, patience: 0, spawnBoost: 0, fameBoost: 0 };
    for (const slot of DECOR_SLOTS) {
      const eff = decorById(this.equippedDecor(slot))?.equipEffect;
      if (!eff) continue;
      total.price += eff.price ?? 0;
      total.patience += eff.patience ?? 0;
      total.spawnBoost += eff.spawnBoost ?? 0;
      total.fameBoost += eff.fameBoost ?? 0;
    }
    return total;
  }

  /** 사둔 인테리어 전부의 보유 효과를 더한 값 (안 쓰고 있어도 붙어요) */
  decorOwnedBonus(): Required<DecorEffect> {
    const total = { price: 0, patience: 0, spawnBoost: 0, fameBoost: 0 };
    for (const id of this.rdata().decor) {
      const eff = decorById(id)?.ownEffect;
      if (!eff) continue;
      total.price += eff.price ?? 0;
      total.patience += eff.patience ?? 0;
      total.spawnBoost += eff.spawnBoost ?? 0;
      total.fameBoost += eff.fameBoost ?? 0;
    }
    return total;
  }

  /* ------------------------------ 인지도 · 취미 · 기부 ------------------------------ */

  /** 손님이 남긴 인내심 비율(0~1)만큼 이번 방문의 인지도를 계산해서 더해줍니다. 실제로 받은 양을 돌려줍니다 */
  awardFameForVisit(patienceRatio: number): number {
    const base = fameForVisit(patienceRatio);
    const amount = Math.max(1, Math.round(base * (1 + this.totalBonus().fameBoost)));
    this.data.fame += amount;
    return amount;
  }

  ownsHobby(id: string): boolean {
    return this.data.hobbies.includes(id);
  }

  /** 이 취미 활동을 살 수 있을 만큼 인지도가 쌓였는가 (인지도 자체는 쓰지 않습니다) */
  hobbyUnlocked(id: string): boolean {
    const def = hobbyById(id);
    return !!def && this.data.fame >= def.fameRequired;
  }

  /** 인지도가 일정 이상 쌓이면, 그때부터 코인을 내고 취미 활동을 살 수 있습니다 */
  buyHobby(id: string): boolean {
    const def = hobbyById(id);
    if (!def || this.ownsHobby(id)) return false;
    if (!this.hobbyUnlocked(id)) return false;
    if (!this.spendCoins(hobbyCoinCost(def))) return false;
    this.data.hobbies.push(id);
    return true;
  }

  /** 취미 활동을 몇 개 모았는지 (화면 표시용) */
  hobbyProgress(): { owned: number; total: number } {
    return { owned: this.data.hobbies.length, total: HOBBIES.length };
  }

  /** 사둔 취미 활동의 효과를 모두 더한 값 */
  hobbyBonus(): Required<HobbyEffect> {
    const total = { price: 0, patience: 0, spawnBoost: 0, fameBoost: 0 };
    for (const id of this.data.hobbies) {
      const eff = hobbyById(id)?.effect;
      if (!eff) continue;
      total.price += eff.price ?? 0;
      total.patience += eff.patience ?? 0;
      total.spawnBoost += eff.spawnBoost ?? 0;
      total.fameBoost += eff.fameBoost ?? 0;
    }
    return total;
  }

  /** 코인을 기부하고 그만큼 인지도를 받습니다 */
  donate(amount: number): number {
    const fame = donationFame(amount);
    if (fame <= 0) return 0;
    if (!this.spendCoins(amount)) return 0;
    this.data.fame += fame;
    this.data.totalDonated += amount;
    return fame;
  }

  /* ------------------------------ 환생 ------------------------------ */

  /** 환생으로 영구히 붙은 판매가 배수 (환생 안 했으면 1배) */
  prestigeBonus(): number {
    return 1 + this.data.prestigeCount * PRESTIGE_BONUS_PER_LEVEL;
  }

  /** 환생으로 영구히 붙은 메뉴 경험치 배수 (환생 안 했으면 1배) */
  prestigeExpBonus(): number {
    return 1 + this.data.prestigeCount * PRESTIGE_EXP_BONUS_PER_LEVEL;
  }

  /** 지금 환생할 수 있는가 (카페 4층, 즉 최종 업그레이드를 열었는가) */
  canPrestige(): boolean {
    return this.data.restaurants.cafe.floors[MAX_FLOORS - 1].unlocked;
  }

  /**
   * 환생합니다. 코인과 지어둔 가게들(층·직원·메뉴·유니폼·인테리어)은 전부
   * 초기화되지만, 인지도·취미·기부 총액·평생 누적 매출은 그대로 남고,
   * 환생 횟수가 하나 늘어난 만큼 모든 가게의 판매가와 메뉴 경험치가
   * 영구히 올라갑니다.
   */
  doPrestige(): boolean {
    if (!this.canPrestige()) return false;
    const keep = {
      fame: this.data.fame,
      hobbies: this.data.hobbies,
      totalDonated: this.data.totalDonated,
      totalEarned: this.data.totalEarned,
      prestigeCount: this.data.prestigeCount + 1,
    };
    this.data = { ...defaultSave(), ...keep };
    this.save();
    return true;
  }

  /** 발주에 쓴 돈을 오늘 재료비에 적습니다 (가게 전체 합산 + 지금 활성 가게별) */
  recordSupplyCost(amount: number) {
    this.data.today.supplyCost += amount;
    const stats = this.data.today.byRestaurant?.[this.data.activeRestaurant];
    if (stats) stats.supplyCost += amount;
  }

  /** 가게 하나의 하루 인건비 (그 가게가 안 지어졌으면 0) — 가게마다 다르게
   * 뛰지 않도록 모든 가게가 분식집 값 단위를 기준으로 계산합니다 */
  restaurantWageTotal(id: RestaurantId): number {
    const r = this.data.restaurants[id];
    if (!r.constructed) return 0;
    const scale = WAGE_COST_SCALE;
    let total = 0;
    r.floors.forEach((floor, i) => {
      if (!floor.unlocked) return;
      for (const role of ROLE_ORDER) total += floor[role] * roleWage(role, i, scale);
    });
    // 그 가게의 총괄 매니저가 입은 옷만큼, 그 가게 인건비만 깎입니다.
    if (r.generalManager) {
      const cut = Math.min(0.8, uniformById(r.equipped.gm)?.equip.wageCut ?? 0);
      total = Math.round(total * (1 - cut));
    }
    return total;
  }

  /** 지금 고용한 사람들의 하루 인건비 합계 — 지어놓은 가게 전부를 더합니다 */
  dailyWageTotal(): number {
    return RESTAURANT_ORDER.reduce((sum, id) => sum + this.restaurantWageTotal(id), 0);
  }

  /** 그 층 하루 인건비 (지금 활성화된 가게 기준) — 인건비는 가게마다 다르게
   * 뛰지 않도록 모든 가게가 분식집 값 단위를 기준으로 계산합니다 */
  floorWageTotal(floorIndex: number): number {
    const floor = this.floor(floorIndex);
    if (!floor.unlocked) return 0;
    const scale = WAGE_COST_SCALE;
    return ROLE_ORDER.reduce(
      (sum, role) => sum + floor[role] * roleWage(role, floorIndex, scale),
      0,
    );
  }

  /** 지금 고용한 사람 수 (직급 상관없이, 지어놓은 가게 전부 합산) */
  totalStaff(): number {
    let total = 0;
    for (const id of RESTAURANT_ORDER) {
      const r = this.data.restaurants[id];
      if (!r.constructed) continue;
      for (const floor of r.floors) {
        if (!floor.unlocked) continue;
        for (const role of ROLE_ORDER) total += floor[role];
      }
    }
    return total;
  }

  /**
   * 하루를 마감합니다. 인건비를 지급하고 오늘 장부를 기록으로 넘깁니다.
   * 돌려주는 값이 마감 정산 화면에 그대로 뜹니다.
   */
  closeDay(): DayLedger {
    let wages = 0;
    for (const id of RESTAURANT_ORDER) {
      const wage = this.restaurantWageTotal(id);
      wages += wage;
      const stats = this.data.today.byRestaurant?.[id];
      if (stats) stats.wageCost = wage;
    }
    this.data.today.wageCost = wages;
    // 인건비는 가진 돈이 모자라도 그대로 나갑니다. 잔고가 마이너스로
    // 내려가면 다음 날은 빚을 지고 시작해요.
    this.data.coins -= wages;

    const closed = { ...this.data.today };
    this.data.history.unshift(closed);
    // 한 달 어치가 넘어가면, 하루씩 조금씩 줄이지 않고 가장 오래된 한 주를 통째로 지웁니다.
    if (this.data.history.length > LEDGER_HISTORY_MAX_DAYS) {
      this.data.history.length -= LEDGER_WEEK_DAYS;
    }
    return closed;
  }

  /** 마감 정산을 확인하면 다음 날 아침으로 넘어갑니다 */
  startNextDay() {
    this.data.day += 1;
    this.data.clock = OPEN_HOUR * 60;
    this.data.today = emptyLedger(this.data.day);
    this.save();
  }

  /* --------------------------- 메뉴 / 해금 --------------------------- */

  progress(id: string): MenuProgress {
    return this.rdata().menu[id];
  }

  hasEquipment(floorIndex: number, id: string): boolean {
    return this.floor(floorIndex).equipment.includes(id);
  }

  /** 열려 있는 층 중 하나라도 이 설비를 갖고 있는가 */
  hasEquipmentAnywhere(id: string): boolean {
    return this.rdata().floors.some((f) => f.unlocked && f.equipment.includes(id));
  }

  /** 발주 탭에서 한 번 사서 열어둔 메뉴인가 */
  isLaunched(id: string): boolean {
    return this.rdata().launched.includes(id);
  }

  /**
   * 설비를 산 뒤, 발주 탭에서 이 메뉴를 처음 구매합니다 (한 번만).
   * 성공하면 그 뒤로는 계속 재고를 발주해서 팔 수 있어요.
   */
  launchMenu(id: string): boolean {
    if (this.isLaunched(id)) return false;
    const item = menuById(id);
    if (!this.hasEquipmentAnywhere(item.equipmentId)) return false;
    if (!this.spendCoins(item.launchCost)) return false;
    this.rdata().launched.push(id);
    return true;
  }

  /** 그 층에서 실제로 팔 수 있는 상태인가 (발주 탭에서 열어둔 메뉴 + 그 층의 설비) */
  isSellable(floorIndex: number, id: string): boolean {
    return (
      this.isLaunched(id) && this.hasEquipment(floorIndex, menuById(id).equipmentId)
    );
  }

  /** 어느 층에서든 팔 수 있는가 (메뉴판·발주 화면처럼 가게 전체를 볼 때) */
  isSellableAnywhere(id: string): boolean {
    return (
      this.isLaunched(id) && this.hasEquipmentAnywhere(menuById(id).equipmentId)
    );
  }

  /** 지금 가게의 메뉴 목록 (카테고리를 안 주면 음료+디저트 전체) */
  private menuList(category?: Category): MenuDef[] {
    const cfg = this.cfg();
    if (category === "drink") return cfg.drinks;
    if (category === "dessert") return cfg.desserts;
    return [...cfg.drinks, ...cfg.desserts];
  }

  sellableItems(floorIndex: number, category?: Category): MenuDef[] {
    return this.menuList(category).filter((m) => this.isSellable(floorIndex, m.id));
  }

  /** 가게 전체에서 팔 수 있는 메뉴 (발주·재고 경고에 씁니다) */
  sellableAnywhere(category?: Category): MenuDef[] {
    return this.menuList(category).filter((m) => this.isSellableAnywhere(m.id));
  }

  /** 설비는 있지만 아직 발주 탭에서 안 산 메뉴 (발주 탭의 "구매" 목록용) */
  awaitingLaunch(category?: Category): MenuDef[] {
    return this.menuList(category).filter(
      (m) => !this.isLaunched(m.id) && this.hasEquipmentAnywhere(m.equipmentId),
    );
  }

  priceOf(id: string): number {
    const item = menuById(id);
    const p = this.progress(id);
    const base = item.basePrice * priceMultiplier(p.level) * starMultiplier(p.stars);
    return Math.round(
      base * (1 + this.totalBonus().price) * this.cfg().revenueScale * this.prestigeBonus(),
    );
  }

  /** 지금 별에서 다음 별로 강화하는 데 드는 비용 (이미 만렙이면 0) */
  enhanceCostOf(id: string): number {
    const p = this.progress(id);
    if (p.stars >= MAX_MENU_STARS) return 0;
    return enhanceCost(menuById(id), p.stars);
  }

  /** 지금 별에서 다음 별로 강화 성공할 확률 (이미 만렙이면 0) */
  enhanceChanceOf(id: string): number {
    const p = this.progress(id);
    if (p.stars >= MAX_MENU_STARS) return 0;
    return enhanceChance(p.stars);
  }

  /** 다음 별로 강화하려면 이 메뉴가 몇 레벨이어야 하는지 (이미 만렙이면 0) */
  enhanceRequiredLevelOf(id: string): number {
    const p = this.progress(id);
    if (p.stars >= MAX_MENU_STARS) return 0;
    return enhanceRequiredLevel(p.stars);
  }

  /** 지금 바로 강화를 시도할 수 있는가 (레벨 조건을 채웠는가) */
  canEnhance(id: string): boolean {
    const p = this.progress(id);
    if (p.stars >= MAX_MENU_STARS) return false;
    return p.level >= enhanceRequiredLevel(p.stars);
  }

  /**
   * 돈을 내고 별 강화에 도전합니다. 확률에 따라 성공/실패가 갈리고,
   * 실패해도 낸 돈만 사라질 뿐 별은 그대로예요 (등급이 깎이지 않습니다).
   */
  enhanceMenu(id: string): "success" | "fail" | "maxed" | "no-coins" | "level-locked" {
    const p = this.progress(id);
    if (p.stars >= MAX_MENU_STARS) return "maxed";
    if (p.level < enhanceRequiredLevel(p.stars)) return "level-locked";
    const cost = enhanceCost(menuById(id), p.stars);
    if (!this.spendCoins(cost)) return "no-coins";
    const success = Math.random() < enhanceChance(p.stars);
    if (success) p.stars += 1;
    return success ? "success" : "fail";
  }

  /** 판매 경험치를 주고, 레벨이 올랐으면 true (환생했으면 그만큼 더 받습니다) */
  addExp(id: string, amount = 1): boolean {
    const p = this.progress(id);
    if (p.level >= MAX_MENU_LEVEL) return false;
    p.exp += Math.round(amount * this.prestigeExpBonus());
    let leveled = false;
    while (p.level < MAX_MENU_LEVEL && p.exp >= expToNext(p.level)) {
      p.exp -= expToNext(p.level);
      p.level += 1;
      leveled = true;
    }
    if (p.level >= MAX_MENU_LEVEL) p.exp = 0;
    return leveled;
  }

  /* ---------------------------- 세트 메뉴 ---------------------------- */

  sellableSets(floorIndex: number): SetDef[] {
    return this.cfg().sets.filter(
      (s) =>
        this.isSellable(floorIndex, s.drinkId) &&
        this.isSellable(floorIndex, s.dessertId),
    );
  }

  sellableSetsAnywhere(): SetDef[] {
    return this.cfg().sets.filter(
      (s) => this.isSellableAnywhere(s.drinkId) && this.isSellableAnywhere(s.dessertId),
    );
  }

  setProgress(setId: string): SetProgress {
    return this.rdata().sets[setId];
  }

  setPrice(set: SetDef): number {
    const parts = this.priceOf(set.drinkId) + this.priceOf(set.dessertId);
    const level = this.setProgress(set.id).level;
    return Math.round(parts * set.bonusRate * priceMultiplier(level));
  }

  /** 세트를 한 번 팔았을 때. 레벨이 올랐으면 true (환생했으면 그만큼 더 받습니다) */
  addSetExp(setId: string, amount = 1): boolean {
    const p = this.setProgress(setId);
    if (!p || p.level >= MAX_MENU_LEVEL) return false;
    p.exp += Math.round(amount * this.prestigeExpBonus());
    let leveled = false;
    while (p.level < MAX_MENU_LEVEL && p.exp >= expToNext(p.level)) {
      p.exp -= expToNext(p.level);
      p.level += 1;
      leveled = true;
    }
    if (p.level >= MAX_MENU_LEVEL) p.exp = 0;
    return leveled;
  }

  /* ------------------------------ 재고 ------------------------------ */

  stockOf(id: string): number {
    return this.progress(id).stock;
  }

  /** 발주 1회 비용 (옷장 보유 효과만큼 원가가 깎입니다) */
  restockCost(id: string, qty: number): number {
    const cut = Math.min(0.8, this.ownedBonus().supplyCut);
    return Math.round(menuById(id).supplyCost * qty * (1 - cut));
  }

  restock(id: string, qty: number): boolean {
    const p = this.progress(id);
    const room = MAX_STOCK - p.stock;
    const actual = Math.min(qty, room);
    if (actual <= 0) return false;
    const cost = this.restockCost(id, actual);
    if (!this.spendCoins(cost)) return false;
    this.recordSupplyCost(cost);
    p.stock += actual;
    return true;
  }

  /** 총괄 매니저가 있을 때 부족한 재고를 자동으로 채웁니다 (지금 보고 있는 가게 기준). */
  autoRestock() {
    if (!this.hasGeneralManager()) return;
    for (const item of this.sellableAnywhere()) {
      const p = this.progress(item.id);
      if (p.stock >= AUTO_RESTOCK_THRESHOLD) continue;
      const cost = this.restockCost(item.id, AUTO_RESTOCK_BATCH);
      if (this.data.coins < cost) continue;
      this.restock(item.id, AUTO_RESTOCK_BATCH);
    }
  }

  /** 그 층에서 지금 팔 수 있고 재고도 남은 메뉴 */
  inStockItems(floorIndex: number, category?: Category): MenuDef[] {
    return this.sellableItems(floorIndex, category).filter(
      (m) => this.stockOf(m.id) > 0,
    );
  }

  /** 가게 어디서든 팔 수 있고 재고도 남은 메뉴 */
  inStockAnywhere(): MenuDef[] {
    return this.sellableAnywhere().filter((m) => this.stockOf(m.id) > 0);
  }

  isOutOfStock(): boolean {
    return this.inStockAnywhere().length === 0;
  }

  /* ------------------------------ 매장 ------------------------------ */

  floor(index: number): FloorData {
    return this.rdata().floors[index];
  }

  unlockedFloors(): number[] {
    return this.rdata()
      .floors.map((f, i) => (f.unlocked ? i : -1))
      .filter((i) => i >= 0);
  }

  totalTables(): number {
    return this.rdata().floors.reduce((sum, f) => sum + (f.unlocked ? f.tables : 0), 0);
  }

  /* ------------------------- 자리 비운 동안 ------------------------- */

  /** 한 층이 완전 자동으로 돌아가는가 (바리스타 + 직원 모두 있어야) */
  isFloorAutomated(index: number): boolean {
    const f = this.floor(index);
    return f.unlocked && f.barista > 0 && f.server > 0;
  }

  equipmentDefs() {
    return this.cfg().equipment;
  }

  /** 그 층에 설비를 들여놓습니다. 위층일수록 비쌉니다 */
  buyEquipment(floorIndex: number, id: string): boolean {
    if (this.hasEquipment(floorIndex, id)) return false;
    const def = this.cfg().equipment.find((e) => e.id === id);
    if (!def) return false;
    if (!this.spendCoins(equipmentCost(def, floorIndex))) return false;
    this.floor(floorIndex).equipment.push(id);
    return true;
  }

  /** 그 층에 있는 그 직급의 사람 수 */
  roleCount(floorIndex: number, role: Role): number {
    return this.floor(floorIndex)[role];
  }

  setRoleCount(floorIndex: number, role: Role, count: number) {
    this.floor(floorIndex)[role] = count;
  }

  /** 메뉴/디저트 평균 판매가 (자리 비운 동안 계산용) */
  averagePrice(): number {
    const items = this.inStockAnywhere();
    const pool = items.length > 0 ? items : this.sellableAnywhere();
    if (pool.length === 0) return this.cfg().drinks[0].basePrice;
    return pool.reduce((sum, m) => sum + this.priceOf(m.id), 0) / pool.length;
  }

  averageSupplyCost(): number {
    const pool = this.sellableAnywhere();
    if (pool.length === 0) return this.cfg().drinks[0].supplyCost;
    return pool.reduce((sum, m) => sum + m.supplyCost, 0) / pool.length;
  }

  averageMakeTime(): number {
    const pool = this.sellableAnywhere();
    if (pool.length === 0) return this.cfg().drinks[0].makeTimeMs;
    return pool.reduce((sum, m) => sum + m.makeTimeMs, 0) / pool.length;
  }

  totalStock(): number {
    return this.sellableAnywhere().reduce((sum, m) => sum + this.stockOf(m.id), 0);
  }

  /**
   * 자리를 비운 동안 자동화된 층이 번 돈을 계산해서 넣어줍니다 (앱을 다시 열었을 때).
   * 완전 자동(바리스타+직원)인 층만 돈을 벌고, 총괄 매니저가 없으면
   * 재고가 떨어지므로 짧게 끊고 남은 재고만큼만 인정합니다.
   * 지어둔 가게 전부를 각자 자리 비운 시간만큼 한꺼번에 계산해서, 앱을
   * 완전히 껐다 켰을 때 굳이 하나하나 들어가 보지 않아도 다 받아집니다.
   */
  applyOfflineEarnings() {
    const prevActive = this.data.activeRestaurant;
    let totalNet = 0;
    let totalServes = 0;
    let longestAway = 0;

    for (const id of RESTAURANT_ORDER) {
      const r = this.data.restaurants[id];
      if (!r.constructed) continue;
      const cap = r.generalManager ? OFFLINE_EARNINGS_CAP_MS : OFFLINE_NO_GM_CAP_MS;
      const elapsed = Math.min(Math.max(0, Date.now() - r.lastVisitedAt), cap);

      this.data.activeRestaurant = id;
      this.applyOfflineEarningsFor(elapsed);
      totalNet += this.offlineEarnings;
      totalServes += this.offlineServes;
      longestAway = Math.max(longestAway, this.offlineDurationMs);
      r.lastVisitedAt = Date.now();
    }

    this.data.activeRestaurant = prevActive;
    this.offlineEarnings = totalNet;
    this.offlineServes = totalServes;
    this.offlineDurationMs = longestAway;
  }

  /**
   * 자리를 비운 동안 얼마나 벌었을지 계산만 합니다 (재고·코인은 안 건드립니다).
   * applyOfflineEarningsFor()가 실제로 반영할 때와, previewOfflineEarnings()가
   * 다른 가게를 미리 살짝 보여줄 때 둘 다 이 계산을 함께 씁니다 (지금 활성
   * 가게 기준 — previewOfflineEarnings()는 잠깐 활성 가게를 바꿔서 씁니다).
   */
  private estimateOfflineNet(
    elapsed: number,
  ): { serves: number; revenue: number; supplySpent: number; net: number } {
    const zero = { serves: 0, revenue: 0, supplySpent: 0, net: 0 };
    if (elapsed < OFFLINE_MIN_AWAY_MS) return zero;

    const autoFloors = this.rdata()
      .floors.map((_, i) => i)
      .filter((i) => this.isFloorAutomated(i));
    if (autoFloors.length === 0) return zero;
    if (this.sellableAnywhere().length === 0) return zero;

    const gm = this.hasGeneralManager();

    // 층별로 "테이블 회전율"과 "손님 등장 속도" 중 느린 쪽이 실제 처리량입니다.
    let servesPerMs = 0;
    for (const i of autoFloors) {
      const f = this.floor(i);
      const cycleMs =
        this.averageMakeTime() / baristaSpeed(f.barista) +
        serveDelayMs(f.server) +
        EAT_TIME_MS +
        cleanDelayMs(f.server);
      const tableThroughput = f.tables / cycleMs;
      const spawnThroughput = 1 / spawnIntervalMs(f.manager);
      servesPerMs += Math.min(tableThroughput, spawnThroughput);
    }

    let serves = Math.floor(servesPerMs * elapsed * OFFLINE_EARNINGS_RATE);
    if (serves <= 0) return zero;
    // 총괄 매니저가 없으면 남아있던 재고만큼만 팔 수 있습니다.
    if (!gm) serves = Math.min(serves, this.totalStock());
    if (serves <= 0) return zero;

    const avgPrice = this.averagePrice();
    const avgSupply = this.averageSupplyCost();
    // 총괄 매니저가 알아서 발주하지만, 그 원가는 매출에서 빠집니다.
    const supplySpent = gm ? Math.round(serves * avgSupply) : 0;
    const revenue = Math.round(serves * avgPrice);
    return { serves, revenue, supplySpent, net: Math.max(0, revenue - supplySpent) };
  }

  /** applyOfflineEarnings()와 switchRestaurant() 둘 다 이 계산을 공유합니다 (지금 활성 가게 기준) */
  private applyOfflineEarningsFor(elapsed: number) {
    this.offlineEarnings = 0;
    this.offlineDurationMs = 0;
    this.offlineServes = 0;

    const { serves, revenue, supplySpent, net } = this.estimateOfflineNet(elapsed);
    if (serves <= 0) return;

    let actualServes = serves;
    if (this.hasGeneralManager()) {
      this.consumeStockSpread(serves);
      this.autoRestock();
    } else {
      actualServes = this.consumeStockSpread(serves);
      if (actualServes <= 0) return;
    }

    this.offlineServes = actualServes;
    this.offlineDurationMs = elapsed;
    this.offlineEarnings = net;
    if (net > 0) this.addCoins(net);

    // 오늘 매출표에도 이 가게(자리 비운 동안 자동으로 번 것) 몫을 반영합니다.
    this.data.today.revenue += revenue;
    this.data.today.supplyCost += supplySpent;
    this.data.today.served += actualServes;
    const stats = this.data.today.byRestaurant?.[this.data.activeRestaurant];
    if (stats) {
      stats.revenue += revenue;
      stats.supplyCost += supplySpent;
      stats.served += actualServes;
    }
  }

  /**
   * 지금 안 들어가 있는 다른 가게가 자리를 비운 동안 어느 정도 벌었을지
   * 미리 보여줄 때 씁니다 (매장 화면에서, 실제로 넣지는 않고 숫자만 계산).
   * estimateOfflineNet()과 달리 손님 수를 정수로 딱 떨어뜨리지 않고 매끄러운
   * 값으로 계산해서, 화면에 서 있는 동안 초 단위로도 눈에 띄게 올라갑니다.
   */
  previewOfflineEarnings(id: RestaurantId): number {
    const r = this.data.restaurants[id];
    if (!r.constructed) return 0;
    const cap = r.generalManager ? OFFLINE_EARNINGS_CAP_MS : OFFLINE_NO_GM_CAP_MS;
    const elapsed = Math.min(Math.max(0, Date.now() - r.lastVisitedAt), cap);
    if (elapsed < OFFLINE_MIN_AWAY_MS) return 0;

    const prevActive = this.data.activeRestaurant;
    if (prevActive === id) return 0;
    this.data.activeRestaurant = id;
    try {
      const autoFloors = r.floors.map((_, i) => i).filter((i) => this.isFloorAutomated(i));
      if (autoFloors.length === 0) return 0;
      if (this.sellableAnywhere().length === 0) return 0;

      let servesPerMs = 0;
      for (const i of autoFloors) {
        const f = this.floor(i);
        const cycleMs =
          this.averageMakeTime() / baristaSpeed(f.barista) +
          serveDelayMs(f.server) +
          EAT_TIME_MS +
          cleanDelayMs(f.server);
        const tableThroughput = f.tables / cycleMs;
        const spawnThroughput = 1 / spawnIntervalMs(f.manager);
        servesPerMs += Math.min(tableThroughput, spawnThroughput);
      }

      const avgPrice = this.averagePrice();
      const avgSupply = this.averageSupplyCost();
      const netPerServe = r.generalManager ? Math.max(0, avgPrice - avgSupply) : avgPrice;
      return servesPerMs * elapsed * OFFLINE_EARNINGS_RATE * netPerServe;
    } finally {
      this.data.activeRestaurant = prevActive;
    }
  }

  /** 재고를 골고루 소모합니다. 실제로 소모한 개수를 돌려줍니다. */
  consumeStockSpread(count: number): number {
    let left = Math.floor(count);
    let consumed = 0;
    let guard = 0;
    while (left > 0 && guard < 1000) {
      guard += 1;
      const pool = this.inStockAnywhere();
      if (pool.length === 0) break;
      const per = Math.max(1, Math.floor(left / pool.length));
      for (const item of pool) {
        if (left <= 0) break;
        const take = Math.min(per, this.stockOf(item.id), left);
        this.progress(item.id).stock -= take;
        left -= take;
        consumed += take;
      }
    }
    return consumed;
  }
}

/** 개별 메뉴가 다음 레벨까지 얼마나 남았는지 (UI 표시용).
    단품과 세트가 같은 레벨 규칙을 쓰므로 둘 다 받습니다. */
export function levelProgressText(p: SetProgress): string {
  if (p.level >= MAX_MENU_LEVEL) return "MAX";
  return `${p.exp}/${expToNext(p.level)}`;
}

export function levelProgressRatio(p: SetProgress): number {
  if (p.level >= MAX_MENU_LEVEL) return 1;
  return Math.min(1, p.exp / expToNext(p.level));
}

export { DESSERTS, DRINKS };
export type { GameState };
export const gameState = new GameState();
