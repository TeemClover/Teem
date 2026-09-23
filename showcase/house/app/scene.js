import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createMaterials } from './scene/materials.js';
import { box, cylinder, createFurniture, createTree, roomBounds } from './scene/furniture.js';

const DEFAULT_STATE = {view:'whole',selectedRoomId:null,wallMode:'auto',furniture:true,labels:true,ceiling:false,reducedMotion:false,quality:'balanced'};
const EXPLODED_GAP = 6.2; // Presentation distance only; source floor elevations remain unchanged.
const UP = new THREE.Vector3(0,1,0);

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

function makeWall(wall,materials,defaults) {
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
      const leaf=new THREE.Group();leaf.position.set(x-w/2,o.sill,0);leaf.rotation.y=.5;full.add(leaf);
      box(leaf,[w-.08,h-.07,.045],[(w-.08)/2,h/2,0],materials.taupe);
      box(leaf,[.07,.04,.1],[w-.2,h*.48,.04],materials.brass);
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
    // Count and exact placement are illustrative; aerial evidence establishes two dark arrays.
    const face=surfaces[1];
    const blend=(u,v)=>{
      const lower=new THREE.Vector3(...face[0]).lerp(new THREE.Vector3(...face[1]),u);
      const upper=new THREE.Vector3(...face[3]).lerp(new THREE.Vector3(...face[2]),u);
      const result=lower.lerp(upper,v);result.y+=.047;return result.toArray();
    };
    for(let row=0;row<3;row++)for(let col=0;col<4;col++) {
      const u0=.12+col*.19,u1=u0+.176,v0=.15+row*.23,v1=v0+.213;
      addQuad(parent,[blend(u0,v0),blend(u1,v0),blend(u1,v1),blend(u0,v1)],materials.solar);
    }
  }
}

function buildStairs(parent,materials,height,definition={}) {
  const group=new THREE.Group();group.name='return-stair';parent.add(group);
  const hole=definition.holePolygon||[[5.5,-10.3],[8.5,-10.3],[8.5,-7.4],[5.5,-7.4]];
  const xs=hole.map(p=>p[0]),zs=hole.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
  const flights=Math.max(6,Math.round((definition.stepCount||20)/2)),rise=height/(flights*2),tread=(z1-z0-.65)/flights,flightWidth=(x1-x0)*.38;
  const left=x0+(x1-x0)*.21,right=x1-(x1-x0)*.21,start=z1-tread/2,end=start-(flights-1)*tread;
  for(let i=0;i<flights;i++) {
    const y=(i+1)*rise,z=start-i*tread;
    box(group,[flightWidth,y,tread+.01],[left,y/2,z],materials.slab);
    box(group,[flightWidth+.02,.035,tread+.015],[left,y+.018,z],materials.timber);
    const yy=(i+flights+1)*rise,zz=end+i*tread;
    box(group,[flightWidth,yy-height/2,tread+.01],[right,(yy+height/2)/2,zz],materials.slab);
    box(group,[flightWidth+.02,.035,tread+.015],[right,yy+.018,zz],materials.timber);
  }
  box(group,[x1-x0-.2,.16,.65],[(x0+x1)/2,height/2-.08,z0+.325],materials.timber);
  for(let i=0;i<6;i++) {
    const z=start+(end-start)*i/5,y=rise+(height/2-rise)*i/5;
    box(group,[.025,.82,.025],[left+flightWidth/2,y+.42,z],materials.frame);
    box(group,[.025,.82,.025],[right-flightWidth/2,height-y+.42,z],materials.frame);
  }
  const line=(a,b)=>{
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),mid=from.clone().add(to).multiplyScalar(.5);
    const rail=box(group,[.045,from.distanceTo(to),.045],mid.toArray(),materials.timber);
    rail.quaternion.setFromUnitVectors(UP,to.sub(from).normalize());
  };
  line([left+flightWidth/2,rise+.82,start],[left+flightWidth/2,height/2+.82,end]);
  line([right-flightWidth/2,height+.82,start],[right-flightWidth/2,height/2+.82,end]);
  consolidate(group);return group;
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

