import Phaser from "phaser";
import { bus, EVENTS } from "../game/bus";
import { CUSTOMER_PATIENCE_MS, TABLES_PER_FLOOR } from "../game/config";
import { gameState } from "../game/state";
import { sim, type SimCustomer } from "../game/sim";

export const VIRTUAL_WIDTH = 720;
export const VIRTUAL_HEIGHT = 1280;

const COLS = 2;
const TOP_MARGIN = 400;
const ROW_GAP = 250;
const ENTRANCE = { x: VIRTUAL_WIDTH / 2, y: 250 };

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
  face: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Container;
  bubbleText: Phaser.GameObjects.Text;
  statusIcon: Phaser.GameObjects.Text;
  patienceFill: Phaser.GameObjects.Rectangle;
  makeFill: Phaser.GameObjects.Rectangle;
  makeBg: Phaser.GameObjects.Rectangle;
}

interface TableView {
  root: Phaser.GameObjects.Container;
  dirtyIcon: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
}

export class CafeScene extends Phaser.Scene {
  private activeFloor = 0;
  private customerViews = new Map<number, CustomerView>();
  private tableViews: TableView[] = [];
  private floorLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("cafe");
  }

  create() {
    this.cameras.main.setBackgroundColor("#ead9b8");
    this.drawFloorBackground();
    this.drawEntrance();
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
  }

  /* ---------------------------- 배경 그리기 ---------------------------- */

  private drawFloorBackground() {
    const g = this.add.graphics();
    g.fillStyle(0xead9b8, 1);
    g.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    for (let y = 40; y < VIRTUAL_HEIGHT; y += 40) {
      g.lineStyle(1, 0xd8c39c, 0.6);
      g.lineBetween(0, y, VIRTUAL_WIDTH, y);
    }
    // 카운터
    g.fillStyle(0x8a5a34, 1);
    g.fillRoundedRect(60, 120, VIRTUAL_WIDTH - 120, 90, 16);
    g.fillStyle(0xa9713f, 1);
    g.fillRoundedRect(60, 120, VIRTUAL_WIDTH - 120, 60, 16);
    g.setDepth(-10);
  }

  private drawEntrance() {
    // 층 번호는 화면 위 HTML 탭이 보여주므로, 여기서는 카운터 왼쪽에 작게만.
    this.floorLabel = this.add
      .text(84, 152, "", {
        fontSize: "26px",
        color: "#f3e3c3",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(7);
    this.updateFloorLabel();

    // 카운터 위 설비 아이콘
    this.add
      .text(VIRTUAL_WIDTH / 2, 165, "", { fontSize: "34px" })
      .setOrigin(0.5)
      .setDepth(6)
      .setName("equipment-row");
    this.refreshEquipmentRow();
  }

  private refreshEquipmentRow() {
    const row = this.children.getByName("equipment-row") as
      | Phaser.GameObjects.Text
      | null;
    if (!row) return;
    const owned = gameState
      .equipmentDefs()
      .filter((e) => gameState.hasEquipment(e.id))
      .map((e) => e.emoji)
      .join("  ");
    row.setText(owned);
  }

  private updateFloorLabel() {
    this.floorLabel.setText(`${this.activeFloor + 1}층`);
  }

  /* ---------------------------- 테이블 ---------------------------- */

  private rebuildTables() {
    this.tableViews.forEach((v) => v.root.destroy());
    this.tableViews = [];

    const data = gameState.floor(this.activeFloor);
    for (let i = 0; i < TABLES_PER_FLOOR; i++) {
      const pos = tablePosition(i);
      const root = this.add.container(pos.x, pos.y).setDepth(1);
      const owned = i < data.tables;

      if (owned) {
        const cloth = this.add.rectangle(0, 0, 100, 100, 0x8a5a34, 1);
        cloth.setStrokeStyle(4, 0x5a3b22);
        const top = this.add.rectangle(0, -6, 82, 82, 0xf3e3c3, 1);
        root.add([cloth, top]);
      } else {
        const outline = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.1);
        outline.setStrokeStyle(3, 0x5a3b22, 0.45);
        const plus = this.add
          .text(0, 0, "+", { fontSize: "42px", color: "#5a3b22" })
          .setOrigin(0.5);
        root.add([outline, plus]);
      }

      const dirtyIcon = this.add
        .text(0, -4, "🍽️", { fontSize: "34px" })
        .setOrigin(0.5)
        .setVisible(false);
      root.add(dirtyIcon);

      // 실제 탭을 받는 투명 영역 (테이블보다 넉넉하게)
      const hit = this.add.rectangle(0, 0, 120, 120, 0xffffff, 0);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.onTableTapped(i, owned));
      root.add(hit);

      this.tableViews.push({ root, dirtyIcon, hit });
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

    const face = this.add.text(0, 0, c.face, { fontSize: "46px" }).setOrigin(0.5);

    const patienceBg = this.add.rectangle(0, -40, 52, 7, 0x000000, 0.3);
    const patienceFill = this.add.rectangle(0, -40, 52, 7, 0x7ac74f);

    const makeBg = this.add.rectangle(0, 34, 52, 7, 0x000000, 0.3).setVisible(false);
    const makeFill = this.add.rectangle(0, 34, 52, 7, 0x4aa3df).setVisible(false);

    const bubble = this.add.container(0, -84);
    const bubbleBg = this.add.rectangle(0, 0, 76, 46, 0xffffff, 0.96);
    bubbleBg.setStrokeStyle(3, 0x3b2a20);
    const bubbleText = this.add
      .text(0, 0, c.order.label, { fontSize: "26px" })
      .setOrigin(0.5);
    bubble.add([bubbleBg, bubbleText]);

    const statusIcon = this.add
      .text(36, -84, "", { fontSize: "26px" })
      .setOrigin(0.5);

    root.add([patienceBg, patienceFill, makeBg, makeFill, face, bubble, statusIcon]);

    // 손님 탭 영역
    const hit = this.add.rectangle(0, -20, 130, 150, 0xffffff, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => sim.tapCustomer(this.activeFloor, c.id));
    root.add(hit);

    return { root, face, bubble, bubbleText, statusIcon, patienceFill, makeFill, makeBg };
  }

  private updateCustomerView(view: CustomerView, c: SimCustomer) {
    const table = tablePosition(c.tableIndex);

    if (c.leaving) {
      // 나가는 중 — 아래로 사라집니다
      const t = 1 - Math.max(0, c.phaseTimer) / 600;
      view.root.setPosition(table.x, table.y + t * 160);
      view.root.setAlpha(1 - t);
      view.bubble.setVisible(false);
      view.statusIcon.setVisible(false);
      return;
    }

    if (c.phase === "walking") {
      const t = 1 - Math.max(0, c.phaseTimer) / c.walkTotal;
      view.root.setPosition(
        Phaser.Math.Linear(ENTRANCE.x, table.x, t),
        Phaser.Math.Linear(ENTRANCE.y, table.y, t),
      );
      view.bubble.setVisible(false);
      view.statusIcon.setVisible(false);
      view.patienceFill.setVisible(false);
      return;
    }

    view.root.setPosition(table.x, table.y);
    view.bubble.setVisible(c.phase !== "eating");
    view.bubbleText.setText(c.order.label);

    // 인내심 막대
    const showPatience = c.phase === "preparing" || c.phase === "ready";
    view.patienceFill.setVisible(showPatience);
    if (showPatience) {
      const pct = Phaser.Math.Clamp(c.patience / CUSTOMER_PATIENCE_MS, 0, 1);
      view.patienceFill.width = 52 * pct;
      view.patienceFill.x = -26 * (1 - pct);
      view.patienceFill.fillColor =
        pct < 0.3 ? 0xe74c3c : pct < 0.6 ? 0xf1c40f : 0x7ac74f;
    }

    // 제조 진행 막대
    const preparing = c.phase === "preparing";
    view.makeBg.setVisible(preparing);
    view.makeFill.setVisible(preparing);
    if (preparing) {
      const done = Phaser.Math.Clamp(1 - c.makeLeft / c.makeTotal, 0, 1);
      view.makeFill.width = 52 * done;
      view.makeFill.x = -26 * (1 - done);
    }

    // 상태 아이콘: 손으로 눌러야 하는 상황이면 손가락 표시
    const data = gameState.floor(this.activeFloor);
    let icon = "";
    if (c.phase === "preparing") icon = data.barista > 0 ? "⏳" : "👆";
    else if (c.phase === "ready") icon = data.server > 0 ? "🔔" : "👆";
    else if (c.phase === "eating") icon = "😋";
    view.statusIcon.setVisible(icon !== "");
    view.statusIcon.setText(icon);
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
    this.popup(pos.x, pos.y - 30, `+${payload.customer.order.price}`, "#ffd54f");
  }

  private onAngry(c: SimCustomer) {
    if (c.floorIndex !== this.activeFloor) return;
    const pos = tablePosition(c.tableIndex);
    this.popup(pos.x, pos.y - 30, "😠", "#ffffff");
  }

  private onMadeByHand(c: SimCustomer) {
    if (c.floorIndex !== this.activeFloor) return;
    const pos = tablePosition(c.tableIndex);
    this.popup(pos.x, pos.y - 30, "✨", "#ffffff");
  }

  private onTableCleaned(payload: { floorIndex: number; tableIndex: number }) {
    if (payload.floorIndex !== this.activeFloor) return;
    const pos = tablePosition(payload.tableIndex);
    this.popup(pos.x, pos.y - 20, "✨", "#ffffff");
  }

  private popup(x: number, y: number, label: string, color: string) {
    const text = this.add
      .text(x, y, label, {
        fontSize: "30px",
        color,
        fontStyle: "bold",
        stroke: "#5a3b22",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 850,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }
}
