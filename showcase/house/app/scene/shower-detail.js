import * as THREE from 'three';

/**
 * Owner-confirmed 3D-only shower annex beside bathroom 205. Coordinates are
 * house x/z, bathroom-local y: its -.04 m floor offset is applied by the caller.
 * No new room, plan polygon, door or material is introduced by this helper.
 */
export function createShowerDetail({materials:m,quality='sd'}) {
  const hd=quality==='hd',group=new THREE.Group(),geometries=new Set();
  group.name='bath205-shower-detail';
  group.userData={quality,bathroom:'f2-205-bath',modelOnly:true,floorOffsetAppliedByParent:true,wetBounds:[8.565,-9.055,9.585,-7.975],entryGap:[9.055,9.60]};
  const own=geometry=>(geometries.add(geometry),geometry);
  const cube=own(new THREE.BoxGeometry(1,1,1));
  const round=own(new THREE.CylinderGeometry(1,1,1,hd?28:14));
  const add=(geometry,material,position,scale,name='')=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.name=name;
    mesh.castShadow=!material.transparent;mesh.receiveShadow=true;group.add(mesh);return mesh;
  };
  const box=(size,position,material,name='')=>add(cube,material,position,size,name);
  const cylinder=(radius,length,position,material,name='')=>add(round,material,position,[radius,length,radius],name);
  const pipe=(a,b,radius,material,name='')=>{
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const mesh=cylinder(radius,delta.length(),from.add(to).multiplyScalar(.5).toArray(),material,name);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
  };
  // Shallow, four-tile wet floor. It sits above the room surface without an
  // overlapping duplicate top, and its low edge leaves the east access clear.
  box([1.02,.018,1.08],[9.075,.021,-8.515],m.taupe,'wet-tray-base');
  for(const x of [8.819,9.331])for(const z of [-8.786,-8.244]) {
    box([.506,.006,.536],[x,.033,z],m.outdoor,'wet-floor-tile');
  }
  box([.32,.007,.060],[9.16,.041,-8.915],m.frame,'shower-linear-drain');
  for(const z of [-8.946,-8.884])box([.335,.006,.006],[9.16,.046,z],m.metal,'drain-edge');
  const grateCount=hd?11:6;
  for(let i=0;i<grateCount;i++)box([.006,.004,.048],[9.013+i*.294/(grateCount-1),.047,-8.915],m.metal,'drain-grate');

  const fixtureZ=-8.55,wallX=8.57;
  for(const y of [1.08,1.93]) {
    const mount=cylinder(.032,.014,[wallX,y,fixtureZ],m.metal,'shower-wall-mount');mount.rotation.z=-Math.PI/2;
    pipe([wallX,y,fixtureZ],[8.625,y,fixtureZ],.012,m.metal,'shower-rail-bracket');
  }
  pipe([8.625,1.08,fixtureZ],[8.625,1.93,fixtureZ],.013,m.metal,'shower-vertical-rail');
  box([.055,.052,.046],[8.653,1.69,fixtureZ],m.metal,'handset-slider');
  pipe([8.672,1.58,fixtureZ],[8.747,1.82,fixtureZ],.014,m.metal,'shower-handset-grip');
  const head=cylinder(.067,.018,[8.764,1.863,fixtureZ],m.metal,'shower-handheld-head');
  const headDirection=new THREE.Vector3(.7,-.714,0).normalize();
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),headDirection);
  const face=cylinder(.057,.004,[8.764,1.863,fixtureZ],m.white,'shower-spray-face');
  face.position.addScaledVector(headDirection,.0115);face.quaternion.copy(head.quaternion);
  if(hd) {
    const basis=new THREE.Vector3(0,0,1),other=new THREE.Vector3().crossVectors(headDirection,basis);
    for(let ring=1;ring<=2;ring++)for(let i=0;i<ring*6;i++) {
      const angle=i/(ring*6)*Math.PI*2;
      const p=face.position.clone().addScaledVector(headDirection,.0027).addScaledVector(basis,Math.cos(angle)*ring*.017).addScaledVector(other,Math.sin(angle)*ring*.017);
      const nozzle=cylinder(.0024,.0014,p.toArray(),m.frame,'hd:shower-nozzle');nozzle.quaternion.copy(head.quaternion);
    }
  }
  const mixer=cylinder(.046,.063,[8.607,1.035,fixtureZ],m.metal,'shower-mixing-valve');mixer.rotation.z=-Math.PI/2;
  const dial=cylinder(.031,.018,[8.649,1.035,fixtureZ],m.metal,'shower-valve-dial');dial.rotation.z=-Math.PI/2;
  pipe([8.661,1.035,fixtureZ],[8.682,1.11,fixtureZ],.007,m.metal,'shower-valve-lever');
  const hoseCurve=new THREE.CatmullRomCurve3([[8.635,1.0,fixtureZ],[8.72,.69,fixtureZ+.035],[8.84,.65,fixtureZ+.022],[8.795,1.13,fixtureZ],[8.672,1.58,fixtureZ]].map(p=>new THREE.Vector3(...p)));
  add(own(new THREE.TubeGeometry(hoseCurve,hd?36:20,.006,hd?6:4,false)),m.metal,[0,0,0],[1,1,1],'shower-flexible-hose');
  // A compact wall shelf stays behind the fittings and inside the wet zone.
  box([.19,.021,.28],[8.663,1.25,-8.90],m.glass,'shower-glass-shelf');
  box([.024,.055,.27],[8.578,1.242,-8.90],m.metal,'shower-shelf-bracket');
  if(hd) {
    cylinder(.024,.11,[8.682,1.316,-8.895],m.white,'hd:shower-bottle');
    cylinder(.016,.019,[8.682,1.381,-8.895],m.frame,'hd:shower-bottle-cap');
  }

  // Fixed half screen; it is not a second door. East-side access remains open.
  box([.475,1.93,.014],[8.810,.999,-7.950],m.glass,'shower-fixed-screen');
  box([.486,.017,.027],[8.810,.046,-7.950],m.metal,'shower-screen-bottom-channel');
  for(const y of [.39,1.62])box([.039,.049,.033],[8.579,y,-7.950],m.metal,'shower-screen-wall-clamp');
  group.disposeSourceGeometries=()=>{for(const geometry of geometries)geometry.dispose();geometries.clear();};
  return group;
}
