import Phaser from "phaser";
import { CafeScene, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./scenes/CafeScene";
import { WorldScene } from "./scenes/WorldScene";
import { gameState } from "./game/state";
import { sim } from "./game/sim";
import { bus, EVENTS } from "./game/bus";
import { OFFLINE_MIN_AWAY_MS } from "./game/config";
import { mountUI } from "./ui/overlay";

// 개발 중에만 브라우저 콘솔에서 상태를 들여다볼 수 있게 열어둡니다.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = { state: gameState, sim };
}

/** 개발 중에만: 코드로 그린 그림들을 한눈에 확인할 수 있게 열어둡니다. */
function exposeGameForDebug(game: Phaser.Game) {
  if (!import.meta.env.DEV) return;
  (window as unknown as Record<string, unknown>).__phaser = game;
}

// 자리를 비운 동안 번 돈은 화면을 그리기 전에 먼저 정산합니다.
gameState.applyOfflineEarnings();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#1a120b",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
  },
  // HTML UI(상점 창, 버튼)가 캔버스 위에 겹쳐 있습니다. 이 옵션이 없으면
  // Phaser가 window 단위로 클릭을 한 번 더 잡아서, HTML 버튼을 눌렀는데
  // 캔버스 아래의 게임 오브젝트까지 같이 눌리는 문제가 생깁니다.
  input: {
    windowEvents: false,
  },
  scene: [WorldScene, CafeScene],
});

exposeGameForDebug(game);

const uiRoot = document.getElementById("ui-root");
if (uiRoot) {
  mountUI(uiRoot);
  // 문을 열기 전(초원 화면)에는 위·아래 게임 버튼들을 감춰둡니다.
  uiRoot.style.display = "none";
  bus.on(EVENTS.ENTERED_CAFE, () => {
    uiRoot.style.display = "";
  });
  bus.on(EVENTS.EXIT_TO_WORLD_DONE, () => {
    uiRoot.style.display = "none";
  });
}

// 폰에서는 앱을 왔다갔다 하는 일이 잦습니다. 화면을 벗어나면 저장하고,
// 돌아왔을 때 그동안 벌어둔 돈이 있으면 정산해서 보여줍니다.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    gameState.save();
    return;
  }
  const awayMs = Date.now() - gameState.data.lastSavedAt;
  if (awayMs > OFFLINE_MIN_AWAY_MS) {
    gameState.applyOfflineEarnings();
    if (gameState.offlineEarnings > 0) bus.emit(EVENTS.OFFLINE_REWARD);
  }
  gameState.save();
});
window.addEventListener("beforeunload", () => gameState.save());

// 홈 화면에 추가해서 앱처럼 쓸 수 있게 해주는 서비스 워커
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // 오프라인 캐시는 없어도 게임은 정상 동작합니다.
    });
  });
  // 앱을 오래 켜두고 있는 동안 새 버전이 배포되면(백그라운드에서 새 서비스
  // 워커가 활성화되면), 지금 켜져 있는 화면은 저장 데이터를 최신 상태로
  // 남겨둔 채 새로고침해서 최신 버전으로 자동으로 넘어갑니다. 안 그러면
  // 앱을 껐다 켜기 전까지 방금 고친 버그가 화면에 반영되지 않습니다.
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    gameState.save();
    window.location.reload();
  });
}
