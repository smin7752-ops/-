/* ------------------------------------------------------------------ *
 * 게임에 나오는 그림을 코드로 직접 그리는 곳입니다.
 *
 * 이모지 대신 여기서 만든 그림을 씁니다. 외부 이미지 파일이 없으므로
 * 게임이 켜질 때 한 번 그려서 텍스처로 구워두고, 그 뒤로는 가져다 씁니다.
 *
 * 그림은 화면에 보일 크기의 2배로 그린 뒤 절반으로 줄여서 씁니다.
 * 그래야 고해상도 폰에서 계단현상 없이 또렷하게 보입니다.
 * → 화면에 올릴 때는 항상 `.setScale(ART_SCALE)` 를 해주세요.
 * ------------------------------------------------------------------ */

import Phaser from "phaser";
import {
  ALL_RESTAURANTS_EQUIPMENT,
  ALL_RESTAURANTS_MENU,
  decorOfSlot,
  UNIFORMS,
  type UniformSlot,
} from "./config";

/** 2배로 그린 그림을 화면에 올릴 때 줄이는 비율 */
export const ART_SCALE = 0.5;

/** 바깥 초원(아이소메트릭 월드맵)의 칸(구역) 한 개 크기 — 폭:높이 = 2:1.
 * 건물 하나가 이 칸 하나를 차지합니다 (칸이 건물보다 넉넉히 커서, 건물
 * 둘레에 작은 마당처럼 여백이 남습니다). */
export const ISO_TILE_W = 340;
export const ISO_TILE_H = 170;

/** 격자 좌표(gx, gy) → 화면 좌표. 건물을 놓을 자리를 계산할 때 그림을 그릴 때와
 * 똑같은 식을 써야 타일과 건물이 정확히 맞물립니다. */
export function isoToScreen(gx: number, gy: number) {
  return {
    x: (gx - gy) * (ISO_TILE_W / 2),
    y: (gx + gy) * (ISO_TILE_H / 2),
  };
}

/** 들판 칸이 몇 개까지 깔리는지 (가운데에서 사방으로). 매장을 계속
 * 늘려갈 수 있도록 넉넉하게 잡아둡니다. */
export const ISO_GRID_RADIUS = 4;

/** "world-ground" 그림의 왼쪽 위 기준으로, 격자 원점(0,0)이 놓이는 자리.
 * 건물을 화면에 놓을 때도 이 값을 더해야 타일과 자리가 맞습니다.
 * 가장자리 타일(포차·분식집처럼 격자 맨 끝에 있는 칸)의 마름모 꼭짓점까지
 * 통째로 들어가려면 반 칸만큼 여백을 더 둬야 합니다 — 이 여백이 모자라서
 * 맨 끝 칸의 잔디·길이 그림 밖으로 잘려 나가고 있었습니다. */
export function isoGroundOrigin() {
  return {
    x: ISO_GRID_RADIUS * ISO_TILE_W + ISO_TILE_W / 2,
    y: ISO_GRID_RADIUS * ISO_TILE_H + ISO_TILE_H / 2,
  };
}

/** 테두리 색. 모든 그림이 이 색 테두리를 둘러 한 세트처럼 보이게 합니다. */
const INK = 0x4a3226;

/** 파스텔 톤 색 모음 */
export const ART_COLORS = {
  ink: INK,
  cream: 0xead9b8,
  paper: 0xfffaf2,
  wood: 0x8a5a34,
  woodLight: 0xb98350,
  woodDark: 0x5a3b22,
  steel: 0xc9ccd4,
  steelDark: 0x8f96a3,
};

const SKINS = [0xf7dcc4, 0xf0c6a4, 0xdba578, 0xba7f57];
const HAIRS = [0x4a3226, 0x7b4a2d, 0x332d38, 0xc98b4b, 0xe8a0b4, 0x6f5f9e];
const SHIRTS = [
  0xf4a9a8, 0xa8c8f0, 0xb2e0c6, 0xf7d08a, 0xd5b8e8, 0xf0b8d0, 0x9fd8d0, 0xf3b189,
];
const HAIR_STYLES = 4;

export interface CustomerLook {
  skin: number;
  hair: number;
  hairStyle: number;
  shirt: number;
}

export function randomLook(): CustomerLook {
  return {
    skin: Phaser.Math.Between(0, SKINS.length - 1),
    hair: Phaser.Math.Between(0, HAIRS.length - 1),
    hairStyle: Phaser.Math.Between(0, HAIR_STYLES - 1),
    shirt: Phaser.Math.Between(0, SHIRTS.length - 1),
  };
}

export const headKey = (look: CustomerLook) => `head-${look.skin}`;
export const hairKey = (look: CustomerLook) => `hair-${look.hairStyle}-${look.hair}`;
export const bodyKey = (look: CustomerLook) => `body-${look.shirt}`;
export const itemKey = (menuId: string) => `item-${menuId}`;
export const equipKey = (equipmentId: string) => `equip-${equipmentId}`;
/** 유니폼별 전신 그림 */
export const personKey = (uniformId: string) => `person-${uniformId}`;
/** 인테리어(꾸미기)별 가구 그림 */
export const chairKey = (decorId: string) => `chair-${decorId}`;
export const tableKey = (decorId: string) => `table-${decorId}`;
export const doorKey = (decorId: string) => `door-${decorId}`;
export const registerKey = (decorId: string) => `register-${decorId}`;

/* ------------------------------------------------------------------ *
 * 그리기 도우미
 * ------------------------------------------------------------------ */

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 채우고 테두리까지 두르는 둥근 사각형 */
function blob(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  line = 5,
) {
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(line, INK, 1);
  g.strokeRoundedRect(x, y, w, h, r);
}

function disc(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  fill: number,
  line = 5,
) {
  g.fillStyle(fill, 1);
  g.fillCircle(x, y, r);
  if (line > 0) {
    g.lineStyle(line, INK, 1);
    g.strokeCircle(x, y, r);
  }
}

function oval(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  line = 5,
) {
  g.fillStyle(fill, 1);
  g.fillEllipse(x, y, w, h);
  if (line > 0) {
    g.lineStyle(line, INK, 1);
    g.strokeEllipse(x, y, w, h);
  }
}

/** 점선 느낌의 둥근 테두리 (아직 안 산 자리 표시용) */
function dashedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  dash: number,
  color: number,
) {
  g.lineStyle(6, color, 0.55);
  for (let i = x; i < x + w; i += dash * 2) {
    g.lineBetween(i, y, Math.min(i + dash, x + w), y);
    g.lineBetween(i, y + h, Math.min(i + dash, x + w), y + h);
  }
  for (let i = y; i < y + h; i += dash * 2) {
    g.lineBetween(x, i, x, Math.min(i + dash, y + h));
    g.lineBetween(x + w, i, x + w, Math.min(i + dash, y + h));
  }
}

/* ------------------------------------------------------------------ *
 * 손님
 * ------------------------------------------------------------------ */

