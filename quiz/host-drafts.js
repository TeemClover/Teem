import { checkCustomQuestions, restoreDraft, validQuestionCount } from './question-set.js';

export function createHostDrafts({ read, write, fetchTemplate }) {
  let templateRequest;
  const key = mode => mode === 'anniversary' ? 'anniversary-draft' : 'custom-draft';
  return {
    save(mode, draft) { write(key(mode), draft); },
    async open(mode, { reset = false } = {}) {
      if (!['anniversary', 'custom'].includes(mode)) throw new Error('BAD_MODE');
      const saved = read(key(mode));
      if (mode === 'custom' || (!reset && validQuestionCount(saved?.count) && Array.isArray(saved?.questions))) return restoreDraft(saved);
      try {
        templateRequest ||= fetchTemplate();
        const template = await templateRequest;
        const checked = checkCustomQuestions(template.questions);
        if (!checked.ok) throw new Error(checked.error);
        const draft = restoreDraft({ count: checked.questions.length, questions: checked.questions });
        write(key(mode), draft);
        return draft;
      } catch (error) { templateRequest = null;throw error; }
    },
  };
}
