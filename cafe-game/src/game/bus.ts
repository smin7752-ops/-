import Phaser from "phaser";

/** shared event channel between the Phaser scene and the HTML UI overlay */
export const bus = new Phaser.Events.EventEmitter();

export const EVENTS = {
  COINS_CHANGED: "coins-changed",
  TABLES_CHANGED: "tables-changed",
  STAFF_CHANGED: "staff-changed",
  MENU_CHANGED: "menu-changed",
  OPEN_SHOP: "open-shop",
  BUY_TABLE: "buy-table",
  BUY_STAFF: "buy-staff",
  BUY_MENU: "buy-menu",
} as const;
