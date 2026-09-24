import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assemblyBands, carportFrame } from './scene/assembly.js';
import { solarModuleLayout } from './scene/solar-layout.js';
import { createMaterials } from './scene/materials.js';
import { createStairHall, stairHallPresentation, sliceStairGroup } from './scene/stair-hall.js';
import { wallIsLowered } from './scene/wall-visibility.js';
import { createModelHouse, furnishingRoom } from './scene/model-house.js';
import { createShowerDetail } from './scene/shower-detail.js';
import { box, cylinder, createFurniture, createBuiltins, createTree, roomBounds } from './scene/furniture.js';

const DEFAULT_STATE = {view:'whole',selectedRoomId:null,wallMode:'auto',furniture:true,builtins:true,grid:true,isolate:true,labels:true,ceiling:false,reducedMotion:false,quality:'balanced',renderMode:'sd'};
const EXPLODED_GAP = 6.2; // Presentation distance only; source floor elevations remain unchanged.
const UP = new THREE.Vector3(0,1,0);
const STAIR_PARTS = ['stairs','stairsLower','landing','chandelier','chandelierUpper','canopy'];

function shapeFromPolygon(polygon) {
  const shape=new THREE.Shape();
  polygon.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
  shape.closePath();return shape;
}

function polygonMesh(polygon,material,thickness=0) {
  const geometry=thickness
    ?new THREE.ExtrudeGeometry(shapeFromPolygon(polygon),{depth:thickness,bevelEnabled:false})
    :new THREE.ShapeGeometry(shapeFromPolygon(polygon));
  geometry.rotateX(-Math.PI/2);
  if(thickness)geometry.translate(0,-thickness,0);
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=Boolean(thickness);
  return mesh;
}

function polygonCentroid(polygon) {
  let a=0,x=0,z=0;
  for(let i=0;i<polygon.length;i++) {
    const p=polygon[i],q=polygon[(i+1)%polygon.length],cross=p[0]*q[1]-q[0]*p[1];
    a+=cross;x+=(p[0]+q[0])*cross;z+=(p[1]+q[1])*cross;
  }
  return Math.abs(a)>.0001?[x/(3*a),z/(3*a)]:polygon[0];
}

function roomFloorId(room) { return room.floor || room.floorId; }
function roomCameraYaw(room) { return room?.floor==='f2'&&room.kind!=='lounge'?.65:-.65; }
function floorHeight(house,id) { return house.floors?.find(f=>f.id===id)?.elevation ?? (id==='f2'?3.29:0); }
function point(p) { return Array.isArray(p)?p:[p.x,p.z]; }
function ease(t) { return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }

// Static detail meshes share a draw call per material while semantic room/floor groups remain separate.
function consolidate(group) {
  group.updateMatrixWorld(true);
  const inverse=group.matrixWorld.clone().invert(),byMaterial=new Map(),toRemove=[];
  group.traverse(obj=>{
    if(!obj.isMesh||Array.isArray(obj.material))return;
    const source=obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry.clone();
    source.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,obj.matrixWorld));
    const key=obj.material.uuid;
    if(!byMaterial.has(key))byMaterial.set(key,{material:obj.material,geometries:[]});
    byMaterial.get(key).geometries.push(source);toRemove.push(obj);
  });
  toRemove.forEach(obj=>obj.removeFromParent());
  for(const {material,geometries} of byMaterial.values()) {
    const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(!geometry)continue;
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;group.add(mesh);
  }
}

function makeWall(wall,materials,defaults,rooms=[]) {
  const a=point(wall.a),b=point(wall.b),dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  if(length<.02)return null;
  const group=new THREE.Group();group.position.set(a[0],0,a[1]);group.rotation.y=-Math.atan2(dz,dx);
  const full=new THREE.Group(),low=new THREE.Group();group.add(full,low);low.visible=false;
  const height=wall.height||defaults.wallHeight,thickness=wall.thickness||(wall.exterior?defaults.exteriorWallThickness:defaults.interiorWallThickness);
  const openings=(wall.openings||[]).map(o=>({
    ...o,offset:Math.max(0,Number(o.offset||0)),width:Number(o.width||.85),
    height:Number(o.height||(o.kind==='door'?2.18:1.7)),sill:Number(o.sill??(o.kind==='door'?0:.6))
  })).filter(o=>o.offset<length).sort((a,b)=>a.offset-b.offset);
  const cuts=[0,length,...openings.flatMap(o=>[o.offset,Math.min(length,o.offset+o.width)])].sort((a,b)=>a-b);
  const addPart=(parent,x0,x1,y0,y1)=>{
    if(x1-x0<.005||y1-y0<.005)return;
    box(parent,[x1-x0,y1-y0,thickness],[(x0+x1)/2,(y0+y1)/2,0],materials.wall);
    if(y0===0)box(parent,[x1-x0,.085,thickness+.018],[(x0+x1)/2,.045,0],materials.trim);
    box(parent,[x1-x0,.018,thickness+.006],[(x0+x1)/2,y1+.009,0],materials.trim);
  };
  for(let i=1;i<cuts.length;i++) {
    const x0=cuts[i-1],x1=cuts[i],mid=(x0+x1)/2;
    const o=openings.find(o=>mid>o.offset-.001&&mid<o.offset+o.width+.001);
    const ranges=o?[[0,o.sill],[o.sill+o.height,height]]:[[0,height]];
    for(const [y0,y1] of ranges) {
      addPart(full,x0,x1,y0,Math.min(y1,height));
      addPart(low,x0,x1,y0,Math.min(y1,defaults.cutawayHeight));
    }
  }
  for(const o of openings) {
    const x=o.offset+o.width/2,w=Math.min(o.width,length-o.offset),h=Math.min(o.height,height-o.sill),y=o.sill+h/2;
    const frameMat=materials.frame,frame=.055;
    if(o.kind==='open-passage')continue;
    box(full,[w+frame*2,frame,thickness+.035],[x,o.sill+h,0],frameMat);
    box(full,[frame,h,thickness+.035],[x-w/2,y,0],frameMat);
    box(full,[frame,h,thickness+.035],[x+w/2,y,0],frameMat);
    if(o.kind==='door'&&w<1.3) {
      // Open leaves keep actual wall openings legible from the interior.
      const hingeEnd=o.hingeSide==='end',leafSign=hingeEnd?-1:1;
      const target=rooms.find(r=>r.id===o.swingInto);
      const targetCenter=target?polygonCentroid(target.polygon):null;
      const localSide=targetCenter?Math.sign((-dz*(targetCenter[0]-a[0])+dx*(targetCenter[1]-a[1]))/length):1;
      const leaf=new THREE.Group();leaf.position.set(x+(hingeEnd?1:-1)*w/2,o.sill,0);leaf.rotation.y=-leafSign*(localSide||1)*1.12;full.add(leaf);
      box(leaf,[w-.08,h-.07,.045],[leafSign*(w-.08)/2,h/2,0],materials.taupe);
      box(leaf,[.07,.04,.1],[leafSign*(w-.2),h*.48,.04],materials.brass);
      box(low,[w,.025,thickness*1.7],[x,.015,0],materials.timber);
    } else {
      const glass=box(full,[w-.08,h-.075,.025],[x,y,0],materials.glass);glass.castShadow=false;
      box(full,[w+frame*2,frame,thickness+.035],[x,o.sill,0],frameMat);
      const panes=Math.max(2,Math.round(w/1.1));
      for(let n=1;n<panes;n++)box(full,[.04,h,.065],[x-w/2+n*w/panes,y,0],frameMat);
      if(h>1.9)box(full,[w,.035,.06],[x,o.sill+h*.77,0],frameMat);
    }
  }
  consolidate(full);consolidate(low);
  group.updateMatrix();
  const prepare=layer=>layer.children.filter(mesh=>mesh.isMesh).map(mesh=>{
    mesh.visible=false;
    return {geometry:mesh.geometry.clone().applyMatrix4(group.matrix),material:mesh.material};
  });
  return {group,full,low,prepared:{full:prepare(full),low:prepare(low)},wall,mid:new THREE.Vector3((a[0]+b[0])/2,0,(a[1]+b[1])/2),normal:new THREE.Vector3(-dz/length,0,dx/length)};
}

