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
import { ALL_MENU, decorOfSlot, EQUIPMENT, UNIFORMS, type UniformSlot } from "./config";

/** 2배로 그린 그림을 화면에 올릴 때 줄이는 비율 */
export const ART_SCALE = 0.5;

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

let built = false;

/** 게임이 켜질 때 한 번만 부르면 됩니다. */
export function buildArt(scene: Phaser.Scene) {
  if (built) return;
  buildPeople(scene);
  buildMenuArt(scene);
  buildEquipment(scene);
  buildFurniture(scene);
  buildBubbles(scene);
  buildIcons(scene);
  buildUiIcons(scene);
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
    ...ALL_MENU.map((m) => itemKey(m.id)),
    ...EQUIPMENT.map((e) => equipKey(e.id)),
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
