import { bus, EVENTS } from "../game/bus";
import {
  MAX_STAFF_LEVEL,
  MAX_TABLES,
  staffCost,
  tableCost,
} from "../game/config";
import type { GameState } from "../game/state";

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

export function mountUI(root: HTMLElement, state: GameState) {
  root.innerHTML = `
    <div class="top-bar ui-interactive">
      <div class="coin-pill">🪙 <span id="coin-count">0</span></div>
    </div>
    <div class="bottom-bar ui-interactive">
      <button id="shop-btn" class="primary-btn">🛒 상점</button>
    </div>
    <div id="shop-modal" class="modal hidden ui-interactive">
      <div class="modal-card">
        <div class="modal-header">
          <h2>상점</h2>
          <button id="shop-close" class="icon-btn">✕</button>
        </div>
        <div class="modal-body" id="shop-body"></div>
      </div>
    </div>
    <div id="offline-modal" class="modal hidden ui-interactive">
      <div class="modal-card">
        <div class="modal-header"><h2>다시 오셨네요! ☕</h2></div>
        <div class="modal-body" id="offline-body"></div>
        <button id="offline-close" class="primary-btn">확인</button>
      </div>
    </div>
  `;

  injectStyles();

  const coinCountEl = root.querySelector("#coin-count") as HTMLElement;
  const shopModal = root.querySelector("#shop-modal") as HTMLElement;
  const shopBody = root.querySelector("#shop-body") as HTMLElement;
  const offlineModal = root.querySelector("#offline-modal") as HTMLElement;
  const offlineBody = root.querySelector("#offline-body") as HTMLElement;

  function refreshCoins() {
    coinCountEl.textContent = formatNumber(state.data.coins);
  }

  function renderShop() {
    const tableNext = tableCost(state.data.tables);
    const tablesMaxed = state.data.tables >= MAX_TABLES;
    const staffNext = staffCost(state.data.staffLevel);
    const staffMaxed = state.data.staffLevel >= MAX_STAFF_LEVEL;
    const nextMenu = state.nextLockedMenu();

    const rows: string[] = [];

    rows.push(`<h3>테이블</h3>`);
    rows.push(
      shopRow({
        label: `테이블 ${state.data.tables}개 → ${state.data.tables + 1}개`,
        sub: "손님을 더 많이 받을 수 있어요",
        cost: tablesMaxed ? null : tableNext,
        maxed: tablesMaxed,
        id: "buy-table",
        affordable: state.data.coins >= tableNext,
      }),
    );

    rows.push(`<h3>바리스타 직원</h3>`);
    rows.push(
      shopRow({
        label: staffMaxed
          ? "최고 레벨 달성!"
          : `직원 레벨 ${state.data.staffLevel} → ${state.data.staffLevel + 1}`,
        sub: "자동으로 손님을 응대해줘요 (자리 비워도 돈을 벌어요)",
        cost: staffMaxed ? null : staffNext,
        maxed: staffMaxed,
        id: "buy-staff",
        affordable: state.data.coins >= staffNext,
      }),
    );

    rows.push(`<h3>메뉴</h3>`);
    if (nextMenu) {
      rows.push(
        shopRow({
          label: `${nextMenu.emoji} ${nextMenu.name} 메뉴 추가`,
          sub: `손님당 보상 ${nextMenu.reward}코인`,
          cost: nextMenu.unlockCost,
          maxed: false,
          id: "buy-menu",
          affordable: state.data.coins >= nextMenu.unlockCost,
        }),
      );
    } else {
      rows.push(`<p class="muted">모든 메뉴를 잠금 해제했어요!</p>`);
    }

    shopBody.innerHTML = rows.join("");

    shopBody
      .querySelector("#buy-table")
      ?.addEventListener("click", () => buyTable());
    shopBody
      .querySelector("#buy-staff")
      ?.addEventListener("click", () => buyStaff());
    shopBody
      .querySelector("#buy-menu")
      ?.addEventListener("click", () => buyMenu());
  }

  function shopRow(opts: {
    label: string;
    sub: string;
    cost: number | null;
    maxed: boolean;
    id: string;
    affordable: boolean;
  }) {
    const disabled = opts.maxed || !opts.affordable;
    const btnText = opts.maxed ? "완료" : `🪙 ${formatNumber(opts.cost ?? 0)}`;
    return `
      <div class="shop-row">
        <div>
          <div class="shop-row-label">${opts.label}</div>
          <div class="shop-row-sub">${opts.sub}</div>
        </div>
        <button id="${opts.id}" class="buy-btn" ${disabled ? "disabled" : ""}>${btnText}</button>
      </div>
    `;
  }

  function buyTable() {
    const cost = tableCost(state.data.tables);
    if (state.data.tables >= MAX_TABLES) return;
    if (!state.spendCoins(cost)) return;
    state.data.tables += 1;
    state.save();
    bus.emit(EVENTS.TABLES_CHANGED);
    refreshCoins();
    renderShop();
  }

  function buyStaff() {
    const cost = staffCost(state.data.staffLevel);
    if (state.data.staffLevel >= MAX_STAFF_LEVEL) return;
    if (!state.spendCoins(cost)) return;
    state.data.staffLevel += 1;
    state.save();
    bus.emit(EVENTS.STAFF_CHANGED);
    refreshCoins();
    renderShop();
  }

  function buyMenu() {
    const next = state.nextLockedMenu();
    if (!next) return;
    if (!state.spendCoins(next.unlockCost)) return;
    state.data.unlockedMenuIds.push(next.id);
    state.save();
    bus.emit(EVENTS.MENU_CHANGED);
    refreshCoins();
    renderShop();
  }

  root.querySelector("#shop-btn")?.addEventListener("click", () => {
    renderShop();
    shopModal.classList.remove("hidden");
  });
  root.querySelector("#shop-close")?.addEventListener("click", () => {
    shopModal.classList.add("hidden");
  });

  bus.on(EVENTS.OPEN_SHOP, () => {
    renderShop();
    shopModal.classList.remove("hidden");
  });
  bus.on(EVENTS.COINS_CHANGED, () => {
    refreshCoins();
    if (!shopModal.classList.contains("hidden")) renderShop();
  });

  if (state.offlineEarnings > 0) {
    const hours = Math.floor(state.offlineDurationMs / 3600000);
    const minutes = Math.floor((state.offlineDurationMs % 3600000) / 60000);
    const timeStr =
      hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
    offlineBody.innerHTML = `
      <p>자리를 비운 <b>${timeStr}</b> 동안</p>
      <p class="offline-earn">🪙 +${formatNumber(state.offlineEarnings)}</p>
      <p class="muted">바리스타 직원이 대신 벌어줬어요</p>
    `;
    offlineModal.classList.remove("hidden");
  }
  root.querySelector("#offline-close")?.addEventListener("click", () => {
    offlineModal.classList.add("hidden");
  });

  refreshCoins();
}