function buildFacade(floorGroups,roof,materials) {
  const f1=floorGroups.get('f1'),f2=floorGroups.get('f2');
  if(!f1||!f2)return;
  const wholeDetails=new THREE.Group();wholeDetails.name='whole-facade-details';f1.group.add(wholeDetails);
  // Paired carport columns and deep pale fascia observed in the street photographs.
  for(const x of [.05,5.4]) {
    box(wholeDetails,[.27,3.3,.34],[x,1.29,.25],materials.taupe);
    box(wholeDetails,[.36,.1,.43],[x,-.31,.25],materials.trim);
  }
  box(wholeDetails,[5.8,.24,.52],[2.7,2.88,.18],materials.trim);
  box(wholeDetails,[5.8,.13,3.9],[2.7,2.94,-1.52],materials.trim);
  const details2=new THREE.Group();details2.name='balcony-and-facade';f2.group.add(details2);
  const balcony=(x0,x1,z)=>{
    box(details2,[x1-x0,.17,.98],[(x0+x1)/2,-.14,z-.2],materials.trim);
    box(details2,[x1-x0,.88,.035],[(x0+x1)/2,.48,z+.24],materials.glass).castShadow=false;
    box(details2,[x1-x0,.035,.045],[(x0+x1)/2,.94,z+.24],materials.frame);
    for(let x=x0;x<=x1+.01;x+=Math.max(1,(x1-x0)/3))box(details2,[.04,.94,.04],[x,.47,z+.24],materials.frame);
  };
  balcony(.18,5.25,.3);balcony(10.15,13.9,-1.35);
  for(const [x,z] of [[-.14,.08],[5.5,.08],[9.72,-1.6],[14.16,-1.6]]) {
    box(details2,[.22,2.85,.26],[x,1.35,z],materials.taupe);
    for(const dx of [-.065,.065])box(details2,[.025,2.55,.038],[x+dx,1.36,z+.153],materials.trim);
  }
  box(details2,[4.22,.12,.42],[11.93,2.64,-1.65],materials.trim);
  consolidate(wholeDetails);consolidate(details2);return {wholeDetails,details2};
}

