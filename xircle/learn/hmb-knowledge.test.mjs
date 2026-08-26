import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const xircle = path.resolve(here, '..');

function loadLibrary() {
  const context = vm.createContext({ window: {} });
  for (const file of ['library-founder-v1.js', 'library-simple-v1.js']) {
    const source = fs.readFileSync(path.join(xircle, 'data', file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return context.window;
}

test('HMB knowledge topic keeps evidence and product claims separate', () => {
  const library = loadLibrary();
  const topic = library.XIRCLE_LIBRARY.topics.find((item) => item.id === 'hmb-myhmb');
  const simple = library.XIRCLE_SIMPLE.topics['hmb-myhmb'];

  assert.ok(topic, 'founder library must include the HMB topic');
  assert.equal(topic.part, 'act');
  assert.match(topic.boundary, /ไม่ใช่การรับรอง Protein HMB\+/);
  assert.match(simple.points.join(' '), /3 กรัม/);
  assert.match(simple.points.join(' '), /750 มก\./);
  assert.equal(simple.external.href, 'https://www.youtube.com/watch?v=lqQS_lC50mw');
  assert.equal(simple.product.href, '/xircle/doc/habix/protein-hmb/');
});

test('the doctor video is embedded only in the knowledge topic route', () => {
  const topicPage = fs.readFileSync(path.join(here, 'topic', 'index.html'), 'utf8');
  const productPage = fs.readFileSync(
    path.join(xircle, 'doc', 'habix', 'protein-hmb', 'index.html'),
    'utf8',
  );

  assert.match(topicPage, /youtube-nocookie\.com\/embed\/lqQS_lC50mw/);
  assert.doesNotMatch(productPage, /youtube-nocookie\.com\/embed\/lqQS_lC50mw/);
  assert.match(productPage, /\/xircle\/learn\/topic\/\?t=hmb-myhmb/);
  assert.match(productPage, /ไม่ใช่การรับรอง Protein HMB\+/);
});

