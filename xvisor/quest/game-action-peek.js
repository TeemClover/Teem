/** Keep a short action visible when phone controls are below the main scene. */
export function createActionPeek(source, reducedMotion) {
  const host = document.createElement("aside");
  host.className = "action-peek";
  host.hidden = true;
  host.setAttribute("aria-hidden", "true");
  host.innerHTML = '<canvas width="576" height="324"></canvas><span></span>';
  document.body.appendChild(host);
  const ctx = host.querySelector("canvas").getContext("2d");
  let frame = 0;
  let expires = 0;
  let current = null;
  function stop() { cancelAnimationFrame(frame); frame = 0; current = null; host.hidden = true; }
  function sourceVisible() {
    const rect = source.getBoundingClientRect();
    return rect.bottom > 80 && rect.top < innerHeight - 80;
  }
  function draw(now) {
    if (!current || document.hidden || now >= expires || sourceVisible()) return stop();
    ctx.drawImage(source, 0, 0, 576, 324);
    host.hidden = false;
    frame = requestAnimationFrame(draw);
  }
  function show(moment) {
    if (!moment || !["primary", "vignette"].includes(moment.presentation) || document.hidden || sourceVisible()) return;
    stop();
    current = moment;
    host.dataset.event = moment.event;
    host.dataset.motion = reducedMotion.matches ? "reduced" : "full";
    host.querySelector("span").textContent = moment.title;
    expires = performance.now() + (moment.duration || 1150);
    frame = requestAnimationFrame(draw);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  window.addEventListener("pagehide", stop);
  return { show, stop };
}
