// ============================================================
//  나의 AI 회사 설정 — 여기 한 파일만 고치면 됩니다
// ============================================================
//  회사 이름, 부서 이름, 직원 이름·성격·머리색까지 전부 여기 있어요.
//  다른 파일은 건드리지 않아도 됩니다.
//
//  ⚠️ 딱 2가지 규칙
//   1. 부서 id(research, brand, ...)는 절대 바꾸지 마세요. 시뮬레이션 엔진이
//      이 id로 움직입니다. 바꾸면 캐릭터가 길을 잃어요.
//      → 바꿔도 되는 건 name(부서 이름) · icon · short 입니다.
//   2. 부서는 12개를 유지하세요. 사무실 배치가 4열 3행 = 12칸 고정입니다.
//      안 쓰는 부서는 지우지 말고 이름만 바꿔서 쓰세요.
//
//  직원 수는 자유롭게 늘리고 줄여도 됩니다. 한 팀에 팀장(lead) 1명은 두세요.
// ============================================================

/** 회사 기본 정보 */
export const COMPANY = {
  /** 좌측 상단 헤더에 뜨는 회사 이름 */
  name: "하루로그",
  /** 헤더 로고 배지에 들어갈 글자 1개 (이모지도 됩니다) */
  logoLetter: "하",
  /** 화면 상단 큰 제목 (앞부분) */
  titlePrefix: "하루의",
  /** 화면 상단 큰 제목 (강조되는 뒷부분) */
  titleAccent: "일상 브이로그",
  /** 브라우저 탭 제목 */
  pageTitle: "하루로그 — 나의 AI 오피스",
  /** 검색·공유될 때 뜨는 설명 */
  description:
    "가상의 캐릭터 '하루'가 살아가는 평범하지만 사랑스러운 하루하루를 담는 롤플레잉(RP) 일상 브이로그 채널 '하루로그'를 위한 AI 오피스. 캐릭터의 말투·세계관을 지키면서, 소소한 에피소드를 매일 기록합니다.",
  /** 창 하단 파일명 느낌의 라벨 */
  windowLabel: "harulog.exe — 대표실",
  /** 일일 브리핑 제목에 들어갈 이름 */
  reportName: "하루로그",
} as const;

/** 대표(나) — 사무실 대표실에 앉아 있는 캐릭터 */
export const CEO_PROFILE = {
  name: "수아",
  callsign: "대표님",
  role: "'하루' 캐릭터 크리에이터 · 최종 의사결정",
  hair: "#8b5a3c",
  shirt: "#f4e4c1",
  accent: "#ffb199",
  skin: "#ffdcc4",
  thoughts: [
    "'하루'는 완벽한 하루가 아니라 진짜 같은 하루를 살아야 해.",
    "캐릭터 설정은 어제 한 말이랑 오늘 한 말이 달라지면 안 돼.",
    "화려한 이벤트보다 소소한 디테일이 몰입을 만든다.",
    "연기 같지 않게, 정말 옆집에 사는 사람처럼.",
  ],
};

/**
 * 부서 12개.
 * id = 고정(엔진용) / name·short·icon = 자유롭게 변경
 * task = 오늘 하는 일 / report = 팀장 한줄보고
 */
