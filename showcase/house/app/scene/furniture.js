import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const boxGeometry = new THREE.BoxGeometry(1,1,1);
const softGeometry = new RoundedBoxGeometry(1,1,1,2,.09);
const cylinderGeometry = new THREE.CylinderGeometry(1,1,1,14);
const sphereGeometry = new THREE.SphereGeometry(1,9,7);
const tubRimShape=new THREE.Shape();tubRimShape.absellipse(0,0,.5,.5,0,Math.PI*2,false);
const tubOpening=new THREE.Path();tubOpening.absellipse(0,0,.42,.36,0,Math.PI*2,true);tubRimShape.holes.push(tubOpening);
const tubRimGeometry=new THREE.ExtrudeGeometry(tubRimShape,{depth:.07,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.015,curveSegments:24});

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
    const pillow=box(g,[(w-.5)/seats*.72,.36,.13],[xx,.88,-d/2+.27],i%2?m.cushion:m.accentCushion,true);
    pillow.rotation.x=-.14;
  }
  if(lShape) {
    box(g,[.82,.35,d*.9],[w/2-.45,.39,d*.76],material,true);
    box(g,[.79,.1,d*.85],[w/2-.45,.62,d*.76],material,true);
  }
  return g;
}

function chair(parent,x,z,m,rotation=0) {
  const g=new THREE.Group();g.name='chair';g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);
  box(g,[.46,.12,.48],[0,.48,0],m.sofa,true);
  box(g,[.45,.54,.095],[0,.76,-.22],m.sofa,true);
  for(const dx of [-.16,.16])for(const dz of [-.16,.16])box(g,[.035,.43,.035],[dx,.22,dz],m.darkWood);
  return g;
}

function living(parent,b,m,gray=false,frontLiving=false) {
  const w=Math.min(3.45,b.d*.78),d=.93;
  const g=frontLiving?sofa(parent,b.x0+.65,b.z+.05,w,d,m,m.sofa):sofa(parent,b.x,b.z0+.66,Math.min(3.1,b.w-.65),.95,m,gray?m.fabric:m.sofa);
  if(frontLiving)g.rotation.y=Math.PI/2;
  box(parent,[Math.min(2.7,b.w-.75),.025,Math.min(3.4,b.d-.65)],[b.x+.12,.027,b.z+.1],gray?m.cushion:m.rug);
  if(frontLiving){
    // Four separate black metal / glass coffee tables visible in living photos.
    for(const dx of [-.39,.39])for(const dz of [-.43,.43]) {
      box(parent,[.73,.045,.8],[b.x+.18+dx,.44,b.z+.1+dz],m.glass);
      for(const xx of [-.34,.34])for(const zz of [-.37,.37])box(parent,[.023,.42,.023],[b.x+.18+dx+xx,.22,b.z+.1+dz+zz],m.black);
      box(parent,[.71,.018,.76],[b.x+.18+dx,.08,b.z+.1+dz],m.glass);
    }
    box(parent,[.29,.055,.2],[b.x+.55,.49,b.z-.3],m.timber);
    cylinder(parent,.1,.14,[b.x-.2,.54,b.z+.55],m.brass);
    addPlant(parent,b.x1-.48,b.z0+.48,m,.8);
  }else{
    box(parent,[.85,.42,1.25],[b.x,.24,b.z+.35],m.marble);
    box(parent,[.35,.035,.23],[b.x,.48,b.z+.4],m.timber);
    addPlant(parent,b.x0+.38,b.z1-.4,m,.75);
  }
  return g;
}

function dining(parent,b,m) {
  const width=Math.min(1.2,b.w*.46), depth=Math.min(2.45,b.d*.62);
  box(parent,[width,.075,depth],[b.x,.78,b.z],m.mirror);
  box(parent,[width*.65,.08,depth*.8],[b.x,.12,b.z],m.black);
  for(const dx of [-width*.34,width*.34])for(const dz of [-depth*.4,depth*.4])box(parent,[.07,.72,.07],[b.x+dx,.37,b.z+dz],m.timber);
  const count=depth>1.9?3:2;
  for(let i=0;i<count;i++) {
    const z=b.z-depth/2+(i+.5)*depth/count;
    chair(parent,b.x-width/2-.36,z,m,Math.PI/2);
    chair(parent,b.x+width/2+.36,z,m,-Math.PI/2);
  }
  chair(parent,b.x,b.z-depth/2-.35,m,0);chair(parent,b.x,b.z+depth/2+.35,m,Math.PI);
  cylinder(parent,.12,.22,[b.x,.94,b.z],m.white);
  for(let i=0;i<4;i++)sphere(parent,[.1,.1,.1],[b.x+Math.cos(i*2)*.11,1.13,b.z+Math.sin(i*2)*.11],m.leavesLight);
}

