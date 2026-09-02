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

/**
 * 어딘가에서 예상 못한 오류가 나서 게임이 멈춰버렸을 때, 화면이 그냥
 * 까맣게 굳어버리는 대신 "다시 시작하기" 버튼이 있는 안내를 보여줍니다.
 * (버튼을 누르면 저장된 데이터로 새로고침하니 진행 상황은 안전해요.)
 */
function showFatalError(detail: string) {
  if (document.getElementById("fatal-error-overlay")) return;
  try {
    gameState.save();
  } catch {
    // 저장이 안 되더라도 최소한 안내는 보여줍니다.
  }

  const overlay = document.createElement("div");
  overlay.id = "fatal-error-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:rgba(26,18,11,0.97);" +
    "color:#fffaf2;display:flex;flex-direction:column;align-items:center;" +
    "justify-content:center;padding:24px;text-align:center;" +
    "font-family:system-ui,sans-serif;";
  overlay.innerHTML = `
    <div style="font-size:40px;margin-bottom:12px;">😵</div>
    <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">문제가 생겨서 화면이 멈췄어요</div>
    <div style="font-size:14px;opacity:0.85;margin-bottom:20px;max-width:320px;line-height:1.5;">
      아래 버튼을 누르면 다시 시작돼요. 지금까지 진행 상황은 저장되어 있으니 걱정 마세요.
    </div>
    <button id="fatal-error-reload" style="padding:14px 32px;border-radius:999px;border:none;
      background:#e8b04b;color:#3b2a20;font-weight:bold;font-size:16px;">다시 시작하기</button>
    <div style="margin-top:24px;font-size:11px;opacity:0.5;max-width:320px;word-break:break-all;">${detail.slice(0, 300)}</div>
  `;
  document.body.appendChild(overlay);
  overlay
    .querySelector("#fatal-error-reload")
    ?.addEventListener("click", () => window.location.reload());
}

window.addEventListener("error", (e) => {
  showFatalError(e.message || String(e.error ?? "알 수 없는 오류"));
});
window.addEventListener("unhandledrejection", (e) => {
  showFatalError(String(e.reason));
});

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
  // 홈 화면에 설치한 폰 앱에서는 화면을 껐다 켜거나 다른 앱을 오갈 때,
  // 브라우저의 기본 화면 갱신 신호(requestAnimationFrame)가 다시 안
  // 살아나서 게임 전체가 완전히 멈춰버리는 기기가 있습니다. 대신 타이머
  // 방식(setTimeout)으로 화면을 갱신하면 이 문제 없이 항상 다시 깨어납니다.
  fps: {
    forceSetTimeOut: true,
  },
  // HTML UI(상점 창, 버튼)가 캔버스 위에 겹쳐 있습니다. 이 옵션이 없으면
  // Phaser가 window 단위로 클릭을 한 번 더 잡아서, HTML 버튼을 눌렀는데
  // 캔버스 아래의 게임 오브젝트까지 같이 눌리는 문제가 생깁니다.
  input: {
    windowEvents: false,
    // 두 손가락 확대·축소(핀치)를 쓰려면 두 번째 손가락 포인터도 추적해야
    // 합니다. 기본값은 1이라 두 번째 손가락이 아예 안 잡혀서, 그 상태에서
    // pointer2를 읽으려 하면 곧바로 튕겼습니다.
    activePointers: 2,
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