export const DEPARTMENTS = [
  {
    id: "research",
    name: "일상 소재 리서치팀",
    short: "daily.lab",
    icon: "🔍",
    task: "오늘 '하루'가 겪을 소소한 일상 소재 조사",
    report: "공감 가는 디테일부터 모아서 올려요.",
  },
  {
    id: "brand",
    name: "캐릭터 정체성팀",
    short: "character.id",
    icon: "🎭",
    task: "'하루'의 말투·성격·세계관 일관성 점검",
    report: "지표 연동이 되면 반응 수치까지 붙습니다.",
  },
  {
    id: "strategy1",
    name: "콘텐츠 기획팀",
    short: "idea.studio",
    icon: "💡",
    task: "이번 주 '하루' 에피소드 후보 10개 기획",
    report: "설레는 일·소소한 고민 비중을 맞춰 TOP 3까지 좁혀요.",
  },
  {
    id: "qa",
    name: "세계관 검수팀",
    short: "lore.check",
    icon: "🛡️",
    task: "캐릭터 설정·타임라인 오류(설정 붕괴) 검수",
    report: "예전 에피소드랑 말이 다르면 바로 반려해요.",
  },
  {
    id: "strategy2",
    name: "대본·자막 작성팀",
    short: "script.team",
    icon: "✍️",
    task: "브이로그 나레이션·자막 대본 작성",
    report: "'하루' 특유의 말투 톤 유지해서 써요.",
  },
  {
    id: "reels",
    name: "영상 제작팀",
    short: "video.edit",
    icon: "🎬",
    task: "일상 브이로그 영상 촬영본 편집·자막 작업",
    report: "캐릭터 얼굴·목소리 일관성부터 체크해요.",
  },
  {
    id: "carousel",
    name: "이미지·캐릭터 디자인팀",
    short: "design.studio",
    icon: "🖼️",
    task: "캐릭터 비주얼·썸네일 이미지 제작",
    report: "매일 같은 얼굴로 보이게 스타일을 고정해요.",
  },
  {
    id: "partner",
    name: "협업 커뮤니케이션팀",
    short: "partner.mail",
    icon: "💌",
    task: "브랜드 협찬·콜라보 제안 검토",
    report: "초안까지만 씁니다. 계약은 대표가 직접 해요.",
  },
  {
    id: "finance",
    name: "재무·정산팀",
    short: "finance.xls",
    icon: "🧾",
    task: "브랜드 협찬비·굿즈·후원 등 수익 항목 정리",
    report: "정산서가 오면 바로 반영합니다.",
  },
  {
    id: "review",
    name: "성과리뷰팀",
    short: "review.data",
    icon: "📈",
    task: "조회수·저장·댓글 반응 기록",
    report: "어떤 에피소드가 반응 좋았는지 패턴으로 남겨요.",
  },
  {
    id: "ops",
    name: "자동화 운영팀",
    short: "automation.ops",
    icon: "⚙️",
    task: "발행 스케줄·연동·실패 재시도 관리",
    report: "실패하면 재시도하고 로그를 남겨요.",
  },
  {
    id: "secretary",
    name: "비서실",
    short: "secretary.hq",
    icon: "📋",
    task: "전사 한줄보고·최종 브리핑",
    report: "모든 팀 상태를 모아 결정할 것만 남겨드려요.",
  },
] as const;

/**
 * 직원 명단.
 * dept = 위 부서 id / rank: "lead"(팀장) 또는 "member"(팀원)
 * colors = [머리색, 옷색, 포인트색]
 * thoughts = 자리를 비웠을 때 머리 위에 뜨는 혼잣말
 */
export type StaffEntry = {
  dept: string;
  rank: "lead" | "member";
  name: string;
  role: string;
  colors: [string, string, string];
  thoughts: string[];
  callsign?: string;
};

