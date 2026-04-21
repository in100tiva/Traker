// Traker Service Worker — KILL SWITCH
//
// Versões anteriores do SW faziam cache-first do /index.html, o que causou
// deploys "presos" (HTML antigo apontava para assets com hash que já não
// existiam, quebrando o CSS e fazendo o Tailwind parecer morto).
//
// Este SW se instala, apaga TODOS os caches, desregistra a si mesmo e força
// as abas abertas a recarregar para pegar os assets atuais. Depois que todos
// os browsers já atualizaram, podemos considerar reintroduzir offline support
// com uma estratégia correta (network-first para documentos, cache-first só
// para /assets/ fingerprintados).

self.addEventListener("install", (event) => {
  // Ativa imediatamente, sem esperar abas fecharem
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Limpa TODOS os caches conhecidos
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // Desregistra este SW
      await self.registration.unregister();

      // Força reload das abas abertas para pegar o HTML/CSS frescos
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch {
          // clients.navigate pode falhar em alguns browsers — ignore
        }
      }
    })(),
  );
});

// Enquanto o SW ainda está vivo por algum motivo, encaminhe tudo direto
// para a network — zero cache.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
