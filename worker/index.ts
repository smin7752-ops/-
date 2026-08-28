/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { integrationStatus, publishReport, type DayReport, type PublishEnv } from "./report";
import { askDept, generateBriefingIdeas, type AskEnv } from "./ai";

interface Env extends PublishEnv, AskEnv {
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

    // 완료 보고를 Notion + Discord로 동시 발행
    if (url.pathname === "/api/report") {
      if (request.method !== "POST") return new Response("POST only", { status: 405 });
      try {
        const report = (await request.json()) as DayReport;
        const ideas = await generateBriefingIdeas(env);
        const enriched: DayReport = { ...report, aiRecommendation: ideas.ok ? ideas.answer : undefined };
        const result = await publishReport(enriched, env);
        return Response.json(result);
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