function addQuad(parent,vertices,material,uvs=[0,0,1,0,1,1,0,1]) {
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

function addHipRoof(parent,{x0,x1,z0,z1,y,rise},materials,solar=false) {
  const width=x1-x0,depth=z1-z0,inset=Math.min(width,depth)*.44;
  let surfaces;
  if(depth>width) {
    const cx=(x0+x1)/2,ra=z0+inset,rb=z1-inset;
    surfaces=[
      [[x0,y,z0],[x0,y,z1],[cx,y+rise,rb],[cx,y+rise,ra]],
      [[x1,y,z1],[x1,y,z0],[cx,y+rise,ra],[cx,y+rise,rb]],
      [[x1,y,z0],[x0,y,z0],[cx,y+rise,ra],[cx,y+rise,ra]],
      [[x0,y,z1],[x1,y,z1],[cx,y+rise,rb],[cx,y+rise,rb]],
    ];
    box(parent,[.09,.1,Math.max(.1,rb-ra)],[cx,y+rise, (ra+rb)/2],materials.roof);
  } else {
    const cz=(z0+z1)/2,ra=x0+inset,rb=x1-inset;
    surfaces=[
      [[x0,y,z1],[x1,y,z1],[rb,y+rise,cz],[ra,y+rise,cz]],
      [[x1,y,z0],[x0,y,z0],[ra,y+rise,cz],[rb,y+rise,cz]],
      [[x0,y,z0],[x0,y,z1],[ra,y+rise,cz],[ra,y+rise,cz]],
      [[x1,y,z1],[x1,y,z0],[rb,y+rise,cz],[rb,y+rise,cz]],
    ];
    box(parent,[Math.max(.1,rb-ra),.1,.09],[(ra+rb)/2,y+rise,cz],materials.roof);
  }
  surfaces.forEach(v=>addQuad(parent,v,materials.roof));
  box(parent,[width,.17,.12],[(x0+x1)/2,y-.055,z0],materials.trim);
  box(parent,[width,.17,.12],[(x0+x1)/2,y-.055,z1],materials.trim);
  box(parent,[.12,.17,depth],[x0,y-.055,(z0+z1)/2],materials.trim);
  box(parent,[.12,.17,depth],[x1,y-.055,(z0+z1)/2],materials.trim);
  if(solar) {
    for(const module of solarModuleLayout({x0,x1,z0,z1,y,rise}))addQuad(parent,module.corners,materials.solar);
  }
}

function buildStage(scene,materials) {
  const group=new THREE.Group();group.name='presentation-landscape';scene.add(group);
  // A presentation base, deliberately independent from the unmeasured plot boundary.
  box(group,[19.4,.46,16.2],[6.8,-.76,-4.35],materials.stage,true);
  box(group,[19.2,.055,16],[6.8,-.505,-4.35],materials.grass,true);
  box(group,[6.1,.055,6.1],[2.65,-.462,-.15],materials.outdoor);
  box(group,[10.4,.065,1.28],[8.9,-.458,2.2],materials.outdoor);
  // Low path tiles frame the model without suggesting a surveyed boundary or road.
  for(let i=0;i<8;i++)box(group,[.65,.055,.57],[15.06,-.443,-8.8+i*1.1],materials.tile);
  for(let i=0;i<3;i++)box(group,[4.2,.12,.33],[11.85,-.34+i*.12,-.02-i*.32],materials.tile);
  const trees=new THREE.Group();group.add(trees);
  createTree(trees,16,-9.6,3.4,materials);createTree(trees,16.1,-5.9,2.8,materials);
  createTree(trees,-1.8,-8.7,2.2,materials);createTree(trees,13.7,-11.4,2.5,materials);
  for(const [x,z] of [[-1.9,-4.6],[-1.85,-3.3],[16.1,-2.6],[16.2,-1.5],[9.2,2.2]]) {
    cylinder(trees,.37,.24,[x,-.35,z],materials.leaves);
    const bush=new THREE.Mesh(new THREE.SphereGeometry(.5,10,7),materials.leavesLight);bush.position.set(x,-.05,z);bush.scale.y=.65;bush.castShadow=true;trees.add(bush);
  }
  const base=new THREE.Group();
  for(const child of [...group.children])if(child!==trees)base.add(child);
  group.add(base);consolidate(base);consolidate(trees);return {group,trees};
}

// Each storey owns its part of the rear glazing in an isolated stair view.
export function buildStairBackdrop(scene,materials,house,cutawayHeight) {
  const rear=new THREE.Group(),side=new THREE.Group();
  const top=floorHeight(house,'f2')+2.7,x0=5.5,x1=8.5,z=-10.3;
  for(const x of [5.725,8.275])box(rear,[.45,top,.15],[x,top/2,z],materials.wall);
  for(const [y,h] of [[.075,.15],[top-.15,.30]])box(rear,[2.1,h,.15],[7,y,z],materials.wall);
  const glassBottom=.15,glassTop=top-.3;
  box(rear,[2.1,glassTop-glassBottom,.026],[7,(glassBottom+glassTop)/2,z],materials.glass);
  for(const x of [5.95,7,8.05])box(rear,[.038,glassTop-glassBottom,.07],[x,(glassBottom+glassTop)/2,z+.035],materials.frame);
  for(const y of [glassBottom,1.65,3.2,4.7,glassTop])box(rear,[2.14,.038,.07],[7,y,z+.035],materials.frame);
  box(side,[.1,top,2.9],[x0,top/2,-8.85],materials.wall);
  for(const center of [5.70,8.3])for(let i=0;i<5;i++){
    const pleat=cylinder(rear,.045,top-.34,[center+(i-2)*.049,(top-.34)/2+.10,z+.15],materials.curtain);
    pleat.castShadow=false;
  }
  box(rear,[3.15,.055,.10],[(x0+x1)/2,top-.15,z+.15],materials.trim);
  const floor2=floorHeight(house,'f2'),floors={},walls=[];
  const faces=[{source:rear,a:[x0,z],b:[x1,z]},{source:side,a:[x0,z],b:[x0,-7.4]}];
  for(const {source} of faces){const originals=new Set();source.traverse(object=>{if(object.geometry)originals.add(object.geometry);});consolidate(source);originals.forEach(geometry=>geometry.dispose());}
  for(const [floor,min,max] of [['f1',0,floor2],['f2',floor2,top]]){
    const group=new THREE.Group();group.name=`stair-backdrop-${floor}`;floors[floor]=group;
    for(const {source,a,b} of faces){
      const full=sliceStairGroup(source,min,max);
      full.traverse(object=>{if(object.geometry)object.geometry.translate(0,-min,0);});
      const low=sliceStairGroup(full,0,cutawayHeight);low.visible=false;
      group.add(full,low);walls.push({full,low,wall:{a,b}});
    }
    scene.add(group);
  }
  for(const {source} of faces)source.traverse(object=>{if(object.geometry)object.geometry.dispose();});
  return {floors,walls};
}

function buildFacade(floorGroups,house,materials,defaults) {
  const f1=floorGroups.get('f1'),f2=floorGroups.get('f2');
  if(!f1||!f2)return;
  const wholeDetails=new THREE.Group();wholeDetails.name='whole-facade-details';f1.group.add(wholeDetails);
  const details2=new THREE.Group();details2.name='balcony-rails';f2.group.add(details2);
  const structure=new THREE.Group();structure.name='assembled-floor-and-eave-bands';wholeDetails.add(structure);
  for(const {wall,bottom,top,depth} of assemblyBands(house,defaults)) {
    const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz);
    const band=box(structure,[length+.015,top-bottom,depth+.035],[(wall.a[0]+wall.b[0])/2,floorHeight(house,wall.floor)+(top+bottom)/2,(wall.a[1]+wall.b[1])/2],materials.wall);
    band.rotation.y=-Math.atan2(dz,dx);
  }
  const floor2=floorHeight(house,'f2');
  const carport=carportFrame(house,defaults);
  for(const part of carport.columns)box(wholeDetails,part.size,part.position,materials.taupe);
  for(const part of carport.plinths)box(wholeDetails,part.size,part.position,materials.trim);
  // The plan has shallow front projections: fill beneath them, do not shift floor 2.
  box(wholeDetails,carport.beam.size,carport.beam.position,materials.trim);
  box(wholeDetails,[4.3,floor2-2.7,.66],[7.65,(floor2+2.7)/2,-1.88],materials.wall);
  box(wholeDetails,[4.45,floor2-2.7,.4],[11.975,(floor2+2.7)/2,-1.95],materials.wall);
  // Balcony floors already come from the plan; only add rails on exposed edges.
  for(const id of ['f2-209-balcony','f2-210-balcony']) {
    const room=house.rooms.find(r=>r.id===id),zBack=Math.min(...room.polygon.map(p=>p[1]));
    for(let i=0;i<room.polygon.length;i++) {
      const a=room.polygon[i],b=room.polygon[(i+1)%room.polygon.length];
      if(a[1]===zBack&&b[1]===zBack)continue;
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.3)continue;
      const rail=new THREE.Group();rail.position.set(a[0],room.levelOffset||0,a[1]);rail.rotation.y=-Math.atan2(dz,dx);details2.add(rail);
      box(rail,[length,.82,.026],[length/2,.5,0],materials.glass).castShadow=false;
      box(rail,[length,.045,.055],[length/2,.94,0],materials.frame);
      const n=Math.ceil(length/1.35);
      for(let j=0;j<=n;j++)box(rail,[.04,.94,.04],[j*length/n,.47,0],materials.frame);
    }
  }
  for(const [x,z] of [[-.64,.025],[5.45,.025],[9.75,-1.82],[14.12,-1.82]]) {
    box(wholeDetails,[.16,2.7,.2],[x,floor2+1.35,z],materials.taupe);
  }
  consolidate(wholeDetails);consolidate(details2);return {wholeDetails,details2};
}