function kitchen(parent,b,m) {
  const inset=.13, depth=Math.min(.6,b.d*.18),run=b.w-.26;
  box(parent,[run,.8,depth],[b.x,.4,b.z0+inset+depth/2],m.white);
  box(parent,[run,.075,depth+.045],[b.x,.845,b.z0+inset+depth/2],m.marble);
  box(parent,[run-.08,.08,depth-.03],[b.x,.055,b.z0+inset+depth/2],m.frame);
  const count=Math.max(2,Math.floor(run/.65));
  for(let i=1;i<count;i++)box(parent,[.012,.69,.018],[b.x0+inset+i*run/count,.42,b.z0+inset+depth+.011],m.taupe);
  for(let i=0;i<count;i++)box(parent,[.19,.02,.035],[b.x0+inset+(i+.5)*run/count,.72,b.z0+inset+depth+.03],m.metal);
  box(parent,[.72,.026,.4],[b.x-.3,.895,b.z0+inset+depth/2],m.metal);
  box(parent,[.59,.03,.3],[b.x-.3,.906,b.z0+inset+depth/2],m.frame);
  cylinder(parent,.024,.28,[b.x-.3,1.01,b.z0+.2],m.metal);
  const faucet=box(parent,[.04,.035,.19],[b.x-.3,1.15,b.z0+.28],m.metal);faucet.castShadow=false;
  if(b.d>2.8&&b.w>2.7) {
    box(parent,[.65,.85,b.d*.48],[b.x1-.45,.425,b.z+.15],m.white);
    box(parent,[.71,.075,b.d*.5],[b.x1-.45,.89,b.z+.15],m.marble);
    box(parent,[.46,.027,.57],[b.x1-.45,.945,b.z-.3],m.black);
    for(const dx of [-.13,.13])for(const dz of [-.16,.16])cylinder(parent,.077,.014,[b.x1-.45+dx,.966,b.z-.3+dz],m.frame);
    box(parent,[.72,.1,.57],[b.x1-.42,1.89,b.z-.3],m.metal);
    box(parent,[.3,.58,.25],[b.x1-.37,2.19,b.z-.3],m.metal);
    box(parent,[.75,.88,Math.min(1.5,b.d*.46)],[b.x-.35,.44,b.z+.35],m.white);
    box(parent,[.82,.055,Math.min(1.58,b.d*.46+.08)],[b.x-.35,.91,b.z+.35],m.marble);
  }
}

// The plan governs unphotographed bedrooms; the owner confirms the 201 alteration.
function bed(parent,x,z,m,{width=1.8,rotation=0,platform=false}={}) {
  const g=new THREE.Group();g.name=platform?'bed:platform':'bed:standard';
  g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);
  const depth=2.05,frameWidth=width+(platform?.55:.1),frameDepth=depth+(platform?.85:.12);
  box(g,[frameWidth,platform?.35:.27,frameDepth],[0,platform?.22:.24,platform?.26:0],platform?m.leather:m.timber,true);
  box(g,[frameWidth,platform?.85:.78,.15],[0,.76,-depth/2-.1],platform?m.leather:m.timber,true);
  if(platform)for(let i=0;i<3;i++)box(g,[(frameWidth-.07)/3-.015,.36,.08],[(i-1)*(frameWidth-.07)/3,.88,-depth/2+.01],m.leather,true);
  box(g,[width,.24,depth],[0,.53,0],m.cushion,true);
  box(g,[width+.035,.05,depth*.65],[0,.67,.22],m.white,true);
  for(const dx of [-width*.26,width*.26]){
    const pillow=box(g,[width*.42,.18,.48],[dx,.76,-.65],m.cushion,true);pillow.rotation.x=-.13;
  }
  if(platform)box(g,[frameWidth-.15,.025,.42],[0,.41,depth/2+.42],m.leather);
  for(const side of [-1,1]){
    box(g,[.4,.43,.4],[side*(frameWidth/2+.25),.23,-.7],platform?m.cabinet:m.timber);
    cylinder(g,.07,.15,[side*(frameWidth/2+.25),.52,-.7],m.brass);
    cylinder(g,.12,.18,[side*(frameWidth/2+.25),.68,-.7],m.cushion);
  }
  return g;
}

