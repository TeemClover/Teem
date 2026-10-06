import * as THREE from './vendor/three.module.min.js';

/** Lightweight exterior of /showcase/house/, in the reference plan's metre coordinates.
 * The upper west wing sits OVER the carport; the centre/east facade steps back.
 * Keep interiors and HD texture downloads in the full house viewer, not this exhibit.
 */
export function miniatureHouse() {
  const root = new THREE.Group(); root.name = 'reference-house-miniature';
  const shell = new THREE.Group(); root.add(shell);
  const scale = 0.055; shell.scale.setScalar(scale); shell.position.set(-6.75 * scale, 0, 4.8 * scale);
  const material = color => new THREE.MeshLambertMaterial({color});
  const wall = material('#eeeae2'), trim = material('#faf8f1'), taupe = material('#9d998c');
  const frame = material('#283532'), glass = material('#8eaeb0');
  const roofMat = material('#ca8864'), panelMat = material('#24354a');
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(size, at, mat, name = '') {
    const mesh = new THREE.Mesh(cube, mat); mesh.scale.set(...size); mesh.position.set(...at);
    mesh.name = name; shell.add(mesh); return mesh;
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
  // Two flat faces suggest the window and frame; sub-pixel mullions are omitted.
  function windowAt(x,y,z,w,h,rotation=0) {
    const group = new THREE.Group(); group.position.set(x,y,z); group.rotation.y=rotation; shell.add(group);
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(w+.16,h+.16),frame); group.add(backing);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w,h),glass);
    pane.position.z=.012; group.add(pane);
  }
  windowAt(7.65,1.2,-1.99,3.1,2.3); windowAt(11.6,1.2,-1.99,3.1,2.3);
  windowAt(4.35,1.08,-3.44,1.2,2.1); windowAt(2.45,1.38,-3.44,.85,1.85);
  windowAt(2.725,4.48,.06,3.15,2.3); windowAt(7.575,4.515,-1.54,2.55,2.15);
  windowAt(11.825,4.48,-1.79,3.15,2.3);
  // Only broad side windows and the distinctive rear stair glazing read at this size.
  windowAt(14.16,1.3,-5.2,3,2.1,Math.PI/2); windowAt(14.16,4.6,-4.7,2.8,1.9,Math.PI/2);
  windowAt(-.66,4.6,-3,2.2,1.9,-Math.PI/2);
  windowAt(7,2.98,-10.36,2.1,5.5,Math.PI);
  // Simple open rails keep both balconies recognizable without transparent glass passes.
  function balcony(x0,x1,back,front) {
    block(x0,x1,back,front,3.16,3.25,trim,'balcony-slab');
    // A flat dark rail replaces the tiny six-piece balustrade.
    const rail=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,.08),frame);
    rail.position.set((x0+x1)/2,4.18,front-.04); shell.add(rail);
  }
  balcony(-.55,5.45,.055,.95); balcony(9.85,14.3,-1.79,-.4);
  // Keep the broad eaves; tiny facade fins are not legible at tabletop scale.
  block(-.82,5.72,-10.52,.22,6.32,6.43,trim);
  block(5.73,14.32,-10.52,-1.38,6.20,6.30,trim);
  function quad(points,mat) {
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);shell.add(mesh);
  }
  function hip(x0,x1,z0,z1,y,solar=false) {
    const inset=Math.min(x1-x0,z1-z0)*.44,cx=(x0+x1)/2,ra=z0+inset,rb=z1-inset,rise=1.2;
    const faces=[[[x0,y,z0],[x0,y,z1],[cx,y+rise,rb],[cx,y+rise,ra]],[[x1,y,z1],[x1,y,z0],[cx,y+rise,ra],[cx,y+rise,rb]],[[x1,y,z0],[x0,y,z0],[cx,y+rise,ra],[cx,y+rise,ra]],[[x0,y,z1],[x1,y,z1],[cx,y+rise,rb],[cx,y+rise,rb]]];
    faces.forEach(face=>quad(face,roofMat));
    if(solar) for(const face of [faces[1],faces[2]]) { // east and rear banks, as in the reference viewer
      const [a,b,c,d]=face.map(p=>new THREE.Vector3(...p)),base=a.clone().add(b).multiplyScalar(.5),top=c.clone().add(d).multiplyScalar(.5);
      const across=b.clone().sub(a).normalize(),slope=top.clone().sub(base),length=slope.length(),up=slope.clone().normalize();
      const point=(x,h)=>base.clone().addScaledVector(across,x).addScaledVector(up,h).add(new THREE.Vector3(0,.07,0)).toArray();
      const start=.35,end=Math.min(2.5,length-.25);
      const halfWidth=Math.min(2.4,(a.distanceTo(b)+(c.distanceTo(d)-a.distanceTo(b))*end/length-.55)/2);
      quad([point(-halfWidth,start),point(halfWidth,start),point(halfWidth,end),point(-halfWidth,end)],panelMat);

    }
  }
  hip(-.95,5.85,-10.65,.35,6.45); hip(5.25,14.45,-10.65,-1.25,6.33,true);
  // One opaque, vertex-coloured draw for the entire exhibit. No tiny shadow casters,
  // transparent balcony passes or separate window draw calls during its rotation.
  shell.updateMatrixWorld(true);
  const inverse = shell.matrixWorld.clone().invert(), positions = [], normals = [], colors = [];
  const geometries = new Set(), materials = new Set(), v = new THREE.Vector3(), n = new THREE.Vector3();
  shell.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry=mesh.geometry, matrix=inverse.clone().multiply(mesh.matrixWorld), normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
    const p=geometry.attributes.position, normal=geometry.attributes.normal, index=geometry.index, color=mesh.material.color;
    for(let i=0;i<(index?.count??p.count);i++) {
      const at=index?index.getX(i):i;
      v.fromBufferAttribute(p,at).applyMatrix4(matrix); n.fromBufferAttribute(normal,at).applyMatrix3(normalMatrix).normalize();
      positions.push(v.x,v.y,v.z); normals.push(n.x,n.y,n.z); colors.push(color.r,color.g,color.b);
    }
    geometries.add(geometry); materials.add(mesh.material);
  });
  shell.clear(); geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  shell.add(new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true})));
  return root;
}
