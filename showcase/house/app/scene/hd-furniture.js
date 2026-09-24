import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFurniture, createBuiltins, roomBounds } from './furniture.js';

// The SD layout is the single source of truth for placement and circulation.
// HD adds surface/edge detail to fresh groups; it never mutates the SD objects.
const roundedCache = new Map();
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 28);
const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
const discGeometry = new THREE.CylinderGeometry(1, 1, 1, 40);
const plateGeometry = new THREE.LatheGeometry([
  [0,-.006],[.068,-.006],[.107,-.003],[.123,.003],[.126,.008],
  [.125,.012],[.122,.013],[.103,.005],[.074,.001],[0,.001],
].map(([r,y])=>new THREE.Vector2(r,y)),40);
const partGeometries = new Set([cylinderGeometry, sphereGeometry, discGeometry, plateGeometry]);

function mesh(parent, geometry, material, position = [0, 0, 0], name = '') {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.name = name;
  object.castShadow = !material.transparent;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function roundedGeometry(size, radius, segments = 3) {
  const key = [...size, radius, segments].map(n => Number(n).toFixed(5)).join(':');
  if (!roundedCache.has(key)) {
    const geometry = new RoundedBoxGeometry(...size, segments, radius);
    roundedCache.set(key, geometry);
    partGeometries.add(geometry);
  }
  return roundedCache.get(key);
}

function block(parent, size, position, material, radius = .012, name = '') {
  return mesh(parent, roundedGeometry(size, Math.min(radius, ...size.map(n => n * .38))), material, position, name);
}

function cylinder(parent, radius, height, position, material, name = '') {
  const object = mesh(parent, cylinderGeometry, material, position, name);
  object.scale.set(radius, height, radius);
  return object;
}

function ball(parent, size, position, material) {
  const object = mesh(parent, sphereGeometry, material, position);
  object.scale.set(...size);
  return object;
}

function tube(parent, points, radius, material, { closed = false, smooth = true, segments = 36, name = '' } = {}) {
  const vectors = points.map(p => new THREE.Vector3(...p));
  const curve = smooth
    ? new THREE.CatmullRomCurve3(vectors, closed, 'centripetal')
    : new THREE.CurvePath();
  if (!smooth) {
    for (let i = 1; i < vectors.length; i++) curve.add(new THREE.LineCurve3(vectors[i - 1], vectors[i]));
    if (closed) curve.add(new THREE.LineCurve3(vectors.at(-1), vectors[0]));
  }
  const geometry = new THREE.TubeGeometry(curve, segments, radius, 5, closed);
  partGeometries.add(geometry);
  return mesh(parent, geometry, material, [0, 0, 0], name);
}

function rectanglePoints(width, depth, radius) {
  const x = width / 2, z = depth / 2, r = Math.min(radius, x * .4, z * .4);
  return [[-x+r,-z],[x-r,-z],[x,-z+r],[x,z-r],[x-r,z],[-x+r,z],[-x,z-r],[-x,-z+r]];
}

function horizontalSeam(parent, width, depth, y, material, radius = .0032) {
  return tube(parent, rectanglePoints(width, depth, .055).map(([x,z]) => [x,y,z]), radius, material, { closed:true, segments:36, name:'hd:upholstery-piping' });
}

function verticalSeam(parent, width, height, z, material) {
  return tube(parent, rectanglePoints(width, height, .045).map(([x,y]) => [x,y,z]), .003, material, { closed:true, segments:32, name:'hd:cushion-piping' });
}

function dimensions(object) {
  return object.userData.hdDimensions || object.scale.toArray();
}

function refineGeometry(group) {
  group.traverse(object => {
    if (!object.isMesh) return;
    const kind = object.geometry.type, size = object.scale.toArray();
    if (kind === 'RoundedBoxGeometry' || kind === 'BoxGeometry') {
      object.userData.hdDimensions = size;
      const minimum = Math.min(...size);
      // Retain exact footprints. A physical edge radius avoids stretched bevels.
      const radius = kind === 'RoundedBoxGeometry' ? Math.min(.07, minimum * .34) : Math.min(.012, minimum * .2);
      if (minimum > .028 || kind === 'RoundedBoxGeometry') {
        object.geometry = roundedGeometry(size, radius, kind === 'RoundedBoxGeometry' ? 3 : 1);
        object.scale.set(1, 1, 1);
      }
    } else if (kind === 'CylinderGeometry') object.geometry = cylinderGeometry;
    else if (kind === 'SphereGeometry') object.geometry = sphereGeometry;
  });
}

function sofaDetail(group, m) {
  const sofas = [];
  group.traverse(object => {
    if (!object.isGroup || object.name.startsWith('bed:')) return;
    if (object.children.some(c => c.isMesh && Math.abs(c.position.y - .16) < .001 && dimensions(c)[0] > .7)) sofas.push(object);
  });
  for (const sofa of sofas) {
    sofa.userData.hdDetail = 'stitched-upholstery';
    for (const part of [...sofa.children]) {
      if (!part.isMesh) continue;
      const [w,h,d] = dimensions(part);
      if (Math.abs(part.position.y - .62) < .001) {
        horizontalSeam(part, w-.026, d-.026, h*.33, part.material);
      } else if (Math.abs(part.position.y - .88) < .001) {
        verticalSeam(part, w-.025, h-.025, d/2-.008, part.material);
        // A pair of shallow creases catches grazing light without an inflated shape.
        for (const side of [-1,1]) tube(part, [
          [side*w*.43,-h*.3,d*.29], [side*w*.33,-h*.19,d*.49], [side*w*.19,-h*.09,d*.47],
        ], .003, part.material, {segments:10,name:'hd:cushion-crease'});
      }
    }
    const body = sofa.children.find(c => c.isMesh && Math.abs(c.position.y - .16) < .001);
    if (body) {
      const [w,,d] = dimensions(body);
      for (const x of [-w/2+.13,w/2-.13]) for (const z of [-d/2+.12,d/2-.12]) {
        cylinder(sofa,.035,.09,[x,.052,z],m.metal,'hd:sofa-foot');
      }
    }
  }
}

function clothHeight(x, z, width, depth, amplitude, thickness) {
  const nx=Math.abs(x)/(width/2),nz=Math.abs(z)/(depth/2);
  const fold=amplitude*(Math.sin(x*21+z*5)+.42*Math.sin(z*35-x*9));
  return thickness/2+fold*(.35+.65*nx)-thickness*.34*Math.pow(Math.max(nx,nz),9);
}

function clothGeometry(width, depth, amplitude = .013, thickness = .05, underlay = null) {
  // One closed fabric volume: the folded top replaces the flat backing surface.
  // The lower face stays below every fold, so no competing coplanar top remains.
  const geometry = new THREE.BoxGeometry(width, thickness, depth, 28, 1, 26);
  const positions = geometry.getAttribute('position');
  for (let i=0; i<positions.count; i++) {
    const x=positions.getX(i),z=positions.getZ(i),offset=underlay?.(x,z)||0;
    positions.setY(i,offset+(positions.getY(i)>0?clothHeight(x,z,width,depth,amplitude,thickness):-thickness/2));
  }
  geometry.computeVertexNormals();
  geometry.userData.closedCloth={width,depth,amplitude,thickness};
  partGeometries.add(geometry);
  return geometry;
}

function clothHem(parent,width,depth,amplitude,thickness,material,underlay=null) {
  const points=rectanglePoints(width-.014,depth-.014,.035).map(([x,z])=>[
    x,clothHeight(x,z,width,depth,amplitude,thickness)+(underlay?.(x,z)||0)+.001,z,
  ]);
  tube(parent,points,.002,material,{closed:true,segments:64,name:'hd:cloth-hem'});
}

function bedDetail(group,m) {
  const beds = [];
  group.traverse(object => { if(object.name.startsWith('bed:')) beds.push(object); });
  for (const bed of beds) {
    const mattress = bed.children.find(c => c.isMesh && Math.abs(c.position.y-.53)<.001);
    if (!mattress) continue;
    const [width,,depth] = dimensions(mattress);
    const duvet = bed.children.find(c => c.isMesh && Math.abs(c.position.y-.67)<.001);
    if (duvet) {
      const [w,,d] = dimensions(duvet);
      duvet.geometry=clothGeometry(w,d,.013,.05);
      duvet.material=m.cushion;
      duvet.name='hd:duvet-folds';
      clothHem(duvet,w,d,.013,.05,m.cushion);
    }
    // Folded coverlet remains on the mattress, clear of all walking routes.
    const throwWidth=width-.025,throwDepth=.45;
    const throwY=.711,throwZ=depth*.34,duvetWidth=dimensions(duvet)[0],duvetDepth=dimensions(duvet)[2];
    const underlay=(x,z)=>duvet.position.y+clothHeight(x,Math.min(duvetDepth/2,z+throwZ-duvet.position.z),duvetWidth,duvetDepth,.013,.05)-throwY+.038/2+.001;
    const coverlet=mesh(bed,clothGeometry(throwWidth,throwDepth,.007,.038,underlay),m.curtain,[0,throwY,throwZ],'hd:coverlet-folds');
    clothHem(coverlet,throwWidth,throwDepth,.007,.038,m.curtain,underlay);
    for (const pillow of bed.children.filter(c => c.isMesh && Math.abs(c.position.y-.76)<.001 && dimensions(c)[1]<.2)) {
      const [w,h,d]=dimensions(pillow);
      horizontalSeam(pillow,w-.02,d-.02,h*.23,m.cushion);
    }
    horizontalSeam(mattress,width-.032,depth-.032,.065,m.cushion);
    const headboard=bed.children.find(c => c.isMesh && Math.abs(c.position.y-.76)<.001 && dimensions(c)[1]>.3);
    if (headboard && bed.name==='bed:platform') {
      const [w,h,d]=dimensions(headboard);
      verticalSeam(headboard,w-.06,h-.06,d/2+.001,m.leather);
      for (const x of [-w/6,w/6]) tube(headboard,[[x,-h*.4,d/2],[x,h*.4,d/2]],.004,m.leather,{smooth:false,segments:1,name:'hd:headboard-stitch'});
    }
    bed.userData.hdDetail='shaped-bedding';
  }
}

function plate(parent,x,z,m) {
  const g=new THREE.Group();g.name='hd:place-setting';g.position.set(x,0,z);parent.add(g);
  block(g,[.3,.005,.31],[0,.824,0],m.curtain,.004);
  mesh(g,plateGeometry,m.white,[0,.839,0],'hd:ceramic-plate');
  block(g,[.065,.007,.14],[0,.845,0],m.curtain,.004);
  // A shaped fork and knife remain on the placemat at normal dining scale.
  block(g,[.013,.005,.104],[-.148,.834,.039],m.metal,.002,'hd:fork-handle');
  block(g,[.025,.004,.022],[-.148,.835,-.023],m.metal,.001);
  for(let i=0;i<4;i++)block(g,[.0034,.004,.031],[-.159+i*.0073,.835,-.046],m.metal,.001,'hd:fork-tine');
  block(g,[.014,.006,.096],[.148,.834,.043],m.metal,.002,'hd:knife-handle');
  block(g,[.019,.003,.077],[.15,.835,-.034],m.metal,.002,'hd:knife-blade');
  // Low clear tumbler, with an open rim rather than a solid glass cylinder.
  const glassGeometry=new THREE.CylinderGeometry(.034,.028,.085,20,1,true);
  partGeometries.add(glassGeometry);
  mesh(g,glassGeometry,m.glass,[.127,.87,-.13]);
  return g;
}

function basinGeometry(width) {
  // One continuous ceramic shell: the bowl replaces the old solid insert.
  // The square outer rim and curved inner basin share vertices, so close views
  // expose a real recess without coplanar surfaces or a hidden flat top.
  const rings=[
    [0,0,.675,1],[width*.47,.2,.675,.5],[width*.5,.22,.688,.5],
    [width*.5,.22,.85,.5],[width*.485,.213,.865,.5],
    [width*.355,.157,.865,1],[width*.34,.15,.857,1],
    [width*.255,.106,.778,1],[.035,.03,.766,1],[0,0,.765,1],
  ];
  const positions=[],uvs=[],indices=[],segments=48;
  for(const [rx,rz,y,power] of rings)for(let i=0;i<=segments;i++) {
    const angle=i/segments*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
    const x=Math.sign(c)*Math.abs(c)**power*rx,z=Math.sign(s)*Math.abs(s)**power*rz;
    positions.push(x,y,z);uvs.push(x/width+.5,z/.44+.5);
  }
  for(let row=0;row<rings.length-1;row++)for(let i=0;i<segments;i++) {
    const a=row*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.userData.recessedBasin={width,rimY:.865,bowlY:.765};
  partGeometries.add(geometry);return geometry;
}

function diningDetail(group,room,m) {
  const b=roomBounds(room),width=Math.min(1.2,b.w*.46),depth=Math.min(2.45,b.d*.62),count=depth>1.9?3:2;
  for(let i=0;i<count;i++) {
    const z=b.z-depth/2+(i+.5)*depth/count;
    plate(group,b.x-width/2+.21,z,m);
    plate(group,b.x+width/2-.21,z,m).rotation.y=Math.PI;
  }
  plate(group,b.x,b.z-depth/2+.22,m).rotation.y=Math.PI/2;
  plate(group,b.x,b.z+depth/2-.22,m).rotation.y=-Math.PI/2;
  for(const chair of group.children.filter(c=>c.name==='chair')) {
    const seat=chair.children.find(c=>c.isMesh&&Math.abs(c.position.y-.48)<.001);
    if(seat)horizontalSeam(seat,.425,.445,.045,m.sofa,.0027);
    const back=chair.children.find(c=>c.isMesh&&Math.abs(c.position.y-.76)<.001);
    if(back)verticalSeam(back,.413,.5,.043,m.sofa);
  }
}

function bathroomDetail(group,m) {
  for(const fixture of group.children) {
    const type=fixture.name;
    if(type==='fixture:basin') {
      const base=fixture.children.find(c=>c.isMesh&&Math.abs(c.position.y-.77)<.001);
      const width=base?dimensions(base)[0]:.6;
      if(base) {
        base.geometry=basinGeometry(width);base.position.set(0,0,0);base.name='hd:recessed-basin';
        const insert=fixture.children.find(c=>c.isMesh&&Math.abs(c.position.y-.878)<.001);
        insert?.removeFromParent();
      }
      const drain=mesh(fixture,discGeometry,m.metal,[0,.769,0],'hd:basin-drain');drain.scale.set(.019,.004,.019);
      cylinder(fixture,.022,.085,[-width*.35,.911,-.09],m.cabinet,'hd:soap-dispenser');
      block(fixture,[.038,.012,.018],[-width*.35,.959,-.088],m.metal,.003);
      tube(fixture,[[-width*.27,.58,.226],[width*.27,.58,.226]],.011,m.metal,{smooth:false,segments:1,name:'hd:towel-rail'});
      block(fixture,[Math.min(.22,width*.4),.27,.018],[0,.473,.231],m.cushion,.006,'hd:hand-towel');
      // Slim reflected edge gives the existing mirror a finished frame.
      for(const x of [-width*.45,width*.45])block(fixture,[.012,.72,.016],[x,1.5,-.202],m.metal,.003);
    } else if(type==='fixture:toilet') {
      const points=Array.from({length:32},(_,i)=>[Math.cos(i/32*Math.PI*2)*.213,.498,.049+Math.sin(i/32*Math.PI*2)*.284]);
      tube(fixture,points,.012,m.white,{closed:true,segments:40,name:'hd:toilet-seat-rim'});
      cylinder(fixture,.015,.014,[.025,.665,-.26],m.metal,'hd:dual-flush');
    } else if(type==='fixture:shower') {
      const screen=fixture.children.find(c=>c.isMesh&&dimensions(c)[1]>1.8);
      if(screen) {
        const [w,h,d]=dimensions(screen),p=screen.position;
        if(w<.1)for(const z of [-d/2,d/2])block(fixture,[.019,h,.025],[p.x,p.y,p.z+z],m.metal,.004,'hd:shower-trim');
        else for(const x of [-w/2,w/2])block(fixture,[.025,h,.019],[p.x+x,p.y,p.z],m.metal,.004,'hd:shower-trim');
      }
      const riser=fixture.children.find(c=>c.isMesh&&c.geometry.type==='CylinderGeometry'&&c.scale.y>1);
      if(riser) {
        const p=riser.position;
        tube(fixture,[[p.x,.99,p.z],[p.x+.065,.73,p.z+.035],[p.x+.09,.7,p.z+.04],[p.x+.06,1.27,p.z+.025]],.006,m.metal,{segments:18,name:'hd:shower-hose'});
      }
    } else if(type==='fixture:bathtub') {
      const base=fixture.children.find(c=>c.isMesh&&Math.abs(c.position.y-.285)<.001);
      if(base) {
        const [w,,d]=dimensions(base);
        const drain=mesh(fixture,discGeometry,m.metal,[w*.24,.593,0],'hd:tub-drain');drain.scale.set(.025,.006,.025);
        // Rolled towel on the existing rear rim, within its footprint.
        const towel=cylinder(fixture,.052,.32,[w*.14,.63,-d*.39],m.cushion,'hd:rolled-towel');towel.rotation.z=Math.PI/2;
      }
    }
  }
}

function desktopDetail(desk,b,m) {
  const z=b.z1-1.55;
  const keyboard=block(desk,[.17,.018,.42],[b.x0+.57,.889,z-.34],m.frame,.005,'hd:keyboard');
  // Relief rows read as keys at room scale; individual keycaps would add noise.
  for(let row=0;row<4;row++)block(keyboard,[.025,.002,.37],[-.053+row*.034,.01,0],m.black,.001);
  block(desk,[.18,.009,.19],[b.x0+.57,.886,z+.1],m.rug,.01,'hd:mouse-mat');
  ball(desk,[.031,.019,.047],[b.x0+.56,.908,z+.1],m.black);
  block(desk,[.16,.32,.4],[b.x0+.39,1.04,z+.96],m.black,.016,'hd:desktop-tower');
  for(let i=0;i<7;i++)block(desk,[.003,.012,.24],[b.x0+.474,.956+i*.035,z+.96],m.frame,.001);
  cylinder(desk,.045,.09,[b.x0+.37,.922,z-.99],m.white,'hd:desk-cup');
}

function builtinDetail(group,room,m) {
  const b=roomBounds(room);
  const desk=group.getObjectByName('computer-desk');
  if(desk)desktopDetail(desk,b,m);
  // Subtle edge seams on large fronts are contained by their original boxes.
  const fronts=[];
  group.traverse(object=>{
    if(!object.isMesh||object.material!==m.cabinet&&object.material!==m.timber)return;
    const [w,h,d]=dimensions(object);
    if(h>2&&Math.max(w,d)>1&&Math.min(w,d)>.3)fronts.push(object);
  });
  for(const front of fronts) {
    const [w,h,d]=dimensions(front);
    if(w>d) {
      const count=Math.max(2,Math.round(w/.55));
      for(let i=1;i<count;i++)tube(front,[[-w/2+i*w/count,-h*.45,d/2+.001],[-w/2+i*w/count,h*.45,d/2+.001]],.003,m.frame,{smooth:false,segments:1,name:'hd:joinery-reveal'});
    } else {
      const count=Math.max(2,Math.round(d/.55));
      for(let i=1;i<count;i++)tube(front,[[-w/2-.001,-h*.45,-d/2+i*d/count],[-w/2-.001,h*.45,-d/2+i*d/count]],.003,m.frame,{smooth:false,segments:1,name:'hd:joinery-reveal'});
    }
  }
  if(room.kind==='kitchen'&&room.id!=='f1-g04-prep') {
    // One board and a pair of canisters on the rear counter; no new floor obstacles.
    block(group,[.34,.016,.25],[b.x+.48,.894,b.z0+.4],m.timber,.016,'hd:kitchen-board');
    for(let i=0;i<2;i++) {
      cylinder(group,.055,.13+i*.035,[b.x+.85+i*.14,.96+i*.0175,b.z0+.34],m.white,'hd:kitchen-canister');
      cylinder(group,.06,.012,[b.x+.85+i*.14,1.031+i*.035,b.z0+.34],m.timber);
    }
  }
}

export function createHDFurniture(room,m) {
  const group=createFurniture(room,m);
  refineGeometry(group);
  sofaDetail(group,m);
  bedDetail(group,m);
  if(room.kind==='dining')diningDetail(group,room,m);
  if((room.kind||'').includes('bath'))bathroomDetail(group,m);
  group.userData.detailLevel='hd';
  return group;
}

export function createHDBuiltins(room,m) {
  const group=createBuiltins(room,m);
  refineGeometry(group);
  builtinDetail(group,room,m);
  group.userData.detailLevel='hd';
  return group;
}

// Call after a scene is permanently disposed, not when switching SD / HD.
export function disposeHDFurnitureGeometries() {
  for(const geometry of partGeometries)geometry.dispose();
  partGeometries.clear();roundedCache.clear();
}
