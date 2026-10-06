import test from 'node:test';
import assert from 'node:assert/strict';
import {createGovernor, updateGovernor, pixelRatio} from '../../tour/quality.js';

test('light mode reacts to sustained slow frames, including devices slower than 4 fps', () => {
  for (const dt of [1 / 30, 0.3]) {
    const g = createGovernor();
    for (let t = 0; t < 5; t += dt) updateGovernor(g, dt);
    assert.equal(g.level, 3);
  }
});
test('an isolated hitch does not lower quality, recovery requires sustained fast frames', () => {
  const g = createGovernor(); updateGovernor(g, 0.1);
  for (let i = 0; i < 120; i++) updateGovernor(g, 1 / 60);
  assert.equal(g.level, 1);
  g.level = 3; g.cooldown = 0;
  for (let i = 0; i < 5; i++) {
    for (let k = 0; k < 120; k++) updateGovernor(g, 1 / 60);
    updateGovernor(g, 0.1);
  }
  assert.equal(g.level, 3, 'short fast intervals must not add up across hitches');
  for (let i = 0; i < 1200; i++) updateGovernor(g, 1 / 60);
  assert.equal(g.level, 2, 'only one step up before the recovery cooldown');
});
test('high-DPI desktop and phone buffers stay within a bounded pixel budget', () => {
  for (const [width, height, mobile] of [[3840,2160,false],[393,852,true],[1280,800,false]]) {
    const ratio = pixelRatio({width,height,mobile,level:0,dpr:3});
    assert.ok(width*height*ratio*ratio <= (mobile?1000000:1800000)+1);
  }
});

test('light mode lowers the pixel workload on sustained slow frames without rebuilding', () => {
  const g=createGovernor(),device={width:1280,height:800,dpr:2,mobile:false};
  const before=pixelRatio({...device,level:g.level});
  for(let i=0;i<150;i++)updateGovernor(g,1/30);
  const after=pixelRatio({...device,level:g.level});
  assert.ok(after<before);assert.ok(before<=1.25);
});
