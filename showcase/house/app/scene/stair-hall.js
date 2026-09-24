import * as THREE from 'three';

const TAU=Math.PI*2;
const DEFAULT_HOLE=[[5.5,-10.3],[8.5,-10.3],[8.5,-7.4],[5.5,-7.4]];

export function stairHallBounds(house) {
  const hall=house.rooms?.find(room=>room.id==='f2-204-hall');
  const points=[...(house.stair?.holePolygon||DEFAULT_HOLE),...(hall?.polygon||[])];
  const elevation=house.floors?.find(floor=>floor.id==='f2')?.elevation??3.29;
  return {min:[Math.min(...points.map(p=>p[0])),0,Math.min(...points.map(p=>p[1]))],
    max:[Math.max(...points.map(p=>p[0])),elevation+2.7,Math.max(...points.map(p=>p[1]))]};
}

/**
 * Staircase coordinates are f1-local. Landing, chandelier and canopy are f2-local.
 * Keep canopy separate: a ceiling disk must not hide the rings in a cutaway view.
 * All detail uses shared materials/geometries and can be consolidated by material.
 */
export function createStairHall({house,materials:m,quality='sd'}) {
  const hd=quality==='hd',geometries=new Set(),ownedMaterials=[];
  const geometry=value=>(geometries.add(value),value);
  const own=value=>(ownedMaterials.push(value),value);
  const cube=geometry(new THREE.BoxGeometry(1,1,1));
  const cylinder=geometry(new THREE.CylinderGeometry(1,1,1,hd?40:24));
  const wire=geometry(new THREE.CylinderGeometry(1,1,1,hd?6:4));
  const crystal=hd?geometry(new THREE.IcosahedronGeometry(1,0)):null;
  const chrome=own(new THREE.MeshStandardMaterial({color:hd?'#d2d9e3':'#bbc5d1',metalness:hd?.72:.6,roughness:hd?.32:.3}));
  chrome.name=`${quality}:chandelier-chrome`;
  const luminous=own(new THREE.MeshStandardMaterial({color:'#f4f7ff',emissive:'#dbe5ff',emissiveIntensity:hd?2.7:.85,roughness:.2,metalness:.05}));
  luminous.name=`${quality}:chandelier-crystal-core`;
  const cutCrystal=hd?own(new THREE.MeshPhysicalMaterial({color:'#edf2ff',emissive:'#c9d9ff',emissiveIntensity:1.4,metalness:.065,roughness:.11,clearcoat:1,clearcoatRoughness:.06,flatShading:true})):luminous;
  if(hd)cutCrystal.name='hd:chandelier-cut-crystal';
  const stairs=new THREE.Group(),landing=new THREE.Group(),chandelier=new THREE.Group(),canopy=new THREE.Group();
  stairs.name='return-stair';landing.name='stair-arrival-landing';chandelier.name='eight-ring-chandelier';canopy.name='chandelier-ceiling-canopy';
  const add=(parent,g,material,position,scale,name='')=>{
    const mesh=new THREE.Mesh(g,material);mesh.position.set(...position);if(scale)mesh.scale.set(...scale);mesh.name=name;
    mesh.castShadow=material!==luminous&&material!==cutCrystal;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const box=(parent,size,position,material,name='')=>add(parent,cube,material,position,size,name);
  const line=(parent,from,to,radius,material,name='')=>{
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
    const mesh=add(parent,wire,material,a.add(b).multiplyScalar(.5).toArray(),[radius,delta.length(),radius],name);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
  };
  const hole=house.stair?.holePolygon||DEFAULT_HOLE;
  const x0=Math.min(...hole.map(p=>p[0])),x1=Math.max(...hole.map(p=>p[0])),z0=Math.min(...hole.map(p=>p[1])),z1=Math.max(...hole.map(p=>p[1]));
  const width=x1-x0,depth=z1-z0,height=house.floors?.find(floor=>floor.id==='f2')?.elevation??3.29;
  const flights=Math.max(6,Math.round((house.stair?.stepCount||20)/2)),rise=height/(flights*2),tread=(depth-.65)/flights;
  const flightWidth=width*.30,left=x0+.1+flightWidth/2,right=x1-.1-flightWidth/2;
  const start=z1-tread/2,end=start-(flights-1)*tread;
  // Slimmer flights keep the original hole and route while opening the central
  // sightline for the owner-confirmed double-height chandelier.
  for(let i=0;i<flights;i++) {
    for(const [x,y,z] of [[left,(i+1)*rise,start-i*tread],[right,(i+flights+1)*rise,end+i*tread]]) {
      box(stairs,[flightWidth,rise+.018,tread+.018],[x,y-rise/2,z],m.trim,'stair-riser');
      const step=box(stairs,[flightWidth+.018,.035,tread+.021],[x,y+.0175,z],m.timber,'stair-tread');
      step.userData.treadTop=y+.035;
      if(hd)box(stairs,[flightWidth+.02,.012,.024],[x,y+.013,z+(x===left?1:-1)*tread/2],m.darkWood,'hd:stair-nosing');
    }
  }
  // Two slender enclosed stringers support the treads without a solid block
  // through the center well. They follow the same two original flights.
  for(const [x,a,b] of [[left,[rise-.1,start],[height/2-.1,end]],[right,[height/2+rise-.1,end],[height-.1,start]]]) {
    const from=new THREE.Vector3(x,a[0],a[1]),to=new THREE.Vector3(x,b[0],b[1]);
    const beam=box(stairs,[flightWidth-.025,from.distanceTo(to)+tread,.13],from.clone().add(to).multiplyScalar(.5).toArray(),m.trim,'stair-stringer');
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());
  }
  box(stairs,[width-.2,.15,.65],[(x0+x1)/2,height/2-.0575,z0+.325],m.timber,'stair-half-landing');
  const railX=[left+flightWidth/2+.017,right-flightWidth/2-.017];
  for(let side=0;side<2;side++) {
    const at=(t)=>[railX[side],side===0?rise+(height/2-rise)*t:height-(height/2-rise)*t,start+(end-start)*t];
    for(let i=0;i<6;i++) {
      const [x,y,z]=at(i/5);
      box(stairs,[.023,.87,.023],[x,y+.452,z],m.frame,'stair-baluster');
      if(hd)box(stairs,[.055,.022,.055],[x,y+.018,z],chrome,'hd:railing-foot');
    }
    for(const elevation of [.36,.65]) {
      const a=at(0),b=at(1);a[1]+=elevation;b[1]+=elevation;
      line(stairs,a,b,.009,m.frame,'stair-rail');
    }
    const a=at(0),b=at(1);a[1]+=.91;b[1]+=.91;
    line(stairs,a,b,.026,m.timber,'stair-oak-handrail');
  }
  const innerRight=right-flightWidth/2-.075,railZ=z1+.075;
  box(landing,[flightWidth+.075,.13,.40],[right,-.0825,z1+.19],m.timber,'upper-arrival-tread');
  // Guard the open well but leave the right-hand arrival and corridor open.
  for(let i=0;i<=4;i++) {
    const x=x0+.08+(innerRight-x0-.08)*i/4;
    box(landing,[.03,.94,.03],[x,.47,railZ],m.frame,'landing-baluster');
    if(hd)box(landing,[.07,.022,.07],[x,.011,railZ],chrome,'hd:railing-foot');
  }
  for(const y of [.32,.63])box(landing,[innerRight-x0-.055,.023,.023],[(innerRight+x0+.08)/2,y,railZ],m.frame,'landing-rail');
  box(landing,[innerRight-x0-.03,.055,.063],[(innerRight+x0+.08)/2,.955,railZ],m.timber,'landing-oak-handrail');

  const centerX=(x0+x1)/2,centerZ=(z0+z1)/2-.035,ceilingY=height+2.62;
  const rings=[
    {radius:.94,y:height+2.10,tilt:[-.48,.10]},
    {radius:.77,y:height+1.72,tilt:[.11,-.065]},
    {radius:.59,y:height+1.40,tilt:[-.40,.065]},
    {radius:.445,y:height+.86,tilt:[.42,-.09]},
    {radius:.375,y:height+.45,tilt:[-.42,.055]},
    {radius:.305,y:height+.06,tilt:[.13,-.05]},
    {radius:.235,y:height-.30,tilt:[-.38,.045]},
    {radius:.165,y:height-.63,tilt:[.06,-.03]},
  ];
  const ringBand=(radius,radialWidth,bandHeight,segments)=>geometry(new THREE.LatheGeometry([
    [radius-radialWidth/2,-bandHeight/2],[radius+radialWidth/2,-bandHeight/2],
    [radius+radialWidth/2,bandHeight/2],[radius-radialWidth/2,bandHeight/2],
    [radius-radialWidth/2,-bandHeight/2],
  ].map(([r,y])=>new THREE.Vector2(r,y)),segments));
  for(const [index,definition] of rings.entries()) {
    const {radius,y,tilt}=definition,ring=new THREE.Group();ring.name=`chandelier-ring-${index+1}`;
    ring.position.set(centerX,y-height,centerZ);ring.rotation.set(tilt[0],0,tilt[1]);
    ring.userData.radius=radius;ring.userData.level=y;chandelier.add(ring);
    const segments=hd?Math.max(40,Math.ceil(radius*88)):40,bandHeight=hd?.068:.075;
    add(ring,ringBand(radius,hd?.028:.049,bandHeight,segments),luminous,[0,0,0],null,'luminous-ring-core');
    for(const side of [-1,1])add(ring,ringBand(radius,.055,.006,segments),chrome,[0,side*(bandHeight/2+.006),0],null,'polished-ring-edge');
    if(hd) {
      const count=Math.max(24,Math.round(TAU*radius/.045));
      for(let i=0;i<count;i++) {
        const angle=i/count*TAU;
        const bead=add(ring,crystal,cutCrystal,[Math.cos(angle)*radius,0,Math.sin(angle)*radius],[.027,.047,.034],'hd:crystal-prism');
        bead.rotation.y=-angle;
        if(i%3===0)bead.rotation.x=.14;
      }
    }
    // Three suspension points per ring rise to the same canopy. No dynamic
    // lights or screen-space glitter; the crystal facets react to scene light.
    ring.updateMatrix();
    for(let i=0;i<3;i++) {
      const angle=i/3*TAU+index*.47;
      const bottom=new THREE.Vector3(Math.cos(angle)*radius,bandHeight/2+.012,Math.sin(angle)*radius).applyMatrix4(ring.matrix);
      line(chandelier,bottom.toArray(),[bottom.x,ceilingY-height-.028,bottom.z],hd?.0026:.0034,chrome,'chandelier-suspension');
      if(hd)add(canopy,cylinder,chrome,[bottom.x,ceilingY-height-.043,bottom.z],[.009,.024,.009],'hd:suspension-anchor');
    }
  }
  add(canopy,cylinder,chrome,[centerX,ceilingY-height,centerZ],[1.01,.043,1.01],'ceiling-canopy-disc');
  add(canopy,cylinder,m.trim,[centerX,ceilingY-height+.032,centerZ],[1.035,.023,1.035],'ceiling-canopy-trim');
  chandelier.userData={quality,ringCount:8,ownerReference:'eight descending inclined crystal rings',center:[centerX,centerZ]};
  stairs.userData={quality,holeBounds:[x0,z0,x1,z1],flightWidth,centralClearWidth:railX[1]-railX[0]};
  const disposeGeometries=()=>{for(const g of geometries)g.dispose();geometries.clear();};
  return {stairs,landing,chandelier,canopy,materials:ownedMaterials,focusBounds:stairHallBounds(house),disposeGeometries,
    dispose(){disposeGeometries();for(const material of ownedMaterials)material.dispose();}};
}
