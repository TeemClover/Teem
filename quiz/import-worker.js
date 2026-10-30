import { readQuizFile } from './question-import.js';

self.onmessage = async ({ data }) => {
  try {
    const { buffer, extension } = data;
    const sheets = await readQuizFile(buffer, extension);
    self.postMessage({ ok: true, sheets });
  } catch (error) { self.postMessage({ ok: false, error: error.message || 'อ่านไฟล์ไม่สำเร็จ' }); }
};