function bedroom(parent,b,m,room) {
  if(room.id==='f2-201-bedroom'){
    // West wall adjoins the lounge. Keep the northern hall and dressing routes free.
    bed(parent,b.x0+1.3,b.z1-1.78,m,{width:2.1,rotation:Math.PI/2,platform:true});
  }else if(room.id==='f2-202-bedroom'){
    bed(parent,b.x0+1.3,b.z1-1.57,m,{width:1.8,rotation:Math.PI/2});
  }else if(room.id==='f2-203-bedroom'){
    bed(parent,b.x0+1.73,b.z0+1.3,m,{width:1.6});
    const armchair=sofa(parent,b.x0+3.8,b.z0+.83,.86,.8,m,m.sofa,false);
    armchair.rotation.y=-.55;
  }else bed(parent,b.x,b.z0+1.3,m);
}

function lounge(parent,b,m) {
  const z=b.z1-1.55;
  const seating=sofa(parent,b.x1-.64,z,Math.min(2.65,b.d-1),.92,m,m.fabric);
  seating.name='lounge-sofa';seating.rotation.y=-Math.PI/2;
  box(parent,[Math.min(2.6,b.w-1.25),.022,Math.min(2.9,b.d-.75)],[b.x+.2,.026,z],m.rug);
  box(parent,[.72,.055,1.2],[b.x+.2,.43,z],m.glass);
  for(const dx of [-.29,.29])for(const dz of [-.52,.52])box(parent,[.035,.39,.035],[b.x+.2+dx,.21,z+dz],m.black);
  const officeChair=chair(parent,b.x0+1.25,z-.2,m,-Math.PI/2);officeChair.name='computer-chair';
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

function fixtureGroup(parent,type,x,z,rotation=0) {
  const g=new THREE.Group();g.name=`fixture:${type}`;g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);return g;
}
function toilet(parent,x,z,m,rotation=0) {
  const g=fixtureGroup(parent,'toilet',x,z,rotation);
  box(g,[.4,.49,.19],[0,.36,-.25],m.white,true);
  box(g,[.43,.045,.21],[0,.625,-.25],m.white,true);
  box(g,[.23,.29,.35],[0,.18,.035],m.white,true);
  sphere(g,[.245,.17,.34],[0,.34,.045],m.white);
  sphere(g,[.255,.045,.34],[0,.465,.045],m.white);
  sphere(g,[.178,.014,.235],[0,.499,.065],m.taupe);
  box(g,[.07,.013,.035],[0,.654,-.26],m.metal);
}
function basin(parent,x,z,m,rotation=0,width=.6) {
  const g=fixtureGroup(parent,'basin',x,z,rotation);
  box(g,[width,.19,.44],[0,.77,0],m.white,true);
  sphere(g,[width*.34,.018,.15],[0,.878,.025],m.taupe);
  cylinder(g,.022,.2,[0,.96,-.15],m.metal);
  box(g,[.035,.03,.15],[0,1.05,-.09],m.metal);
  box(g,[width*.9,.72,.025],[0,1.5,-.22],m.mirror);
}
function shower(parent,x,z,width,depth,m,{screenSide='east',headSide='west'}={}) {
  const g=fixtureGroup(parent,'shower',x,z);
  box(g,[width,.045,depth],[0,.028,0],m.white);
  box(g,[.09,.014,.09],[width*.15,.059,depth*.2],m.metal);
  // A side screen leaves the circulation edge open, as indicated by the plan.
  if(screenSide==='east')box(g,[.025,1.92,depth*.66],[width/2,1,depth*.17],m.glass);
  else if(screenSide==='south')box(g,[width*.62,1.92,.025],[-width*.19,1,depth/2],m.glass);
  const hx=headSide==='west'?-width/2+.055:width*.16,hz=headSide==='west'?-depth*.13:-depth/2+.055;
  cylinder(g,.016,1.1,[hx,1.45,hz],m.metal);
  sphere(g,[.09,.025,.08],[hx+(headSide==='west'?.14:0),2.02,hz+(headSide==='west'?0:.14)],m.metal);
  box(g,[.08,.09,.04],[hx,1.06,hz],m.metal);
}
function bathtub(parent,x,z,width,depth,m) {
  const g=fixtureGroup(parent,'bathtub',x,z);
  box(g,[width,.51,depth],[0,.285,0],m.white,true);
  sphere(g,[width*.42,.035,depth*.35],[0,.552,0],m.cushion);
  const rim=new THREE.Mesh(tubRimGeometry,m.white);rim.rotation.x=-Math.PI/2;
  rim.scale.set(width,depth,1);rim.position.y=.56;rim.castShadow=rim.receiveShadow=true;g.add(rim);
  cylinder(g,.023,.21,[-width*.31,.67,-depth*.36],m.metal);
  box(g,[.17,.025,.03],[-width*.25,.77,-depth*.36],m.metal);
}
function bathroom(parent,b,m,room) {
  // Fixture locations and facing directions are read from the individual plan symbols.
  if(room.id==='f2-205-bath'){
    bathtub(parent,b.x,b.z0+.62,Math.min(1.75,b.w-.18),.94,m);
    toilet(parent,b.x0+.42,b.z1-.43,m,Math.PI);
    basin(parent,b.x1-.52,b.z1-.31,m,Math.PI,.65);
  }else if(room.id==='f2-206-bath'){
    shower(parent,b.x0+.66,b.z,widthFor(b,1.15),b.d-.24,m);
    toilet(parent,b.x0+1.56,b.z0+.43,m);
    basin(parent,b.x1-.33,b.z0+.4,m,-Math.PI/2,.52);
  }else if(room.id==='f2-207-bath'){
    shower(parent,b.x0+.71,b.z,widthFor(b,1.22),b.d-.24,m);
    toilet(parent,b.x0+1.92,b.z1-.43,m,Math.PI);
    basin(parent,b.x1-.31,b.z1-.42,m,-Math.PI/2,.54);
  }else if(room.id==='f1-g06-bath'){
    shower(parent,b.x0+.64,b.z0+.65,1.05,1.04,m,{screenSide:'east'});
    basin(parent,b.x1-.58,b.z0+.33,m,0,.82);
    toilet(parent,b.x0+.46,b.z1-.52,m,Math.PI/2);
  }else if(room.id==='f1-g08-service-bath'){
    toilet(parent,b.x1-.62,b.z1-.42,m,Math.PI);
    basin(parent,b.x0+.45,b.z1-.28,m,Math.PI,.45);
    // Compact wet-room shower: no invented cubicle in this small service bathroom.
    const g=fixtureGroup(parent,'shower',b.x0+.43,b.z0+.25);
    cylinder(g,.015,1.08,[0,1.43,0],m.metal);sphere(g,[.07,.025,.07],[.09,2,0],m.metal);
    box(g,[.09,.014,.09],[.2,.023,.25],m.metal);
  }
}
function widthFor(b,width){return Math.min(width,b.w*.4);}

