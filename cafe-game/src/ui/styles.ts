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
  #ui-root .coin-pill {
    background: rgba(0,0,0,0.6);
    padding: 8px 20px;
    border-radius: 999px;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.3px;
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
