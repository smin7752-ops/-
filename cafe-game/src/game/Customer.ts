import Phaser from "phaser";
import { CUSTOMER_PATIENCE_MS, type MenuItem } from "./config";

const FACES = ["😀", "😊", "🙂", "😌", "🤗", "😄"];

export type CustomerState = "walking" | "waiting" | "served" | "left";

export class Customer extends Phaser.GameObjects.Container {
  order: MenuItem;
  tableIndex: number;
  state: CustomerState = "walking";
  patienceMs = CUSTOMER_PATIENCE_MS;

  private face: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Container;
  private patienceBarBg: Phaser.GameObjects.Rectangle;
  private patienceBarFill: Phaser.GameObjects.Rectangle;
  private tablePos: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    tablePos: { x: number; y: number },
    tableIndex: number,
    order: MenuItem,
  ) {
    super(scene, startX, startY);
    this.order = order;
    this.tableIndex = tableIndex;
    this.tablePos = tablePos;

    this.face = scene.add.text(0, 0, Phaser.Utils.Array.GetRandom(FACES), {
      fontSize: "40px",
    });
    this.face.setOrigin(0.5);
    this.add(this.face);

    this.patienceBarBg = scene.add.rectangle(0, -34, 44, 6, 0x000000, 0.35);
    this.patienceBarFill = scene.add.rectangle(0, -34, 44, 6, 0x7ac74f);
    this.add([this.patienceBarBg, this.patienceBarFill]);

    this.bubble = this.buildOrderBubble(scene, order);
    this.bubble.setVisible(false);
    this.add(this.bubble);

    this.setSize(90, 130);
    this.setInteractive({ useHandCursor: true });

    scene.add.existing(this);
  }

  private buildOrderBubble(scene: Phaser.Scene, order: MenuItem) {
    const container = scene.add.container(0, -60);
    const bg = scene.add.rectangle(0, 0, 40, 34, 0xffffff, 0.95);
    bg.setStrokeStyle(2, 0x3b2a20);
    const icon = scene.add.text(0, 0, order.emoji, { fontSize: "22px" });
    icon.setOrigin(0.5);
    container.add([bg, icon]);
    return container;
  }

  arriveAtTable(onArrived: () => void) {
    this.scene.tweens.add({
      targets: this,
      x: this.tablePos.x,
      y: this.tablePos.y,
      duration: 700,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.state = "waiting";
        this.bubble.setVisible(true);
        this.bubble.setScale(0);
        this.scene.tweens.add({
          targets: this.bubble,
          scale: 1,
          duration: 200,
          ease: "Back.easeOut",
        });
        onArrived();
      },
    });
  }

  /** returns false once patience has fully run out */
  tickPatience(deltaMs: number): boolean {
    if (this.state !== "waiting") return true;
    this.patienceMs -= deltaMs;
    const pct = Phaser.Math.Clamp(this.patienceMs / CUSTOMER_PATIENCE_MS, 0, 1);
    this.patienceBarFill.width = 44 * pct;
    this.patienceBarFill.x = -22 * (1 - pct);
    if (pct < 0.3) {
      this.patienceBarFill.fillColor = 0xe74c3c;
    } else if (pct < 0.6) {
      this.patienceBarFill.fillColor = 0xf1c40f;
    }
    return this.patienceMs > 0;
  }

  markServed() {
    this.state = "served";
  }

  markLeft() {
    this.state = "left";
  }

  walkOut(exitX: number, exitY: number, onDone: () => void) {
    this.scene.tweens.add({
      targets: this,
      x: exitX,
      y: exitY,
      alpha: 0,
      duration: 600,
      ease: "Sine.easeIn",
      onComplete: onDone,
    });
  }
}
