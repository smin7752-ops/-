import Phaser from "phaser";
import { bus, EVENTS } from "../game/bus";
import { buildArt, isoGroundOrigin, isoToScreen, ISO_GRID_RADIUS, ISO_TILE_H, ISO_TILE_W } from "../game/art";
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from "./CafeScene";
import { gameState } from "../game/state";
import { restaurantConfig, RESTAURANT_ORDER, type RestaurantId } from "../game/config";

/** 매장 종류마다 쓸 건물 그림. 나중에 매장 종류를 더 추가할 땐 이 표에
 * 하나만 더하면 됩니다. */
const BUILDING_TEXTURE: Record<RestaurantId, string> = {
  cafe: "world-cafe-iso",
  bunsik: "world-bunsik-iso",
  pocha: "world-pocha-iso",
};

function coinText(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}코인`;
}

/** 안내 글씨들이 다른 건물 그림에 가려지지 않도록, 건물보다 훨씬 위에 그립니다 */
const UI_DEPTH = 100000;

/** 화면에 고정해서 보여줄 글씨(제목·카드·안내 배너)에 공통으로 씁니다 —
 * 카메라를 밀거나 확대해도 이 글씨들은 늘 같은 자리에 그대로 있습니다. */
function pinToScreen<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  (obj as unknown as { setScrollFactor: (v: number) => void }).setScrollFactor(0);
  return obj;
}

/**
 * 게임을 열면 가장 먼저 보이는 화면. 넓은 초원(아이소메트릭 격자)에 가게
 * 건물들이 서 있고, 건물을 누르면 안(CafeScene)으로 들어가거나(지어져
 * 있으면) 짓습니다(총괄 매니저를 고용했고 비용이 있으면). 아직 안 지은
 * 매장은 빈 칸 아무 데나 원하는 자리를 골라서 지을 수 있고, 들판이 화면보다
 * 넓어서 손가락으로 밀어서(팬) 둘러보거나 두 손가락으로 확대·축소할 수
 * 있습니다.
 */
export class WorldScene extends Phaser.Scene {
  /** 지금 안 들어가 있는 가게마다, 쌓인 매출을 보여주는 글씨 (실시간으로 갱신) */
  private pendingLabels: { id: RestaurantId; label: Phaser.GameObjects.Text; shown: number }[] = [];

  /** 지금 진행 중인 손가락 제스처가 "밀기(팬)"였는지 — 밀던 손가락을 뗀
   * 자리가 하필 건물이나 빈 칸 위였다고 해서 그걸 누른 걸로 착각하지
   * 않도록 구분합니다. */
  private gestureDragDistance = 0;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor() {
    super("world");
  }

  create() {
    this.pendingLabels = [];
    this.gestureDragDistance = 0;
    this.pinchStartDistance = 0;
    buildArt(this);

    pinToScreen(this.add.image(0, 0, "world-bg").setOrigin(0, 0));

    // 들판 타일 그림 — 화면 가로 가운데, 세로 중간쯤에 격자 원점이 오도록 놓습니다.
    const groundOrigin = isoGroundOrigin();
    const groundScreenX = VIRTUAL_WIDTH / 2;
    const groundScreenY = 760;
    this.add
      .image(groundScreenX - groundOrigin.x, groundScreenY - groundOrigin.y, "world-ground")
      .setOrigin(0, 0);

    pinToScreen(
      this.add
        .text(VIRTUAL_WIDTH / 2, 90, "나의 작은 카페", {
          fontSize: "40px",
          fontStyle: "bold",
          color: "#4a3226",
          stroke: "#fffaf2",
          strokeThickness: 8,
        })
        .setOrigin(0.5),
    );

    this.buildCurrentRestaurantCard();

    let entering = false;
    const isEntering = () => entering;
    const setEntering = (v: boolean) => {
      entering = v;
    };

    const takenTiles = new Set<string>();
    for (const id of RESTAURANT_ORDER) {
      if (!gameState.isConstructed(id)) continue;
      const plot = gameState.restaurantData(id).plot;
      if (!plot) continue;
      takenTiles.add(`${plot.gx},${plot.gy}`);
      this.buildRestaurantSpot(id, plot.gx, plot.gy, groundScreenX, groundScreenY, isEntering, setEntering);
    }

    this.buildNextRestaurantUi(groundScreenX, groundScreenY, takenTiles);

    this.setupCameraControls(groundScreenX, groundScreenY, groundOrigin);

    // 다른 가게들의 쌓인 매출이 이 화면에 서 있는 동안에도 실시간으로
    // 올라가는 것처럼 보이도록 주기적으로 다시 계산해서 갱신합니다.
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshPendingLabels() });
  }

  /** 카메라를 손가락으로 밀어서 보거나(팬), 두 손가락으로 오므리고 벌려서
   * 확대·축소할 수 있게 합니다. 들판이 화면 하나보다 넓어졌기 때문입니다. */
  private setupCameraControls(
    groundScreenX: number,
    groundScreenY: number,
    groundOrigin: { x: number; y: number },
  ) {
    const cam = this.cameras.main;
    cam.setZoom(1);
    const margin = 260;
    cam.setBounds(
      groundScreenX - groundOrigin.x - margin,
      Math.min(0, groundScreenY - groundOrigin.y - margin),
      groundOrigin.x * 2 + margin * 2,
      Math.max(VIRTUAL_HEIGHT, groundOrigin.y * 2 + margin * 2),
    );

    const MIN_ZOOM = 0.55;
    const MAX_ZOOM = 1.4;
    const DRAG_THRESHOLD = 10;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.gestureDragDistance = 0;
      this.lastPointerX = p.x;
      this.lastPointerY = p.y;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      // p2(두 번째 손가락)는 손가락 하나로만 터치할 땐 아예 안 잡혀서
      // undefined일 수 있습니다. 그대로 .isDown을 읽으면 화면을 그냥
      // 터치하기만 해도 앱이 튕겼습니다.
      const bothDown = !!p1 && !!p2 && p1.isDown && p2.isDown;

      if (bothDown) {
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (this.pinchStartDistance === 0) {
          this.pinchStartDistance = dist;
          this.pinchStartZoom = cam.zoom;
        } else {
          const scale = dist / this.pinchStartDistance;
          cam.setZoom(Phaser.Math.Clamp(this.pinchStartZoom * scale, MIN_ZOOM, MAX_ZOOM));
        }
        this.gestureDragDistance = DRAG_THRESHOLD + 1; // 두 손가락 제스처는 절대 "탭"으로 안 칩니다.
        return;
      }
      this.pinchStartDistance = 0;

      const dx = p.x - this.lastPointerX;
      const dy = p.y - this.lastPointerY;
      this.gestureDragDistance += Math.abs(dx) + Math.abs(dy);
      cam.scrollX -= dx / cam.zoom;
      cam.scrollY -= dy / cam.zoom;
      this.lastPointerX = p.x;
      this.lastPointerY = p.y;
    });

    this.input.on("pointerup", () => {
      this.pinchStartDistance = 0;
    });
  }

  /** 지금 이 손가락 동작이 (밀거나 확대하지 않은) 짧은 "탭"이었는지 */
  private wasTap(): boolean {
    return this.gestureDragDistance < 10;
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
    pinToScreen(g);

    pinToScreen(
      this.add
        .text(cardX - cardW / 2, cardY + 16, "현재 매장", {
          fontSize: "13px",
          color: "#e8c896",
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH),
    );
    pinToScreen(
      this.add
        .text(cardX - cardW / 2, cardY + 38, cfg.name, {
          fontSize: "22px",
          fontStyle: "bold",
          color: "#fffaf2",
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH),
    );
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

  private tileScreenPos(gx: number, gy: number, groundScreenX: number, groundScreenY: number) {
    const t = isoToScreen(gx, gy);
    const x = groundScreenX + t.x;
    // 타일 한가운데보다 살짝 앞으로 당겨서, 건물(또는 빈 칸 표시)이 잔디
    // 칸 정중앙에 놓인 것처럼 보이게 합니다.
    const y = groundScreenY + t.y + ISO_TILE_H * 0.3;
    return { x, y };
  }

  private buildRestaurantSpot(
    id: RestaurantId,
    gx: number,
    gy: number,
    groundScreenX: number,
    groundScreenY: number,
    isEntering: () => boolean,
    setEntering: (v: boolean) => void,
  ) {
    const cfg = restaurantConfig(id);
    const { x: buildingX, y: buildingY } = this.tileScreenPos(gx, gy, groundScreenX, groundScreenY);

    const building = this.add
      .image(buildingX, buildingY, BUILDING_TEXTURE[id])
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

    // 지금 안 들어가 있는 동안 이 가게가 벌고 있을 것으로 보이는 돈을
    // 건물 바로 앞(발밑) 자리에 크게 보여줍니다 — 다른 가게에 있는
    // 동안 여기는 그냥 멈춰 있는 것처럼 보이지 않도록. 다른 건물
    // 그림에 가려지지 않게 맨 위에 그리고, 이 화면에 서 있는 동안은
    // refreshPendingLabels()가 주기적으로 다시 계산해서 숫자가
    // 부드럽게 실시간으로 오르는 것처럼 보여줍니다.
    const pending = gameState.previewOfflineEarnings(id);
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
    this.pendingLabels.push({ id, label: pendingLabel, shown: pending });

    const hit = this.add
      .rectangle(buildingX, buildingY - 140, 280, 300, 0xffffff, 0)
      .setDepth(buildingY + 1);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerup", () => {
      if (!this.wasTap()) return;
      if (isEntering()) return;
      setEntering(true);
      this.tweens.add({ targets: [building, signText], scale: 1.03, duration: 120, yoyo: true });
      this.cameras.main.fadeOut(400, 26, 18, 11);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        gameState.switchRestaurant(id);
        bus.emit(EVENTS.ENTERED_CAFE);
        // 자리를 비운 동안(다른 가게에 있었던 동안 포함) 번 돈이 있으면
        // 들어가자마자 알려줍니다.
        if (gameState.offlineEarnings > 0) bus.emit(EVENTS.OFFLINE_REWARD);
        this.scene.start("cafe");
      });
    });
  }

  /** 아직 다 못 지은 매장이 있으면, 화면 위쪽에 안내 배너를 띄우고
   * (총괄 매니저 조건을 채웠으면) 빈 칸마다 "+" 표시를 놓아서 원하는
   * 자리에 지을 수 있게 합니다. */
  private buildNextRestaurantUi(
    groundScreenX: number,
    groundScreenY: number,
    takenTiles: Set<string>,
  ) {
    const nextId = RESTAURANT_ORDER.find((id) => !gameState.isConstructed(id));
    if (!nextId) return; // 셋 다 지었으면 안내할 것이 없습니다.

    const cfg = restaurantConfig(nextId);
    const requiredGmId = gameState.requiredGmFor(nextId);
    const gmHired = requiredGmId === null || gameState.hasGeneralManager(requiredGmId);

    const bannerText = !gmHired
      ? `${requiredGmId ? restaurantConfig(requiredGmId).name : ""}에 총괄 매니저를 고용하면 ${cfg.name}을 지을 수 있어요`
      : `${cfg.name} 짓기 — ${coinText(cfg.buildCost)} · 빈 칸을 눌러서 지을 자리를 골라주세요`;

    const g = this.add.graphics().setDepth(UI_DEPTH);
    g.fillStyle(0x3b2a20, 0.85);
    g.fillRoundedRect(20, 130, VIRTUAL_WIDTH - 40, 50, 14);
    pinToScreen(g);
    pinToScreen(
      this.add
        .text(VIRTUAL_WIDTH / 2, 155, bannerText, {
          fontSize: "15px",
          fontStyle: "bold",
          color: "#fffaf2",
          align: "center",
          wordWrap: { width: VIRTUAL_WIDTH - 70 },
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH),
    );

    if (!gmHired) return;

    for (let gy = -ISO_GRID_RADIUS; gy <= ISO_GRID_RADIUS; gy++) {
      for (let gx = -ISO_GRID_RADIUS; gx <= ISO_GRID_RADIUS; gx++) {
        if (takenTiles.has(`${gx},${gy}`)) continue;
        this.buildEmptyTileMarker(nextId, gx, gy, groundScreenX, groundScreenY);
      }
    }
  }

  /** 빈 칸에 놓는 작은 "+" 표시 — 누르면 그 자리에 다음 매장을 짓습니다. */
  private buildEmptyTileMarker(
    id: RestaurantId,
    gx: number,
    gy: number,
    groundScreenX: number,
    groundScreenY: number,
  ) {
    // 건물이 실제로 놓일 자리(tileScreenPos)와 정확히 같은 자리에 "+"를
    // 놓아야, 짓고 난 뒤 건물이 다른 자리로 "점프"하지 않고 표시가 있던
    // 그 자리에 그대로 서 있는 것처럼 보입니다.
    const { x, y } = this.tileScreenPos(gx, gy, groundScreenX, groundScreenY);

    const g = this.add.graphics().setDepth(y);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(x, y, 22);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(x, y, 22);
    g.lineStyle(4, 0xffffff, 0.95);
    g.lineBetween(x - 10, y, x + 10, y);
    g.lineBetween(x, y - 10, x, y + 10);

    const hit = this.add
      .rectangle(x, y, ISO_TILE_W * 0.75, ISO_TILE_H * 0.75, 0xffffff, 0)
      .setDepth(y + 1);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerup", () => {
      if (!this.wasTap()) return;
      if (!gameState.canBuildRestaurant(id)) {
        this.cameras.main.shake(120, 0.004);
        return;
      }
      if (!gameState.buildRestaurant(id, gx, gy)) return;
      gameState.save();
      bus.emit(EVENTS.COINS_CHANGED);
      // 다 지어졌으니 화면을 새로 그려서, 지금 막 지은 가게가 바로 들어갈
      // 수 있는 상태로 보이게 합니다.
      this.scene.restart();
    });
  }
}
