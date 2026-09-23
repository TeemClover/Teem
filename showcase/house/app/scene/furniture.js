import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const boxGeometry = new THREE.BoxGeometry(1,1,1);
const softGeometry = new RoundedBoxGeometry(1,1,1,2,.09);
const cylinderGeometry = new THREE.CylinderGeometry(1,1,1,14);
const sphereGeometry = new THREE.SphereGeometry(1,9,7);

export function box(parent, size, position, material, soft=false) {
  const mesh = new THREE.Mesh(soft?softGeometry:boxGeometry, material);
  mesh.scale.set(...size); mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

export function cylinder(parent,radius,height,position,material) {
  const mesh=new THREE.Mesh(cylinderGeometry,material);
  mesh.scale.set(radius,height,radius); mesh.position.set(...position);
  mesh.castShadow=mesh.receiveShadow=true; parent.add(mesh); return mesh;
}

export function sphere(parent,size,position,material) {
  const mesh=new THREE.Mesh(sphereGeometry,material);
  mesh.scale.set(...size); mesh.position.set(...position);
  mesh.castShadow=mesh.receiveShadow=true; parent.add(mesh); return mesh;
}

export function roomBounds(room) {
  const xs=room.polygon.map(p=>p[0]), zs=room.polygon.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
  return {x0,x1,z0,z1,w:x1-x0,d:z1-z0,x:(x0+x1)/2,z:(z0+z1)/2};
}

function addPlant(parent,x,z,m,scale=1) {
  cylinder(parent,.15*scale,.28*scale,[x,.14*scale,z],m.white);
  cylinder(parent,.025*scale,.65*scale,[x,.6*scale,z],m.trunk);
  for(let i=0;i<5;i++) {
    const a=i*2.4;
    sphere(parent,[.2*scale,.27*scale,.12*scale],[x+Math.cos(a)*.12*scale,.75*scale+(i%2)*.12*scale,z+Math.sin(a)*.12*scale],i%2?m.leaves:m.leavesLight);
  }
}

function sofa(parent,x,z,w,d,m,material=m.sofa,lShape=true) {
  const g=new THREE.Group(); g.position.set(x,0,z); parent.add(g);
  box(g,[w,.18,d],[0,.16,0],m.darkWood,true);
  box(g,[w,.37,d],[0,.39,0],material,true);
  box(g,[w,.58,.21],[0,.72,-d/2+.1],material,true);
  box(g,[.2,.52,d],[-w/2+.1,.58,0],material,true);
  box(g,[.2,.52,d],[w/2-.1,.58,0],material,true);
  const seats=Math.max(2,Math.round(w/.7));
  for(let i=0;i<seats;i++) {
    const xx=-w/2+.25+(i+.5)*(w-.5)/seats;
    box(g,[(w-.5)/seats-.035,.11,d-.24],[xx,.62,.055],material,true);
    const pillow=box(g,[(w-.5)/seats*.72,.36,.13],[xx,.88,-d/2+.27],m.cushion,true);
    pillow.rotation.x=-.14;
  }
  if(lShape) {
    box(g,[.82,.35,d*.9],[w/2-.45,.39,d*.76],material,true);
    box(g,[.79,.1,d*.85],[w/2-.45,.62,d*.76],material,true);
  }
  return g;
}

function chair(parent,x,z,m,rotation=0) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);
  box(g,[.46,.12,.48],[0,.48,0],m.sofa,true);
  box(g,[.45,.54,.095],[0,.76,-.22],m.sofa,true);
  for(const dx of [-.16,.16])for(const dz of [-.16,.16])box(g,[.035,.43,.035],[dx,.22,dz],m.darkWood);
  return g;
}

function living(parent,b,m,gray=false,frontLiving=false) {
  const w=Math.min(2.9,b.w*.74),d=Math.min(.86,b.d*.2);
  const g=frontLiving
    ?sofa(parent,b.x1-.68,b.z-.05,Math.min(3,b.d*.68),d,m,m.sofa)
    :sofa(parent,b.x,b.z0+d/2+.3,w,d,m,gray?m.fabric:m.sofa);
  if(frontLiving)g.rotation.y=-Math.PI/2;
  // Furnishings illustrate the visible room signatures; they are not measured pieces.
  box(parent,[Math.min(3.15,b.w*.8),.025,Math.min(2.7,b.d*.62)],[b.x,.025,b.z+.2],m.rug);
  for(const dx of [-.3,.35]) {
    box(parent,[.75,.055,.7],[b.x+dx,.47,b.z+.25+(dx>0?.3:0)],m.glass);
    for(const xx of [-.32,.32])for(const zz of [-.29,.29])box(parent,[.025,.43,.025],[b.x+dx+xx,.235,b.z+.25+(dx>0?.3:0)+zz],m.frame);
  }
  if(frontLiving) {
    box(parent,[.37,.35,Math.min(2.8,b.d*.7)],[b.x0+.28,.21,b.z],m.white);
    box(parent,[.055,.81,Math.min(1.55,b.d*.5)],[b.x0+.26,.91,b.z],m.black);
  } else {
    box(parent,[Math.min(2.6,b.w*.7),.35,.37],[b.x,.21,b.z1-.26],m.white);
    box(parent,[Math.min(1.55,b.w*.55),.81,.055],[b.x,.91,b.z1-.22],m.black);
  }
  addPlant(parent,b.x0+.45,b.z1-.5,m,.85);
  return g;
}