function buildPeople(scene: Phaser.Scene) {
  // 머리 (피부색마다 하나씩) — 96x96, 얼굴 중심은 (48, 52)
  SKINS.forEach((skin, i) => {
    tex(scene, `head-${i}`, 96, 96, (g) => {
      disc(g, 12, 56, 9, skin, 4); // 왼쪽 귀
      disc(g, 84, 56, 9, skin, 4); // 오른쪽 귀
      disc(g, 48, 52, 38, skin, 5);
    });
  });

  // 머리카락 (모양 4가지 x 색 6가지)
  HAIRS.forEach((hair, ci) => {
    for (let style = 0; style < HAIR_STYLES; style++) {
      tex(scene, `hair-${style}-${ci}`, 96, 96, (g) => {
        g.fillStyle(hair, 1);
        g.lineStyle(5, INK, 1);

        if (style === 0) {
          // 단발 — 윗머리에 양옆으로 내려오는 머리를 더합니다.
          // 얼굴이 가려지지 않게 위쪽 반원만 채웁니다.
          g.fillRoundedRect(6, 44, 18, 38, 9);
          g.fillRoundedRect(72, 44, 18, 38, 9);
          g.strokeRoundedRect(6, 44, 18, 38, 9);
          g.strokeRoundedRect(72, 44, 18, 38, 9);
          g.slice(48, 50, 43, Phaser.Math.DegToRad(182), Phaser.Math.DegToRad(358));
          g.fillPath();
          g.strokePath();
        } else if (style === 1) {
          // 짧은 머리
          g.slice(48, 50, 42, Phaser.Math.DegToRad(182), Phaser.Math.DegToRad(358));
          g.fillPath();
          g.strokePath();
        } else if (style === 2) {
          // 묶은 머리
          g.slice(48, 50, 42, Phaser.Math.DegToRad(182), Phaser.Math.DegToRad(358));
          g.fillPath();
          g.strokePath();
          disc(g, 74, 16, 15, hair, 5);
        } else {
          // 곱슬
          g.slice(48, 52, 42, Phaser.Math.DegToRad(182), Phaser.Math.DegToRad(358));
          g.fillPath();
          g.strokePath();
          disc(g, 24, 20, 14, hair, 5);
          disc(g, 48, 12, 16, hair, 5);
          disc(g, 72, 20, 14, hair, 5);
        }
      });
    }
  });

  // 몸 (옷 색마다 하나씩) — 120x92
  SHIRTS.forEach((shirt, i) => {
    tex(scene, `body-${i}`, 120, 92, (g) => {
      disc(g, 18, 54, 15, shirt, 5); // 왼팔
      disc(g, 102, 54, 15, shirt, 5); // 오른팔
      blob(g, 26, 20, 68, 66, 26, shirt, 5);
      // 옷깃
      g.lineStyle(5, INK, 1);
      g.beginPath();
      g.arc(60, 20, 16, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
      g.strokePath();
    });
  });

  // 표정 (머리 텍스처 위에 겹칩니다) — 96x96
  const eyes = (g: Phaser.GameObjects.Graphics) => {
    disc(g, 34, 52, 6, INK, 0);
    disc(g, 62, 52, 6, INK, 0);
  };

  tex(scene, "face-happy", 96, 96, (g) => {
    eyes(g);
    g.lineStyle(5, INK, 1);
    g.beginPath();
    g.arc(48, 62, 14, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
    // 발그레한 볼
    g.fillStyle(0xf2907f, 0.45);
    g.fillEllipse(24, 66, 18, 11);
    g.fillEllipse(72, 66, 18, 11);
  });

  tex(scene, "face-neutral", 96, 96, (g) => {
    eyes(g);
    g.lineStyle(5, INK, 1);
    g.lineBetween(40, 68, 56, 68);
  });

  tex(scene, "face-angry", 96, 96, (g) => {
    eyes(g);
    g.lineStyle(5, INK, 1);
    g.lineBetween(26, 40, 42, 46); // 찌푸린 눈썹
    g.lineBetween(70, 40, 54, 46);
    g.beginPath();
    g.arc(48, 76, 13, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
  });
}

/* ------------------------------------------------------------------ *
 * 메뉴 그림
 * ------------------------------------------------------------------ */

/** 손잡이 달린 커피잔. 안에 담긴 색만 바꿔서 여러 메뉴에 씁니다. */
function mug(g: Phaser.GameObjects.Graphics, liquid: number, foam?: number) {
  oval(g, 48, 80, 72, 16, ART_COLORS.paper, 5); // 받침
  g.lineStyle(9, ART_COLORS.paper, 1);
  g.strokeCircle(76, 52, 13);
  g.lineStyle(5, INK, 1);
  g.strokeCircle(76, 52, 15);
  blob(g, 20, 34, 56, 40, 12, ART_COLORS.paper, 5);
  oval(g, 48, 38, 44, 13, liquid, 4);
  if (foam !== undefined) oval(g, 48, 37, 26, 8, foam, 0);
}

/** 길쭉한 유리컵 */
function glass(g: Phaser.GameObjects.Graphics, liquid: number) {
  g.fillStyle(liquid, 1);
  g.beginPath();
  g.moveTo(30, 26);
  g.lineTo(66, 26);
  g.lineTo(61, 82);
  g.lineTo(35, 82);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.28);
  g.fillRect(35, 30, 8, 48);
  g.lineStyle(5, INK, 1);
  g.beginPath();
  g.moveTo(30, 26);
  g.lineTo(66, 26);
  g.lineTo(61, 82);
  g.lineTo(35, 82);
  g.closePath();
  g.strokePath();
}

function strawberry(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  g.fillStyle(0xe4595f, 1);
  g.beginPath();
  g.moveTo(x, y + 11 * s);
  g.lineTo(x - 8 * s, y - 3 * s);
  g.lineTo(x + 8 * s, y - 3 * s);
  g.closePath();
  g.fillPath();
  g.fillCircle(x - 4 * s, y - 3 * s, 4.5 * s);
  g.fillCircle(x + 4 * s, y - 3 * s, 4.5 * s);
  g.fillStyle(0x69ab5a, 1);
  g.fillEllipse(x, y - 7 * s, 15 * s, 6 * s);
}

function buildMenuArt(scene: Phaser.Scene) {
  const T = (id: string, draw: Draw) => tex(scene, itemKey(id), 96, 96, draw);

  T("americano", (g) => mug(g, 0x5b3a22));
  T("latte", (g) => mug(g, 0xc98f5e, 0xf6e6cf));
  T("matcha", (g) => mug(g, 0x88b45c, 0xd3e7b5));

  T("icetea", (g) => {
    glass(g, 0xd08b3c);
    g.fillStyle(0xffffff, 0.55);
    g.fillRoundedRect(38, 34, 15, 15, 4);
    g.fillRoundedRect(50, 52, 13, 13, 4);
    blob(g, 60, 12, 9, 26, 4, 0xf07f7f, 3); // 빨대
  });

  T("ade", (g) => {
    glass(g, 0xf2d764);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(44, 60, 4);
    g.fillCircle(54, 48, 3);
    g.fillCircle(48, 70, 3);
    disc(g, 62, 30, 12, 0xf7e06a, 4); // 레몬 조각
    g.lineStyle(3, 0xd9b93f, 1);
    g.lineBetween(62, 22, 62, 38);
    g.lineBetween(54, 30, 70, 30);
  });

  T("smoothie", (g) => {
    glass(g, 0xf29ab4);
    oval(g, 48, 26, 40, 16, 0xfbd0dd, 5); // 크림
    blob(g, 58, 6, 9, 26, 4, 0xa8c8f0, 3);
    strawberry(g, 36, 20, 0.8);
  });

  T("cookie", (g) => {
    disc(g, 48, 52, 34, 0xd9a05b, 5);
    g.fillStyle(0x5b3a22, 1);
    [
      [36, 40],
      [60, 44],
      [44, 62],
      [64, 66],
      [50, 30],
    ].forEach(([x, y]) => g.fillCircle(x, y, 6));
  });

  T("croissant", (g) => {
    // 굵은 호를 겹쳐 그려 초승달 모양을 만듭니다
    const band = (w: number, color: number) => {
      g.lineStyle(w, color, 1);
      g.beginPath();
      g.arc(48, 60, 26, Phaser.Math.DegToRad(198), Phaser.Math.DegToRad(342));
      g.strokePath();
    };
    const tipL = { x: 23, y: 52 };
    const tipR = { x: 73, y: 52 };
    disc(g, tipL.x, tipL.y, 12, INK, 0); // 양끝 뿔
    disc(g, tipR.x, tipR.y, 12, INK, 0);
    band(34, INK);
    disc(g, tipL.x, tipL.y, 8, 0xe0a95c, 0);
    disc(g, tipR.x, tipR.y, 8, 0xe0a95c, 0);
    band(26, 0xe0a95c);
    g.lineStyle(4, 0xc98b45, 1); // 결
    [250, 270, 290].forEach((deg) => {
      const a = Phaser.Math.DegToRad(deg);
      g.lineBetween(
        48 + Math.cos(a) * 15,
        60 + Math.sin(a) * 15,
        48 + Math.cos(a) * 37,
        60 + Math.sin(a) * 37,
      );
    });
  });

  T("cheesecake", (g) => {
    // 옆에서 본 케이크 한 조각
    const slice = (draw: "fill" | "stroke") => {
      g.beginPath();
      g.moveTo(26, 42);
      g.lineTo(70, 42);
      g.lineTo(64, 76);
      g.lineTo(32, 76);
      g.closePath();
      if (draw === "fill") g.fillPath();
      else g.strokePath();
    };
    g.fillStyle(0xf6e3b8, 1);
    slice("fill");
    g.fillStyle(0xc08a4e, 1); // 바닥 크러스트
    g.fillRect(30, 64, 36, 12);
    g.lineStyle(5, INK, 1);
    slice("stroke");
    g.lineBetween(31, 64, 65, 64);
    oval(g, 48, 42, 44, 14, 0xfaf0d4, 5); // 윗면
    strawberry(g, 48, 34, 0.7);
  });

  T("macaron", (g) => {
    oval(g, 48, 38, 62, 28, 0xf6b8cd, 5); // 위 껍질
    oval(g, 48, 66, 62, 28, 0xf6b8cd, 5); // 아래 껍질
    g.fillStyle(0xfae7c8, 1);
    g.fillRect(19, 48, 58, 10);
    g.lineStyle(4, INK, 1);
    g.lineBetween(19, 48, 77, 48);
    g.lineBetween(19, 58, 77, 58);
  });

  T("tiramisu", (g) => {
    blob(g, 22, 34, 52, 44, 8, 0xf6e3c0, 5);
    g.fillStyle(0xd9b98c, 1);
    g.fillRect(25, 52, 46, 9);
    g.fillStyle(0x6b4a33, 1);
    g.fillRoundedRect(22, 34, 52, 14, 8);
    g.fillRect(22, 42, 52, 6);
    g.lineStyle(5, INK, 1);
    g.strokeRoundedRect(22, 34, 52, 44, 8);
    disc(g, 62, 28, 7, 0xf6e3c0, 4); // 위에 얹은 크림
  });

  T("tart", (g) => {
    oval(g, 48, 62, 70, 30, 0xc08a4e, 5); // 파이 껍질
    oval(g, 48, 54, 58, 24, 0xfaeccd, 4); // 크림
    strawberry(g, 34, 48, 0.7);
    strawberry(g, 48, 44, 0.7);
    strawberry(g, 62, 48, 0.7);
  });
}

/* ------------------------------------------------------------------ *
 * 설비 (카운터 위에 놓이는 것들)
 * ------------------------------------------------------------------ */

function buildEquipment(scene: Phaser.Scene) {
  const S = ART_COLORS;

  // 커피머신 — 카운터의 주인공이라 조금 크게 그립니다. 200x150
  tex(scene, equipKey("coffee_machine"), 200, 150, (g) => {
    blob(g, 14, 118, 172, 22, 8, S.steelDark, 5); // 받침
    blob(g, 26, 20, 148, 100, 14, S.steel, 5); // 몸통
    blob(g, 38, 30, 124, 34, 8, 0x6f7684, 5); // 위쪽 컵 놓는 곳
    blob(g, 52, 22, 20, 12, 4, S.paper, 4); // 데워지는 잔
    blob(g, 80, 22, 20, 12, 4, S.paper, 4);
    blob(g, 56, 74, 52, 20, 6, 0x6f7684, 5); // 추출구
    blob(g, 70, 90, 24, 10, 4, 0x4f5560, 4);
    blob(g, 74, 100, 22, 16, 5, S.paper, 4); // 내려받는 잔
    g.lineStyle(6, 0x6f7684, 1); // 스팀 노즐
    g.lineBetween(150, 74, 150, 104);
    disc(g, 150, 106, 6, 0x4f5560, 0);
    disc(g, 132, 50, 8, 0x7ad07a, 4); // 전원 불빛
    disc(g, 154, 50, 8, 0xf0a35e, 4);
  });

  // 쇼케이스 — 160x130
  tex(scene, equipKey("showcase"), 160, 130, (g) => {
    blob(g, 10, 24, 140, 84, 12, 0xdff0f5, 5);
    blob(g, 10, 96, 140, 24, 8, S.wood, 5);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(24, 34, 12, 58);
    g.lineStyle(4, INK, 0.6);
    g.lineBetween(10, 66, 150, 66); // 선반
    disc(g, 44, 54, 11, 0xf6b8cd, 4);
    disc(g, 80, 54, 11, 0xf6e3c0, 4);
    disc(g, 116, 54, 11, 0xd9a05b, 4);
    oval(g, 52, 84, 26, 14, 0xf6e3b8, 4);
    oval(g, 104, 84, 26, 14, 0xf29ab4, 4);
  });

  // 티 스테이션 — 150x130
  tex(scene, equipKey("tea_station"), 150, 130, (g) => {
    blob(g, 20, 92, 110, 22, 8, S.wood, 5);
    blob(g, 34, 34, 74, 60, 22, 0xf3d9e2, 5); // 주전자
    g.lineStyle(8, 0xf3d9e2, 1);
    g.strokeCircle(116, 64, 16);
    g.lineStyle(5, INK, 1);
    g.strokeCircle(116, 64, 19);
    g.beginPath(); // 주둥이
    g.moveTo(34, 52);
    g.lineTo(12, 40);
    g.lineTo(16, 58);
    g.closePath();
    g.fillStyle(0xf3d9e2, 1);
    g.fillPath();
    g.strokePath();
    blob(g, 60, 20, 22, 16, 6, 0xf3d9e2, 5); // 뚜껑 손잡이
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(56, 54, 16, 22);
  });

  // 블렌더 — 140x140
  tex(scene, equipKey("blender"), 140, 140, (g) => {
    blob(g, 26, 100, 88, 28, 10, 0x6f7684, 5); // 본체
    disc(g, 70, 114, 8, 0xf0a35e, 4); // 다이얼
    g.fillStyle(0xf29ab4, 1); // 통에 담긴 내용물
    g.beginPath();
    g.moveTo(36, 40);
    g.lineTo(104, 40);
    g.lineTo(96, 100);
    g.lineTo(44, 100);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(44, 46, 10, 50);
    g.lineStyle(5, INK, 1);
    g.beginPath();
    g.moveTo(36, 40);
    g.lineTo(104, 40);
    g.lineTo(96, 100);
    g.lineTo(44, 100);
    g.closePath();
    g.strokePath();
    blob(g, 30, 24, 80, 18, 8, 0xdff0f5, 5); // 뚜껑
  });

  // 오븐 — 150x140
  tex(scene, equipKey("oven"), 150, 140, (g) => {
    blob(g, 14, 20, 122, 108, 14, S.steel, 5);
    blob(g, 28, 46, 94, 66, 10, 0x5d4636, 5); // 오븐 문
    g.fillStyle(0xf0a35e, 0.85); // 안에서 새는 불빛
    g.fillRoundedRect(36, 54, 78, 50, 8);
    g.fillStyle(0xe0a95c, 1);
    g.fillEllipse(60, 88, 30, 14);
    g.fillEllipse(92, 88, 26, 12);
    g.lineStyle(5, INK, 1);
    g.strokeRoundedRect(28, 46, 94, 66, 10);
    blob(g, 34, 28, 82, 12, 6, 0x6f7684, 4); // 손잡이
    disc(g, 128, 34, 7, 0xf07f7f, 4);
  });
}

/* ------------------------------------------------------------------ *
 * 분식집 · 포차 그림 도우미 (여러 메뉴가 같은 모양을 우려먹습니다)
 * ------------------------------------------------------------------ */

/** 국물/소스가 담긴 그릇. 96x96 캔버스 기준. */
function bowl(g: Phaser.GameObjects.Graphics, liquid: number) {
  blob(g, 16, 52, 64, 34, 14, ART_COLORS.paper, 5); // 그릇 몸통
  oval(g, 48, 52, 60, 20, liquid, 4); // 국물/소스
  g.lineStyle(4, INK, 0.35);
  g.lineBetween(20, 76, 76, 76);
}

/** 꼬치에 재료를 번갈아 꽂은 그림. items는 [색, 세로위치]입니다. */
function skewer(g: Phaser.GameObjects.Graphics, colors: number[]) {
  g.lineStyle(5, 0xc9a97a, 1); // 나무 꼬치
  g.lineBetween(48, 84, 48, 14);
  const step = 56 / colors.length;
  colors.forEach((c, i) => {
    const y = 26 + i * step;
    disc(g, 48, y, step * 0.46, c, 4);
  });
}

/** 접시 하나 (튀김·전 같은 걸 올릴 때 바탕으로 씁니다) */
function plate(g: Phaser.GameObjects.Graphics) {
  oval(g, 48, 66, 76, 24, ART_COLORS.paper, 5);
  g.lineStyle(3, INK, 0.25);
  oval(g, 48, 63, 56, 15, ART_COLORS.paper, 0);
}

/** 김밥 한 알 (검은 김 테두리 + 속재료 점) */
function gimbapSlice(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  fillings: number[],
) {
  disc(g, x, y, r, 0xf3ede1, 4);
  g.lineStyle(Math.max(6, r * 0.4), 0x2b2b2f, 1);
  g.strokeCircle(x, y, r);
  const step = (Math.PI * 2) / fillings.length;
  fillings.forEach((c, i) => {
    const a = i * step;
    disc(g, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, r * 0.22, c, 0);
  });
}

function buildBunsikArt(scene: Phaser.Scene) {
  const T = (id: string, draw: Draw) => tex(scene, itemKey(id), 96, 96, draw);

  T("bunsik_tteokbokki", (g) => {
    bowl(g, 0xd0432f);
    [30, 46, 62, 40, 56].forEach((x, i) =>
      blob(g, x - 6, 30 - (i % 2) * 6, 12, 28, 6, 0xf3ede1, 3),
    );
  });
  T("bunsik_rabokki", (g) => {
    bowl(g, 0xc73a2a);
    g.lineStyle(5, 0xf2d764, 1);
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(34 + i * 14, 42, 10, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(430));
      g.strokePath();
    }
    blob(g, 42, 26, 12, 24, 6, 0xf3ede1, 3);
  });
  T("bunsik_ramen", (g) => {
    bowl(g, 0xb8482c);
    g.lineStyle(5, 0xf2d764, 1);
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(28 + i * 12, 44, 9, Phaser.Math.DegToRad(190), Phaser.Math.DegToRad(420));
      g.strokePath();
    }
    disc(g, 66, 38, 11, 0xfaf0d4, 4); // 반숙란
    disc(g, 66, 38, 5, 0xf0a35e, 0);
  });
  T("bunsik_twigim", (g) => {
    plate(g);
    [[30, 46], [50, 40], [68, 48]].forEach(([x, y], i) => {
      g.fillStyle(0xe0a95c, 1);
      g.beginPath();
      g.moveTo(x, y + 22);
      g.lineTo(x - 9, y - 14);
      g.lineTo(x + 9, y - 14);
      g.closePath();
      g.fillPath();
      g.lineStyle(4, INK, 1);
      g.strokePath();
      if (i === 1) disc(g, x, y - 18, 6, 0xf29ab4, 3); // 새우꼬리
    });
  });
  T("bunsik_odeng_tang", (g) => {
    bowl(g, 0xc9a25a);
    skewer(g, [0xf3ede1, 0xf3ede1, 0xf3ede1]);
  });
  T("bunsik_jjajang_tteok", (g) => {
    bowl(g, 0x3a2c22);
    [30, 46, 62, 40].forEach((x, i) =>
      blob(g, x - 6, 30 - (i % 2) * 6, 12, 26, 6, 0xf3ede1, 3),
    );
  });

  T("bunsik_sundae", (g) => {
    plate(g);
    [28, 48, 68].forEach((x) => {
      disc(g, x, 54, 13, 0x8a5a5a, 4);
      disc(g, x, 54, 5, 0x5a3b3b, 0);
    });
    g.fillStyle(0x4a3226, 0.6);
    [24, 44, 64].forEach((x) => g.fillCircle(x - 6, 46, 1.6));
  });
  T("bunsik_hotteok", (g) => {
    disc(g, 48, 54, 32, 0xd9a05b, 5);
    disc(g, 48, 54, 20, 0xc0834a, 0);
    g.fillStyle(0x6b4630, 0.5);
    [[40, 48], [56, 60], [44, 64]].forEach(([x, y]) => g.fillCircle(x, y, 2.4));
  });
  T("bunsik_gimbap", (g) => {
    gimbapSlice(g, 48, 50, 30, [0xf2d764, 0xe4595f, 0x69ab5a, 0xf3ede1]);
  });
  T("bunsik_tuna_gimbap", (g) => {
    gimbapSlice(g, 48, 50, 30, [0xf29ab4, 0xf2d764, 0x69ab5a]);
  });
  T("bunsik_odeng_skewer", (g) => {
    skewer(g, [0xf3ede1, 0xf3ede1, 0xf3ede1, 0xf3ede1]);
  });
  T("bunsik_toast", (g) => {
    blob(g, 18, 60, 60, 20, 6, 0xe0a95c, 5); // 아래 식빵
    blob(g, 20, 44, 56, 14, 4, 0xfaf0d4, 4); // 계란마요
    blob(g, 18, 26, 60, 20, 6, 0xe0a95c, 5); // 위 식빵
  });
}

