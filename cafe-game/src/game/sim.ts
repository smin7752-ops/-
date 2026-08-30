import Phaser from "phaser";
import {
  CLOSE_HOUR,
  managerTipRate,
  ratingSpawnScale,
  CLEAN_STAY_MAX_MS,
  CLEAN_STAY_MIN_MS,
  CLEAN_TRAVEL_MS,
  CUSTOMER_PATIENCE_MS,
  EAT_TIME_MS,
  GAME_MINUTES_PER_SECOND,
  MAX_FLOORS,
  SEATS_PER_TABLE,
  SET_ORDER_CHANCE,
  WALK_TIME_MS,
  baristaSpeed,
  menuById,
  serveDelayMs,
  spawnIntervalMs,
} from "./config";
import { bus, EVENTS } from "./bus";
import { gameState, type Order } from "./state";
import { randomLook, type CustomerLook } from "./art";

export type CustomerPhase = "walking" | "preparing" | "ready" | "eating";
export type TableState = "clean" | "occupied" | "dirty";

export interface SimCustomer {
  id: number;
  floorIndex: number;
  tableIndex: number;
  order: Order;
  /** 이 손님의 생김새 (머리·머리카락·옷 색). 그림은 art.ts 가 그립니다 */
  look: CustomerLook;
  phase: CustomerPhase;
  /** 현재 단계에 남은 시간(ms) */
  phaseTimer: number;
  /** walking 단계의 전체 길이 — 걸어오는 위치 보간에 씁니다 */
  walkTotal: number;
  /** 제조에 남은 시간(ms). 바리스타가 없으면 줄지 않습니다 */
  makeLeft: number;
  makeTotal: number;
  /** 직원이 서빙하기까지 남은 시간. 직원이 없으면 Infinity */
  serveLeft: number;
  /** 인내심 (walking 이후 서빙될 때까지 줄어듭니다) */
  patience: number;
  /** 이 손님의 인내심 최대치. 유니폼 보유 효과로 손님마다 달라집니다 */
  patienceTotal: number;
  leaving: boolean;
}

export interface SimTable {
  state: TableState;
  /** 지금 이 자리를 치우고 있는 홀 직원 자리 번호 (0부터). 아직 아무도 안 왔으면 null */
  assignedServer: number | null;
  /** 배정은 됐지만 아직 걸어가는 중인 시간(ms). 0이 되기 전엔 청소가 시작되지 않습니다 */
  cleanTravelLeft: number;
  /** 치우는 데 남은 시간(ms). 도착하기 전에는 0 */
  cleanLeft: number;
  /** 이번 청소에 걸리는 전체 시간(ms). 게이지 바 비율 계산용. 도착하기 전에는 0 */
  cleanTotal: number;
}

interface SimFloor {
  /** 자리 목록. 테이블 하나당 SEATS_PER_TABLE 개씩 이어서 들어갑니다. */
  tables: SimTable[];
  customers: SimCustomer[];
  spawnTimer: number;
}

let nextCustomerId = 1;

/** 시뮬레이션 한 걸음의 최대 크기 (너무 크면 판정이 건너뛰어집니다) */
const STEP_MS = 100;
/** 한 번에 따라잡을 수 있는 최대 시간. 이보다 오래 멈췄으면 오프라인 정산 몫입니다. */
const MAX_CATCHUP_MS = 2000;

/**
 * 모든 층을 데이터로만 굴리는 시뮬레이션.
 * 화면에 보이지 않는 층도 똑같이 돌아갑니다. 그림 그리는 일은 CafeScene 담당.
 */
class Simulation {
  floors: SimFloor[] = [];
  /** 재고가 없어서 손님을 못 받고 있는 상태인지 */
  blockedByStock = false;
  private lastTickAt = -1;
  /** 마감해서 문을 닫은 상태 (사장님이 정산을 확인하면 풀립니다) */
  private closed = false;

  constructor() {
    this.rebuild();
  }

