(() => {
  const meta = document.querySelector('#release-meta');
  if (!meta) return;  // built without an installer
  const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

  fetch('release.json', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : null)
    .then((release) => {
      const apk = release?.availableAPK;
      // Relative path only, so the same page works at the site root and under a project path.
      if (!apk || !/^downloads\/gyeol-demo[a-z0-9.-]*\.apk$/i.test(apk.path)) return;
      const headline = [
        text(apk.version) && `버전 ${apk.version.split('+')[0]}`,
        text(apk.size),
        text(apk.abiLabel),
        text(apk.minimumAndroid) && `Android ${apk.minimumAndroid} 이상`,
      ].filter(Boolean).join(' · ');
      meta.replaceChildren();
      if (headline) meta.append(headline);
      if (text(apk.sha256)) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = '파일 확인값 (SHA-256)';
        const code = document.createElement('code');
        code.textContent = apk.sha256;
        details.append(summary, code);
        meta.append(details);
      }
      if (meta.childNodes.length) meta.classList.remove('is-hidden');
    })
    .catch(() => {});
})();
