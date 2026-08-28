/**
 * 대표 지시창의 자유 질문을 실제 Claude API로 넘겨 답을 받는다.
 *
 * 비밀값은 코드에 두지 않는다. 로컬은 `.dev.vars`, 배포는 `wrangler secret put`.
 *   ANTHROPIC_API_KEY   Anthropic API 키 (sk-ant-…)
 */
import Anthropic from "@anthropic-ai/sdk";
import { COMPANY, DEPARTMENTS } from "../company.config";

export type AskEnv = { ANTHROPIC_API_KEY?: string };

export type AskResult = { ok: true; answer: string } | { ok: false; error: string };

const MODEL = "claude-haiku-4-5";

/** '성민의 하루 플레이리스트' 블로그 시리즈의 실제 문체·구조 특징 */
const BLOG_STYLE_NOTES = [
  "블로그 시리즈명은 '성민의 하루 플레이리스트', 글 제목 끝에는 '[음악 이야기 EP.n]'을 붙입니다.",
  "이 시리즈는 두 가지 유형을 번갈아 씁니다.",
  "  (A) 추천곡 — 다른 아티스트의 곡을 소개하며 개인적인 기억·감상과 엮어 풀어내는 글",
  "  (B) 자작곡 — 예명 '수아'로 직접 작사·노래해 발매한 본인 곡의 비하인드 스토리",
  "글은 항상 '안녕하세요, 성민입니다. ☕🎧' 로 시작합니다.",
  "인사 직후 '🎧 음악을 먼저 감상하며 글을 읽어보세요.' 문장과 유튜브 링크를 넣습니다.",
  "본문 소제목은 모두 '■ 소제목' 형식입니다.",
  "곡 정보는 소제목 하나('■ 곡 정보')로 묶어 가수·곡명·발매일·장르 등을 나열합니다.",
  "(B) 유형은 곡 정보에 보컬·작곡편곡·작사 크레딧까지 포함하고, 곡을 만들게 된 개인적 배경과 발매 후 소감을 진솔하게 씁니다.",
  "문체는 담담하고 진솔한 존댓말, 과장이나 광고 문구 없이 실제로 느꼈을 법한 감정 위주로 씁니다.",
  "마지막은 '오늘도 좋은 음악과 함께 편안한 하루 보내세요. ☕🎧' 로 닫습니다.",
  "맨 아래에 '곡·영상 정보' 요약 블록과 해시태그 5~8개를 붙입니다.",
].join("\n");

async function callClaude(system: string, userText: string, env: AskEnv, maxTokens = 1024): Promise<AskResult> {
  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY 미설정" };
  }
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userText }],
    });
    const text = response.content.find((block) => block.type === "text")?.text ?? "";
    if (!text) return { ok: false, error: "빈 응답을 받았어요." };
    return { ok: true, answer: text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function askDept(deptId: string, question: string, env: AskEnv): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) return { ok: false, error: "빈 질문이에요." };

  const dept = DEPARTMENTS.find((d) => d.id === deptId);
  const system = [
    `당신은 "${COMPANY.name}"이라는 회사의 ${dept ? dept.name : "직원"}입니다.`,
    `회사 소개: ${COMPANY.description}`,
    dept ? `당신 팀이 맡은 업무: ${dept.task}` : "",
    "대표(사장님)의 질문에 실무자 관점에서 구체적이고 바로 실행 가능한 조언을 한국어로 답하세요.",
    "5~8문장 이내로 짧고 명확하게, 번호 목록이 어울리면 목록으로 답하세요.",
  ]
    .filter(Boolean)
    .join("\n");

  return callClaude(system, trimmed, env);
}

/** 하루 브리핑 발행 시, 실제로 쓸 수 있는 '음악 이야기' 소재 아이디어를 만든다 */
export async function generateBriefingIdeas(env: AskEnv): Promise<AskResult> {
  const system = [
    `당신은 "${COMPANY.name}"의 콘텐츠 기획팀입니다.`,
    `회사 소개: ${COMPANY.description}`,
    BLOG_STYLE_NOTES,
    "대표에게 오늘 브리핑에 넣을 '음악 이야기' 다음 화 소재 3개를 제안하세요.",
    "추천곡(A) 아이디어와 자작곡(B) 아이디어를 섞어서, 각각 '유형(A/B)', '곡·주제', '왜 지금 이 얘기를 하면 좋은지 한 줄'을 목록으로 작성하세요.",
    "실제로 존재할 법한 곡·소재로, 과장 없이 실용적으로 쓰세요.",
  ].join("\n");

  return callClaude(system, "오늘 브리핑에 넣을 '음악 이야기' 다음 화 소재 3개를 만들어줘.", env);
}

/** 대표 승인 시, 네이버 블로그에 바로 붙여넣을 수 있는 완성된 '음악 이야기' 원고 한 편을 만든다 */
export async function generateBlogDraft(env: AskEnv): Promise<AskResult> {
  const system = [
    `당신은 "${COMPANY.name}"의 원고 작성팀입니다.`,
    `회사 소개: ${COMPANY.description}`,
    BLOG_STYLE_NOTES,
    "대표의 승인을 받아, 네이버 블로그에 그대로 복사해서 올릴 수 있는 완성된 글 한 편을 씁니다.",
    "형식은 정확히 아래처럼 맞추세요.",
    "",
    "유형: A 또는 B 중 하나만 적으세요 (A=추천곡, B=자작곡)",
    "제목: (곡 제목이 드러나는 구체적인 제목, 끝에 [음악 이야기 EP.n] — n은 임의의 자연수)",
    "",
    "(본문 — '■ 소제목'으로 나눈 5~7개 문단, 800~1400자 분량, BLOG_STYLE_NOTES의 문체·구조를 그대로 따르세요)",
    "  * 본문 중 사진을 넣으면 좋을 지점마다 [📷 사진: 어떤 사진을 넣을지 + 캡션 제안]을 줄로 표시하세요.",
    "  * 인사 직후, 노래를 소개하는 지점에 [🎥 영상: 여기에 유튜브 링크 삽입]을 한 번만 표시하세요.",
    "",
    "태그: #태그1 #태그2 ... (5~8개)",
    "",
    "실제 사진 파일이나 진짜 유튜브 링크는 대표가 나중에 직접 채워 넣을 거라, 위치와 캡션만 제안하면 됩니다.",
    "과장 광고 문구나 없는 사실을 지어내지 말고, 바로 발행해도 될 정도로 완성도 있게 쓰세요.",
  ].join("\n");

  return callClaude(system, "오늘 승인된 곡으로 '음악 이야기' 원고를 완성해줘.", env, 3000);
}
