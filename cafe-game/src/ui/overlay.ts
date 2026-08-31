import { bus, EVENTS } from "../game/bus";
import {
  AUTO_RESTOCK_THRESHOLD,
  CLOSE_HOUR,
  DAY_CLOSE_AUTO_MS,
  DECOR_SLOT_NAME,
  DECOR_SLOTS,
  decorOfSlot,
  decorEffectText,
  donationFame,
  DONATION_PRESETS,
  equipmentCost,
  fameSpawnScale,
  floorPriceScale,
  HOBBIES,
  hobbyCoinCost,
  hobbyEffectText,
  MAX_FLOORS,
  MAX_MENU_STARS,
  roleMax,
  OPEN_HOUR,
  ROLE_INFO,
  ROLE_ORDER,
  SUPPLY_BATCH,
  TABLES_PER_FLOOR,
  floorUnlockCost,
  menuById,
  managerTipRate,
  roleCost,
  SLOT_NAME,
  UNIFORMS,
  UNIFORM_SLOTS,
  equipEffectText,
  ownEffectText,
  uniformsOfSlot,
  roleWage,
  tableCost,
  type Category,
  type DecorDef,
  type HobbyDef,
  type MenuDef,
  type Role,
} from "../game/config";
import {
  clockText,
  gameState,
  ledgerExpense,
  ledgerProfit,
  levelProgressRatio,
  levelProgressText,
  type DayLedger,
} from "../game/state";
import { sim } from "../game/sim";
import {
  chairKey,
  doorKey,
  registerKey,
  equipKey,
  iconUrl,
  itemKey,
  personKey,
  staffKey,
  tableKey,
  uiKey,
} from "../game/art";
import { injectStyles } from "./styles";

type PanelId =
  | "menu"
  | "supply"
  | "staff"
  | "store"
  | "shop"
  | "equipment"
  | "sales"
  | "uniform"
  | "decor"
  | "fame";

const PANEL_TITLES: Record<PanelId, string> = {
  menu: "메뉴",
  supply: "발주",
  staff: "직원",
  store: "매장",
  shop: "상점",
  equipment: "설비",
  sales: "매출표",
  uniform: "유니폼",
  decor: "꾸미기",
  fame: "인지도",
};