  /** 층/테이블 수가 바뀌면 다시 맞춰줍니다. */
  rebuild() {
    const previous = this.floors;
    this.floors = Array.from({ length: MAX_FLOORS }, (_, i) => {
      const data = gameState.floor(i);
      const old = previous[i];
      const seatCount = data.tables * SEATS_PER_TABLE;
      const tables: SimTable[] = Array.from({ length: seatCount }, (_, t) => {
        return (
          old?.tables[t] ?? {
            state: "clean",
            assignedServer: null,
            cleanTravelLeft: 0,
            cleanLeft: 0,
            cleanTotal: 0,
          }
        );
      });
      return {
        tables,
        // 없어진 테이블에 앉아있던 손님은 정리합니다.
        customers: (old?.customers ?? []).filter((c) => c.tableIndex < tables.length),
        spawnTimer: old?.spawnTimer ?? spawnIntervalMs(data.manager),
      };
    });
  }

  /**
   * 실제 시계 기준으로 시뮬레이션을 진행시킵니다.
   *
   * 화면 프레임(delta)에 의존하면 폰 성능이 낮거나 브라우저가 렌더링을
   * 늦출 때 게임이 슬로모션이 됩니다. 그래서 흐른 실제 시간을 재서
   * 그만큼 따라잡되, 한 번에 너무 많이 건너뛰지 않도록 잘라서 돌립니다.
   * (오래 자리를 비운 경우는 오프라인 정산이 따로 처리합니다.)
   */
  tick() {
    const now = performance.now();
    if (this.lastTickAt < 0) this.lastTickAt = now;
    let elapsed = Math.min(now - this.lastTickAt, MAX_CATCHUP_MS);
    this.lastTickAt = now;

    while (elapsed > 0) {
      const step = Math.min(elapsed, STEP_MS);
      this.step(step);
      elapsed -= step;
    }
  }

  /** 지금 영업 중인지 (마감 정산을 확인하기 전까지는 닫힌 상태) */
  isOpen(): boolean {
    return !this.closed;
  }

  /**
   * 게임 속 시계를 흘려보냅니다. 밤 10시가 되면 그날 장부를 닫고
   * 마감 정산 화면을 띄웁니다. 사장님이 확인해야 다음 날이 시작돼요.
   */
  private tickClock(dt: number) {
    if (this.closed) return;
    gameState.data.clock += (dt / 1000) * GAME_MINUTES_PER_SECOND;

    if (gameState.data.clock >= CLOSE_HOUR * 60) {
      gameState.data.clock = CLOSE_HOUR * 60;
      this.closed = true;
      const ledger = gameState.closeDay();
      gameState.save();
      bus.emit(EVENTS.DAY_CLOSED, ledger);
    }
  }

  /** 마감 정산을 확인했을 때 — 다음 날 아침으로 넘어갑니다 */
  openNextDay() {
    gameState.startNextDay();
    this.closed = false;
    for (const floor of this.floors) {
      floor.spawnTimer = 0;
    }
    bus.emit(EVENTS.COINS_CHANGED);
  }

  private step(dt: number) {
    let anyStock = false;

    this.tickClock(dt);

    for (let i = 0; i < this.floors.length; i++) {
      const data = gameState.floor(i);
      if (!data.unlocked) continue;
      const floor = this.floors[i];

      this.tickSpawn(i, floor, dt);
      this.tickCustomers(i, floor, dt);
      this.tickTables(i, floor, dt);
    }

    anyStock = gameState.inStockAnywhere().length > 0;
    const blocked = !anyStock;
    if (blocked !== this.blockedByStock) {
      this.blockedByStock = blocked;
      bus.emit(EVENTS.STOCK_CHANGED);
    }

    gameState.autoRestock();
  }

  /* ---------------------------- 손님 등장 ---------------------------- */

