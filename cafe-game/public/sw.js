/*
 * 아주 단순한 오프라인 캐시.
 * 한 번 열어본 파일을 저장해두고, 인터넷이 끊겨도 게임이 열리게 해줍니다.
 * 새 버전을 배포하면 CACHE 이름을 바꿔주세요.
 */
const CACHE = "cafe-game-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("./")));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // 페이지 이동은 항상 최신 버전을 받아옵니다 (브라우저 자체 캐시도 건너뜀).
  // 실패하면(오프라인) 캐시에 있는 첫 화면을 보여줍니다.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() =>
        caches.match("./").then((hit) => hit || Response.error()),
      ),
    );
    return;
  }

  // 나머지 파일은 캐시 우선 (있으면 바로, 없으면 받아서 저장)
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
