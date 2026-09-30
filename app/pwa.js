(() => {
  const dismissedKey = "gyeol.pwa.install.dismissed";
  let deferredPrompt = null;
  let lastFocus = null;

  // flutter_bootstrap.js mounts the app inside #flutter-host so the install bar can sit above it.
  // These run in every mode (browser tab, installed home-screen app, desktop preview frame):
  // the splash must disappear once Flutter paints, and the app-scoped worker keeps offline relaunch working.
  window.addEventListener("flutter-first-frame", () => document.getElementById("loading")?.remove());
  // A slow or filtered network (hospital, university) can hold back the app's ~4 MB; after 15 s the
  // splash stops being a silent bar and says what to try. Reloading already retries, so no button.
  setTimeout(() => {
    const loading = document.getElementById("loading");
    if (!loading || loading.querySelector(".loading-slow")) return;
    const hint = document.createElement("small");
    hint.className = "loading-slow";
    hint.append("화면을 불러오는 데 오래 걸리고 있어요. 조금 더 기다려 주세요. 계속 멈춰 있으면 다른 네트워크에서 다시 열어 보세요. ");
    const link = Object.assign(document.createElement("a"), {href: "../", target: "_top", textContent: "소개 페이지 열기"});
    hint.append(link);
    loading.append(hint);
  }, 15000);
  if ("serviceWorker" in navigator && window.isSecureContext) {
    // GitHub Pages serves sw.js with max-age=600 and ignores our _headers file, so without
    // updateViaCache the browser can go ten minutes without even noticing a new build.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Only when replacing an earlier build: the first install also fires this.
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });
    window.addEventListener("load", () => {
      // register() can stay pending while a new worker installs, so the update check must not
      // be chained behind it. An already-registered client asks for a new build directly.
      navigator.serviceWorker.getRegistration()
        .then(registration => registration && registration.update())
        .catch(() => {});
      navigator.serviceWorker
        .register("sw.js", {scope: "./", updateViaCache: "none"})
        .catch(() => {});
    });
  }

  const isEmbedded = () => { try { return window.self !== window.top; } catch (_) { return true; } };
  // The phone-screen preview frames this page from the same origin; anything else is not ours.
  const isForeignFrame = () => {
    if (!isEmbedded()) return false;
    try { return window.top.location.origin !== window.location.origin; } catch (_) { return true; }
  };

  // No install prompt of any kind: opening the link is the whole experience, and a banner asking a
  // first-time visitor to install something was the first thing they saw. Chrome would otherwise show
  // its own "add to home screen" mini-infobar, so its event is swallowed. The manifest stays, so
  // anyone who wants a home-screen icon can still add one from the browser menu.
  window.addEventListener("beforeinstallprompt", event => event.preventDefault());

  const region = document.getElementById("pwa-install-region");
  // Framed by someone else's site: say where the real demo lives instead of blending into their page.
  if (region && isForeignFrame()) {
    const notice = document.createElement("aside");
    notice.id = "pwa-foreign-frame";
    notice.append("이 화면은 다른 사이트 안에 표시되고 있습니다. 결 GYEOL 가상 데이터 체험은 ");
    const link = document.createElement("a");
    link.href = window.location.href;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "공식 주소에서 열어 주세요";
    notice.append(link, ".");
    region.append(notice);
  }
})();
