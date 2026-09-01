import { SAVE_KEY } from "./game-save.js";

const TRAVEL_MONTHS = new Set([16, 22]);
let activeTrip = null;
let activeTripKey = "";
let captureTimer = 0;

function readState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function tripKey(trip) {
  if (!trip) return "";
  return String(trip.id || `${trip.month || ""}:${trip.destination || ""}`);
}

function removeTripLock() {
  window.clearTimeout(captureTimer);
  captureTimer = 0;
  document.querySelector(".trip-scene-lock")?.remove();
  activeTripKey = "";
}

function captureTravelScene(trip) {
  const canvas = document.querySelector("#worldCanvas");
  const frame = document.querySelector("#worldFrame");
  if (!canvas || !frame || !trip) return;

  const key = tripKey(trip);
  if (frame.querySelector(`.trip-scene-lock[data-trip-key="${CSS.escape(key)}"]`)) return;

  window.clearTimeout(captureTimer);
  captureTimer = window.setTimeout(() => {
    if (!activeTrip || tripKey(activeTrip) !== key) return;
    try {
      const image = document.createElement("img");
      image.className = "trip-scene-lock";
      image.dataset.tripKey = key;
      image.alt = `Recognition Trip · ${trip.destination || "Travel"}`;
      image.src = canvas.toDataURL("image/png");
      frame.querySelector(".trip-scene-lock")?.remove();
      canvas.insertAdjacentElement("afterend", image);
      activeTripKey = key;
    } catch {
      // Canvas capture is a visual enhancement only; never touch gameplay/save state.
    }
  }, 90);
}

function syncStateClasses() {
  const state = readState();
  const app = document.querySelector("#gameApp");
  if (!app || !state) return;

  app.classList.toggle("is-organization-mode", Boolean(state.organizationMode));

  const trip = state.organizationMode && TRAVEL_MONTHS.has(Number(state.month || 0))
    ? state.activeTravel
    : null;

  activeTrip = trip || null;
  app.classList.toggle("is-travel-month", Boolean(activeTrip));

  if (activeTrip) {
    const key = tripKey(activeTrip);
    if (key !== activeTripKey) captureTravelScene(activeTrip);
  } else {
    removeTripLock();
  }
}

function paintTravelUi() {
  if (activeTrip) {
    const destination = String(activeTrip.destination || "Recognition Trip");
    const number = Number(activeTrip.number || (Number(activeTrip.month) === 16 ? 1 : 2));
    const detail = String(activeTrip.landmark || activeTrip.title || `Recognition Trip · Month ${activeTrip.month || ""}`);

    const label = document.querySelector("#worldLabel");
    if (label) label.textContent = `TRAVEL REWARD · ${destination.toUpperCase()}`;

    const card = document.querySelector("#worldEventCard");
    const kicker = document.querySelector("#worldEventKicker");
    const title = document.querySelector("#worldEventTitle");
    const detailNode = document.querySelector("#worldEventDetail");
    if (card) card.hidden = false;
    if (kicker) kicker.textContent = `RECOGNITION TRIP ${number}`;
    if (title) title.textContent = destination;
    if (detailNode) detailNode.textContent = detail;
  }
  requestAnimationFrame(paintTravelUi);
}

function stripMonth24ScoreControls() {
  const dialog = document.querySelector("#gameDialog");
  if (!dialog?.open) return;
  const kicker = dialog.querySelector(".dialog-kicker")?.textContent || "";
  if (!/MONTH\s*24|TRUE ENDING/i.test(kicker)) return;

  dialog.querySelector(".v9-score-name")?.remove();
  dialog.querySelector("[data-v9-score-status]")?.remove();
  dialog.querySelector("[data-v1-submit-score]")?.remove();
}

const observer = new MutationObserver(() => {
  stripMonth24ScoreControls();
  syncStateClasses();
});

function start() {
  syncStateClasses();
  stripMonth24ScoreControls();
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
  window.setInterval(syncStateClasses, 180);
  requestAnimationFrame(paintTravelUi);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
