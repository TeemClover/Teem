import * as THREE from 'three';
import { solarModuleLayout } from './solar-layout.js';

const TAU = Math.PI * 2;
const random = (i, seed = 0) => {
  let value = Math.imul(i + 1 + seed * 317, 374761393);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};

function canopyGeometry(seed) {
  const geometry = new THREE.SphereGeometry(1, 12, 9);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    // Smooth lobes give each foliage cluster a living outline rather than a ball.
    const radius = 1 + .095 * Math.sin(x * 7 + seed) * Math.sin(z * 6 - y * 3)
      + .065 * Math.cos(y * 9 + x * 4 + seed * 2);
    positions.setXYZ(i, x * radius, y * radius, z * radius);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function addMesh(parent, geometry, material, position, scale, name) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  if (name) mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function tube(parent, geometry, from, to, radius, material, bottomRadius = radius) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
  const delta = end.clone().sub(start), length = delta.length();
  const mesh = addMesh(parent, geometry, material, start.add(end).multiplyScalar(.5).toArray(), [radius, length, bottomRadius]);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function roofVertices({ x0, x1, z0, z1, y, rise }) {
  const inset = Math.min(x1 - x0, z1 - z0) * .44;
  const corners = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
  if (z1 - z0 > x1 - x0) {
    const cx = (x0 + x1) / 2;
    const a = [cx, y + rise, z0 + inset], b = [cx, y + rise, z1 - inset];
    return { corners, lines: [[a, b], [corners[0], a], [corners[1], a], [corners[2], b], [corners[3], b]] };
  }
  const cz = (z0 + z1) / 2;
  const a = [x0 + inset, y + rise, cz], b = [x1 - inset, y + rise, cz];
  return { corners, lines: [[a, b], [corners[0], a], [corners[3], a], [corners[1], b], [corners[2], b]] };
}

function roofDetails(parent, roof, geometry, m) {
  const { corners, lines } = roofVertices(roof);
  for (const [from, to] of lines) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a), length = direction.length();
    const count = Math.max(1, Math.ceil(length / .31));
    // Individual terracotta caps overlap lightly, with seams visible in close-up.
    for (let i = 0; i < count; i++) {
      const p = a.clone().addScaledVector(direction, (i + .5) / count);
      p.y += .035;
      const cap = addMesh(parent, geometry.cap, m.roof, p.toArray(), [.102, length / count + .012, .102], 'roof-cap');
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    }
  }
  for (let i = 0; i < corners.length; i++) {
    const from = [...corners[i]], to = [...corners[(i + 1) % corners.length]];
    from[1] -= .065; to[1] -= .065;
    tube(parent, geometry.pipe, from, to, .045, m.trim);
  }
}

function downpipe(parent, at, eave, roofPoint, geometry, m) {
  const bottom = -.37;
  const upper = [at[0], eave - .32, at[1]];
  tube(parent, geometry.pipe, [roofPoint[0], eave - .07, roofPoint[1]], upper, .033, m.trim);
  tube(parent, geometry.pipe, upper, [at[0], bottom, at[1]], .033, m.trim);
  tube(parent, geometry.pipe, [at[0], bottom, at[1]], [at[0] + .12, bottom - .025, at[1]], .033, m.trim);
  for (const height of [.5, 2.5, 4.6]) {
    if (height > eave - .4) continue;
    addMesh(parent, geometry.box, m.taupe, [at[0], height, at[1]], [.079, .045, .079], 'pipe-bracket');
  }
}

