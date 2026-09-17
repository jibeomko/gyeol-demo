(() => {
  // A phone-sized viewport gains nothing from a phone frame: open the app itself.
  if (window.matchMedia('(max-width: 720px)').matches) {
    window.location.replace('../app/');
    return;
  }
  const wrap = document.getElementById('device-wrap');
  const device = document.getElementById('device');
  const frame = document.getElementById('frame');
  const fit = () => {
    const box = wrap.getBoundingClientRect();
    const scale = Math.min(1, (box.width - 12) / device.offsetWidth, (box.height - 12) / device.offsetHeight);
    device.style.transform = `scale(${Math.max(scale, 0.3).toFixed(4)})`;
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(wrap);
  window.addEventListener('resize', fit);
  fit();
  document.getElementById('reload').addEventListener('click', () => { frame.src = '../app/'; });
})();
