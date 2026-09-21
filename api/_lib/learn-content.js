// Instructor-authored tools live with private readings, never in the public JS bundle.
// Extract only after the lesson has passed its normal enrollment/access checks.
export function lessonContent(markdown = '') {
  const tools = [];
  const reading = String(markdown).replace(/^```learn-tools\s*\n([\s\S]*?)^```\s*$/gm, (_block, json) => {
    try {
      const entries = JSON.parse(json);
      if (Array.isArray(entries)) for (const entry of entries.slice(0, 8)) {
        if (!['guided-start', 'prompt-library', 'prompt-cards'].includes(entry?.kind)
          || typeof entry.title !== 'string' || !Array.isArray(entry.prompts)
          || entry.prompts.length > 80) continue;
        if (entry.kind === 'guided-start' && (
          !Array.isArray(entry.steps) || !entry.steps.length || entry.steps.length > 6
          || !entry.steps.every(step => typeof step === 'string' && step.trim() && step.length <= 1200)
          || typeof entry.expectedOutput !== 'string' || !entry.expectedOutput.trim() || entry.expectedOutput.length > 2000
          || !Array.isArray(entry.readyWhen) || !entry.readyWhen.length || entry.readyWhen.length > 6
          || !entry.readyWhen.every(item => typeof item === 'string' && item.trim() && item.length <= 1200)
          || !entry.prompts.length || entry.prompts.length > 3
          || entry.prompts.some(prompt => !prompt || (prompt.fields !== undefined && (!Array.isArray(prompt.fields) || prompt.fields.length)))
        )) continue;
        tools.push(entry);
      }
    } catch { /* Malformed private configuration must not appear as learner prose. */ }
    return '';
  }).trim();
  return { reading, readingAvailable: Boolean(reading), tools };
}