function solarFrames(parent, roof, geometry, m) {
  // Use the SD plane descriptors directly so every frame follows its cell face.
  for(const panel of solarModuleLayout(roof)) {
    const {width:panelW,depth:panelH,across,normal,up}=panel;
    const module=new THREE.Group();module.name='hd:solar-module-frame';
    module.position.copy(panel.center);
    module.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,normal,up.clone().negate()));
    module.userData.panelSize=[panelW,panelH];module.userData.panelId=panel.id;module.userData.roofSide=panel.side;
    parent.add(module);
    for(const sign of [-1,1]) {
      // Narrow anodized frame has true depth and a clear air gap to the tiles.
      addMesh(module,geometry.box,m.frame,[sign*(panelW/2+.004),-.002,0],[.018,.028,panelH+.026],'hd:solar-frame-side');
      addMesh(module,geometry.box,m.frame,[0,-.002,sign*(panelH/2+.004)],[panelW+.026,.028,.018],'hd:solar-frame-end');
      addMesh(module,geometry.box,m.metal,[0,-.027,sign*panelH*.3],[panelW+.035,.023,.028],'hd:solar-mount-rail');
      for(const edge of [-1,1])addMesh(module,geometry.box,m.metal,[edge*(panelW/2+.004),.014,sign*panelH*.3],[.025,.008,.042],'hd:solar-edge-clamp');
    }
  }
}

function tree(parent, x, z, height, seed, geometry, m) {
  const group = new THREE.Group(); group.name = `hd-tree-${seed}`; group.position.set(x, -.46, z); parent.add(group);
  const trunkHeight = height * .67;
  tube(group, geometry.branch, [0, 0, 0], [.04, trunkHeight, -.025], height * .032, m.trunk);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.39996 + seed, crown = height * (.18 + random(i, seed) * .055);
    const end = [Math.cos(angle) * crown, height * (.56 + i % 3 * .072), Math.sin(angle) * crown];
    tube(group, geometry.branch, [0, trunkHeight * (.52 + i % 3 * .16), 0], end, height * .014, m.trunk);
    for (let j = 0; j < 3; j++) {
      const a = angle + (j - 1) * .67;
      const p = [end[0] + Math.cos(a) * height * .075, end[1] + height * (.038 + j * .045), end[2] + Math.sin(a) * height * .075];
      const size = height * (.137 + random(i * 3 + j, seed) * .043);
      const foliage = addMesh(group, geometry.canopy[(i + j) % 3], (i + j) % 3 ? m.leaves : m.leavesLight,
        p, [size * 1.13, size * .87, size], 'foliage-cluster');
      foliage.rotation.y = a;
    }
  }
  // Small leaf sprays break up the silhouette without alpha textures or transparency sorting.
  for (let i = 0; i < 48; i++) {
    const angle = i * 2.39996 + seed;
    const ring = height * (.2 + random(i, seed + 2) * .115);
    const p = [Math.cos(angle) * ring, height * (.64 + random(i, seed + 3) * .23), Math.sin(angle) * ring];
    const size = height * (.024 + random(i, seed + 4) * .021);
    const leaf = addMesh(group, geometry.leaf, i % 4 ? m.leaves : m.leavesLight, p, [size * 1.3, size * .46, size * 2], 'leaf-spray');
    leaf.rotation.set((random(i, seed + 8) - .5) * 1.2, angle, .45);
  }
  addMesh(group, geometry.canopy[seed % 3], m.leavesLight, [0, height * .86, -.035], [height * .2, height * .17, height * .2], 'crown');
}

function shrub(parent, x, z, seed, geometry, m, scale = 1) {
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4 + seed;
    const bush = addMesh(parent, geometry.canopy[i % 3], i % 3 ? m.leaves : m.leavesLight,
      [x + Math.cos(angle) * .18 * scale, -.32 + (i % 2) * .085 * scale, z + Math.sin(angle) * .18 * scale],
      [.32 * scale, .22 * scale, .29 * scale], 'low-shrub');
    bush.rotation.y = angle;
  }
}

