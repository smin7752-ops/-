/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { integrationStatus, publishReport, type DayReport, type PublishEnv } from "./report";
import { askDept, generateBriefingIdeas, generateBlogDraft, type AskEnv } from "./ai";
import { findChannelVideo, type YoutubeEnv } from "./youtube";

interface Env extends PublishEnv, AskEnv, YoutubeEnv {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 연동 설정 여부만 알려준다 (값은 절대 내보내지 않는다)
    if (url.pathname === "/api/integrations") {
      return Response.json(integrationStatus(env));
    }

    // 대표 지시창의 자유 질문을 실제 AI에게 물어본다
    if (url.pathname === "/api/ask-ai") {
      if (request.method !== "POST") return new Response("POST only", { status: 405 });
      try {
        const { deptId, question } = (await request.json()) as { deptId?: string; question?: string };
        const result = await askDept(deptId ?? "secretary", question ?? "", env);
        return Response.json(result);
      } catch (error) {
        return Response.json({ ok: false, error: String(error) }, { status: 400 });
      }
    }

    // 대표 승인 시, 네이버 블로그에 바로 올릴 완성된 원고를 만든다
    if (url.pathname === "/api/blog-draft") {
      if (request.method !== "POST") return new Response("POST only", { status: 405 });
      const result = await generateBlogDraft(env);
      if (!result.ok) return Response.json(result);

      // 원고 제목으로 내 채널에서 관련 영상을 찾아, 자리표시자를 실제 링크로 바꾼다
      const topic = result.answer.match(/제목:\s*(.+)/)?.[1]?.trim();
      const video = topic ? await findChannelVideo(topic, env) : { ok: false as const, error: "제목을 찾지 못했어요." };
      const answer = video.ok
        ? result.answer.replace(/\[?🎥\s*영상:[^\]\n]*\]?/, `🎥 영상: ${video.title} — ${video.url}`)
        : result.answer;

      return Response.json({ ok: true, answer, video });
    }

    // 완료 보고를 Notion + Discord로 동시 발행
    if (url.pathname === "/api/report") {
      if (request.method !== "POST") return new Response("POST only", { status: 405 });
      try {
        const report = (await request.json()) as DayReport;
        const ideas = await generateBriefingIdeas(env);
        const enriched: DayReport = { ...report, aiRecommendation: ideas.ok ? ideas.answer : undefined };
        const result = await publishReport(enriched, env);
        // Notion/Discord 연동이 안 되어 있어도, 실제로 만든 콘텐츠는 화면에서 바로 볼 수 있게 함께 내려준다
        return Response.json({ ...result, aiRecommendation: enriched.aiRecommendation });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 400 });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
