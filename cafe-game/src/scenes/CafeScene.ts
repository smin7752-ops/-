import Phaser from "phaser";
import { bus, EVENTS } from "../game/bus";
import {
  CUSTOMER_PATIENCE_MS,
  MAX_ROLE_COUNT,
  TABLES_PER_FLOOR,
} from "../game/config";
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
  publishIconUrls,
} from "../game/art";

export const VIRTUAL_WIDTH = 720;
export const VIRTUAL_HEIGHT = 1280;

/* 화면 위아래는 HTML 버튼(코인, 층 탭, 아래 메뉴바)이 덮고 있습니다.
   게임 그림은 대략 y = 200 ~ 1110 사이에 그려야 가려지지 않습니다. */
const SAFE_TOP = 200;

const COUNTER_Y = 275;
/** 바리스타가 서 있는 바닥선 (그림의 발끝이 닿는 높이) */
const BARISTA_BASE_Y = COUNTER_Y + 30;
const COLS = 2;
const TOP_MARGIN = 520;
const ROW_GAP = 256;
const ENTRANCE = { x: VIRTUAL_WIDTH / 2, y: 385 };

/* 테이블 자리 기준으로 의자·상판이 놓이는 높이.
   의자는 손님 뒤, 상판은 손님 앞에 와야 "앉아 있는" 것처럼 보입니다. */
const SEAT_DY = -24;
const CHAIR_DY = -64;
const TABLE_TOP_DY = 40;

/* 손님 그림의 각 부분이 놓이는 자리 (앉은 자리 기준).
   위에서부터 말풍선 → 제조 막대 → 인내심 막대 → 의자 등받이 → 머리 순으로
   겹치지 않게 배치한 값입니다.
   한 손님이 차지하는 세로 높이(말풍선 꼭대기 ~ 테이블 아래)가 ROW_GAP 보다
   크면 윗줄 테이블과 아랫줄 말풍선이 겹칩니다. 값을 만질 때 같이 확인하세요. */
const BODY_Y = 18;
const HEAD_Y = -22;
const PATIENCE_Y = -72;
const MAKE_Y = -86;
const BUBBLE_Y = -120;
const BAR_W = 62;

function tablePosition(index: number) {
  const colWidth = VIRTUAL_WIDTH / COLS;
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return {
    x: colWidth * col + colWidth / 2,
    y: TOP_MARGIN + row * ROW_GAP,
  };
}

/** 손님 한 명에 대응하는 화면 표시 묶음 */
interface CustomerView {
  root: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Container;
  bubbleBg: Phaser.GameObjects.Image;
  bubbleItems: Phaser.GameObjects.Image[];
  statusIcon: Phaser.GameObjects.Image;
  patienceBg: Phaser.GameObjects.Rectangle;
  patienceFill: Phaser.GameObjects.Rectangle;
  makeBg: Phaser.GameObjects.Rectangle;
  makeFill: Phaser.GameObjects.Rectangle;
}

interface TableView {
  /* 의자는 손님 뒤, 상판은 손님 앞에 그려져야 손님이 테이블에 앉은 것처럼
     보입니다. 그래서 한 묶음으로 못 묶고 각각 깊이를 따로 줍니다. */
  parts: Phaser.GameObjects.GameObject[];
  dirtyIcon: Phaser.GameObjects.Image;
}

