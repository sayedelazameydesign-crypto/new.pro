/* ===== Nawah AI — Service Worker (المرحلة 6: PWA) =====
 * الخطة: شبكة أولًا (network-first) للأصول — يعمل بلا اتصال بموارد مكشوفة سابقًا،
 * ولا يخزّن أبدًا استجابات /api/* (خصوصية: لا بيانات استخدام على الجهاز/الـ SW).
 */
const CACHE = "nawah-v1";
const PRECACHE = ["/", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // حصانة صارمة: لا نلمس API أو صفحات ديناميكية أو تحليلات إطلاقًا
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    event.request.method !== "GET"
  ) {
    return; // تذهب للشبكة مباشرة (بلا اعتراض)
  }

  // صفحة HTML: شبكة أولًا ثم كاش (جلسة بلا اتصال تعمل من آخر زيارة)
  if (event.request.mode === "navigate" || url.pathname === "/") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/").then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // أصول ثابتة: كاش أولًا ثم شبكة
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
  }
  // بقية الطلبات (favicon وغيره): تذهب للشبكة دون كاش
});