function injectStyles() {
  if (document.getElementById("ui-styles")) return;
  const style = document.createElement("style");
  style.id = "ui-styles";
  style.textContent = `
    #ui-root .top-bar {
      position: absolute;
      top: max(12px, env(safe-area-inset-top));
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
    }
    #ui-root .coin-pill {
      background: rgba(0,0,0,0.55);
      padding: 8px 18px;
      border-radius: 999px;
      font-size: 18px;
      font-weight: 700;
    }
    #ui-root .bottom-bar {
      position: absolute;
      bottom: max(16px, env(safe-area-inset-bottom));
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
    }
    #ui-root .primary-btn {
      background: #e8973a;
      color: #3b2410;
      border: none;
      padding: 14px 28px;
      border-radius: 16px;
      font-size: 18px;
      font-weight: 800;
      box-shadow: 0 4px 0 #b4701f;
    }
    #ui-root .primary-btn:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #b4701f;
    }
    #ui-root .modal {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    #ui-root .modal.hidden { display: none; }
    #ui-root .modal-card {
      background: #fff8ec;
      color: #3b2410;
      width: min(420px, 100%);
      max-height: 80vh;
      overflow-y: auto;
      border-radius: 20px;
      padding: 20px;
    }
    #ui-root .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    #ui-root .modal-header h2 { margin: 0; font-size: 22px; }
    #ui-root .icon-btn {
      background: none;
      border: none;
      font-size: 20px;
      color: #3b2410;
    }
    #ui-root h3 {
      font-size: 15px;
      margin: 16px 0 6px;
      color: #8a5a34;
    }
    #ui-root .shop-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #ecdcc0;
    }
    #ui-root .shop-row-label { font-weight: 700; font-size: 15px; }
    #ui-root .shop-row-sub { font-size: 12px; color: #8a7a63; margin-top: 2px; }
    #ui-root .buy-btn {
      background: #7ac74f;
      color: #1e3a10;
      border: none;
      padding: 10px 14px;
      border-radius: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    #ui-root .buy-btn:disabled {
      background: #d7cdb8;
      color: #8a7a63;
    }
    #ui-root .muted { color: #8a7a63; font-size: 14px; }
    #ui-root .offline-earn {
      font-size: 28px;
      font-weight: 800;
      color: #e8973a;
      text-align: center;
    }
    #ui-root #offline-body p { text-align: center; }
  `;
  document.head.appendChild(style);
}