function buildPochaArt(scene: Phaser.Scene) {
  const T = (id: string, draw: Draw) => tex(scene, itemKey(id), 96, 96, draw);

  T("pocha_gyeranmari", (g) => {
    plate(g);
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 18;
      blob(g, x - 9, 34, 18, 30, 6, 0xf2d764, 4);
      g.lineStyle(3, 0xe0b84a, 1);
      g.beginPath();
      g.moveTo(x - 9, 40);
      g.lineTo(x + 9, 46);
      g.strokePath();
    }
  });
  T("pocha_dakkochi", (g) => skewer(g, [0xc9895a, 0x69ab5a, 0xc9895a, 0x69ab5a]));
  T("pocha_odengtang", (g) => {
    bowl(g, 0x8a6a3a);
    skewer(g, [0xf3ede1, 0xf3ede1]);
  });
  T("pocha_golbaengi", (g) => {
    plate(g);
    [[32, 50], [50, 44], [64, 54]].forEach(([x, y]) => {
      g.lineStyle(4, INK, 1);
      g.fillStyle(0xe0a95c, 1);
      g.beginPath();
      g.arc(x, y, 9, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(340));
      g.strokePath();
      g.beginPath();
      g.arc(x, y, 5, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(320));
      g.strokePath();
    });
    g.lineStyle(3, 0xd0432f, 0.7);
    g.lineBetween(24, 66, 72, 62);
  });
  T("pocha_jokbal", (g) => {
    plate(g);
    blob(g, 30, 30, 36, 34, 16, 0xa8703c, 5);
    blob(g, 40, 18, 16, 20, 6, 0xe4d0ad, 4); // 뼈
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(48, 46, 26, 12);
  });
  T("pocha_haemul_pajeon", (g) => {
    disc(g, 48, 54, 34, 0xe0b84a, 5);
    g.lineStyle(4, 0x69ab5a, 1);
    [20, 36, 52, 68].forEach((x) => g.lineBetween(x, 30, x - 6, 74));
    disc(g, 40, 44, 6, 0xf29ab4, 3); // 새우
    disc(g, 58, 56, 7, 0xd8d8e0, 3); // 오징어
  });

  T("pocha_gamja_twigim", (g) => {
    plate(g);
    for (let i = 0; i < 5; i++) {
      const x = 28 + i * 10;
      const h = 34 + (i % 2) * 6;
      g.fillStyle(0xf2d764, 1);
      g.fillRoundedRect(x, 60 - h, 8, h, 3);
      g.lineStyle(3, 0xc9a25a, 1);
      g.strokeRoundedRect(x, 60 - h, 8, h, 3);
    }
  });
  T("pocha_chicken_gangjeong", (g) => {
    plate(g);
    [[32, 48], [50, 42], [66, 50], [42, 58]].forEach(([x, y]) => {
      disc(g, x, y, 11, 0xc9622f, 4);
      g.fillStyle(0xf5c542, 0.5);
      g.fillCircle(x - 3, y - 3, 2);
    });
  });
  T("pocha_gyeranjjim", (g) => {
    blob(g, 18, 48, 60, 30, 10, 0x3a2c22, 5); // 뚝배기
    oval(g, 48, 46, 54, 22, 0xf2d764, 4);
    g.lineStyle(3, 0xffffff, 0.5);
    g.beginPath();
    g.moveTo(56, 22);
    g.lineTo(52, 10);
    g.strokePath();
  });
  T("pocha_ojingeo_bokkeum", (g) => {
    plate(g);
    [[30, 48], [48, 44], [66, 50]].forEach(([x, y]) => {
      g.lineStyle(5, INK, 1);
      g.fillStyle(0xd0432f, 1);
      g.strokeCircle(x, y, 10);
      g.fillCircle(x, y, 10);
      g.fillStyle(0xf3ede1, 1);
      g.fillCircle(x, y, 4);
    });
  });
  T("pocha_yangnyeom_tongdak", (g) => {
    plate(g);
    disc(g, 48, 48, 30, 0xc9622f, 5);
    g.fillStyle(0xf5c542, 0.5);
    [[36, 38], [58, 44], [44, 58]].forEach(([x, y]) => g.fillCircle(x, y, 2.4));
  });
  T("pocha_modum_jeon", (g) => {
    plate(g);
    disc(g, 34, 50, 15, 0x69ab5a, 4);
    disc(g, 58, 44, 15, 0xe0a95c, 4);
    disc(g, 48, 62, 13, 0xf3ede1, 4);
  });
}

function buildRestaurantEquipment(scene: Phaser.Scene) {
  const S = ART_COLORS;

  // 분식집 화로 — 130x110
  tex(scene, equipKey("bunsik_stove"), 130, 110, (g) => {
    blob(g, 10, 76, 110, 20, 8, S.steelDark, 5); // 화로대
    disc(g, 65, 50, 38, 0xd0432f, 5); // 냄비
    oval(g, 65, 38, 60, 16, 0xe85a3f, 4);
    g.fillStyle(0xf0a35e, 0.85); // 불꽃
    [40, 65, 90].forEach((x) => {
      g.beginPath();
      g.moveTo(x, 90);
      g.lineTo(x - 6, 78);
      g.lineTo(x + 6, 78);
      g.closePath();
      g.fillPath();
    });
  });
  tex(scene, equipKey("bunsik_display"), 160, 130, (g) => {
    blob(g, 10, 24, 140, 84, 12, 0xdff0f5, 5);
    blob(g, 10, 96, 140, 24, 8, S.wood, 5);
    g.lineStyle(4, INK, 0.6);
    g.lineBetween(10, 66, 150, 66);
    gimbapSlice(g, 44, 52, 15, [0xf2d764, 0xe4595f, 0x69ab5a]);
    gimbapSlice(g, 76, 52, 15, [0xf29ab4, 0xf2d764]);
    disc(g, 116, 86, 13, 0x8a5a5a, 4);
  });
  tex(scene, equipKey("bunsik_noodle_pot"), 150, 130, (g) => {
    blob(g, 20, 92, 110, 22, 8, S.wood, 5);
    blob(g, 35, 40, 80, 52, 12, 0xc9ccd4, 5); // 냄비
    g.lineStyle(6, S.steelDark, 1);
    g.lineBetween(24, 56, 35, 56);
    g.lineBetween(115, 56, 126, 56);
    g.fillStyle(0xffffff, 0.5); // 김
    g.fillEllipse(60, 24, 14, 22);
    g.fillEllipse(90, 20, 12, 20);
  });
  tex(scene, equipKey("bunsik_fryer"), 150, 130, (g) => {
    blob(g, 18, 44, 114, 62, 12, S.steel, 5);
    blob(g, 30, 54, 90, 40, 8, 0xe0a95c, 4); // 기름
    g.fillStyle(0xf5c542, 0.5);
    g.fillCircle(50, 66, 4);
    g.fillCircle(80, 60, 3);
    blob(g, 26, 24, 98, 16, 6, S.steelDark, 4); // 조작판
    disc(g, 120, 32, 6, 0xf07f7f, 3);
  });
  tex(scene, equipKey("bunsik_grill"), 150, 130, (g) => {
    blob(g, 14, 60, 122, 50, 10, S.steelDark, 5); // 철판
    oval(g, 75, 60, 108, 24, 0x6f7684, 0);
    disc(g, 46, 54, 16, 0xd9a05b, 3); // 호떡
    disc(g, 84, 56, 16, 0xe0a95c, 3);
    blob(g, 30, 30, 90, 18, 6, S.steel, 4); // 후드
  });

  // 포차 화로 — 숯불 화로 130x110
  tex(scene, equipKey("pocha_stove"), 130, 110, (g) => {
    blob(g, 14, 70, 102, 26, 10, S.steelDark, 5); // 화로 몸통
    oval(g, 65, 60, 88, 20, 0x2b2b2f, 4); // 숯
    g.fillStyle(0xf0a35e, 0.9);
    [42, 65, 88].forEach((x) => disc(g, x, 56, 7, 0xf07f4a, 0));
    g.lineStyle(5, S.steelDark, 1); // 석쇠
    for (let x = 30; x <= 100; x += 14) g.lineBetween(x, 40, x, 60);
  });
  tex(scene, equipKey("pocha_display"), 160, 130, (g) => {
    blob(g, 10, 24, 140, 84, 12, 0xdff0f5, 5);
    blob(g, 10, 96, 140, 24, 8, S.wood, 5);
    g.lineStyle(4, INK, 0.6);
    g.lineBetween(10, 66, 150, 66);
    disc(g, 44, 52, 15, 0xc9622f, 4);
    disc(g, 76, 52, 15, 0xe0b84a, 4);
    disc(g, 112, 86, 13, 0xd0432f, 4);
  });
  tex(scene, equipKey("pocha_soup_pot"), 150, 130, (g) => {
    blob(g, 24, 44, 102, 62, 14, 0x2b2b2f, 5); // 큰 솥
    oval(g, 75, 44, 92, 16, 0x3a3a3f, 4);
    g.fillStyle(0xffffff, 0.4);
    g.fillEllipse(60, 20, 16, 24);
    g.fillEllipse(94, 16, 12, 20);
    blob(g, 66, 8, 40, 14, 6, S.wood, 4); // 국자 손잡이
  });
  tex(scene, equipKey("pocha_charcoal_grill"), 150, 130, (g) => {
    blob(g, 18, 64, 114, 44, 10, S.steelDark, 5); // 그릴 몸통
    oval(g, 75, 64, 100, 20, 0x2b2b2f, 4);
    g.lineStyle(5, S.steel, 1); // 석쇠
    for (let x = 34; x <= 116; x += 14) g.lineBetween(x, 46, x, 64);
    g.fillStyle(0xf0a35e, 0.8);
    [50, 75, 100].forEach((x) => disc(g, x, 40, 5, 0xf07f4a, 0));
  });
  tex(scene, equipKey("pocha_special_station"), 150, 130, (g) => {
    blob(g, 16, 56, 118, 50, 12, S.steel, 5); // 웍
    oval(g, 75, 56, 104, 22, 0x3f4a5c, 4);
    g.fillStyle(0xd0432f, 0.85);
    g.fillEllipse(75, 52, 70, 14);
    g.lineStyle(6, S.wood, 1); // 손잡이
    g.lineBetween(20, 50, 4, 40);
    g.lineBetween(130, 50, 146, 40);
  });
}

/* ------------------------------------------------------------------ *
 * 가구 · 직원 · 표시 아이콘
 * ------------------------------------------------------------------ */

