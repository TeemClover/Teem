import { restoreDraft } from './question-set.js';

// One local draft per browser. Hosts write every question themselves.
export function createHostDrafts({ read, write }) {
  const key = 'custom-draft';
  return {
    save(draft) { write(key, draft); },
    open() { return restoreDraft(read(key)); },
  };
}
