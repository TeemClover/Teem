import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGatewayReferenceRequest, buildGatewayTextImageRequest,
  DEFAULT_ENDING_REFERENCE_MODEL, generatedImageValue,
  GATEWAY_IMAGE_ENDPOINT, GATEWAY_MULTIMODAL_ENDPOINT,
  referenceManifestPrompt,
} from './ending-image-request.js';

const references = [{
  url: 'https://www.teambook.me/assets/art/avatars/white-cat.webp',
  species: 'white_cat',
  identitySource: 'starter_avatar',
  entities: [
    { alias: 'Som', roleAtClose: 'lead', markerColor: 'green', cardId: null },
    { alias: 'Teem', roleAtClose: 'member', markerColor: 'red', cardId: null },
  ],
}];

test('reference request sends canonical art as multimodal image input', () => {
  const request = buildGatewayReferenceRequest({ prompt: 'Draw the real final cast.', references });
  assert.equal(request.endpoint, GATEWAY_MULTIMODAL_ENDPOINT);
  assert.equal(request.body.model, DEFAULT_ENDING_REFERENCE_MODEL);
  assert.deepEqual(request.body.modalities, ['text', 'image']);
  assert.equal(request.body.stream, false);
  assert.equal(request.body.messages[0].content[1].type, 'image_url');
  assert.equal(request.body.messages[0].content[1].image_url.url, references[0].url);
  assert.match(request.body.messages[0].content[0].text, /Reference Image 1/);
  assert.match(request.body.messages[0].content[0].text, /Som \(book owner\), Teem \(member\)/);
  assert.match(request.body.messages[0].content[0].text, /do not copy card frames/i);
});

test('object-only fallback remains the stable image-generation request', () => {
  const request = buildGatewayTextImageRequest({ prompt: 'A quiet still life.' });
  assert.equal(request.endpoint, GATEWAY_IMAGE_ENDPOINT);
  assert.equal(request.body.prompt, 'A quiet still life.');
  assert.equal(request.body.size, '1024x1536');
  assert.equal(request.body.response_format, 'b64_json');
  assert.equal(Object.hasOwn(request.body, 'messages'), false);
});

test('response extractor accepts multimodal and classic gateway payloads', () => {
  assert.equal(generatedImageValue({ data: [{ b64_json: 'classic' }] }), 'classic');
  assert.equal(generatedImageValue({
    choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,ref' } }] } }],
  }), 'data:image/png;base64,ref');
});

test('empty reference manifest stays empty', () => {
  assert.equal(referenceManifestPrompt([]), '');
});
