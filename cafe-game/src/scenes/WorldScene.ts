import Phaser from "phaser";
import { bus, EVENTS } from "../game/bus";
import { buildArt, isoGroundOrigin, isoToScreen, ISO_TILE_H } from "../game/art";
import { VIRTUAL_WIDTH } from "./CafeScene";
import { gameState } from "../game/state";
import { restaurantConfig, type RestaurantId } from "../game/config";

/** 가게마다 격자 자리와 건물 그림. 나중에 건물을 더 추가할 땐 이 배열에
 * 하나만 더하면 됩니다. */
const RESTAURANT_TILES: { id: RestaurantId; gx: number; gy: number; textureKey: string }[] = [
  { id: "cafe", gx: 0, gy: 0, textureKey: "world-cafe-iso" },
  { id: "pocha", gx: -2, gy: -2, textureKey: "world-pocha-iso" },
  { id: "bunsik", gx: 2, gy: 2, textureKey: "world-bunsik-iso" },
];

function coinText(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}코인`;
}

/**
 * 게임을 열면 가장 먼저 보이는 화면. 넓은 초원(아이소메트릭 격자)에 가게
 * 건물들이 서 있고, 건물을 누르면 안(CafeScene)으로 들어가거나(지어져
 * 있으면) 짓습니다(총괄 매니저를 고용했고 비용이 있으면).
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

    let entering = false;
    for (const tile of RESTAURANT_TILES) {
      this.buildRestaurantSpot(tile, groundScreenX, groundScreenY, () => entering, (v) => {
        entering = v;
      });
    }
  }

  private buildRestaurantSpot(
    tile: { id: RestaurantId; gx: number; gy: number; textureKey: string },
    groundScreenX: number,
    groundScreenY: number,
    isEntering: () => boolean,
    setEntering: (v: boolean) => void,
  ) {
    const cfg = restaurantConfig(tile.id);
    const tileScreen = isoToScreen(tile.gx, tile.gy);
    const buildingX = groundScreenX + tileScreen.x;
    const buildingY = groundScreenY + tileScreen.y + ISO_TILE_H / 2;

    const constructed = gameState.isConstructed(tile.id);
    const requiredGmId = gameState.requiredGmFor(tile.id);
    const gmHired = requiredGmId === null || gameState.hasGeneralManager(requiredGmId);

    const building = this.add
      .image(buildingX, buildingY, tile.textureKey)
      .setOrigin(0.5, 0.9)
      .setDepth(buildingY);

    const signText = this.add
      .text(buildingX, buildingY - 130, cfg.name, {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#4a3226",
      })
      .setOrigin(0.5)
      .setDepth(buildingY + 1);

    if (constructed) {
      const hint = this.add
        .text(buildingX, buildingY + 40, `${cfg.name}를 눌러 들어가세요`, {
          fontSize: "20px",
          fontStyle: "bold",
          color: "#fffaf2",
          stroke: "#4a3226",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(buildingY + 1);
      this.tweens.add({ targets: hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

      const hit = this.add
        .rectangle(buildingX, buildingY - 140, 280, 300, 0xffffff, 0)
        .setDepth(buildingY + 1);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        if (isEntering()) return;
        setEntering(true);
        this.tweens.add({ targets: [building, signText], scale: 1.03, duration: 120, yoyo: true });
        this.cameras.main.fadeOut(400, 26, 18, 11);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          gameState.switchRestaurant(tile.id);
          bus.emit(EVENTS.ENTERED_CAFE);
          this.scene.start("cafe");
        });
      });
      return;
    }

    // 아직 안 지은 가게 — 실루엣으로 흐릿하게 보여주고, 자격(총괄 매니저)과
    // 비용에 따라 안내 문구를 다르게 보여줍니다.
    building.setTint(0x8a8a8a).setAlpha(0.55);
    signText.setAlpha(0.7);

    const infoText = !gmHired
      ? `${requiredGmId ? restaurantConfig(requiredGmId).name : ""}에 총괄 매니저를 고용하면 지을 수 있어요`
      : `${coinText(cfg.buildCost)}\n눌러서 짓기`;
    this.add
      .text(buildingX, buildingY + 40, infoText, {
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fffaf2",
        stroke: "#4a3226",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(buildingY + 1);

    if (!gmHired) return; // 총괄 매니저가 없으면 아직 누를 수 없습니다.

    const hit = this.add
      .rectangle(buildingX, buildingY - 140, 280, 300, 0xffffff, 0)
      .setDepth(buildingY + 1);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      if (!gameState.canBuildRestaurant(tile.id)) {
        this.cameras.main.shake(120, 0.004);
        return;
      }
      if (!gameState.buildRestaurant(tile.id)) return;
      gameState.save();
      bus.emit(EVENTS.COINS_CHANGED);
      // 다 지어졌으니 화면을 새로 그려서, 지금 막 지은 가게가 바로 들어갈
      // 수 있는 상태로 보이게 합니다.
      this.scene.restart();
    });
  }
}
