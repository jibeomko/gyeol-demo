(() => {
  const dismissedKey = "gyeol.pwa.install.dismissed";
  let deferredPrompt = null;
  let lastFocus = null;

  // flutter_bootstrap.js mounts the app inside #flutter-host so the install bar can sit above it.
  // These run in every mode (browser tab, installed home-screen app, desktop preview frame):
  // the splash must disappear once Flutter paints, and the app-scoped worker keeps offline relaunch working.
  window.addEventListener("flutter-first-frame", () => document.getElementById("loading")?.remove());
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

  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isEmbedded = () => { try { return window.self !== window.top; } catch (_) { return true; } };
  // The phone-screen preview frames this page from the same origin; anything else is not ours.
  const isForeignFrame = () => {
    if (!isEmbedded()) return false;
    try { return window.top.location.origin !== window.location.origin; } catch (_) { return true; }
  };
  const userAgent = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = isIOS && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  const isInAppBrowser = /FBAN|FBAV|Instagram|KAKAOTALK|Line\//i.test(userAgent);
  // Only phones and tablets have a home screen; desktops get a bar only if the browser offers a real install.
  const isTouchDevice = () => {
    if (navigator.maxTouchPoints > 0) return true;
    try { return window.matchMedia("(hover: none) and (pointer: coarse)").matches; } catch (_) { return false; }
  };

  const region = document.getElementById("pwa-install-region");
  if (!region) return;

  // Framed by someone else's site: say where the real demo lives instead of blending into their page.
  if (isForeignFrame()) {
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
    return;
  }
  // Installed apps need no prompt; the desktop phone-frame preview cannot install, so it shows none either.
  if (isStandalone() || isEmbedded()) return;

  region.innerHTML = `
    <section id="pwa-install" hidden aria-label="앱 설치 안내">
      <div class="pwa-copy"><span class="pwa-label">결 GYEOL · 가상 데이터 체험</span><span class="pwa-message"></span></div>
      <button id="pwa-install-action" type="button"></button>
      <button id="pwa-install-dismiss" type="button" aria-label="설치 안내 닫기">×</button>
    </section>
    <dialog id="pwa-guide" aria-labelledby="pwa-guide-title">
      <div class="pwa-dialog-inner">
        <button id="pwa-guide-close" type="button" aria-label="안내 닫기">×</button>
        <h2 id="pwa-guide-title"></h2><p id="pwa-guide-intro"></p><ol id="pwa-guide-steps"></ol>
        <button id="pwa-guide-done" type="button">확인</button>
      </div>
    </dialog>`;

  const bar = document.getElementById("pwa-install");
  const message = bar.querySelector(".pwa-message");
  const action = document.getElementById("pwa-install-action");
  const dismiss = document.getElementById("pwa-install-dismiss");
  const guide = document.getElementById("pwa-guide");
  const guideTitle = document.getElementById("pwa-guide-title");
  const guideIntro = document.getElementById("pwa-guide-intro");
  const guideSteps = document.getElementById("pwa-guide-steps");
  const closeGuide = document.getElementById("pwa-guide-close");
  const doneGuide = document.getElementById("pwa-guide-done");
  let mode = "menu";

  const setVisible = (visible) => {
    bar.hidden = !visible;
    document.body.classList.toggle("pwa-install-visible", visible);
  };
  let dismissedInMemory = false;
  const hideForSession = () => {
    dismissedInMemory = true;
    try { sessionStorage.setItem(dismissedKey, "1"); } catch (_) {}
    setVisible(false);
  };
  const isDismissed = () => {
    if (dismissedInMemory) return true;
    try { return sessionStorage.getItem(dismissedKey) === "1"; } catch (_) { return false; }
  };
  const setBar = (nextMode) => {
    mode = nextMode;
    const detail = {
      prompt: isTouchDevice()
        ? ["결을 앱처럼 홈 화면에서 열어 보세요.", "앱 설치하기"]
        : ["결을 앱처럼 따로 열어 둘 수 있어요.", "앱으로 설치하기"],
      ios: ["Safari 공유 메뉴에서 홈 화면에 추가할 수 있어요.", "iPhone 설치 방법"],
      inApp: ["카카오톡 등 앱 안의 화면입니다. Safari나 Chrome에서 열면 설치할 수 있어요.", "브라우저에서 열기"],
      menu: ["브라우저 메뉴에서 홈 화면에 추가해 둘 수 있어요.", "설치 방법"],
    }[nextMode];
    message.textContent = detail[0];
    action.textContent = detail[1];
    setVisible(!isDismissed());
  };
  const openGuide = (kind) => {
    const copy = kind === "ios"
      ? ["iPhone 홈 화면에 추가", "이 페이지는 iPhone용 네이티브 앱이 아닌 웹 체험입니다.", ["Safari에서 결 웹 체험을 엽니다.", "Safari의 공유 메뉴를 엽니다.", "홈 화면에 추가를 선택합니다."]]
      : kind === "inApp"
        ? ["Safari 또는 Chrome에서 열기", "현재 앱 안의 브라우저에서는 설치 메뉴가 다르게 보일 수 있습니다.", ["현재 화면의 더보기 메뉴를 엽니다.", "Safari 또는 Chrome으로 열기를 선택합니다.", "브라우저 메뉴에서 홈 화면에 추가 또는 앱 설치를 선택합니다."]]
        : ["브라우저에서 홈 화면에 추가", "결은 설치 전에도 바로 사용할 수 있는 웹 체험입니다.", ["브라우저의 더보기 메뉴를 엽니다.", "홈 화면에 추가 또는 앱 설치를 선택합니다.", "표시되는 안내를 읽고 원할 때만 완료합니다."]];
    guideTitle.textContent = copy[0];
    guideIntro.textContent = copy[1];
    guideSteps.replaceChildren(...copy[2].map(text => Object.assign(document.createElement("li"), {textContent: text})));
    lastFocus = document.activeElement;
    if (typeof guide.showModal === "function") {
      guide.showModal();
      closeGuide.focus();
    }
  };
  const closeDialog = () => {
    if (guide.open) guide.close();
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  };

  dismiss.addEventListener("click", hideForSession);
  closeGuide.addEventListener("click", closeDialog);
  doneGuide.addEventListener("click", closeDialog);
  guide.addEventListener("cancel", () => setTimeout(() => lastFocus?.focus(), 0));
  action.addEventListener("click", async () => {
    if (mode !== "prompt" || !deferredPrompt) {
      openGuide(mode === "ios" ? "ios" : mode === "inApp" ? "inApp" : "menu");
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      // Browsers can refuse or the person can close the sheet; either way fall back to manual guidance.
      if (choice?.outcome === "dismissed") setBar("menu");
    } catch (_) {
      setBar("menu");
    }
  });
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    setBar("prompt");
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    setVisible(false);
  });
  if (isInAppBrowser) setBar("inApp");
  else if (isSafari) setBar("ios");
  else if (isTouchDevice()) setBar("menu");
  // On a desktop browser the bar appears only when beforeinstallprompt offers a real install.
})();
