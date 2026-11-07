// フレーズトークのサービスワーカー：一度開いた画面と文字をスマホに残し、電波がなくても開けるようにする。
// 中継サーバー（別のドメイン）への通信は残さない。

const CACHE = 'phrasetalk-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // 画面そのもの：新しいものを取りに行き、だめなら残しておいたものを出す
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { caches.open(CACHE).then((c) => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // アプリの設定（manifest）：Android がインストールのときに読むので、古いものを先に出さない
  if (new URL(req.url).pathname.endsWith('/manifest.webmanifest')) {
    event.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // それ以外（プログラム・文字・画像）：残しているものをすぐ出し、裏で新しくする
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
