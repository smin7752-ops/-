export function injectStyles() {
  if (document.getElementById("ui-styles")) return;
  const style = document.createElement("style");
  style.id = "ui-styles";
  style.textContent = `
  #ui-root .top-bar {
    position: absolute;
    top: max(10px, env(safe-area-inset-top));
    left: 0; right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  #ui-root .pill-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #ui-root .coin-pill {
    background: rgba(0,0,0,0.6);
    padding: 6px 18px 6px 10px;
    border-radius: 999px;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  /* 게임 속 시각. 누르면 매출표가 열립니다. */
  #ui-root .clock-pill {
    background: rgba(0,0,0,0.6);
    color: #fff;
    border: none;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 800;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 7px;
    line-height: 1.1;
  }
  #ui-root .clock-pill #day-label { font-size: 11px; opacity: 0.75; }
  #ui-root .clock-pill #clock-label { font-size: 17px; font-variant-numeric: tabular-nums; }
  #ui-root .coin-pill.debt { background: #8a3b3b; }
  /* 가게 평점. 누르면 매출표가 열립니다. */
  #ui-root .rating-pill {
    background: rgba(0,0,0,0.6);
    color: #fff;
    border: none;
    padding: 6px 13px;
    border-radius: 999px;
    font-weight: 800;
    font-family: inherit;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }
  #ui-root .rating-pill .star { color: #f5c542; }
  #ui-root .rating-pill.low { background: #8a3b3b; }
  #ui-root .rating-pill.high { background: #3f6b47; }

  #ui-root .rating-box {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #fdf6e7;
    border: 1px solid #e6d5b4;
    border-radius: 12px;
    padding: 12px;
    margin: 8px 0 4px;
  }
  #ui-root .rating-big {
    font-size: 30px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
  }
  #ui-root .rating-big .star { color: #f5c542; }
  #ui-root .rating-note { font-size: 11.5px; color: #8a7a63; line-height: 1.5; }
  #ui-root .clock-pill.closed { background: #8a3b3b; }
  #ui-root .clock-pill.closed #day-label::after { content: " · 마감"; }

  /* 코드로 그린 그림을 HTML 안에 넣을 때 쓰는 상자 */
  #ui-root .ic-box {
    display: inline-block;
    object-fit: contain;
    vertical-align: middle;
    flex: 0 0 auto;
  }
  #ui-root .floor-tabs {
    display: flex;
    gap: 6px;
  }
  #ui-root .floor-tab {
    position: relative;
    background: rgba(0,0,0,0.45);
    color: #fff;
    border: 2px solid transparent;
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
  }
  #ui-root .floor-tab.active {
    background: #e8973a;
    color: #3b2410;
    border-color: #fff3;
  }
  #ui-root .floor-tab.locked { opacity: 0.5; }
  #ui-root .floor-tab .dot {
    position: absolute;
    top: -3px; right: -3px;
    width: 10px; height: 10px;
    background: #e74c3c;
    border-radius: 50%;
    border: 2px solid #2b1c10;
  }

  #ui-root .warn-banner {
    background: #c0392b;
    color: #fff;
    padding: 7px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
  }

  #ui-root .bottom-bar {
    position: absolute;
    bottom: max(12px, env(safe-area-inset-bottom));
    left: 0; right: 0;
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
  }
  #ui-root .nav-btn {
    flex: 1 1 0;
    max-width: 92px;
    background: #e8973a;
    color: #3b2410;
    border: none;
    padding: 9px 4px 7px;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 4px 0 #b4701f;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    line-height: 1.1;
  }
  #ui-root .nav-btn .ico { font-size: 19px; }
  /* 버튼이 6개라 좁은 폰에서도 들어가게 조금 줄입니다 */
  #ui-root .nav-btn { max-width: 76px; padding: 7px 2px 6px; font-size: 10.5px; }
  #ui-root .nav-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #b4701f; }
  #ui-root .nav-btn .badge {
    position: absolute;
    margin-left: 34px;
    margin-top: -4px;
    width: 9px; height: 9px;
    background: #e74c3c;
    border-radius: 50%;
  }

  #ui-root .modal {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  #ui-root .modal.hidden { display: none; }
  #ui-root .modal-card {
    background: #fff8ec;
    color: #3b2410;
    width: min(460px, 100%);
    max-height: 82vh;
    display: flex;
    flex-direction: column;
    border-radius: 22px 22px 0 0;
    padding: 18px 18px calc(18px + env(safe-area-inset-bottom));
  }
  #ui-root .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    flex: 0 0 auto;
  }
  #ui-root .modal-header h2 { margin: 0; font-size: 20px; }
  #ui-root .modal-body { overflow-y: auto; flex: 1 1 auto; -webkit-overflow-scrolling: touch; }
  #ui-root .icon-btn {
    background: none; border: none; font-size: 22px; color: #3b2410; padding: 4px 8px;
  }

  #ui-root h3 {
    font-size: 13px;
    margin: 16px 0 6px;
    color: #8a5a34;
    letter-spacing: 0.4px;
  }
  #ui-root h3:first-child { margin-top: 4px; }

  #ui-root .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #ecdcc0;
  }
  #ui-root .row-main { flex: 1 1 auto; min-width: 0; }
  #ui-root .row-label { font-weight: 700; font-size: 15px; }
  #ui-root .row-sub { font-size: 11.5px; color: #8a7a63; margin-top: 2px; line-height: 1.35; }
  #ui-root .row.locked { opacity: 0.62; }

  /* 표 한 줄 (합계처럼 값만 보여줄 때) */
  #ui-root .row-plain {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 0;
    font-size: 13.5px;
    border-bottom: 1px solid #ecdcc0;
  }

  /* 직원 인원수를 점으로 보여주는 표시 */
  #ui-root .pips {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 5px;
  }
  #ui-root .pip {
    width: 9px; height: 9px;
    border-radius: 50%;
    background: #e0d2b8;
    box-shadow: inset 0 0 0 1px #cbb894;
  }
  #ui-root .pip.on { background: #e8973a; box-shadow: inset 0 0 0 1px #b4701f; }
  #ui-root .wage { font-size: 11px; color: #8a7a63; margin-left: 6px; }

  /* 매출 · 지출 · 순이익 정산표 */
  #ui-root .ledger {
    background: #fdf6e7;
    border: 1px solid #e6d5b4;
    border-radius: 12px;
    padding: 10px 12px;
    margin: 10px 0;
    font-variant-numeric: tabular-nums;
  }
  #ui-root .ledger-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 5px 0;
    font-size: 14px;
  }
  #ui-root .ledger-row.sub { font-size: 12px; color: #8a7a63; padding: 2px 0 2px 8px; }
  #ui-root .ledger-row.total {
    border-top: 2px solid #e6d5b4;
    margin-top: 6px;
    padding-top: 9px;
    font-size: 17px;
    font-weight: 800;
  }
  #ui-root .ledger .plus { color: #3f8f4d; }
  #ui-root .ledger .minus { color: #b4564c; }
  #ui-root .ledger-row.total b { color: #3f8f4d; }
  #ui-root .ledger-row.total.loss b { color: #b4564c; }

  #ui-root .profit {
    font-weight: 800;
    font-size: 15px;
    color: #3f8f4d;
    font-variant-numeric: tabular-nums;
  }
  #ui-root .profit.loss { color: #b4564c; }

  #ui-root .week-block {
    background: #f6ecd8;
    border-radius: 14px;
    padding: 4px 12px;
    margin: 10px 0;
  }
  #ui-root .week-summary { border-bottom: 2px solid #e0cba0; }
  #ui-root .week-summary .row-label { font-size: 16px; }
  #ui-root .week-days .row:last-child { border-bottom: none; }
  #ui-root .week-days .row { padding-left: 4px; }

  #ui-root .close-lead { font-size: 14px; line-height: 1.5; }
  #ui-root .warn-text {
    background: #fbe7e4;
    color: #a5342a;
    border-radius: 10px;
    padding: 9px 11px;
    font-size: 12.5px;
    line-height: 1.45;
  }
  #ui-root .small { font-size: 11.5px; }
  /* 유니폼 효과 두 종류를 구분해서 보여줍니다 */
  #ui-root .eff-equip,
  #ui-root .eff-own {
    display: inline-block;
    font-size: 10px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 5px;
    margin-right: 3px;
  }
  #ui-root .eff-equip { background: #e8973a; color: #3b2410; }
  #ui-root .eff-own { background: #cfe0c4; color: #35502c; }
  /* 메뉴바가 7칸이 되어 더 좁혀야 합니다 */
  #ui-root .nav-btn { max-width: 66px; padding: 6px 1px 5px; font-size: 9.5px; }
  /* 세트 메뉴의 음료 + 디저트 그림 두 개 */
  #ui-root .set-pair { display: flex; flex: 0 0 auto; margin-right: -4px; }
  #ui-root .set-pair .ic-box:last-child { margin-left: -8px; }

  #ui-root .buy-btn {
    flex: 0 0 auto;
    background: #7ac74f;
    color: #1e3a10;
    border: none;
    padding: 9px 13px;
    border-radius: 12px;
    font-weight: 800;
    font-size: 13px;
    white-space: nowrap;
  }
  #ui-root .buy-btn:disabled { background: #ddd3bf; color: #9a8b74; }
  #ui-root .buy-btn.alt { background: #4aa3df; color: #06263c; }

  #ui-root .lv-bar {
    height: 5px;
    background: #e6d7bb;
    border-radius: 3px;
    margin-top: 5px;
    overflow: hidden;
  }
  #ui-root .lv-bar > i {
    display: block;
    height: 100%;
    background: #e8973a;
  }
  #ui-root .pill {
    display: inline-block;
    background: #f0e3ca;
    color: #7a5a33;
    border-radius: 6px;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: 800;
    margin-right: 5px;
  }
  #ui-root .pill.low { background: #f6d0cb; color: #a5342a; }
  #ui-root .pill.zero { background: #e74c3c; color: #fff; }

  #ui-root .muted { color: #8a7a63; font-size: 13px; line-height: 1.5; }
  #ui-root .note {
    background: #f3e7d0;
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 12px;
    color: #7a5a33;
    line-height: 1.5;
    margin: 8px 0 2px;
  }

  #ui-root .offline-earn {
    font-size: 30px; font-weight: 800; color: #e8973a; text-align: center; margin: 6px 0;
  }
  #ui-root #offline-body p { text-align: center; margin: 5px 0; }
  #ui-root #offline-modal .modal-card { border-radius: 22px; }
  #ui-root #offline-modal { align-items: center; padding: 22px; }
  #ui-root .primary-btn {
    background: #e8973a; color: #3b2410; border: none;
    padding: 13px 26px; border-radius: 14px; font-size: 16px; font-weight: 800;
    box-shadow: 0 4px 0 #b4701f; width: 100%; margin-top: 10px;
  }
  `;
  document.head.appendChild(style);
}
