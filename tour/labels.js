// WebKit 316186/316235 can offset complex-shaped Thai text when Canvas textAlign is
// center/right. Position a left-aligned run ourselves; keep shaping the whole string.
export function centeredText(ctx, text, x, y, maxWidth = Infinity) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  const width = ctx.measureText(text).width;
  const scale = width > 0 ? Math.min(1, maxWidth / width) : 1;
  ctx.translate(x, y);
  ctx.scale(scale, 1);
  ctx.fillText(text, -width / 2, 0);
  ctx.restore();
}