function buildFurniture(scene: Phaser.Scene) {
  const S = ART_COLORS;

  // 의자 — 손님 한 명이 앉는 크기입니다. 손님 뒤에 깔려요. 120x96
  // 인테리어(꾸미기)에서 산 색으로 여러 벌 구워둡니다.
  // primary: 기둥·좌판, secondary: 등받이
  for (const d of decorOfSlot("chair")) {
    tex(scene, chairKey(d.id), 120, 96, (g) => {
      blob(g, 16, 16, 14, 74, 7, d.colors.primary, 5); // 왼쪽 기둥
      blob(g, 90, 16, 14, 74, 7, d.colors.primary, 5); // 오른쪽 기둥
      blob(g, 10, 60, 100, 28, 11, d.colors.primary, 5); // 앉는 면
      blob(g, 24, 10, 72, 52, 18, d.colors.secondary, 5); // 등받이
      g.lineStyle(5, d.colors.primary, 0.8);
      g.lineBetween(60, 20, 60, 50);
    });
  }

  // 테이블 상판 — 손님 앞에 덮여서, 손님이 테이블에 앉은 것처럼 보이게 합니다.
  // 264x150. primary: 상판, secondary: 다리·받침, accent: 나뭇결
  for (const d of decorOfSlot("table")) {
    tex(scene, tableKey(d.id), 264, 150, (g) => {
      blob(g, 118, 60, 28, 60, 8, d.colors.secondary, 5); // 다리
      blob(g, 88, 112, 88, 24, 10, d.colors.secondary, 5); // 받침
      oval(g, 132, 44, 232, 66, d.colors.primary, 6); // 상판
      g.fillStyle(0x000000, 0.08);
      g.fillEllipse(132, 52, 206, 42);
      g.lineStyle(4, d.colors.accent, 0.7); // 나뭇결
      g.beginPath();
      g.arc(132, 20, 78, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150));
      g.strokePath();
      g.beginPath();
      g.arc(132, 6, 100, Phaser.Math.DegToRad(40), Phaser.Math.DegToRad(140));
      g.strokePath();
    });
  }

  // 가게 문 — 손님이 여기로 들어오고, 매니저가 옆에 섭니다.
  // 가로보다 세로가 길어야 "창문"이 아니라 문으로 보입니다. 160x200
  // primary: 문틀, secondary: 유리, accent: 간판
  for (const d of decorOfSlot("door")) {
    tex(scene, doorKey(d.id), 160, 200, (g) => {
      blob(g, 8, 24, 144, 172, 12, d.colors.primary, 6); // 문틀
      blob(g, 22, 38, 116, 146, 8, d.colors.secondary, 5); // 유리문
      g.lineStyle(6, d.colors.primary, 1);
      g.lineBetween(80, 38, 80, 184); // 가운데 기둥
      g.fillStyle(0xffffff, 0.5); // 유리 반사
      g.fillRect(34, 50, 14, 118);
      g.fillRect(96, 50, 14, 118);
      disc(g, 68, 112, 7, S.steelDark, 4); // 손잡이
      disc(g, 92, 112, 7, S.steelDark, 4);
      blob(g, 26, 2, 108, 26, 10, d.colors.accent, 5); // 문 위 간판
      g.fillStyle(S.paper, 1);
      g.fillRoundedRect(40, 9, 80, 12, 6);
    });
  }

  // 계단 — 2층부터는 문 대신 이 자리로 손님이 오르내립니다. 문과 같은 160x200
  // 이라 자리를 그대로 바꿔 끼울 수 있습니다. 인테리어로 안 바꾸는 고정 그림이에요.
  tex(scene, "stairs", 160, 200, (g) => {
    blob(g, 8, 24, 144, 172, 12, S.wood, 6); // 계단실 벽감
    blob(g, 22, 38, 116, 146, 8, 0xd8c096, 5); // 안쪽 배경
    g.lineStyle(6, S.wood, 1);
    // 아래에서 위로 올라갈수록 좁아지는 계단 다섯 칸
    for (let i = 0; i < 5; i++) {
      const stepY = 172 - i * 24;
      const stepW = 100 - i * 12;
      const stepX = 32 + i * 6;
      g.fillStyle(i % 2 === 0 ? S.woodLight : S.wood, 1);
      g.fillRect(stepX, stepY, stepW, 12);
      g.fillStyle(S.woodDark, 1);
      g.fillRect(stepX, stepY + 12, stepW, 5);
    }
    g.lineStyle(6, INK, 1);
    g.strokeRoundedRect(22, 38, 116, 146, 8);
    blob(g, 26, 2, 108, 26, 10, S.wood, 5); // 문 위 간판처럼 "계단" 표시
    g.fillStyle(S.paper, 1);
    g.fillRoundedRect(40, 9, 80, 12, 6);
  });

  // 캐셔 포스기 — 카운터 위에 놓이는 작은 소품입니다. 100x100
  // primary: 몸통·받침, secondary: 화면, accent: 화면 불빛·영수증 슬롯
  for (const d of decorOfSlot("register")) {
    tex(scene, registerKey(d.id), 100, 100, (g) => {
      blob(g, 10, 62, 80, 32, 8, d.colors.primary, 5); // 받침(몸통)
      blob(g, 18, 12, 64, 52, 8, d.colors.secondary, 5); // 화면
      g.fillStyle(d.colors.accent, 1); // 화면 불빛
      g.fillRoundedRect(26, 20, 48, 28, 4);
      blob(g, 30, 72, 40, 14, 5, d.colors.accent, 4); // 영수증 슬롯
    });
  }

  // 아직 안 산 자리 — 200x200
  tex(scene, "table-empty", 200, 200, (g) => {
    g.fillStyle(0x5a3b22, 0.07);
    g.fillRoundedRect(16, 16, 168, 168, 24);
    dashedRect(g, 16, 16, 168, 168, 16, 0x5a3b22);
    g.lineStyle(12, 0x5a3b22, 0.5);
    g.lineBetween(100, 68, 100, 132);
    g.lineBetween(68, 100, 132, 100);
  });

  // 직원 전신 그림 — 130x180. 카운터 뒤나 홀에 서 있습니다.
  // 옷 색과 소품만 달리해서 세 직급을 만듭니다.
  const person = (
    key: string,
    shirt: number,
    extra: (g: Phaser.GameObjects.Graphics) => void,
  ) =>
    tex(scene, key, 130, 180, (g) => {
      blob(g, 20, 96, 90, 78, 24, shirt, 5); // 몸
      extra(g);
      disc(g, 18, 122, 15, shirt, 5); // 팔
      disc(g, 112, 122, 15, shirt, 5);
      disc(g, 65, 56, 38, SKINS[1], 5); // 머리
      disc(g, 46, 60, 6, INK, 0); // 눈
      disc(g, 84, 60, 6, INK, 0);
      g.lineStyle(5, INK, 1);
      g.beginPath();
      g.arc(65, 68, 13, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
      g.strokePath();
      g.fillStyle(0x3f3a44, 1); // 앞머리
      g.slice(65, 54, 40, Phaser.Math.DegToRad(184), Phaser.Math.DegToRad(356));
      g.fillPath();
      g.lineStyle(5, INK, 1);
      g.strokePath();
    });

  /* 자리마다 옷 모양이 다릅니다. 색은 유니폼마다 바뀌어요. */
  const outfit: Record<UniformSlot, (g: Phaser.GameObjects.Graphics, accent: number) => void> = {
    barista: (g, accent) => {
      blob(g, 36, 112, 58, 62, 12, accent, 5); // 긴 앞치마
      g.lineStyle(5, INK, 1);
      g.lineBetween(48, 112, 58, 96);
      g.lineBetween(82, 112, 72, 96);
    },
    server: (g, accent) => {
      blob(g, 40, 118, 50, 56, 12, accent, 5); // 짧은 앞치마
    },
    manager: (g, accent) => {
      g.fillStyle(ART_COLORS.paper, 1); // 셔츠 깃
      g.fillTriangle(48, 96, 82, 96, 65, 132);
      g.fillStyle(accent, 1); // 넥타이
      g.fillTriangle(58, 104, 72, 104, 65, 142);
    },
    gm: (g, accent) => {
      // 총괄은 어깨에 걸친 코트로 구분합니다
      g.fillStyle(accent, 1);
      g.fillRoundedRect(24, 100, 20, 70, 8);
      g.fillRoundedRect(86, 100, 20, 70, 8);
      g.lineStyle(5, INK, 1);
      g.strokeRoundedRect(24, 100, 20, 70, 8);
      g.strokeRoundedRect(86, 100, 20, 70, 8);
      g.fillStyle(ART_COLORS.paper, 1);
      g.fillTriangle(50, 96, 80, 96, 65, 128);
      disc(g, 65, 136, 6, accent, 4); // 브로치
    },
  };

  // 유니폼마다 전신 그림을 한 장씩 구워둡니다.
  for (const u of UNIFORMS) {
    person(personKey(u.id), u.shirt, (g) => outfit[u.slot](g, u.accent));
  }

  // 바리스타 모자는 person 위에 따로 얹습니다 (머리보다 앞에 와야 해서)
  tex(scene, "barista", 130, 180, (g) => {
    blob(g, 20, 96, 90, 78, 24, 0x6f9ec4, 5); // 몸
    blob(g, 36, 112, 58, 62, 12, S.paper, 5); // 앞치마
    g.lineStyle(5, INK, 1);
    g.lineBetween(48, 112, 58, 96); // 앞치마 끈
    g.lineBetween(82, 112, 72, 96);
    disc(g, 18, 122, 15, 0x6f9ec4, 5); // 팔
    disc(g, 112, 122, 15, 0x6f9ec4, 5);
    disc(g, 65, 56, 38, SKINS[1], 5); // 머리
    disc(g, 46, 60, 6, INK, 0); // 눈
    disc(g, 84, 60, 6, INK, 0);
    g.lineStyle(5, INK, 1);
    g.beginPath();
    g.arc(65, 68, 13, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
    g.fillStyle(0x3f3a44, 1); // 앞머리
    g.slice(65, 54, 40, Phaser.Math.DegToRad(184), Phaser.Math.DegToRad(356));
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
    blob(g, 28, 8, 74, 22, 10, S.paper, 5); // 모자
    blob(g, 36, 0, 58, 16, 8, S.paper, 5);
  });
}

/**
 * 주문 말풍선. 단품용(그림 1개)과 세트용(그림 2개) 두 가지 폭으로 만듭니다.
 * 꼬리가 아래로 붙어 있어서, 그림의 한가운데는 말풍선 상자보다 조금 아래입니다.
 * → 상자 한가운데에 맞추려면 BUBBLE_BOX_OFFSET 만큼 올려서 쓰세요.
 */
export const BUBBLE_BOX_OFFSET = 5;

function buildBubbles(scene: Phaser.Scene) {
  const make = (key: string, w: number) =>
    tex(scene, key, w, 116, (g) => {
      g.fillStyle(ART_COLORS.paper, 1);
      g.fillRoundedRect(6, 6, w - 12, 84, 26);
      g.beginPath();
      g.moveTo(w / 2 - 14, 84);
      g.lineTo(w / 2 + 14, 84);
      g.lineTo(w / 2, 112);
      g.closePath();
      g.fillPath();
      g.lineStyle(6, INK, 1);
      g.strokeRoundedRect(6, 6, w - 12, 84, 26);
      // 꼬리의 바깥쪽 두 변만 덧그려 상자와 자연스럽게 이어지게 합니다
      g.lineBetween(w / 2 - 14, 88, w / 2, 112);
      g.lineBetween(w / 2 + 14, 88, w / 2, 112);
      g.fillStyle(ART_COLORS.paper, 1);
      g.fillRect(w / 2 - 12, 82, 24, 6);
    });

  make("bubble-1", 132);
  make("bubble-2", 200);
}

function buildIcons(scene: Phaser.Scene) {
  const S = ART_COLORS;

  // 눌러주세요 — 느낌표 64x64.
  // 손 모양은 이 크기(약 30px)에서 자물쇠나 덩어리로 뭉개져서,
  // "지금 사장님이 눌러야 한다"를 한눈에 알리는 느낌표로 그립니다.
  tex(scene, "icon-tap", 64, 64, (g) => {
    disc(g, 32, 32, 29, 0xf5a623, 5);
    g.fillStyle(ART_COLORS.paper, 1);
    g.beginPath(); // 위가 굵고 아래가 좁아지는 막대
    g.moveTo(26, 14);
    g.lineTo(38, 14);
    g.lineTo(36, 38);
    g.lineTo(28, 38);
    g.closePath();
    g.fillPath();
    g.fillCircle(32, 47, 5.5);
  });

  // 만드는 중 — 모래시계 64x64
  tex(scene, "icon-wait", 64, 64, (g) => {
    disc(g, 32, 32, 29, 0xdff0f5, 5);
    g.fillStyle(0xf0a35e, 1);
    g.beginPath();
    g.moveTo(20, 16);
    g.lineTo(44, 16);
    g.lineTo(32, 32);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(32, 32);
    g.lineTo(44, 48);
    g.lineTo(20, 48);
    g.closePath();
    g.fillPath();
    g.lineStyle(5, INK, 1);
    // 위아래 삼각형을 따로 둘러야 모래시계로 보입니다 (한 붓으로 그으면 Z 모양)
    g.strokeTriangle(20, 16, 44, 16, 32, 32);
    g.strokeTriangle(32, 32, 44, 48, 20, 48);
    g.lineBetween(16, 14, 48, 14);
    g.lineBetween(16, 50, 48, 50);
  });

  // 나왔어요 — 종 64x64
  tex(scene, "icon-bell", 64, 64, (g) => {
    disc(g, 32, 32, 29, 0xfff0c4, 5);
    g.fillStyle(0xf0a35e, 1);
    g.slice(32, 40, 18, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
    g.lineBetween(12, 40, 52, 40);
    disc(g, 32, 46, 5, INK, 0);
    g.lineBetween(32, 18, 32, 24);
  });

  // 맛있게 드시는 중 — 하트 64x64
  tex(scene, "icon-yum", 64, 64, (g) => {
    disc(g, 32, 32, 29, 0xffe3ea, 5);
    g.fillStyle(0xe8677f, 1);
    g.fillCircle(24, 26, 10);
    g.fillCircle(40, 26, 10);
    g.beginPath();
    g.moveTo(14, 30);
    g.lineTo(32, 50);
    g.lineTo(50, 30);
    g.closePath();
    g.fillPath();
  });

  // 치워주세요 — 빈 접시 96x96
  tex(scene, "icon-dirty", 96, 96, (g) => {
    oval(g, 48, 56, 76, 34, S.paper, 5);
    oval(g, 48, 54, 48, 20, 0xe6d9c2, 4);
    blob(g, 56, 22, 26, 30, 8, S.paper, 5); // 다 마신 잔
    oval(g, 69, 26, 20, 8, 0x8a6a4a, 4);
    g.fillStyle(0xc08a4e, 1); // 부스러기
    g.fillCircle(34, 52, 4);
    g.fillCircle(42, 60, 3);
  });

  // 화났어요 — 성난 표시 64x64
  tex(scene, "icon-angry", 64, 64, (g) => {
    g.lineStyle(7, 0xe0453f, 1);
    g.lineBetween(14, 14, 34, 26);
    g.lineBetween(34, 14, 14, 26);
    g.lineBetween(30, 34, 50, 46);
    g.lineBetween(50, 34, 30, 46);
  });

  // 좋아요 — 반짝임 64x64
  tex(scene, "icon-spark", 64, 64, (g) => {
    g.fillStyle(0xffd54f, 1);
    const star = (cx: number, cy: number, r: number) => {
      g.beginPath();
      g.moveTo(cx, cy - r);
      g.lineTo(cx + r * 0.28, cy - r * 0.28);
      g.lineTo(cx + r, cy);
      g.lineTo(cx + r * 0.28, cy + r * 0.28);
      g.lineTo(cx, cy + r);
      g.lineTo(cx - r * 0.28, cy + r * 0.28);
      g.lineTo(cx - r, cy);
      g.lineTo(cx - r * 0.28, cy - r * 0.28);
      g.closePath();
      g.fillPath();
    };
    star(30, 28, 22);
    star(50, 48, 12);
  });

  // 코인 48x48 — 화면에 뜨는 +금액 옆에 씁니다
  tex(scene, "icon-coin", 48, 48, (g) => {
    disc(g, 24, 24, 20, 0xf5c542, 5);
    disc(g, 24, 24, 13, 0xffe08a, 0);
    g.lineStyle(5, 0xd9a21b, 1);
    g.lineBetween(24, 15, 24, 33);
    g.beginPath();
    g.arc(24, 20, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(20));
    g.strokePath();
    g.beginPath();
    g.arc(24, 28, 5, Phaser.Math.DegToRad(160), Phaser.Math.DegToRad(340), true);
    g.strokePath();
  });
}

/* ------------------------------------------------------------------ *
 * HTML 화면(아래 메뉴바 · 상점 창)에서 쓰는 작은 아이콘
 * ------------------------------------------------------------------ */

export const uiKey = (name: string) => `ui-${name}`;
export const staffKey = (role: string) => `staff-${role}`;

function buildUiIcons(scene: Phaser.Scene) {
  const S = ART_COLORS;
  const U = (name: string, draw: Draw) => tex(scene, uiKey(name), 64, 64, draw);

  U("menu", (g) => {
    blob(g, 12, 10, 40, 46, 7, S.paper, 5); // 메뉴판
    blob(g, 23, 4, 18, 10, 4, S.steelDark, 5); // 집게
    g.lineStyle(4, INK, 0.65);
    g.lineBetween(20, 26, 44, 26);
    g.lineBetween(20, 35, 44, 35);
    g.lineBetween(20, 44, 36, 44);
  });

  U("supply", (g) => {
    // 테이프를 몸통에만 그어야 창문처럼 안 보입니다
    blob(g, 10, 26, 44, 30, 5, 0xd9a05b, 5); // 몸통
    g.lineStyle(5, INK, 1);
    g.lineBetween(32, 30, 32, 54); // 세로 테이프
    blob(g, 6, 14, 52, 14, 4, 0xe8bd82, 5); // 뚜껑
    g.lineStyle(4, INK, 0.5);
    g.lineBetween(32, 16, 32, 26); // 뚜껑이 열리는 선
  });

  U("staff", (g) => {
    disc(g, 22, 24, 12, 0xa8c8f0, 5); // 뒤쪽 사람
    g.fillStyle(0xa8c8f0, 1);
    g.slice(22, 52, 18, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
    disc(g, 42, 28, 13, 0xf4a9a8, 5); // 앞쪽 사람
    g.fillStyle(0xf4a9a8, 1);
    g.slice(42, 58, 19, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
  });

  U("store", (g) => {
    blob(g, 10, 18, 44, 38, 6, 0xe8bd82, 5); // 건물
    g.fillStyle(S.wood, 1);
    g.beginPath(); // 지붕
    g.moveTo(6, 20);
    g.lineTo(32, 6);
    g.lineTo(58, 20);
    g.closePath();
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
    blob(g, 26, 38, 14, 18, 3, S.wood, 4); // 문
    blob(g, 15, 26, 11, 10, 2, 0xdff0f5, 4); // 창문
    blob(g, 40, 26, 11, 10, 2, 0xdff0f5, 4);
  });

  U("sales", (g) => {
    blob(g, 10, 8, 44, 48, 7, S.paper, 5); // 장부
    g.fillStyle(0x7ac74f, 1); // 오르는 막대
    g.fillRect(19, 34, 7, 14);
    g.fillRect(29, 26, 7, 22);
    g.fillRect(39, 18, 7, 30);
    g.lineStyle(4, INK, 0.8);
    g.lineBetween(17, 48, 48, 48);
  });

  U("uniform", (g) => {
    // 옷걸이에 걸린 앞치마
    g.lineStyle(5, INK, 1); // 옷걸이 고리
    g.beginPath();
    g.arc(32, 14, 6, Phaser.Math.DegToRad(150), Phaser.Math.DegToRad(30), true);
    g.strokePath();
    g.lineBetween(12, 24, 32, 18);
    g.lineBetween(52, 24, 32, 18);
    blob(g, 16, 24, 32, 34, 8, 0x6f9ec4, 5); // 옷
    g.fillStyle(S.paper, 1);
    g.fillRoundedRect(23, 32, 18, 22, 5);
  });

  U("shop", (g) => {
    // 쇼핑백 — 설비·유니폼·꾸미기를 한데 모은 상점 탭 아이콘
    g.fillStyle(0xf7d08a, 1); // 가방 몸통
    g.beginPath();
    g.moveTo(12, 20);
    g.lineTo(52, 20);
    g.lineTo(48, 56);
    g.lineTo(16, 56);
    g.closePath();
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
    g.lineStyle(5, INK, 1); // 손잡이
    g.beginPath();
    g.arc(32, 18, 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(-20), false);
    g.strokePath();
    g.fillStyle(0xe4595f, 1); // 리본
    g.fillRect(28, 30, 8, 14);
  });

  U("decor", (g) => {
    // 페인트 롤러
    g.fillStyle(0x86caa5, 1); // 롤러 원통
    g.fillRoundedRect(8, 12, 34, 18, 8);
    g.lineStyle(5, INK, 1);
    g.strokeRoundedRect(8, 12, 34, 18, 8);
    g.lineStyle(6, S.steelDark, 1); // 손잡이
    g.lineBetween(30, 26, 30, 42);
    g.lineBetween(30, 42, 47, 55);
    disc(g, 47, 55, 5, S.steelDark, 3);
    disc(g, 14, 50, 6, 0xf5c542, 3); // 페인트 방울
  });

  U("fame", (g) => {
    // 메가폰 — 입소문(인지도)을 상징합니다
    g.fillStyle(0xf5a623, 1);
    g.beginPath();
    g.moveTo(10, 30);
    g.lineTo(28, 16);
    g.lineTo(28, 48);
    g.closePath();
    g.fillPath();
    g.lineStyle(4, INK, 1);
    g.strokePath();
    blob(g, 26, 20, 20, 20, 6, 0xf5a623, 4); // 나팔 몸통
    blob(g, 40, 12, 18, 36, 9, 0xffcf6b, 4); // 나팔 입구
    g.fillStyle(INK, 1);
    g.fillRoundedRect(8, 26, 6, 8, 3); // 손잡이
    g.lineStyle(3, 0xffffff, 0.8); // 퍼지는 소리
    g.beginPath();
    g.arc(58, 30, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();
    g.beginPath();
    g.arc(58, 30, 13, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330));
    g.strokePath();
  });

  U("lock", (g) => {
    // 자물쇠 고리
    g.lineStyle(6, S.steelDark, 1);
    g.beginPath();
    g.arc(32, 26, 13, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(-20), false);
    g.strokePath();
    blob(g, 12, 26, 40, 30, 7, S.steel, 5); // 몸통
    disc(g, 32, 38, 6, S.steelDark, 0); // 열쇠 구멍
    g.fillStyle(S.steelDark, 1);
    g.fillRect(29, 38, 6, 10);
  });

  U("warning", (g) => {
    g.fillStyle(0xf5c542, 1); // 삼각형
    g.beginPath();
    g.moveTo(32, 8);
    g.lineTo(58, 54);
    g.lineTo(6, 54);
    g.closePath();
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
    g.fillStyle(INK, 1);
    g.fillRoundedRect(28, 24, 8, 16, 3); // 느낌표 막대
    disc(g, 32, 46, 4, INK, 0); // 느낌표 점
  });

  U("equipment", (g) => {
    // 톱니바퀴. 스패너는 이 크기에서 뭉개져서, 톱니가 둥근 톱니바퀴로 그립니다.
    const teeth = (r: number, color: number) => {
      g.fillStyle(color, 1);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        g.fillCircle(32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21, r);
      }
    };
    teeth(10, INK);
    disc(g, 32, 32, 21, INK, 0);
    teeth(6.5, S.steel);
    disc(g, 32, 32, 17, S.steel, 0);
    disc(g, 32, 32, 7, S.steelDark, 0); // 가운데 축
  });

  /* 직원 3종 — 창에 나오는 작은 얼굴 그림 */
  const portrait = (
    g: Phaser.GameObjects.Graphics,
    shirt: number,
    extra: Draw,
  ) => {
    g.fillStyle(shirt, 1);
    g.slice(32, 60, 22, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.strokePath();
    disc(g, 32, 28, 18, SKINS[1], 5);
    disc(g, 26, 28, 3.5, INK, 0);
    disc(g, 38, 28, 3.5, INK, 0);
    g.lineStyle(4, INK, 1);
    g.beginPath();
    g.arc(32, 34, 7, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
    extra(g);
  };

  tex(scene, staffKey("barista"), 64, 64, (g) => {
    portrait(g, 0x6f9ec4, (gg) => {
      blob(gg, 16, 4, 32, 11, 5, ART_COLORS.paper, 4); // 모자
      blob(gg, 26, 46, 12, 16, 4, ART_COLORS.paper, 4); // 앞치마
    });
  });

  tex(scene, staffKey("server"), 64, 64, (g) => {
    portrait(g, 0xb2e0c6, (gg) => {
      oval(gg, 48, 48, 26, 10, ART_COLORS.paper, 4); // 쟁반
      blob(gg, 43, 38, 11, 9, 3, 0x5b3a22, 3); // 쟁반에 올린 잔
    });
  });

  tex(scene, staffKey("manager"), 64, 64, (g) => {
    portrait(g, 0x3f3a44, (gg) => {
      gg.fillStyle(ART_COLORS.paper, 1); // 셔츠 깃
      gg.fillTriangle(24, 44, 40, 44, 32, 58);
      gg.fillStyle(0xe4595f, 1); // 넥타이
      gg.fillTriangle(29, 48, 35, 48, 32, 62);
    });
  });

  // 점장 — 어깨에 걸친 코트로 구분합니다 (총괄 매니저)
  tex(scene, staffKey("gm"), 64, 64, (g) => {
    portrait(g, 0x5b5f6e, (gg) => {
      gg.fillStyle(0xdfe3ea, 1); // 어깨에 걸친 코트
      gg.fillRoundedRect(14, 42, 9, 16, 4);
      gg.fillRoundedRect(41, 42, 9, 16, 4);
      gg.lineStyle(3, INK, 1);
      gg.strokeRoundedRect(14, 42, 9, 16, 4);
      gg.strokeRoundedRect(41, 42, 9, 16, 4);
      gg.fillStyle(ART_COLORS.paper, 1); // 셔츠 깃
      gg.fillTriangle(25, 44, 39, 44, 32, 56);
      disc(gg, 32, 58, 3, 0xdfe3ea, 3); // 브로치
    });
  });
}

/* ------------------------------------------------------------------ *
 * 한 번에 만들기
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * 바깥 초원 화면 — 문을 열기 전, 카페 건물을 밖에서 보여줍니다.
 * ------------------------------------------------------------------ */

/** 마름모(아이소메트릭 타일 한 칸)를 그립니다. (cx,cy)는 타일의 가운데입니다. */
function isoTile(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill: number,
  border?: { color: number; width: number },
) {
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx - w / 2, cy);
  g.closePath();
  g.fillPath();
  if (border) {
    g.lineStyle(border.width, border.color, 1);
    g.strokePath();
  }
}

/**
 * 벽 한 면(네 귀퉁이가 꼭 평행사변형이 아니어도 되는 사다리꼴까지 포함)
 * 위에, 그 벽과 "같은 기울기"로 문·창문 같은 사각형을 얹을 때 씁니다.
 * (u=0..1은 벽의 가로, v=0..1은 벽의 세로 — v=0이 바닥, v=1이 처마입니다.)
 * 벽이 기울어진 사선인데 문은 똑바로 서 있는 것처럼 보이던 문제가,
 * 이 매핑을 쓰면 문도 벽과 같은 사선을 따라가서 자연스러워집니다.
 */
function wallFace(
  p00: { x: number; y: number },
  p10: { x: number; y: number },
  p01: { x: number; y: number },
  p11: { x: number; y: number },
) {
  const map = (u: number, v: number) => ({
    x:
      (1 - u) * (1 - v) * p00.x +
      u * (1 - v) * p10.x +
      (1 - u) * v * p01.x +
      u * v * p11.x,
    y:
      (1 - u) * (1 - v) * p00.y +
      u * (1 - v) * p10.y +
      (1 - u) * v * p01.y +
      u * v * p11.y,
  });
  const quad = (
    g: Phaser.GameObjects.Graphics,
    u0: number,
    u1: number,
    v0: number,
    v1: number,
    fill: number,
    line = 0,
    lineColor = INK,
  ) => {
    const pts = [map(u0, v0), map(u1, v0), map(u1, v1), map(u0, v1)];
    g.fillStyle(fill, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    if (line > 0) {
      g.lineStyle(line, lineColor, 1);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath();
      g.strokePath();
    }
  };
  const line = (
    g: Phaser.GameObjects.Graphics,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    color: number,
    width: number,
    alpha = 1,
  ) => {
    const a = map(u0, v0);
    const b = map(u1, v1);
    g.lineStyle(width, color, alpha);
    g.lineBetween(a.x, a.y, b.x, b.y);
  };
  const dot = (
    g: Phaser.GameObjects.Graphics,
    u: number,
    v: number,
    r: number,
    fill: number,
    lineW = 0,
  ) => {
    const p = map(u, v);
    disc(g, p.x, p.y, r, fill, lineW);
  };
  return { map, quad, line, dot };
}

/** 마름모 테두리만 그립니다 (채우기 없이) — 타일에 살짝 그림자/광택을 얹을 때 씁니다. */
function strokeDiamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: number,
  width: number,
  alpha: number,
) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx - w / 2, cy);
  g.closePath();
  g.strokePath();
}

function buildWorldArt(scene: Phaser.Scene) {
  const S = ART_COLORS;
  const SKY_TOP = 0x8fd3ec;
  const SKY_BOTTOM = 0xcdeef5;
  const SUN = 0xffe27a;
  const HILL = 0x9fcf7c;
  const GRASS = 0x8fc36b;
  const GRASS_LIGHT = 0x9ed17f;
  const PATH = 0xe6d3a0;
  const ROOF = 0xc0693a;
  const ROOF_DARK = 0x9a4f2b;
  const WALL = 0xf4e8ca;
  const WALL_SHADE = 0xe7d6ac;
  const GLASS = 0xbfe6ef;
  const FLOWERS = [0xf4a9a8, 0xf7d08a, 0xd5b8e8, 0xffffff];

  // 하늘 + 먼 언덕 + 잔디 바탕 — 화면 전체(720x1280)를 채웁니다.
  // 이 위에 "world-ground"(아이소메트릭 타일 바닥)를 겹쳐서 놓습니다.
  tex(scene, "world-bg", 720, 1280, (g) => {
    // 하늘 — 3단으로 색을 겹쳐서 부드러운 그러데이션처럼 보이게 합니다.
    const SKY_MID = 0xa9e0ee;
    g.fillStyle(SKY_TOP, 1);
    g.fillRect(0, 0, 720, 260);
    g.fillStyle(SKY_MID, 1);
    g.fillRect(0, 220, 720, 220);
    g.fillStyle(SKY_BOTTOM, 1);
    g.fillRect(0, 400, 720, 160);

    // 해 — 은은한 빛무리를 겹으로 둘러 더 따뜻하게 보이게 합니다.
    g.fillStyle(SUN, 0.18);
    g.fillCircle(590, 130, 118);
    g.fillStyle(SUN, 0.3);
    g.fillCircle(590, 130, 82);
    disc(g, 590, 130, 56, 0xfff1b8, 0);

    // 구름
    const cloud = (x: number, y: number, s: number) => {
      g.fillStyle(0xffffff, 0.92);
      g.fillEllipse(x, y, 90 * s, 40 * s);
      g.fillEllipse(x - 42 * s, y + 6 * s, 56 * s, 30 * s);
      g.fillEllipse(x + 42 * s, y + 6 * s, 56 * s, 30 * s);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(x, y + 16 * s, 70 * s, 18 * s);
    };
    cloud(150, 150, 1);
    cloud(430, 230, 0.7);
    cloud(80, 330, 0.55);

    // 먼 언덕 — 두 겹으로 깊이감을 주고, 능선을 따라 작은 나무 실루엣을 흩뿌립니다.
    const HILL_FAR = 0xb3dd93;
    g.fillStyle(HILL_FAR, 1);
    g.fillEllipse(80, 540, 380, 130);
    g.fillEllipse(640, 560, 420, 140);
    g.fillStyle(HILL, 1);
    g.fillEllipse(150, 580, 420, 160);
    g.fillEllipse(570, 600, 480, 180);

    const tree = (x: number, y: number, s: number, foliage: number) => {
      g.fillStyle(0x6f4a2c, 0.85);
      g.fillRect(x - 3 * s, y - 4 * s, 6 * s, 16 * s);
      g.fillStyle(foliage, 0.9);
      g.fillCircle(x, y - 14 * s, 15 * s);
      g.fillCircle(x - 10 * s, y - 8 * s, 11 * s);
      g.fillCircle(x + 10 * s, y - 8 * s, 11 * s);
    };
    tree(60, 560, 0.7, 0x6fae5a);
    tree(110, 575, 0.55, 0x7cbb63);
    tree(660, 580, 0.75, 0x6fae5a);
    tree(700, 595, 0.5, 0x7cbb63);
    tree(610, 600, 0.6, 0x6fae5a);

    // 들판 (아이소메트릭 타일 바닥 바깥까지 넉넉히 채워두는 바탕색) — 아래로 갈수록 살짝 짙게
    g.fillStyle(GRASS, 1);
    g.fillRect(0, 500, 720, 400);
    g.fillStyle(0x7cb35e, 1);
    g.fillRect(0, 900, 720, 380);
  });

  // 아이소메트릭 들판 구역 — 건물 하나가 칸 하나를 차지하는 큼직한 마름모
  // 구역을 깔고, 구역 사이는 굵은 흙길 테두리로 나눕니다(구역 테두리가
  // 그대로 이웃 구역과 이어지는 길이 됩니다). 나중에 건물을 더 추가할 때도
  // 같은 격자(isoToScreen)에 자리만 잡아주면 됩니다.
  const GRID = ISO_GRID_RADIUS;
  const { x: ox, y: oy } = isoGroundOrigin();
  const gw = ox * 2;
  const gh = oy * 2;
  tex(scene, "world-ground", gw, gh, (g) => {
    // (예전엔 모든 칸 한가운데에 옅은 타원 그림자를 깔아뒀는데, 건물은 칸
    // 한가운데가 아니라 앞쪽으로 당겨서 세우다 보니 그 타원이 건물과 어긋난
    // 자리에 남아 건물이 붕 떠 보이는 원인이 됐습니다. 건물 자체의 그림자
    // 만으로도 충분해서 이 칸 전체용 그림자는 없앴습니다.)
    for (let gy = -GRID; gy <= GRID; gy++) {
      for (let gx = -GRID; gx <= GRID; gx++) {
        const p = isoToScreen(gx, gy);
        isoTile(g, p.x + ox, p.y + oy, ISO_TILE_W, ISO_TILE_H, GRASS, {
          color: PATH,
          width: 26,
        });
      }
    }

    // 길에 입체감 — 안쪽으로 짙은 홈, 바깥쪽으로 밝은 하이라이트를 살짝 둘러줍니다.
    for (let gy = -GRID; gy <= GRID; gy++) {
      for (let gx = -GRID; gx <= GRID; gx++) {
        const p = isoToScreen(gx, gy);
        strokeDiamond(g, p.x + ox, p.y + oy, ISO_TILE_W, ISO_TILE_H, 0x8a6a3f, 6, 0.35);
        strokeDiamond(g, p.x + ox, p.y + oy, ISO_TILE_W - 30, ISO_TILE_H - 15, 0xf5e6bd, 4, 0.5);
      }
    }

    // 잔디 질감 — 구역마다 옅은 반점을 몇 개씩 흩뿌립니다.
    for (let gy = -GRID; gy <= GRID; gy++) {
      for (let gx = -GRID; gx <= GRID; gx++) {
        if (gx === 0 && gy === 0) continue; // 카페 자리는 건물 그림에 가려지니 생략
        const p = isoToScreen(gx, gy);
        const seed = (gx + GRID) * 7 + (gy + GRID) * 13;
        for (let i = 0; i < 5; i++) {
          const t = ((seed + i * 31) % 97) / 97;
          const u = ((seed + i * 53) % 89) / 89;
          const dx = (t - 0.5) * ISO_TILE_W * 0.6;
          const dy = (u - 0.5) * ISO_TILE_H * 0.6;
          g.fillStyle(GRASS_LIGHT, 0.55);
          g.fillEllipse(p.x + ox + dx, p.y + oy + dy, 20, 9);
        }
      }
    }

    // 작은 덤불 — 몇 칸 구석에 놓아 들판에 풍성한 느낌을 줍니다.
    const bushTiles: [number, number][] = [
      [-2, 1], [2, 1], [-2, -2], [1, 2],
    ];
    bushTiles.forEach(([gx, gy]) => {
      const p = isoToScreen(gx, gy);
      const bx = p.x + ox - ISO_TILE_W * 0.28;
      const by = p.y + oy + ISO_TILE_H * 0.22;
      g.fillStyle(0x000000, 0.1);
      g.fillEllipse(bx, by + 10, 34, 12);
      g.fillStyle(0x5f9a4a, 1);
      g.fillCircle(bx - 10, by, 13);
      g.fillCircle(bx + 10, by, 13);
      g.fillStyle(0x74b35b, 1);
      g.fillCircle(bx, by - 8, 15);
    });

    // 들꽃 — 카페 자리(0,0)는 피해서 몇 칸에만 놓습니다.
    const flowerTiles: [number, number][] = [
      [-2, -1], [2, -2], [-1, 2], [1, -2],
    ];
    flowerTiles.forEach(([gx, gy], i) => {
      const p = isoToScreen(gx, gy);
      disc(g, p.x + ox, p.y + oy, 8, FLOWERS[i % FLOWERS.length], 3);
      disc(g, p.x + ox, p.y + oy, 3, 0xf5c542, 0);
    });
  });

  // 카페 건물 — 아이소메트릭 박스(지붕 2면 + 벽 2면)로 그립니다.
  // 낮고 넓게(오두막처럼) 잡아야 자연스러워서, 벽 높이를 지붕 폭보다 낮게 둡니다.
  // 원점(이미지를 놓을 기준점)은 건물이 서는 타일의 앞쪽 꼭짓점 바닥입니다.
  const BW = 300;
  const BH = 380;
  const cx = BW / 2;
  const gcy = 290; // 바닥 마름모의 세로 중심
  const w2 = 105;
  const h2 = 52;
  const WALL_H = 120;
  tex(scene, "world-cafe-iso", BW, BH, (g) => {
    const T = { x: cx, y: gcy - h2 };
    const R = { x: cx + w2, y: gcy };
    const B = { x: cx, y: gcy + h2 };
    const L = { x: cx - w2, y: gcy };
    const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - WALL_H });
    const [Tt, Rt, Bt, Lt] = [up(T), up(R), up(B), up(L)];

    const poly = (pts: { x: number; y: number }[], fill: number) => {
      g.fillStyle(fill, 1);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath();
      g.fillPath();
      g.lineStyle(5, INK, 1);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath();
      g.strokePath();
    };

    // 바닥에 지는 그림자 — 테두리가 또렷한 타원 두 장을 겹치면 마치 받침
    // 접시 위에 건물이 얹힌 것처럼 보여서(붕 뜬 느낌의 진짜 원인이었습니다),
    // 옅은 겹을 여러 장 쌓아 가장자리가 부드럽게 번지는 그림자로 바꿨습니다.
    softShadow(g, B.x, B.y + 4, w2 * 1.3, h2 * 1.2);

    // 벽 두 면 (오른쪽이 더 어둡게 — 그늘)
    poly([B, R, Rt, Bt], WALL_SHADE);
    poly([B, L, Lt, Bt], WALL);

    // 벽이 땅과 만나는 선을 짙게 그어 건물을 바닥에 단단히 붙여줍니다.
    g.lineStyle(4, 0x000000, 0.28);
    g.lineBetween(L.x, L.y, B.x, B.y);
    g.lineBetween(B.x, B.y, R.x, R.y);

    // 왼쪽(밝은) 벽에 은은한 세로결 — 판자벽 느낌을 살짝 줍니다.
    g.lineStyle(2, 0x000000, 0.06);
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      g.lineBetween(L.x + (B.x - L.x) * t, L.y + (B.y - L.y) * t, Lt.x + (Bt.x - Lt.x) * t, Lt.y + (Bt.y - Lt.y) * t);
    }

    // 지붕 두 면 (오른쪽 = 그늘) + 용마루 선
    poly([Tt, Bt, Rt], ROOF_DARK);
    poly([Tt, Lt, Bt], ROOF);
    g.lineStyle(5, INK, 1);
    g.lineBetween(Tt.x, Tt.y, Bt.x, Bt.y);
    // 지붕 기와 결 — 왼쪽 지붕면에 용마루와 나란한 얇은 선을 몇 줄 그어 질감을 냅니다.
    g.lineStyle(2, 0x000000, 0.12);
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const a = { x: Tt.x + (Lt.x - Tt.x) * t, y: Tt.y + (Lt.y - Tt.y) * t };
      const b = { x: Bt.x + (Lt.x - Tt.x) * t, y: Bt.y + (Lt.y - Tt.y) * t };
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    // 처마에 두른 작은 깃발 줄 — 통통 튀는 느낌을 더해 더 아기자기하게 보이게 합니다.
    hangBunting(g, Lt, Rt, [ROOF, S.paper]);

    // 굴뚝 — 지붕 경사면 위에 실제로 얹혀 있도록, 오른쪽 지붕면 위의 한 점에서 세우고,
    // 통통하게+모자를 씌워 귀엽게, 몽글몽글 연기도 항상 피어오르게 합니다.
    const chimneyBase = { x: Tt.x + (Rt.x - Tt.x) * 0.4, y: Tt.y + (Rt.y - Tt.y) * 0.4 };
    blob(g, chimneyBase.x - 13, chimneyBase.y - 52, 26, 54, 8, S.woodDark, 5);
    blob(g, chimneyBase.x - 17, chimneyBase.y - 58, 34, 12, 5, S.woodDark, 5);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(chimneyBase.x, chimneyBase.y - 66, 9);
    g.fillCircle(chimneyBase.x + 8, chimneyBase.y - 80, 7);
    g.fillCircle(chimneyBase.x - 5, chimneyBase.y - 90, 6);

    // 벽면과 정확히 같은 기울기로 문·창문·차양을 얹습니다 (문이 벽과 따로 노는 문제 방지).
    const rightWall = wallFace(B, R, Bt, Rt);
    const leftWall = wallFace(B, L, Bt, Lt);

    // 문 위 차양(어닝) — 오른쪽 벽 위, 문 폭보다 넉넉하게 걸쳐서 도드라져 보이게 합니다.
    const awningStripes = 7;
    for (let i = 0; i < awningStripes; i++) {
      const u0 = 0.16 + (0.68 / awningStripes) * i;
      const u1 = u0 + 0.68 / awningStripes;
      rightWall.quad(g, u0, u1, 0.82, 0.97, i % 2 === 0 ? 0xe8973a : S.paper);
    }
    rightWall.line(g, 0.14, 0.97, 0.86, 0.97, INK, 4);
    rightWall.quad(g, 0.14, 0.86, 0.78, 0.82, INK, 0);

    // 문 (오른쪽 벽) — 벽 위아래로 여백을 남겨 문틀처럼 보이게 합니다.
    rightWall.quad(g, 0.32, 0.72, 0.05, 0.8, S.woodDark, 5);
    rightWall.quad(g, 0.37, 0.67, 0.13, 0.68, GLASS, 4);
    rightWall.quad(g, 0.4, 0.44, 0.16, 0.65, 0xffffff, 0, 0);
    rightWall.dot(g, 0.62, 0.4, 4, S.steelDark, 0);

    // 창문 (왼쪽 벽) — 창틀과 십자 창살, 창가 화분까지 왼쪽 벽 기울기에 맞춥니다.
    leftWall.quad(g, 0.28, 0.68, 0.05, 0.8, S.woodDark, 5);
    leftWall.quad(g, 0.33, 0.63, 0.13, 0.68, GLASS, 4);
    leftWall.line(g, 0.48, 0.13, 0.48, 0.68, S.woodDark, 3);
    leftWall.line(g, 0.33, 0.4, 0.63, 0.4, S.woodDark, 3);
    leftWall.quad(g, 0.24, 0.72, -0.06, 0.05, S.woodDark, 4);
    leftWall.dot(g, 0.32, -0.005, 6, 0xf4a9a8, 3);
    leftWall.dot(g, 0.48, -0.02, 6, 0xf7d08a, 3);
    leftWall.dot(g, 0.64, -0.005, 6, 0xffffff, 3);

    // 간판 (글자는 화면에서 텍스트로 따로 얹습니다)
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(Bt.x - 68, Bt.y - 25, 140, 32, 10);
    blob(g, Bt.x - 70, Bt.y - 28, 140, 32, 10, S.paper, 5);

    // 건물 앞 작은 화단 — 아늑한 느낌을 더하고, 벽 밑동을 가려 접지감도 더해줍니다.
    hedgeRow(g, L, B);
    hedgeRow(g, B, R);
  });
}