export function createFurniture(room,materials) {
  const group=new THREE.Group();group.name=`furniture:${room.id}`;
  const b=furnishingBounds(room),kind=(room.kind||'').toLowerCase(),id=room.id.toLowerCase();
  if(b.w<.8||b.d<.8)return group;
  if(kind.includes('bedroom') || /^f2-(201|202|203)$/.test(id)) bedroom(group,b,materials,room);
  else if(kind==='lounge')lounge(group,b,materials);
  else if(kind.includes('living') || kind==='study') living(group,b,materials,kind!=='living',id.includes('g01'));
  else if(kind.includes('dining')) dining(group,b,materials);
  else if(kind.includes('kitchen') || kind.includes('pantry')) { /* Fixed cabinetry is built separately. */ }
  else if(kind.includes('bath')) bathroom(group,b,materials,room);
  else if(kind.includes('dressing')) {
    box(group,[.6,2.3,b.d-.25],[b.x0+.38,1.15,b.z],materials.white);
    for(let i=0;i<3;i++)box(group,[.018,2.05,.55],[b.x0+.69,1.18,b.z0+.45+i*.65],materials.taupe);
  }
  return group;
}

// Photo-led fixed fittings. Position remains provisional until room/photo mapping is confirmed.
function panelRun(parent,x,z,width,height,m,rotation=0,material=m.white) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);
  box(g,[width,height,.045],[0,height/2,0],material);
  const n=Math.max(2,Math.round(width/.6));
  for(let i=1;i<n;i++)box(g,[.012,height-.12,.009],[-width/2+i*width/n,height/2,.03],m.taupe);
  return g;
}
function curtain(parent,x,z,span,m,rotation=0) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);
  // Short edge pelmets preserve the open view into a cutaway room.
  for(const side of [-1,1])box(g,[.52,.1,.18],[side*(span/2-.27),2.53,0],m.trim);
  for(const side of [-1,1])for(let i=0;i<6;i++) {
    const fold=cylinder(g,.042,2.3,[side*(span/2-.1-i*.065),1.28,Math.sin(i*2)*.02],m.curtain);fold.scale.z*=.65;
  }
}
export function createBuiltins(room,m) {
  const g=new THREE.Group();g.name=`builtins:${room.id}`;const b=furnishingBounds(room),kind=room.kind;
  if(kind==='living'){
    if(room.id.includes('g01')){
      const z=b.z+.15,run=Math.min(3.8,b.d-.35);
      box(g,[.36,.39,run],[b.x1-.25,.225,z],m.cabinet);
      for(let i=0;i<18;i++)box(g,[.018,.34,.027],[b.x1-.445,.225,z-run/2+.12+i*(run-.24)/18],m.trim);
      box(g,[.44,.055,run+.02],[b.x1-.26,.45,z],m.marble);
      box(g,[.045,.91,1.68],[b.x1-.3,1.12,z],m.black);
      box(g,[.013,.79,1.54],[b.x1-.328,1.12,z],m.screen);
      panelRun(g,b.x1-.1,z,run,2.55,m,Math.PI/2,m.cabinet);
      for(const dz of [-run*.4,run*.4])box(g,[.025,2.3,.026],[b.x1-.13,1.32,z+dz],m.brass);
      curtain(g,b.x,b.z1-.13,b.w-.25,m);
      // Open mirrored display divider behind the sofa, as seen from the dining side.
      const divider=new THREE.Group();divider.position.set(b.x0+.12,0,b.z0+.8);divider.rotation.y=Math.PI/2;g.add(divider);
      for(const xx of [-.6,0,.6])box(divider,[.07,2.48,.3],[xx,1.24,0],m.cabinet);
      for(const yy of [.38,1.03,1.68,2.35])box(divider,[1.28,.055,.3],[0,yy,0],m.cabinet);
      for(const xx of [-.3,.3])for(const yy of [.68,1.35,2.02])box(divider,[.52,.57,.025],[xx,yy,-.13],m.mirror);
    }else{
      panelRun(g,b.x,b.z0+.11,b.w-.2,2.5,m,0,m.white);curtain(g,b.x,b.z1-.14,b.w-.35,m);
    }
  }else if(kind==='dining'){
    // Pantry and dining are continuous: no display wall across their shared boundary.
    curtain(g,b.x,b.z1-.13,b.w-.3,m);
  }else if(kind==='kitchen'){
    if(room.id==='f1-g04-prep'){
      // Short west-wall prep run keeps carport→prep→dining and the kitchen opening clear.
      const counter=new THREE.Group();counter.name='prep-counter';g.add(counter);
      box(counter,[.46,.81,1.35],[b.x0+.32,.42,b.z0+.85],m.cabinet);
      box(counter,[.51,.045,1.39],[b.x0+.32,.85,b.z0+.85],m.marble);
      for(const dz of [-.43,0,.43])box(counter,[.026,.02,.18],[b.x0+.56,.73,b.z0+.85+dz],m.metal);
      return g;
    }
    kitchen(g,b,m);
    // Grey glossy upper cupboards, white quartz island and mirrored splashback.
    const run=b.w-.26,n=Math.max(2,Math.floor(run/.52));
    box(g,[run,.78,.34],[b.x,2.24,b.z0+.29],m.cabinet);
    for(let i=0;i<=n;i++)box(g,[.016,.74,.019],[b.x0+.13+i*run/n,2.24,b.z0+.47],m.trim);
    box(g,[run,.52,.027],[b.x,1.53,b.z0+.14],m.mirror);
    box(g,[run,.018,.08],[b.x,1.84,b.z0+.48],m.led);
    if(b.w>3){
      box(g,[.65,2.45,.64],[b.x0+.46,1.23,b.z0+.55],m.cabinet);
      box(g,[.59,1.51,.03],[b.x0+.46,1.56,b.z0+.9],m.metal);
      box(g,[.018,.6,.035],[b.x0+.69,1.57,b.z0+.93],m.frame);
      box(g,[.42,.3,.33],[b.x1-.48,1.07,b.z0+.5],m.black);
      box(g,[.33,.2,.025],[b.x1-.48,1.1,b.z0+.68],m.glass);
    }
  }else if(kind==='bedroom'){
    if(room.id==='f2-201-bedroom'){
      const z=b.z1-1.78,run=3.2;
      panelRun(g,b.x0+.13,z,run,2.6,m,Math.PI/2,m.white);
      box(g,[.08,.035,run],[b.x0+.2,2.58,z],m.led);
      box(g,[.48,.16,3.25],[b.x1-.33,.75,z],m.white);
      box(g,[.49,.035,3.25],[b.x1-.33,.85,z],m.marble);
      box(g,[.045,.81,1.5],[b.x1-.16,1.4,z],m.black);
      box(g,[.015,.69,1.38],[b.x1-.19,1.4,z],m.screen);
      curtain(g,b.x,b.z1-.13,b.w-.35,m);
    }else if(room.id==='f2-202-bedroom'){
      // Original plan: wardrobe in the entrance recess, TV opposite the west-facing headboard.
      const rb=roomBounds(room);
      box(g,[.58,2.35,1.55],[rb.x1-.38,1.2,rb.z0+.86],m.timber);
      for(const dz of [-.5,0,.5])box(g,[.02,2.23,.025],[rb.x1-.68,1.2,rb.z0+.86+dz],m.trim);
      box(g,[.38,.48,1.48],[b.x1-.3,.25,b.z1-1.57],m.timber);
      box(g,[.06,.72,1.17],[b.x1-.18,1.14,b.z1-1.57],m.black);
      curtain(g,b.x,b.z1-.12,b.w-.45,m);
    }else if(room.id==='f2-203-bedroom'){
      box(g,[.58,2.35,1.78],[b.x1-.39,1.2,b.z0+1.02],m.timber);
      for(const dz of [-.55,0,.55])box(g,[.02,2.2,.025],[b.x1-.69,1.2,b.z0+1.02+dz],m.trim);
      box(g,[.46,.065,1.15],[b.x0+.35,.76,b.z0+2.1],m.timber);
      for(const dz of [-.46,.46])box(g,[.39,.71,.055],[b.x0+.35,.36,b.z0+2.1+dz],m.timber);
      box(g,[1.4,.48,.32],[b.x0+1.72,.25,b.z1-.28],m.timber);
      box(g,[1.15,.68,.055],[b.x0+1.72,1.06,b.z1-.15],m.black);
      curtain(g,b.x0+3.7,b.z0+.12,1.5,m);
    }
  }else if(kind==='lounge'){
    const z=b.z1-1.55,run=Math.min(2.7,b.d-1);
    panelRun(g,b.x1-.12,z,run,2.6,m,Math.PI/2,m.cabinet);
    const desk=new THREE.Group();desk.name='computer-desk';g.add(desk);
    box(desk,[.61,.14,run],[b.x0+.4,.76,z],m.white);
    box(desk,[.64,.05,run],[b.x0+.4,.85,z],m.marble);
    for(const dz of [-.45,.4]){
      box(desk,[.035,.44,.67],[b.x0+.28,1.17,z+dz],m.black);
      box(desk,[.012,.36,.59],[b.x0+.304,1.17,z+dz],m.screen);
      box(desk,[.06,.14,.08],[b.x0+.29,.91,z+dz],m.frame);
      box(desk,[.19,.025,.3],[b.x0+.3,.865,z+dz],m.frame);
    }
    curtain(g,b.x,b.z1-.13,b.w-.3,m);
  }else if(room.id.includes('dressing')){
    // The west wall contains the bathroom door; only the rear end carries storage.
    box(g,[b.w-.24,2.45,.55],[b.x,1.25,b.z0+.36],m.white);
    box(g,[.55,2.45,1.05],[b.x0+.36,1.25,b.z0+1.04],m.cabinet);
    box(g,[.55,2.45,1.65],[b.x1-.36,1.25,b.z0+1.34],m.cabinet);
    for(let i=0;i<3;i++)box(g,[(b.w-.3)/3-.025,2.3,.025],[b.x0+.15+(i+.5)*(b.w-.3)/3,1.25,b.z0+.65],i%2?m.cabinet:m.mirror);
  }
  return g;
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
  [boxGeometry,softGeometry,cylinderGeometry,sphereGeometry,tubRimGeometry].forEach(g=>g.dispose());
}
