import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../course/thedent/course.js', import.meta.url), 'utf8');
const start = source.indexOf('  let manualCopyDialog, manualCopyReturnFocus;');
const end = source.indexOf('  function showDialog(', start);
assert.ok(start > 0 && end > start, 'Run the actual classroom copy functions');

function harness({ clipboard, legacy = false, modal = true } = {}) {
  const notices = [], copied = [], modals = [], created = [];
  let selection, legacyCalls = 0;
  const document = {};
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.style = {}; this.value = ''; this.open = false; }
    get isConnected() { return this === document.body || Boolean(this.parent?.isConnected); }
    append(child) { child.parent = this; this.children.push(child); }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); this.parent = undefined; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, callback) { this.events[name] = callback; }
    contains(element) { return element === this || this.children.some(child => child.contains(element)); }
    focus() { if (!modals.length || modals.at(-1).contains(this)) document.activeElement = this; }
    select() { if (document.activeElement === this) selection = this; }
    closest(tag) { return this.parent?.tag === tag ? this.parent : this.parent?.closest(tag); }
    querySelector(tag) { return this.children.find(child => child.tag === tag) || this.children.map(child => child.querySelector(tag)).find(Boolean); }
    set innerHTML(value) {
      this.markup = value;
      if (this.tag === 'dialog' && value.includes('manual-copy-title')) {
        this.append(new Element('button'));
        const field = new Element('textarea'); field.readOnly = /<textarea[^>]*\breadonly/.test(value); this.append(field);
      }
    }
    showModal() { this.open = true; modals.push(this); }
    close() { this.open = false; modals.splice(modals.indexOf(this), 1); this.events.close?.(); }
  }
  document.body = new Element('body');
  document.createElement = tag => { const element = new Element(tag); created.push(element); return element; };
  document.execCommand = () => {
    legacyCalls++;
    if (legacy === 'throws') throw new Error('copy unsupported');
    if (legacy && selection?.isConnected && document.activeElement === selection) { copied.push(selection.value); return true; }
    return false;
  };
  const dialog = new Element('dialog'); dialog.markup = 'Original Source preview'; document.body.append(dialog);
  if (modal) dialog.showModal();
  const button = new Element('button'); (modal ? dialog : document.body).append(button); button.focus();
  const context = vm.createContext({ document, dialog, navigator: clipboard ? { clipboard: { writeText: clipboard } } : {}, notify: text => notices.push(text) });
  vm.runInContext(`${source.slice(start, end)}\nthis.copy = copy;`, context);
  return { copy: context.copy, document, dialog, button, Element, notices, copied, created,
    selection: () => selection, legacyCalls: () => legacyCalls,
    manual: () => created.find(element => element.id === 'manual-copy-dialog') };
}

test('Clipboard API success copies exact text without changing focus or opening a fallback', async () => {
  const writes = [];
  const h = harness({ clipboard: async value => writes.push(value) });
  assert.equal(await h.copy('ซอส\n02-512-4595', null, 'คัดลอกลิงก์แล้ว'), true);
  assert.deepEqual(writes, ['ซอส\n02-512-4595']);
  assert.equal(h.legacyCalls(), 0);
  assert.equal(h.manual(), undefined);
  assert.equal(h.document.activeElement, h.button);
  assert.deepEqual(h.notices, ['คัดลอกลิงก์แล้ว']);
});

test('legacy copy works inside an open Source dialog and restores the copy button focus', async () => {
  const h = harness({ clipboard: async () => { throw new Error('denied'); }, legacy: true });
  assert.equal(await h.copy('SOURCE\nเบอร์โทร 02-147-2244'), true);
  assert.deepEqual(h.copied, ['SOURCE\nเบอร์โทร 02-147-2244']);
  assert.equal(h.document.activeElement, h.button);
  assert.equal(h.manual(), undefined);
  assert.ok(!h.dialog.children.some(element => element.tag === 'textarea'));
  assert.equal(h.dialog.markup, 'Original Source preview');
});

test('resource copy failure keeps exact selectable text, preserves Source, and restores focus on close', async () => {
  const h = harness({ clipboard: async () => { throw new Error('denied'); } });
  const text = 'ภาษาไทย\n</textarea><script>plain text</script>\n02-591-6868';
  assert.equal(await h.copy(text), false);
  const manual = h.manual(), field = manual.querySelector('textarea');
  assert.equal(manual.open, true);
  assert.equal(field.readOnly, true);
  assert.equal(field.value, text);
  assert.equal(h.selection(), field);
  assert.equal(field.isConnected, true);
  assert.equal(h.document.activeElement, field);
  assert.equal(manual['aria-labelledby'], 'manual-copy-title');
  assert.equal(manual['aria-describedby'], 'manual-copy-help');
  assert.equal(h.dialog.markup, 'Original Source preview');
  assert.equal(h.dialog.open, true);
  assert.match(h.notices.at(-1), /คัดลอกอัตโนมัติไม่ได้/);
  manual.querySelector('button').events.click();
  assert.equal(manual.open, false);
  assert.equal(field.value, '');
  assert.equal(h.document.activeElement, h.button);
  assert.equal(h.dialog.open, true);
  await h.copy('ข้อความรอบสอง');
  assert.equal(h.created.filter(element => element.id === 'manual-copy-dialog').length, 1);
  assert.equal(field.value, 'ข้อความรอบสอง');
  manual.close(); // Escape closes a native dialog through the same close event.
  assert.equal(h.document.activeElement, h.button);
});

test('missing Clipboard API and throwing legacy copy still offer a visible manual link copy', async () => {
  const h = harness({ legacy: 'throws', modal: false });
  const link = 'file:///workshop/index.html#learn/workshop2';
  assert.equal(await h.copy(link), false);
  assert.equal(h.manual().querySelector('textarea').value, link);
  assert.equal(h.selection().isConnected, true);
  h.manual().close();
  assert.equal(h.document.activeElement, h.button);
});

test('prompt copy failure expands and selects its existing editor without replacing it', async () => {
  const h = harness({ modal: false });
  const details = new h.Element('details'), field = new h.Element('textarea');
  field.value = 'คำสั่งที่ผู้เรียนแก้เอง'; details.append(field); h.document.body.append(details);
  assert.equal(await h.copy(field.value, field), false);
  assert.equal(details.open, true);
  assert.equal(h.selection(), field);
  assert.equal(field.isConnected, true);
  assert.equal(field.value, 'คำสั่งที่ผู้เรียนแก้เอง');
  assert.equal(h.manual(), undefined);
  assert.match(h.notices.at(-1), /คัดลอกอัตโนมัติไม่ได้/);
});
