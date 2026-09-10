/** Load the release-mapped graph and surface failures without touching saved progress. */
const status = document.querySelector("#gameLoadStatus");
document.body.dataset.gameBoot = "loading";
try {
  await import("./game-ui.js");
  document.body.dataset.gameBoot = "ready";
  if (status) status.hidden = true;
} catch (error) {
  console.error("[X-VISOR] Game startup failed", error);
  document.body.dataset.gameBoot = "error";
  if (status) {
    status.hidden = false;
    status.setAttribute("role", "alert");
    status.textContent = "โหลดเกมไม่สำเร็จ ลองโหลดอีกครั้งเพื่อเล่นต่อจากเซฟเดิม";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "ลองโหลดเกมอีกครั้ง";
    retry.addEventListener("click", () => location.reload());
    status.append(retry);
  }
}