  private tickSpawn(floorIndex: number, floor: SimFloor, dt: number) {
    const data = gameState.floor(floorIndex);
    floor.spawnTimer -= dt;
    if (floor.spawnTimer > 0) return;
    floor.spawnTimer =
      spawnIntervalMs(data.manager) * ratingSpawnScale(gameState.data.rating);

    // 마감한 뒤에는 새 손님을 받지 않습니다 (앉아 있던 손님은 마저 처리해요)
    if (this.closed) return;

    const tableIndex = floor.tables.findIndex((t) => t.state === "clean");
    if (tableIndex === -1) return;

    const order = this.rollOrder(floorIndex);
    if (!order) return; // 재고가 없으면 손님이 들어오지 않습니다

    // 주문이 정해지는 순간 재고를 잡아둡니다.
    for (const id of order.itemIds) {
      gameState.progress(id).stock -= 1;
    }
    bus.emit(EVENTS.STOCK_CHANGED);

    // 옷장에 쌓인 보유 효과만큼 손님이 더 너그러워집니다.
    const patienceTotal =
      CUSTOMER_PATIENCE_MS * (1 + gameState.ownedBonus().patience);

    floor.tables[tableIndex].state = "occupied";
    floor.customers.push({
      id: nextCustomerId++,
      floorIndex,
      tableIndex,
      order,
      look: randomLook(),
      phase: "walking",
      phaseTimer: WALK_TIME_MS,
      walkTotal: WALK_TIME_MS,
      makeLeft: order.makeTimeMs,
      makeTotal: order.makeTimeMs,
      serveLeft: Infinity,
      patience: patienceTotal,
      patienceTotal,
      leaving: false,
    });
  }

  /** 재고가 있는 메뉴 중에서 주문을 하나 뽑습니다. 없으면 null */
  private rollOrder(floorIndex: number): Order | null {
    const sets = gameState
      .sellableSets(floorIndex)
      .filter(
        (s) => gameState.stockOf(s.drinkId) > 0 && gameState.stockOf(s.dessertId) > 0,
      );
    if (sets.length > 0 && Math.random() < SET_ORDER_CHANCE) {
      const set = Phaser.Utils.Array.GetRandom(sets);
      const drink = menuById(set.drinkId);
      const dessert = menuById(set.dessertId);
      return {
        kind: "set",
        setId: set.id,
        itemIds: [set.drinkId, set.dessertId],
        name: set.name,
        price: gameState.setPrice(set),
        makeTimeMs: drink.makeTimeMs + dessert.makeTimeMs * 0.5,
      };
    }

    const singles = gameState.inStockItems(floorIndex);
    if (singles.length === 0) return null;
    const item = Phaser.Utils.Array.GetRandom(singles);
    return {
      kind: "single",
      itemIds: [item.id],
      name: item.name,
      price: gameState.priceOf(item.id),
      makeTimeMs: item.makeTimeMs,
    };
  }

  /* ----------------------------- 손님 진행 ----------------------------- */

  private tickCustomers(floorIndex: number, floor: SimFloor, dt: number) {
    const data = gameState.floor(floorIndex);
    // 유니폼을 입으면 그만큼 더 빨라집니다.
    const speed =
      baristaSpeed(data.barista) * (1 + (gameState.equipEffect("barista").makeSpeed ?? 0));
    const serveDelay =
      serveDelayMs(data.server) / (1 + (gameState.equipEffect("server").serveSpeed ?? 0));

    for (let i = floor.customers.length - 1; i >= 0; i--) {
      const c = floor.customers[i];

      if (c.leaving) {
        c.phaseTimer -= dt;
        if (c.phaseTimer <= 0) floor.customers.splice(i, 1);
        continue;
      }

      switch (c.phase) {
        case "walking": {
          c.phaseTimer -= dt;
          if (c.phaseTimer <= 0) {
            c.phase = "preparing";
          }
          break;
        }
        case "preparing": {
          c.patience -= dt;
          // 바리스타가 있으면 자동으로 만들어집니다. 없으면 손님을 눌러야 해요.
          if (speed > 0) {
            c.makeLeft -= dt * speed;
            if (c.makeLeft <= 0) this.markReady(c, serveDelay);
          }
          if (c.patience <= 0) this.giveUp(floor, i);
          break;
        }
        case "ready": {
          c.patience -= dt;
          // 직원이 있으면 자동으로 서빙합니다. 없으면 손님을 눌러야 해요.
          if (Number.isFinite(c.serveLeft)) {
            c.serveLeft -= dt;
            if (c.serveLeft <= 0) this.serve(floorIndex, c);
          }
          if (c.patience <= 0) this.giveUp(floor, i);
          break;
        }
        case "eating": {
          c.phaseTimer -= dt;
          if (c.phaseTimer <= 0) this.leave(floor, c, "done");
          break;
        }
      }
    }
  }

