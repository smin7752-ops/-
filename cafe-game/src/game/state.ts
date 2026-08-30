import {
  ALL_MENU,
  AUTO_RESTOCK_BATCH,
  AUTO_RESTOCK_THRESHOLD,
  DECOR,
  DECOR_SLOTS,
  DESSERTS,
  DRINKS,
  EAT_TIME_MS,
  EQUIPMENT,
  MAX_FLOORS,
  MAX_MENU_LEVEL,
  MAX_MENU_STARS,
  LEDGER_HISTORY_MAX,
  MAX_STOCK,
  OPEN_HOUR,
  RATING_DOWN_PER_ANGRY,
  RATING_MAX,
  RATING_MIN,
  RATING_START,
  RATING_UP_PER_SERVE,
  ROLE_ORDER,
  STARTING_UNIFORMS,
  UNIFORMS,
  UNIFORM_SLOTS,
  uniformById,
  uniformsOfSlot,
  type DecorEffect,
  type UniformEquipEffect,
  type UniformOwnEffect,
  type UniformSlot,
  equipmentCost,
  roleWage,
  OFFLINE_EARNINGS_CAP_MS,
  OFFLINE_EARNINGS_RATE,
  OFFLINE_MIN_AWAY_MS,
  OFFLINE_NO_GM_CAP_MS,
  SAVE_KEY,
  SETS,
  STARTING_DECOR,
  STARTING_EQUIPMENT,
  STARTING_LAUNCHED,
  STARTING_STOCK,
  STARTING_TABLES,
  baristaSpeed,
  cleanDelayMs,
  decorById,
  decorOfSlot,
  enhanceChance,
  enhanceCost,
  expToNext,
  menuById,
  menuListOf,
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

/** 하루치 장부 — 매출표에 그대로 보여줍니다 */
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
}

/** 세트 메뉴의 레벨 (재고는 단품 쪽에서 빠지므로 따로 없습니다) */
export interface SetProgress {
  level: number;
  exp: number;
}

