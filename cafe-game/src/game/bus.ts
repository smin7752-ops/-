import Phaser from "phaser";

/** 게임 화면(Phaser)과 HTML UI 사이를 잇는 공용 이벤트 채널 */
export const bus = new Phaser.Events.EventEmitter();

export const EVENTS = {
  /** 코인이 바뀜 */
  COINS_CHANGED: "coins-changed",
  /** 재고가 바뀜 (발주/판매) */
  STOCK_CHANGED: "stock-changed",
  /** 메뉴 레벨이 올라감 (새 메뉴가 열렸을 수도 있음) */
  MENU_LEVELED: "menu-leveled",
  /** 매장 구조가 바뀜 (층/테이블) — 시뮬레이션을 다시 맞춰야 함 */
  LAYOUT_CHANGED: "layout-changed",
  /** 고용 상태가 바뀜 */
  STAFF_CHANGED: "staff-changed",
  /** 보고 있는 층이 바뀜 */
  FLOOR_SWITCHED: "floor-switched",

  /** 서빙 완료 (코인 팝업용) */
  SERVED: "served",
  /** 손님이 화내고 나감 */
  CUSTOMER_ANGRY: "customer-angry",
  /** 바리스타 없이 손으로 만들었음 */
  MADE_BY_HAND: "made-by-hand",
  /** 테이블을 치웠음 */
  TABLE_CLEANED: "table-cleaned",

  /** UI 패널을 열어달라는 요청 */
  OPEN_PANEL: "open-panel",
  /** 자리를 비운 동안 번 돈을 보여줄 차례 */
  OFFLINE_REWARD: "offline-reward",
  /** 코드로 그린 그림이 다 준비됨 — HTML 화면도 그 그림으로 다시 그립니다 */
  ART_READY: "art-ready",
  /** 밤 10시가 되어 하루를 마감했음 (마감 정산 화면을 띄웁니다) */
  DAY_CLOSED: "day-closed",
  /** 유니폼을 사거나 갈아입었음 (화면의 직원 옷을 바꿉니다) */
  UNIFORM_CHANGED: "uniform-changed",
  /** 인테리어를 사거나 바꿔 씀 (화면의 바닥·벽지·가구·문을 바꿉니다) */
  DECOR_CHANGED: "decor-changed",
} as const;
