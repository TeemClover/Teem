import test from 'node:test';
import assert from 'node:assert/strict';
import {solarModuleLayout} from '../app/scene/solar-layout.js';

const roof={x0:5.25,x1:14.45,z0:-10.65,z1:-1.25,y:6.19,rise:1.2};
const round=value=>Math.round(value*1e9)/1e9;
const positions=modules=>modules.map(m=>m.center.toArray().map(round)).sort((a,b)=>a[0]-b[0]||a[2]-b[2]);

test('only the front bank moves to the rear, with all 14 modules retained',()=>{
  const panels=solarModuleLayout(roof),east=panels.filter(p=>p.side==='east'),rear=panels.filter(p=>p.side==='rear');
  assert.equal(panels.length,14);assert.equal(east.length,8);assert.equal(rear.length,6);
  assert.ok(panels.every(p=>p.normal.z<1e-9),'no panel faces the front');
  assert.ok(rear.every(p=>p.normal.z<-.1&&p.corners.every(c=>c[2]<(roof.z0+roof.z1)/2)));
  // Captured positions of the untouched east bank, before the owner's move.
  const expectedEast=[
    ...[-3.77,-4.86,-5.95,-7.04,-8.13].map(z=>[13.521087418499029,6.4973250212611235,z]),
    ...[-4.86,-5.95,-7.04].map(z=>[12.21480410076329,6.838094582409577,z]),
  ].map(p=>p.map(round)).sort((a,b)=>a[0]-b[0]||a[2]-b[2]);
  assert.deepEqual(positions(east),expectedEast,'the adjacent east bank must remain unchanged');
  // Preserve row spacing and heights; reflect the former front centers in Z.
  const frontCenters=[
    ...[8.215,9.305,10.395,11.485].map(x=>[x,6.527848659756228,-2.1704094789110067]),
    ...[9.305,10.395].map(x=>[x,6.911542087538423,-3.4647353086296095]),
  ];
  const expectedRear=frontCenters.map(([x,y,z])=>[x,y,roof.z0+roof.z1-z].map(round)).sort((a,b)=>a[0]-b[0]||a[2]-b[2]);
  assert.deepEqual(positions(rear),expectedRear);
});

test('solar modules stay rectangular and elevated above the corrected roof slope',()=>{
  for(const panel of solarModuleLayout(roof)) {
    const [a,b,c,d]=panel.corners;
    const distance=(p,q)=>Math.hypot(...p.map((v,i)=>v-q[i]));
    assert.ok(Math.abs(distance(a,b)-1.02)<1e-9);
    assert.ok(Math.abs(distance(b,c)-1.28)<1e-9);
    assert.ok(Math.abs(distance(c,d)-1.02)<1e-9);
    for(const [x,y,z] of panel.corners) {
      assert.ok(x>=roof.x0&&x<=roof.x1&&z>=roof.z0&&z<=roof.z1);
      const roofY=panel.side==='east'?roof.y+(roof.x1-x)/4.6*roof.rise:roof.y+(z-roof.z0)/4.048*roof.rise;
      assert.ok(Math.abs(y-roofY-.065)<1e-9);
    }
  }
});
