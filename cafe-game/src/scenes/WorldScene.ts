import Phaser from "phaser";
import { bus, EVENTS } from "../game/bus";
import { buildArt } from "../game/art";
import { VIRTUAL_WIDTH } from "./CafeScene";

/**
 * 게임을 열면 가장 먼저 보이는 화면. 넓은 초원에 카페 건물이 서 있고,
 * 건물을 누르면 안(CafeScene)으로 들어갑니다.
 */
export class WorldScene extends Phaser.Scene {
  constructor() {
    super("world");
  }

  create() {
    buildArt(this);

    this.add.image(0, 0, "world-bg").setOrigin(0, 0);

    this.add
      .text(VIRTUAL_WIDTH / 2, 90, "나의 작은 카페", {
        fontSize: "40px",
        fontStyle: "bold",
        color: "#4a3226",
        stroke: "#fffaf2",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const buildingX = VIRTUAL_WIDTH / 2;
    const buildingY = 940;
    const building = this.add
      .image(buildingX, buildingY, "world-cafe")
      .setOrigin(0.5, 1);

    const signText = this.add
      .text(buildingX, buildingY - 340, "카페", {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#4a3226",
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(buildingX, buildingY + 60, "카페를 눌러 들어가세요", {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#fffaf2",
        stroke: "#4a3226",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: hint,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // 건물 전체를 누를 수 있게 넉넉한 범위로 잡습니다 (손가락으로 누르기 쉽게).
    const hit = this.add.rectangle(buildingX, buildingY - 240, 380, 500, 0xffffff, 0);
    hit.setInteractive({ useHandCursor: true });

    let entering = false;
    hit.on("pointerdown", () => {
      if (entering) return;
      entering = true;
      this.tweens.add({
        targets: [building, signText],
        scale: 1.03,
        duration: 120,
        yoyo: true,
      });
      this.cameras.main.fadeOut(400, 26, 18, 11);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        bus.emit(EVENTS.ENTERED_CAFE);
        this.scene.start("cafe");
      });
    });
  }
}
