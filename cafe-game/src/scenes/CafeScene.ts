import Phaser from "phaser";
import {
  MAX_ROLE_COUNT,
  SEATS_PER_TABLE,
  TABLES_PER_FLOOR,
} from "../game/config";
import { bus, EVENTS } from "../game/bus";
import { gameState } from "../game/state";
import { sim, type SimCustomer } from "../game/sim";
import {
  ART_COLORS,
  ART_SCALE,
  BUBBLE_BOX_OFFSET,
  bodyKey,
  buildArt,
  equipKey,
  hairKey,
  headKey,
  itemKey,
  personKey,
  publishIconUrls,
} from "../game/art";

export const VIRTUAL_WIDTH = 720;
export const VIRTUAL_HEIGHT = 1280;

/* 화면 위아래는 HTML 버튼(코인/시계, 층 탭, 아래 메뉴바)이 덮고 있습니다.
   게임 그림은 대략 y = 200 ~ 1100 사이에 그려야 가려지지 않습니다. */

/* 가게 구조: 위쪽이 카운터(안쪽), 아래쪽이 손님이 들어오는 문(입구)입니다. */
const COUNTER_Y = 262;
const COUNTER_H = 66;
/** 카운터 뒤 직원이 서 있는 바닥선 (그림의 발끝이 닿는 높이) */
const STAFF_BASE_Y = COUNTER_Y + 30;
/** 설비를 늘어놓을 카운터 위 구간 */
const EQUIP_ZONE = { left: 300, right: VIRTUAL_WIDTH - 30 };

const DOOR = { x: VIRTUAL_WIDTH / 2, y: 1000 };
const ENTRANCE = { x: DOOR.x, y: DOOR.y - 30 };
/** 매니저는 문 옆에 서서 손님을 맞습니다 */
const MANAGER_POS = { x: DOOR.x - 108, y: DOOR.y + 30 };
/** 총괄 매니저는 홀 전체가 보이는 카운터 앞을 지킵니다 */
const GM_POS = { x: VIRTUAL_WIDTH - 96, y: 420 };

const COLS = 2;
const TOP_MARGIN = 480;
const ROW_GAP = 190;
/** 테이블 가운데에서 좌·우 자리까지의 거리 */
const SEAT_DX = 74;

/* 자리 기준으로 의자와 테이블 상판이 놓이는 높이.
   의자는 손님 뒤, 상판은 손님 앞에 와야 "테이블에 앉은" 것처럼 보입니다. */
const CHAIR_DY = -12;
const TABLE_TOP_DY = 20;

/* 손님 그림의 각 부분이 놓이는 자리 (앉은 자리 기준).
   머리와 몸이 붙어 보이도록 겹치게 두고, 말풍선·막대는 머리 바로 위에
   촘촘히 쌓습니다. 한 손님이 차지하는 세로 높이(말풍선 꼭대기 ~ 테이블
   아래)가 ROW_GAP 보다 크면 윗줄 테이블과 아랫줄 말풍선이 겹칩니다. */
const BODY_Y = 10;
const HEAD_Y = -14;
const PATIENCE_Y = -40;
const MAKE_Y = -51;
const BUBBLE_Y = -85;
const BAR_W = 58;
const BAR_H = 7;

function tablePosition(tableIndex: number) {
  const colWidth = VIRTUAL_WIDTH / COLS;
  const row = Math.floor(tableIndex / COLS);
  const col = tableIndex % COLS;
  return {
    x: colWidth * col + colWidth / 2,
    y: TOP_MARGIN + row * ROW_GAP,
  };
}

/** 자리 번호 → 화면 위치. 테이블 하나에 왼쪽·오른쪽 두 자리가 있습니다. */
function seatPosition(seatIndex: number) {
  const table = tablePosition(Math.floor(seatIndex / SEATS_PER_TABLE));
  const side = seatIndex % SEATS_PER_TABLE === 0 ? -1 : 1;
  return { x: table.x + side * SEAT_DX, y: table.y };
}

