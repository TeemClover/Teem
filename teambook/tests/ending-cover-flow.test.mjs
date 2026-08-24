import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const source = path => readFileSync(join(ROOT, path), 'utf8');

test('/p keeps manual ending-cover upload reachable beside generated art', () => {
  const page = source('p/index.html');
  const gameplay = source('_shared/v12-gameplay.js');

  assert.match(page, /id="endingCoverUpload"[\s\S]*อัปโหลดภาพฉากจบ/);
  assert.match(page, /attachTarget = 'cover'/);
  assert.match(page, /applyEndingCover\([\s\S]*image: \{ data: shrunk\.base64/);
  assert.match(gameplay, /id="tb12UploadEndingCover"[\s\S]*อัปโหลดภาพปกเอง/);
  assert.match(gameplay, /document\.getElementById\('endingCoverUpload'\)/);
  assert.doesNotMatch(gameplay, /legacyCover\.hidden\s*=/);
});

test('Ending image engine falls back to Vercel AI Gateway with OIDC', () => {
  const engine = source('api/_lib/ending-engine.js');
  const health = source('api/health.js');
  const vercel = JSON.parse(source('vercel.json'));

  assert.match(engine, /process\.env\.AI_GATEWAY_API_KEY \|\| process\.env\.VERCEL_OIDC_TOKEN/);
  assert.match(engine, /https:\/\/ai-gateway\.vercel\.sh\/v1\/images\/generations/);
  assert.match(engine, /openai\/gpt-image-2/);
  assert.match(engine, /response_format: 'b64_json'/);
  assert.match(engine, /Promise\.all\(briefs\.map\(brief => providerImage/);
  assert.match(health, /endingImageConfigured:[\s\S]*VERCEL_OIDC_TOKEN/);
  assert.equal(vercel.functions['api/teambook-ending.js'].maxDuration, 300);
});

test('manual cover upload remains lead-only and terminal-only in canonical /p renderer', () => {
  const page = source('p/index.html');
  assert.match(page, /const isLead = p\.members\.some\([\s\S]*member\.role === 'lead'/);
  assert.match(page, /const finished = \['COMPLETED', 'DISSOLVED'\]/);
  assert.match(page, /panel\.hidden = !\(isLead && finished\)/);
  assert.match(page, /manageParty\(code, 'change_cover', \{ coverType: 'image'/);
});
