/*
 * Servisní worker BETIMPERIUM.
 *
 * Zásada: mezipaměť se dotýká jen statických souborů. Stránky ani API
 * se neukládají — jde o data konkrétního klienta a na sdíleném zařízení
 * by je po odhlášení přečetl kdokoliv další.
 */

// Číslo zvednout při každé změně logiky workera. Aktivace pak smaže
// všechny starší mezipaměti — viz posluchač níž.
const CACHE = "bi-static-v3";
const STATIC = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

// Lišta nové verze si vyžádá okamžité převzetí — bez toho by nový
// worker čekal, až se zavřou všechny záložky.
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Mapy zdrojů nikdy — v prohlížeči je stejně nikdo nepotřebuje
  // a v konzoli kvůli nim svítí chyby přístupu.
  if (url.pathname.endsWith(".map")) return;

  // Nikdy neukládat: přihlášení, API, autentizaci.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/login" ||
    url.pathname === "/registrace"
  ) return;

  // Statické soubory Next.js jsou hashované — mezipaměť je bezpečná.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|svg|webp|woff2?|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Stránky: vždycky ze sítě. Když síť není, ukáže se offline stránka.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
  }
});

// ── PUSH NOTIFIKACE ──────────────────────────────────────────

self.addEventListener("push", (e) => {
  if (!e.data) return;

  let d;
  try { d = e.data.json(); }
  catch { d = { titulek: "BETIMPERIUM", text: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(d.titulek || "BETIMPERIUM", {
      body: d.text || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge.png",
      // Stejný tag nahradí předchozí zprávu místo hromadění.
      tag: d.tag || "betimperium",
      data: { url: d.url || "/dashboard" },
      renotify: Boolean(d.tag),
      // Vzorec vibrace. Android ho použije, iOS vibruje po svém.
      vibrate: d.vibrace || [18, 60, 30],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const cil = e.notification.data?.url || "/dashboard";

  e.waitUntil(
    // Když je aplikace už otevřená, přepneme na ni místo otevírání
    // dalšího okna — jinak by po pěti notifikacích měl člověk pět karet.
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((okna) => {
      for (const o of okna) {
        if (o.url.includes(self.location.origin)) {
          o.navigate(cil);
          return o.focus();
        }
      }
      return clients.openWindow(cil);
    })
  );
});
