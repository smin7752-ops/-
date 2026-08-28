import Phaser from "phaser";
import { CafeScene, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./scenes/CafeScene";
import { gameState } from "./game/state";
import { mountUI } from "./ui/overlay";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#1a120b",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
  },
  // HTML UI (shop modal, buttons) overlays the canvas; without this, Phaser's
  // window-level pointer fallback still hit-tests those clicks against game
  // objects underneath, since it ignores the click's real DOM target.
  input: {
    windowEvents: false,
  },
  scene: [CafeScene],
});

const uiRoot = document.getElementById("ui-root");
if (uiRoot) mountUI(uiRoot, gameState);

window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") gameState.save();
});
window.addEventListener("beforeunload", () => gameState.save());
