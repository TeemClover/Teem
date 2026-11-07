const trackerKey = "maxage-sleep-tracker-v1";
const dayButtons = [...document.querySelectorAll("[data-day]")];
const status = document.querySelector("#tracker-status");
const reset = document.querySelector("#tracker-reset");

let completedDays = new Set();
try {
  const savedDays = JSON.parse(localStorage.getItem(trackerKey) ?? "[]");
  if (Array.isArray(savedDays)) {
    completedDays = new Set(savedDays.filter(day => Number.isInteger(day) && day >= 1 && day <= dayButtons.length));
  }
} catch {
  // The tracker also works for the current visit when storage is unavailable.
}

function renderTracker() {
  for (const button of dayButtons) {
    button.setAttribute("aria-pressed", String(completedDays.has(Number(button.dataset.day))));
  }
  status.textContent = `ทำเครื่องหมายแล้ว ${completedDays.size} / ${dayButtons.length} วัน`;
  reset.disabled = completedDays.size === 0;
}

function saveTracker() {
  try {
    localStorage.setItem(trackerKey, JSON.stringify([...completedDays]));
  } catch {
    // Keep the current visit interactive if saving is blocked.
  }
  renderTracker();
}

for (const button of dayButtons) {
  button.addEventListener("click", () => {
    const day = Number(button.dataset.day);
    if (completedDays.has(day)) {
      completedDays.delete(day);
    } else {
      completedDays.add(day);
    }
    saveTracker();
  });
}

reset.addEventListener("click", () => {
  completedDays.clear();
  saveTracker();
  dayButtons[0].focus();
});
renderTracker();

const share = document.querySelector("#share-kit");
const shareStatus = document.querySelector("#share-status");
if (navigator.clipboard?.writeText) {
  share.hidden = false;
  share.addEventListener("click", async () => {
    shareStatus.textContent = "";
    try {
      await navigator.clipboard.writeText("มาลองนอนตรงเวลา 7 วันด้วยกันไหม? เลือกเวลาเข้านอนที่เข้ากับชีวิต แล้วกลับมาคุยกันว่าวันไหนทำง่าย วันไหนอยากปรับ — นิทานอายุยืน × MaxAge @nitanayuyuen");
      shareStatus.textContent = "คัดลอกคำชวนแล้ว ส่งพร้อมชุดดาวน์โหลดให้เพื่อนได้เลย";
    } catch {
      shareStatus.textContent = "คัดลอกไม่ได้ ลองชวนเพื่อนด้วยข้อความของคุณเอง";
    }
  });
}
