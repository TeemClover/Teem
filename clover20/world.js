import * as T from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { createCloverParticles } from './clover-particles.js';

const GOLD=0xd9b678, GREEN=0x6f8656, DARK=0x15231c, CREAM=0xe6dfc4;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const V=(x,y,z)=>new T.Vector3(x,y,z);
const box=(w,h,d,r=.08)=>new RoundedBoxGeometry(w,h,d,2,r);
const metal=(color=GOLD,roughness=.28)=>new T.MeshStandardMaterial({color,metalness:.8,roughness});
const matte=(color=DARK)=>new T.MeshStandardMaterial({color,roughness:.76,metalness:.12});
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}

export async function createWorld(container) {
  const renderer=new T.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x111a16,1);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  container.appendChild(renderer.domElement);
  const scene=new T.Scene();
  scene.fog=new T.FogExp2(0x111a16,.021);
  const camera=new T.PerspectiveCamera(39,1,.1,200);
  const pmrem=new T.PMREMGenerator(renderer);
  const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.025, .1, 100);
  scene.environment=environment.texture;
  room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xf1e1b6,0x15261d,2.4));
  const key=new T.DirectionalLight(0xffd89b,4.3);key.position.set(-4,8,5);scene.add(key);
  const rim=new T.DirectionalLight(0x92b993,3.5);rim.position.set(5,4,-4);scene.add(rim);
  const warm=new T.PointLight(0xefbd6b,65,25,2);warm.position.set(2,3,3);scene.add(warm);

  const loader=new T.TextureLoader(),textureCache=new Map();
  let photoPhase=0;
  const photoInfo=await fetch('./assets/photos/manifest.json').then(r=>r.json());
  const info=new Map(photoInfo.map(p=>[p.id,p]));
  // Load the opening first; remaining photographs arrive without blocking entry.
  function texture(id){
    if(textureCache.has(id))return textureCache.get(id);
    const p=info.get(id);
    const tx=loader.load(p.src,()=>{tx.needsUpdate=true;});
    tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    textureCache.set(id,tx);return tx;
  }
  function photo(id,width=3,parent,x=0,y=0,z=0,rotation=0){
    const p=info.get(id),height=width*p.height/p.width;
    const frame=new T.Group();frame.position.set(x,y,z);frame.rotation.y=rotation;
    mesh(box(width+.09,height+.09,.065,.035),metal(GOLD,.4),frame,0,0,-.045);
    mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture(id),toneMapped:false,fog:false}),frame,0,0,.005);
    parent.add(frame);
    frame.userData.base=frame.position.clone();frame.userData.phase=++photoPhase*1.5;
    return frame;
  }
  function gradientTexture(inner='rgba(219,181,108,.22)',outer='rgba(219,181,108,0)'){
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(1,outer);
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return tx;
  }
  const glowTexture=gradientTexture();
  const shadowTexture=gradientTexture('rgba(0,0,0,.62)','rgba(0,0,0,0)');
  function floor(parent,r=4){
    const m=mesh(new T.PlaneGeometry(r*3,r*3),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}),parent,0,-1.2,0);m.rotation.x=-Math.PI/2;
  }
  function glow(parent,scale=8,x=0,y=0,z=-2){
    return mesh(new T.PlaneGeometry(scale,scale),new T.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending}),parent,x,y,z);
  }
  function chair(parent,x,z,rotation=Math.atan2(-x,-z),scale=1){
    const g=new T.Group();g.position.set(x,-1,z);g.rotation.y=rotation;g.scale.setScalar(scale);parent.add(g);
    const upholstery=matte(0x41523c),brass=metal(0xa18c57,.45);
    mesh(box(.72,.14,.72,.1),upholstery,g,0,.65,0);
    const back=mesh(box(.75,.65,.14,.12),upholstery,g,0,1.02,-.31);back.rotation.x=-.09;
    for(const a of [-1,1])for(const b of [-1,1])mesh(new T.CylinderGeometry(.026,.022,.66,5),brass,g,a*.28,.3,b*.27);
    return g;
  }
  function cup(parent,x,z){
    const porcelain=new T.MeshStandardMaterial({color:0xe9e3d1,roughness:.25,metalness:.1});
    mesh(new T.CylinderGeometry(.14,.11,.23,20),porcelain,parent,x,.25,z);
    mesh(new T.CylinderGeometry(.122,.122,.008,20),matte(0x30271b),parent,x,.37,z);
    const handle=mesh(new T.TorusGeometry(.09,.023,6,20),porcelain,parent,x+.14,.26,z);handle.rotation.y=Math.PI/2;
    mesh(new T.CylinderGeometry(.22,.22,.025,24),porcelain,parent,x,.14,z);
  }
  function table(parent,withChairs=true){
    const group=new T.Group();parent.add(group);
    const wood=new T.MeshStandardMaterial({color:0x684e33,metalness:.22,roughness:.4});
    mesh(new T.CylinderGeometry(1.45,1.45,.14,64),wood,group,0,.04,0);
    const lip=mesh(new T.TorusGeometry(1.44,.024,8,64),metal(),group,0,.11,0);lip.rotation.x=Math.PI/2;
    mesh(new T.CylinderGeometry(.18,.38,.94,24),metal(0x9c8d61,.35),group,0,-.48,0);
    mesh(new T.CylinderGeometry(.75,.8,.07,48),metal(0x76694a,.4),group,0,-.98,0);
    cup(group,-.65,.1);cup(group,.65,-.3);cup(group,.15,.7);
    const book=mesh(box(.58,.06,.76,.025),matte(0x87905f),group,.25,.15,-.45);book.rotation.y=.28;
    if(withChairs){chair(group,-1.8,.45);chair(group,1.55,.85);chair(group,.1,-1.9);}
    return group;
  }
  const groups=[];
  function register(g){
    scene.add(g);g.userData.materials=[];const seen=new Set();
    g.traverse(o=>{if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(!seen.has(m)){seen.add(m);m.userData.baseOpacity=m.opacity;m.userData.baseTransparent=m.transparent;m.userData.baseDepth=m.depthWrite;g.userData.materials.push(m);}}});
    groups.push(g);return g;
  }

  // 00 — Scattered light finds four leaves, then carries its warmth onward.
  const opening=new T.Group(),clover=createCloverParticles(innerWidth<=900?3800:6200);
  opening.add(clover.points);clover.points.scale.setScalar(1.12);
  glow(opening,9,0,.6,-2);
  let introBornAt;
  opening.userData.animate=(t,local)=>{
    if(introBornAt===undefined&&t>0)introBornAt=t;
    clover.points.rotation.y=Math.sin(t*.12)*.09;
    clover.update({time:t,assembly:clamp((t-(introBornAt??t))/3.2)*1.2,departure:ease(.58,1,local),height,dpr});
  };
  register(opening);

  // 01 — One round table, three chairs, one small possibility.
  const firstTable=new T.Group();table(firstTable);floor(firstTable);glow(firstTable,9,0,1,-2);
  const conversation=photo('table',3.5,firstTable,0,2.05,-.65,-.06);
  const hands=photo('hands',1.65,firstTable,2.4,.9,.1,-.3);
  firstTable.userData.animate=t=>{floatPhoto(conversation,t);floatPhoto(hands,t);};register(firstTable);

  // 02 — The room grows around the same table.
  const meeting=new T.Group();
  for(let i=0;i<3;i++){
    const small=table(meeting);small.scale.setScalar(.53);small.position.set((i-1)*2.45,-.35,i===1?-.3:1.2);
  }
  const m1=photo('meeting',4.2,meeting,0,2,-1,.02);
  const m2=photo('stage',2.2,meeting,-2.6,.8,.2,.3);
  const m3=photo('together',1.8,meeting,2.8,.7,.6,-.3);
  floor(meeting,5);glow(meeting,11);meeting.userData.animate=t=>[m1,m2,m3].forEach(p=>floatPhoto(p,t));register(meeting);

  // 03 — A quiet desk and a page which turns with your scroll.
  const learning=new T.Group();
  mesh(new T.CylinderGeometry(3,3,.1,64),new T.MeshStandardMaterial({color:0x5a4d32,roughness:.53,metalness:.3}),learning,0,-.65,0);
  const bookGroup=new T.Group();learning.add(bookGroup);bookGroup.position.set(.45,-.38,.45);bookGroup.rotation.y=-.16;
  mesh(box(3.5,.08,2.4,.03),matte(0x74825a),bookGroup,0,0,0);
  mesh(box(1.6,.25,2.27,.02),matte(CREAM),bookGroup,-.83,.16,0);
  mesh(box(1.6,.25,2.27,.02),matte(CREAM),bookGroup,.83,.16,0);
  for(let i=0;i<8;i++)mesh(new T.BoxGeometry(3.3,.008,2.28),matte(0x9e987c),bookGroup,0,.05+i*.03,0);
  const pagePivot=new T.Group();pagePivot.position.set(0,.32,0);bookGroup.add(pagePivot);
  mesh(new T.BoxGeometry(1.59,.012,2.25),matte(0xf2ecd4),pagePivot,.795,0,0);
  for(let i=0;i<9;i++)mesh(new T.PlaneGeometry(1.1,.013),matte(0xa39e83),pagePivot,.795,.009,-.8+i*.16).rotation.x=-Math.PI/2;
  const lamp=new T.Group();lamp.position.set(-2.3,-.6,-1.2);learning.add(lamp);
  mesh(new T.CylinderGeometry(.37,.4,.08,24),metal(),lamp,0,0,0);
  mesh(new T.CylinderGeometry(.035,.035,2.3,12),metal(),lamp,0,1.15,0);
  mesh(new T.ConeGeometry(.5,.4,32,1,true),metal(),lamp,.1,2.15,0);
  const lampLight=new T.PointLight(0xffd18e,10,6);lampLight.position.set(.1,1.9,0);lamp.add(lampLight);
  const learnPhoto=photo('book',2.1,learning,1.5,2.6,-1.5,-.2);
  floor(learning);glow(learning,7,-1,1);
  learning.userData.animate=(t,local)=>{pagePivot.rotation.z=mix(.025,Math.PI-.025,ease(.05,.9,local));floatPhoto(learnPhoto,t);};register(learning);

  // 04 — Ten thousand seats, batched into a handful of draw calls.
  const hall=new T.Group(),seatsGroup=new T.Group();hall.add(seatsGroup);
  const count=10000,chairGeo=new T.BoxGeometry(.23,.33,.08),seatGeo=new T.BoxGeometry(.23,.055,.23);
  const hallMaterial=new T.MeshStandardMaterial({color:0x5d6a4a,metalness:.25,roughness:.52});
  const seats=new T.InstancedMesh(seatGeo,hallMaterial,count),backs=new T.InstancedMesh(chairGeo,hallMaterial,count);
  const dummy=new T.Object3D(),orders=new Float32Array(count),headGeo=new T.IcosahedronGeometry(.065,0);
  const peopleMaterial=new T.MeshStandardMaterial({color:0xd9b678,roughness:.6,metalness:.2});
  const people=new T.InstancedMesh(headGeo,peopleMaterial,count);
  for(let row=0;row<100;row++)for(let col=0;col<100;col++){
    const i=row*100+col,x=(col-49.5)*.34+(col<50?-.45:.45),z=(row-49.5)*.42;
    dummy.position.set(x,.14,z);dummy.updateMatrix();seats.setMatrixAt(i,dummy.matrix);
    dummy.position.y=.3;dummy.position.z=z+.1;dummy.updateMatrix();backs.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x,.58,z-.01);dummy.updateMatrix();people.setMatrixAt(i,dummy.matrix);
    orders[i]=(99-row)/100;
  }
  const fill={value:0};
  for(const g of [chairGeo,seatGeo,headGeo])g.setAttribute('aOrder',new T.InstancedBufferAttribute(orders,1));
  hallMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uFill=fill;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aOrder; varying float vOrder;').replace('#include <begin_vertex>','#include <begin_vertex>\nvOrder=aOrder;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uFill; varying float vOrder;').replace('#include <color_fragment>','#include <color_fragment>\nfloat filled=smoothstep(vOrder,vOrder+0.08,uFill); diffuseColor.rgb=mix(vec3(0.025,0.045,0.032),vec3(0.43,0.27,0.11),filled);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.12,.07,.025)*filled;');
  };
  peopleMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uFill=fill;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aOrder; uniform float uFill;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed*=smoothstep(aOrder,aOrder+0.08,uFill);');
  };
  seatsGroup.add(seats,backs,people);seatsGroup.position.y=-1.3;seatsGroup.rotation.y=-.08;
  mesh(new T.BoxGeometry(22,.4,3),matte(0x667053),hall,0,-1.2,-24);
  const trussMat=new T.LineBasicMaterial({color:0xbda56c,transparent:true,opacity:.28});
  const trussPoints=[];
  for(let z=-22;z<23;z+=6){for(let x=-19;x<19;x+=3){trussPoints.push(V(x,7,z),V(x+3,7,z),V(x,7,z),V(x+1.5,8,z),V(x+1.5,8,z),V(x+3,7,z));}}
  const trussGeo=new T.BufferGeometry().setFromPoints(trussPoints);hall.add(new T.LineSegments(trussGeo,trussMat));
  const hallPhoto=photo('hall',11,hall,0,3.8,-18,0);
  const crowdPhoto=photo('crowd',5.6,hall,9,3,-12,-.35);
  glow(hall,25,0,5,-25);
  hall.userData.animate=(t,local)=>{fill.value=ease(.04,.7,local)*1.12;hallPhoto.position.y=3.8+ease(.45,.9,local)*1.4;crowdPhoto.position.y=3+Math.sin(t*.2)*.08;};register(hall);

  // 05 — A brass airplane window opens onto a shared journey.
  const travel=new T.Group();
  function roundedRect(s,x,y,w,h,r){s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);}
  const windowShape=new T.Shape();roundedRect(windowShape,-1.7,-2,3.4,4.7,1.2);
  const windowHole=new T.Path();roundedRect(windowHole,-1.44,-1.74,2.88,4.18,1);windowShape.holes.push(windowHole);
  const windowMesh=mesh(new T.ExtrudeGeometry(windowShape,{depth:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.05,bevelThickness:.05}),metal(0xc2ab7f,.3),travel,.1,.1,0);windowMesh.rotation.y=-.14;
  const trip=photo('travel',3.5,travel,.05,.85,.4,.02);
  const bridge=photo('bridge',2.3,travel,2.4,-.8,1,-.3);
  const party=photo('celebrate',1.8,travel,-2.4,-1,.8,.25);
  const wing=new T.Shape();wing.moveTo(0,0);wing.lineTo(3.5,-.6);wing.lineTo(4.8,-.25);wing.lineTo(.3,.4);wing.closePath();
  const wingMesh=mesh(new T.ExtrudeGeometry(wing,{depth:.035,bevelEnabled:false}),metal(0xc5c8b6,.42),travel,1.3,-1.7,-1);wingMesh.rotation.x=-.7;
  glow(travel,12);travel.userData.animate=t=>[trip,bridge,party].forEach(p=>floatPhoto(p,t));register(travel);

  // 06 — Independent orbits. No hierarchy, no lines tying a life to a network.
  const paths=new T.Group(),orbs=[];
  const orbGeometry=new T.SphereGeometry(.1,12,8),ringGeometry=new T.TorusGeometry(.22,.008,4,32);
  for(let i=0;i<85;i++){
    const o=new T.Group();const color=i%4===0?0xc4cc9b:i%3===0?0x819b65:GOLD;
    mesh(orbGeometry,metal(color,.2),o);
    if(i%6===0){const ring=mesh(ringGeometry,metal(color,.4),o);ring.rotation.x=.5;}
    o.userData={angle:i*2.399963,radius:1.2+Math.sqrt(i/85)*4.5,phase:i*.43};paths.add(o);orbs.push(o);
  }
  const pathPhoto=photo('friends',2.8,paths,0,.45,1.5,-.03);
  const pathCurveMat=new T.LineBasicMaterial({color:GOLD,opacity:.15,transparent:true});
  for(let i=0;i<9;i++){
    const a=i*.698,curve=new T.CatmullRomCurve3([V(Math.cos(a),0,Math.sin(a)),V(Math.cos(a+.3)*2,1,Math.sin(a+.3)*2),V(Math.cos(a+.7)*5,1.8,Math.sin(a+.7)*5),V(Math.cos(a+.9)*8,3,Math.sin(a+.9)*8)]);
    paths.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(40)),pathCurveMat));
  }
  glow(paths,11);paths.userData.animate=(t,local)=>{
    orbs.forEach((o,i)=>{const d=o.userData,a=d.angle+t*.025,r=d.radius*mix(.62,1.28,ease(0,.85,local));o.position.set(Math.cos(a)*r,Math.sin(a*1.3)*1.8+.7,Math.sin(a)*r*.65);o.scale.setScalar(.7+(i%7)*.13);});floatPhoto(pathPhoto,t);
  };register(paths);

  // 07 — Back to the same table, carrying new stories.
  const home=new T.Group();table(home);floor(home);glow(home,13,0,1,-3);
  const arch=mesh(new T.TorusGeometry(3,.055,8,100),metal(GOLD,.3),home,0,1,-1.2);arch.rotation.y=-.15;
  const homePhotos=[photo('home',2.8,home,0,2.6,-.8,-.05),photo('together',1.6,home,-2.5,.7,.1,.3),photo('travel',1.5,home,2.4,.6,.2,-.3)];
  const homeOrbs=[];for(let i=0;i<20;i++){const o=mesh(new T.SphereGeometry(.075,10,6),metal(i%2?GOLD:GREEN),home);homeOrbs.push(o);}
  home.userData.animate=(t,local)=>{homePhotos.forEach(p=>floatPhoto(p,t));homeOrbs.forEach((o,i)=>{const a=i*Math.PI/10+t*.07,r=3.2-.3*ease(0,1,local);o.position.set(Math.cos(a)*r,1+Math.sin(a)*r*.72,Math.sin(a)*.3);});};register(home);

  function floatPhoto(p,t=clockTime){p.position.y=p.userData.base.y+Math.sin(t*.5+p.userData.phase)*.055;}
  // A sparse, warm field catches light as the camera moves.
  const dustPositions=new Float32Array(240*3);
  let seed=42;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<240;i++){dustPositions[i*3]=(rand()-.5)*35;dustPositions[i*3+1]=(rand()-.5)*22;dustPositions[i*3+2]=(rand()-.5)*30;}
  const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(dustPositions,3));
  const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xb8aa75,size:.025,transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true}));scene.add(dust);

  const desktopCamera=[
    {p:[-.7,3.5,13.5],t:[0,.5,0]}, {p:[1.7,3.7,12],t:[0,.5,0]},
    {p:[1.1,4.1,14],t:[0,.5,0]}, {p:[1.4,4.8,11.5],t:[0,.4,0]},
    {p:[6,12,24],t:[0,0,-9]}, {p:[1.1,2.3,12.5],t:[0,.4,0]},
    {p:[1,3.5,15],t:[0,.7,0]}, {p:[1.2,3.6,12.5],t:[0,.9,0]},
  ];
  const mobileCamera=[
    {p:[0,2.4,14],t:[0,1.6,0]}, {p:[1,3.5,12.5],t:[0,1.8,0]},
    {p:[.7,4,15.5],t:[0,2.2,0]}, {p:[.7,4.8,12.5],t:[0,2,0]},
    {p:[3,15,30],t:[0,5,-8]}, {p:[.3,2.7,13.5],t:[0,1.8,0]},
    {p:[0,3,16],t:[0,2.1,0]}, {p:[.4,3.2,13],t:[0,2.1,0]},
  ];
  const pointer=new T.Vector2(),pointerTarget=new T.Vector2();
  let small=innerWidth<=900,width=innerWidth,height=innerHeight,clockTime=0,currentProgress=0,currentLocal=0;
  let dpr=Math.min(devicePixelRatio,small?1.5:1.75);
  const eye=new T.Vector3(),aim=new T.Vector3();
  function resize(){
    small=innerWidth<=900;width=innerWidth;height=innerHeight;
    renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  resize();
  container.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pointerTarget.set((e.clientX/width-.5)*2,(e.clientY/height-.5)*2);});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('clover-context-lost'));});
  function opacity(g,weight){
    if(Math.abs((g.userData.weight??-1)-weight)<.001)return;
    g.userData.weight=weight;
    g.userData.materials.forEach(m=>{
      m.opacity=m.userData.baseOpacity*weight;
      if(m.uniforms?.uOpacity)m.uniforms.uOpacity.value=m.opacity;
      m.transparent=m.userData.baseTransparent||weight<.99;
      m.depthWrite=m.userData.baseDepth&&weight>.95;
    });
  }
  let lastTime=0,slowFrames=0,frames=0;
  function update(progress,local,t){
    clockTime=t;currentProgress=progress;currentLocal=local;
    pointer.lerp(pointerTarget,.035);
    const a=Math.floor(progress),b=Math.min(7,a+1),f=progress-a,cameras=small?mobileCamera:desktopCamera;
    eye.fromArray(cameras[a].p).lerp(V(...cameras[b].p),f);
    aim.fromArray(cameras[a].t).lerp(V(...cameras[b].t),f);
    if(a===4){
      const push=ease(.08,.74,local)*(1-f);
      eye.z-=push*(small?12:10);eye.y-=push*(small?3:3.5);eye.x-=push*2;
      aim.z-=push*4;
    }else{
      eye.z-=ease(.05,.7,local)*.7*(1-f);
      eye.x+=Math.sin(local*Math.PI)*.2*(1-f);
    }
    const sceneOffset=small?0:width/height>1.3?3.1:2.1;
    eye.x+=pointer.x*.16;
    camera.position.copy(eye);camera.lookAt(aim);
    for(let i=0;i<groups.length;i++){
      const g=groups[i],distance=Math.abs(progress-i),weight=1-ease(.02,.98,distance);
      g.visible=weight>.005;if(!g.visible)continue;
      const scale=i===4?1:small?(width>600?.92:.69):width<1200?.9:1;
      g.scale.setScalar(scale*(.93+.07*weight));
      // On a phone the scene sits below the text; the hall keeps its true width.
      g.position.set(sceneOffset+(i-progress)*3,small?(i===4?-7.5:-1.5):0,0);
      opacity(g,weight);g.userData.animate?.(t,i===a?local:0);
    }
    dust.rotation.y=t*.006;dust.rotation.z=Math.sin(t*.03)*.04;
    warm.intensity=progress>3.5&&progress<4.5?90:65;
    renderer.render(scene,camera);
    // Lower only the render resolution when sustained work exceeds a mobile frame.
    if(lastTime&&t-lastTime>.035&&t-lastTime<.2)slowFrames++;
    lastTime=t;frames++;
    if(frames===150&&slowFrames>85&&dpr>1){dpr=1;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}
  }
  update(0,0,0);
  // A public diagnostic contains no visitor data and is useful for visual QA.
  return {update,resize,pause:()=>{},get stats(){return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,progress:currentProgress,local:currentLocal,dpr};}};
}