export function createHouseScene({container,house:sourceHouse,onSelect=()=>{},onReady=()=>{},onError=()=>{},onLabels=()=>{},onRenderMode=()=>{}}) {
  const house=createModelHouse(sourceHouse);
  const initializationStart=performance.now();
  let renderer;
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  } catch(error) {onError(error);return {setState(){},zoom(){},rotate(){},reset(){},resize(){},dispose(){},getStats(){return {webgl:false};}};}
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;
  renderer.domElement.setAttribute('aria-label','โมเดลบ้าน 3 มิติ หมุนด้วยการลาก ซูมด้วยลูกกลิ้งหรือปุ่มควบคุม');
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none;outline:none;';
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const environmentGenerator=new THREE.PMREMGenerator(renderer),environmentRoom=new RoomEnvironment();
  const environmentTarget=environmentGenerator.fromScene(environmentRoom,.04);scene.environment=environmentTarget.texture;scene.environmentIntensity=.45;environmentRoom.dispose();environmentGenerator.dispose();
  const camera=new THREE.OrthographicCamera(-13,13,13,-13,.1,180);
  camera.position.set(25,22,27);camera.lookAt(6.8,1.8,-4.4);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(6.8,1.8,-4.4);controls.enableDamping=true;controls.dampingFactor=.11;
  controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.465;
  controls.minZoom=.38;controls.maxZoom=12;controls.zoomSpeed=.95;controls.rotateSpeed=.65;
  controls.zoomToCursor=true;
  controls.screenSpacePanning=true;controls.panSpeed=.75;
  const materials=createMaterials();
  const defaults={wallHeight:2.7,slabThickness:.18,exteriorWallThickness:.15,interiorWallThickness:.1,cutawayHeight:.9,...house.assumptions};
  // Only numeric presentation assumptions enter geometry; provenance lives in the data ledger.
  for(const key of Object.keys(defaults))if(typeof defaults[key]==='object')defaults[key]=defaults[key]?.value;
  for(const [key,value] of Object.entries({wallHeight:2.7,slabThickness:.18,exteriorWallThickness:.15,interiorWallThickness:.1,cutawayHeight:.9}))if(!Number.isFinite(defaults[key]))defaults[key]=value;
  const hemisphere=new THREE.HemisphereLight('#e6edf7','#818b96',1.22);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight('#fff5e5',2.7);sun.position.set(-10,22,13);sun.target.position.set(6,0,-4);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-21;sun.shadow.camera.right=21;sun.shadow.camera.top=21;sun.shadow.camera.bottom=-21;
  sun.shadow.camera.near=.5;sun.shadow.camera.far=70;sun.shadow.bias=-.00025;sun.shadow.normalBias=.045;sun.shadow.radius=4;
  const fill=new THREE.DirectionalLight('#dce8ed',.6);fill.position.set(16,12,-12);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({color:'#243142',opacity:.16}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.01;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(42,42,'#8094aa','#b1bdca');grid.position.set(6.8,-1,-4.35);grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
  const stage=buildStage(scene,materials),floorGroups=new Map(),wallRecords=[],roomRecords=new Map(),picks=[];
  for(const id of ['f1','f2']) {
    const group=new THREE.Group();group.name=`floor:${id}`;group.position.y=floorHeight(house,id);scene.add(group);
    const builtins=new THREE.Group(),builtinsBatch=new THREE.Group(),furniture=new THREE.Group(),furnitureBatch=new THREE.Group(),ceilings=new THREE.Group(),surfaces=new THREE.Group(),wallBatch=new THREE.Group();group.add(furniture,furnitureBatch,builtins,builtinsBatch,ceilings,surfaces,wallBatch);
    floorGroups.set(id,{group,furniture,furnitureBatch,builtins,builtinsBatch,ceilings,surfaces,wallBatch,wallMask:'',baseY:group.position.y});
  }
  for(const room of house.rooms||[]) {
    if(!Array.isArray(room.polygon)||room.polygon.length<3)continue;
    const floor=floorGroups.get(roomFloorId(room));if(!floor)continue;
    const kind=(room.kind||'').toLowerCase(),isVoid=kind.includes('void')||(kind.includes('stair')&&roomFloorId(room)==='f2');
    const offset=room.levelOffset??0;
    const roomGroup=new THREE.Group();roomGroup.position.y=offset;floor.group.add(roomGroup);
    const floorMat=kind.includes('outdoor')||kind.includes('carport')||kind.includes('balcony')||kind.includes('terrace')?materials.outdoor:roomFloorId(room)==='f2'&&!kind.includes('bath')?materials.wood:materials.tile;
    const individualSurfaces=[];
    if(!isVoid) {
      const slab=polygonMesh(room.polygon,materials.slab,defaults.slabThickness);roomGroup.add(slab);
      const surface=polygonMesh(room.polygon,floorMat);surface.position.y=.008;roomGroup.add(surface);
      for(const mesh of [slab,surface]) {
        const cloned=mesh.clone();cloned.position.y+=offset;floor.surfaces.add(cloned);mesh.visible=false;individualSurfaces.push(mesh);
      }
    }
    const pick=polygonMesh(room.polygon,materials.invisible);pick.position.y=.035;pick.visible=false;pick.userData.roomId=room.id;roomGroup.add(pick);picks.push(pick);
    const highlight=polygonMesh(room.polygon,materials.selected);highlight.position.y=.048;highlight.visible=false;highlight.renderOrder=3;roomGroup.add(highlight);
    const positions=room.polygon.concat([room.polygon[0]]).map(([x,z])=>new THREE.Vector3(x,.055,z));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(positions),new THREE.LineBasicMaterial({color:'#367dde',transparent:true,opacity:.9}));line.visible=false;line.renderOrder=4;roomGroup.add(line);
    const furnishing=furnishingRoom(room);
    const furniture=createFurniture(furnishing,materials);consolidate(furniture);furniture.position.y=offset;floor.furniture.add(furniture);floor.furnitureBatch.add(furniture.clone(true));
    const fixed=createBuiltins(furnishing,materials);
    const shower=room.id==='f2-205-bath'?createShowerDetail({materials,quality:'sd'}):null;
    if(shower)fixed.add(shower);
    consolidate(fixed);shower?.disposeSourceGeometries();fixed.position.y=offset;floor.builtins.add(fixed);floor.builtinsBatch.add(fixed.clone(true));
    const ceilingGroup=new THREE.Group();floor.ceilings.add(ceilingGroup);
    if(!isVoid&&!['carport','balcony','terrace','laundry','roof','stair'].some(k=>kind.includes(k))) {
      const ceiling=polygonMesh(room.polygon,materials.trim,.075);ceiling.position.y=defaults.wallHeight-.06+offset;ceilingGroup.add(ceiling);
      const b=roomBounds(room);
      if(b.w>3&&b.d>3) {
        const soffit=box(ceilingGroup,[Math.min(b.w-.5,3.4),.11,Math.min(b.d-.5,2.7)],[b.x,defaults.wallHeight-.12+offset,b.z],materials.taupe);soffit.castShadow=false;
        box(ceilingGroup,[Math.min(b.w-.8,3.1),.045,Math.min(b.d-.8,2.4)],[b.x,defaults.wallHeight-.2+offset,b.z],materials.trim);
        if(room.id.includes('g01')) {
          box(ceilingGroup,[2.9,.065,2.2],[b.x,defaults.wallHeight-.245+offset,b.z],materials.frame);
          for(let i=0;i<3;i++)for(let j=0;j<3;j++)box(ceilingGroup,[.92,.025,.69],[b.x+(i-1)*.96,defaults.wallHeight-.291+offset,b.z+(j-1)*.72],materials.metal);
        }
      }
    }
    const [cx,cz]=polygonCentroid(room.polygon);
    roomRecords.set(room.id,{room,group:roomGroup,floor,pick,highlight,line,ceilingGroup,individualSurfaces,center:new THREE.Vector3(cx,.12+offset,cz)});
  }
  for(const floor of floorGroups.values()){consolidate(floor.surfaces);consolidate(floor.furnitureBatch);consolidate(floor.builtinsBatch);}
  for(const wall of house.walls||[]) {
    const floor=floorGroups.get(wall.floor||wall.floorId);if(!floor)continue;
    const record=makeWall(wall,materials,defaults,house.rooms);if(!record)continue;
    floor.group.add(record.group);record.floor=floor;wallRecords.push(record);
  }
  const stairHall=createStairHall({house,materials,quality:'sd'});
  for(const key of STAIR_PARTS){consolidate(stairHall[key]);scene.add(stairHall[key]);}
  stairHall.disposeGeometries();
  const {floors:stairBackdrop,walls:stairBackdropWalls}=buildStairBackdrop(scene,materials,house,defaults.cutawayHeight);
  const roof=new THREE.Group();roof.name='assumed-hip-roof';scene.add(roof);
  const roofY=floorHeight(house,'f2')+defaults.wallHeight+.2,rise=house.roof?.height||1.2,overhang=house.roof?.overhang||.35;
  addHipRoof(roof,{x0:-.6-overhang,x1:5.5+overhang,z0:-10.3-overhang,z1:overhang,y:roofY+.12,rise},materials,false);
  addHipRoof(roof,{x0:5.25,x1:14.1+overhang,z0:-10.3-overhang,z1:-1.6+overhang,y:roofY,rise},materials,true);
  consolidate(roof);
  const facade=buildFacade(floorGroups,house,materials,defaults);
  const explodedGuides=new THREE.Group();scene.add(explodedGuides);
  for(const [x,z] of [[0,0],[14.1,-1.6],[-.6,-10.3],[14.1,-10.3]]) {
    const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.05,z),new THREE.Vector3(x,floorHeight(house,'f2')+EXPLODED_GAP,z)]);
    const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:'#7e9381',dashSize:.1,gapSize:.15,transparent:true,opacity:.4}));line.computeLineDistances();explodedGuides.add(line);
  }

  let state={...DEFAULT_STATE},disposed=false,contextUnavailable=false,frame=0,tween=null,floorTween=null,renderCount=0,hoverId=null,lastLabels='',pointerStart=null,ready=false,userFramed=false;
  let hd=null,hdLoading=null,activeRenderMode='sd';
  const materialKeys=new Map(Object.entries(materials).map(([key,material])=>[material,key]));
  const activePointers=new Set();let multiPointerGesture=false;
  let width=1,height=1,lastRenderTime=0,idleSince=performance.now(),interactionRenders=0,frameIntervals=[];
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),projection=new THREE.Vector3();
  const clockStart=performance.now();

  function invalidate() {
    if(!disposed&&!contextUnavailable&&!frame&&!document.hidden)frame=requestAnimationFrame(render);
  }
  function graphicsSize() {
    const ratio=state.quality==='low'?1:Math.min(window.devicePixelRatio||1,activeRenderMode==='hd'?2:1.75);
    renderer.setPixelRatio(ratio);
    if(hd)hd.rendering.resize(width,height,ratio,state.quality==='low');
  }

  function activateRenderMode(mode) {
    activeRenderMode=mode;
    const upgraded=mode==='hd',palette=upgraded?hd.materials:materials;
    scene.traverse(object=>{
      if(!object.material)return;
      const replace=material=>palette[materialKeys.get(material)]||material;
      object.material=Array.isArray(object.material)?object.material.map(replace):replace(object.material);
    });
    for(const floor of floorGroups.values())floor.wallMask='';
    hemisphere.intensity=upgraded?.7:1.22;
    hemisphere.color.set(upgraded?'#e3edff':'#e6edf7');
    hemisphere.groundColor.set(upgraded?'#ad9e87':'#818b96');
    sun.intensity=upgraded?2.65:2.7;sun.color.set(upgraded?'#fff0da':'#fff5e5');
    sun.position.set(...(upgraded?[-8,18,9]:[-10,22,13]));
    fill.intensity=upgraded?.55:.6;
    scene.environmentIntensity=upgraded?.55:.45;
    renderer.toneMappingExposure=upgraded?.92:.93;
    ground.material.opacity=upgraded?.22:.16;
    // Recreate only the differently sized shadow target; dispose its previous GPU allocation.
    if(hd) {
      const size=upgraded?3072:2048;
      if(sun.shadow.mapSize.x!==size){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);}
    }
    sun.shadow.normalBias=upgraded?.025:.045;
    sun.shadow.needsUpdate=true;
    container.dataset.renderMode=mode;
    applyVisibility();
  }

  function requestRenderMode() {
    if(state.renderMode!=='hd') {
      if(activeRenderMode!=='sd')activateRenderMode('sd');
      onRenderMode({mode:'sd',loading:false});return;
    }
    if(hd) {if(activeRenderMode!=='hd')activateRenderMode('hd');onRenderMode({mode:'hd',loading:false});return;}
    onRenderMode({mode:'hd',loading:true});
    if(hdLoading)return;
    hdLoading=Promise.all([
      import('./scene/hd-materials.js'),import('./scene/hd-furniture.js'),
      import('./scene/hd-rendering.js'),import('./scene/hd-exterior.js'),
    ]).then(([palette,interiors,pipeline,exterior])=>{
      if(disposed)return;
      const hdMaterials=palette.createHDMaterials(),staged=[],extraMaterials=[];
      const floors=new Map();
      let rendering;
      try {
      for(const [id,floor] of floorGroups) {
        const furniture=new THREE.Group(),furnitureBatch=new THREE.Group(),builtins=new THREE.Group(),builtinsBatch=new THREE.Group();
        staged.push(furniture,furnitureBatch,builtins,builtinsBatch);
        floors.set(id,{furniture,furnitureBatch,builtins,builtinsBatch});
      }
      for(const {room} of roomRecords.values()) {
        const floor=floors.get(roomFloorId(room));
        const furnishing=furnishingRoom(room);
        const furniture=interiors.createHDFurniture(furnishing,hdMaterials);consolidate(furniture);furniture.position.y=room.levelOffset??0;
        floor.furniture.add(furniture);floor.furnitureBatch.add(furniture.clone(true));
        const builtins=interiors.createHDBuiltins(furnishing,hdMaterials);
        const shower=room.id==='f2-205-bath'?createShowerDetail({materials:hdMaterials,quality:'hd'}):null;
        if(shower)builtins.add(shower);
        consolidate(builtins);shower?.disposeSourceGeometries();builtins.position.y=room.levelOffset??0;
        floor.builtins.add(builtins);floor.builtinsBatch.add(builtins.clone(true));
      }
      for(const floor of floors.values()){consolidate(floor.furnitureBatch);consolidate(floor.builtinsBatch);}
      interiors.disposeHDFurnitureGeometries();
      const outside=exterior.createHDExterior({house,materials:hdMaterials,roofY,rise,overhang});
      for(const group of Object.values(outside)){staged.push(group);consolidate(group);}
      const hdStairHall=createStairHall({house,materials:hdMaterials,quality:'hd'});
      extraMaterials.push(...hdStairHall.materials);
      for(const key of STAIR_PARTS){staged.push(hdStairHall[key]);consolidate(hdStairHall[key]);}
      hdStairHall.disposeGeometries();
      rendering=pipeline.createHDRendering({renderer,scene,camera});
      hd={materials:hdMaterials,floors,outside,rendering,stairHall:hdStairHall};
      for(const [key,material] of Object.entries(hdMaterials))materialKeys.set(material,key);
      for(const [id,detail] of floors)floorGroups.get(id).group.add(...Object.values(detail));
      scene.add(...Object.values(outside));
      scene.add(...STAIR_PARTS.map(key=>hdStairHall[key]));
      } catch(error) {
        const geometries=new Set(),textures=new Set();
        for(const group of staged){group.removeFromParent();group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);});}
        for(const material of [...Object.values(hdMaterials),...extraMaterials]){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}
        geometries.forEach(geometry=>geometry.dispose());textures.forEach(texture=>texture.dispose());
        interiors.disposeHDFurnitureGeometries();rendering?.dispose();throw error;
      }
      // A second click can return to SD while imports are still loading.
      activateRenderMode(state.renderMode==='hd'?'hd':'sd');
      onRenderMode({mode:activeRenderMode,loading:false});
    }).catch(error=>{
      if(disposed)return;
      console.warn('HD preview unavailable',error);
      state.renderMode='sd';activateRenderMode('sd');
      onRenderMode({mode:'sd',loading:false,error:'HD ไม่พร้อม ลองรีเฟรชหน้า'});
    }).finally(()=>{hdLoading=null;});
  }

  function cancelTween() {tween=null;userFramed=true;invalidate();}
  function stairFocus(){return stairHallPresentation(state,house).focused;}
  function focusBounds(selected){
    if(stairFocus()){const {min,max}=stairHallPresentation(state,house).focusBounds;return {x0:min[0],x1:max[0],z0:min[2],z1:max[2]};}
    return roomBounds(selected.room);
  }
  function fitToState(animate=true,forceHero=false) {
    userFramed=false;
    const selected=roomRecords.get(state.selectedRoomId),view=state.view;
    let center=new THREE.Vector3(6.8,2.7,-4.9),boxSize=new THREE.Vector3(18.5,8.4,15.2),polar=1.03;
    if(view==='f1'||view==='f2') {
      const fy=floorHeight(house,view);center.set(6.8,fy+.6,-4.9);boxSize.set(16.8,3.5,12.5);polar=.72;
    }
    if(view==='exploded') {center.set(6.8,6,-4.9);boxSize.set(17.5,14,13.1);polar=.93;}
    if(selected&&state.isolate&&view!=='whole') {
      const b=roomBounds(selected.room);center.copy(selected.center);center.y+=selected.floor.group.position.y+.6;
      boxSize.set(Math.max(3.4,b.w+.5),3.1,Math.max(3.4,b.d+.5));polar=.72;
    }
    if(stairFocus()){
      const {min,max}=stairHallPresentation(state,house).focusBounds;
      center.set((min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2);
      boxSize.set(max[0]-min[0]+.4,max[1]-min[1]+.4,max[2]-min[2]+.4);polar=1.02;
    }
    const ceilingDetail=Boolean(selected&&state.ceiling&&view!=='whole');
    if(ceilingDetail) {center.y=selected.floor.group.position.y+defaults.wallHeight-.12;polar=1.73;boxSize.y=1.8;}
    const offset=camera.position.clone().sub(controls.target);
    const spherical=new THREE.Spherical().setFromVector3(offset);
    const roomYaw=stairFocus() ? .5 : roomCameraYaw(selected?.room);
    const yaw=selected&&state.isolate?roomYaw:forceHero||!ready?Math.PI*.18:spherical.theta;
    const distance=ceilingDetail?8:42,toPosition=center.clone().add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance,polar,yaw)));
    // Fit all bbox corners in the final camera basis, using the actual unobscured container.
    const direction=toPosition.clone().sub(center).normalize(),right=new THREE.Vector3().crossVectors(UP,direction).normalize(),vertical=new THREE.Vector3().crossVectors(direction,right).normalize();
    let spanX=0,spanY=0;
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]) {
      const v=new THREE.Vector3(x*boxSize.x/2,y*boxSize.y/2,z*boxSize.z/2);
      spanX=Math.max(spanX,Math.abs(v.dot(right)));spanY=Math.max(spanY,Math.abs(v.dot(vertical)));
    }
    const base=13,aspect=width/height,pad=selected?1.06:1.055;
    const toZoom=Math.max(.38,Math.min(selected?4:3.3,Math.min(base*aspect/(spanX*pad),base/(spanY*pad))));
    if(!animate||state.reducedMotion||!ready) {
      camera.position.copy(toPosition);controls.target.copy(center);camera.zoom=toZoom;camera.updateProjectionMatrix();controls.update();tween=null;
    } else tween={start:performance.now(),duration:700,fromPosition:camera.position.clone(),toPosition,fromTarget:controls.target.clone(),toTarget:center,fromZoom:camera.zoom,toZoom};
    invalidate();
  }

  function updateWalls() {
    const cameraDirection=camera.position.clone().sub(controls.target);cameraDirection.y=0;cameraDirection.normalize();
    const focus=roomRecords.get(state.selectedRoomId)?.center || new THREE.Vector3(6.8,0,-5.1);
    for(const r of [...wallRecords,...stairBackdropWalls]) {
      const cut=wallIsLowered(state,{a:point(r.wall.a),b:point(r.wall.b)},[focus.x,focus.z,focus.y],[cameraDirection.x,cameraDirection.z]);
      r.full.visible=!cut;r.low.visible=cut;
    }
    for(const floor of floorGroups.values()) {
      const records=wallRecords.filter(r=>r.floor===floor),mask=records.map(r=>r.group.visible?(r.full.visible?'f':'l'):'-').join('');
      if(mask===floor.wallMask)continue;
      floor.wallMask=mask;
      for(const mesh of [...floor.wallBatch.children]){mesh.geometry.dispose();floor.wallBatch.remove(mesh);}
      const byMaterial=new Map();
      for(const r of records) {
        if(!r.group.visible)continue;
        for(const piece of r.prepared[r.full.visible?'full':'low']) {
          const material=activeRenderMode==='hd'?(hd.materials[materialKeys.get(piece.material)]||piece.material):piece.material;
          if(!byMaterial.has(material.uuid))byMaterial.set(material.uuid,{material,geometries:[]});
          byMaterial.get(material.uuid).geometries.push(piece.geometry);
        }
      }
      for(const {material,geometries} of byMaterial.values()) {
        const geometry=mergeGeometries(geometries,false);if(!geometry)continue;
        const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=!material.transparent;floor.wallBatch.add(mesh);
      }
    }
  }

  function updateLabels() {
    if(!state.labels||state.view==='whole'||state.ceiling||(state.isolate&&state.selectedRoomId)) {if(lastLabels!=='[]'){onLabels([]);lastLabels='[]';}return;}
    const rects=[],results=[],entries=[...roomRecords.values()].sort((a,b)=>{
      if(a.room.id===state.selectedRoomId)return -1;if(b.room.id===state.selectedRoomId)return 1;
      const ab=roomBounds(a.room),bb=roomBounds(b.room);return bb.w*bb.d-ab.w*ab.d;
    });
    const limit=width<550?5:state.view==='exploded'?9:8;
    for(const rec of entries) {
      if(!rec.floor.group.visible)continue;
      const selected=rec.room.id===state.selectedRoomId,kind=rec.room.kind||'';
      if(!selected&&/void|stair|storage|roof|bathroom|dressing|service/.test(kind))continue;
      projection.copy(rec.center);projection.y+=rec.floor.group.position.y+.09;projection.project(camera);
      const x=(projection.x*.5+.5)*width,y=(-projection.y*.5+.5)*height;
      if(projection.z<-1||projection.z>1||x<45||x>width-45||y<25||y>height-35)continue;
      const box={x:x-57,y:y-16,w:114,h:34};
      if(!selected&&rects.some(r=>box.x<r.x+r.w&&box.x+box.w>r.x&&box.y<r.y+r.h&&box.y+box.h>r.y))continue;
      if(!selected&&results.length>=limit)continue;
      rects.push(box);results.push({id:rec.room.id,x:Math.round(x),y:Math.round(y),visible:true});
    }
    const key=JSON.stringify(results);if(key!==lastLabels){onLabels(results);lastLabels=key;}
  }

  function updateHighlights() {
    for(const rec of roomRecords.values()) {
      const selected=rec.room.id===state.selectedRoomId,hovered=rec.room.id===hoverId;
      rec.highlight.visible=state.view!=='whole'&&(selected||hovered);rec.highlight.material=selected?materials.selected:materials.hover;
      rec.line.visible=state.view!=='whole'&&(selected||hovered);
    }
  }

  function applyVisibility() {
    const whole=state.view==='whole',exploded=state.view==='exploded';
    const ceilingDetail=Boolean((state.ceiling||state.isolate)&&state.selectedRoomId&&!whole&&!exploded),selected=roomRecords.get(state.selectedRoomId);
    const stairPolicy=stairHallPresentation(state,house),focusStairs=stairPolicy.focused;
    if(ceilingDetail&&selected){const b=focusBounds(selected);renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),-b.x0+.13),new THREE.Plane(new THREE.Vector3(-1,0,0),b.x1+.13),new THREE.Plane(new THREE.Vector3(0,0,1),-b.z0+.13),new THREE.Plane(new THREE.Vector3(0,0,-1),b.z1+.13)];}else renderer.clippingPlanes=[];
    for(const [id,floor] of floorGroups) {
      floor.group.visible=stairPolicy.floors[id];
      floor.group.position.y=floor.baseY+(exploded&&id==='f2'?EXPLODED_GAP:0);
      for(const [mode,detail] of [['sd',floor],['hd',hd?.floors.get(id)]]) {
        if(!detail)continue;
        const active=mode===activeRenderMode;
        detail.builtins.visible=active&&state.builtins&&ceilingDetail;
        detail.builtinsBatch.visible=active&&state.builtins&&!ceilingDetail;
        detail.furniture.visible=active&&state.furniture&&ceilingDetail;
        detail.furnitureBatch.visible=active&&state.furniture&&!ceilingDetail;
        for(const fixed of detail.builtins.children)fixed.visible=!ceilingDetail||fixed.name===`builtins:${state.selectedRoomId}`;
        for(const furniture of detail.furniture.children)furniture.visible=!ceilingDetail||furniture.name===`furniture:${state.selectedRoomId}`;
      }
      floor.ceilings.visible=state.ceiling&&!exploded&&!whole;
      floor.surfaces.visible=!ceilingDetail;
    }
    for(const rec of roomRecords.values()) {
      rec.ceilingGroup.visible=rec.room.id===state.selectedRoomId;
      const focusRoom=rec.room.id===state.selectedRoomId;
      rec.group.visible=!ceilingDetail||focusRoom;
      for(const mesh of rec.individualSurfaces)mesh.visible=ceilingDetail&&focusRoom;
    }
    for(const wall of wallRecords) {
      if(focusStairs){wall.group.visible=false;continue;}
      if(!ceilingDetail||!selected){wall.group.visible=true;continue;}
      if(wall.wall.hiddenWhenIsolating?.includes(state.selectedRoomId)){wall.group.visible=false;continue;}
      const b=focusBounds(selected),a=point(wall.wall.a),c=point(wall.wall.b);
      wall.group.visible=Math.max(a[0],c[0])>=b.x0-.05&&Math.min(a[0],c[0])<=b.x1+.05&&Math.max(a[1],c[1])>=b.z0-.05&&Math.min(a[1],c[1])<=b.z1+.05;
    }
    for(const [mode,detail] of [['sd',stairHall],['hd',hd?.stairHall]]){
      if(!detail)continue;
      const active=mode===activeRenderMode;
      detail.stairs.visible=active&&stairPolicy.stairs&&stairPolicy.stairsVariant==='full';
      detail.stairsLower.visible=active&&stairPolicy.stairs&&stairPolicy.stairsVariant==='lower';
      detail.landing.visible=active&&stairPolicy.landing;
      detail.chandelier.visible=active&&stairPolicy.chandelier&&stairPolicy.chandelierVariant==='full';
      detail.chandelierUpper.visible=active&&stairPolicy.chandelier&&stairPolicy.chandelierVariant==='upper';
      detail.canopy.visible=active&&stairPolicy.canopy;
    }
    for(const [floor,group] of Object.entries(stairBackdrop))group.visible=stairPolicy.backdropFloor===floor;
    controls.maxPolarAngle=state.ceiling&&state.selectedRoomId?2.15:Math.PI*.465;
    ground.visible=!ceilingDetail;roof.visible=whole;stage.group.visible=state.view!=='f2'&&!ceilingDetail;stage.trees.visible=whole&&activeRenderMode==='sd';
    if(hd){
      hd.outside.architecture.visible=whole&&activeRenderMode==='hd';
      hd.outside.landscape.visible=stage.group.visible&&activeRenderMode==='hd';
      hd.outside.trees.visible=whole&&activeRenderMode==='hd';
    }
    if(facade){facade.wholeDetails.visible=whole;facade.details2.visible=!ceilingDetail&&(whole||state.view==='f2'||exploded);}
    explodedGuides.visible=exploded;grid.visible=state.grid&&!ceilingDetail;grid.material.opacity=whole?.17:.3;
    graphicsSize();
    renderer.shadowMap.enabled=state.quality!=='low'&&!exploded;
    updateWalls();updateHighlights();invalidate();
  }

  function render(now) {
    frame=0;if(disposed||contextUnavailable||document.hidden)return;
    const isTween=Boolean(tween);
    if(floorTween) {
      const t=Math.min(1,(now-floorTween.start)/floorTween.duration);
      floorGroups.get('f2').group.position.y=THREE.MathUtils.lerp(floorTween.from,floorTween.to,ease(t));
      if(t>=1)floorTween=null;
    }
    if(tween) {
      const t=Math.min(1,(now-tween.start)/tween.duration),e=ease(t);
      camera.position.lerpVectors(tween.fromPosition,tween.toPosition,e);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,e);
      camera.zoom=THREE.MathUtils.lerp(tween.fromZoom,tween.toZoom,e);camera.updateProjectionMatrix();
      if(t>=1)tween=null;
    }
    const moved=controls.update();
    for(const detail of [stairHall,hd?.stairHall])if(detail){
      for(const key of ['stairs','stairsLower'])detail[key].position.y=floorGroups.get('f1').group.position.y;
      for(const key of ['landing','chandelier','chandelierUpper','canopy'])detail[key].position.y=floorGroups.get('f2').group.position.y;
    }
    for(const [floor,group] of Object.entries(stairBackdrop))group.position.y=floorGroups.get(floor).group.position.y;
    // Bound pan without snapping the zoom or orientation on a simple resize.
    const target=controls.target,clamped=new THREE.Vector3(THREE.MathUtils.clamp(target.x,-5,20),THREE.MathUtils.clamp(target.y,-1,12),THREE.MathUtils.clamp(target.z,-16,8));
    if(target.distanceToSquared(clamped)>.00001){camera.position.add(clamped.clone().sub(target));target.copy(clamped);}
    updateWalls();
    if(activeRenderMode==='hd') {
      try {hd.rendering.render();}
      catch(error) {
        console.warn('HD render fell back to SD',error);state.renderMode='sd';activateRenderMode('sd');
        onRenderMode({mode:'sd',loading:false,error:'เครื่องนี้HD ไม่พร้อม ลองรีเฟรชหน้า'});
        renderer.setRenderTarget(null);scene.overrideMaterial=null;renderer.render(scene,camera);
      }
    } else renderer.render(scene,camera);
    renderCount++;interactionRenders++;
    if(renderCount>3&&lastRenderTime&&now-lastRenderTime<250){frameIntervals.push(now-lastRenderTime);if(frameIntervals.length>120)frameIntervals.shift();}
    const averageInterval=frameIntervals.length?frameIntervals.reduce((a,b)=>a+b,0)/frameIntervals.length:0;
    Object.assign(container.dataset,{renderer:'webgl2',renderMode:activeRenderMode,cameraPose:JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom}),renderFrames:String(renderCount),drawCalls:String(renderer.info.render.calls),triangles:String(renderer.info.render.triangles),geometries:String(renderer.info.memory.geometries),textures:String(renderer.info.memory.textures),sceneView:state.view,sceneAnimating:String(Boolean(tween||floorTween||moved)),frameSamples:String(frameIntervals.length),meanFrameMs:averageInterval.toFixed(2)});
    lastRenderTime=now;updateLabels();
    if(tween||floorTween||moved||isTween)invalidate();else idleSince=now;
    if(!ready){ready=true;container.dataset.sceneReadyMs=(performance.now()-initializationStart).toFixed(1);onReady();}
  }

  function hit(event) {
    if(state.view==='whole')return null;
    const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(picks.filter(p=>{const rec=roomRecords.get(p.userData.roomId);return rec?.floor.group.visible&&rec?.group.visible;}),false);
    return hits[0]?.object?.userData.roomId||null;
  }
  function pointerDown(event) {activePointers.add(event.pointerId);if(activePointers.size>1)multiPointerGesture=true;pointerStart=event.button===0?{id:event.pointerId,x:event.clientX,y:event.clientY,t:performance.now()}:null;cancelTween();}
  function pointerMove(event) {
    if(event.buttons)return;
    const id=hit(event);if(id!==hoverId){hoverId=id;renderer.domElement.style.cursor=id?'pointer':'grab';updateHighlights();invalidate();}
  }
  function pointerUp(event) {
    if(pointerStart&&pointerStart.id===event.pointerId&&!multiPointerGesture&&activePointers.size===1&&event.button===0&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)<6&&performance.now()-pointerStart.t<600){const id=hit(event);if(id)onSelect(id);}
    activePointers.delete(event.pointerId);pointerStart=null;if(!activePointers.size)multiPointerGesture=false;
  }
  function pointerCancel(event){activePointers.delete(event.pointerId);pointerStart=null;if(!activePointers.size)multiPointerGesture=false;}
  function pointerLeave() {hoverId=null;updateHighlights();invalidate();}
  function onVisibility() {if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else invalidate();}
  function contextLost(event) {event.preventDefault();contextUnavailable=true;if(frame)cancelAnimationFrame(frame);frame=0;container.dataset.renderer='context-lost';onError(new Error('WebGL context lost'));}
  controls.addEventListener('start',cancelTween);controls.addEventListener('change',invalidate);
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);
  renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('pointerleave',pointerLeave);
  renderer.domElement.addEventListener('wheel',cancelTween,{passive:true});document.addEventListener('visibilitychange',onVisibility);
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function resize() {
    const rect=container.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    const oldAspect=width/height;width=rect.width;height=rect.height;
    renderer.setSize(width,height,false);graphicsSize();const aspect=width/height;
    camera.left=-13*aspect;camera.right=13*aspect;camera.top=13;camera.bottom=-13;camera.updateProjectionMatrix();
    // A full-screen or orientation change should not discard a chosen close-up.
    if(!ready||(!userFramed&&Math.abs(oldAspect-aspect)>.07))fitToState(false);
    invalidate();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);
  applyVisibility();resize();fitToState(false,true);invalidate();
  return {
    setState(next) {
      const previous=state,previousFloorY=floorGroups.get('f2').group.position.y;state={...state,...next};
      if(!['sd','hd'].includes(state.renderMode))state.renderMode='sd';
      if(previous.renderMode!==state.renderMode)requestRenderMode();
      if(!['whole','f1','f2','exploded'].includes(state.view))state.view='whole';
      if(state.selectedRoomId&&!roomRecords.has(state.selectedRoomId))state.selectedRoomId=null;
      const viewChanged=previous.view!==state.view,roomChanged=previous.selectedRoomId!==state.selectedRoomId;
      applyVisibility();
      if(viewChanged||roomChanged||previous.ceiling!==state.ceiling||previous.isolate!==state.isolate)fitToState(true,state.view==='whole');
      if(state.reducedMotion&&tween) {
        camera.position.copy(tween.toPosition);controls.target.copy(tween.toTarget);camera.zoom=tween.toZoom;camera.updateProjectionMatrix();tween=null;controls.update();
      }
      floorTween=null;
      if(viewChanged&&!state.reducedMotion&&ready&&(state.view==='exploded'||previous.view==='exploded')) {
        const to=floorGroups.get('f2').group.position.y;
        floorGroups.get('f2').group.position.y=previousFloorY;
        floorTween={start:performance.now(),duration:750,from:previousFloorY,to};invalidate();
      }
    },
    cameraPreset(preset) {cancelTween();const polar=preset==='top'?.04:preset==='front'?1.46:1.03,yaw=preset==='front'?0:state.selectedRoomId&&state.isolate?roomCameraYaw(roomRecords.get(state.selectedRoomId)?.room):.58;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(42,polar,yaw)));controls.update();invalidate();},
    pan(dx,dy) {cancelTween();camera.updateMatrix();const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(dx*(camera.right-camera.left)/(width*camera.zoom));const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1).multiplyScalar(dy*(camera.top-camera.bottom)/(height*camera.zoom));right.add(up);camera.position.add(right);controls.target.add(right);controls.update();invalidate();},
    zoom(factor) {cancelTween();camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();invalidate();},
    rotate(radians) {cancelTween();const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(UP,radians);camera.position.copy(controls.target).add(offset);controls.update();invalidate();},
    reset() {floorTween=null;state={...state,...DEFAULT_STATE,reducedMotion:state.reducedMotion,quality:state.quality,renderMode:state.renderMode};applyVisibility();fitToState(true,true);},
    resize,
    dispose() {
      disposed=true;if(frame)cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
      document.removeEventListener('visibilitychange',onVisibility);
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);
      renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('pointerleave',pointerLeave);renderer.domElement.removeEventListener('wheel',cancelTween);
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      const geometries=new Set(),mats=new Set(),textures=new Set();
      scene.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);for(const mat of obj.material?(Array.isArray(obj.material)?obj.material:[obj.material]):[]){mats.add(mat);}});
      for(const record of wallRecords)for(const pieces of Object.values(record.prepared))for(const piece of pieces)geometries.add(piece.geometry);
      for(const material of [...Object.values(materials),...Object.values(hd?.materials||{})])mats.add(material);
      for(const material of mats)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
      hd?.rendering.dispose();sun.shadow.map?.dispose();
      geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environmentTarget.dispose();renderer.dispose();renderer.domElement.remove();container.dataset.renderer='disposed';
    },
    getStats() {return {webgl:true,renderMode:activeRenderMode,hdReady:Boolean(hd),renderCount,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,view:state.view,visibleWalls:wallRecords.filter(r=>r.floor.group.visible&&r.full.visible).length,idleForMs:Math.max(0,performance.now()-lastRenderTime),uptimeMs:performance.now()-clockStart,camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom}};},
  };
}
