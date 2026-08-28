import { bus, EVENTS } from "../game/bus";
import {
  AUTO_RESTOCK_THRESHOLD,
  EQUIPMENT,
  GENERAL_MANAGER_COST,
  MAX_FLOORS,
  MAX_ROLE_LEVEL,
  ROLE_INFO,
  SETS,
  SUPPLY_BATCH,
  TABLES_PER_FLOOR,
  floorUnlockCost,
  menuById,
  roleCost,
  tableCost,
  type Category,
  type Role,
} from "../game/config";
import {
  DESSERTS,
  DRINKS,
  gameState,
  levelProgressRatio,
  levelProgressText,
} from "../game/state";
import { sim } from "../game/sim";
import { injectStyles } from "./styles";

type PanelId = "menu" | "supply" | "staff" | "store" | "equipment";

const PANEL_TITLES: Record<PanelId, string> = {
  menu: "메뉴",
  supply: "발주",
  staff: "직원",
  store: "매장",
  equipment: "설비",
};

function num(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

/**
 * 한국어 조사 붙이기. 마지막 글자에 받침이 있으면 앞쪽,
 * 없으면 뒤쪽 조사를 씁니다. ("아메리카노를" / "크루아상을")
 */
function withParticle(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangul) return `${word}${withoutBatchim}`;
  const hasBatchim = (last - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
}

export function mountUI(root: HTMLElement) {
  injectStyles();

  root.innerHTML = `
    <div class="top-bar ui-interactive">
      <div class="coin-pill">🪙 <span id="coin-count">0</span></div>
      <div class="floor-tabs" id="floor-tabs"></div>
      <div class="warn-banner hidden" id="stock-warn">📦 재고가 없어요! 발주를 넣어주세요</div>
    </div>

    <div class="bottom-bar ui-interactive">
      <button class="nav-btn" data-panel="menu"><span class="ico">📋</span>메뉴</button>
      <button class="nav-btn" data-panel="supply"><span class="ico">📦</span>발주<span class="badge hidden" id="supply-badge"></span></button>
      <button class="nav-btn" data-panel="staff"><span class="ico">👥</span>직원</button>
      <button class="nav-btn" data-panel="store"><span class="ico">🏢</span>매장</button>
      <button class="nav-btn" data-panel="equipment"><span class="ico">🔧</span>설비</button>
    </div>

    <div id="panel-modal" class="modal hidden ui-interactive">
      <div class="modal-card">
        <div class="modal-header">
          <h2 id="panel-title">메뉴</h2>
          <button id="panel-close" class="icon-btn">✕</button>
        </div>
        <div class="modal-body" id="panel-body"></div>
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

  const coinEl = root.querySelector("#coin-count") as HTMLElement;
  const tabsEl = root.querySelector("#floor-tabs") as HTMLElement;
  const warnEl = root.querySelector("#stock-warn") as HTMLElement;
  const supplyBadge = root.querySelector("#supply-badge") as HTMLElement;
  const modal = root.querySelector("#panel-modal") as HTMLElement;
  const titleEl = root.querySelector("#panel-title") as HTMLElement;
  const bodyEl = root.querySelector("#panel-body") as HTMLElement;

  let activeFloor = 0;
  let openPanel: PanelId | null = null;

  /* --------------------------- 공통 갱신 --------------------------- */

  function refreshCoins() {
    coinEl.textContent = num(gameState.data.coins);
  }

  function refreshWarnings() {
    warnEl.classList.toggle("hidden", !gameState.isOutOfStock());
    const low = gameState
      .sellableItems()
      .some((m) => gameState.stockOf(m.id) < AUTO_RESTOCK_THRESHOLD);
    supplyBadge.classList.toggle("hidden", !low);
  }

  function refreshTabs() {
    const parts: string[] = [];
    for (let i = 0; i < MAX_FLOORS; i++) {
      const unlocked = gameState.floor(i).unlocked;
      const cls = [
        "floor-tab",
        i === activeFloor ? "active" : "",
        unlocked ? "" : "locked",
      ]
        .filter(Boolean)
        .join(" ");
      const dot = unlocked && sim.needsAttention(i) ? `<span class="dot"></span>` : "";
      parts.push(
        `<button class="${cls}" data-floor="${i}">${unlocked ? `${i + 1}층` : "🔒"}${dot}</button>`,
      );
    }
    tabsEl.innerHTML = parts.join("");
    tabsEl.querySelectorAll<HTMLElement>("[data-floor]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.floor);
        if (!gameState.floor(index).unlocked) {
          showPanel("store");
          return;
        }
        activeFloor = index;
        bus.emit(EVENTS.FLOOR_SWITCHED, index);
        refreshTabs();
        if (openPanel) renderPanel();
      });
    });
  }

  function refreshAll() {
    refreshCoins();
    refreshWarnings();
    refreshTabs();
    if (openPanel) renderPanel();
  }

  /* ----------------------------- 패널 ----------------------------- */

  function showPanel(id: PanelId) {
    openPanel = id;
    titleEl.textContent = PANEL_TITLES[id];
    modal.classList.remove("hidden");
    renderPanel();
  }

  function closePanel() {
    openPanel = null;
    modal.classList.add("hidden");
  }

  function renderPanel() {
    if (!openPanel) return;
    switch (openPanel) {
      case "menu":
        renderMenuPanel();
        break;
      case "supply":
        renderSupplyPanel();
        break;
      case "staff":
        renderStaffPanel();
        break;
      case "store":
        renderStorePanel();
        break;
      case "equipment":
        renderEquipmentPanel();
        break;
    }
  }

  /** 버튼에 클릭 핸들러를 붙이는 도우미 (패널을 다시 그릴 때마다 새로 붙습니다) */
  function wire(selector: string, handler: (el: HTMLElement) => void) {
    bodyEl.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.addEventListener("click", () => handler(el));
    });
  }

  /* ---------------------------- 메뉴 패널 ---------------------------- */

  function menuSection(title: string, category: Category): string {
    const rows: string[] = [`<h3>${title}</h3>`];
    for (const item of category === "drink" ? DRINKS : DESSERTS) {
      const p = gameState.progress(item.id);
      const recipe = gameState.isRecipeUnlocked(item.id);
      const equipped = gameState.hasEquipment(item.equipmentId);
      const equipName = EQUIPMENT.find((e) => e.id === item.equipmentId)?.name ?? "";

      if (!recipe) {
        const list = category === "drink" ? DRINKS : DESSERTS;
        const prev = list[list.findIndex((m) => m.id === item.id) - 1];
        rows.push(`
          <div class="row locked">
            <div class="row-main">
              <div class="row-label">🔒 ???</div>
              <div class="row-sub">${withParticle(prev.name, "을", "를")} Lv.${item.unlockPrevLevel} 까지 키우면 열려요</div>
            </div>
          </div>`);
        continue;
      }

      const sub = equipped
        ? `판매가 ${num(gameState.priceOf(item.id))}코인 · 원가 ${item.supplyCost}`
        : `⚠️ ${equipName} 설비가 필요해요`;
      rows.push(`
        <div class="row ${equipped ? "" : "locked"}">
          <div class="row-main">
            <div class="row-label">${item.emoji} ${item.name}
              <span class="pill">Lv.${p.level}</span>
              <span class="muted" style="font-size:11px">${levelProgressText(p)}</span>
            </div>
            <div class="row-sub">${sub}</div>
            <div class="lv-bar"><i style="width:${levelProgressRatio(p) * 100}%"></i></div>
          </div>
        </div>`);
    }
    return rows.join("");
  }

  function renderMenuPanel() {
    const sets = SETS.map((set) => {
      const ok =
        gameState.isSellable(set.drinkId) && gameState.isSellable(set.dessertId);
      const drink = menuById(set.drinkId);
      const dessert = menuById(set.dessertId);
      if (!ok) {
        return `
          <div class="row locked">
            <div class="row-main">
              <div class="row-label">🔒 ${set.name}</div>
              <div class="row-sub">${drink.name} + ${dessert.name} 를 모두 팔 수 있게 되면 열려요</div>
            </div>
          </div>`;
      }
      return `
        <div class="row">
          <div class="row-main">
            <div class="row-label">${set.emoji} ${set.name}</div>
            <div class="row-sub">${drink.emoji} ${drink.name} + ${dessert.emoji} ${dessert.name}
              · 보너스 +${Math.round((set.bonusRate - 1) * 100)}%</div>
          </div>
          <div class="buy-btn" style="background:#f0e3ca;color:#7a5a33">🪙 ${num(gameState.setPrice(set))}</div>
        </div>`;
    }).join("");

    bodyEl.innerHTML = `
      <div class="note">메뉴는 팔 때마다 경험치가 쌓여 레벨이 오르고, 레벨이 오르면 판매가가 올라가요.
      앞 메뉴를 일정 레벨까지 키우면 다음 메뉴가 열립니다.</div>
      ${menuSection("음료", "drink")}
      ${menuSection("디저트", "dessert")}
      <h3>세트 메뉴</h3>
      ${sets}
      <div class="note">세트가 열리면 손님이 가끔 세트로 주문해요. 단품보다 비싸게 팔립니다.</div>
    `;
  }

  /* ---------------------------- 발주 패널 ---------------------------- */

  function renderSupplyPanel() {
    const gm = gameState.data.generalManager;
    const items = gameState.sellableItems();

    const rows = items
      .map((item) => {
        const stock = gameState.stockOf(item.id);
        const cost = gameState.restockCost(item.id, SUPPLY_BATCH);
        const cls = stock === 0 ? "zero" : stock < AUTO_RESTOCK_THRESHOLD ? "low" : "";
        return `
          <div class="row">
            <div class="row-main">
              <div class="row-label">${item.emoji} ${item.name}
                <span class="pill ${cls}">재고 ${stock}</span>
              </div>
              <div class="row-sub">${SUPPLY_BATCH}개 발주 · 개당 원가 ${item.supplyCost}코인</div>
            </div>
            <button class="buy-btn" data-restock="${item.id}"
              ${gameState.data.coins < cost ? "disabled" : ""}>🪙 ${num(cost)}</button>
          </div>`;
      })
      .join("");

    const gmCost = GENERAL_MANAGER_COST;
    const gmRow = gm
      ? `<div class="row">
           <div class="row-main">
             <div class="row-label">👔 총괄 매니저 <span class="pill">고용 중</span></div>
             <div class="row-sub">재고가 ${AUTO_RESTOCK_THRESHOLD}개 밑으로 떨어지면 알아서 발주를 넣어줘요</div>
           </div>
         </div>`
      : `<div class="row">
           <div class="row-main">
             <div class="row-label">👔 총괄 매니저 고용</div>
             <div class="row-sub">고용하면 발주가 자동이 돼요. 자리를 비운 동안에도 재고가 안 끊깁니다</div>
           </div>
           <button class="buy-btn alt" id="hire-gm"
             ${gameState.data.coins < gmCost ? "disabled" : ""}>🪙 ${num(gmCost)}</button>
         </div>`;

    bodyEl.innerHTML = `
      <div class="note">${
        gm
          ? "총괄 매니저가 재고를 알아서 채워줍니다. 직접 발주해도 돼요."
          : "재고가 없으면 손님이 들어오지 않아요. 팔 물건을 미리 발주해두세요."
      }</div>
      <h3>총괄 매니저</h3>
      ${gmRow}
      <h3>재고 발주</h3>
      ${rows || `<p class="muted">아직 팔 수 있는 메뉴가 없어요.</p>`}
      <div class="note">한 번 팔 때마다 재고가 1개씩 줄어요. 손님이 화내고 나가도 재고는 돌아오지 않습니다.</div>
    `;

    wire("[data-restock]", (el) => {
      const id = el.dataset.restock!;
      if (gameState.restock(id, SUPPLY_BATCH)) {
        gameState.save();
        bus.emit(EVENTS.COINS_CHANGED);
        bus.emit(EVENTS.STOCK_CHANGED);
      }
    });
    wire("#hire-gm", () => {
      if (gameState.spendCoins(gmCost)) {
        gameState.data.generalManager = true;
        gameState.save();
        refreshAll();
      }
    });
  }

  /* ---------------------------- 직원 패널 ---------------------------- */

  function roleRow(role: Role, floorIndex: number): string {
    const info = ROLE_INFO[role];
    const level = gameState.roleLevel(floorIndex, role);
    const maxed = level >= MAX_ROLE_LEVEL;
    const cost = roleCost(role, level, floorIndex);
    const label = level === 0 ? `${info.name} 고용` : `${info.name} Lv.${level} → ${level + 1}`;
    return `
      <div class="row">
        <div class="row-main">
          <div class="row-label">${info.emoji} ${maxed ? `${info.name} Lv.${level}` : label}
            ${level === 0 ? `<span class="pill zero">없음</span>` : ""}</div>
          <div class="row-sub">${info.desc}</div>
        </div>
        <button class="buy-btn" data-hire="${role}"
          ${maxed || gameState.data.coins < cost ? "disabled" : ""}>
          ${maxed ? "MAX" : `🪙 ${num(cost)}`}
        </button>
      </div>`;
  }

  function renderStaffPanel() {
    const floorIndex = activeFloor;
    const f = gameState.floor(floorIndex);
    if (!f.unlocked) {
      bodyEl.innerHTML = `<p class="muted">아직 열지 않은 층이에요. 매장 탭에서 먼저 증축해주세요.</p>`;
      return;
    }

    bodyEl.innerHTML = `
      <div class="note">직원은 <b>층마다 따로</b> 고용해요. 지금 보고 있는 층은 <b>${floorIndex + 1}층</b> 입니다.</div>
      <h3>${floorIndex + 1}층 직원</h3>
      ${roleRow("barista", floorIndex)}
      ${roleRow("server", floorIndex)}
      ${roleRow("manager", floorIndex)}
      <div class="note">
        바리스타가 없으면 손님을 눌러 <b>직접 만들어야</b> 하고,
        직원이 없으면 <b>직접 서빙하고 테이블도 치워야</b> 해요.
        둘 다 고용한 층만 자리를 비운 동안에도 돈을 법니다.
      </div>
    `;

    wire("[data-hire]", (el) => {
      const role = el.dataset.hire as Role;
      const level = gameState.roleLevel(floorIndex, role);
      if (level >= MAX_ROLE_LEVEL) return;
      const cost = roleCost(role, level, floorIndex);
      if (!gameState.spendCoins(cost)) return;
      gameState.setRoleLevel(floorIndex, role, level + 1);
      gameState.save();
      bus.emit(EVENTS.STAFF_CHANGED);
      refreshAll();
    });
  }

  /* ---------------------------- 매장 패널 ---------------------------- */

  function renderStorePanel() {
    const rows: string[] = [];

    for (let i = 0; i < MAX_FLOORS; i++) {
      const f = gameState.floor(i);
      if (f.unlocked) {
        const maxed = f.tables >= TABLES_PER_FLOOR;
        const cost = tableCost(f.tables, i);
        rows.push(`
          <div class="row">
            <div class="row-main">
              <div class="row-label">🏢 ${i + 1}층 <span class="pill">테이블 ${f.tables}/${TABLES_PER_FLOOR}</span></div>
              <div class="row-sub">${
                maxed ? "테이블을 더 놓을 자리가 없어요" : "테이블을 하나 더 놓아요"
              }</div>
            </div>
            <button class="buy-btn" data-table="${i}"
              ${maxed || gameState.data.coins < cost ? "disabled" : ""}>
              ${maxed ? "MAX" : `🪙 ${num(cost)}`}
            </button>
          </div>`);
      } else {
        const prevOpen = gameState.floor(i - 1)?.unlocked;
        const cost = floorUnlockCost(i);
        rows.push(`
          <div class="row ${prevOpen ? "" : "locked"}">
            <div class="row-main">
              <div class="row-label">🔒 ${i + 1}층 증축</div>
              <div class="row-sub">${
                prevOpen
                  ? "새 층을 올려요. 층마다 직원을 따로 고용해야 해요"
                  : `${i}층을 먼저 열어주세요`
              }</div>
            </div>
            <button class="buy-btn alt" data-floor-buy="${i}"
              ${!prevOpen || gameState.data.coins < cost ? "disabled" : ""}>🪙 ${num(cost)}</button>
          </div>`);
      }
    }

    bodyEl.innerHTML = `
      <div class="note">한 층에 테이블은 최대 ${TABLES_PER_FLOOR}개까지 놓을 수 있어요.
      더 키우고 싶으면 위층을 증축하세요.</div>
      ${rows.join("")}
    `;

    wire("[data-table]", (el) => {
      const i = Number(el.dataset.table);
      const f = gameState.floor(i);
      if (f.tables >= TABLES_PER_FLOOR) return;
      if (!gameState.spendCoins(tableCost(f.tables, i))) return;
      f.tables += 1;
      gameState.save();
      bus.emit(EVENTS.LAYOUT_CHANGED);
      refreshAll();
    });

    wire("[data-floor-buy]", (el) => {
      const i = Number(el.dataset.floorBuy);
      if (!gameState.floor(i - 1)?.unlocked) return;
      if (!gameState.spendCoins(floorUnlockCost(i))) return;
      const f = gameState.floor(i);
      f.unlocked = true;
      f.tables = 2;
      gameState.save();
      bus.emit(EVENTS.LAYOUT_CHANGED);
      refreshAll();
    });
  }

  /* ---------------------------- 설비 패널 ---------------------------- */

  function renderEquipmentPanel() {
    const rows = EQUIPMENT.map((eq) => {
      const owned = gameState.hasEquipment(eq.id);
      const uses = [...DRINKS, ...DESSERTS]
        .filter((m) => m.equipmentId === eq.id)
        .map((m) => m.emoji)
        .join(" ");
      return `
        <div class="row">
          <div class="row-main">
            <div class="row-label">${eq.emoji} ${eq.name} ${
              owned ? `<span class="pill">보유</span>` : ""
            }</div>
            <div class="row-sub">${eq.desc}<br>${uses}</div>
          </div>
          ${
            owned
              ? `<div class="buy-btn" style="background:#f0e3ca;color:#7a5a33">✓</div>`
              : `<button class="buy-btn" data-equip="${eq.id}"
                   ${gameState.data.coins < eq.cost ? "disabled" : ""}>🪙 ${num(eq.cost)}</button>`
          }
        </div>`;
    }).join("");

    bodyEl.innerHTML = `
      <div class="note">설비를 사야 그 설비로 만드는 메뉴를 팔 수 있어요.
      커피머신은 기본으로 드립니다.</div>
      ${rows}
    `;

    wire("[data-equip]", (el) => {
      if (gameState.buyEquipment(el.dataset.equip!)) {
        gameState.save();
        bus.emit(EVENTS.LAYOUT_CHANGED);
        refreshAll();
      }
    });
  }

  /* ------------------------ 자리 비운 동안 보상 ------------------------ */

  const offlineBody = root.querySelector("#offline-body") as HTMLElement;
  const offlineModal = root.querySelector("#offline-modal") as HTMLElement;
  root.querySelector("#offline-close")?.addEventListener("click", () => {
    offlineModal.classList.add("hidden");
  });

  function showOfflineIfAny() {
    if (gameState.offlineEarnings <= 0) return;
    const ms = gameState.offlineDurationMs;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const timeStr = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
    offlineBody.innerHTML = `
      <p>자리를 비운 <b>${timeStr}</b> 동안</p>
      <p class="offline-earn">🪙 +${num(gameState.offlineEarnings)}</p>
      <p class="muted">손님 ${num(gameState.offlineServes)}명을 받았어요</p>
      ${
        gameState.data.generalManager
          ? `<p class="muted">총괄 매니저가 발주까지 챙겼어요 (원가는 차감됨)</p>`
          : `<p class="muted">총괄 매니저를 고용하면 재고가 안 끊겨서 훨씬 오래 벌 수 있어요</p>`
      }
    `;
    offlineModal.classList.remove("hidden");
    refreshCoins();
  }

  /* ----------------------------- 배선 ----------------------------- */

  root.querySelectorAll<HTMLElement>("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => showPanel(btn.dataset.panel as PanelId));
  });
  root.querySelector("#panel-close")?.addEventListener("click", closePanel);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closePanel();
  });

  bus.on(EVENTS.OPEN_PANEL, (id: PanelId) => showPanel(id));
  bus.on(EVENTS.COINS_CHANGED, () => {
    refreshCoins();
    if (openPanel) renderPanel();
  });
  bus.on(EVENTS.STOCK_CHANGED, () => {
    refreshWarnings();
    if (openPanel === "supply") renderPanel();
  });
  bus.on(EVENTS.MENU_LEVELED, () => {
    if (openPanel === "menu") renderPanel();
  });
  bus.on(EVENTS.STAFF_CHANGED, () => bus.emit(EVENTS.LAYOUT_CHANGED));
  bus.on(EVENTS.OFFLINE_REWARD, () => {
    showOfflineIfAny();
    refreshAll();
  });

  // 층 탭의 "직접 눌러야 해요" 표시를 주기적으로 갱신
  setInterval(refreshTabs, 700);

  refreshAll();
  showOfflineIfAny();
}
