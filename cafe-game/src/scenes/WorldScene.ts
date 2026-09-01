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

/** 안내 글씨들이 다른 건물 그림에 가려지지 않도록, 건물보다 훨씬 위에 그립니다 */
const UI_DEPTH = 100000;

/**
 * 게임을 열면 가장 먼저 보이는 화면. 넓은 초원(아이소메트릭 격자)에 가게
 * 건물들이 서 있고, 건물을 누르면 안(CafeScene)으로 들어가거나(지어져
 * 있으면) 짓습니다(총괄 매니저를 고용했고 비용이 있으면).
 */
export class WorldScene extends Phaser.Scene {
  /** 지금 안 들어가 있는 가게마다, 쌓인 매출을 보여주는 글씨 (실시간으로 갱신) */
  private pendingLabels: { id: RestaurantId; label: Phaser.GameObjects.Text; shown: number }[] = [];

  constructor() {
    super("world");
  }

  create() {
    this.pendingLabels = [];
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

    this.buildCurrentRestaurantCard();

    let entering = false;
    for (const tile of RESTAURANT_TILES) {
      this.buildRestaurantSpot(tile, groundScreenX, groundScreenY, () => entering, (v) => {
        entering = v;
      });
    }

    // 다른 가게들의 쌓인 매출이 이 화면에 서 있는 동안에도 실시간으로
    // 올라가는 것처럼 보이도록 주기적으로 다시 계산해서 갱신합니다.
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshPendingLabels() });
  }

  /** 지금 어느 가게가 "활성" 상태인지 (마지막으로 들어가 있던 가게) 오른쪽 위에 작은 카드로 보여줍니다 */
  private buildCurrentRestaurantCard() {
    const cfg = restaurantConfig(gameState.data.activeRestaurant);
    const cardX = VIRTUAL_WIDTH - 24;
    const cardY = 36;
    const cardW = 180;
    const cardH = 60;

    const g = this.add.graphics().setDepth(UI_DEPTH);
    g.fillStyle(0x3b2a20, 0.85);
    g.fillRoundedRect(cardX - cardW, cardY, cardW, cardH, 14);
    g.lineStyle(3, 0xffe066, 1);
    g.strokeRoundedRect(cardX - cardW, cardY, cardW, cardH, 14);

    this.add
      .text(cardX - cardW / 2, cardY + 16, "현재 매장", {
        fontSize: "13px",
        color: "#e8c896",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    this.add
      .text(cardX - cardW / 2, cardY + 38, cfg.name, {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#fffaf2",
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
  }

  private refreshPendingLabels() {
    for (const entry of this.pendingLabels) {
      const pending = gameState.previewOfflineEarnings(entry.id);
      if (pending <= 0) {
        entry.label.setVisible(false);
        entry.shown = 0;
        continue;
      }
      entry.label.setVisible(true);
      const from = entry.shown;
      // 숫자가 한 번에 툭 바뀌는 대신, 다음 갱신 때까지 부드럽게 세어
      // 올라가는 것처럼 보여줍니다 (진짜 실시간으로 오르는 느낌).
      this.tweens.addCounter({
        from,
        to: pending,
        duration: 950,
        onUpdate: (tween) => {
          entry.label.setText(`쌓인 매출 ${coinText(tween.getValue() ?? 0)}`);
        },
      });
      entry.shown = pending;
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
    // 예전엔 타일의 "맨 앞 꼭짓점"(옆 타일들과 만나는 흙길 교차점)에 건물을
    // 앉혔더니, 건물이 잔디가 아니라 길 위에 걸쳐 있는 것처럼 보였습니다.
    // 타일 중심에서 살짝만 앞으로 당겨서, 건물이 잔디 칸 안에 완전히
    // 들어오게 합니다.
    const buildingY = groundScreenY + tileScreen.y + ISO_TILE_H * 0.12;

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
      .setDepth(UI_DEPTH);

    if (constructed) {
      // 지금 안 들어가 있는 동안 이 가게가 벌고 있을 것으로 보이는 돈을
      // 건물 바로 앞(발밑) 자리에 크게 보여줍니다 — 다른 가게에 있는
      // 동안 여기는 그냥 멈춰 있는 것처럼 보이지 않도록. 다른 건물
      // 그림에 가려지지 않게 맨 위에 그리고, 이 화면에 서 있는 동안은
      // refreshPendingLabels()가 주기적으로 다시 계산해서 숫자가
      // 부드럽게 실시간으로 오르는 것처럼 보여줍니다.
      const pending = gameState.previewOfflineEarnings(tile.id);
      const pendingLabel = this.add
        .text(buildingX, buildingY + 40, pending > 0 ? `쌓인 매출 ${coinText(pending)}` : "", {
          fontSize: "22px",
          fontStyle: "bold",
          color: "#ffe066",
          stroke: "#4a3226",
          strokeThickness: 6,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH)
        .setVisible(pending > 0);
      this.pendingLabels.push({ id: tile.id, label: pendingLabel, shown: pending });

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
          // 자리를 비운 동안(다른 가게에 있었던 동안 포함) 번 돈이 있으면
          // 들어가자마자 알려줍니다.
          if (gameState.offlineEarnings > 0) bus.emit(EVENTS.OFFLINE_REWARD);
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
      .setDepth(UI_DEPTH);

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