export function createHouseScene({container,house,onSelect=()=>{},onReady=()=>{},onError=()=>{},onLabels=()=>{}}) {
  const initializationStart=performance.now();
  let renderer;
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  } catch(error) {onError(error);return {setState(){},zoom(){},rotate(){},reset(){},resize(){},dispose(){},getStats(){return {webgl:false};}};}
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
  renderer.domElement.setAttribute('aria-label','โมเดลบ้าน 3 มิติ หมุนด้วยการลาก ซูมด้วยลูกกลิ้งหรือปุ่มควบคุม');
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none;outline:none;';
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-13,13,13,-13,.1,180);
  camera.position.set(25,22,27);camera.lookAt(6.8,1.8,-4.4);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(6.8,1.8,-4.4);controls.enableDamping=true;controls.dampingFactor=.11;
  controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.465;
  controls.minZoom=.38;controls.maxZoom=4;controls.zoomSpeed=.8;controls.rotateSpeed=.65;
  controls.screenSpacePanning=true;controls.panSpeed=.75;
  const materials=createMaterials();
  const defaults={wallHeight:2.7,slabThickness:.18,exteriorWallThickness:.15,interiorWallThickness:.1,cutawayHeight:.9,...house.assumptions};
  // Only numeric presentation assumptions enter geometry; provenance lives in the data ledger.
  for(const key of Object.keys(defaults))if(typeof defaults[key]==='object')defaults[key]=defaults[key]?.value;
  for(const [key,value] of Object.entries({wallHeight:2.7,slabThickness:.18,exteriorWallThickness:.15,interiorWallThickness:.1,cutawayHeight:.9}))if(!Number.isFinite(defaults[key]))defaults[key]=value;
  scene.add(new THREE.HemisphereLight('#f9fbf7','#b5b09e',2.25));
  const sun=new THREE.DirectionalLight('#fff5dd',3.1);sun.position.set(-10,22,13);sun.target.position.set(6,0,-4);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-21;sun.shadow.camera.right=21;sun.shadow.camera.top=21;sun.shadow.camera.bottom=-21;
  sun.shadow.camera.near=.5;sun.shadow.camera.far=70;sun.shadow.bias=-.00025;sun.shadow.normalBias=.045;sun.shadow.radius=4;
  const fill=new THREE.DirectionalLight('#dce8ed',1.1);fill.position.set(16,12,-12);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({color:'#6d6855',opacity:.17}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.01;ground.receiveShadow=true;scene.add(ground);
  const stage=buildStage(scene,materials),floorGroups=new Map(),wallRecords=[],roomRecords=new Map(),picks=[];
  for(const id of ['f1','f2']) {
    const group=new THREE.Group();group.name=`floor:${id}`;group.position.y=floorHeight(house,id);scene.add(group);
    const furniture=new THREE.Group(),furnitureBatch=new THREE.Group(),ceilings=new THREE.Group(),surfaces=new THREE.Group(),wallBatch=new THREE.Group();group.add(furniture,furnitureBatch,ceilings,surfaces,wallBatch);
    floorGroups.set(id,{group,furniture,furnitureBatch,ceilings,surfaces,wallBatch,wallMask:'',baseY:group.position.y});
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
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(positions),new THREE.LineBasicMaterial({color:'#28694f',transparent:true,opacity:.9}));line.visible=false;line.renderOrder=4;roomGroup.add(line);
    const furniture=createFurniture(room,materials);consolidate(furniture);furniture.position.y=offset;floor.furniture.add(furniture);floor.furnitureBatch.add(furniture.clone(true));
    const ceilingGroup=new THREE.Group();floor.ceilings.add(ceilingGroup);
    if(!isVoid&&!['carport','balcony','terrace','laundry','roof'].some(k=>kind.includes(k))) {
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
  for(const floor of floorGroups.values()){consolidate(floor.surfaces);consolidate(floor.furnitureBatch);}
  for(const wall of house.walls||[]) {
    const floor=floorGroups.get(wall.floor||wall.floorId);if(!floor)continue;
    const record=makeWall(wall,materials,defaults);if(!record)continue;
    floor.group.add(record.group);record.floor=floor;wallRecords.push(record);
  }
  const stairs=buildStairs(floorGroups.get('f1').group,materials,floorHeight(house,'f2'),house.stair);
  const landing=box(floorGroups.get('f2').group,[1.2,.13,.35],[7.8,-.12,-7.23],materials.timber);
  landing.name='stair-arrival-landing';
  const roof=new THREE.Group();roof.name='assumed-hip-roof';scene.add(roof);
  const roofY=floorHeight(house,'f2')+defaults.wallHeight+.2,rise=house.roof?.height||1.2,overhang=house.roof?.overhang||.35;
  addHipRoof(roof,{x0:-overhang,x1:5.5+overhang,z0:-10.3-overhang,z1:overhang,y:roofY+.12,rise},materials,true);
  addHipRoof(roof,{x0:5.25,x1:14.1+overhang,z0:-10.3-overhang,z1:-1.6+overhang,y:roofY,rise},materials,true);
  consolidate(roof);
  const facade=buildFacade(floorGroups,roof,materials);
  const explodedGuides=new THREE.Group();scene.add(explodedGuides);
  for(const [x,z] of [[0,0],[14.1,-1.6],[-.6,-10.3],[14.1,-10.3]]) {
    const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.05,z),new THREE.Vector3(x,floorHeight(house,'f2')+EXPLODED_GAP,z)]);
    const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:'#7e9381',dashSize:.1,gapSize:.15,transparent:true,opacity:.4}));line.computeLineDistances();explodedGuides.add(line);
  }

  let state={...DEFAULT_STATE},disposed=false,contextUnavailable=false,frame=0,tween=null,floorTween=null,renderCount=0,hoverId=null,lastLabels='',pointerStart=null,ready=false;
  const activePointers=new Set();let multiPointerGesture=false;
  let width=1,height=1,lastRenderTime=0,idleSince=performance.now(),interactionRenders=0,frameIntervals=[];
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),projection=new THREE.Vector3();
  const clockStart=performance.now();

  function invalidate() {
    if(!disposed&&!contextUnavailable&&!frame&&!document.hidden)frame=requestAnimationFrame(render);
  }
  function cancelTween() {tween=null;invalidate();}
  function fitToState(animate=true,forceHero=false) {
    const selected=roomRecords.get(state.selectedRoomId),view=state.view;
    let center=new THREE.Vector3(6.8,2.7,-4.9),boxSize=new THREE.Vector3(19.4,9.1,16.2),polar=.97;
    if(view==='f1'||view==='f2') {
      const fy=floorHeight(house,view);center.set(6.8,fy+.6,-4.9);boxSize.set(16.8,3.5,12.5);polar=.72;
    }
    if(view==='exploded') {center.set(6.8,6,-4.9);boxSize.set(17.5,14,13.1);polar=.93;}
    if(selected&&view!=='whole') {
      const b=roomBounds(selected.room);center.copy(selected.center);center.y+=selected.floor.group.position.y+.6;
      boxSize.set(Math.max(4.2,b.w+1.5),3.7,Math.max(4.2,b.d+1.4));polar=.72;
    }
    const ceilingDetail=Boolean(selected&&state.ceiling&&view!=='whole');
    if(ceilingDetail) {center.y=selected.floor.group.position.y+defaults.wallHeight-.12;polar=1.73;boxSize.y=1.8;}
    const offset=camera.position.clone().sub(controls.target);
    const spherical=new THREE.Spherical().setFromVector3(offset);
    const yaw=forceHero||!ready?Math.PI*.18:spherical.theta;
    const distance=ceilingDetail?8:42,toPosition=center.clone().add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance,polar,yaw)));
    // Fit all bbox corners in the final camera basis, using the actual unobscured container.
    const direction=toPosition.clone().sub(center).normalize(),right=new THREE.Vector3().crossVectors(UP,direction).normalize(),vertical=new THREE.Vector3().crossVectors(direction,right).normalize();
    let spanX=0,spanY=0;
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]) {
      const v=new THREE.Vector3(x*boxSize.x/2,y*boxSize.y/2,z*boxSize.z/2);
      spanX=Math.max(spanX,Math.abs(v.dot(right)));spanY=Math.max(spanY,Math.abs(v.dot(vertical)));
    }
    const base=13,aspect=width/height,pad=selected?1.12:1.055;
    const toZoom=Math.max(.38,Math.min(3.3,Math.min(base*aspect/(spanX*pad),base/(spanY*pad))));
    if(!animate||state.reducedMotion||!ready) {
      camera.position.copy(toPosition);controls.target.copy(center);camera.zoom=toZoom;camera.updateProjectionMatrix();controls.update();tween=null;
    } else tween={start:performance.now(),duration:700,fromPosition:camera.position.clone(),toPosition,fromTarget:controls.target.clone(),toTarget:center,fromZoom:camera.zoom,toZoom};
    invalidate();
  }

  function updateWalls() {
    const isWhole=state.view==='whole',cameraDirection=camera.position.clone().sub(controls.target);cameraDirection.y=0;cameraDirection.normalize();
    const focus=roomRecords.get(state.selectedRoomId)?.center || new THREE.Vector3(6.8,0,-5.1);
    for(const r of wallRecords) {
      let cut=false;
      if(!isWhole&&(state.wallMode!=='full'||state.ceiling)) {
        if(state.wallMode==='low'||state.ceiling)cut=true;
        else {
          let nearest=r.mid;
          if(state.selectedRoomId) {
            const a=point(r.wall.a),b=point(r.wall.b),dx=b[0]-a[0],dz=b[1]-a[1];
            const t=THREE.MathUtils.clamp(((focus.x-a[0])*dx+(focus.z-a[1])*dz)/(dx*dx+dz*dz),0,1);
            nearest=new THREE.Vector3(a[0]+t*dx,0,a[1]+t*dz);
          }
          const relative=nearest.clone().sub(focus),facing=Math.abs(r.normal.dot(cameraDirection));
          // Lower near-facing walls; retained far walls still explain room volume.
          cut=relative.dot(cameraDirection)>-.25 && facing>.34;
          if(state.selectedRoomId&&relative.length()<2.1)cut=cut||facing>.6;
        }
      }
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
          if(!byMaterial.has(piece.material.uuid))byMaterial.set(piece.material.uuid,{material:piece.material,geometries:[]});
          byMaterial.get(piece.material.uuid).geometries.push(piece.geometry);
        }
      }
      for(const {material,geometries} of byMaterial.values()) {
        const geometry=mergeGeometries(geometries,false);if(!geometry)continue;
        const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=!material.transparent;floor.wallBatch.add(mesh);
      }
    }
  }

  function updateLabels() {
    if(!state.labels||state.view==='whole'||state.ceiling) {if(lastLabels!=='[]'){onLabels([]);lastLabels='[]';}return;}
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
    const ceilingDetail=Boolean(state.ceiling&&state.selectedRoomId&&!whole&&!exploded),selected=roomRecords.get(state.selectedRoomId);
    for(const [id,floor] of floorGroups) {
      floor.group.visible=whole||exploded||state.view===id;
      floor.group.position.y=floor.baseY+(exploded&&id==='f2'?EXPLODED_GAP:0);
      floor.furniture.visible=state.furniture&&ceilingDetail;
      floor.furnitureBatch.visible=state.furniture&&!ceilingDetail;
      floor.ceilings.visible=state.ceiling&&!exploded&&!whole;
      floor.surfaces.visible=!ceilingDetail;
      for(const furniture of floor.furniture.children)furniture.visible=!ceilingDetail||furniture.name===`furniture:${state.selectedRoomId}`;
    }
    for(const rec of roomRecords.values()) {
      rec.ceilingGroup.visible=rec.room.id===state.selectedRoomId;
      rec.group.visible=!ceilingDetail||rec.room.id===state.selectedRoomId;
      for(const mesh of rec.individualSurfaces)mesh.visible=ceilingDetail&&rec.room.id===state.selectedRoomId;
    }
    for(const wall of wallRecords) {
      if(!ceilingDetail||!selected){wall.group.visible=true;continue;}
      const b=roomBounds(selected.room),a=point(wall.wall.a),c=point(wall.wall.b);
      wall.group.visible=Math.max(a[0],c[0])>=b.x0-.05&&Math.min(a[0],c[0])<=b.x1+.05&&Math.max(a[1],c[1])>=b.z0-.05&&Math.min(a[1],c[1])<=b.z1+.05;
    }
    stairs.visible=!ceilingDetail;landing.visible=!ceilingDetail;
    controls.maxPolarAngle=state.ceiling&&state.selectedRoomId?2.15:Math.PI*.465;
    roof.visible=whole;stage.group.visible=state.view!=='f2'&&!ceilingDetail;stage.trees.visible=whole;
    if(facade){facade.wholeDetails.visible=whole;facade.details2.visible=!ceilingDetail&&(whole||state.view==='f2'||exploded);}
    explodedGuides.visible=exploded;
    renderer.setPixelRatio(state.quality==='low'?1:Math.min(window.devicePixelRatio||1,1.75));
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
    // Bound pan without snapping the zoom or orientation on a simple resize.
    const target=controls.target,clamped=new THREE.Vector3(THREE.MathUtils.clamp(target.x,-5,20),THREE.MathUtils.clamp(target.y,-1,12),THREE.MathUtils.clamp(target.z,-16,8));
    if(target.distanceToSquared(clamped)>.00001){camera.position.add(clamped.clone().sub(target));target.copy(clamped);}
    updateWalls();renderer.render(scene,camera);renderCount++;interactionRenders++;
    if(renderCount>3&&lastRenderTime&&now-lastRenderTime<250){frameIntervals.push(now-lastRenderTime);if(frameIntervals.length>120)frameIntervals.shift();}
    const averageInterval=frameIntervals.length?frameIntervals.reduce((a,b)=>a+b,0)/frameIntervals.length:0;
    Object.assign(container.dataset,{renderer:'webgl2',renderFrames:String(renderCount),drawCalls:String(renderer.info.render.calls),triangles:String(renderer.info.render.triangles),geometries:String(renderer.info.memory.geometries),textures:String(renderer.info.memory.textures),sceneView:state.view,sceneAnimating:String(Boolean(tween||floorTween||moved)),frameSamples:String(frameIntervals.length),meanFrameMs:averageInterval.toFixed(2)});
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
    renderer.setSize(width,height,false);const aspect=width/height;
    camera.left=-13*aspect;camera.right=13*aspect;camera.top=13;camera.bottom=-13;camera.updateProjectionMatrix();
    if(!ready||Math.abs(oldAspect-aspect)>.07)fitToState(false);
    invalidate();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);
  applyVisibility();resize();fitToState(false,true);invalidate();
  return {
    setState(next) {
      const previous=state,previousFloorY=floorGroups.get('f2').group.position.y;state={...state,...next};
      if(!['whole','f1','f2','exploded'].includes(state.view))state.view='whole';
      if(state.selectedRoomId&&!roomRecords.has(state.selectedRoomId))state.selectedRoomId=null;
      const viewChanged=previous.view!==state.view,roomChanged=previous.selectedRoomId!==state.selectedRoomId;
      applyVisibility();
      if(viewChanged||roomChanged||previous.ceiling!==state.ceiling)fitToState(true,state.view==='whole');
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
    pan(dx,dy) {cancelTween();camera.updateMatrix();const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(dx*(camera.right-camera.left)/(width*camera.zoom));const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1).multiplyScalar(dy*(camera.top-camera.bottom)/(height*camera.zoom));right.add(up);camera.position.add(right);controls.target.add(right);controls.update();invalidate();},
    zoom(factor) {cancelTween();camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();invalidate();},
    rotate(radians) {cancelTween();const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(UP,radians);camera.position.copy(controls.target).add(offset);controls.update();invalidate();},
    reset() {floorTween=null;state={...state,...DEFAULT_STATE,reducedMotion:state.reducedMotion,quality:state.quality};applyVisibility();fitToState(true,true);},
    resize,
    dispose() {
      disposed=true;if(frame)cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
      document.removeEventListener('visibilitychange',onVisibility);
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);
      renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('pointerleave',pointerLeave);renderer.domElement.removeEventListener('wheel',cancelTween);
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      const geometries=new Set(),mats=new Set(),textures=new Set();
      scene.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);for(const mat of obj.material?(Array.isArray(obj.material)?obj.material:[obj.material]):[]){mats.add(mat);if(mat.map)textures.add(mat.map);}});
      for(const record of wallRecords)for(const pieces of Object.values(record.prepared))for(const piece of pieces)geometries.add(piece.geometry);
      geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();container.dataset.renderer='disposed';
    },
    getStats() {return {webgl:true,renderCount,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,view:state.view,visibleWalls:wallRecords.filter(r=>r.floor.group.visible&&r.full.visible).length,idleForMs:Math.max(0,performance.now()-lastRenderTime),uptimeMs:performance.now()-clockStart,camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom}};},
  };
}
