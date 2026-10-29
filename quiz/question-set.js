export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 20;
export const QUESTION_LIMIT = 240;
export const OPTION_LIMIT = 100;
export const ANNIVERSARY_TITLE = 'ครบรอบ 20 ปี';

export function validQuestionCount(value) {
  return Number.isInteger(value) && value >= MIN_QUESTIONS && value <= MAX_QUESTIONS;
}
const clean = value => typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
const validText = (value, limit) => !!value && [...value].length <= limit && !/[\p{Cc}\p{Cf}]/u.test(value);
function checkQuestion(item, index) {
  const text = clean(item?.text);
  if (!validText(text, QUESTION_LIMIT)) return { error: 'BAD_QUESTION_TEXT', index, field: 'text' };
  if (!Array.isArray(item?.options) || item.options.length !== 4) return { error: 'BAD_OPTIONS', index, field: '0' };
  const options = item.options.map(clean);
  const invalid = options.findIndex(option => !validText(option, OPTION_LIMIT));
  if (invalid !== -1) return { error: 'BAD_OPTIONS', index, field: String(invalid) };
  if (new Set(options.map(option => option.normalize('NFKC').toLocaleLowerCase('th'))).size !== 4) return { error: 'DUPLICATE_OPTIONS', index, field: '0' };
  // Submitted IDs / correctIndex are ignored. First choice is always the answer key.
  return { question: { id: index + 1, text, options, correctIndex: 0 } };
}

// Both the editor and the API use these rules. The server always validates again.
export function checkCustomQuestions(input) {
  if (!Array.isArray(input) || !validQuestionCount(input.length)) return { ok: false, error: 'BAD_QUESTION_COUNT', index: 0 };
  const questions = [];
  for (const [index, item] of input.entries()) {
    const checked = checkQuestion(item, index);
    if (checked.error) return { ok: false, ...checked };
    questions.push(checked.question);
  }
  return { ok: true, questions };
}

export function restoreDraft(saved) {
  const count = validQuestionCount(saved?.count) ? saved.count : MIN_QUESTIONS;
  return { count, questions: Array.from({ length: MAX_QUESTIONS }, (_, index) => ({
    text: typeof saved?.questions?.[index]?.text === 'string' ? saved.questions[index].text.slice(0, QUESTION_LIMIT) : '',
    options: Array.from({ length: 4 }, (_, choice) => typeof saved?.questions?.[index]?.options?.[choice] === 'string' ? saved.questions[index].options[choice].slice(0, OPTION_LIMIT) : ''),
  })) };
}
export function questionIsComplete(question) {
  return !checkQuestion(question, 0).error;
}
