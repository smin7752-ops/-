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

async function callClaude(system: string, userText: string, env: AskEnv): Promise<AskResult> {
  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY 미설정" };
  }
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
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

/** 하루 브리핑 발행 시, 실제로 쓸 수 있는 블로그 콘텐츠 아이디어를 만든다 */
export async function generateBriefingIdeas(env: AskEnv): Promise<AskResult> {
  const system = [
    `당신은 "${COMPANY.name}"의 콘텐츠 기획팀입니다.`,
    `회사 소개: ${COMPANY.description}`,
    "대표에게 오늘 하루 브리핑에 넣을, 네이버 블로그에 바로 쓸 수 있는 콘텐츠 아이디어를 제안하세요.",
    "주제 3개를 골라 각각 '제목 후보', '핵심 키워드', '한 줄 개요'를 포함한 목록으로 작성하세요.",
    "실제로 검색될 법한 소재로, 과장 없이 실용적으로 쓰세요.",
  ].join("\n");

  return callClaude(system, "오늘 브리핑에 넣을 블로그 콘텐츠 아이디어 3개를 만들어줘.", env);
}
