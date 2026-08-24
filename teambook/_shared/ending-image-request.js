/* Pure request shaping for TeamBook Ending Art.

   Character-bearing directions use a multimodal image model so canonical
   TeamBook artwork can be supplied as visual input. Object-only direction C
   deliberately stays text-only; references there would encourage the model
   to add animals that the brief explicitly forbids. */

export const GATEWAY_IMAGE_ENDPOINT = 'https://ai-gateway.vercel.sh/v1/images/generations';
export const GATEWAY_MULTIMODAL_ENDPOINT = 'https://ai-gateway.vercel.sh/v1/chat/completions';
export const DEFAULT_ENDING_IMAGE_MODEL = 'openai/gpt-image-2';
export const DEFAULT_ENDING_REFERENCE_MODEL = 'google/gemini-3.1-flash-image-preview';

function entityLabel(entity) {
  if (entity?.roleAtClose === 'companion') return 'the final companion';
  const alias = String(entity?.alias || 'member');
  return `${alias} (${entity?.roleAtClose === 'lead' ? 'book owner' : 'member'})`;
}

export function referenceManifestPrompt(references = []) {
  if (!references.length) return '';
  const lines = [
    'REFERENCE IMAGES — CANONICAL CHARACTER APPEARANCE.',
    'Use each referenced animal/card for face, markings, silhouette, body proportions, and distinctive character details.',
    'Restyle the characters into the requested warm notebook scene, but do not copy card frames, rarity borders, backgrounds, text, letters, logos, or watermarks from the references.',
  ];
  references.forEach((reference, index) => {
    const entities = (reference.entities || []).map(entityLabel).join(', ') || 'a final cast character';
    const card = (reference.entities || []).find(entity => entity.cardId)?.cardId;
    lines.push(`[Reference Image ${index + 1}] ${entities}; canonical species ${reference.species}${card ? `; equipped card ${card}` : '; Starter portrait'}.`);
  });
  lines.push('Do not invent additional human people or animal characters. Every visible character must come from the FINAL CAST.');
  return lines.join('\n');
}

export function buildGatewayReferenceRequest({
  prompt,
  references = [],
  model = DEFAULT_ENDING_REFERENCE_MODEL,
} = {}) {
  const manifest = referenceManifestPrompt(references);
  return {
    endpoint: GATEWAY_MULTIMODAL_ENDPOINT,
    body: {
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `${String(prompt || '').trim()}\n\n${manifest}`.trim() },
          ...references.map(reference => ({
            type: 'image_url',
            image_url: { url: reference.url, detail: 'high' },
          })),
        ],
      }],
      modalities: ['text', 'image'],
      stream: false,
    },
  };
}

export function buildGatewayTextImageRequest({
  prompt,
  model = DEFAULT_ENDING_IMAGE_MODEL,
} = {}) {
  return {
    endpoint: GATEWAY_IMAGE_ENDPOINT,
    body: {
      model,
      prompt,
      n: 1,
      response_format: 'b64_json',
      size: '1024x1536',
    },
  };
}

export function generatedImageValue(payload = {}) {
  return payload.imageBase64
    || payload.image_base64
    || payload.b64_json
    || payload.data?.[0]?.b64_json
    || payload.images?.[0]?.base64
    || payload.images?.[0]?.b64_json
    || payload.choices?.[0]?.message?.images?.[0]?.image_url?.url
    || payload.choices?.[0]?.message?.images?.[0]?.url
    || payload.url
    || payload.data?.[0]?.url
    || payload.images?.[0]?.url
    || '';
}