function grassGeometry() {
  const positions = [], normals = [], uvs = [], indices = [];
  // Curved, tapered leaf blades with front/back faces; the foliage materials remain shared.
  for (let i = 0; i < 11; i++) {
    const angle = i * 2.39996, height = .23 + random(i, 53) * .18;
    const dx = Math.cos(angle), dz = Math.sin(angle), width = .021;
    const start = positions.length / 3;
    for (let row = 0; row < 4; row++) {
      const t = row / 3, reach = t * t * .22;
      const half = width * (1 - t * .98);
      for (const side of [-1, 1]) {
        positions.push(dx * reach - dz * half * side, height * Math.sin(t * Math.PI * .57), dz * reach + dx * half * side);
        const inverseLength = 1 / Math.sqrt(.73);
        normals.push(-dx * .3 * inverseLength, .8 * inverseLength, -dz * .3 * inverseLength);
        uvs.push((side + 1) / 2, t);
      }
    }
    for (let row = 0; row < 3; row++) {
      const a = start + row * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c, c, b, a, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  // Front/back triangles share the deliberate soft shading normal; recomputing
  // would cancel opposing faces to zero and leave these fine leaves unlit.
  geometry.setIndex(indices);
  return geometry;
}

/** HD-only decorative geometry; the house's walls, roofs, openings and footprint stay unchanged. */
export function createHDExterior({ house, materials: m, roofY, rise, overhang }) {
  const architecture = new THREE.Group(), landscape = new THREE.Group(), trees = new THREE.Group();
  architecture.name = 'hd-exterior-architecture'; landscape.name = 'hd-low-landscaping'; trees.name = 'hd-trees';
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    pipe: new THREE.CylinderGeometry(1, 1, 1, 8),
    branch: new THREE.CylinderGeometry(.48, 1, 1, 8),
    cap: new THREE.CylinderGeometry(.94, 1, 1, 10),
    leaf: new THREE.SphereGeometry(1, 6, 4),
    canopy: [canopyGeometry(1), canopyGeometry(2), canopyGeometry(3)],
    grass: grassGeometry(),
  };
  roofDetails(architecture, { x0: -.6 - overhang, x1: 5.5 + overhang, z0: -10.3 - overhang, z1: overhang, y: roofY + .12, rise }, geometry, m);
  roofDetails(architecture, { x0: 5.25, x1: 14.1 + overhang, z0: -10.3 - overhang, z1: -1.6 + overhang, y: roofY, rise }, geometry, m);
  solarFrames(architecture, { x0: 5.25, x1: 14.1 + overhang, z0: -10.3 - overhang, z1: -1.6 + overhang, y: roofY, rise }, geometry, m);
  downpipe(architecture, [-.68, -10.26], roofY + .12, [-.6 - overhang, -10.3 - overhang], geometry, m);
  downpipe(architecture, [14.19, -10.26], roofY, [14.1 + overhang, -10.3 - overhang], geometry, m);
  downpipe(architecture, [14.19, -1.81], roofY, [14.1 + overhang, -1.6 + overhang], geometry, m);

  for (const [x, z, height, seed] of [[16, -9.6, 3.4, 11], [16.1, -5.9, 2.8, 23], [-1.8, -8.7, 2.2, 37], [13.7, -11.4, 2.5, 49]]) {
    tree(trees, x, z, height, seed, geometry, m);
  }
  for (const [index, [x, z]] of [[-1.9, -4.6], [-1.85, -3.3], [16.1, -2.6], [16.2, -1.5], [9.2, 2.2]].entries()) {
    shrub(trees, x, z, index + 4, geometry, m);
  }
  // Keep landscape outside the rooms and entrance circulation; these are presentation plantings.
  for (const [x, z, sx, sz] of [[16.05, -9.6, .65, 1.05], [16.05, -5.9, .65, .95], [-1.8, -8.7, .63, .77], [13.7, -11.4, .87, .58]]) {
    addMesh(landscape, geometry.canopy[0], m.trunk, [x, -.48, z], [sx, .045, sz], 'planting-bed');
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * TAU;
      const stone = addMesh(landscape, geometry.canopy[i % 3], m.outdoor,
        [x + Math.cos(angle) * sx * .85, -.455, z + Math.sin(angle) * sz * .85], [.085, .045, .065], 'landscape-stone');
      stone.rotation.y = i * 1.6;
    }
  }
  for (let i = 0; i < 22; i++) {
    const side = i < 14;
    const x = side ? 16.09 + (random(i, 14) - .5) * .25 : -2.05 + (random(i, 27) - .5) * .21;
    const z = side ? -11.1 + i * .64 : -10.2 + (i - 14) * .66;
    const size = .65 + random(i, 32) * .45;
    const plant = addMesh(landscape, geometry.grass, i % 3 ? m.leaves : m.leavesLight, [x, -.45, z], [size, size, size], 'ornamental-grass');
    plant.rotation.y = i * 1.7;
  }
  return { architecture, landscape, trees };
}