/** 처마 끝에서 처마 끝으로 늘어진 작은 삼각 깃발 줄. */
function hangBunting(
  g: Phaser.GameObjects.Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
  colors: number[],
) {
  const sag = 16;
  const at = (t: number) => ({
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * sag,
  });
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = at(i / n);
    const b = at((i + 1) / n);
    const mid = at((i + 0.5) / n);
    g.fillStyle(colors[i % colors.length], 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(mid.x, mid.y + 13);
    g.closePath();
    g.fillPath();
  }
  g.lineStyle(2, ART_COLORS.woodDark, 0.8);
  g.beginPath();
  g.moveTo(from.x, from.y);
  for (let i = 1; i <= 16; i++) {
    const p = at(i / 16);
    g.lineTo(p.x, p.y);
  }
  g.strokePath();
}

/** 건물 밑동을 따라 늘어선 작은 화단(덤불) 줄. */
function hedgeRow(
  g: Phaser.GameObjects.Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const n = 4;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(x, y + 11, 22, 8);
    g.fillStyle(0x6fae5a, 1);
    g.fillCircle(x - 4, y + 6, 8);
    g.fillCircle(x + 5, y + 7, 7);
    g.fillStyle(0x84c26a, 1);
    g.fillCircle(x, y + 3, 7);
  }
}