export const STAFF_LIST: StaffEntry[] = [
  // ① 일상 소재 리서치팀
  { dept: "research", rank: "lead", name: "김서연", role: "일상 소재 리서치 팀장", callsign: "김리서",
    colors: ["#6b3d34", "#fff3b0", "#ff8fc0"],
    thoughts: ["너무 특별한 사건 말고, 진짜 있을 법한 하루를 찾자.", "디테일 하나가 몰입을 만든다.", "이 소재, '하루'라면 어떻게 반응할지부터 생각한다."] },
  { dept: "research", rank: "member", name: "오태윤", role: "일상 소재 발굴",
    colors: ["#2f2a3d", "#c9b8ff", "#b8f0dd"],
    thoughts: ["요즘 사람들 일상에서 뭐가 공감되는지 체크.", "너무 흔한 소재는 '하루'만의 시선으로 비틀어야 해요."] },
  { dept: "research", rank: "member", name: "하은채", role: "공감 포인트 조사",
    colors: ["#8a4a3c", "#b8f0dd", "#ff8fc0"],
    thoughts: ["이 상황, 실제로 겪어본 사람 많을지 확인.", "계절감·요일감 놓치면 안 돼."] },

  // ② 캐릭터 정체성팀
  { dept: "brand", rank: "lead", name: "박보라", role: "캐릭터 정체성 팀장", callsign: "박브리",
    colors: ["#372b4a", "#c9b8ff", "#c9b8ff"],
    thoughts: ["지표 연동 전엔 수치를 지어내지 않아요.", "'하루' 말투가 오늘도 어제랑 같은지 확인."] },
  { dept: "brand", rank: "member", name: "신재원", role: "채널 반응 분석",
    colors: ["#3c3a4f", "#ffe6f2", "#c9b8ff"],
    thoughts: ["저장·댓글 반응이 조회수보다 중요해요.", "30일 흐름부터 그려보자."] },
  { dept: "brand", rank: "member", name: "임다혜", role: "말투·세계관 검증",
    colors: ["#5a3450", "#fff3b0", "#ff8fc0"],
    thoughts: ["너무 연기하는 말투는 이 채널이랑 안 맞아요.", "담백하고 자연스러운 톤 유지하는지 본다."] },

  // ③ 콘텐츠 기획팀
  { dept: "strategy1", rank: "lead", name: "최아름", role: "콘텐츠 기획 팀장", callsign: "최아이",
    colors: ["#c26e4b", "#ff8fc0", "#fff3b0"],
    thoughts: ["오늘도 정확히 10개, 예외 없어요.", "설레는 일이랑 소소한 고민 비율부터 나누고 시작.", "이번 주는 어떤 감정선으로 갈지부터 정하자."] },
  { dept: "strategy1", rank: "member", name: "정유진", role: "에피소드 후보 발굴",
    colors: ["#7b4a2f", "#b8f0dd", "#ff8fc0"],
    thoughts: ["제목을 좀 더 궁금하게 바꿔볼까.", "이 에피소드, 다음 화로 이어질 여지가 있어야 산다."] },
  { dept: "strategy1", rank: "member", name: "배시현", role: "오프닝 문구 기획",
    colors: ["#2c2638", "#fff3b0", "#c9b8ff"],
    thoughts: ["'안녕, 오늘의 하루야' 인사말은 고정으로 가요.", "과장된 후킹 문구는 이 채널 톤이랑 안 맞아요."] },

  // ④ 세계관 검수팀
  { dept: "qa", rank: "lead", name: "윤규아", role: "세계관 검수 팀장", callsign: "윤큐아",
    colors: ["#2d4b46", "#b8f0dd", "#b8f0dd"],
    thoughts: ["설정 붕괴부터 체크합니다.", "타임라인 안 맞는 안은 반려예요."] },
  { dept: "qa", rank: "member", name: "강태오", role: "타임라인·설정 검사",
    colors: ["#463227", "#ffe6f2", "#b8f0dd"],
    thoughts: ["요일·날짜 하나 틀리면 몰입감 훅 떨어져요.", "지난 화랑 이어지는 설정인지 확인."] },
  { dept: "qa", rank: "member", name: "문세라", role: "캐릭터 반응 검수",
    colors: ["#6c3a55", "#c9b8ff", "#fff3b0"],
    thoughts: ["'하루'답지 않은 반응은 바로 빼요.", "실제 사람 같은 반응인지, 어색한 연기는 아닌지 본다."] },

  // ⑤ 대본·자막 작성팀
  { dept: "strategy2", rank: "lead", name: "한도빈", role: "대본 팀장", callsign: "한대본",
    colors: ["#8b534a", "#fff3b0", "#ff8fc0"],
    thoughts: ["승인된 소재만 대본으로 씁니다.", "마무리 인사, 이번에도 빠뜨리지 말자."] },
  { dept: "strategy2", rank: "member", name: "조민서", role: "나레이션 대본",
    colors: ["#33304a", "#ff8fc0", "#b8f0dd"],
    thoughts: ["문장은 짧게, 말하듯이 써야 해요.", "너무 설명충 대사는 잘라낸다."] },
  { dept: "strategy2", rank: "member", name: "백가온", role: "자막 타이밍",
    colors: ["#5d3a2c", "#b8f0dd", "#c9b8ff"],
    thoughts: ["자막이 대사보다 먼저 뜨면 몰입 깨져요.", "마지막 문단은 다음 화 예고로 닫아요."] },

  // ⑥ 영상 제작팀
  { dept: "reels", rank: "lead", name: "송리원", role: "영상 제작 팀장", callsign: "송릴스",
    colors: ["#2c2638", "#ff8fc0", "#ff8fc0"],
    thoughts: ["캐릭터 얼굴·목소리는 매일 같아야 해요.", "짧고 임팩트 있게 15~30초로 자른다."] },
  { dept: "reels", rank: "member", name: "권지호", role: "편집",
    colors: ["#4a3a2a", "#fff3b0", "#b8f0dd"],
    thoughts: ["템포가 늘어지면 이탈이에요.", "출처 표기는 대표가 직접 확인해요."] },
  { dept: "reels", rank: "member", name: "유세아", role: "자막·썸네일",
    colors: ["#7a3f58", "#c9b8ff", "#ff8fc0"],
    thoughts: ["표정 클로즈업으로 썸네일 뽑아둘게요.", "워터마크는 안 넣습니다."] },

  // ⑦ 이미지·캐릭터 디자인팀
  { dept: "carousel", rank: "lead", name: "이가림", role: "이미지·캐릭터 디자인 팀장", callsign: "이캐리",
    colors: ["#d88d68", "#c9b8ff", "#c9b8ff"],
    thoughts: ["캐릭터 얼굴 일관성이 제일 중요해요.", "오늘 분위기랑 색감부터 맞추고 시작."] },
  { dept: "carousel", rank: "member", name: "남주하", role: "레이아웃",
    colors: ["#3a2f4d", "#ffe6f2", "#ff8fc0"],
    thoughts: ["감성 있는 여백부터 잡는 중.", "표지 3안부터 만들자."] },
  { dept: "carousel", rank: "member", name: "표하늘", role: "텍스트 교체",
    colors: ["#274a44", "#fff3b0", "#b8f0dd"],
    thoughts: ["캐릭터 이름 오타는 절대 안 돼요.", "복제본에만 손댑니다."] },

  // ⑧ 협업 커뮤니케이션팀
  { dept: "partner", rank: "lead", name: "정파랑", role: "협업 팀장", callsign: "정파트",
    colors: ["#563a32", "#b8f0dd", "#b8f0dd"],
    thoughts: ["메일 연동 전이라 아직 못 읽어요.", "실제 계약·답장은 대표 손으로."] },
  { dept: "partner", rank: "member", name: "구예성", role: "협업 검토",
    colors: ["#452d3f", "#c9b8ff", "#fff3b0"],
    thoughts: ["캐릭터 결이랑 맞는 콜라보 제안만 받습니다.", "답장 초안까지만 준비해둘게요."] },

  // ⑨ 재무·정산팀
  { dept: "finance", rank: "lead", name: "오재민", role: "재무 팀장", callsign: "오재무",
    colors: ["#313b56", "#fff3b0", "#fff3b0"],
    thoughts: ["정산서가 오면 바로 정리합니다.", "협찬비 입금 대기 건부터 확인해요."] },
  { dept: "finance", rank: "member", name: "심우진", role: "정산 관리",
    colors: ["#4b3b2c", "#b8f0dd", "#c9b8ff"],
    thoughts: ["지연된 건은 따로 표시해둡니다.", "정산은 자동으로 처리 안 해요."] },

  // ⑩ 성과리뷰팀
  { dept: "review", rank: "lead", name: "강성아", role: "성과리뷰 팀장", callsign: "강성과",
    colors: ["#9c5c72", "#ff8fc0", "#ff8fc0"],
    thoughts: ["잘된 이유를 패턴으로 남겨야 해요.", "저장·댓글이 조회수보다 진짜 지표입니다."] },
  { dept: "review", rank: "member", name: "마지훈", role: "지표 수집",
    colors: ["#2e3a4a", "#ffe6f2", "#b8f0dd"],
    thoughts: ["조회수·저장 수 다시 긁어옵니다.", "연동되면 자동화돼요."] },
  { dept: "review", rank: "member", name: "여름", role: "학습점 정리",
    colors: ["#6b4a2f", "#c9b8ff", "#fff3b0"],
    thoughts: ["반복할 패턴 1개, 중단할 패턴 1개.", "다음 기획팀에 넘길 학습점 정리 중."] },

  // ⑪ 자동화 운영팀
  { dept: "ops", rank: "lead", name: "안도현", role: "자동화 운영 팀장", callsign: "안오토",
    colors: ["#3b3b49", "#b8f0dd", "#b8f0dd"],
    thoughts: ["오전 스케줄 정상입니다.", "실패하면 재시도하고 로그 남겨요."] },
  { dept: "ops", rank: "member", name: "천유나", role: "연동 모니터링",
    colors: ["#573049", "#fff3b0", "#ff8fc0"],
    thoughts: ["연결 안 된 서비스를 성공으로 안 씁니다.", "연동 대기 중이에요."] },

  // ⑫ 비서실
  { dept: "secretary", rank: "lead", name: "김세리", role: "비서실장", callsign: "김비서",
    colors: ["#7a453c", "#c9b8ff", "#c9b8ff"],
    thoughts: ["대표가 결정할 것만 추립니다.", "중복 설명은 다 지워요."] },
  { dept: "secretary", rank: "member", name: "홍보람", role: "브리핑 정리",
    colors: ["#334a3a", "#ffe6f2", "#fff3b0"],
    thoughts: ["에피소드 유형별로 묶어서 올릴게요.", "막힌 건 먼저 보고해요."] },
];

/**
 * 외부 연동을 아직 안 붙인 팀 → 화면에 "연동 대기"로 표시됩니다.
 * 연동을 다 붙였거나, 그냥 전부 초록불로 보고 싶으면 빈 배열 []로 두세요.
 */
export const PENDING_INTEGRATIONS: Record<string, string> = {
  brand: "채널 지표 연동",
  partner: "메일 연동",
  finance: "정산 현황 파일",
};

/**
 * 결과 보관함 링크 (Notion 등). 비워두면 화면에서 링크 버튼이 숨겨집니다.
 * 예: "https://www.notion.so/내페이지주소"
 */
export const STORAGE_LINK = "";
