/* TeamBook V1.2 — bridge the frozen Final Cast into live Ending Art briefs.

   The evidence engine decides WHAT happened. The final-cast snapshot decides
   WHO appears in the image. Keeping those concerns separate prevents avatar,
   card or companion setup churn from becoming story evidence while still
   giving the image provider the exact final character identities it needs. */

import { buildFinalCastSnapshot, finalCastPrompt } from './ending-cast-v12.js';

export function applyFinalCastToEnding(party, evidence, briefs = []) {
  const finalCast = buildFinalCastSnapshot(party);
  const castPrompt = finalCastPrompt(finalCast);
  const nextEvidence = Object.freeze({
    ...(evidence || {}),
    version: Math.max(4, Number(evidence?.version || 0)),
    finalCast,
  });
  const nextBriefs = Object.freeze((briefs || []).map(brief => Object.freeze({
    ...brief,
    prompt: `${castPrompt}\n\n${String(brief?.prompt || '')}`.trim(),
  })));
  return Object.freeze({ evidence: nextEvidence, briefs: nextBriefs });
}