/** 건물 밑에 까는 부드러운 그림자. 테두리가 딱 떨어지는 타원 한두 장으로는
 * 건물이 받침 접시 위에 얹힌 것처럼 보여서(붕 떠 보이는 원인), 옅은 타원을
 * 여러 겹 포개서 가장자리가 자연스럽게 흐려지는 것처럼 눈속임합니다. */
function softShadow(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
) {
  const layers = 6;
  for (let i = layers; i >= 1; i--) {
    const t = i / layers; // 1(가장 바깥) → 1/layers(가장 안쪽)
    const scale = 0.4 + 0.9 * t;
    g.fillStyle(0x000000, 0.045);
    g.fillEllipse(cx, cy, w * scale, h * scale);
  }
}

/** 공통 뼈대(마름모 발자국, 그림자, 접지선, 화단)를 만들어 두면 분식집·포차가
 * 서로 다른 지붕 모양이어도 함께 쓸 수 있습니다. */
function buildingGround(
  g: Phaser.GameObjects.Graphics,
  B: { x: number; y: number },
  w2: number,
  h2: number,
) {
  softShadow(g, B.x, B.y + 4, w2 * 1.3, h2 * 1.2);
}

function groundContactLine(
  g: Phaser.GameObjects.Graphics,
  L: { x: number; y: number },
  B: { x: number; y: number },
  R: { x: number; y: number },
) {
  g.lineStyle(4, 0x000000, 0.28);
  g.lineBetween(L.x, L.y, B.x, B.y);
  g.lineBetween(B.x, B.y, R.x, R.y);
}

