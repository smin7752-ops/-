/**
 * 승인된 원고 주제와 가장 관련 있는, 대표님 본인 유튜브 채널의 실제 영상을 찾는다.
 *
 * 비밀값은 코드에 두지 않는다. 로컬은 `.dev.vars`, 배포는 `wrangler secret put`.
 *   YOUTUBE_API_KEY      Google Cloud Console에서 발급한 YouTube Data API v3 키
 *   YOUTUBE_CHANNEL_ID   내 채널 ID (UC로 시작하는 문자열)
 */
export type YoutubeEnv = { YOUTUBE_API_KEY?: string; YOUTUBE_CHANNEL_ID?: string };

export type YoutubeResult =
  | { ok: true; url: string; title: string }
  | { ok: false; error: string };

async function search(params: URLSearchParams, notFoundMessage: string): Promise<YoutubeResult> {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    const data = (await response.json().catch(() => ({}))) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
      error?: { message?: string };
    };

    if (!response.ok) {
      return { ok: false, error: data.error?.message ?? `HTTP ${response.status}` };
    }

    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!item || !videoId) {
      return { ok: false, error: notFoundMessage };
    }

    return { ok: true, url: `https://youtu.be/${videoId}`, title: item.snippet?.title ?? "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/** (B) 자작곡 원고 — 내 채널 안에서 관련 영상을 찾는다 */
export async function findChannelVideo(query: string, env: YoutubeEnv): Promise<YoutubeResult> {
  if (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CHANNEL_ID) {
    return { ok: false, error: "YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID 미설정" };
  }
  const params = new URLSearchParams({
    part: "snippet",
    channelId: env.YOUTUBE_CHANNEL_ID,
    q: query,
    type: "video",
    order: "relevance",
    maxResults: "1",
    key: env.YOUTUBE_API_KEY,
  });
  return search(params, "채널에서 관련 영상을 찾지 못했어요.");
}

/** (A) 추천곡 원고 — 원곡 아티스트의 공식 뮤직비디오/음원을 유튜브 전체에서 찾는다 */
export async function findAnyVideo(query: string, env: YoutubeEnv): Promise<YoutubeResult> {
  if (!env.YOUTUBE_API_KEY) {
    return { ok: false, error: "YOUTUBE_API_KEY 미설정" };
  }
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    order: "relevance",
    maxResults: "1",
    key: env.YOUTUBE_API_KEY,
  });
  return search(params, "관련 영상을 찾지 못했어요.");
}
