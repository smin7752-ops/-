import Phaser from "phaser";
import {
  MAX_ROLE_COUNT,
  SEATS_PER_TABLE,
  TABLES_PER_FLOOR,
  menuById,
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
  chairKey,
  doorKey,
  equipKey,
  hairKey,
  headKey,
  itemKey,
  personKey,
  publishIconUrls,
  registerKey,
  tableKey,
  uiKey,
} from "../game/art";

export const VIRTUAL_WIDTH = 720;
export const VIRTUAL_HEIGHT = 1280;

/* 화면 위아래는 HTML 버튼(코인/시계, 층 탭, 아래 메뉴바)이 덮고 있습니다.
   게임 그림은 대략 y = 200 ~ 1100 사이에 그려야 가려지지 않습니다. */

/* 가게 구조: 위쪽이 카운터(안쪽), 아래쪽이 손님이 들어오는 문(입구)입니다.
   전체적으로 조금 더 아래로 내려서, 위쪽 HTML 바와 카운터 사이에 여유를 둡니다. */
const LAYOUT_SHIFT_Y = 30;

const COUNTER_Y = 262 + LAYOUT_SHIFT_Y;
const COUNTER_H = 66;
/** 카운터 뒤 직원이 서 있는 바닥선 (그림의 발끝이 닿는 높이) */
const STAFF_BASE_Y = COUNTER_Y + 30;
/** 설비를 늘어놓을 카운터 위 구간 */
const EQUIP_ZONE = { left: 300, right: VIRTUAL_WIDTH - 30 };
/** 캐셔 자리 — 주방 카운터에서 앞으로 나오되, 카운터 가까이 안쪽으로 붙여 둡니다.
    테이블 자리(특히 오른쪽 줄 말풍선)와는 겹치지 않을 만큼만 내립니다. */
const CASHIER_POS = { x: VIRTUAL_WIDTH - 60, y: COUNTER_Y + COUNTER_H + 30 };
/** 캐셔 포스기는 총괄 매니저 앞(더 앞쪽)에 놓입니다 — 받침대 위에 자연스럽게 놓이도록,
    받침대 윗면 높이(CASHIER_POS.y - 8)에 살짝 걸치게 둡니다 */
const REGISTER_POS = { x: CASHIER_POS.x, y: CASHIER_POS.y - 2 };
/** 캐셔가 서 있는 작은 받침대 크기 */
const CASHIER_STAND_W = 118;
const CASHIER_STAND_H = 20;

const DOOR = { x: VIRTUAL_WIDTH / 2, y: 1000 + LAYOUT_SHIFT_Y };
const ENTRANCE = { x: DOOR.x, y: DOOR.y - 30 };
/** 매니저는 문 옆에 서서 손님을 맞습니다 */
const MANAGER_POS = { x: DOOR.x - 108, y: DOOR.y + 30 };

const COLS = 2;
const TOP_MARGIN = 480 + LAYOUT_SHIFT_Y;
const ROW_GAP = 190;
/** 테이블 가운데에서 좌·우 자리까지의 거리 */
const SEAT_DX = 74;

/* 자리 기준으로 의자와 테이블 상판이 놓이는 높이.
   의자는 손님 뒤, 상판은 손님 앞에 와야 "테이블에 앉은" 것처럼 보입니다. */
const CHAIR_DY = 10;
const TABLE_TOP_DY = 20;

/* 먹고 간 흔적(더러운 컵)은 의자가 아니라 상판 위, 테이블 중앙 쪽에 놓습니다. */
const DIRTY_ITEM_DX = 34;
const DIRTY_ITEM_DY = TABLE_TOP_DY - 22;

/* 직원이 치울 때 서는 자리 — 의자(SEAT_DX=74)보다 훨씬 안쪽, 흔적 바로
   옆이라 "다가가서 치우는" 것처럼 보입니다.
   Y는 테이블 상판 그림의 세로 중심(TABLE_TOP_DY)과 맞춰서, 깊이상 상판
   뒤에 놓이는 직원의 다리~허리가 상판에 실제로 가려지게 합니다
   (그냥 자리 위치(y=0)에 세우면 상판 그림과 거의 안 겹쳐서 안 가려 보여요). */