export class CafeScene extends Phaser.Scene {
  private activeFloor = 0;
  private customerViews = new Map<number, CustomerView>();
  private tableViews: TableView[] = [];
  private floorLabel!: Phaser.GameObjects.Text;
  private baristas: Phaser.GameObjects.Image[] = [];
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
    this.rebuildTables();

    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => gameState.save(),
    });

    bus.on(EVENTS.LAYOUT_CHANGED, this.onLayoutChanged, this);
    bus.on(EVENTS.FLOOR_SWITCHED, this.onFloorSwitched, this);
    bus.on(EVENTS.SERVED, this.onServed, this);
    bus.on(EVENTS.CUSTOMER_ANGRY, this.onAngry, this);
    bus.on(EVENTS.MADE_BY_HAND, this.onMadeByHand, this);
    bus.on(EVENTS.TABLE_CLEANED, this.onTableCleaned, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EVENTS.LAYOUT_CHANGED, this.onLayoutChanged, this);
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
    this.syncBarista();
  }

  /* ---------------------------- 가게 배경 ---------------------------- */

  private drawRoom() {
    const g = this.add.graphics().setDepth(-10);

    // 벽
    g.fillStyle(0xd9c3a0, 1);
    g.fillRect(0, 0, VIRTUAL_WIDTH, COUNTER_Y + 60);

    // 바닥
    g.fillStyle(0xe4d0ad, 1);
    g.fillRect(0, COUNTER_Y + 60, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    g.fillStyle(0xd8c096, 1);
    for (let y = COUNTER_Y + 60; y < VIRTUAL_HEIGHT; y += 96) {
      for (let x = 0; x < VIRTUAL_WIDTH; x += 96) {
        const shift = Math.floor((y - COUNTER_Y - 60) / 96) % 2 === 0 ? 0 : 48;
        g.fillRect(x + shift, y, 48, 48);
      }
    }

    // 벽에 걸린 그림 두 점
    const frame = (x: number, y: number, inner: number) => {
      g.fillStyle(ART_COLORS.woodDark, 1);
      g.fillRoundedRect(x, y, 76, 62, 8);
      g.fillStyle(inner, 1);
      g.fillRoundedRect(x + 8, y + 8, 60, 46, 4);
    };
    // 바리스타(왼쪽)와 설비(오른쪽)를 가리지 않는 가운데 벽에 겁니다.
    frame(268, SAFE_TOP + 6, 0xb7d7c4);
    frame(376, SAFE_TOP + 6, 0xf0c7ce);
  }

  private drawCounter() {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(ART_COLORS.wood, 1);
    g.fillRoundedRect(30, COUNTER_Y, VIRTUAL_WIDTH - 60, 66, 14);
    g.fillStyle(ART_COLORS.woodLight, 1);
    g.fillRoundedRect(30, COUNTER_Y, VIRTUAL_WIDTH - 60, 34, 14);
    g.lineStyle(5, ART_COLORS.ink, 1);
    g.strokeRoundedRect(30, COUNTER_Y, VIRTUAL_WIDTH - 60, 66, 14);

    // 바리스타는 카운터 뒤에 서 있습니다. 고용한 사람 수만큼 보여요.
    // 발끝을 카운터 안쪽에 두어 상반신만 카운터 위로 보이게 합니다.
    this.baristas = Array.from({ length: MAX_ROLE_COUNT }, (_, i) =>
      this.add
        .image(120 + i * 72, BARISTA_BASE_Y, "barista")
        .setOrigin(0.5, 1)
        .setScale(ART_SCALE)
        .setDepth(0)
        .setVisible(false),
    );

    this.floorLabel = this.add
      .text(52, COUNTER_Y + 33, "", {
        fontSize: "26px",
        color: "#f3e3c3",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(2);
    this.updateFloorLabel();

    this.refreshEquipmentRow();
  }

  /** 카운터 위에 산 설비들을 늘어놓습니다. 커피머신은 처음부터 있어요. */
  private refreshEquipmentRow() {
    this.equipmentImages.forEach((img) => img.destroy());
    this.equipmentImages = [];

    const owned = gameState
      .equipmentDefs()
      .filter((e) => gameState.hasEquipment(e.id));

    // 카운터 위 오른쪽부터 왼쪽으로, 겹치지 않게 늘어놓습니다.
    let x = VIRTUAL_WIDTH - 78;
    for (const def of owned) {
      const img = this.add
        .image(x, COUNTER_Y + 4, equipKey(def.id))
        .setOrigin(0.5, 1)
        .setScale(ART_SCALE)
        .setDepth(0);
      this.equipmentImages.push(img);
      x -= img.displayWidth * 0.72 + 12;
    }
  }

  private syncBarista() {
    const hired = gameState.floor(this.activeFloor).barista;

    // 주문을 만드는 중이면 들썩이게 해서 일하고 있다는 걸 보여줍니다.
    const busy = sim
      .customersOn(this.activeFloor)
      .some((c) => c.phase === "preparing");

    this.baristas.forEach((img, i) => {
      const show = i < hired;
      if (img.visible !== show) img.setVisible(show);
      if (!show) return;
      // 사람마다 조금씩 어긋나게 움직여야 복사판처럼 안 보입니다.
      const bob = busy ? Math.sin(this.time.now / 110 + i * 1.3) * 5 : 0;
      img.setY(BARISTA_BASE_Y + bob);
    });
  }

  private updateFloorLabel() {
    this.floorLabel.setText(`${this.activeFloor + 1}층`);
  }

  /* ---------------------------- 테이블 ---------------------------- */

  private rebuildTables() {
    this.tableViews.forEach((v) => v.parts.forEach((p) => p.destroy()));
    this.tableViews = [];

    const data = gameState.floor(this.activeFloor);
    for (let i = 0; i < TABLES_PER_FLOOR; i++) {
      const pos = tablePosition(i);
      const owned = i < data.tables;
      const parts: Phaser.GameObjects.GameObject[] = [];

      if (owned) {
        parts.push(
          this.add
            .image(pos.x, pos.y + CHAIR_DY, "chair")
            .setScale(ART_SCALE)
            .setDepth(1),
          this.add
            .image(pos.x, pos.y + TABLE_TOP_DY, "table-top")
            .setScale(ART_SCALE)
            .setDepth(4),
        );
      } else {
        parts.push(
          this.add
            .image(pos.x, pos.y + 10, "table-empty")
            .setScale(ART_SCALE)
            .setDepth(1),
        );
      }

      const dirtyIcon = this.add
        .image(pos.x, pos.y + 20, "icon-dirty")
        .setScale(ART_SCALE)
        .setDepth(5)
        .setVisible(false);
      parts.push(dirtyIcon);

      // 실제 탭을 받는 투명 영역 (테이블보다 넉넉하게).
      // 손님(깊이 3)보다 아래에 둬야 손님 탭이 이 영역에 먹히지 않습니다.
      const hit = this.add
        .rectangle(pos.x, pos.y, 150, 190, 0xffffff, 0)
        .setDepth(2);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.onTableTapped(i, owned));
      parts.push(hit);

      this.tableViews.push({ parts, dirtyIcon });
    }
  }

  private onTableTapped(tableIndex: number, owned: boolean) {
    if (!owned) {
      bus.emit(EVENTS.OPEN_PANEL, "store");
      return;
    }
    sim.tapTable(this.activeFloor, tableIndex);
  }

  private syncTables() {
    const tables = sim.tablesOn(this.activeFloor);
    for (let i = 0; i < this.tableViews.length; i++) {
      const view = this.tableViews[i];
      const table = tables[i];
      const dirty = table?.state === "dirty";
      if (view.dirtyIcon.visible !== dirty) view.dirtyIcon.setVisible(dirty);
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
      this.add.rectangle(barLeft, y, BAR_W, 8, color).setOrigin(0, 0.5);

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

    const statusIcon = this.add
      .image(isSet ? 58 : 42, BUBBLE_Y - 18, "icon-tap")
      .setScale(ART_SCALE);

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
    const hit = this.add.rectangle(0, -10, 150, 170, 0xffffff, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => sim.tapCustomer(this.activeFloor, c.id));
    root.add(hit);

    return {
      root,
      face,
      bubble,
      bubbleBg,
      bubbleItems,
      statusIcon,
      patienceBg,
      patienceFill,
      makeBg,
      makeFill,
    };
  }

  private updateCustomerView(view: CustomerView, c: SimCustomer) {
    const table = tablePosition(c.tableIndex);
    // 손님은 테이블 상판보다 살짝 위에 앉습니다.
    const seatY = table.y + SEAT_DY;

    if (c.leaving) {
      // 나가는 중 — 아래로 사라집니다
      const t = 1 - Math.max(0, c.phaseTimer) / 600;
      view.root.setPosition(table.x, seatY + t * 160);
      view.root.setAlpha(1 - t);
      view.bubble.setVisible(false);
      view.statusIcon.setVisible(false);
      view.patienceBg.setVisible(false);
      view.patienceFill.setVisible(false);
      return;
    }

    if (c.phase === "walking") {
      const t = 1 - Math.max(0, c.phaseTimer) / c.walkTotal;
      view.root.setPosition(
        Phaser.Math.Linear(ENTRANCE.x, table.x, t),
        Phaser.Math.Linear(ENTRANCE.y, seatY, t),
      );
      view.bubble.setVisible(false);
      view.statusIcon.setVisible(false);
      view.patienceBg.setVisible(false);
      view.patienceFill.setVisible(false);
      return;
    }

    view.root.setPosition(table.x, seatY);
    view.bubble.setVisible(c.phase !== "eating");

    // 인내심 막대 — 왼쪽 끝은 그대로 두고 오른쪽만 줄어듭니다.
    const showPatience = c.phase === "preparing" || c.phase === "ready";
    view.patienceBg.setVisible(showPatience);
    view.patienceFill.setVisible(showPatience);
    if (showPatience) {
      const pct = Phaser.Math.Clamp(c.patience / CUSTOMER_PATIENCE_MS, 0, 1);
      view.patienceFill.setSize(BAR_W * pct, 8);
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
      view.makeFill.setSize(BAR_W * done, 8);
    }

    // 상태 아이콘: 손으로 눌러야 하는 상황이면 손가락 표시
    const data = gameState.floor(this.activeFloor);
    let icon = "";
    if (c.phase === "preparing") icon = data.barista > 0 ? "icon-wait" : "icon-tap";
    else if (c.phase === "ready") icon = data.server > 0 ? "icon-bell" : "icon-tap";
    else if (c.phase === "eating") icon = "icon-yum";
    view.statusIcon.setVisible(icon !== "");
    if (icon !== "") view.statusIcon.setTexture(icon);
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
    this.updateFloorLabel();
  }

  private onServed(payload: { customer: SimCustomer; floorIndex: number }) {
    if (payload.floorIndex !== this.activeFloor) return;
    const pos = tablePosition(payload.customer.tableIndex);
    this.coinPopup(pos.x, pos.y - 40, payload.customer.order.price);
  }

  private onAngry(c: SimCustomer) {
    if (c.floorIndex !== this.activeFloor) return;
    const pos = tablePosition(c.tableIndex);
    this.iconPopup(pos.x, pos.y - 40, "icon-angry");
  }

  private onMadeByHand(c: SimCustomer) {
    if (c.floorIndex !== this.activeFloor) return;
    const pos = tablePosition(c.tableIndex);
    this.iconPopup(pos.x, pos.y - 40, "icon-spark");
  }

  private onTableCleaned(payload: { floorIndex: number; tableIndex: number }) {
    if (payload.floorIndex !== this.activeFloor) return;
    const pos = tablePosition(payload.tableIndex);
    this.iconPopup(pos.x, pos.y - 20, "icon-spark");
  }

  /** 코인 그림과 함께 "+금액" 이 떠오릅니다 */
  private coinPopup(x: number, y: number, amount: number) {
    const group = this.add.container(x, y).setDepth(20);
    const coin = this.add.image(-22, 0, "icon-coin").setScale(ART_SCALE);
    const text = this.add
      .text(0, 0, `+${amount.toLocaleString()}`, {
        fontSize: "30px",
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
