/* Meet booking notifications — LINE Messaging API push + Telegram bot.
   Every channel is best-effort: a booking is already committed before we get
   here, so a dead token or a provider outage must never lose the lead. Each
   attempt reports its own status back so the control room can show what got
   through and let the operator follow up by hand. */

const TIMEOUT_MS = 8000;

const INTENT_LABELS = {
  health: 'สุขภาพ · อยากรู้จักร่างกายตัวเอง',
  opportunity: 'เตรียมสอบใบอนุญาต · ระบบติดตาม Routine',
  curious: 'ยังไม่แน่ใจ · แค่อยากรู้จักกันก่อน',
};

function clean(value, max = 200) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
}

async function postJson(url, body, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.ok) return { status: 'sent', detail: '' };
    const text = await response.text().catch(() => '');
    return { status: 'failed', detail: clean(`HTTP ${response.status} ${text}`, 400) };
  } catch (error) {
    const reason = error?.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : String(error?.message || error);
    return { status: 'failed', detail: clean(reason, 400) };
  } finally {
    clearTimeout(timer);
  }
}

/* Shared plain-text body. Both channels get the same facts so the operator can
   act straight from the notification without opening the control room. */
export function notificationText(booking, adminUrl) {
  const lines = [
    '🍀 มีคนลงนัดใหม่',
    '',
    `ชื่อ: ${booking.name}`,
    `ติดต่อ: ${booking.contact}`,
    `เรื่อง: ${INTENT_LABELS[booking.intent] || booking.intent}`,
    `แบบ: ${booking.mode}`,
    `เวลาที่สะดวก: ${booking.day} ${booking.time}`,
  ];
  if (booking.note) lines.push(`โน้ต: ${booking.note}`);
  lines.push('', `อ้างอิง: ${booking.reference}`);
  if (adminUrl) lines.push(adminUrl);
  return lines.join('\n');
}

/* Notification shape from a stored row — the columns carry table-safe names
   (`meet_mode`, `pref_day`, `pref_time`) that the message builder does not use. */
export function bookingFromRow(row) {
  return {
    reference: row.reference,
    intent: row.intent,
    mode: row.meet_mode,
    day: row.pref_day,
    time: row.pref_time,
    name: row.name,
    contact: row.contact,
    note: row.note || '',
  };
}

async function pushLine(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const to = process.env.LINE_NOTIFY_USER_ID || '';
  if (!token || !to) return { status: 'skipped', detail: 'LINE_NOT_CONFIGURED' };
  // Messaging API caps a single text message at 5000 characters.
  return postJson(
    'https://api.line.me/v2/bot/message/push',
    { to, messages: [{ type: 'text', text: text.slice(0, 5000) }] },
    { authorization: `Bearer ${token}` },
  );
}

async function pushTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';
  if (!token || !chatId) return { status: 'skipped', detail: 'TELEGRAM_NOT_CONFIGURED' };
  // sendMessage caps at 4096 characters.
  return postJson(
    `https://api.telegram.org/bot${token}/sendMessage`,
    { chat_id: chatId, text: text.slice(0, 4096), disable_web_page_preview: true },
    {},
  );
}

/* Runs both channels regardless of each other's outcome — one dead token must
   not silence the channel that still works. */
export async function notifyBooking(booking, adminUrl) {
  const text = notificationText(booking, adminUrl);
  const [line, telegram] = await Promise.all([
    pushLine(text).catch(error => ({ status: 'failed', detail: clean(String(error?.message || error), 400) })),
    pushTelegram(text).catch(error => ({ status: 'failed', detail: clean(String(error?.message || error), 400) })),
  ]);
  return { line, telegram };
}

/* 'delivered' only when a channel actually accepted the message. All channels
   skipped means nothing is configured yet, which the control room shows as a
   setup warning rather than a delivery failure. */
export function deliveryStatus(result) {
  const outcomes = [result.line.status, result.telegram.status];
  if (outcomes.includes('sent')) return 'delivered';
  if (outcomes.includes('failed')) return 'failed';
  return 'unconfigured';
}