  private markReady(c: SimCustomer, serveDelay: number) {
    c.makeLeft = 0;
    c.phase = "ready";
    c.serveLeft = serveDelay;
  }

  /**
   * 인내심이 다 떨어져 손님이 화내며 나갑니다.
   * 재고는 이미 썼으니 손해이고, 가게 평점도 떨어집니다.
   */
  private giveUp(floor: SimFloor, index: number) {
    const c = floor.customers[index];
    gameState.dropRating();
    bus.emit(EVENTS.CUSTOMER_ANGRY, c);
    this.leave(floor, c, "angry");
  }

  private leave(floor: SimFloor, c: SimCustomer, _reason: "done" | "angry") {
    c.leaving = true;
    c.phaseTimer = 600;
    const table = floor.tables[c.tableIndex];
    if (table) {
      table.state = "dirty";
      table.assignedServer = null;
      table.cleanTravelLeft = 0;
      table.cleanLeft = 0;
      table.cleanTotal = 0;
    }
  }

  /* ------------------------------ 서빙 ------------------------------ */

  /** 서빙 완료 — 돈과 경험치가 들어옵니다. */
  private serve(floorIndex: number, c: SimCustomer) {
    const floor = this.floors[floorIndex];
    // 매니저가 문 앞을 지키면 손님이 팁을 얹어줍니다 (등급과 유니폼만큼).
    const tipRate =
      managerTipRate(gameState.floor(floorIndex).manager) +
      (gameState.equipEffect("manager").tip ?? 0);
    const paid = Math.round(c.order.price * (1 + tipRate));
    gameState.addCoins(paid);
    gameState.recordSale(paid);
    gameState.raiseRating();

    let leveledUp = false;
    for (const id of c.order.itemIds) {
      if (gameState.addExp(id)) leveledUp = true;
    }
    // 세트로 팔았으면 세트 자체도 레벨이 오릅니다
    if (c.order.setId && gameState.addSetExp(c.order.setId)) leveledUp = true;

    c.phase = "eating";
    c.phaseTimer = EAT_TIME_MS;
    c.serveLeft = Infinity;

    bus.emit(EVENTS.SERVED, { customer: c, floorIndex, floor, paid });
    bus.emit(EVENTS.COINS_CHANGED);
    if (leveledUp) bus.emit(EVENTS.MENU_LEVELED);
  }

  /* -------------------------- 손으로 하는 조작 -------------------------- */

  /**
   * 손님을 눌렀을 때. 바리스타가 없으면 제조를, 서빙 직원이 없으면 서빙을
   * 플레이어가 대신 합니다.
   */
  tapCustomer(floorIndex: number, customerId: number): boolean {
    const floor = this.floors[floorIndex];
    if (!floor) return false;
    const c = floor.customers.find((x) => x.id === customerId);
    if (!c || c.leaving) return false;

    if (c.phase === "preparing") {
      this.markReady(c, serveDelayMs(gameState.floor(floorIndex).server));
      bus.emit(EVENTS.MADE_BY_HAND, c);
      return true;
    }
    if (c.phase === "ready") {
      this.serve(floorIndex, c);
      return true;
    }
    return false;
  }

