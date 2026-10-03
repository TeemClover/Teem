import * as THREE from './vendor/three.module.min.js';

/** Lightweight exterior of /showcase/house/, in the reference plan's metre coordinates.
 * The upper west wing sits OVER the carport; the centre/east facade steps back.
 * Keep interiors and HD texture downloads in the full house viewer, not this exhibit.
 */
export function miniatureHouse() {
  const root = new THREE.Group(); root.name = 'reference-house-miniature';
  const shell = new THREE.Group(); root.add(shell);
  const scale = 0.055; shell.scale.setScalar(scale); shell.position.set(-6.75 * scale, 0, 4.8 * scale);
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.68, ...options});
  const wall = material('#eeeae2'), trim = material('#faf8f1'), taupe = material('#9d998c');
  const frame = material('#283532'), glass = material('#8eaeb0', {roughness: 0.18, metalness: 0.35});
  const roofMat = material('#ca8864', {side: THREE.DoubleSide}), panelMat = material('#24354a', {roughness: 0.25, metalness: 0.45});
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(size, at, mat, name = '') {
    const mesh = new THREE.Mesh(cube, mat); mesh.scale.set(...size); mesh.position.set(...at);
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; shell.add(mesh); return mesh;
  }
  const block = (x0, x1, z0, z1, y0, y1, mat = wall, name = '') => box([x1-x0,y1-y0,z1-z0], [(x0+x1)/2,(y0+y1)/2,(z0+z1)/2], mat, name);
  // Ground floor: service rooms behind the open carport, living/dining to the east.
  block(-.6,5.5,-10.3,-3.5,0,2.7,wall,'service-wing');
  block(5.5,14.1,-10.3,-2.05,0,2.7,wall,'living-wing');
  block(-.6,5.5,-10.3,.05,2.7,3.29,trim,'carport-ceiling');
  block(5.5,14.1,-10.3,-1.6,2.7,3.29,trim);
  // Three stepped upper volumes, matching the 0 / -1.6 / -1.85 front-wall datums.
  block(-.6,5.5,-10.3,0,3.29,6.31,wall,'upper-west');
  block(5.5,9.8,-10.3,-1.6,3.29,6.19,wall,'upper-centre');
  block(9.8,14.1,-10.3,-1.85,3.29,6.19,wall,'upper-east');
  for (const x of [.05,5.2]) block(x-.15,x+.15,-.02,.32,0,2.7,taupe,'carport-column');
  block(0,5.5,-3.5,.65,-.1,-.015,taupe,'driveway');
  block(5.5,9.8,-2.05,0,-.12,-.02,trim);
  block(9.8,14.35,-2.05,-.8,-.08,-.01,trim);

  // Each pane sits in front of a dark frame, with an explicit gap from its wall.
  function windowAt(x,y,z,w,h,rotation=0,panes=3) {
    const group = new THREE.Group(); group.position.set(x,y,z); group.rotation.y=rotation; shell.add(group);
    const backing = new THREE.Mesh(cube,frame); backing.scale.set(w+.16,h+.16,.06); group.add(backing);
    for (let i=0;i<panes;i++) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(w/panes-.045,h),glass);
      pane.position.set(-w/2+(i+.5)*w/panes,0,.034); group.add(pane);
    }
  }
  windowAt(7.65,1.2,-1.99,3.1,2.3); windowAt(11.6,1.2,-1.99,3.1,2.3);
  windowAt(4.35,1.08,-3.44,1.2,2.1,0,1); windowAt(2.45,1.38,-3.44,.85,1.85,0,1);
  windowAt(2.725,4.48,.06,3.15,2.3); windowAt(7.575,4.515,-1.54,2.55,2.15);
  windowAt(11.825,4.48,-1.79,3.15,2.3);
  for (const [z,w] of [[-8.525,1.75],[-4.875,3.15]]) windowAt(14.16,1.18,z,w,2.25,Math.PI/2);
  for (const [z,w] of [[-5.4,1.8],[-3.275,1.25]]) windowAt(14.16,4.69,z,w,1.8,Math.PI/2,2);
  for (const [z,w,h,y] of [[-8.55,2.1,1.8,4.69],[-6.3,.7,.6,5.19],[-4.525,.65,.6,5.19],[-2.2,1.6,1.8,4.69]]) windowAt(-.66,y,z,w,h,-Math.PI/2,2);
  windowAt(-.66,1.65,-8.9,1.5,1.1,-Math.PI/2,2);
  for (const [x,w,h,y] of [[.6,1.6,1.1,1.65],[3.85,2.7,1.15,1.625],[9.875,.55,.6,2],[12.275,2.45,2.25,1.125],[1.7,2.3,1.8,4.69],[10.4,.9,.65,5.215]]) windowAt(x,y,-10.36,w,h,Math.PI,Math.max(1,Math.round(w)));
  windowAt(7,2.98,-10.36,2.1,5.5,Math.PI,2); // tall rear stair-hall glazing
  // Glass balconies project from BOTH bedroom wings; the west one is above the car.
  function balcony(x0,x1,back,front) {
    block(x0,x1,back,front,3.16,3.25,trim,'balcony-slab');
    const rail = material('#aac5c4',{transparent:true,opacity:.55,roughness:.2,depthWrite:false});
    box([x1-x0,.78,.025],[(x0+x1)/2,3.77,front-.04],rail);
    box([x1-x0,.045,.06],[(x0+x1)/2,4.23,front-.04],frame);
    for(const x of [x0+.04,(x0+x1)/2,x1-.04]) box([.05,.9,.05],[x,3.75,front-.04],frame);
    for(const x of [x0+.04,x1-.04]) {
      box([.025,.78,front-back-.10],[x,3.77,(front+back)/2-.05],rail);
      box([.06,.045,front-back-.10],[x,4.23,(front+back)/2-.09],frame);
    }
  }
  balcony(-.55,5.45,.055,.95); balcony(9.85,14.3,-1.79,-.4);
  // Slim vertical facade fins and broad white eaves reproduce the reference's silhouette.
  for(const [x,z] of [[-.35,.13],[5.2,.13],[9.95,-1.72],[13.9,-1.72]]) for(let i=0;i<3;i++) box([.065,2.8,.16],[x+(i-1)*.12,4.85,z],taupe);
  block(-.82,5.72,-10.52,.22,6.32,6.43,trim);
  block(5.73,14.32,-10.52,-1.38,6.20,6.30,trim);
  function quad(points,mat) {
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;shell.add(mesh);
  }
  function hip(x0,x1,z0,z1,y,solar=false) {
    const inset=Math.min(x1-x0,z1-z0)*.44,cx=(x0+x1)/2,ra=z0+inset,rb=z1-inset,rise=1.2;
    const faces=[[[x0,y,z0],[x0,y,z1],[cx,y+rise,rb],[cx,y+rise,ra]],[[x1,y,z1],[x1,y,z0],[cx,y+rise,ra],[cx,y+rise,rb]],[[x1,y,z0],[x0,y,z0],[cx,y+rise,ra],[cx,y+rise,ra]],[[x0,y,z1],[x1,y,z1],[cx,y+rise,rb],[cx,y+rise,rb]]];
    faces.forEach(face=>quad(face,roofMat));
    if(solar) for(const face of [faces[1],faces[2]]) { // east and rear banks, as in the reference viewer
      const [a,b,c,d]=face.map(p=>new THREE.Vector3(...p)),base=a.clone().add(b).multiplyScalar(.5),top=c.clone().add(d).multiplyScalar(.5);
      const across=b.clone().sub(a).normalize(),slope=top.clone().sub(base),length=slope.length(),up=slope.clone().normalize();
      const point=(x,h)=>base.clone().addScaledVector(across,x).addScaledVector(up,h).add(new THREE.Vector3(0,.07,0)).toArray();
      for(let row=0;row<2;row++) {const h=.32+row*1.35,end=h+1.28;if(end>length-.2)continue;
        const cols=Math.floor((a.distanceTo(b)+(c.distanceTo(d)-a.distanceTo(b))*end/length-.55)/1.09);
        for(let col=0;col<cols;col++) {const x=(col-(cols-1)/2)*1.09;quad([point(x-.51,h),point(x+.51,h),point(x+.51,end),point(x-.51,end)],panelMat);}
      }
    }
  }
  hip(-.95,5.85,-10.65,.35,6.45); hip(5.25,14.45,-10.65,-1.25,6.33,true);
  // White SUV parked beneath the upper west wing, not beside the house.
  box([1.65,.65,2.9],[2.7,.43,-1.4],trim,'car');box([1.5,.6,1.7],[2.7,1.03,-1.65],glass);
  box([1.62,.08,1.8],[2.7,1.37,-1.65],trim);
  const tyre=material('#30332f');for(const x of [1.88,3.52]) for(const z of [-2.3,-.45]) {
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.18,10),tyre);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.26,z);shell.add(wheel);
  }
  return root;
}