function num(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

/**
 * 코드로 그린 그림을 HTML 안에 넣습니다.
 * 그림이 아직 준비되기 전이면 빈 자리를 두고, 준비되면 다시 그립니다.
 */
function ic(key: string, size = 22): string {
  const url = iconUrl(key);
  if (!url) return `<span class="ic-box" style="width:${size}px;height:${size}px"></span>`;
  return `<img class="ic-box" src="${url}" alt="" style="width:${size}px;height:${size}px">`;
}

/** 코인 그림 + 금액 */
function coin(amount: number, size = 20): string {
  return `${ic("icon-coin", size)} ${num(amount)}`;
}

export function mountUI(root: HTMLElement) {
  injectStyles();

  root.innerHTML = `
    <div class="top-bar ui-interactive">
      <div class="pill-row">
        <button class="icon-btn" id="world-btn" title="초원으로 나가기">←</button>
        <div class="coin-pill" id="coin-pill"><span id="coin-icon"></span><span id="coin-count">0</span></div>
        <button class="clock-pill" id="clock-pill">
          <span id="day-label">1일차</span>
          <span id="clock-label">10:00</span>
        </button>
        <button class="fame-pill" id="fame-pill">
          <span id="fame-icon"></span><span id="fame-value">0</span>
        </button>
      </div>
      <div class="floor-tabs" id="floor-tabs"></div>
      <div class="warn-banner hidden" id="stock-warn">재고가 없어요! 발주를 넣어주세요</div>
    </div>

    <div class="bottom-bar ui-interactive" id="nav-bar"></div>

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
        <div class="modal-header"><h2>다시 오셨네요!</h2></div>
        <div class="modal-body" id="offline-body"></div>
        <button id="offline-close" class="primary-btn">확인</button>
      </div>
    </div>

    <div id="close-modal" class="modal hidden ui-interactive">
      <div class="modal-card">
        <div class="modal-header"><h2 id="close-title">오늘 영업 끝!</h2></div>
        <div class="modal-body" id="close-body"></div>
        <button id="close-confirm" class="primary-btn">내일 열기</button>
      </div>
    </div>

    <div id="enhance-modal" class="modal hidden ui-interactive">
      <div class="modal-card">
        <div class="modal-header"><h2>메뉴 강화</h2></div>
        <div class="modal-body" id="enhance-body"></div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button id="enhance-cancel" class="buy-btn alt" style="flex:1;width:auto;margin-top:0">취소</button>
          <button id="enhance-confirm" class="primary-btn" style="flex:1;width:auto;margin-top:0">강화하기</button>
        </div>
      </div>
    </div>

    <div id="exit-modal" class="modal hidden ui-interactive">
      <div class="modal-card">
        <div class="modal-header"><h2>나가시겠어요?</h2></div>
        <div class="modal-body"><p class="close-lead">지금까지 하신 건 자동으로 저장돼요.</p></div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button id="exit-cancel" class="buy-btn alt" style="flex:1;width:auto;margin-top:0">계속하기</button>
          <button id="exit-confirm" class="primary-btn" style="flex:1;width:auto;margin-top:0">나가기</button>
        </div>
      </div>
    </div>
  `;

  const coinEl = root.querySelector("#coin-count") as HTMLElement;
  const coinIcon = root.querySelector("#coin-icon") as HTMLElement;
  const coinPill = root.querySelector("#coin-pill") as HTMLElement;
  const navBar = root.querySelector("#nav-bar") as HTMLElement;
  const dayLabel = root.querySelector("#day-label") as HTMLElement;
  const clockLabel = root.querySelector("#clock-label") as HTMLElement;
  const clockPill = root.querySelector("#clock-pill") as HTMLElement;
  const famePill = root.querySelector("#fame-pill") as HTMLElement;
  const fameIcon = root.querySelector("#fame-icon") as HTMLElement;
  const fameValue = root.querySelector("#fame-value") as HTMLElement;
  const closeModal = root.querySelector("#close-modal") as HTMLElement;
  const closeBody = root.querySelector("#close-body") as HTMLElement;
  const tabsEl = root.querySelector("#floor-tabs") as HTMLElement;
  const warnEl = root.querySelector("#stock-warn") as HTMLElement;
  const modal = root.querySelector("#panel-modal") as HTMLElement;
  const titleEl = root.querySelector("#panel-title") as HTMLElement;
  const bodyEl = root.querySelector("#panel-body") as HTMLElement;
  const enhanceModal = root.querySelector("#enhance-modal") as HTMLElement;
  const enhanceBody = root.querySelector("#enhance-body") as HTMLElement;

  let activeFloor = 0;
  let openPanel: PanelId | null = null;
  /** 상점 탭 안의 서브 탭 (설비 · 유니폼 · 꾸미기) */
  let shopSubTab: "equipment" | "uniform" | "decor" = "equipment";

  /* --------------------------- 공통 갱신 --------------------------- */

  function refreshCoins() {
    const coins = gameState.data.coins;
    coinEl.textContent = num(coins);
    coinIcon.innerHTML = ic("icon-coin", 24);
    // 빚을 지면 한눈에 보이게 빨갛게 표시합니다.
    coinPill.classList.toggle("debt", coins < 0);
  }

  /** 아래 메뉴바. 그림이 준비되면 다시 그려서 이모지 대신 그림이 들어갑니다. */
  const NAV: { id: PanelId; label: string; icon: string }[] = [
    { id: "menu", label: "메뉴", icon: uiKey("menu") },
    { id: "supply", label: "발주", icon: uiKey("supply") },
    { id: "staff", label: "직원", icon: uiKey("staff") },
    { id: "store", label: "매장", icon: uiKey("store") },
    { id: "shop", label: "상점", icon: uiKey("shop") },
    { id: "fame", label: "인지도", icon: uiKey("fame") },
  ];

  function refreshNav() {
    navBar.innerHTML = NAV.map((item) => {
      const badge =
        item.id === "supply"
          ? `<span class="badge hidden" id="supply-badge"></span>`
          : "";
      return `<button class="nav-btn" data-panel="${item.id}">
        ${ic(item.icon, 26)}${item.label}${badge}
      </button>`;
    }).join("");
    navBar.querySelectorAll<HTMLElement>("[data-panel]").forEach((btn) => {
      btn.addEventListener("click", () => showPanel(btn.dataset.panel as PanelId));
    });
    refreshWarnings();
  }

  /** 인지도 — 손님이 왔다 갈 때마다 조금씩 쌓입니다 */
  function refreshFame() {
    fameValue.textContent = num(gameState.data.fame);
    fameIcon.innerHTML = ic(uiKey("fame"), 20);
  }

  /** 게임 속 시계와 며칠째인지 */
  function refreshClock() {
    dayLabel.textContent = `${gameState.data.day}일차`;
    clockLabel.textContent = clockText(gameState.data.clock);
    clockPill.classList.toggle("closed", !sim.isOpen());
  }

  function refreshWarnings() {
    warnEl.classList.toggle("hidden", !gameState.isOutOfStock());
    const low = gameState
      .sellableAnywhere()
      .some((m) => gameState.stockOf(m.id) < AUTO_RESTOCK_THRESHOLD);
    // 메뉴바는 다시 그려질 때마다 새로 만들어지므로 그때그때 찾습니다.
    const badge = root.querySelector("#supply-badge");
    badge?.classList.toggle("hidden", !low);
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
        `<button class="${cls}" data-floor="${i}">${unlocked ? `${i + 1}층` : ic(uiKey("lock"), 16)}${dot}</button>`,
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
    refreshClock();
    refreshFame();
    refreshWarnings();
    refreshTabs();
    if (openPanel) renderPanel();
  }

  /* ----------------------------- 패널 ----------------------------- */

  /** 이 패널이 지금 보고 있는 가게(카페/분식집/포차)만의 내용인지 — 그 가게 이름을 제목에 같이 보여줍니다 */
  const RESTAURANT_SCOPED_PANELS: PanelId[] = ["menu", "supply", "staff", "store", "shop", "equipment"];

  function showPanel(id: PanelId) {
    openPanel = id;
    const suffix =
      RESTAURANT_SCOPED_PANELS.includes(id) && gameState.data.activeRestaurant !== "cafe"
        ? ` · ${gameState.cfg().name}`
        : "";
    titleEl.textContent = PANEL_TITLES[id] + suffix;
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
      case "shop":
        renderShopPanel();
        break;
      case "equipment":
        renderEquipmentPanel();
        break;
      case "sales":
        renderSalesPanel();
        break;
      case "uniform":
        renderUniformPanel();
        break;
      case "decor":
        renderDecorPanel();
        break;
      case "fame":
        renderFamePanel();
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

  /** 강화 결과를 잠깐 보여주기 위한 상태 (메뉴 id -> 결과) */
  const enhanceFlash: Record<string, "success" | "fail" | null> = {};
  /** 지금 확인 팝업이 뜬 메뉴 (실수로 눌러서 바로 강화되는 걸 막으려고, 확인을 거칩니다) */
  let pendingEnhanceId: string | null = null;

  function starsText(stars: number): string {
    let out = "";
    for (let i = 0; i < MAX_MENU_STARS; i++) {
      out += i < stars
        ? `<span class="star">★</span>`
        : `<span class="muted" style="font-size:13px">★</span>`;
    }
    return out;
  }

  function enhanceBox(item: MenuDef): string {
    const p = gameState.progress(item.id);
    const stars = p.stars;
    const flash = enhanceFlash[item.id];
    if (stars >= MAX_MENU_STARS) {
      return `<div class="row-sub" style="margin-top:4px">${starsText(stars)} <span class="muted">별 강화 완료!</span></div>`;
    }
    const requiredLevel = gameState.enhanceRequiredLevelOf(item.id);
    if (!gameState.canEnhance(item.id)) {
      return `
        <div class="row-sub" style="margin-top:4px">
          ${starsText(stars)}
          <span class="muted" style="font-size:11px">Lv.${requiredLevel} 되면 강화할 수 있어요 (지금 Lv.${p.level})</span>
        </div>`;
    }
    const cost = gameState.enhanceCostOf(item.id);
    const chance = Math.round(gameState.enhanceChanceOf(item.id) * 100);
    const flashText =
      flash === "success" ? `<span style="color:#3a9d5c">강화 성공! ✨</span>`
      : flash === "fail" ? `<span style="color:#c0463a">강화 실패...</span>`
      : "";
    return `
      <div class="row-sub" style="margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${starsText(stars)}
        <span class="muted" style="font-size:11px">성공확률 ${chance}%</span>
        ${flashText}
      </div>
      <button class="buy-btn alt" style="margin-top:4px" data-open-enhance="${item.id}">강화 ${coin(cost)}</button>`;
  }

  function menuSection(title: string, category: Category): string {
    const rows: string[] = [`<h3>${title}</h3>`];
    const cfg = gameState.cfg();
    for (const item of category === "drink" ? cfg.drinks : cfg.desserts) {
      const p = gameState.progress(item.id);
      const launched = gameState.isLaunched(item.id);
      const equipped = gameState.hasEquipmentAnywhere(item.equipmentId);
      const equipName = cfg.equipment.find((e) => e.id === item.equipmentId)?.name ?? "";

      if (!launched) {
        if (!equipped) {
          rows.push(`
            <div class="row locked">
              <div class="row-main">
                <div class="row-label">${ic(uiKey("lock"), 20)} ???</div>
                <div class="row-sub">${equipName} 설비를 사면 발주 탭에서 살 수 있어요</div>
              </div>
            </div>`);
        } else {
          rows.push(`
            <div class="row locked" data-jump-supply="1">
              ${ic(itemKey(item.id), 40)}
              <div class="row-main">
                <div class="row-label">${item.name}</div>
                <div class="row-sub">${ic(uiKey("warning"), 14)} 발주 탭에서 구매하면 팔 수 있어요</div>
              </div>
            </div>`);
        }
        continue;
      }

      const sub = equipped
        ? `판매가 ${num(gameState.priceOf(item.id))}코인 · 원가 ${item.supplyCost}`
        : `${ic(uiKey("warning"), 16)} 어느 층에든 ${equipName} 설비가 있어야 해요`;
      rows.push(`
        <div class="row ${equipped ? "" : "locked"}">
          ${ic(itemKey(item.id), 40)}
          <div class="row-main">
            <div class="row-label">${item.name}
              <span class="pill">Lv.${p.level}</span>
              <span class="muted" style="font-size:11px">${levelProgressText(p)}</span>
            </div>
            <div class="row-sub">${sub}</div>
            <div class="lv-bar"><i style="width:${levelProgressRatio(p) * 100}%"></i></div>
            ${equipped ? enhanceBox(item) : ""}
          </div>
        </div>`);
    }
    return rows.join("");
  }

  function renderMenuPanel() {
    const cfg = gameState.cfg();
    const sets = cfg.sets.map((set) => {
      const ok =
        gameState.isSellableAnywhere(set.drinkId) &&
        gameState.isSellableAnywhere(set.dessertId);
      const drink = menuById(set.drinkId);
      const dessert = menuById(set.dessertId);
      if (!ok) {
        return `
          <div class="row locked">
            <div class="row-main">
              <div class="row-label">${ic(uiKey("lock"), 20)} ${set.name}</div>
              <div class="row-sub">${drink.name} + ${dessert.name} 를 모두 팔 수 있게 되면 열려요</div>
            </div>
          </div>`;
      }
      const p = gameState.setProgress(set.id);
      return `
        <div class="row">
          <span class="set-pair">${ic(itemKey(drink.id), 34)}${ic(itemKey(dessert.id), 34)}</span>
          <div class="row-main">
            <div class="row-label">${set.name}
              <span class="pill">Lv.${p.level}</span>
              <span class="muted" style="font-size:11px">${levelProgressText(p)}</span>
            </div>
            <div class="row-sub">${drink.name} + ${dessert.name}
              · 보너스 +${Math.round((set.bonusRate - 1) * 100)}%</div>
            <div class="row-sub">판매가 ${num(gameState.setPrice(set))}코인 · 원가 ${drink.supplyCost + dessert.supplyCost}</div>
            <div class="lv-bar"><i style="width:${levelProgressRatio(p) * 100}%"></i></div>
          </div>
        </div>`;
    }).join("");

    bodyEl.innerHTML = `
      <div class="note">메뉴는 팔 때마다 경험치가 쌓여 레벨이 오르고, 레벨이 오르면 판매가가 올라가요.
      새 메뉴는 설비를 산 뒤 발주 탭에서 한 번 구매하면 열립니다.</div>
      ${menuSection(cfg.mainLabel, "drink")}
      ${menuSection(cfg.sideLabel, "dessert")}
      <h3>세트 메뉴</h3>
      ${sets}
      <div class="note">세트가 열리면 손님이 가끔 세트로 주문해요. 단품보다 비싸고,
      세트도 팔수록 레벨이 올라 값이 더 올라갑니다.</div>
    `;

    wire("[data-jump-supply]", () => showPanel("supply"));
    wire("[data-open-enhance]", (el) => openEnhanceConfirm(el.dataset.openEnhance!));
  }

  /** 잘못 눌러서 바로 돈이 나가지 않도록, 강화는 확인 팝업을 한 번 거칩니다 */
  function openEnhanceConfirm(id: string) {
    const item = menuById(id);
    const p = gameState.progress(id);
    const cost = gameState.enhanceCostOf(id);
    const chance = Math.round(gameState.enhanceChanceOf(id) * 100);
    const affordable = gameState.data.coins >= cost;
    pendingEnhanceId = id;
    enhanceBody.innerHTML = `
      <div class="row" style="border:none;padding:6px 0">
        ${ic(itemKey(id), 44)}
        <div class="row-main">
          <div class="row-label">${item.name}</div>
          <div class="row-sub" style="margin-top:4px">${starsText(p.stars)}
            <span class="muted" style="font-size:12px">→ ${starsText(p.stars + 1)}</span></div>
        </div>
      </div>
      <div class="note" style="margin-top:10px">
        비용 <b>${num(cost)}코인</b>을 내고 강화에 도전해요. 성공 확률은 <b>${chance}%</b>이고,
        실패해도 별은 그대로예요 (낸 돈만 사라져요).
        ${affordable ? "" : `<br><span style="color:#c0463a">코인이 모자라요</span>`}
      </div>
    `;
    const confirmBtn = root.querySelector("#enhance-confirm") as HTMLButtonElement;
    confirmBtn.disabled = !affordable;
    enhanceModal.classList.remove("hidden");
  }

  function closeEnhanceModal() {
    pendingEnhanceId = null;
    enhanceModal.classList.add("hidden");
  }

  function confirmEnhance() {
    const id = pendingEnhanceId;
    if (!id) return;
    const result = gameState.enhanceMenu(id);
    closeEnhanceModal();
    if (result === "no-coins" || result === "maxed" || result === "level-locked") return;
    enhanceFlash[id] = result;
    gameState.save();
    bus.emit(EVENTS.COINS_CHANGED);
    refreshAll();
    window.setTimeout(() => {
      enhanceFlash[id] = null;
      if (openPanel === "menu") renderMenuPanel();
    }, 1400);
  }

  /* ---------------------------- 발주 패널 ---------------------------- */

  function renderSupplyPanel() {
    const gm = gameState.hasGeneralManager();
    const items = gameState.sellableAnywhere();

    const rows = items
      .map((item) => {
        const stock = gameState.stockOf(item.id);
        const cls = stock === 0 ? "zero" : stock < AUTO_RESTOCK_THRESHOLD ? "low" : "";

        // 점장이 있으면 알아서 채워주므로, 직접 발주 버튼 대신 "완전 자동" 표시만 보여줍니다.
        if (gm) {
          return `
            <div class="row">
              ${ic(itemKey(item.id), 40)}
              <div class="row-main">
                <div class="row-label">${item.name}
                  <span class="pill ${cls}">재고 ${stock}</span>
                </div>
                <div class="row-sub">점장이 알아서 채워줘요 · 개당 원가 ${item.supplyCost}코인</div>
              </div>
              <div class="buy-btn" style="background:#f0e3ca;color:#7a5a33">∞</div>
            </div>`;
        }

        const cost = gameState.restockCost(item.id, SUPPLY_BATCH);
        return `
          <div class="row">
            ${ic(itemKey(item.id), 40)}
            <div class="row-main">
              <div class="row-label">${item.name}
                <span class="pill ${cls}">재고 ${stock}</span>
              </div>
              <div class="row-sub">${SUPPLY_BATCH}개 발주 · 개당 원가 ${item.supplyCost}코인</div>
            </div>
            <button class="buy-btn" data-restock="${item.id}"
              ${gameState.data.coins < cost ? "disabled" : ""}>${coin(cost)}</button>
          </div>`;
      })
      .join("");

    const launchItems = gameState.awaitingLaunch();
    const launchSection =
      launchItems.length === 0
        ? ""
        : `
          <h3>새 메뉴 구매</h3>
          ${launchItems
            .map((item) => {
              const cost = item.launchCost;
              return `
                <div class="row">
                  ${ic(itemKey(item.id), 40)}
                  <div class="row-main">
                    <div class="row-label">${item.name} <span class="pill">신메뉴</span></div>
                    <div class="row-sub">설비 준비 완료! 한 번 사면 계속 발주할 수 있어요</div>
                  </div>
                  <button class="buy-btn alt" data-launch="${item.id}"
                    ${gameState.data.coins < cost ? "disabled" : ""}>${coin(cost)}</button>
                </div>`;
            })
            .join("")}
        `;

    const gmCost = gameState.generalManagerCost();
    const gmRow = gm
      ? `<div class="row">
           <div class="row-main">
             <div class="row-label">${ic(staffKey("gm"), 24)} 점장 <span class="pill">고용 중</span></div>
             <div class="row-sub">재고가 ${AUTO_RESTOCK_THRESHOLD}개 밑으로 떨어지면 알아서 발주를 넣어줘요</div>
           </div>
         </div>`
      : `<div class="row">
           <div class="row-main">
             <div class="row-label">${ic(staffKey("gm"), 24)} 점장 고용</div>
             <div class="row-sub">이 가게에서만 발주가 자동이 돼요 (가게마다 따로 고용해야 해요). 자리를 비운 동안에도 재고가 안 끊깁니다</div>
           </div>
           <button class="buy-btn alt" id="hire-gm"
             ${gameState.data.coins < gmCost ? "disabled" : ""}>${coin(gmCost)}</button>
         </div>`;

    bodyEl.innerHTML = `
      <div class="note">${
        gm
          ? "점장이 재고를 완전히 알아서 채워줍니다. 신경 쓰지 않아도 돼요."
          : "재고가 없으면 손님이 들어오지 않아요. 팔 물건을 미리 발주해두세요."
      }</div>
      <h3>점장</h3>
      ${gmRow}
      ${launchSection}
      <h3>재고 발주</h3>
      ${rows || `<p class="muted">아직 팔 수 있는 메뉴가 없어요. 설비를 사고 위에서 메뉴를 구매해보세요.</p>`}
      <div class="note">한 번 팔 때마다 재고가 1개씩 줄어요. 손님이 화내고 나가도 재고는 돌아오지 않습니다.</div>
    `;

    wire("[data-launch]", (el) => {
      const id = el.dataset.launch!;
      if (gameState.launchMenu(id)) {
        gameState.save();
        bus.emit(EVENTS.COINS_CHANGED);
        bus.emit(EVENTS.STOCK_CHANGED);
      }
    });
    wire("[data-restock]", (el) => {
      const id = el.dataset.restock!;
      if (gameState.restock(id, SUPPLY_BATCH)) {
        gameState.save();
        bus.emit(EVENTS.COINS_CHANGED);
        bus.emit(EVENTS.STOCK_CHANGED);
      }
    });
    wire("#hire-gm", () => {
      if (gameState.hireGeneralManager()) {
        gameState.save();
        refreshAll();
      }
    });
  }

  /* ---------------------------- 유니폼 패널 ---------------------------- */

  function uniformRow(u: (typeof UNIFORMS)[number]): string {
    const owned = gameState.ownsUniform(u.id);
    const worn = gameState.equippedUniform(u.slot) === u.id;
    const affordable = gameState.data.coins >= u.cost;
    const button = worn
      ? `<div class="buy-btn" style="background:#f0e3ca;color:#7a5a33">착용중</div>`
      : owned
        ? `<button class="buy-btn alt" data-wear="${u.id}">입기</button>`
        : `<button class="buy-btn" data-buy-uniform="${u.id}"
             ${affordable ? "" : "disabled"}>${coin(u.cost)}</button>`;
    return `
      <div class="row ${owned || affordable ? "" : "locked"}">
        ${ic(personKey(u.id), 46)}
        <div class="row-main">
          <div class="row-label">${u.name}
            ${worn ? `<span class="pill">착용중</span>` : ""}</div>
          <div class="row-sub">
            <span class="eff-equip">입으면</span> ${equipEffectText(u.equip)}<br>
            <span class="eff-own">갖고만 있어도</span> ${ownEffectText(u.own)}
          </div>
        </div>
        ${button}
      </div>`;
  }

  function renderUniformPanel(target: HTMLElement = bodyEl) {
    const bonus = gameState.ownedBonus();
    const progress = gameState.uniformProgress();
    const bonusLines = [
      bonus.price ? `판매가 +${Math.round(bonus.price * 100)}%` : "",
      bonus.patience ? `손님 인내심 +${Math.round(bonus.patience * 100)}%` : "",
      bonus.fameBoost ? `인지도 +${Math.round(bonus.fameBoost * 100)}%` : "",
      bonus.supplyCut ? `발주 원가 −${Math.round(bonus.supplyCut * 100)}%` : "",
    ].filter(Boolean);

    target.innerHTML = `
      <div class="note">유니폼은 <b>가게 전체</b> 공용이에요. 한 벌은 <b>입은 자리에만</b>
      효과가 붙고, <b>사두기만 해도</b> 가게 전체에 붙는 효과가 따로 있습니다.
      그래서 안 입는 옷도 모아둘 값어치가 있어요.</div>

      <div class="rating-box">
        <div class="rating-big">${progress.owned}<span class="muted" style="font-size:16px">/${progress.total}</span></div>
        <div class="rating-note">
          <b>지금 보유 효과</b><br>
          ${bonusLines.length ? bonusLines.join(" · ") : "아직 없어요. 옷을 사면 여기에 쌓입니다."}
        </div>
      </div>

      ${UNIFORM_SLOTS.map(
        (slot) => `
        <h3>${slot === "barista" ? kitchenRoleName() : SLOT_NAME[slot]}</h3>
        ${uniformsOfSlot(slot).map(uniformRow).join("")}`,
      ).join("")}
    `;

    wire("[data-buy-uniform]", (el) => {
      if (!gameState.buyUniform(el.dataset.buyUniform!)) return;
      // 새로 산 옷은 바로 입혀줍니다.
      gameState.equipUniform(el.dataset.buyUniform!);
      gameState.save();
      bus.emit(EVENTS.UNIFORM_CHANGED);
      refreshAll();
    });
    wire("[data-wear]", (el) => {
      if (!gameState.equipUniform(el.dataset.wear!)) return;
      gameState.save();
      bus.emit(EVENTS.UNIFORM_CHANGED);
      refreshAll();
    });
  }

  /* ---------------------------- 꾸미기 패널 ---------------------------- */

  /** 가구는 그려둔 그림, 바닥·벽지는 색이라 작은 색 견본으로 보여줍니다 */
  function decorIcon(d: DecorDef): string {
    switch (d.slot) {
      case "chair":
        return ic(chairKey(d.id), 46);
      case "table":
        return ic(tableKey(d.id), 46);
      case "door":
        return ic(doorKey(d.id), 40);
      case "register":
        return ic(registerKey(d.id), 40);
      default: {
        const hex = `#${d.colors.primary.toString(16).padStart(6, "0")}`;
        return `<span class="ic-box" style="width:40px;height:40px;border-radius:8px;
          background:${hex};border:2px solid rgba(0,0,0,0.15)"></span>`;
      }
    }
  }

  function decorRow(d: DecorDef): string {
    const owned = gameState.ownsDecor(d.id);
    const worn = gameState.equippedDecor(d.slot) === d.id;
    const affordable = gameState.data.coins >= d.cost;
    const button = worn
      ? `<div class="buy-btn" style="background:#f0e3ca;color:#7a5a33">착용중</div>`
      : owned
        ? `<button class="buy-btn alt" data-wear-decor="${d.id}">쓰기</button>`
        : `<button class="buy-btn" data-buy-decor="${d.id}"
             ${affordable ? "" : "disabled"}>${coin(d.cost)}</button>`;
    return `
      <div class="row ${owned || affordable ? "" : "locked"}">
        ${decorIcon(d)}
        <div class="row-main">
          <div class="row-label">${d.name}
            ${worn ? `<span class="pill">착용중</span>` : ""}</div>
          <div class="row-sub">
            <span class="eff-equip">쓰는 동안</span> ${decorEffectText(d.equipEffect)}<br>
            <span class="eff-own">갖고만 있어도</span> ${decorEffectText(d.ownEffect)}
          </div>
        </div>
        ${button}
      </div>`;
  }

  function renderDecorPanel(target: HTMLElement = bodyEl) {
    const progress = gameState.decorProgress();
    const bonus = gameState.decorOwnedBonus();
    const bonusLines = [
      bonus.price ? `판매가 +${Math.round(bonus.price * 100)}%` : "",
      bonus.patience ? `손님 인내심 +${Math.round(bonus.patience * 100)}%` : "",
      bonus.spawnBoost ? `손님 방문 +${Math.round(bonus.spawnBoost * 100)}%` : "",
      bonus.fameBoost ? `인지도 +${Math.round(bonus.fameBoost * 100)}%` : "",
    ].filter(Boolean);

    target.innerHTML = `
      <div class="note">바닥·벽지·테이블·의자·출입문을 다른 모양으로 꾸밀 수 있어요.
      <b>가게 전체</b> 공용이에요. 지금 <b>쓰고 있는 것</b>의 효과가 붙고,
      <b>사두기만 해도</b> 가게 전체에 붙는 효과가 따로 있습니다.</div>

      <div class="rating-box">
        <div class="rating-big">${progress.owned}<span class="muted" style="font-size:16px">/${progress.total}</span></div>
        <div class="rating-note">
          <b>모은 인테리어 · 지금 보유 효과</b><br>
          ${bonusLines.length ? bonusLines.join(" · ") : "아직 없어요. 사면 여기에 쌓입니다."}
        </div>
      </div>

      ${DECOR_SLOTS.map(
        (slot) => `
        <h3>${DECOR_SLOT_NAME[slot]}</h3>
        ${decorOfSlot(slot).map(decorRow).join("")}`,
      ).join("")}
    `;

    wire("[data-buy-decor]", (el) => {
      if (!gameState.buyDecor(el.dataset.buyDecor!)) return;
      // 새로 산 인테리어는 바로 씁니다.
      gameState.wearDecor(el.dataset.buyDecor!);
      gameState.save();
      bus.emit(EVENTS.DECOR_CHANGED);
      refreshAll();
    });
    wire("[data-wear-decor]", (el) => {
      if (!gameState.wearDecor(el.dataset.wearDecor!)) return;
      gameState.save();
      bus.emit(EVENTS.DECOR_CHANGED);
      refreshAll();
    });
  }

  /* ---------------------------- 인지도 패널 ---------------------------- */

  function hobbyRow(h: HobbyDef): string {
    const owned = gameState.ownsHobby(h.id);
    const unlocked = gameState.hobbyUnlocked(h.id);
    const price = hobbyCoinCost(h);
    const affordable = gameState.data.coins >= price;

    let button: string;
    if (owned) {
      button = `<div class="buy-btn" style="background:#f0e3ca;color:#7a5a33">보유중</div>`;
    } else if (!unlocked) {
      button = `<div class="buy-btn" style="background:#ddd3bf;color:#9a8b74">
        ${ic(uiKey("fame"), 14)} ${num(h.fameRequired)}</div>`;
    } else {
      button = `<button class="buy-btn" data-buy-hobby="${h.id}"
           ${affordable ? "" : "disabled"}>${coin(price, 15)}</button>`;
    }

    const sub = !owned && !unlocked
      ? `${h.desc}<br><span class="muted">인지도 ${num(h.fameRequired)} 모이면 코인으로 살 수 있어요 (지금 ${num(gameState.data.fame)})</span>`
      : `${h.desc}<br><span class="eff-own">보유 효과</span> ${hobbyEffectText(h.effect)}`;

    return `
      <div class="row ${owned || (unlocked && affordable) ? "" : "locked"}">
        <span class="hobby-emoji">${h.emoji}</span>
        <div class="row-main">
          <div class="row-label">${h.name}
            ${owned ? `<span class="pill">보유중</span>` : ""}</div>
          <div class="row-sub">${sub}</div>
        </div>
        ${button}
      </div>`;
  }

  function renderFamePanel() {
    const progress = gameState.hobbyProgress();

    bodyEl.innerHTML = `
      <div class="note">손님이 왔다 갈 때마다 <b>인지도</b>가 쌓여요. 서비스가 빠를수록
      (손님이 인내심을 많이 남긴 채 응대받을수록) 한 번에 최대 10까지 받습니다.
      인지도가 쌓일수록 소문이 나서 손님도 <b>더 자주</b> 옵니다.</div>

      <div class="rating-box">
        <div class="rating-big">${ic(uiKey("fame"), 26)} ${num(gameState.data.fame)}</div>
        <div class="rating-note"><b>지금 인지도</b></div>
      </div>

      <h3>기부하기</h3>
      <div class="note">코인을 기부하면 인지도를 받아요. 많이 낼수록 코인당 받는 인지도가 더 좋아집니다.
      지금까지 총 <b>${num(gameState.data.totalDonated)}코인</b>을 기부했어요.</div>
      <div class="donation-grid">
        ${DONATION_PRESETS.map(
          (amount) => `
          <button class="donation-btn" data-donate="${amount}"
            ${gameState.data.coins < amount ? "disabled" : ""}>
            <div class="donation-amt">${coin(amount, 16)}</div>
            <div class="donation-fame">${ic(uiKey("fame"), 14)} +${num(donationFame(amount))}</div>
          </button>`,
        ).join("")}
      </div>

      <h3>취미 활동 <span class="muted" style="font-size:12px">${progress.owned}/${progress.total}</span></h3>
      <div class="note">인지도가 일정 이상 쌓이면 그 취미를 <b>코인으로</b> 살 수 있어요
      (인지도 자체는 줄지 않아요). 장착할 필요 없이, 사두기만 하면 계속 효과가 붙습니다.</div>
      ${HOBBIES.map(hobbyRow).join("")}
    `;

    wire("[data-donate]", (el) => {
      const amount = Number(el.dataset.donate);
      if (gameState.data.coins < amount) return;
      const fame = gameState.donate(amount);
      if (fame <= 0) return;
      gameState.save();
      bus.emit(EVENTS.COINS_CHANGED);
      refreshAll();
    });
    wire("[data-buy-hobby]", (el) => {
      if (!gameState.buyHobby(el.dataset.buyHobby!)) return;
      gameState.save();
      refreshAll();
    });
  }

  /* ---------------------------- 매출표 패널 ---------------------------- */

  /** 매출 · 지출 · 순이익을 한 줄씩 보여주는 정산표 */
  function ledgerTable(l: DayLedger, wagePreview?: number): string {
    const wage = wagePreview ?? l.wageCost;
    const expense = l.supplyCost + wage;
    const profit = l.revenue - expense;
    return `
      <div class="ledger">
        <div class="ledger-row">
          <span>매출</span><b class="plus">+${num(l.revenue)}</b>
        </div>
        <div class="ledger-row sub">
          <span>└ 재료비 (발주)</span><b class="minus">-${num(l.supplyCost)}</b>
        </div>
        <div class="ledger-row sub">
          <span>└ 인건비 (직원 ${gameState.totalStaff()}명)</span><b class="minus">-${num(wage)}</b>
        </div>
        <div class="ledger-row">
          <span>지출 합계</span><b class="minus">-${num(expense)}</b>
        </div>
        <div class="ledger-row total ${profit < 0 ? "loss" : ""}">
          <span>순이익</span><b>${profit < 0 ? "" : "+"}${num(profit)}</b>
        </div>
      </div>`;
  }

  /** 배열을 앞에서부터 size개씩 잘라 묶습니다 (매출표를 일주일 단위로 나눌 때 씁니다) */
  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function dayRow(l: DayLedger): string {
    const profit = ledgerProfit(l);
    return `
      <div class="row">
        <div class="row-main">
          <div class="row-label">${l.day}일차 <span class="pill">손님 ${l.served}명</span></div>
          <div class="row-sub">매출 ${num(l.revenue)} · 지출 ${num(ledgerExpense(l))}</div>
        </div>
        <div class="profit ${profit < 0 ? "loss" : ""}">
          ${profit < 0 ? "" : "+"}${num(profit)}
        </div>
      </div>`;
  }

  function renderSalesPanel() {
    const today = gameState.data.today;
    const wageNow = gameState.dailyWageTotal();
    const history = gameState.data.history;

    const weeks = chunk(history, 7);
    const rows = weeks.length
      ? weeks
          .map((week, i) => {
            const revenue = week.reduce((sum, l) => sum + l.revenue, 0);
            const expense = week.reduce((sum, l) => sum + ledgerExpense(l), 0);
            const profit = week.reduce((sum, l) => sum + ledgerProfit(l), 0);
            const served = week.reduce((sum, l) => sum + l.served, 0);
            const label = i === 0 ? "이번 주" : `${i + 1}주 전`;
            const dayRange =
              week.length > 1
                ? `${week[week.length - 1].day}~${week[0].day}일차`
                : `${week[0].day}일차`;
            return `
              <div class="week-block">
                <div class="row week-summary">
                  <div class="row-main">
                    <div class="row-label">${label} <span class="pill">${dayRange}</span></div>
                    <div class="row-sub">매출 ${num(revenue)} · 지출 ${num(expense)} · 손님 ${served}명</div>
                  </div>
                  <div class="profit ${profit < 0 ? "loss" : ""}">
                    ${profit < 0 ? "" : "+"}${num(profit)}
                  </div>
                </div>
                <div class="week-days">${week.map(dayRow).join("")}</div>
              </div>`;
          })
          .join("")
      : `<p class="muted">아직 마감한 날이 없어요. 밤 ${CLOSE_HOUR}시에 첫 정산이 나옵니다.</p>`;

    bodyEl.innerHTML = `
      <div class="note">
        매일 아침 ${OPEN_HOUR}시에 열고 밤 ${CLOSE_HOUR}시에 마감해요.
        인건비는 <b>마감할 때 하루치가 한 번에</b> 나갑니다.
      </div>

      <h3>인지도</h3>
      <div class="rating-box">
        <div class="rating-big">${ic(uiKey("fame"), 24)} ${num(gameState.data.fame)}</div>
        <div class="rating-note">
          손님이 왔다 갈 때마다 서비스가 빠를수록(인내심을 많이 남길수록) 더 많이 쌓여요.
          인지도가 쌓일수록 소문이 나서 손님이 <b>더 자주</b> 옵니다.
          지금은 손님 오는 속도가 처음보다
          <b>${Math.round((1 / fameSpawnScale(gameState.data.fame)) * 100)}%</b> 예요.
        </div>
      </div>

      <h3>오늘 (${gameState.data.day}일차 · ${clockText(gameState.data.clock)})</h3>
      <div class="row-plain"><span class="muted">받은 손님</span><b>${today.served}명</b></div>
      ${ledgerTable(today, wageNow)}
      <p class="muted small">아직 마감 전이라, 인건비는 지금 인원 기준으로 미리 보여드리는 금액이에요.</p>

      <h3>지난 매출 (주간)</h3>
      ${rows}
    `;
  }

  /* ---------------------------- 마감 정산 ---------------------------- */

  /* 마감 정산은 사장님이 자리를 비웠을 수도 있으니, 몇 초 뒤에는 알아서
     다음 날로 넘어갑니다. 남은 시간을 버튼에 같이 보여줘요. */
  let autoOpenTimer: ReturnType<typeof setInterval> | null = null;

  function stopAutoOpen() {
    if (autoOpenTimer === null) return;
    clearInterval(autoOpenTimer);
    autoOpenTimer = null;
  }

  function confirmDayClose() {
    stopAutoOpen();
    closeModal.classList.add("hidden");
    sim.openNextDay();
    refreshAll();
  }

  function startAutoOpen() {
    stopAutoOpen();
    const confirmBtn = root.querySelector("#close-confirm") as HTMLElement;
    let left = Math.ceil(DAY_CLOSE_AUTO_MS / 1000);
    const paint = () => {
      confirmBtn.textContent = `내일 열기 (${left})`;
    };
    paint();
    autoOpenTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        confirmBtn.textContent = "내일 열기";
        confirmDayClose();
        return;
      }
      paint();
    }, 1000);
  }

  function showDayClosed(ledger: DayLedger) {
    const profit = ledgerProfit(ledger);
    const debt = gameState.data.coins < 0;
    closeBody.innerHTML = `
      <p class="close-lead">${ledger.day}일차 영업을 마쳤어요.
        오늘 ${ledger.served}명의 손님을 받았고,
        지금까지 쌓은 인지도는 <b>${num(gameState.data.fame)}</b> 예요.</p>
      ${ledgerTable(ledger)}
      ${
        profit < 0
          ? `<p class="warn-text">오늘은 적자예요. 인건비를 줄이거나, 비싼 메뉴를 키워보세요.</p>`
          : ""
      }
      ${
        debt
          ? `<p class="warn-text">인건비를 내고 나니 잔고가 <b>${num(gameState.data.coins)}</b> 이에요.
             빚을 갚을 때까지는 아무것도 살 수 없으니, 우선 손님부터 받아 메꿔주세요.</p>`
          : ""
      }
    `;
    closeModal.classList.remove("hidden");
    startAutoOpen();
    refreshAll();
  }

  /* ---------------------------- 직원 패널 ---------------------------- */

  /** "바리스타" 직급을 지금 가게에 맞는 이름으로 (분식집·포차는 "주방 직원") */
  function kitchenRoleName(): string {
    return gameState.cfg().kitchenRoleName;
  }

  /** 받침 유무에 따라 조사를 골라 붙입니다 (예: 바리스타 + 가/이, 주방 직원 + 이/가) */
  function withParticle(word: string, withBatchim: string, withoutBatchim: string): string {
    const last = word.charCodeAt(word.length - 1);
    const hasBatchim =
      last >= 0xac00 && last <= 0xd7a3 ? (last - 0xac00) % 28 !== 0 : false;
    return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
  }

  function roleRow(role: Role, floorIndex: number): string {
    const info = ROLE_INFO[role];
    const displayName = role === "barista" ? kitchenRoleName() : info.name;
    const count = gameState.roleCount(floorIndex, role);
    const max = roleMax(role);
    const full = count >= max;
    const costScale = gameState.cfg().costScale;
    const cost = roleCost(role, count, floorIndex, costScale);
    const wage = roleWage(role, floorIndex, costScale);
    // 사람 수(바리스타·홀 직원)는 점으로, 등급(매니저)은 Lv. 로 보여줍니다.
    const upgradable = info.upgradable === true;
    const pips = Array.from({ length: max }, (_, i) =>
      `<i class="pip ${i < count ? "on" : ""}"></i>`,
    ).join("");
    const badge = upgradable
      ? count === 0
        ? `<span class="pill zero">없음</span>`
        : `<span class="pill">Lv.${count} / ${max}</span>`
      : `<span class="pill ${count === 0 ? "zero" : ""}">${count} / ${max}명</span>`;
    const buttonLabel = full
      ? upgradable
        ? "MAX"
        : "가득"
      : count === 0
        ? coin(cost)
        : upgradable
          ? `강화 ${coin(cost)}`
          : coin(cost);
    const wageLabel = upgradable
      ? `Lv.1당 하루 ${num(wage)}`
      : `1명당 하루 ${num(wage)}`;

    return `
      <div class="row">
        ${ic(staffKey(role), 40)}
        <div class="row-main">
          <div class="row-label">${displayName} ${badge}</div>
          <div class="row-sub">${info.desc}${
            upgradable && count > 0
              ? ` · 지금 팁 <b>+${Math.round(managerTipRate(count) * 100)}%</b>`
              : ""
          }</div>
          <div class="pips">${pips}<span class="wage">${wageLabel}</span></div>
        </div>
        <button class="buy-btn" data-hire="${role}"
          ${full || gameState.data.coins < cost ? "disabled" : ""}>
          ${buttonLabel}
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

    const floorWage = gameState.floorWageTotal(floorIndex);

    bodyEl.innerHTML = `
      <div class="note">직원은 <b>층마다 따로</b> 고용해요. ${withParticle(kitchenRoleName(), "과", "와")} 홀 직원은
      <b>${roleMax("barista")}명</b>까지 뽑을 수 있고 사람이 많을수록 그만큼 빨라집니다.
      매니저는 한 명이지만 <b>Lv.${roleMax("manager")}</b> 까지 강화할 수 있어요.
      위층 직원일수록 고용비도 인건비도 비쌉니다
      (${floorIndex + 1}층은 1층의 <b>${floorPriceScale(floorIndex).toFixed(1)}배</b>).</div>

      <h3>${floorIndex + 1}층 직원</h3>
      ${ROLE_ORDER.map((role) => roleRow(role, floorIndex)).join("")}

      <div class="row-plain">
        <span class="muted">${floorIndex + 1}층 하루 인건비</span><b>${num(floorWage)}</b>
      </div>
      <div class="row-plain">
        <span class="muted">전체 하루 인건비</span><b>${num(gameState.dailyWageTotal())}</b>
      </div>

      <div class="note">
        ${withParticle(kitchenRoleName(), "이", "가")} 없으면 손님을 눌러 <b>직접 만들어야</b> 하고,
        홀 직원이 없으면 <b>직접 서빙하고 테이블도 치워야</b> 해요.
        둘 다 있는 층만 자리를 비운 동안에도 돈을 법니다.
        인건비는 <b>밤 ${CLOSE_HOUR}시 마감할 때</b> 하루치가 한 번에 나갑니다.
      </div>
    `;

    wire("[data-hire]", (el) => {
      const role = el.dataset.hire as Role;
      const count = gameState.roleCount(floorIndex, role);
      if (count >= roleMax(role)) return;
      const cost = roleCost(role, count, floorIndex, gameState.cfg().costScale);
      if (!gameState.spendCoins(cost)) return;
      gameState.setRoleCount(floorIndex, role, count + 1);
      gameState.save();
      bus.emit(EVENTS.STAFF_CHANGED);
      refreshAll();
    });
  }

  /* ---------------------------- 매장 패널 ---------------------------- */

  function renderStorePanel() {
    const rows: string[] = [];
    const costScale = gameState.cfg().costScale;

    for (let i = 0; i < MAX_FLOORS; i++) {
      const f = gameState.floor(i);
      if (f.unlocked) {
        const maxed = f.tables >= TABLES_PER_FLOOR;
        const cost = tableCost(f.tables, i, costScale);
        rows.push(`
          <div class="row">
            <div class="row-main">
              <div class="row-label">${ic(uiKey("store"), 20)} ${i + 1}층 <span class="pill">테이블 ${f.tables}/${TABLES_PER_FLOOR}</span></div>
              <div class="row-sub">${
                maxed ? "테이블을 더 놓을 자리가 없어요" : "테이블을 하나 더 놓아요"
              }</div>
            </div>
            <button class="buy-btn" data-table="${i}"
              ${maxed || gameState.data.coins < cost ? "disabled" : ""}>
              ${maxed ? "MAX" : coin(cost)}
            </button>
          </div>`);
      } else {
        const prevOpen = gameState.floor(i - 1)?.unlocked;
        const cost = floorUnlockCost(i, costScale);
        rows.push(`
          <div class="row ${prevOpen ? "" : "locked"}">
            <div class="row-main">
              <div class="row-label">${ic(uiKey("lock"), 20)} ${i + 1}층 증축</div>
              <div class="row-sub">${
                prevOpen
                  ? "새 층을 올려요. 층마다 직원을 따로 고용해야 해요"
                  : `${i}층을 먼저 열어주세요`
              }</div>
            </div>
            <button class="buy-btn alt" data-floor-buy="${i}"
              ${!prevOpen || gameState.data.coins < cost ? "disabled" : ""}>${coin(cost)}</button>
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
      if (!gameState.spendCoins(tableCost(f.tables, i, gameState.cfg().costScale))) return;
      f.tables += 1;
      gameState.save();
      bus.emit(EVENTS.LAYOUT_CHANGED);
      refreshAll();
    });

    wire("[data-floor-buy]", (el) => {
      const i = Number(el.dataset.floorBuy);
      if (!gameState.floor(i - 1)?.unlocked) return;
      if (!gameState.spendCoins(floorUnlockCost(i, gameState.cfg().costScale))) return;
      const f = gameState.floor(i);
      f.unlocked = true;
      f.tables = 2;
      gameState.save();
      bus.emit(EVENTS.LAYOUT_CHANGED);
      refreshAll();
    });
  }

  /* ---------------------------- 상점 패널 ---------------------------- */

  const SHOP_TABS: { id: "equipment" | "uniform" | "decor"; label: string; icon: string }[] = [
    { id: "equipment", label: "설비", icon: uiKey("equipment") },
    { id: "uniform", label: "유니폼", icon: uiKey("uniform") },
    { id: "decor", label: "꾸미기", icon: uiKey("decor") },
  ];

  function renderShopPanel() {
    bodyEl.innerHTML = `
      <div class="shop-subnav">
        ${SHOP_TABS.map(
          (t) => `
          <button class="shop-tab ${t.id === shopSubTab ? "active" : ""}" data-shop-tab="${t.id}">
            ${ic(t.icon, 22)}${t.label}
          </button>`,
        ).join("")}
      </div>
      <div id="shop-content"></div>
    `;
    wire("[data-shop-tab]", (el) => {
      shopSubTab = el.dataset.shopTab as typeof shopSubTab;
      renderShopPanel();
    });
    const content = bodyEl.querySelector("#shop-content") as HTMLElement;
    if (shopSubTab === "equipment") renderEquipmentPanel(content);
    else if (shopSubTab === "uniform") renderUniformPanel(content);
    else renderDecorPanel(content);
  }

  /* ---------------------------- 설비 패널 ---------------------------- */

  function renderEquipmentPanel(target: HTMLElement = bodyEl) {
    const floorIndex = activeFloor;
    if (!gameState.floor(floorIndex).unlocked) {
      target.innerHTML = `<p class="muted">아직 열지 않은 층이에요. 매장 탭에서 먼저 증축해주세요.</p>`;
      return;
    }

    const cfg = gameState.cfg();
    const rows = cfg.equipment.map((eq) => {
      const owned = gameState.hasEquipment(floorIndex, eq.id);
      const cost = equipmentCost(eq, floorIndex);
      const elsewhere = !owned && gameState.hasEquipmentAnywhere(eq.id);
      const uses = [...cfg.drinks, ...cfg.desserts]
        .filter((m) => m.equipmentId === eq.id)
        .map((m) => ic(itemKey(m.id), 26))
        .join("");
      return `
        <div class="row">
          ${ic(equipKey(eq.id), 44)}
          <div class="row-main">
            <div class="row-label">${eq.name} ${
              owned ? `<span class="pill">보유</span>` : ""
            }</div>
            <div class="row-sub">${
              elsewhere ? "다른 층에는 있지만, 이 층에는 따로 사야 해요" : eq.desc
            }<br>${uses}</div>
          </div>
          ${
            owned
              ? `<div class="buy-btn" style="background:#f0e3ca;color:#7a5a33">✓</div>`
              : `<button class="buy-btn" data-equip="${eq.id}"
                   ${gameState.data.coins < cost ? "disabled" : ""}>${coin(cost)}</button>`
          }
        </div>`;
    }).join("");

    target.innerHTML = `
      <div class="note">설비는 <b>층마다 따로</b> 사야 해요. 지금 보고 있는 층은
      <b>${floorIndex + 1}층</b> 이고, 위층일수록 설비값이 비쌉니다
      (${floorIndex + 1}층은 1층의 <b>${floorPriceScale(floorIndex).toFixed(1)}배</b>).
      커피머신은 어느 층이든 기본으로 드려요.</div>
      ${rows}
    `;

    wire("[data-equip]", (el) => {
      if (gameState.buyEquipment(floorIndex, el.dataset.equip!)) {
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
      <p class="offline-earn">${ic("icon-coin", 26)} +${num(gameState.offlineEarnings)}</p>
      <p class="muted">손님 ${num(gameState.offlineServes)}명을 받았어요</p>
      ${
        gameState.hasGeneralManager()
          ? `<p class="muted">점장이 발주까지 챙겼어요 (원가는 차감됨)</p>`
          : `<p class="muted">점장을 고용하면 재고가 안 끊겨서 훨씬 오래 벌 수 있어요</p>`
      }
    `;
    offlineModal.classList.remove("hidden");
    refreshCoins();
  }

  /* ----------------------------- 배선 ----------------------------- */

  root.querySelector("#panel-close")?.addEventListener("click", closePanel);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closePanel();
  });

  // 맨 위까지 스크롤한 상태에서 아래로 더 당기면, 바텀시트를 끌어내리듯 자연스럽게 닫힙니다.
  {
    const modalCard = modal.querySelector(".modal-card") as HTMLElement;
    let dragStartY = 0;
    let dragging = false;
    let dragDelta = 0;

    bodyEl.addEventListener(
      "touchstart",
      (e) => {
        if (bodyEl.scrollTop > 0) {
          dragging = false;
          return;
        }
        dragStartY = e.touches[0].clientY;
        dragging = true;
        dragDelta = 0;
        modalCard.style.transition = "none";
      },
      { passive: true },
    );

    bodyEl.addEventListener(
      "touchmove",
      (e) => {
        if (!dragging) return;
        const delta = e.touches[0].clientY - dragStartY;
        if (delta <= 0) {
          dragging = false;
          modalCard.style.transform = "";
          return;
        }
        dragDelta = delta;
        modalCard.style.transform = `translateY(${delta}px)`;
        e.preventDefault();
      },
      { passive: false },
    );

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      modalCard.style.transition = "transform 0.2s ease";
      if (dragDelta > 90) {
        modalCard.style.transform = "translateY(100%)";
        window.setTimeout(() => {
          closePanel();
          modalCard.style.transition = "";
          modalCard.style.transform = "";
        }, 180);
      } else {
        modalCard.style.transform = "";
      }
    };
    bodyEl.addEventListener("touchend", endDrag);
    bodyEl.addEventListener("touchcancel", endDrag);
  }

  // 뒤로 가기(안드로이드 기본 동작)를 누르면 바로 앱이 꺼지지 않고, 먼저 확인을 받습니다.
  // 열려있는 패널이 있으면 그것부터 닫고, 아무것도 안 열려있을 때만 나가기 확인창을 띄워요.
  {
    const exitModal = root.querySelector("#exit-modal") as HTMLElement;
    let allowExit = false;

    history.pushState(null, "", location.href);
    window.addEventListener("popstate", () => {
      if (allowExit) return;
      history.pushState(null, "", location.href);
      if (openPanel) {
        closePanel();
        return;
      }
      exitModal.classList.remove("hidden");
    });

    root.querySelector("#exit-cancel")?.addEventListener("click", () => {
      exitModal.classList.add("hidden");
    });
    root.querySelector("#exit-confirm")?.addEventListener("click", () => {
      allowExit = true;
      gameState.save();
      history.back();
    });
    exitModal.addEventListener("click", (e) => {
      if (e.target === exitModal) exitModal.classList.add("hidden");
    });
  }

  clockPill.addEventListener("click", () => showPanel("sales"));
  famePill.addEventListener("click", () => showPanel("fame"));
  root.querySelector("#world-btn")?.addEventListener("click", () => {
    closePanel();
    bus.emit(EVENTS.EXIT_TO_WORLD);
  });
  root.querySelector("#close-confirm")?.addEventListener("click", confirmDayClose);
  root.querySelector("#enhance-confirm")?.addEventListener("click", confirmEnhance);
  root.querySelector("#enhance-cancel")?.addEventListener("click", closeEnhanceModal);
  enhanceModal.addEventListener("click", (e) => {
    if (e.target === enhanceModal) closeEnhanceModal();
  });

  bus.on(EVENTS.OPEN_PANEL, (id: PanelId) => showPanel(id));
  bus.on(EVENTS.DAY_CLOSED, (ledger: DayLedger) => showDayClosed(ledger));
  // 코드로 그린 그림이 준비되면, 이모지 자리를 그림으로 바꿔 다시 그립니다.
  // 다른 가게로 들어올 때마다도 다시 불려서(카페 씬이 새로 시작하므로),
  // 그때는 1층부터 새로 보여주고 열려 있던 창은 닫아둡니다.
  bus.on(EVENTS.ART_READY, () => {
    activeFloor = 0;
    closePanel();
    refreshNav();
    refreshAll();
  });
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
  bus.on(EVENTS.FAME_GAINED, () => {
    refreshFame();
    if (openPanel === "fame") renderPanel();
  });
  bus.on(EVENTS.OFFLINE_REWARD, () => {
    showOfflineIfAny();
    refreshAll();
  });

  // 층 탭의 "직접 눌러야 해요" 표시를 주기적으로 갱신
  setInterval(refreshTabs, 700);
  // 게임 속 시계는 계속 흐르므로 짧은 간격으로 표시만 갱신합니다
  setInterval(refreshClock, 250);

  refreshNav();
  refreshAll();
  showOfflineIfAny();
}
