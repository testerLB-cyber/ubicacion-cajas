const CACHE='trafico-profesional-PRO-20261007-38';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./version.json'])).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trafico-profesional-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./')))});

self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={body:e.data?.text()||''}}e.waitUntil(self.registration.showNotification(d.title||'Tráfico App',{body:d.body||'Tienes una nueva notificación',icon:d.icon||undefined,badge:d.badge||undefined,data:{url:d.url||'./'},tag:d.tag||undefined,renotify:true,requireInteraction:String(d.title||'').toUpperCase().includes('SOS')}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||'./';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const w of ws){if('focus'in w){w.navigate(url);return w.focus()}}return clients.openWindow(url)}))});