  /** 더러운 테이블을 눌러서 직접 치웁니다. */
  tapTable(floorIndex: number, tableIndex: number): boolean {
    const floor = this.floors[floorIndex];
    const table = floor?.tables[tableIndex];
    if (!table || table.state !== "dirty") return false;
    table.state = "clean";
    table.assignedServer = null;
    table.cleanTravelLeft = 0;
    table.cleanLeft = 0;
    table.cleanTotal = 0;
    bus.emit(EVENTS.TABLE_CLEANED, { floorIndex, tableIndex });
    return true;
  }

  /* ---------------------------- 테이블 정리 ---------------------------- */

  /**
   * 더러운 자리마다 홀 직원 한 명이 붙어서 3~5초 머무른 뒤에 치웁니다.
   * 직원 수만큼만 동시에 치울 수 있어서, 한 자리를 두 명이 같이 가지 않습니다.
   */
  private tickTables(floorIndex: number, floor: SimFloor, dt: number) {
    const serverCount = gameState.floor(floorIndex).server;
    if (serverCount <= 0) return; // 아무도 없으면 손님이 직접 눌러야 치워집니다.

    const busy = new Set<number>();
    for (const table of floor.tables) {
      if (table.assignedServer !== null) busy.add(table.assignedServer);
    }

    for (const table of floor.tables) {
      if (table.state !== "dirty") continue;

      if (table.assignedServer === null) {
        let freeSlot = -1;
        for (let s = 0; s < serverCount; s++) {
          if (!busy.has(s)) {
            freeSlot = s;
            break;
          }
        }
        if (freeSlot === -1) continue; // 다들 다른 자리를 치우는 중이면 기다립니다.
        table.assignedServer = freeSlot;
        busy.add(freeSlot);
        // 배정만 됐을 뿐, 아직 자리에 도착하지 않았습니다. 걸어가는 동안은
        // 청소가 시작되지 않고(게이지도 안 뜨고), 도착한 뒤에야 시작됩니다.
        table.cleanTravelLeft = CLEAN_TRAVEL_MS;
        table.cleanTotal = 0;
        table.cleanLeft = 0;
        continue;
      }

      if (table.cleanTravelLeft > 0) {
        table.cleanTravelLeft -= dt;
        if (table.cleanTravelLeft <= 0) {
          table.cleanTravelLeft = 0;
          table.cleanTotal = Phaser.Math.Between(CLEAN_STAY_MIN_MS, CLEAN_STAY_MAX_MS);
          table.cleanLeft = table.cleanTotal;
        }
        continue;
      }

      table.cleanLeft -= dt;
      if (table.cleanLeft <= 0) {
        table.state = "clean";
        table.assignedServer = null;
        table.cleanTravelLeft = 0;
        table.cleanLeft = 0;
        table.cleanTotal = 0;
      }
    }
  }

  /** 특정 층에 손님이 앉아있는 목록 (화면 그리기용) */
  customersOn(floorIndex: number): SimCustomer[] {
    return this.floors[floorIndex]?.customers ?? [];
  }

  tablesOn(floorIndex: number): SimTable[] {
    return this.floors[floorIndex]?.tables ?? [];
  }

  /** 플레이어가 직접 눌러야 하는 일이 있는 층 (탭에 빨간 점 표시용) */
  needsAttention(floorIndex: number): boolean {
    const floor = this.floors[floorIndex];
    if (!floor) return false;
    const data = gameState.floor(floorIndex);
    if (!data.unlocked) return false;
    if (data.barista <= 0 && floor.customers.some((c) => !c.leaving && c.phase === "preparing")) {
      return true;
    }
    if (data.server <= 0) {
      if (floor.customers.some((c) => !c.leaving && c.phase === "ready")) return true;
      if (floor.tables.some((t) => t.state === "dirty")) return true;
    }
    return false;
  }
}

export const sim = new Simulation();
