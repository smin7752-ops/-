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
  name: "SooA ENT.",
  /** 헤더 로고 배지에 들어갈 글자 1개 (이모지도 됩니다) */
  logoLetter: "S",
  /** 화면 상단 큰 제목 (앞부분) */
  titlePrefix: "수아의",
  /** 화면 상단 큰 제목 (강조되는 뒷부분) */
  titleAccent: "AI Office",
  /** 브라우저 탭 제목 */
  pageTitle: "SooA ENT. — 나의 AI 오피스",
  /** 검색·공유될 때 뜨는 설명 */
  description:
    "예명 '수아'(본명 오성민)로 활동하는 싱어송라이터가 운영하는 음악 블로그 '성민의 하루 플레이리스트'를 위한 AI 오피스. 좋아하는 노래를 소개하는 감상글과, 직접 작사·노래한 자작곡의 비하인드 스토리 두 가지를 다룹니다.",
  /** 창 하단 파일명 느낌의 라벨 */
  windowLabel: "sooa_ent.exe — 대표실",
  /** 일일 브리핑 제목에 들어갈 이름 */
  reportName: "SooA ENT.",
} as const;

/** 대표(나) — 사무실 대표실에 앉아 있는 캐릭터 */
export const CEO_PROFILE = {
  name: "수아",
  callsign: "대표님",
  role: "싱어송라이터 · 블로거 · 최종 의사결정",
  hair: "#42283a",
  shirt: "#ff8fc0",
  accent: "#fff3b0",
  skin: "#ffdcc4",
  thoughts: [
    "완벽해서가 아니라 솔직해서 의미 있는 글을 쓰자.",
    "곡 정보·크레딧은 무조건 정확하게 확인한다.",
    "예명 수아도, 본명 오성민도 결국 다 나다.",
    "과장된 감정 말고, 그때 진짜 느꼈던 마음부터 떠올리자.",
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
    name: "음악 아카이브팀",
    short: "archive.lab",
    icon: "🎵",
    task: "오늘 소개할 곡·아티스트 자료 조사",
    report: "발매일·앨범·크레딧부터 정확히 확인해요.",
  },
  {
    id: "brand",
    name: "아티스트 정체성팀",
    short: "artist.id",
    icon: "🎤",
    task: "'수아' 예명·톤앤매너, SNS 반응 점검",
    report: "지표 연동이 되면 수치까지 붙습니다.",
  },
  {
    id: "strategy1",
    name: "콘텐츠 기획팀",
    short: "idea.studio",
    icon: "💡",
    task: "이번 주 소개할 곡 후보 10개 기획",
    report: "추천곡·자작곡 비중을 맞춰 TOP 3까지 좁혀요.",
  },
  {
    id: "qa",
    name: "품질 검수팀",
    short: "qa.check",
    icon: "🛡️",
    task: "곡 정보·크레딧 팩트체크",
    report: "발매일·저작권 표기가 틀리면 바로 반려해요.",
  },
  {
    id: "strategy2",
    name: "원고 작성팀",
    short: "script.team",
    icon: "✍️",
    task: "'음악 이야기' 포스팅 원고 작성",
    report: "성민님 특유의 잔잔한 존댓말 톤으로 맞춰 써요.",
  },
  {
    id: "reels",
    name: "영상 제작팀",
    short: "video.edit",
    icon: "🎬",
    task: "유튜브 영상 편집·자막 작업",
    report: "원곡 음원은 그대로 두고 자막만 다듬어요.",
  },
  {
    id: "carousel",
    name: "이미지·블로그 디자인팀",
    short: "design.studio",
    icon: "🖼️",
    task: "앨범 커버·썸네일 감성 이미지 디자인",
    report: "곡 분위기에 맞는 톤으로 맞춰요.",
  },
  {
    id: "partner",
    name: "협업·유통 커뮤니케이션팀",
    short: "partner.mail",
    icon: "💌",
    task: "콜라보·음원 유통 제안 검토",
    report: "초안까지만 씁니다. 계약은 대표가 직접 해요.",
  },
  {
    id: "finance",
    name: "재무·정산팀",
    short: "finance.xls",
    icon: "🧾",
    task: "음원 스트리밍 정산 현황 정리",
    report: "정산서가 오면 바로 반영합니다.",
  },
  {
    id: "review",
    name: "성과리뷰팀",
    short: "review.data",
    icon: "📈",
    task: "조회수·스트리밍·댓글 반응 기록",
    report: "어떤 음악 이야기가 반응 좋았는지 패턴으로 남겨요.",
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
  // ① 음악 아카이브팀
  { dept: "research", rank: "lead", name: "김서연", role: "음악 아카이브 팀장", callsign: "김리서",
    colors: ["#6b3d34", "#fff3b0", "#ff8fc0"],
    thoughts: ["발매일·앨범명부터 원출처로 확인해야 해.", "크레딧 표기 하나 틀리면 큰일 나.", "이 곡, 저작권 표기부터 다시 본다."] },
  { dept: "research", rank: "member", name: "오태윤", role: "신곡·아티스트 리서처",
    colors: ["#2f2a3d", "#c9b8ff", "#b8f0dd"],
    thoughts: ["요즘 성민님이 자주 듣는 곡이 뭔지 체크.", "원곡 유통사 정보까지 확인해야 안전해요."] },
  { dept: "research", rank: "member", name: "하은채", role: "곡 배경 조사",
    colors: ["#8a4a3c", "#b8f0dd", "#ff8fc0"],
    thoughts: ["이 곡에 얽힌 개인적인 사연이 있는지 여쭤봐야겠다.", "재수록 앨범 정보는 원반이랑 헷갈리면 안 돼."] },

  // ② 아티스트 정체성팀
  { dept: "brand", rank: "lead", name: "박보라", role: "아티스트 정체성 팀장", callsign: "박브리",
    colors: ["#372b4a", "#c9b8ff", "#c9b8ff"],
    thoughts: ["지표 연동 전엔 수치를 지어내지 않아요.", "예명 '수아'와 본명 '오성민' 표기, 이번에도 맞게 들어갔는지 확인."] },
  { dept: "brand", rank: "member", name: "신재원", role: "채널 반응 분석",
    colors: ["#3c3a4f", "#ffe6f2", "#c9b8ff"],
    thoughts: ["저장·댓글 반응이 조회수보다 중요해요.", "30일 흐름부터 그려보자."] },
  { dept: "brand", rank: "member", name: "임다혜", role: "톤앤매너 검증",
    colors: ["#5a3450", "#fff3b0", "#ff8fc0"],
    thoughts: ["너무 분석적인 말투는 이 블로그랑 안 맞아요.", "잔잔하고 진솔한 톤 유지하는지 본다."] },

  // ③ 콘텐츠 기획팀
  { dept: "strategy1", rank: "lead", name: "최아름", role: "콘텐츠 기획 팀장", callsign: "최아이",
    colors: ["#c26e4b", "#ff8fc0", "#fff3b0"],
    thoughts: ["오늘도 정확히 10개, 예외 없어요.", "추천곡이랑 자작곡 이야기 비율부터 나누고 시작.", "이번 주는 어떤 감정선으로 갈지부터 정하자."] },
  { dept: "strategy1", rank: "member", name: "정유진", role: "곡 후보 발굴",
    colors: ["#7b4a2f", "#b8f0dd", "#ff8fc0"],
    thoughts: ["제목을 좀 더 구체적으로 바꿔볼까.", "이 곡이랑 얽힌 에피소드가 있어야 글이 산다."] },
  { dept: "strategy1", rank: "member", name: "배시현", role: "도입부 문구 기획",
    colors: ["#2c2638", "#fff3b0", "#c9b8ff"],
    thoughts: ["'안녕하세요, 성민입니다' 인사말은 고정으로 가요.", "과장된 후킹 문구는 이 블로그 톤이랑 안 맞아요."] },

  // ④ 품질 검수팀
  { dept: "qa", rank: "lead", name: "윤규아", role: "품질 검수 팀장", callsign: "윤큐아",
    colors: ["#2d4b46", "#b8f0dd", "#b8f0dd"],
    thoughts: ["곡 정보 팩트체크부터 돌립니다.", "크레딧 링크 없는 안은 반려예요."] },
  { dept: "qa", rank: "member", name: "강태오", role: "크레딧·발매일 검사",
    colors: ["#463227", "#ffe6f2", "#b8f0dd"],
    thoughts: ["발매년도 하나 틀리면 신뢰도 훅 떨어져요.", "원곡 유통 채널 링크가 진짜인지 확인."] },
  { dept: "qa", rank: "member", name: "문세라", role: "감정 표현 검수",
    colors: ["#6c3a55", "#c9b8ff", "#fff3b0"],
    thoughts: ["과장된 감정 표현은 바로 빼요.", "실제 있었던 이야기인지, 지어낸 건 아닌지 본다."] },

  // ⑤ 원고 작성팀
  { dept: "strategy2", rank: "lead", name: "한도빈", role: "원고 팀장", callsign: "한대본",
    colors: ["#8b534a", "#fff3b0", "#ff8fc0"],
    thoughts: ["승인된 곡만 원고로 씁니다.", "'☕🎧' 마무리 인사, 이번에도 빠뜨리지 말자."] },
  { dept: "strategy2", rank: "member", name: "조민서", role: "감상평 원고",
    colors: ["#33304a", "#ff8fc0", "#b8f0dd"],
    thoughts: ["소제목은 '■'로 시작하는 걸로 통일.", "노래를 먼저 듣고 글을 쓰게 안내하는 문장 잊지 말기."] },
  { dept: "strategy2", rank: "member", name: "백가온", role: "비하인드 스토리 원고",
    colors: ["#5d3a2c", "#b8f0dd", "#c9b8ff"],
    thoughts: ["자작곡 이야기는 그때의 진짜 감정부터 다시 꺼내본다.", "마지막 문단은 다음 화 예고로 닫아요."] },

  // ⑥ 영상 제작팀
  { dept: "reels", rank: "lead", name: "송리원", role: "영상 제작 팀장", callsign: "송릴스",
    colors: ["#2c2638", "#ff8fc0", "#ff8fc0"],
    thoughts: ["원곡 음원은 절대 안 건드려요.", "유튜브 링크는 본문 맨 위에 넣는 걸로."] },
  { dept: "reels", rank: "member", name: "권지호", role: "편집",
    colors: ["#4a3a2a", "#fff3b0", "#b8f0dd"],
    thoughts: ["자막 템포가 늘어지면 이탈이에요.", "출처 표기는 대표가 직접 확인해요."] },
  { dept: "reels", rank: "member", name: "유세아", role: "자막·썸네일",
    colors: ["#7a3f58", "#c9b8ff", "#ff8fc0"],
    thoughts: ["앨범 커버 이미지로 썸네일 뽑아둘게요.", "워터마크는 안 넣습니다."] },

  // ⑦ 이미지·블로그 디자인팀
  { dept: "carousel", rank: "lead", name: "이가림", role: "이미지·블로그 디자인 팀장", callsign: "이캐리",
    colors: ["#d88d68", "#c9b8ff", "#c9b8ff"],
    thoughts: ["원본 앨범 커버는 그대로, 편집본만 새로 만들어요.", "곡 분위기랑 색감부터 맞추고 시작."] },
  { dept: "carousel", rank: "member", name: "남주하", role: "레이아웃",
    colors: ["#3a2f4d", "#ffe6f2", "#ff8fc0"],
    thoughts: ["감성 있는 여백부터 잡는 중.", "표지 3안부터 만들자."] },
  { dept: "carousel", rank: "member", name: "표하늘", role: "텍스트 교체",
    colors: ["#274a44", "#fff3b0", "#b8f0dd"],
    thoughts: ["곡 제목·가수명 오타는 절대 안 돼요.", "복제본에만 손댑니다."] },

  // ⑧ 협업·유통 커뮤니케이션팀
  { dept: "partner", rank: "lead", name: "정파랑", role: "협업·유통 팀장", callsign: "정파트",
    colors: ["#563a32", "#b8f0dd", "#b8f0dd"],
    thoughts: ["메일 연동 전이라 아직 못 읽어요.", "실제 계약·답장은 대표 손으로."] },
  { dept: "partner", rank: "member", name: "구예성", role: "협업 검토",
    colors: ["#452d3f", "#c9b8ff", "#fff3b0"],
    thoughts: ["결이 맞는 콜라보 제안만 받습니다.", "답장 초안까지만 준비해둘게요."] },

  // ⑨ 재무·정산팀
  { dept: "finance", rank: "lead", name: "오재민", role: "재무 팀장", callsign: "오재무",
    colors: ["#313b56", "#fff3b0", "#fff3b0"],
    thoughts: ["정산서가 오면 바로 정리합니다.", "음원 유통사 입금 대기 건부터 확인해요."] },
  { dept: "finance", rank: "member", name: "심우진", role: "정산 관리",
    colors: ["#4b3b2c", "#b8f0dd", "#c9b8ff"],
    thoughts: ["지연된 건은 따로 표시해둡니다.", "정산은 자동으로 처리 안 해요."] },

  // ⑩ 성과리뷰팀
  { dept: "review", rank: "lead", name: "강성아", role: "성과리뷰 팀장", callsign: "강성과",
    colors: ["#9c5c72", "#ff8fc0", "#ff8fc0"],
    thoughts: ["잘된 이유를 패턴으로 남겨야 해요.", "저장·댓글이 조회수보다 진짜 지표입니다."] },
  { dept: "review", rank: "member", name: "마지훈", role: "지표 수집",
    colors: ["#2e3a4a", "#ffe6f2", "#b8f0dd"],
    thoughts: ["조회수·스트리밍 수 다시 긁어옵니다.", "연동되면 자동화돼요."] },
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
    thoughts: ["콘텐츠 유형별로 묶어서 올릴게요.", "막힌 건 먼저 보고해요."] },
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
