// A timed reveal of existing examples; this controller never generates media.
export function createDemoController({
  total = 16,
  batchSize = 4,
  intervalMs = 620,
  schedule = setTimeout,
  cancel = clearTimeout,
  onChange = () => {}
} = {}) {
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError('Demo totals and batch sizes must be positive integers');
  }
  let revealed = 0;
  let batchEnd = 0;
  let busy = false;
  let suspended = false;
  let timer = null;
  let revision = 0;

  const snapshot = () => ({
    total,
    batchSize,
    revealed,
    visible: Math.max(Math.min(batchSize, total), batchEnd),
    batchEnd,
    round: Math.min(Math.floor(revealed / batchSize) + 1, Math.ceil(total / batchSize)),
    busy,
    suspended,
    complete: revealed === total
  });
  const notify = reason => onChange(snapshot(), reason);
  const clearTimer = () => {
    revision += 1;
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const scheduleNext = () => {
    if (!busy || suspended || timer !== null) return;
    const scheduledRevision = revision;
    timer = schedule(() => {
      if (scheduledRevision !== revision || suspended || !busy) return;
      timer = null;
      revealed += 1;
      busy = revealed < batchEnd;
      notify('reveal');
      scheduleNext();
    }, intervalMs);
  };

  return {
    snapshot,
    start() {
      if (busy || suspended || revealed === total) return false;
      batchEnd = Math.min(revealed + batchSize, total);
      busy = true;
      notify('start');
      scheduleNext();
      return true;
    },
    reset() {
      clearTimer();
      revealed = 0;
      batchEnd = 0;
      busy = false;
      notify('reset');
    },
    suspend() {
      if (suspended) return;
      suspended = true;
      clearTimer();
      notify('suspend');
    },
    resume() {
      if (!suspended) return;
      suspended = false;
      notify('resume');
      scheduleNext();
    }
  };
}
