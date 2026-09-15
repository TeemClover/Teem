// Instructor-authored tools live with private readings, never in the public JS bundle.
// Extract only after the lesson has passed its normal enrollment/access checks.
export function lessonContent(markdown = '') {
  const tools = [];
  const reading = String(markdown).replace(/^```learn-tools\s*\n([\s\S]*?)^```\s*$/gm, (_block, json) => {
    try {
      const entries = JSON.parse(json);
      if (Array.isArray(entries)) for (const entry of entries.slice(0, 8)) {
        if (!['prompt-library', 'prompt-cards'].includes(entry?.kind)
          || typeof entry.title !== 'string' || !Array.isArray(entry.prompts)
          || entry.prompts.length > 80) continue;
        tools.push(entry);
      }
    } catch { /* Malformed private configuration must not appear as learner prose. */ }
    return '';
  }).trim();
  return { reading, readingAvailable: Boolean(reading), tools };
}
