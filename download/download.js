(() => {
  const link = document.querySelector('#apk-link');
  const meta = document.querySelector('#file-meta');
  const restart = document.querySelector('#restart');
  const notice = document.querySelector('#not-android');
  const noticeTitle = document.querySelector('#not-android-title');
  const noticeBody = document.querySelector('#not-android-body');
  const userAgent = navigator.userAgent || '';
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.platform || '')
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || /iPad|iPhone|iPod/i.test(userAgent);
  // Some in-app browsers block file downloads outright, so tell people where it will work.
  const isInAppBrowser = /FBAN|FBAV|Instagram|KAKAOTALK|Line\//i.test(userAgent);

  if (isIOS) {
    noticeTitle.textContent = 'iPhone에는 설치 파일로 설치할 수 없습니다.';
    noticeBody.textContent = 'Apple은 App Store 밖의 설치 파일을 허용하지 않습니다. iPhone에서는 웹 체험을 연 뒤 Safari 공유 메뉴에서 홈 화면에 추가를 선택하세요.';
    notice.hidden = false;
    link.setAttribute('aria-disabled', 'true');
  } else if (!isAndroid) {
    notice.hidden = false;
  } else if (isInAppBrowser) {
    noticeTitle.textContent = '앱 안의 브라우저에서는 파일 받기가 막힐 수 있습니다.';
    noticeBody.textContent = '다운로드가 시작되지 않으면 이 화면의 더보기 메뉴에서 Chrome으로 열기를 선택한 뒤 다시 시도하세요.';
    notice.hidden = false;
  }

  fetch('../release.json', {cache: 'no-store'})
    .then((response) => response.ok ? response.json() : null)
    .then((release) => {
      const apk = release?.availableAPK;
      // Relative path only, so this page works at the site root and under a project path.
      if (!apk || !/^downloads\/gyeol-demo[a-z0-9.-]*\.apk$/i.test(apk.path)) return;
      link.href = '../' + apk.path;
      const line = [apk.version && `버전 ${String(apk.version).split('+')[0]}`, apk.size, apk.abiLabel]
        .filter(Boolean).join(' · ');
      meta.replaceChildren();
      if (line) meta.append(line);
      if (apk.sha256) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = '파일 확인값 (SHA-256)';
        const code = document.createElement('code');
        code.textContent = apk.sha256;
        details.append(summary, code);
        meta.append(details);
      }
      // On the phone that will actually install it, start the download without a second tap.
      if (isAndroid && !isInAppBrowser) {
        window.setTimeout(() => {
          link.click();
          restart.hidden = false;
        }, 700);
      }
    })
    .catch(() => {});
})();