export interface SaveData {
  coins: number;
  menu: Record<string, MenuProgress>;
  /** 발주 탭에서 한 번 사서 열어둔 메뉴 id 목록 */
  launched: string[];
  sets: Record<string, SetProgress>;
  floors: FloorData[];
  /** 가게 평점 (1.0 ~ 5.0). 손님 응대가 좋으면 오르고 소문이 납니다 */
  rating: number;
  /** 사둔 유니폼 (옷장). 안 입어도 보유 효과가 붙습니다 */
  uniforms: string[];
  /** 자리별로 지금 입고 있는 유니폼 */
  equipped: Record<UniformSlot, string>;
  /** 사둔 인테리어 (바닥·벽지·테이블·의자·문) */
  decor: string[];
  /** 자리별로 지금 쓰고 있는 인테리어 */
  decorEquipped: Record<DecorSlot, string>;
  generalManager: boolean;
  lastSavedAt: number;
  totalEarned: number;
  /** 며칠째 영업 중인지 (1일차부터) */
  day: number;
  /** 게임 속 시각 — 자정부터 흐른 분 */
  clock: number;
  /** 아직 마감하지 않은 오늘 장부 */
  today: DayLedger;
  /** 마감이 끝난 지난 날들 (최근 것이 앞) */
  history: DayLedger[];
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

function defaultFloor(index: number): FloorData {
  return {
    unlocked: index === 0,
    tables: index === 0 ? STARTING_TABLES : 0,
    // 1층은 바리스타 한 명과 함께 시작합니다.
    barista: index === 0 ? 1 : 0,
    server: 0,
    manager: 0,
    // 어느 층이든 커피머신은 기본으로 깔아드립니다.
    equipment: [...STARTING_EQUIPMENT],
  };
}

function defaultSave(): SaveData {
  const menu: Record<string, MenuProgress> = {};
  for (const item of ALL_MENU) {
    menu[item.id] = { level: 1, exp: 0, stock: 0, stars: 0 };
  }
  // 첫 메뉴는 재고를 조금 채워서 시작합니다.
  menu[DRINKS[0].id].stock = STARTING_STOCK;

  const sets: Record<string, SetProgress> = {};
  for (const set of SETS) sets[set.id] = { level: 1, exp: 0 };

  return {
    coins: 100,
    menu,
    launched: [...STARTING_LAUNCHED],
    sets,
    floors: Array.from({ length: MAX_FLOORS }, (_, i) => defaultFloor(i)),
    rating: RATING_START,
    uniforms: [...STARTING_UNIFORMS],
    equipped: defaultEquipped(),
    decor: [...STARTING_DECOR],
    decorEquipped: defaultDecorEquipped(),
    generalManager: false,
    lastSavedAt: Date.now(),
    totalEarned: 0,
    day: 1,
    clock: OPEN_HOUR * 60,
    today: emptyLedger(1),
    history: [],
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

export function emptyLedger(day: number): DayLedger {
  return { day, revenue: 0, supplyCost: 0, wageCost: 0, served: 0 };
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

class GameState {
  data: SaveData;
  offlineEarnings = 0;
  offlineDurationMs = 0;
  offlineServes = 0;

  constructor() {
    this.data = this.load();
  }

  /* ------------------------------ 저장 ------------------------------ */

  private load(): SaveData {
    const base = defaultSave();
    let parsed: Partial<SaveData> | null = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) parsed = JSON.parse(raw) as Partial<SaveData>;
    } catch {
      parsed = null;
    }
    if (!parsed) return base;

    // 저장본에 없는 항목(업데이트로 새로 추가된 메뉴/층)은 기본값으로 메웁니다.
    const merged: SaveData = { ...base, ...parsed };
    merged.menu = { ...base.menu };
    for (const [id, progress] of Object.entries(parsed.menu ?? {})) {
      if (merged.menu[id]) merged.menu[id] = { ...merged.menu[id], ...progress };
    }
    // 예전에는 설비가 가게 전체 공용이었습니다. 그때 산 설비는 열려 있던
    // 층 모두에 그대로 놓아드려, 업데이트로 손해 보는 일이 없게 합니다.
    const legacyEquipment = (parsed as { equipment?: string[] }).equipment ?? [];
    merged.floors = base.floors.map((floor, i) => {
      const saved = parsed?.floors?.[i];
      const merger: FloorData = { ...floor, ...(saved ?? {}) };
      merger.equipment = Array.from(
        new Set([
          ...STARTING_EQUIPMENT,
          ...(saved?.equipment ?? []),
          ...(merger.unlocked ? legacyEquipment : []),
        ]),
      );
      return merger;
    });
    // 메뉴 구매(발주 탭 한 번 사기)도 나중에 추가된 기능입니다. 이미 "돈
    // 주고 산" 설비(기본 커피머신 말고)가 있는 메뉴는 예전 규칙대로 바로
    // 팔리고 있었을 테니, 다시 사라고 하지 않고 그대로 열어드립니다.
    // 커피머신은 처음부터 공짜로 깔려 있는 설비라 여기서 빼야 합니다 —
    // 안 그러면 카페라떼처럼 커피머신만 있으면 되는 메뉴가 신규 저장본
    // 여부와 상관없이 전부 구매 없이 열려버립니다.
    const purchasedEquipmentIds = new Set(
      merged.floors.flatMap((f) =>
        f.equipment.filter((e) => !STARTING_EQUIPMENT.includes(e)),
      ),
    );
    const grandfathered = ALL_MENU.filter((m) =>
      purchasedEquipmentIds.has(m.equipmentId),
    ).map((m) => m.id);
    merged.launched = Array.from(
      new Set([...STARTING_LAUNCHED, ...grandfathered, ...(parsed.launched ?? [])]),
    );
    merged.rating = typeof parsed.rating === "number" ? parsed.rating : RATING_START;
    // 유니폼도 나중에 추가된 기능이라 예전 저장본에는 없습니다.
    merged.uniforms = Array.from(
      new Set([...STARTING_UNIFORMS, ...(parsed.uniforms ?? [])]),
    );
    merged.equipped = { ...defaultEquipped(), ...(parsed.equipped ?? {}) };
    // 안 갖고 있는 옷이 입혀져 있으면 기본 옷으로 되돌립니다.
    for (const slot of UNIFORM_SLOTS) {
      if (!merged.uniforms.includes(merged.equipped[slot])) {
        merged.equipped[slot] = uniformsOfSlot(slot)[0].id;
      }
    }
    // 인테리어(꾸미기)도 나중에 추가된 기능이라 예전 저장본에는 없습니다.
    merged.decor = Array.from(new Set([...STARTING_DECOR, ...(parsed.decor ?? [])]));
    merged.decorEquipped = {
      ...defaultDecorEquipped(),
      ...(parsed.decorEquipped ?? {}),
    };
    for (const slot of DECOR_SLOTS) {
      if (!merged.decor.includes(merged.decorEquipped[slot])) {
        merged.decorEquipped[slot] = decorOfSlot(slot)[0].id;
      }
    }
    // 세트 레벨도 나중에 추가된 기능이라 예전 저장본에는 없습니다.
    merged.sets = { ...base.sets };
    for (const [id, progress] of Object.entries(parsed.sets ?? {})) {
      if (merged.sets[id]) merged.sets[id] = { ...merged.sets[id], ...progress };
    }
    // 매출표는 나중에 추가된 기능이라, 예전 저장본에는 없습니다.
    merged.today = { ...emptyLedger(merged.day), ...(parsed.today ?? {}) };
    merged.history = Array.isArray(parsed.history) ? parsed.history : [];
    return merged;
  }

  save() {
    this.data.lastSavedAt = Date.now();
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

  /** 손님에게 받은 돈을 오늘 매출에 적습니다 */
  recordSale(amount: number) {
    this.data.today.revenue += amount;
    this.data.today.served += 1;
  }

  /* ----------------------------- 유니폼 ----------------------------- */

  ownsUniform(id: string): boolean {
    return this.data.uniforms.includes(id);
  }

  equippedUniform(slot: UniformSlot): string {
    return this.data.equipped[slot];
  }

  buyUniform(id: string): boolean {
    const def = uniformById(id);
    if (!def || this.ownsUniform(id)) return false;
    if (!this.spendCoins(def.cost)) return false;
    this.data.uniforms.push(id);
    return true;
  }

  equipUniform(id: string): boolean {
    const def = uniformById(id);
    if (!def || !this.ownsUniform(id)) return false;
    this.data.equipped[def.slot] = id;
    return true;
  }

  /** 그 자리가 지금 입고 있는 옷의 장착 효과 */
  equipEffect(slot: UniformSlot): UniformEquipEffect {
    return uniformById(this.equippedUniform(slot))?.equip ?? {};
  }

  /** 옷장에 있는 모든 옷의 보유 효과를 더한 값 */
  ownedBonus(): Required<UniformOwnEffect> {
    const total = { price: 0, patience: 0, ratingGuard: 0, supplyCut: 0 };
    for (const id of this.data.uniforms) {
      const own = uniformById(id)?.own;
      if (!own) continue;
      total.price += own.price ?? 0;
      total.patience += own.patience ?? 0;
      total.ratingGuard += own.ratingGuard ?? 0;
      total.supplyCut += own.supplyCut ?? 0;
    }
    return total;
  }

  /** 옷장을 몇 벌 채웠는지 (화면 표시용) */
  uniformProgress(): { owned: number; total: number } {
    return { owned: this.data.uniforms.length, total: UNIFORMS.length };
  }

  /** 유니폼 + 인테리어 효과를 합친 값. 실제 계산은 다 이걸 씁니다 */
  totalBonus(): Required<UniformOwnEffect> & { spawnBoost: number } {
    const u = this.ownedBonus();
    const d = this.decorBonus();
    return {
      price: u.price + d.price,
      patience: u.patience + d.patience,
      ratingGuard: u.ratingGuard + d.ratingGuard,
      supplyCut: u.supplyCut,
      spawnBoost: d.spawnBoost,
    };
  }

  /* ----------------------------- 인테리어 ----------------------------- */

  ownsDecor(id: string): boolean {
    return this.data.decor.includes(id);
  }

  equippedDecor(slot: DecorSlot): string {
    return this.data.decorEquipped[slot];
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
    this.data.decor.push(id);
    return true;
  }

  wearDecor(id: string): boolean {
    const def = decorById(id);
    if (!def || !this.ownsDecor(id)) return false;
    this.data.decorEquipped[def.slot] = id;
    return true;
  }

  /** 인테리어를 몇 개 모았는지 (화면 표시용) */
  decorProgress(): { owned: number; total: number } {
    return { owned: this.data.decor.length, total: DECOR.length };
  }

  /** 지금 자리마다 장착 중인 인테리어의 효과를 더한 값 (안 쓰는 건 효과 없음) */
  decorBonus(): Required<DecorEffect> {
    const total = { price: 0, patience: 0, spawnBoost: 0, ratingGuard: 0 };
    for (const slot of DECOR_SLOTS) {
      const eff = decorById(this.equippedDecor(slot))?.effect;
      if (!eff) continue;
      total.price += eff.price ?? 0;
      total.patience += eff.patience ?? 0;
      total.spawnBoost += eff.spawnBoost ?? 0;
      total.ratingGuard += eff.ratingGuard ?? 0;
    }
    return total;
  }

  /* ------------------------------ 평점 ------------------------------ */

  /** 손님을 잘 응대했을 때 */
  raiseRating() {
    this.data.rating = Math.min(RATING_MAX, this.data.rating + RATING_UP_PER_SERVE);
  }

  /** 손님이 화나서 그냥 나갔을 때 */
  dropRating() {
    // 옷장을 채워두거나 인테리어를 잘 꾸며두면 손님이 조금 너그러워져서 평점이 덜 깎입니다.
    const guard = Math.min(0.8, this.totalBonus().ratingGuard);
    const drop = RATING_DOWN_PER_ANGRY * (1 - guard);
    this.data.rating = Math.max(RATING_MIN, this.data.rating - drop);
  }

  /** 발주에 쓴 돈을 오늘 재료비에 적습니다 */
  recordSupplyCost(amount: number) {
    this.data.today.supplyCost += amount;
  }

  /** 지금 고용한 사람들의 하루 인건비 합계 */
  dailyWageTotal(): number {
    let total = 0;
    this.data.floors.forEach((floor, i) => {
      if (!floor.unlocked) return;
      for (const role of ROLE_ORDER) total += floor[role] * roleWage(role, i);
    });
    // 총괄 매니저가 입은 옷만큼 인건비가 깎입니다 (고용했을 때만).
    if (this.data.generalManager) {
      const cut = Math.min(0.8, this.equipEffect("gm").wageCut ?? 0);
      total = Math.round(total * (1 - cut));
    }
    return total;
  }

  /** 그 층 하루 인건비 */
  floorWageTotal(floorIndex: number): number {
    const floor = this.floor(floorIndex);
    if (!floor.unlocked) return 0;
    return ROLE_ORDER.reduce(
      (sum, role) => sum + floor[role] * roleWage(role, floorIndex),
      0,
    );
  }

  /** 지금 고용한 사람 수 (직급 상관없이) */
  totalStaff(): number {
    let total = 0;
    for (const floor of this.data.floors) {
      if (!floor.unlocked) continue;
      for (const role of ROLE_ORDER) total += floor[role];
    }
    return total;
  }

  /**
   * 하루를 마감합니다. 인건비를 지급하고 오늘 장부를 기록으로 넘깁니다.
   * 돌려주는 값이 마감 정산 화면에 그대로 뜹니다.
   */
  closeDay(): DayLedger {
    const wages = this.dailyWageTotal();
    this.data.today.wageCost = wages;
    // 인건비는 가진 돈이 모자라도 그대로 나갑니다. 잔고가 마이너스로
    // 내려가면 다음 날은 빚을 지고 시작해요.
    this.data.coins -= wages;

    const closed = { ...this.data.today };
    this.data.history.unshift(closed);
    if (this.data.history.length > LEDGER_HISTORY_MAX) {
      this.data.history.length = LEDGER_HISTORY_MAX;
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
    return this.data.menu[id];
  }

  hasEquipment(floorIndex: number, id: string): boolean {
    return this.floor(floorIndex).equipment.includes(id);
  }

  /** 열려 있는 층 중 하나라도 이 설비를 갖고 있는가 */
  hasEquipmentAnywhere(id: string): boolean {
    return this.data.floors.some((f) => f.unlocked && f.equipment.includes(id));
  }

  /** 발주 탭에서 한 번 사서 열어둔 메뉴인가 */
  isLaunched(id: string): boolean {
    return this.data.launched.includes(id);
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
    this.data.launched.push(id);
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

  sellableItems(floorIndex: number, category?: Category): MenuDef[] {
    const list = category ? menuListOf(category) : ALL_MENU;
    return list.filter((m) => this.isSellable(floorIndex, m.id));
  }

  /** 가게 전체에서 팔 수 있는 메뉴 (발주·재고 경고에 씁니다) */
  sellableAnywhere(category?: Category): MenuDef[] {
    const list = category ? menuListOf(category) : ALL_MENU;
    return list.filter((m) => this.isSellableAnywhere(m.id));
  }

  /** 설비는 있지만 아직 발주 탭에서 안 산 메뉴 (발주 탭의 "구매" 목록용) */
  awaitingLaunch(category?: Category): MenuDef[] {
    const list = category ? menuListOf(category) : ALL_MENU;
    return list.filter(
      (m) => !this.isLaunched(m.id) && this.hasEquipmentAnywhere(m.equipmentId),
    );
  }

  priceOf(id: string): number {
    const item = menuById(id);
    const p = this.progress(id);
    const base = item.basePrice * priceMultiplier(p.level) * starMultiplier(p.stars);
    return Math.round(base * (1 + this.totalBonus().price));
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

  /**
   * 돈을 내고 별 강화에 도전합니다. 확률에 따라 성공/실패가 갈리고,
   * 실패해도 낸 돈만 사라질 뿐 별은 그대로예요 (등급이 깎이지 않습니다).
   */
  enhanceMenu(id: string): "success" | "fail" | "maxed" | "no-coins" {
    const p = this.progress(id);
    if (p.stars >= MAX_MENU_STARS) return "maxed";
    const cost = enhanceCost(menuById(id), p.stars);
    if (!this.spendCoins(cost)) return "no-coins";
    const success = Math.random() < enhanceChance(p.stars);
    if (success) p.stars += 1;
    return success ? "success" : "fail";
  }

  /** 판매 경험치를 주고, 레벨이 올랐으면 true */
  addExp(id: string, amount = 1): boolean {
    const p = this.progress(id);
    if (p.level >= MAX_MENU_LEVEL) return false;
    p.exp += amount;
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
    return SETS.filter(
      (s) =>
        this.isSellable(floorIndex, s.drinkId) &&
        this.isSellable(floorIndex, s.dessertId),
    );
  }

  sellableSetsAnywhere(): SetDef[] {
    return SETS.filter(
      (s) => this.isSellableAnywhere(s.drinkId) && this.isSellableAnywhere(s.dessertId),
    );
  }

  setProgress(setId: string): SetProgress {
    return this.data.sets[setId];
  }

  setPrice(set: SetDef): number {
    const parts = this.priceOf(set.drinkId) + this.priceOf(set.dessertId);
    const level = this.setProgress(set.id).level;
    return Math.round(parts * set.bonusRate * priceMultiplier(level));
  }

  /** 세트를 한 번 팔았을 때. 레벨이 올랐으면 true */
  addSetExp(setId: string, amount = 1): boolean {
    const p = this.setProgress(setId);
    if (!p || p.level >= MAX_MENU_LEVEL) return false;
    p.exp += amount;
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

  /** 총괄 매니저가 있을 때 부족한 재고를 자동으로 채웁니다. */
  autoRestock() {
    if (!this.data.generalManager) return;
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
    return this.data.floors[index];
  }

  unlockedFloors(): number[] {
    return this.data.floors
      .map((f, i) => (f.unlocked ? i : -1))
      .filter((i) => i >= 0);
  }

  totalTables(): number {
    return this.data.floors.reduce((sum, f) => sum + (f.unlocked ? f.tables : 0), 0);
  }

  /* ------------------------- 자리 비운 동안 ------------------------- */

  /** 한 층이 완전 자동으로 돌아가는가 (바리스타 + 직원 모두 있어야) */
  isFloorAutomated(index: number): boolean {
    const f = this.floor(index);
    return f.unlocked && f.barista > 0 && f.server > 0;
  }



  equipmentDefs() {
    return EQUIPMENT;
  }

  /** 그 층에 설비를 들여놓습니다. 위층일수록 비쌉니다 */
  buyEquipment(floorIndex: number, id: string): boolean {
    if (this.hasEquipment(floorIndex, id)) return false;
    const def = EQUIPMENT.find((e) => e.id === id);
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
    if (pool.length === 0) return DRINKS[0].basePrice;
    return pool.reduce((sum, m) => sum + this.priceOf(m.id), 0) / pool.length;
  }

  averageSupplyCost(): number {
    const pool = this.sellableAnywhere();
    if (pool.length === 0) return DRINKS[0].supplyCost;
    return pool.reduce((sum, m) => sum + m.supplyCost, 0) / pool.length;
  }

  averageMakeTime(): number {
    const pool = this.sellableAnywhere();
    if (pool.length === 0) return DRINKS[0].makeTimeMs;
    return pool.reduce((sum, m) => sum + m.makeTimeMs, 0) / pool.length;
  }

  totalStock(): number {
    return this.sellableAnywhere().reduce((sum, m) => sum + this.stockOf(m.id), 0);
  }

  /**
   * 자리를 비운 동안 자동화된 층이 번 돈을 계산해서 넣어줍니다.
   * 완전 자동(바리스타+직원)인 층만 돈을 벌고, 총괄 매니저가 없으면
   * 재고가 떨어지므로 짧게 끊고 남은 재고만큼만 인정합니다.
   */
  applyOfflineEarnings() {
    const gm = this.data.generalManager;
    const cap = gm ? OFFLINE_EARNINGS_CAP_MS : OFFLINE_NO_GM_CAP_MS;
    const elapsed = Math.min(Math.max(0, Date.now() - this.data.lastSavedAt), cap);
    this.offlineEarnings = 0;
    this.offlineDurationMs = 0;
    this.offlineServes = 0;
    if (elapsed < OFFLINE_MIN_AWAY_MS) return;

    const autoFloors = this.data.floors
      .map((_, i) => i)
      .filter((i) => this.isFloorAutomated(i));
    if (autoFloors.length === 0) return;
    if (this.sellableAnywhere().length === 0) return;

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
    if (serves <= 0) return;

    const avgPrice = this.averagePrice();
    const avgSupply = this.averageSupplyCost();

    let supplySpent = 0;
    if (gm) {
      // 총괄 매니저가 알아서 발주하지만, 그 원가는 매출에서 빠집니다.
      supplySpent = Math.round(serves * avgSupply);
      this.consumeStockSpread(serves);
      this.autoRestock();
    } else {
      // 총괄 매니저가 없으면 남아있던 재고만큼만 팔 수 있습니다.
      serves = this.consumeStockSpread(Math.min(serves, this.totalStock()));
      if (serves <= 0) return;
    }

    const revenue = Math.round(serves * avgPrice);
    const net = Math.max(0, revenue - supplySpent);
    this.offlineServes = serves;
    this.offlineDurationMs = elapsed;
    this.offlineEarnings = net;
    if (net > 0) this.addCoins(net);
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