function dining(parent,b,m) {
  const width=Math.min(1.2,b.w*.46), depth=Math.min(2.45,b.d*.62);
  box(parent,[width,.09,depth],[b.x,.78,b.z],m.darkWood,true);
  for(const dx of [-width*.34,width*.34])for(const dz of [-depth*.4,depth*.4])box(parent,[.07,.72,.07],[b.x+dx,.37,b.z+dz],m.timber);
  const count=depth>1.9?3:2;
  for(let i=0;i<count;i++) {
    const z=b.z-depth/2+(i+.5)*depth/count;
    chair(parent,b.x-width/2-.36,z,m,-Math.PI/2);
    chair(parent,b.x+width/2+.36,z,m,Math.PI/2);
  }
  cylinder(parent,.12,.22,[b.x,.94,b.z],m.white);
  for(let i=0;i<4;i++)sphere(parent,[.1,.1,.1],[b.x+Math.cos(i*2)*.11,1.13,b.z+Math.sin(i*2)*.11],m.leavesLight);
}

function kitchen(parent,b,m) {
  const inset=.13, depth=Math.min(.6,b.d*.18),run=b.w-.26;
  box(parent,[run,.8,depth],[b.x,.4,b.z0+inset+depth/2],m.white);
  box(parent,[run,.075,depth+.045],[b.x,.845,b.z0+inset+depth/2],m.cushion);
  const count=Math.max(2,Math.floor(run/.65));
  for(let i=1;i<count;i++)box(parent,[.012,.69,.018],[b.x0+inset+i*run/count,.42,b.z0+inset+depth+.011],m.taupe);
  box(parent,[.72,.026,.4],[b.x-.3,.895,b.z0+inset+depth/2],m.metal);
  box(parent,[.59,.03,.3],[b.x-.3,.906,b.z0+inset+depth/2],m.frame);
  cylinder(parent,.024,.28,[b.x-.3,1.01,b.z0+.2],m.metal);
  const faucet=box(parent,[.04,.035,.19],[b.x-.3,1.15,b.z0+.28],m.metal);faucet.castShadow=false;
  if(b.d>2.8&&b.w>2.7) {
    box(parent,[.65,.85,b.d*.48],[b.x1-.45,.425,b.z+.15],m.white);
    box(parent,[.71,.075,b.d*.5],[b.x1-.45,.89,b.z+.15],m.cushion);
    box(parent,[.46,.027,.57],[b.x1-.45,.945,b.z-.3],m.black);
    for(const dx of [-.13,.13])for(const dz of [-.16,.16])cylinder(parent,.077,.014,[b.x1-.45+dx,.966,b.z-.3+dz],m.frame);
    box(parent,[.72,.1,.57],[b.x1-.42,1.89,b.z-.3],m.metal);
    box(parent,[.3,.58,.25],[b.x1-.37,2.19,b.z-.3],m.metal);
    box(parent,[.75,.88,Math.min(1.5,b.d*.46)],[b.x-.35,.44,b.z+.35],m.white);
    box(parent,[.82,.055,Math.min(1.58,b.d*.46+.08)],[b.x-.35,.91,b.z+.35],m.cushion);
  }
}

function bedroom(parent,b,m) {
  const bw=Math.min(1.8,b.w*.53),bd=Math.min(2,b.d*.51), z=b.z0+bd/2+.4;
  box(parent,[bw+.26,.28,bd+.3],[b.x,.17,z],m.fabric,true);
  box(parent,[bw,.23,bd],[b.x,.43,z],m.cushion,true);
  box(parent,[bw+.3,1.02,.13],[b.x,.63,z-bd/2-.09],m.fabric,true);
  box(parent,[bw+.035,.025,bd*.42],[b.x,.56,z+bd*.22],m.sofa);
  for(const dx of [-bw*.25,bw*.25])box(parent,[bw*.4,.16,.43],[b.x+dx,.65,z-bd*.3],m.white,true);
  for(const dx of [-bw/2-.38,bw/2+.38]) {
    box(parent,[.47,.42,.43],[b.x+dx,.21,z-bd*.31],m.timber,true);
    cylinder(parent,.07,.12,[b.x+dx,.49,z-bd*.31],m.brass);
    cylinder(parent,.13,.16,[b.x+dx,.61,z-bd*.31],m.cushion);
  }
  box(parent,[Math.min(2.2,b.w*.58),.7,.5],[b.x,.36,b.z1-.32],m.white);
  box(parent,[Math.min(2.3,b.w*.61),.055,.56],[b.x,.74,b.z1-.32],m.cushion);
  chair(parent,b.x,b.z1-.9,m);
  addPlant(parent,b.x1-.45,b.z1-.48,m,.9);
}