/** 아이소메트릭 박스(지붕 2면 + 벽 2면)를 그리는 카페와 같은 기법으로,
 * 분식집·포차는 지붕 모양과 문·창문 소재를 아예 다르게 그려서 한눈에
 * 다른 가게로 보이게 합니다. */
function buildRestaurantBuildings(scene: Phaser.Scene) {
  const S = ART_COLORS;
  const GLASS = 0xbfe6ef;
  const BW = 300;
  const BH = 380;
  const cx = BW / 2;
  const gcy = 290;
  const w2 = 105;
  const h2 = 52;
  const T = { x: cx, y: gcy - h2 };
  const R = { x: cx + w2, y: gcy };
  const B = { x: cx, y: gcy + h2 };
  const L = { x: cx - w2, y: gcy };

  const poly = (g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[], fill: number) => {
    g.fillStyle(fill, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.lineStyle(5, INK, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();
  };

  /* ------------------------------ 분식집: 매대 ------------------------------ */
  // 벽·지붕은 카페와 같은 오두막 기법(반듯한 벽 + 좌우 대칭 지붕)으로 맞추고,
  // 빨간 지붕·환풍 배기구·좁은 출입문·큰 통유리 진열창으로 분식집만의
  // 정체성을 살립니다.
  {
    const ROOF = 0xd0432f;
    const ROOF_DARK = 0xa8331f;
    const WALL = 0xf4e8ca;
    const WALL_SHADE = 0xe7d6ac;
    const WALL_H = 120;
    const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - WALL_H });
    const [Tt, Rt, Bt, Lt] = [up(T), up(R), up(B), up(L)];

    tex(scene, "world-bunsik-iso", BW, BH, (g) => {
      buildingGround(g, B, w2, h2);
      poly(g, [B, R, Rt, Bt], WALL_SHADE);
      poly(g, [B, L, Lt, Bt], WALL);
      groundContactLine(g, L, B, R);

      // 지붕 두 면 (카페와 같은 좌우 대칭 오두막 지붕) + 용마루 선 + 기와 결
      poly(g, [Tt, Bt, Rt], ROOF_DARK);
      poly(g, [Tt, Lt, Bt], ROOF);
      g.lineStyle(5, INK, 1);
      g.lineBetween(Tt.x, Tt.y, Bt.x, Bt.y);
      g.lineStyle(2, 0x000000, 0.14);
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const a = { x: Tt.x + (Lt.x - Tt.x) * t, y: Tt.y + (Lt.y - Tt.y) * t };
        const b = { x: Bt.x + (Lt.x - Tt.x) * t, y: Bt.y + (Lt.y - Tt.y) * t };
        g.lineBetween(a.x, a.y, b.x, b.y);
      }

      // 지붕 위 환풍 배기구 + 몽글몽글 김
      const ventBase = { x: Tt.x + (Rt.x - Tt.x) * 0.42, y: Tt.y + (Rt.y - Tt.y) * 0.42 };
      blob(g, ventBase.x - 10, ventBase.y - 40, 20, 42, 8, S.steel, 5);
      blob(g, ventBase.x - 13, ventBase.y - 46, 26, 10, 5, S.steelDark, 5);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(ventBase.x, ventBase.y - 54, 8);
      g.fillCircle(ventBase.x + 7, ventBase.y - 66, 6);
      g.fillCircle(ventBase.x - 5, ventBase.y - 76, 5);

      // 오른쪽 벽 — 좁은 출입문
      const rightWall = wallFace(B, R, Bt, Rt);
      const doorAwningColors = [ROOF, S.paper];
      for (let i = 0; i < 5; i++) {
        const u0 = 0.58 + (0.34 / 5) * i;
        rightWall.quad(g, u0, u0 + 0.34 / 5, 0.82, 0.94, doorAwningColors[i % 2]);
      }
      rightWall.line(g, 0.56, 0.94, 0.94, 0.94, INK, 4);
      rightWall.quad(g, 0.62, 0.92, 0.06, 0.8, S.woodDark, 5);
      rightWall.quad(g, 0.67, 0.87, 0.14, 0.68, GLASS, 4);
      rightWall.dot(g, 0.82, 0.42, 4, S.steelDark, 0);

      // 왼쪽 벽 — 큰 통유리 진열창 (매대 느낌)
      const leftWall = wallFace(B, L, Bt, Lt);
      leftWall.quad(g, 0.06, 0.94, 0.1, 0.82, S.woodDark, 6);
      leftWall.quad(g, 0.1, 0.9, 0.16, 0.76, GLASS, 4);
      leftWall.line(g, 0.37, 0.16, 0.37, 0.76, S.woodDark, 3);
      leftWall.line(g, 0.63, 0.16, 0.63, 0.76, S.woodDark, 3);
      leftWall.dot(g, 0.235, 0.4, 7, 0xd0432f, 2);
      leftWall.dot(g, 0.5, 0.42, 7, 0xf7d08a, 2);
      leftWall.dot(g, 0.765, 0.4, 6, 0xffffff, 2);
      leftWall.quad(g, 0.04, 0.96, 0.02, 0.09, S.woodDark, 3);
      leftWall.quad(g, 0.06, 0.94, 0.03, 0.075, 0xffffff, 0, 0);

      // 간판
      g.fillStyle(0x000000, 0.1);
      g.fillRoundedRect(Bt.x - 72, Bt.y - 26, 144, 32, 10);
      blob(g, Bt.x - 74, Bt.y - 29, 144, 32, 10, S.paper, 5);

      hedgeRow(g, L, B);
      hedgeRow(g, B, R);
    });
  }

  /* ------------------------------ 포차: 낮은 천막 ------------------------------ */
  // 벽을 낮춰 아담한 천막처럼 만들고, 처마엔 물결 모양 캔버스 술을 둘러
  // 축제 포장마차 느낌을 냅니다. 문은 유리문 대신 갈라 묶은 포장 커튼,
  // 창문 자리엔 돌돌 만 캔버스 차양으로 바꿔 카페·분식집과는 재질부터
  // 다르게 보이게 합니다.
  {
    const ROOF = 0xd9743a;
    const ROOF_DARK = 0xaa5426;
    const WALL = 0xc9a97a;
    const WALL_SHADE = 0xb08f60;
    const WALL_H = 76;
    const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - WALL_H });
    const [Tt, Rt, Bt, Lt] = [up(T), up(R), up(B), up(L)];

    tex(scene, "world-pocha-iso", BW, BH, (g) => {
      buildingGround(g, B, w2, h2);
      poly(g, [B, R, Rt, Bt], WALL_SHADE);
      poly(g, [B, L, Lt, Bt], WALL);
      groundContactLine(g, L, B, R);

      // 천막 벽 세로 재봉선
      const rightWall = wallFace(B, R, Bt, Rt);
      const leftWall = wallFace(B, L, Bt, Lt);
      for (let i = 1; i < 4; i++) {
        const u = i / 4;
        rightWall.line(g, u, 0, u, 1, 0x000000, 2, 0.1);
        leftWall.line(g, u, 0, u, 1, 0x000000, 2, 0.1);
      }

      // 지붕 (낮은 오두막 지붕 — 천막 캔버스 느낌으로 결을 성글게)
      poly(g, [Tt, Bt, Rt], ROOF_DARK);
      poly(g, [Tt, Lt, Bt], ROOF);
      g.lineStyle(5, INK, 1);
      g.lineBetween(Tt.x, Tt.y, Bt.x, Bt.y);
      g.lineStyle(2, 0x000000, 0.1);
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const a = { x: Tt.x + (Lt.x - Tt.x) * t, y: Tt.y + (Lt.y - Tt.y) * t };
        const b = { x: Bt.x + (Lt.x - Tt.x) * t, y: Bt.y + (Lt.y - Tt.y) * t };
        g.lineBetween(a.x, a.y, b.x, b.y);
      }

      // 처마 끝 물결 캔버스 술
      const scallop = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const n = 8;
        for (let i = 0; i < n; i++) {
          const t0 = i / n;
          const t1 = (i + 1) / n;
          const mid = (t0 + t1) / 2;
          const x0 = from.x + (to.x - from.x) * t0;
          const y0 = from.y + (to.y - from.y) * t0;
          const x1 = from.x + (to.x - from.x) * t1;
          const y1 = from.y + (to.y - from.y) * t1;
          const mx = from.x + (to.x - from.x) * mid;
          const my = from.y + (to.y - from.y) * mid;
          g.fillStyle(i % 2 === 0 ? ROOF : S.paper, 1);
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
          g.arc(mx, my + 3, 9, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), true);
          g.closePath();
          g.fillPath();
          g.lineStyle(2, INK, 0.6);
          g.strokePath();
        }
      };
      scallop(Lt, Bt);
      scallop(Bt, Rt);

      // 처마에 매단 홍등 두 개
      const paperLantern = (lx: number, ly: number, r: number) => {
        g.lineStyle(3, S.woodDark, 1);
        g.lineBetween(lx, ly - 14, lx, ly);
        g.fillStyle(0xffcf6b, 0.35);
        g.fillCircle(lx, ly + r * 0.1, r * 1.6);
        disc(g, lx, ly + r * 0.1, r, 0xd0432f, 4);
        g.fillStyle(S.woodDark, 1);
        g.fillRect(lx - r * 0.3, ly - r * 0.75, r * 0.6, r * 0.5);
        g.fillRect(lx - r * 0.25, ly + r * 1.2, r * 0.5, r * 0.4);
      };
      paperLantern(Bt.x - 34, Bt.y - 6, 12);
      paperLantern(Bt.x + 30, Bt.y - 2, 10);

      // 오른쪽 벽 — 갈라 묶은 포장 커튼 문
      const stripColors = [0xd0432f, S.paper, 0xd0432f, S.paper, 0xd0432f];
      for (let i = 0; i < 5; i++) {
        const u0 = 0.34 + (0.5 / 5) * i;
        rightWall.quad(g, u0, u0 + 0.5 / 5 - 0.01, 0.02, 0.86, stripColors[i]);
      }
      rightWall.quad(g, 0.34, 0.84, 0.86, 0.94, S.woodDark, 4);
      rightWall.line(g, 0.34, 0.02, 0.5, 0.5, 0x000000, 2, 0.15);
      rightWall.line(g, 0.84, 0.02, 0.68, 0.5, 0x000000, 2, 0.15);

      // 왼쪽 벽 — 돌돌 만 캔버스 차양 (열린 창 자리)
      leftWall.quad(g, 0.24, 0.76, 0.08, 0.78, 0x3a2a1c, 5);
      leftWall.quad(g, 0.29, 0.71, 0.14, 0.66, 0x2b1e14, 0, 0);
      leftWall.quad(g, 0.2, 0.8, 0.72, 0.86, S.woodDark, 4);
      leftWall.dot(g, 0.24, 0.79, 6, ROOF, 3);
      leftWall.dot(g, 0.76, 0.79, 6, ROOF, 3);

      // 천막 지지끈 — 양 옆 벽 아래 귀퉁이에서 땅으로
      const guyRope = (from: { x: number; y: number }, dx: number) => {
        g.lineStyle(2, S.woodDark, 0.8);
        g.lineBetween(from.x, from.y, from.x + dx, from.y + 26);
        disc(g, from.x + dx, from.y + 26, 4, S.woodDark, 0);
      };
      guyRope(Lt, -18);
      guyRope(Rt, 18);

      // 간판
      g.fillStyle(0x000000, 0.1);
      g.fillRoundedRect(Bt.x - 66, Bt.y - 22, 132, 30, 10);
      blob(g, Bt.x - 68, Bt.y - 25, 132, 30, 10, S.paper, 5);

      hedgeRow(g, L, B);
      hedgeRow(g, B, R);
    });
  }

  /* ------------------------------ 치킨집: 골든 후라이드 매장 ------------------------------ */
  // 카페·분식집과 같은 오두막 박스 기법이지만, 황금빛 지붕과 지붕 위 통닭
  // 버킷 사인으로 한눈에 치킨집임을 알아볼 수 있게 합니다.
  {
    const ROOF = 0xf0a83a;
    const ROOF_DARK = 0xc9861f;
    const WALL = 0xf7ddb0;
    const WALL_SHADE = 0xe8c48a;
    const WALL_H = 120;
    const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - WALL_H });
    const [Tt, Rt, Bt, Lt] = [up(T), up(R), up(B), up(L)];

    tex(scene, "world-chicken-iso", BW, BH, (g) => {
      buildingGround(g, B, w2, h2);
      poly(g, [B, R, Rt, Bt], WALL_SHADE);
      poly(g, [B, L, Lt, Bt], WALL);
      groundContactLine(g, L, B, R);

      // 지붕 두 면 (카페·분식집과 같은 좌우 대칭 오두막 지붕) + 용마루 선
      poly(g, [Tt, Bt, Rt], ROOF_DARK);
      poly(g, [Tt, Lt, Bt], ROOF);
      g.lineStyle(5, INK, 1);
      g.lineBetween(Tt.x, Tt.y, Bt.x, Bt.y);
      g.lineStyle(2, 0x000000, 0.12);
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const a = { x: Tt.x + (Lt.x - Tt.x) * t, y: Tt.y + (Lt.y - Tt.y) * t };
        const b = { x: Bt.x + (Lt.x - Tt.x) * t, y: Bt.y + (Lt.y - Tt.y) * t };
        g.lineBetween(a.x, a.y, b.x, b.y);
      }

      // 지붕 위 통닭 버킷 사인 — 치킨집임을 한눈에 알아볼 수 있게
      const bucketBase = { x: Tt.x + (Rt.x - Tt.x) * 0.4, y: Tt.y + (Rt.y - Tt.y) * 0.4 };
      g.lineStyle(3, S.woodDark, 1);
      g.lineBetween(bucketBase.x, bucketBase.y - 14, bucketBase.x, bucketBase.y);
      blob(g, bucketBase.x - 16, bucketBase.y - 52, 32, 40, 6, 0xd0432f, 5);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(bucketBase.x - 13, bucketBase.y - 46, 26, 14, 3);
      g.fillStyle(0xd0432f, 1);
      g.fillCircle(bucketBase.x, bucketBase.y - 39, 5);
      g.fillStyle(0xd8934a, 1);
      g.fillCircle(bucketBase.x - 8, bucketBase.y - 56, 7);
      g.fillCircle(bucketBase.x + 7, bucketBase.y - 58, 7);

      const rightWall = wallFace(B, R, Bt, Rt);
      const leftWall = wallFace(B, L, Bt, Lt);

      // 문 위 차양(어닝) — 골드·화이트 줄무늬
      const awningStripes = 7;
      for (let i = 0; i < awningStripes; i++) {
        const u0 = 0.16 + (0.68 / awningStripes) * i;
        const u1 = u0 + 0.68 / awningStripes;
        rightWall.quad(g, u0, u1, 0.82, 0.97, i % 2 === 0 ? ROOF : S.paper);
      }
      rightWall.line(g, 0.14, 0.97, 0.86, 0.97, INK, 4);

      // 문 (오른쪽 벽)
      rightWall.quad(g, 0.32, 0.72, 0.05, 0.8, S.woodDark, 5);
      rightWall.quad(g, 0.37, 0.67, 0.13, 0.68, GLASS, 4);
      rightWall.dot(g, 0.62, 0.4, 4, S.steelDark, 0);

      // 왼쪽 벽 — 큰 통유리 진열창, 튀김기의 따뜻한 불빛이 은은히 비칩니다
      leftWall.quad(g, 0.28, 0.68, 0.05, 0.8, S.woodDark, 5);
      leftWall.quad(g, 0.33, 0.63, 0.13, 0.68, 0xffd9a0, 4);
      leftWall.line(g, 0.48, 0.13, 0.48, 0.68, S.woodDark, 3);
      leftWall.line(g, 0.33, 0.4, 0.63, 0.4, S.woodDark, 3);

      // 간판
      g.fillStyle(0x000000, 0.1);
      g.fillRoundedRect(Bt.x - 70, Bt.y - 26, 140, 32, 10);
      blob(g, Bt.x - 72, Bt.y - 29, 140, 32, 10, S.paper, 5);

      hedgeRow(g, L, B);
      hedgeRow(g, B, R);
    });
  }

  /* ------------------------------ 편의점: 모던 박스 매장 ------------------------------ */
  // 다른 가게들과 달리 뾰족지붕 대신 평평한 지붕을 얹어 "모던한 편의점"
  // 느낌을 내고, 벽 위쪽에 두른 파란 사인 띠로 정체성을 살립니다.
  {
    const WALL = 0xeef1f3;
    const WALL_SHADE = 0xd7dde2;
    const SIGN = 0x2f6f6a;
    const WALL_H = 130;
    const ROOF_H = 16;
    const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - WALL_H });
    const upRoof = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - WALL_H - ROOF_H });
    const [, Rt, Bt, Lt] = [up(T), up(R), up(B), up(L)];
    const [Tr, Rr, Br, Lr] = [upRoof(T), upRoof(R), upRoof(B), upRoof(L)];

    tex(scene, "world-mart-iso", BW, BH, (g) => {
      buildingGround(g, B, w2, h2);
      poly(g, [B, R, Rt, Bt], WALL_SHADE);
      poly(g, [B, L, Lt, Bt], WALL);
      groundContactLine(g, L, B, R);

      // 평평한 지붕 — 옆면(파샤) 두 면 + 윗면, 각지고 모던하게
      poly(g, [Bt, Rt, Rr, Br], 0xb9c0c7);
      poly(g, [Bt, Lt, Lr, Br], 0xcfd5da);
      poly(g, [Tr, Lr, Br, Rr], 0xe4e8eb);
      g.lineStyle(3, INK, 0.6);
      g.lineBetween(Tr.x, Tr.y, Br.x, Br.y);

      const rightWall = wallFace(B, R, Bt, Rt);
      const leftWall = wallFace(B, L, Bt, Lt);

      // 벽 위쪽에 두른 편의점 사인 띠
      rightWall.quad(g, 0, 1, 0, 0.2, SIGN);
      leftWall.quad(g, 0, 1, 0, 0.2, SIGN);
      rightWall.line(g, 0, 0.2, 1, 0.2, INK, 3);
      leftWall.line(g, 0, 0.2, 1, 0.2, INK, 3);

      // 큰 통유리 자동문 (오른쪽 벽)
      rightWall.quad(g, 0.1, 0.9, 0.24, 0.94, S.steelDark, 5);
      rightWall.quad(g, 0.14, 0.86, 0.28, 0.9, 0xdff0f5, 4);
      rightWall.line(g, 0.5, 0.28, 0.5, 0.9, S.steelDark, 3);

      // 왼쪽 벽 — 큰 진열창(냉장고 불빛이 비치는 느낌)
      leftWall.quad(g, 0.1, 0.9, 0.24, 0.94, S.steelDark, 5);
      leftWall.quad(g, 0.14, 0.86, 0.28, 0.9, 0xdff0f5, 4);
      leftWall.line(g, 0.35, 0.28, 0.35, 0.9, S.steelDark, 2);
      leftWall.line(g, 0.65, 0.28, 0.65, 0.9, S.steelDark, 2);

      // 문 앞 작은 입간판 스탠드
      const standBase = { x: Bt.x + 58, y: Bt.y + 4 };
      blob(g, standBase.x - 12, standBase.y - 40, 24, 40, 4, 0xffffff, 4);
      g.fillStyle(SIGN, 1);
      g.fillRect(standBase.x - 12, standBase.y - 40, 24, 8);

      // 간판
      g.fillStyle(0x000000, 0.1);
      g.fillRoundedRect(Bt.x - 64, Bt.y - 22, 128, 30, 10);
      blob(g, Bt.x - 66, Bt.y - 25, 128, 30, 10, S.paper, 5);

      hedgeRow(g, L, B);
      hedgeRow(g, B, R);
    });
  }
}

