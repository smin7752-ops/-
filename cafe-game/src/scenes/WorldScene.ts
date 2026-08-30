import Phaser from "phaser";
import { bus, EVENTS } from "../game/bus";
import { buildArt, isoGroundOrigin, isoToScreen } from "../game/art";
import { VIRTUAL_WIDTH } from "./CafeScene";

/** 카페 건물이 놓인 격자 자리. 나중에 건물을 더 추가할 땐 이 배열에
 * {gx, gy, textureKey, label, onEnter} 형태로 하나씩 더하면 됩니다. */
const CAFE_TILE = { gx: 0, gy: 0 };

/**
 * 게임을 열면 가장 먼저 보이는 화면. 넓은 초원(아이소메트릭 격자)에 카페
 * 건물이 서 있고, 건물을 누르면 안(CafeScene)으로 들어갑니다.
 */
export class WorldScene extends Phaser.Scene {
  constructor() {
    super("world");
  }

  create() {
    buildArt(this);

    this.add.image(0, 0, "world-bg").setOrigin(0, 0);

    // 들판 타일 그림 — 화면 가로 가운데, 세로 중간쯤에 격자 원점이 오도록 놓습니다.
    const groundOrigin = isoGroundOrigin();
    const groundScreenX = VIRTUAL_WIDTH / 2;
    const groundScreenY = 760;
    this.add
      .image(groundScreenX - groundOrigin.x, groundScreenY - groundOrigin.y, "world-ground")
      .setOrigin(0, 0);

    this.add
      .text(VIRTUAL_WIDTH / 2, 90, "나의 작은 카페", {
        fontSize: "40px",
        fontStyle: "bold",
        color: "#4a3226",
        stroke: "#fffaf2",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    // 카페 건물을 격자 자리(0,0)에 맞춰 놓습니다.
    // (world-cafe-iso 그림의 바닥 꼭짓점은 가로 가운데, 세로 90% 지점에 있습니다.)
    const tileScreen = isoToScreen(CAFE_TILE.gx, CAFE_TILE.gy);
    const buildingX = groundScreenX + tileScreen.x;
    const buildingY = groundScreenY + tileScreen.y + 25; // 타일 앞쪽 꼭짓점(바닥)에 맞춤
    const building = this.add
      .image(buildingX, buildingY, "world-cafe-iso")
      .setOrigin(0.5, 0.9);

    const signText = this.add
      .text(buildingX, buildingY - 130, "카페", {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#4a3226",
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(buildingX, buildingY + 40, "카페를 눌러 들어가세요", {
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
    const hit = this.add.rectangle(buildingX, buildingY - 140, 280, 300, 0xffffff, 0);
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
