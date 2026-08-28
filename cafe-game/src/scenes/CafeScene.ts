import Phaser from "phaser";
import { Customer } from "../game/Customer";
import { bus, EVENTS } from "../game/bus";
import {
  BASE_SPAWN_INTERVAL_MS,
  MAX_TABLES,
  MENU_ITEMS,
  staffServeIntervalMs,
} from "../game/config";
import { gameState } from "../game/state";

export const VIRTUAL_WIDTH = 720;
export const VIRTUAL_HEIGHT = 1280;

const COLS = 2;
const TOP_MARGIN = 340;
const BOTTOM_MARGIN = 1120;
const ENTRANCE = { x: VIRTUAL_WIDTH / 2, y: 160 };

function tablePosition(index: number) {
  const rows = Math.ceil(MAX_TABLES / COLS);
  const rowHeight = (BOTTOM_MARGIN - TOP_MARGIN) / (rows - 1);
  const colWidth = VIRTUAL_WIDTH / COLS;
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return {
    x: colWidth * col + colWidth / 2,
    y: TOP_MARGIN + row * rowHeight,
  };
}

export class CafeScene extends Phaser.Scene {
  private state = gameState;
  private customers: (Customer | null)[] = [];
  private tableSlots: Phaser.GameObjects.Container[] = [];
  private staffTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super("cafe");
  }

  create() {
    this.customers = new Array(MAX_TABLES).fill(null);
    this.cameras.main.setBackgroundColor("#caa06a");

    this.drawFloor();
    this.drawEntrance();
    this.drawAllTableSlots();

    this.time.addEvent({
      delay: BASE_SPAWN_INTERVAL_MS,
      loop: true,
      callback: () => this.trySpawnCustomer(),
    });

    this.resetStaffTimer();

    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => this.state.save(),
    });

    bus.on(EVENTS.TABLES_CHANGED, () => this.drawAllTableSlots());
    bus.on(EVENTS.STAFF_CHANGED, () => this.resetStaffTimer());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EVENTS.TABLES_CHANGED);
      bus.off(EVENTS.STAFF_CHANGED);
    });

    // give the very first spawn a head start
    this.time.delayedCall(600, () => this.trySpawnCustomer());
  }

  update(_time: number, delta: number) {
    for (let i = 0; i < this.customers.length; i++) {
      const c = this.customers[i];
      if (!c || c.state !== "waiting") continue;
      const stillWaiting = c.tickPatience(delta);
      if (!stillWaiting) {
        this.customerLeaves(i);
      }
    }
  }

  private drawFloor() {
    const g = this.add.graphics();
    g.fillStyle(0xead9b8, 1);
    g.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    for (let y = 40; y < VIRTUAL_HEIGHT; y += 40) {
      g.lineStyle(1, 0xd8c39c, 0.6);
      g.lineBetween(0, y, VIRTUAL_WIDTH, y);
    }
  }

  private drawEntrance() {
    this.add.text(ENTRANCE.x, ENTRANCE.y - 60, "나의 작은 카페", {
      fontSize: "34px",
      color: "#5a3b22",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(ENTRANCE.x, ENTRANCE.y, "🚪", { fontSize: "40px" }).setOrigin(0.5);
  }

  private drawAllTableSlots() {
    this.tableSlots.forEach((c) => c.destroy());
    this.tableSlots = [];
    for (let i = 0; i < MAX_TABLES; i++) {
      const pos = tablePosition(i);
      const unlocked = i < this.state.data.tables;
      const container = this.add.container(pos.x, pos.y);

      if (unlocked) {
        const cloth = this.add.rectangle(0, 0, 90, 90, 0x8a5a34, 1);
        cloth.setStrokeStyle(4, 0x5a3b22);
        const top = this.add.rectangle(0, -6, 74, 74, 0xf3e3c3, 1);
        container.add([cloth, top]);
      } else {
        const outline = this.add.rectangle(0, 0, 90, 90, 0x000000, 0.12);
        outline.setStrokeStyle(3, 0x5a3b22, 0.5);
        const plus = this.add.text(0, 0, "+", {
          fontSize: "40px",
          color: "#5a3b22",
        }).setOrigin(0.5);
        container.add([outline, plus]);
        outline.setInteractive({ useHandCursor: true });
        outline.on("pointerdown", () => bus.emit(EVENTS.OPEN_SHOP, "tables"));
      }
      this.tableSlots.push(container);
    }
  }

  private trySpawnCustomer() {
    const freeIndex = this.customers.findIndex(
      (c, i) => c === null && i < this.state.data.tables,
    );
    if (freeIndex === -1) return;

    const menu = this.state.unlockedMenu();
    const order = Phaser.Utils.Array.GetRandom(menu.length ? menu : [MENU_ITEMS[0]]);
    const pos = tablePosition(freeIndex);

    const customer = new Customer(
      this,
      ENTRANCE.x,
      ENTRANCE.y,
      pos,
      freeIndex,
      order,
    );
    customer.on("pointerdown", () => this.serveCustomer(freeIndex));
    this.customers[freeIndex] = customer;

    customer.arriveAtTable(() => {
      // no-op: customer is now waiting, handled in update()
    });
  }

  private serveCustomer(index: number) {
    const c = this.customers[index];
    if (!c || c.state !== "waiting") return;
    c.markServed();
    this.state.addCoins(c.order.reward);
    bus.emit(EVENTS.COINS_CHANGED, this.state.data.coins);
    this.spawnCoinPopup(c.x, c.y, c.order.reward);

    c.walkOut(c.x, VIRTUAL_HEIGHT + 80, () => {
      c.destroy();
      this.customers[index] = null;
    });
  }

  /** auto-barista serves the most impatient waiting customer, if any */
  private autoServe() {
    let bestIndex = -1;
    let bestPatience = Infinity;
    this.customers.forEach((c, i) => {
      if (c && c.state === "waiting" && c.patienceMs < bestPatience) {
        bestPatience = c.patienceMs;
        bestIndex = i;
      }
    });
    if (bestIndex !== -1) this.serveCustomer(bestIndex);
  }

  private customerLeaves(index: number) {
    const c = this.customers[index];
    if (!c) return;
    c.markLeft();
    this.spawnAngryPopup(c.x, c.y);
    c.walkOut(c.x, VIRTUAL_HEIGHT + 80, () => {
      c.destroy();
      this.customers[index] = null;
    });
  }

  private resetStaffTimer() {
    this.staffTimer?.remove();
    const interval = staffServeIntervalMs(this.state.data.staffLevel);
    if (interval <= 0) return;
    this.staffTimer = this.time.addEvent({
      delay: interval,
      loop: true,
      callback: () => this.autoServe(),
    });
  }

  private spawnCoinPopup(x: number, y: number, amount: number) {
    const text = this.add.text(x, y - 40, `+${amount}`, {
      fontSize: "26px",
      color: "#ffd54f",
      fontStyle: "bold",
      stroke: "#5a3b22",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 100,
      alpha: 0,
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  private spawnAngryPopup(x: number, y: number) {
    const text = this.add.text(x, y - 40, "😠", { fontSize: "28px" }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 90,
      alpha: 0,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }
}