function furnishingBounds(room) {
  if(room.polygon.length===4)return roomBounds(room);
  const inside=(x,z)=>{
    let hit=false;
    for(let i=0,j=room.polygon.length-1;i<room.polygon.length;j=i++) {
      const a=room.polygon[i],b=room.polygon[j];
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  };
  const xs=[...new Set(room.polygon.map(p=>p[0]))].sort((a,b)=>a-b),zs=[...new Set(room.polygon.map(p=>p[1]))].sort((a,b)=>a-b);
  let best=null,area=0;
  for(let a=0;a<xs.length;a++)for(let b=a+1;b<xs.length;b++)for(let c=0;c<zs.length;c++)for(let d=c+1;d<zs.length;d++) {
    const x0=xs[a],x1=xs[b],z0=zs[c],z1=zs[d],aa=(x1-x0)*(z1-z0);
    if(aa<=area)continue;
    if([[x0+.01,z0+.01],[x1-.01,z0+.01],[x1-.01,z1-.01],[x0+.01,z1-.01],[(x0+x1)/2,(z0+z1)/2]].every(([x,z])=>inside(x,z))) {
      area=aa;best={x0,x1,z0,z1,w:x1-x0,d:z1-z0,x:(x0+x1)/2,z:(z0+z1)/2};
    }
  }
  return best||roomBounds(room);
}

function bathroom(parent,b,m) {
  const scale=Math.min(1,b.w/1.4,b.d/1.5);
  const g=new THREE.Group();g.position.set(b.x0+.15,0,b.z0+.15);g.scale.setScalar(scale);parent.add(g);
  box(g,[.54,.55,.27],[.35,.3,.2],m.white,true);
  sphere(g,[.28,.11,.36],[.35,.43,.58],m.white);
  box(g,[.6,.8,.46],[Math.max(.35,(b.w-.6)/scale),.4,.23],m.timber);
  box(g,[.64,.09,.49],[Math.max(.35,(b.w-.6)/scale),.84,.23],m.white,true);
  if(b.d>2.1) {
    box(parent,[Math.min(.9,b.w-.2),.055,.9],[b.x,.04,b.z1-.55],m.white);
    box(parent,[Math.min(.9,b.w-.2),1.95,.035],[b.x,1,b.z1-1.02],m.glass);
  }
}

export function createFurniture(room,materials) {
  const group=new THREE.Group();group.name=`furniture:${room.id}`;
  const b=furnishingBounds(room),kind=(room.kind||'').toLowerCase(),id=room.id.toLowerCase();
  if(b.w<.8||b.d<.8)return group;
  if(kind.includes('bedroom') || /^f2-(201|202|203)$/.test(id)) bedroom(group,b,materials);
  else if(kind.includes('living') || kind.includes('lounge') || kind==='study') living(group,b,materials,kind!=='living',id.includes('g01'));
  else if(kind.includes('dining')) dining(group,b,materials);
  else if(kind.includes('kitchen') || kind.includes('pantry')) kitchen(group,b,materials);
  else if(kind.includes('bath')) bathroom(group,b,materials);
  else if(kind.includes('dressing')) {
    box(group,[.6,2.3,b.d-.25],[b.x0+.38,1.15,b.z],materials.white);
    for(let i=0;i<3;i++)box(group,[.018,2.05,.55],[b.x0+.69,1.18,b.z0+.45+i*.65],materials.taupe);
  }
  return group;
}

export function createTree(parent,x,z,height,m) {
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  cylinder(g,.09,height*.62,[0,height*.3,0],m.trunk);
  for(let i=0;i<6;i++) {
    const a=i*2.399;
    sphere(g,[height*.23,height*.27,height*.21],[Math.cos(a)*height*.13,height*.65+(i%3)*height*.08,Math.sin(a)*height*.13],i%2?m.leaves:m.leavesLight);
  }
  return g;
}

export function disposeSharedFurnitureGeometries() {
  [boxGeometry,softGeometry,cylinderGeometry,sphereGeometry].forEach(g=>g.dispose());
}
