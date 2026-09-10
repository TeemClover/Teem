import { createSceneArt, MENTOR_PALETTES } from "./game-art.js";
import { drawMentorPortrait } from "./game-mentor-art.js";
import { getPersonAppearance } from "./game-people.js";

const mentorPalette = Object.freeze({ skin: "#dca57e", hair: "#493a3a", shirt: "#d5ac6c", accent: "#fff0b9", hairStyle: "long" });
const teacherPalette = Object.freeze({ skin: "#c98f6c", hair: "#203541", shirt: "#5f8fd3", accent: "#f6ce5a", hairStyle: "short", clothing: "shirt", glasses: "round" });

/** Guides stay in dialogue portraits; only customers/proctors inhabit the scene. */
export function paintStoryPortrait(canvas, beat, person) {
  if (!canvas) return;
  const palette = MENTOR_PALETTES[beat?.portrait] || (beat?.portrait === "customer" ? getPersonAppearance(person)
    : beat?.portrait === "teacher" ? teacherPalette : mentorPalette);
  const key = JSON.stringify([beat?.portrait, palette]);
  if (canvas.dataset.portraitKey === key) return;
  canvas.dataset.portraitKey = key;
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(3, 0, 0, 3, 0, 0);
  ctx.clearRect(0, 0, 64, 64);
  const background = ctx.createLinearGradient(0, 0, 64, 64);
  background.addColorStop(0, beat?.portrait === "customer" ? "#d8eade" : "#f6e5b7");
  background.addColorStop(1, "#f9f4df");
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(0, 0, 64, 64, 20);
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (["teem", "ako"].includes(beat?.portrait) && drawMentorPortrait(ctx, beat.portrait, 0, 0, 64, () => {
    if (canvas.dataset.portraitKey !== key) return;
    delete canvas.dataset.portraitKey;
    paintStoryPortrait(canvas, beat, person);
  })) {
    ctx.restore();
    return;
  }
  ctx.translate(-28, -24);
  ctx.scale(2, 2);
  createSceneArt(ctx).character(14, 86, palette, { direction: "right", pose: "idle", band: false });
  ctx.restore();
}