/** 손님 한 명에 대응하는 화면 표시 묶음 */
interface CustomerView {
  root: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Container;
  statusIcon: Phaser.GameObjects.Image;
  /** 말풍선이 보일 때 상태 표시가 앉는 자리 (말풍선 어깨) */
  statusIconHomeX: number;
  patienceBg: Phaser.GameObjects.Rectangle;
  patienceFill: Phaser.GameObjects.Rectangle;
  makeBg: Phaser.GameObjects.Rectangle;
  makeFill: Phaser.GameObjects.Rectangle;
}

export class CafeScene extends Phaser.Scene {
  private activeFloor = 0;
  private customerViews = new Map<number, CustomerView>();
  /** 테이블·의자 등 층을 다시 그릴 때 통째로 지우는 것들 */
  private roomParts: Phaser.GameObjects.GameObject[] = [];
  /** 자리 번호 → "치워주세요" 표시 */
  private dirtyIcons = new Map<number, Phaser.GameObjects.Image>();
  private floorLabel!: Phaser.GameObjects.Text;
  private baristas: Phaser.GameObjects.Image[] = [];
  private servers: Phaser.GameObjects.Image[] = [];
  private manager!: Phaser.GameObjects.Image;
  private generalManager!: Phaser.GameObjects.Image;
  private equipmentImages: Phaser.GameObjects.Image[] = [];

  constructor() {
    super("cafe");
  }