let built = false;

/** 게임이 켜질 때 한 번만 부르면 됩니다. */
export function buildArt(scene: Phaser.Scene) {
  if (built) return;
  buildPeople(scene);
  buildMenuArt(scene);
  buildEquipment(scene);
  buildBunsikArt(scene);
  buildPochaArt(scene);
  buildRestaurantEquipment(scene);
  buildFurniture(scene);
  buildBubbles(scene);
  buildIcons(scene);
  buildUiIcons(scene);
  buildWorldArt(scene);
  buildRestaurantBuildings(scene);
  built = true;
}

/**
 * 만들어둔 그림을 HTML 화면(상점·메뉴 창)에서도 쓸 수 있게
 * data URL 로 뽑아둡니다. 캔버스와 창의 그림이 같아 보이게 하려는 것입니다.
 */
const iconUrls: Record<string, string> = {};

/** HTML 쪽에서 쓸 그림들을 data URL 로 뽑아둡니다 */
export function publishIconUrls(scene: Phaser.Scene) {
  const keys = [
    "icon-coin",
    ...ALL_RESTAURANTS_MENU.map((m) => itemKey(m.id)),
    ...ALL_RESTAURANTS_EQUIPMENT.map((e) => equipKey(e.id)),
    ...["barista", "server", "manager", "gm"].map(staffKey),
    ...UNIFORMS.map((u) => personKey(u.id)),
    ...decorOfSlot("chair").map((d) => chairKey(d.id)),
    ...decorOfSlot("table").map((d) => tableKey(d.id)),
    ...decorOfSlot("door").map((d) => doorKey(d.id)),
    ...decorOfSlot("register").map((d) => registerKey(d.id)),
    ...[
      "menu",
      "supply",
      "staff",
      "store",
      "shop",
      "equipment",
      "sales",
      "uniform",
      "decor",
      "fame",
      "lock",
      "warning",
    ].map(uiKey),
  ];
  for (const key of keys) {
    if (iconUrls[key] || !scene.textures.exists(key)) continue;
    iconUrls[key] = scene.textures.getBase64(key);
  }
}

export function iconUrl(key: string): string | undefined {
  return iconUrls[key];
}