const CLEAN_STAND_DX = 40;
const CLEAN_STAND_DY = TABLE_TOP_DY;

/* 청소 게이지는 손님 인내심 막대와 같은 모양(가로 막대)으로, 직원 머리
   위에 띄워서 자연스럽게 보이게 합니다. */
const CLEAN_GAUGE_UP = 92;
const CLEAN_GAUGE_W = 40;
const CLEAN_GAUGE_H = 7;

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
  /** 자리 번호 → 청소 진행도를 보여주는 세로 게이지 바 */
  private cleanGauges = new Map<
    number,
    { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle }
  >();
  private floorLabel!: Phaser.GameObjects.Text;
  private baristas: Phaser.GameObjects.Image[] = [];
  private servers: Phaser.GameObjects.Image[] = [];
  private manager!: Phaser.GameObjects.Image;
  private generalManager!: Phaser.GameObjects.Image;
  private registerImage!: Phaser.GameObjects.Image;
  private equipmentImages: Phaser.GameObjects.Image[] = [];
  /** 설비 id → 대기 중인 주문 수를 보여주는 뱃지 */
  private equipmentBadges = new Map<
    string,
    { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text }
  >();

  constructor() {
    super("cafe");
  }

  create() {
    // 다른 가게에서 방금 들어왔을 수도 있으니, 항상 1층부터 보여줍니다
    // (위층은 그 가게에서 아직 안 열려 있을 수 있어요).
    this.activeFloor = 0;
    // 나가기 버튼을 눌러 어두워진 채로 나갔을 수 있으니, 화면을 다시 밝게 되돌립니다.
    this.cameras.main.resetFX();
    // 다른 가게로 들어온 것일 수 있으니, 시뮬레이션도 지금 가게 기준으로 다시 맞춥니다
    // (안 그러면 이전 가게의 테이블 수만큼 손님이 계속 앉을 자리가 남아 있어서,
    // 테이블이 없는 자리에도 손님이 나타나 보입니다).
    sim.rebuild();
    // 이전 가게(또는 이전에 들어왔을 때)의 손님 그림들은 장면이 다시 시작되며
    // 이미 사라진 것들이라, 여기 남아있는 목록도 함께 비웁니다. 안 비우면 이미
    // 사라진 그림을 다시 쓰려다가 오류가 납니다.
    this.customerViews.forEach((v) => v.root.destroy());
    this.customerViews.clear();

    buildArt(this);
    // 같은 그림을 HTML 창(상점·매출표)에서도 쓰도록 넘겨줍니다.
    publishIconUrls(this);
    bus.emit(EVENTS.ART_READY);

    this.cameras.main.setBackgroundColor("#e4d0ad");
    this.drawRoom();
    this.drawCounter();
    this.drawStaff();
    this.drawCashierStand();
    this.rebuildTables();

    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => gameState.save(),
    });

    bus.on(EVENTS.LAYOUT_CHANGED, this.onLayoutChanged, this);
    bus.on(EVENTS.UNIFORM_CHANGED, this.applyUniforms, this);
    bus.on(EVENTS.DECOR_CHANGED, this.applyDecor, this);
    bus.on(EVENTS.FLOOR_SWITCHED, this.onFloorSwitched, this);
    bus.on(EVENTS.SERVED, this.onServed, this);
    bus.on(EVENTS.CUSTOMER_ANGRY, this.onAngry, this);
    bus.on(EVENTS.MADE_BY_HAND, this.onMadeByHand, this);
    bus.on(EVENTS.TABLE_CLEANED, this.onTableCleaned, this);
    bus.on(EVENTS.FAME_GAINED, this.onFameGained, this);
    bus.on(EVENTS.EXIT_TO_WORLD, this.exitToWorld, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EVENTS.LAYOUT_CHANGED, this.onLayoutChanged, this);
      bus.off(EVENTS.UNIFORM_CHANGED, this.applyUniforms, this);
      bus.off(EVENTS.DECOR_CHANGED, this.applyDecor, this);
      bus.off(EVENTS.FLOOR_SWITCHED, this.onFloorSwitched, this);
      bus.off(EVENTS.SERVED, this.onServed, this);
      bus.off(EVENTS.CUSTOMER_ANGRY, this.onAngry, this);
      bus.off(EVENTS.MADE_BY_HAND, this.onMadeByHand, this);
      bus.off(EVENTS.TABLE_CLEANED, this.onTableCleaned, this);
      bus.off(EVENTS.FAME_GAINED, this.onFameGained, this);
      bus.off(EVENTS.EXIT_TO_WORLD, this.exitToWorld, this);
    });
  }

  /** 상단 바의 나가기 버튼 — 화면을 어둡게 한 뒤 초원 화면으로 돌아갑니다 */
  private exitToWorld() {
    gameState.save();
    this.cameras.main.fadeOut(400, 26, 18, 11);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      bus.emit(EVENTS.EXIT_TO_WORLD_DONE);
      this.scene.start("world");
    });
  }

  update() {
    sim.tick();
    this.syncTables();
    this.syncCustomers();
    this.syncStaff();
    this.syncEquipment();
  }

  /* ---------------------------- 가게 배경 ---------------------------- */

  /** 인테리어(바닥·벽지·문)를 바꾸면 통째로 지우고 다시 그립니다 */
  private roomGraphics?: Phaser.GameObjects.Graphics;
  private doorImage?: Phaser.GameObjects.Image;

  private drawRoom() {
    this.roomGraphics?.destroy();
    this.doorImage?.destroy();

    const g = this.add.graphics().setDepth(-10);
    this.roomGraphics = g;
    const floorTop = COUNTER_Y + COUNTER_H - 6;
    const wallColor = gameState.decorColors("wallpaper").primary;
    const floorColors = gameState.decorColors("floor");
    const rid = gameState.data.activeRestaurant;

    if (rid === "bunsik") {
      this.drawBunsikWall(g, floorTop, wallColor);
      this.drawBunsikFloor(g, floorTop, floorColors);
    } else if (rid === "pocha") {
      this.drawPochaWall(g, floorTop, wallColor);
      this.drawPochaFloor(g, floorTop, floorColors);
    } else {
      this.drawCafeWall(g, floorTop, wallColor);
      this.drawCafeFloor(g, floorTop, floorColors);
    }

    // 문 앞 바닥 매트 — 입구를 눈에 띄게 해줍니다
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(DOOR.x - 92, DOOR.y + 60, 184, 34, 12);
    g.fillStyle(floorColors.accent, 1);
    g.fillRoundedRect(DOOR.x - 90, DOOR.y + 58, 180, 32, 12);

    // 손님이 드나드는 자리 (가게 앞쪽). 1층은 문, 2층부터는 계단입니다.
    const entranceKey =
      this.activeFloor === 0 ? doorKey(gameState.equippedDecor("door")) : "stairs";
    this.doorImage = this.add
      .image(DOOR.x, DOOR.y, entranceKey)
      .setScale(ART_SCALE * 1.4)
      .setDepth(-5);
  }

  /** 카페 — 크림색 벽지 + 은은한 음영, 살구색 체크 바닥 (기존 분위기 그대로) */
  private drawCafeWall(g: Phaser.GameObjects.Graphics, floorTop: number, wallColor: number) {
    g.fillStyle(wallColor, 1);
    g.fillRect(0, 0, VIRTUAL_WIDTH, floorTop);
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(0, 0, VIRTUAL_WIDTH, floorTop * 0.4);
    g.fillStyle(0x000000, 0.05);
    g.fillRect(0, floorTop * 0.75, VIRTUAL_WIDTH, floorTop * 0.25);
    g.fillStyle(0x000000, 0.14);
    g.fillRect(0, floorTop - 6, VIRTUAL_WIDTH, 6);
  }

  private drawCafeFloor(
    g: Phaser.GameObjects.Graphics,
    floorTop: number,
    floorColors: { primary: number; secondary: number; accent: number },
  ) {
    g.fillStyle(floorColors.primary, 1);
    g.fillRect(0, floorTop, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    g.fillStyle(floorColors.secondary, 1);
    for (let y = floorTop; y < VIRTUAL_HEIGHT; y += 96) {
      for (let x = 0; x < VIRTUAL_WIDTH; x += 96) {
        const shift = Math.floor((y - floorTop) / 96) % 2 === 0 ? 0 : 48;
        g.fillRect(x + shift, y, 48, 48);
      }
    }
    g.fillStyle(0x000000, 0.05);
    g.fillRect(0, floorTop, VIRTUAL_WIDTH, 40);
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(0, floorTop + 40, VIRTUAL_WIDTH, 60);
  }

  /** 분식집 — 하얀 타일 벽 + 빨간 간판 띠, 굵은 빨강·하양 체크 바닥 */
  private drawBunsikWall(g: Phaser.GameObjects.Graphics, floorTop: number, wallColor: number) {
    g.fillStyle(wallColor, 1);
    g.fillRect(0, 0, VIRTUAL_WIDTH, floorTop);
    // 타일 벽 — 반듯한 격자 줄눈
    g.lineStyle(2, 0x000000, 0.09);
    const T = 44;
    for (let y = 0; y < floorTop; y += T) g.lineBetween(0, y, VIRTUAL_WIDTH, y);
    for (let x = 0; x < VIRTUAL_WIDTH; x += T) g.lineBetween(x, 0, x, floorTop);
    g.fillStyle(0xffffff, 0.05);
    g.fillRect(0, 0, VIRTUAL_WIDTH, floorTop * 0.4);
    // 위쪽 빨간 간판 띠
    g.fillStyle(0xd0432f, 1);
    g.fillRect(0, 0, VIRTUAL_WIDTH, 32);
    g.fillStyle(0xffffff, 0.14);
    g.fillRect(0, 0, VIRTUAL_WIDTH, 8);
    g.fillStyle(0x000000, 0.16);
    g.fillRect(0, 26, VIRTUAL_WIDTH, 6);
    g.fillStyle(0x000000, 0.14);
    g.fillRect(0, floorTop - 6, VIRTUAL_WIDTH, 6);
  }

  private drawBunsikFloor(
    g: Phaser.GameObjects.Graphics,
    floorTop: number,
    floorColors: { primary: number; secondary: number; accent: number },
  ) {
    g.fillStyle(floorColors.primary, 1);
    g.fillRect(0, floorTop, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    g.fillStyle(floorColors.secondary, 1);
    const T = 64;
    for (let y = floorTop, row = 0; y < VIRTUAL_HEIGHT; y += T, row++) {
      for (let x = row % 2 === 0 ? 0 : T; x < VIRTUAL_WIDTH; x += T * 2) {
        g.fillRect(x, y, T, T);
      }
    }
    g.lineStyle(2, 0x000000, 0.1);
    for (let y = floorTop; y < VIRTUAL_HEIGHT; y += T) g.lineBetween(0, y, VIRTUAL_WIDTH, y);
    for (let x = 0; x < VIRTUAL_WIDTH; x += T) g.lineBetween(x, floorTop, x, VIRTUAL_HEIGHT);
  }

  /** 포차 — 어두운 천 벽 + 알전구 줄 + 홍등, 가로 나무 널빤지 바닥 */
  private drawPochaWall(g: Phaser.GameObjects.Graphics, floorTop: number, wallColor: number) {
    for (let x = 0; x < VIRTUAL_WIDTH; x += 46) {
      g.fillStyle(wallColor, 1);
      g.fillRect(x, 0, 46, floorTop);
      if (Math.floor(x / 46) % 2 === 0) {
        g.fillStyle(0x000000, 0.07);
        g.fillRect(x, 0, 46, floorTop);
      }
    }
    g.fillStyle(0x000000, 0.24);
    g.fillRect(0, 0, VIRTUAL_WIDTH, floorTop * 0.32);
    g.fillStyle(0x000000, 0.16);
    g.fillRect(0, floorTop - 6, VIRTUAL_WIDTH, 6);

    // 알전구 줄
    const sagLine = (y0: number, sag: number) => {
      g.lineStyle(3, 0x3a2617, 0.8);
      g.beginPath();
      g.moveTo(16, y0);
      for (let i = 1; i <= 20; i++) {
        const t = i / 20;
        g.lineTo(16 + (VIRTUAL_WIDTH - 32) * t, y0 + Math.sin(t * Math.PI) * sag);
      }
      g.strokePath();
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = 16 + (VIRTUAL_WIDTH - 32) * t;
        const y = y0 + Math.sin(t * Math.PI) * sag;
        g.fillStyle(0xffe08a, 0.4);
        g.fillCircle(x, y + 5, 9);
        g.fillStyle(0xffe08a, 0.95);
        g.fillCircle(x, y + 5, 4);
      }
    };
    sagLine(26, 34);

    // 홍등 두 개
    const lantern = (lx: number, ly: number) => {
      g.lineStyle(3, 0x3a2617, 1);
      g.lineBetween(lx, ly - 14, lx, ly);
      g.fillStyle(0xd0432f, 1);
      g.fillEllipse(lx, ly + 16, 26, 34);
      g.lineStyle(2, 0x8a3b34, 1);
      g.strokeEllipse(lx, ly + 16, 26, 34);
      g.fillStyle(0xf5c542, 1);
      g.fillRect(lx - 3, ly + 32, 6, 6);
    };
    lantern(60, 40);
    lantern(VIRTUAL_WIDTH - 60, 40);
  }

  private drawPochaFloor(
    g: Phaser.GameObjects.Graphics,
    floorTop: number,
    floorColors: { primary: number; secondary: number; accent: number },
  ) {
    g.fillStyle(floorColors.primary, 1);
    g.fillRect(0, floorTop, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    const plankH = 46;
    for (let y = floorTop, i = 0; y < VIRTUAL_HEIGHT; y += plankH, i++) {
      g.fillStyle(i % 2 === 0 ? floorColors.secondary : floorColors.accent, 0.55);
      g.fillRect(0, y, VIRTUAL_WIDTH, plankH - 4);
      g.fillStyle(0x000000, 0.12);
      g.fillRect(0, y + plankH - 4, VIRTUAL_WIDTH, 4);
    }
    g.lineStyle(1, 0x000000, 0.1);
    for (let y = floorTop, i = 0; y < VIRTUAL_HEIGHT; y += plankH, i++) {
      const shift = i % 2 === 0 ? 0 : 70;
      for (let x = 40 + shift; x < VIRTUAL_WIDTH; x += 140) {
        g.lineBetween(x, y + 4, x, y + plankH - 8);
      }
    }
  }

  /** 인테리어를 사거나 바꿔 입으면 바닥·벽지·문·주방 테이블·테이블·의자·포스기를 새로 그립니다 */
  private applyDecor() {
    this.drawRoom();
    this.drawCounterGraphic();
    this.drawCashierStand();
    this.registerImage.setTexture(registerKey(gameState.equippedDecor("register")));
    this.rebuildTables();
  }

  /** 카운터(주방 테이블) 그림 — 인테리어를 바꾸면 통째로 지우고 다시 그립니다 */
  private counterGraphics?: Phaser.GameObjects.Graphics;

  private drawCounterGraphic() {
    this.counterGraphics?.destroy();
    const g = this.add.graphics().setDepth(1);
    const colors = gameState.decorColors("counter");
    const rid = gameState.data.activeRestaurant;
    const x = 30;
    const w = VIRTUAL_WIDTH - 60;

    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(x, COUNTER_Y + COUNTER_H - 4, w, 14, 8);

    if (rid === "bunsik") {
      // 분식집 — 각진 스테인리스 카운터, 대각선 광택
      g.fillStyle(colors.primary, 1);
      g.fillRoundedRect(x, COUNTER_Y, w, COUNTER_H, 4);
      g.fillStyle(colors.secondary, 1);
      g.fillRoundedRect(x, COUNTER_Y, w, 28, 4);
      g.lineStyle(3, 0xffffff, 0.3);
      for (let i = 0; i < 6; i++) {
        g.lineBetween(x + 10 + i * 110, COUNTER_Y + 4, x + 55 + i * 110, COUNTER_Y + COUNTER_H - 4);
      }
      g.lineStyle(5, colors.accent, 1);
      g.strokeRoundedRect(x, COUNTER_Y, w, COUNTER_H, 4);
    } else if (rid === "pocha") {
      // 포차 — 나무 궤짝을 이어붙인 카운터
      g.fillStyle(colors.primary, 1);
      g.fillRoundedRect(x, COUNTER_Y, w, COUNTER_H, 4);
      g.fillStyle(colors.secondary, 1);
      g.fillRoundedRect(x, COUNTER_Y, w, 12, 4);
      g.lineStyle(3, 0x000000, 0.16);
      for (let px = x + 90; px < x + w; px += 90) g.lineBetween(px, COUNTER_Y, px, COUNTER_Y + COUNTER_H);
      g.lineStyle(5, colors.accent, 1);
      g.strokeRoundedRect(x, COUNTER_Y, w, COUNTER_H, 4);
    } else {
      // 카페 — 둥근 원목 카운터
      g.fillStyle(colors.primary, 1);
      g.fillRoundedRect(x, COUNTER_Y, w, COUNTER_H, 14);
      g.fillStyle(colors.secondary, 1);
      g.fillRoundedRect(x, COUNTER_Y, w, 34, 14);
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(x + 4, COUNTER_Y + 3, w - 8, 8, 6);
      g.lineStyle(5, colors.accent, 1);
      g.strokeRoundedRect(x, COUNTER_Y, w, COUNTER_H, 14);
    }
    this.counterGraphics = g;
  }

  /** 캐셔가 서는 작은 받침대 — 카운터와 같은 색으로, 인테리어를 바꾸면 같이 다시 그립니다 */
  private cashierStandGraphics?: Phaser.GameObjects.Graphics;

  private drawCashierStand() {
    this.cashierStandGraphics?.destroy();
    const g = this.add.graphics().setDepth(4);
    const colors = gameState.decorColors("counter");
    const x = CASHIER_POS.x - CASHIER_STAND_W / 2;
    const y = CASHIER_POS.y - 8;
    g.fillStyle(colors.primary, 1);
    g.fillRoundedRect(x, y, CASHIER_STAND_W, CASHIER_STAND_H, 8);
    g.fillStyle(colors.secondary, 1);
    g.fillRoundedRect(x, y, CASHIER_STAND_W, 8, 8);
    g.lineStyle(4, colors.accent, 1);
    g.strokeRoundedRect(x, y, CASHIER_STAND_W, CASHIER_STAND_H, 8);
    this.cashierStandGraphics = g;
  }

  private drawCounter() {
    this.drawCounterGraphic();

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

    // 총괄 매니저는 캐셔를 맡아, 주방에서 앞으로 나온 자리에서 어느 층에서든 가게를 지켜봅니다.
    this.generalManager = this.add
      .image(CASHIER_POS.x, CASHIER_POS.y, personKey(gameState.equippedUniform("gm")))
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE)
      .setDepth(5)
      .setVisible(false);

    this.registerImage = this.add
      .image(REGISTER_POS.x, REGISTER_POS.y, registerKey(gameState.equippedDecor("register")))
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE)
      .setDepth(5.5);
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
    this.equipmentBadges.forEach((b) => b.container.destroy());
    this.equipmentBadges.clear();

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
    owned.forEach((def, i) => {
      const img = images[i];
      img.setScale(scale);
      img.setX(x + img.displayWidth / 2);
      x += img.displayWidth + gap;

      // 설비마다, 지금 그 설비를 기다리는 주문 수를 보여주는 뱃지입니다.
      const bg = this.add
        .circle(0, 0, 17, ART_COLORS.ink)
        .setStrokeStyle(3, 0xffffff);
      const text = this.add
        .text(0, 0, "", { fontSize: "20px", color: "#ffffff", fontStyle: "bold" })
        .setOrigin(0.5);
      const container = this.add
        .container(img.x + img.displayWidth / 2 - 8, img.y - img.displayHeight, [bg, text])
        .setDepth(7)
        .setVisible(false);
      this.equipmentBadges.set(def.id, { container, text });
    });
    this.equipmentImages = images;
  }

  /** 설비마다, 지금 그 설비에서 만들고 있는 주문 수를 뱃지로 보여줍니다 */
  private syncEquipment() {
    const counts = new Map<string, number>();
    for (const c of sim.customersOn(this.activeFloor)) {
      if (c.leaving || c.phase !== "preparing") continue;
      for (const itemId of c.order.itemIds) {
        const equipmentId = menuById(itemId).equipmentId;
        counts.set(equipmentId, (counts.get(equipmentId) ?? 0) + 1);
      }
    }
    this.equipmentBadges.forEach((badge, id) => {
      const count = counts.get(id) ?? 0;
      badge.container.setVisible(count > 0);
      if (count > 0) badge.text.setText(String(count));
    });
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

    // 홀 직원: 청소를 배정받았으면 흔적 바로 옆에 붙어서 등을 돌리고 치우고
    // (다른 직원은 안 갑니다), 아니면 서빙할 손님에게 갔다가 통로로 돌아옵니다.
    const seats = sim.tablesOn(this.activeFloor);
    const cleaningTarget = new Map<number, { x: number; y: number; side: number }>();
    seats.forEach((seat, i) => {
      if (seat.state === "dirty" && seat.assignedServer !== null) {
        const side = i % SEATS_PER_TABLE === 0 ? -1 : 1;
        const table = tablePosition(Math.floor(i / SEATS_PER_TABLE));
        cleaningTarget.set(seat.assignedServer, {
          x: table.x + side * CLEAN_STAND_DX,
          y: table.y + CLEAN_STAND_DY,
          side,
        });
      }
    });
    const serveJobs: { x: number; y: number }[] = [];
    for (const c of customers) {
      if (c.phase === "ready" && !c.leaving) serveJobs.push(seatPosition(c.tableIndex));
    }
    let serveJobIndex = 0;

    this.servers.forEach((img, i) => {
      const show = i < data.server;
      if (img.visible !== show) img.setVisible(show);
      if (!show) return;

      const home = this.serverHome(i);
      // 청소 배정이 최우선이고, 없으면 서빙 대기 중인 손님을 순서대로 맡습니다.
      const cleanJob = cleaningTarget.get(i);
      const serveJob = !cleanJob && serveJobIndex < serveJobs.length ? serveJobs[serveJobIndex++] : undefined;

      let target: { x: number; y: number };
      if (cleanJob) {
        // 흔적 바로 옆이라 손님 옆으로 비켜설 필요가 없습니다.
        target = cleanJob;
      } else if (serveJob) {
        // 손님 옆에 서야 하므로 자리보다 통로 쪽으로 조금 비켜섭니다.
        target = { x: serveJob.x + (serveJob.x < VIRTUAL_WIDTH / 2 ? 46 : -46), y: serveJob.y + 34 };
      } else {
        target = home;
      }

      const nextX = Phaser.Math.Linear(img.x, target.x, 0.06);
      if (cleanJob) {
        // 치우는 동안은 걸음 방향으로 흔들리지 않도록, 테이블 쪽을 향해 고정합니다.
        img.setFlipX(cleanJob.side > 0);
        // 손님처럼 테이블 상판(깊이 4) 뒤로 살짝 가려지게 해서 자연스럽게 붙어 서게 합니다.
        img.setDepth(3);
      } else {
        img.setFlipX(nextX < img.x - 0.4);
        img.setDepth(5);
      }
      img.setX(nextX);
      img.setY(Phaser.Math.Linear(img.y, target.y, 0.06));
    });

    // 총괄 매니저는 캐셔가 되어, 층과 상관없이 포스기 뒤를 지킵니다.
    // (포스기 자체는 산 인테리어라서, 총괄 매니저가 없어도 카운터에 그대로 놓여 있어요.)
    const hasGm = gameState.hasGeneralManager();
    if (this.generalManager.visible !== hasGm) this.generalManager.setVisible(hasGm);
    if (hasGm) {
      this.generalManager.setY(CASHIER_POS.y + Math.sin(this.time.now / 420) * 3);
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

  /* ------------------------- 테이블 · 자리 ------------------------- */

  private rebuildTables() {
    this.roomParts.forEach((p) => p.destroy());
    this.roomParts = [];
    this.dirtyIcons.clear();
    this.cleanGauges.clear();

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
          .image(seat.x, seat.y + CHAIR_DY, chairKey(gameState.equippedDecor("chair")))
          .setScale(ART_SCALE)
          .setDepth(1);

        const dirtySide = side === 0 ? -1 : 1;
        const dirtyIcon = this.add
          .image(pos.x + dirtySide * DIRTY_ITEM_DX, pos.y + DIRTY_ITEM_DY, "icon-dirty")
          .setScale(ART_SCALE * 1.2)
          .setDepth(6)
          .setVisible(false);
        this.dirtyIcons.set(seatIndex, dirtyIcon);

        // 청소 게이지 — 손님 인내심 막대와 같은 가로 막대 모양으로,
        // 직원이 서는 자리 머리 위에 띄웁니다 (왼쪽부터 채워집니다).
        const standX = pos.x + dirtySide * CLEAN_STAND_DX;
        const standY = pos.y + CLEAN_STAND_DY;
        const gaugeY = standY - CLEAN_GAUGE_UP;
        const gaugeLeft = standX - CLEAN_GAUGE_W / 2;
        const gaugeBg = this.add
          .rectangle(gaugeLeft, gaugeY, CLEAN_GAUGE_W, CLEAN_GAUGE_H, 0x000000, 0.28)
          .setOrigin(0, 0.5)
          .setDepth(6)
          .setVisible(false);
        const gaugeFill = this.add
          .rectangle(gaugeLeft, gaugeY, 0, CLEAN_GAUGE_H, 0x4aa3df, 1)
          .setOrigin(0, 0.5)
          .setDepth(6)
          .setVisible(false);
        this.cleanGauges.set(seatIndex, { bg: gaugeBg, fill: gaugeFill });

        // 손님(깊이 3)보다 아래에 둬야 손님 탭이 이 영역에 먹히지 않습니다.
        const hit = this.add
          .rectangle(seat.x, seat.y - 10, 120, 130, 0xffffff, 0)
          .setDepth(2);
        hit.setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => sim.tapTable(this.activeFloor, seatIndex));

        this.roomParts.push(chair, dirtyIcon, gaugeBg, gaugeFill, hit);
      }

      // 상판은 손님 앞(깊이 4)에 덮여, 두 손님이 마주 앉은 것처럼 보입니다.
      this.roomParts.push(
        this.add
          .image(pos.x, pos.y + TABLE_TOP_DY, tableKey(gameState.equippedDecor("table")))
          .setScale(ART_SCALE)
          .setDepth(4),
      );
    }
  }

  private syncTables() {
    const seats = sim.tablesOn(this.activeFloor);
    for (const [seatIndex, icon] of this.dirtyIcons) {
      const seat = seats[seatIndex];
      const dirty = seat?.state === "dirty";
      if (icon.visible !== dirty) icon.setVisible(dirty);

      const gauge = this.cleanGauges.get(seatIndex);
      if (!gauge) continue;
      const cleaning = dirty && seat!.assignedServer !== null && seat!.cleanTotal > 0;
      if (gauge.bg.visible !== cleaning) {
        gauge.bg.setVisible(cleaning);
        gauge.fill.setVisible(cleaning);
      }
      if (cleaning) {
        const progress = Phaser.Math.Clamp(1 - seat!.cleanLeft / seat!.cleanTotal, 0, 1);
        gauge.fill.setSize(CLEAN_GAUGE_W * progress, CLEAN_GAUGE_H);
      }
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
    // 1층은 문, 2층부터는 계단이라 층을 옮기면 입구 그림도 다시 그립니다.
    this.drawRoom();
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

  private onFameGained(payload: { floorIndex: number; tableIndex: number; amount: number }) {
    if (payload.floorIndex !== this.activeFloor) return;
    const pos = seatPosition(payload.tableIndex);
    this.famePopup(pos.x, pos.y - 30, payload.amount);
  }

  /** 메가폰 그림과 함께 "+인지도" 가 떠오릅니다 */
  private famePopup(x: number, y: number, amount: number) {
    const group = this.add.container(x, y).setDepth(20);
    const icon = this.add.image(-20, 0, uiKey("fame")).setScale(ART_SCALE * 0.8);
    const text = this.add
      .text(0, 0, `+${amount}`, {
        fontSize: "24px",
        color: "#f5a623",
        fontStyle: "bold",
        stroke: "#5a3b22",
        strokeThickness: 5,
      })
      .setOrigin(0, 0.5);
    group.add([icon, text]);
    this.floatUp(group, y);
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