  create() {
    buildArt(this);
    // 같은 그림을 HTML 창(상점·매출표)에서도 쓰도록 넘겨줍니다.
    publishIconUrls(this);
    bus.emit(EVENTS.ART_READY);

    this.cameras.main.setBackgroundColor("#e4d0ad");
    this.drawRoom();
    this.drawCounter();
    this.drawStaff();
    this.rebuildTables();

    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => gameState.save(),
    });

    bus.on(EVENTS.LAYOUT_CHANGED, this.onLayoutChanged, this);
    bus.on(EVENTS.UNIFORM_CHANGED, this.applyUniforms, this);
    bus.on(EVENTS.FLOOR_SWITCHED, this.onFloorSwitched, this);
    bus.on(EVENTS.SERVED, this.onServed, this);
    bus.on(EVENTS.CUSTOMER_ANGRY, this.onAngry, this);
    bus.on(EVENTS.MADE_BY_HAND, this.onMadeByHand, this);
    bus.on(EVENTS.TABLE_CLEANED, this.onTableCleaned, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EVENTS.LAYOUT_CHANGED, this.onLayoutChanged, this);
      bus.off(EVENTS.UNIFORM_CHANGED, this.applyUniforms, this);
      bus.off(EVENTS.FLOOR_SWITCHED, this.onFloorSwitched, this);
      bus.off(EVENTS.SERVED, this.onServed, this);
      bus.off(EVENTS.CUSTOMER_ANGRY, this.onAngry, this);
      bus.off(EVENTS.MADE_BY_HAND, this.onMadeByHand, this);
      bus.off(EVENTS.TABLE_CLEANED, this.onTableCleaned, this);
    });
  }

  update() {
    sim.tick();
    this.syncTables();
    this.syncCustomers();
    this.syncStaff();
  }

  /* ---------------------------- 가게 배경 ---------------------------- */

  private drawRoom() {
    const g = this.add.graphics().setDepth(-10);
    const floorTop = COUNTER_Y + COUNTER_H - 6;

    // 카운터 뒤쪽 벽
    g.fillStyle(0xd9c3a0, 1);
    g.fillRect(0, 0, VIRTUAL_WIDTH, floorTop);

    // 바닥 (체크 무늬)
    g.fillStyle(0xe4d0ad, 1);
    g.fillRect(0, floorTop, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    g.fillStyle(0xd8c096, 1);
    for (let y = floorTop; y < VIRTUAL_HEIGHT; y += 96) {
      for (let x = 0; x < VIRTUAL_WIDTH; x += 96) {
        const shift = Math.floor((y - floorTop) / 96) % 2 === 0 ? 0 : 48;
        g.fillRect(x + shift, y, 48, 48);
      }
    }

    // 문 앞 바닥 매트 — 입구를 눈에 띄게 해줍니다
    g.fillStyle(0xc9a97a, 1);
    g.fillRoundedRect(DOOR.x - 90, DOOR.y + 58, 180, 32, 12);

    // 손님이 드나드는 문 (가게 앞쪽). 입구답게 조금 크게 그립니다.
    this.add
      .image(DOOR.x, DOOR.y, "door")
      .setScale(ART_SCALE * 1.4)
      .setDepth(-5);
  }

  private drawCounter() {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(ART_COLORS.wood, 1);
    g.fillRoundedRect(30, COUNTER_Y, VIRTUAL_WIDTH - 60, COUNTER_H, 14);
    g.fillStyle(ART_COLORS.woodLight, 1);
    g.fillRoundedRect(30, COUNTER_Y, VIRTUAL_WIDTH - 60, 34, 14);
    g.lineStyle(5, ART_COLORS.ink, 1);
    g.strokeRoundedRect(30, COUNTER_Y, VIRTUAL_WIDTH - 60, COUNTER_H, 14);

    this.floorLabel = this.add
      .text(52, COUNTER_Y + 48, "", {
        fontSize: "24px",
        color: "#f3e3c3",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(2);
    this.updateFloorLabel();

    this.refreshEquipmentRow();
  }

  /** 바리스타·홀 직원·매니저 그림을 미리 만들어 둡니다 (고용한 만큼만 보여요) */
  private drawStaff() {
    // 바리스타는 카운터 뒤에 어깨를 맞대고 섭니다.
    this.baristas = Array.from({ length: MAX_ROLE_COUNT }, (_, i) =>
      this.add
        .image(80 + i * 46, STAFF_BASE_Y, personKey(gameState.equippedUniform("barista")))
        .setOrigin(0.5, 1)
        .setScale(ART_SCALE)
        .setDepth(0)
        .setVisible(false),
    );

    // 홀 직원은 홀 가운데 통로에서 대기하다가 손님에게 다녀옵니다.
    this.servers = Array.from({ length: MAX_ROLE_COUNT }, (_, i) => {
      const home = this.serverHome(i);
      return this.add
        .image(home.x, home.y, personKey(gameState.equippedUniform("server")))
        .setOrigin(0.5, 1)
        .setScale(ART_SCALE)
        .setDepth(5)
        .setVisible(false);
    });

    // 매니저는 문 옆에 서서 손님을 맞습니다 (한 층에 한 명).
    this.manager = this.add
      .image(MANAGER_POS.x, MANAGER_POS.y, personKey(gameState.equippedUniform("manager")))
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE)
      .setDepth(5)
      .setVisible(false);

    // 총괄 매니저는 가게 전체를 맡으므로 어느 층에서든 홀을 지켜봅니다.
    this.generalManager = this.add
      .image(GM_POS.x, GM_POS.y, personKey(gameState.equippedUniform("gm")))
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE)
      .setDepth(5)
      .setVisible(false);
  }

  /** 유니폼을 갈아입으면 화면의 직원 그림도 그 옷으로 바꿉니다 */
  private applyUniforms() {
    const wear = (img: Phaser.GameObjects.Image, slot: "barista" | "server" | "manager" | "gm") =>
      img.setTexture(personKey(gameState.equippedUniform(slot)));
    this.baristas.forEach((img) => wear(img, "barista"));
    this.servers.forEach((img) => wear(img, "server"));
    wear(this.manager, "manager");
    wear(this.generalManager, "gm");
  }

  /** 홀 직원이 할 일이 없을 때 서 있는 자리 (가운데 통로) */
  private serverHome(index: number) {
    return {
      x: VIRTUAL_WIDTH / 2 + (index % 2 === 0 ? -34 : 34),
      y: TOP_MARGIN + 110 + Math.floor(index / 2) * ROW_GAP,
    };
  }

  /**
   * 카운터 위에 산 설비를 늘어놓습니다. 다 사면 다섯 개라 자리가 좁으므로,
   * 구간에 맞춰 크기를 줄여 서로 겹치지 않게 합니다.
   */
  private refreshEquipmentRow() {
    this.equipmentImages.forEach((img) => img.destroy());
    this.equipmentImages = [];

    // 설비는 층마다 따로 사므로, 지금 보고 있는 층의 것만 올립니다.
    const owned = gameState
      .equipmentDefs()
      .filter((e) => gameState.hasEquipment(this.activeFloor, e.id));
    if (owned.length === 0) return;

    const gap = 10;
    const images = owned.map((def) =>
      this.add
        .image(0, COUNTER_Y + 6, equipKey(def.id))
        .setOrigin(0.5, 1)
        .setScale(ART_SCALE)
        .setDepth(0),
    );

    const naturalWidth = images.reduce((sum, img) => sum + img.displayWidth, 0);
    const available = EQUIP_ZONE.right - EQUIP_ZONE.left - gap * (images.length - 1);
    const scale =
      naturalWidth > available ? ART_SCALE * (available / naturalWidth) : ART_SCALE;

    let x = EQUIP_ZONE.left;
    for (const img of images) {
      img.setScale(scale);
      img.setX(x + img.displayWidth / 2);
      x += img.displayWidth + gap;
    }
    this.equipmentImages = images;
  }

  private updateFloorLabel() {
    this.floorLabel.setText(`${this.activeFloor + 1}층`);
  }

  /* ------------------------- 직원 움직임 ------------------------- */

  private syncStaff() {
    const data = gameState.floor(this.activeFloor);
    const customers = sim.customersOn(this.activeFloor);

    // 바리스타: 주문을 만드는 중이면 들썩입니다.
    const brewing = customers.some((c) => c.phase === "preparing");
    this.baristas.forEach((img, i) => {
      const show = i < data.barista;
      if (img.visible !== show) img.setVisible(show);
      if (!show) return;
      // 사람마다 조금씩 어긋나게 움직여야 복사판처럼 안 보입니다.
      const bob = brewing ? Math.sin(this.time.now / 110 + i * 1.3) * 5 : 0;
      img.setY(STAFF_BASE_Y + bob);
    });

    // 홀 직원: 손이 필요한 자리로 걸어갔다가 통로로 돌아옵니다.
    const jobs = this.serviceJobs(customers);
    this.servers.forEach((img, i) => {
      const show = i < data.server;
      if (img.visible !== show) img.setVisible(show);
      if (!show) return;

      const job = jobs[i];
      const home = this.serverHome(i);
      // 손님 옆에 서야 하므로 자리보다 통로 쪽으로 조금 비켜섭니다.
      const target = job
        ? { x: job.x + (job.x < VIRTUAL_WIDTH / 2 ? 46 : -46), y: job.y + 34 }
        : home;
      const nextX = Phaser.Math.Linear(img.x, target.x, 0.06);
      img.setFlipX(nextX < img.x - 0.4);
      img.setX(nextX);
      img.setY(Phaser.Math.Linear(img.y, target.y, 0.06));
    });

    // 총괄 매니저는 층과 상관없이 가게에 한 명입니다.
    const hasGm = gameState.data.generalManager;
    if (this.generalManager.visible !== hasGm) this.generalManager.setVisible(hasGm);
    if (hasGm) {
      this.generalManager.setY(GM_POS.y + Math.sin(this.time.now / 420) * 3);
    }

    // 매니저: 손님이 들어오는 중이면 반겨줍니다.
    const hasManager = data.manager > 0;
    if (this.manager.visible !== hasManager) this.manager.setVisible(hasManager);
    if (hasManager) {
      const greeting = customers.some((c) => c.phase === "walking");
      const bob = greeting ? Math.sin(this.time.now / 130) * 6 : 0;
      this.manager.setY(MANAGER_POS.y + bob);
    }
  }

  /** 홀 직원이 가봐야 할 자리들 (서빙할 손님 먼저, 그다음 치울 자리) */
  private serviceJobs(customers: SimCustomer[]) {
    const jobs: { x: number; y: number }[] = [];
    for (const c of customers) {
      if (c.phase === "ready" && !c.leaving) jobs.push(seatPosition(c.tableIndex));
    }
    sim.tablesOn(this.activeFloor).forEach((seat, i) => {
      if (seat.state === "dirty") jobs.push(seatPosition(i));
    });
    return jobs;
  }

  /* ------------------------- 테이블 · 자리 ------------------------- */

  private rebuildTables() {
    this.roomParts.forEach((p) => p.destroy());
    this.roomParts = [];
    this.dirtyIcons.clear();

    const data = gameState.floor(this.activeFloor);
    for (let t = 0; t < TABLES_PER_FLOOR; t++) {
      const pos = tablePosition(t);

      if (t >= data.tables) {
        const slot = this.add
          .image(pos.x, pos.y + 10, "table-empty")
          .setScale(ART_SCALE)
          .setDepth(1);
        const hit = this.add
          .rectangle(pos.x, pos.y, 190, 150, 0xffffff, 0)
          .setDepth(2);
        hit.setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => bus.emit(EVENTS.OPEN_PANEL, "store"));
        this.roomParts.push(slot, hit);
        continue;
      }

      // 자리마다 의자를 놓습니다 (테이블 양옆).
      for (let side = 0; side < SEATS_PER_TABLE; side++) {
        const seatIndex = t * SEATS_PER_TABLE + side;
        const seat = seatPosition(seatIndex);

        const chair = this.add
          .image(seat.x, seat.y + CHAIR_DY, "chair")
          .setScale(ART_SCALE)
          .setDepth(1);

        const dirtyIcon = this.add
          .image(seat.x, seat.y + 6, "icon-dirty")
          .setScale(ART_SCALE * 0.8)
          .setDepth(6)
          .setVisible(false);
        this.dirtyIcons.set(seatIndex, dirtyIcon);

        // 손님(깊이 3)보다 아래에 둬야 손님 탭이 이 영역에 먹히지 않습니다.
        const hit = this.add
          .rectangle(seat.x, seat.y - 10, 120, 130, 0xffffff, 0)
          .setDepth(2);
        hit.setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => sim.tapTable(this.activeFloor, seatIndex));

        this.roomParts.push(chair, dirtyIcon, hit);
      }

      // 상판은 손님 앞(깊이 4)에 덮여, 두 손님이 마주 앉은 것처럼 보입니다.
      this.roomParts.push(
        this.add
          .image(pos.x, pos.y + TABLE_TOP_DY, "table-top")
          .setScale(ART_SCALE)
          .setDepth(4),
      );
    }
  }

  private syncTables() {
    const seats = sim.tablesOn(this.activeFloor);
    for (const [seatIndex, icon] of this.dirtyIcons) {
      const dirty = seats[seatIndex]?.state === "dirty";
      if (icon.visible !== dirty) icon.setVisible(dirty);
    }
  }

  /* ----------------------------- 손님 ----------------------------- */

  private syncCustomers() {
    const customers = sim.customersOn(this.activeFloor);
    const seen = new Set<number>();

    for (const c of customers) {
      seen.add(c.id);
      let view = this.customerViews.get(c.id);
      if (!view) {
        view = this.createCustomerView(c);
        this.customerViews.set(c.id, view);
      }
      this.updateCustomerView(view, c);
    }

    for (const [id, view] of this.customerViews) {
      if (!seen.has(id)) {
        view.root.destroy();
        this.customerViews.delete(id);
      }
    }
  }

  private createCustomerView(c: SimCustomer): CustomerView {
    const root = this.add.container(ENTRANCE.x, ENTRANCE.y).setDepth(3);

    const body = this.add.image(0, BODY_Y, bodyKey(c.look)).setScale(ART_SCALE);
    const head = this.add.image(0, HEAD_Y, headKey(c.look)).setScale(ART_SCALE);
    const hair = this.add.image(0, HEAD_Y, hairKey(c.look)).setScale(ART_SCALE);
    const face = this.add.image(0, HEAD_Y, "face-happy").setScale(ART_SCALE);

    // 막대는 왼쪽 끝을 고정해 두고 폭만 줄입니다. 그래서 원점을 왼쪽에 둡니다.
    const barLeft = -BAR_W / 2;
    const bar = (y: number, color: number) =>
      this.add.rectangle(barLeft, y, BAR_W, BAR_H, color).setOrigin(0, 0.5);

    const patienceBg = bar(PATIENCE_Y, 0x000000).setAlpha(0.28);
    const patienceFill = bar(PATIENCE_Y, 0x7ac74f);
    const makeBg = bar(MAKE_Y, 0x000000).setAlpha(0.28).setVisible(false);
    const makeFill = bar(MAKE_Y, 0x4aa3df).setVisible(false);

    const isSet = c.order.itemIds.length > 1;
    const bubble = this.add.container(0, BUBBLE_Y);
    const bubbleBg = this.add
      .image(0, 0, isSet ? "bubble-2" : "bubble-1")
      .setScale(ART_SCALE);
    const bubbleItems = c.order.itemIds.map((id, i) => {
      const x = isSet ? (i === 0 ? -25 : 25) : 0;
      return this.add
        .image(x, -BUBBLE_BOX_OFFSET, itemKey(id))
        .setScale(ART_SCALE * (isSet ? 0.82 : 0.94));
    });
    bubble.add([bubbleBg, ...bubbleItems]);

    // 상태 표시는 말풍선 어깨에 붙입니다 (따로 공중에 떠 있으면 눈에 안 띄어요).
    const statusIconHomeX = isSet ? 44 : 28;
    const statusIcon = this.add
      .image(statusIconHomeX, BUBBLE_Y - 15, "icon-tap")
      .setScale(ART_SCALE * 0.8);

    root.add([
      patienceBg,
      patienceFill,
      makeBg,
      makeFill,
      body,
      head,
      hair,
      face,
      bubble,
      statusIcon,
    ]);

    // 손님 탭 영역
    const hit = this.add.rectangle(0, -6, 110, 120, 0xffffff, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => sim.tapCustomer(this.activeFloor, c.id));
    root.add(hit);

    return {
      root,
      face,
      bubble,
      statusIcon,
      statusIconHomeX,
      patienceBg,
      patienceFill,
      makeBg,
      makeFill,
    };
  }

  private updateCustomerView(view: CustomerView, c: SimCustomer) {
    const seat = seatPosition(c.tableIndex);

    if (c.leaving) {
      // 나가는 중 — 문 쪽으로 내려가며 사라집니다
      const t = 1 - Math.max(0, c.phaseTimer) / 600;
      view.root.setPosition(
        Phaser.Math.Linear(seat.x, ENTRANCE.x, t * 0.4),
        seat.y + t * 150,
      );
      view.root.setAlpha(1 - t);
      view.bubble.setVisible(false);
      view.statusIcon.setVisible(false);
      view.patienceBg.setVisible(false);
      view.patienceFill.setVisible(false);
      return;
    }

    if (c.phase === "walking") {
      // 문에서 자리까지 걸어옵니다
      const t = 1 - Math.max(0, c.phaseTimer) / c.walkTotal;
      view.root.setPosition(
        Phaser.Math.Linear(ENTRANCE.x, seat.x, t),
        Phaser.Math.Linear(ENTRANCE.y, seat.y, t),
      );
      view.bubble.setVisible(false);
      view.statusIcon.setVisible(false);
      view.patienceBg.setVisible(false);
      view.patienceFill.setVisible(false);
      return;
    }

    view.root.setPosition(seat.x, seat.y);
    view.bubble.setVisible(c.phase !== "eating");

    // 인내심 막대 — 왼쪽 끝은 그대로 두고 오른쪽만 줄어듭니다.
    const showPatience = c.phase === "preparing" || c.phase === "ready";
    view.patienceBg.setVisible(showPatience);
    view.patienceFill.setVisible(showPatience);
    if (showPatience) {
      const pct = Phaser.Math.Clamp(c.patience / c.patienceTotal, 0, 1);
      view.patienceFill.setSize(BAR_W * pct, BAR_H);
      view.patienceFill.fillColor =
        pct < 0.3 ? 0xe74c3c : pct < 0.6 ? 0xf1c40f : 0x7ac74f;
      view.face.setTexture(pct < 0.3 ? "face-angry" : "face-happy");
    } else {
      view.face.setTexture("face-happy");
    }

    // 제조 진행 막대
    const preparing = c.phase === "preparing";
    view.makeBg.setVisible(preparing);
    view.makeFill.setVisible(preparing);
    if (preparing) {
      const done = Phaser.Math.Clamp(1 - c.makeLeft / c.makeTotal, 0, 1);
      view.makeFill.setSize(BAR_W * done, BAR_H);
    }

    // 상태 아이콘: 손으로 눌러야 하는 상황이면 느낌표를 띄웁니다
    const data = gameState.floor(this.activeFloor);
    let icon = "";
    if (c.phase === "preparing") icon = data.barista > 0 ? "icon-wait" : "icon-tap";
    else if (c.phase === "ready") icon = data.server > 0 ? "icon-bell" : "icon-tap";
    else if (c.phase === "eating") icon = "icon-yum";
    view.statusIcon.setVisible(icon !== "");
    if (icon !== "") {
      view.statusIcon.setTexture(icon);
      // 말풍선이 없는 동안(다 먹는 중)에는 표시가 공중에 뜨지 않게
      // 머리 바로 위로 내려 붙입니다.
      const onBubble = view.bubble.visible;
      view.statusIcon.setPosition(
        onBubble ? view.statusIconHomeX : 0,
        onBubble ? BUBBLE_Y - 15 : HEAD_Y - 30,
      );
    }
  }

  /* ---------------------------- 이벤트 반응 ---------------------------- */

  private onLayoutChanged() {
    sim.rebuild();
    this.rebuildTables();
    this.refreshEquipmentRow();
  }

  private onFloorSwitched(floorIndex: number) {
    this.activeFloor = floorIndex;
    this.customerViews.forEach((v) => v.root.destroy());
    this.customerViews.clear();
    this.rebuildTables();
    this.refreshEquipmentRow();
    this.updateFloorLabel();
  }

  private onServed(payload: {
    customer: SimCustomer;
    floorIndex: number;
    paid: number;
  }) {
    if (payload.floorIndex !== this.activeFloor) return;
    const pos = seatPosition(payload.customer.tableIndex);
    this.coinPopup(pos.x, pos.y - 60, payload.paid);
  }

  private onAngry(c: SimCustomer) {
    if (c.floorIndex !== this.activeFloor) return;
    const pos = seatPosition(c.tableIndex);
    this.iconPopup(pos.x, pos.y - 60, "icon-angry");
  }

  private onMadeByHand(c: SimCustomer) {
    if (c.floorIndex !== this.activeFloor) return;
    const pos = seatPosition(c.tableIndex);
    this.iconPopup(pos.x, pos.y - 60, "icon-spark");
  }

  private onTableCleaned(payload: { floorIndex: number; tableIndex: number }) {
    if (payload.floorIndex !== this.activeFloor) return;
    const pos = seatPosition(payload.tableIndex);
    this.iconPopup(pos.x, pos.y - 30, "icon-spark");
  }

  /** 코인 그림과 함께 "+금액" 이 떠오릅니다 */
  private coinPopup(x: number, y: number, amount: number) {
    const group = this.add.container(x, y).setDepth(20);
    const coin = this.add.image(-22, 0, "icon-coin").setScale(ART_SCALE);
    const text = this.add
      .text(0, 0, `+${amount.toLocaleString()}`, {
        fontSize: "28px",
        color: "#ffd54f",
        fontStyle: "bold",
        stroke: "#5a3b22",
        strokeThickness: 5,
      })
      .setOrigin(0, 0.5);
    group.add([coin, text]);
    this.floatUp(group, y);
  }

  private iconPopup(x: number, y: number, key: string) {
    const img = this.add.image(x, y, key).setScale(ART_SCALE).setDepth(20);
    this.floatUp(img, y);
  }

  private floatUp(target: Phaser.GameObjects.GameObject, y: number) {
    this.tweens.add({
      targets: target,
      y: y - 70,
      alpha: 0,
      duration: 850,
      ease: "Cubic.easeOut",
      onComplete: () => target.destroy(),
    });
  }
}
