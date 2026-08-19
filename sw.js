/* Офлайн-кэш гостевой страницы.
   ВАЖНО: при любой правке index.html или фотографий поднимите VERSION —
   иначе у гостей, уже открывавших страницу, останется старая версия. */
var VERSION = 'svadba-v1';
var CORE = ['./', 'index.html'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(VERSION)
      .then(function(c){ return c.addAll(CORE); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){
          return k === VERSION ? null : caches.delete(k);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

/* Догрев кэша: страница присылает список фото после загрузки.
   Без этого lazy-фото ниже экрана в кэш бы не попали. */
self.addEventListener('message', function(e){
  var d = e.data || {};
  if (d.type !== 'warm' || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(d.urls.map(function(u){
      return c.match(u).then(function(hit){
        return hit ? null : c.add(u).catch(function(){});
      });
    }));
  }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  // Чужие домены (шрифты, прогноз погоды) не трогаем — у них свои фоллбэки.
  if (url.origin !== self.location.origin) return;

  // HTML — сеть вперёд, чтобы правки долетали сразу; кэш как страховка.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function(res){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
          return res;
        })
        .catch(function(){
          return caches.match(req).then(function(hit){
            return hit || caches.match('index.html');
          });
        })
    );
    return;
  }

  // Остальное (фото) — кэш вперёд: не меняется до смены VERSION.
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
