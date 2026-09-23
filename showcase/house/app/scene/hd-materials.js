import * as THREE from 'three';

// A self-contained HD palette. SD keeps its original materials and textures.
// All texture data is generated locally, deterministically, and only on demand.
const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const fract = n => n - Math.floor(n);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = n => n * n * (3 - 2 * n);
const hash = (x, y, seed = 0) => {
  let h = Math.imul(x ^ seed, 374761393) ^ Math.imul(y + seed, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const noise = (u, v, cells, seed = 0) => {
  const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
  const tx = smooth(fract(x)), ty = smooth(fract(y));
  const h = (a, b) => hash((a % cells + cells) % cells, (b % cells + cells) % cells, seed);
  return mix(mix(h(ix, iy), h(ix + 1, iy), tx), mix(h(ix, iy + 1), h(ix + 1, iy + 1), tx), ty);
};

// Surface maps pack height in red and roughness in green. One GPU texture can
// serve both bumpMap and roughnessMap, keeping the HD texture budget bounded.
function texture(name, size, pixel, { color = true, repeat = [1, 1] } = {}) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const rgb = pixel((x + .5) / size, (y + .5) / size, x, y);
    const i = (y * size + x) * 4;
    data[i] = Math.round(clamp(rgb[0], 0, 255));
    data[i + 1] = Math.round(clamp(rgb[1], 0, 255));
    data[i + 2] = Math.round(clamp(rgb[2], 0, 255));
    data[i + 3] = 255;
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.name = `hd:${name}`;
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 8;
  map.repeat.set(...repeat);
  map.needsUpdate = true;
  return map;
}

function woodPixel(u, v, x, y) {
  const row = Math.floor(v * 5), vv = fract(v * 5);
  const length = fract(u + row * .37);
  const grain = Math.sin(TAU * (v * 108 + Math.sin(u * TAU) * .5 + Math.sin(u * TAU * 3 + row) * .2));
  const fine = Math.sin(TAU * (v * 214 + Math.sin(u * TAU * 2) * .6));
  const board = hash(row, 4, 21) - .5;
  const joint = vv < .008 || length < .0025;
  const pores = hash(x, y, 72) - .5;
  const tone = board * 9 + grain * 1.9 + fine * .7 + (noise(u, v, 8, 9) - .5) * 4 + pores * 1.7;
  return { tone, joint, relief: .53 + grain * .025 + fine * .009 + pores * .025 };
}

function stonePixel(u, v, x, y) {
  const cloud = noise(u, v, 4, 27), detail = noise(u, v, 16, 32);
  const warp = noise(u, v, 8, 18) * .035;
  const vein = Math.pow(clamp(1 - Math.abs(Math.sin(TAU * (u + v + .12 * Math.sin(v * TAU) + warp))) / .048), 1.4);
  const fineVein = Math.pow(clamp(1 - Math.abs(Math.sin(TAU * (u * 2 - v + .085 * Math.sin(u * TAU)))) / .016), 2);
  return { tone: (cloud - .5) * 7 + (detail - .5) * 2 + (hash(x, y, 9) - .5) * .9 - vein * 17 - fineVein * 5, vein };
}

export function createHDMaterials() {
  const oak = texture('oak-albedo', 512, (u, v, x, y) => {
    const { tone, joint } = woodPixel(u, v, x, y);
    return joint ? [137, 119, 97] : [184 + tone, 160 + tone, 130 + tone];
  }, { repeat: [.75, .75] });
  const oakSurface = texture('oak-surface', 512, (u, v, x, y) => {
    const { relief, joint } = woodPixel(u, v, x, y);
    return [joint ? 87 : relief * 255, joint ? 215 : 162 + (relief - .5) * 70, 0];
  }, { color: false, repeat: [.75, .75] });

  const marble = texture('limestone-albedo', 512, (u, v, x, y) => {
    const { tone } = stonePixel(u, v, x, y);
    return [232 + tone, 231 + tone, 226 + tone];
  });
  const tile = texture('stone-tile-albedo', 512, (u, v, x, y) => {
    if (u < .002 || v < .002 || u > .998 || v > .998) return [186, 184, 178];
    const { tone } = stonePixel(u, v, x, y);
    return [234 + tone, 233 + tone, 229 + tone];
  });
  const stoneSurface = texture('stone-surface', 512, (u, v, x, y) => {
    const { vein } = stonePixel(u, v, x, y);
    return [128 + (hash(x, y, 2) - .5) * 7 - vein * 5, 164 + noise(u, v, 8, 1) * 26, 0];
  }, { color: false });

  const textileSurface = texture('woven-linen-surface', 256, (u, v, x, y) => {
    const warp = .5 + .5 * Math.cos(TAU * u * 64), weft = .5 + .5 * Math.cos(TAU * v * 64);
    const parity = (Math.floor(u * 64) + Math.floor(v * 64)) % 2;
    const thread = parity ? warp * .7 + weft * .3 : warp * .3 + weft * .7;
    return [95 + thread * 66 + (hash(x, y, 31) - .5) * 15, 222 + thread * 20, 0];
  }, { color: false, repeat: [2, 2] });
  const leatherSurface = texture('leather-surface', 512, (u, v, x, y) => {
    const grain = noise(u, v, 128, 22), grain2 = noise(u, v, 64, 63);
    const wrinkle = Math.pow(clamp(1 - Math.abs(Math.sin(TAU * (v * 22 + noise(u, v, 16, 4) * .9))) / .13), 2);
    return [110 + grain * 50 + grain2 * 12 - wrinkle * 11 + hash(x, y, 18) * 5, 155 + grain * 24 + wrinkle * 20, 0];
  }, { color: false });
  const plasterSurface = texture('mineral-surface', 256, (u, v, x, y) => {
    const fine = hash(x, y, 67), mottling = noise(u, v, 32, 8);
    return [114 + fine * 19 + mottling * 13, 227 + mottling * 17, 0];
  }, { color: false, repeat: [3, 3] });
  const pillow = texture('jacquard-albedo', 512, (u, v) => {
    const diagonal = Math.min(Math.abs(fract((u + v) * 5) - .5), Math.abs(fract((u - v) * 5) - .5));
    const pattern = smooth(clamp((diagonal - .022) / .012));
    return [mix(91, 237, pattern), mix(95, 233, pattern), mix(96, 225, pattern)];
  });

  const roof = texture('terracotta-albedo', 512, (u, v, x, y) => {
    const column = Math.floor(u * 8), row = Math.floor(v * 8);
    const wave = Math.sin(fract(u * 8) * Math.PI), overlap = fract(v * 8) < .045;
    const weather = (noise(u, v, 8, 52) - .5) * 8 + (hash(column, row, 26) - .5) * 9 + (hash(x, y, 9) - .5) * 3;
    const shade = overlap ? -24 : wave * 7;
    return [184 + weather + shade, 109 + weather + shade * .75, 70 + weather + shade * .55];
  }, { repeat: [5, 5] });
  const roofSurface = texture('terracotta-surface', 512, (u, v, x, y) => {
    const wave = Math.sin(fract(u * 8) * Math.PI), overlap = fract(v * 8) < .045;
    return [overlap ? 62 : 89 + wave * 112 + hash(x, y, 72) * 4, 209 + hash(x, y, 43) * 18, 0];
  }, { color: false, repeat: [5, 5] });
  const solar = texture('solar-albedo', 512, (u, v) => {
    const xx = fract(u * 10), yy = fract(v * 6);
    const border = xx < .035 || yy < .026 || xx > .965 || yy > .974;
    const busbar = Math.abs(xx - .24) < .009 || Math.abs(xx - .76) < .009;
    const cell = hash(Math.floor(u * 10), Math.floor(v * 6), 61) * 4;
    if (border) return [84, 99, 112];
    if (busbar) return [100, 119, 132];
    const trace = Math.abs(fract(v * 132) - .5) < .08 ? 5 : 0;
    return [15 + cell + trace, 31 + cell + trace, 46 + cell + trace];
  });
  const grass = texture('lawn-albedo', 512, (u, v, x, y) => {
    const clump = noise(u, v, 16, 19), fleck = hash(x, y, 84), blade = Math.sin((x + Math.sin(y * .14) * 3) * 2.2);
    return [98 + clump * 17 + fleck * 10 + blade * 3, 121 + clump * 20 + fleck * 8 + blade * 2, 74 + clump * 12 + fleck * 7];
  }, { repeat: [6, 6] });

  const standard = (color, roughness = .75, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const physical = (color, roughness = .6, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, ...extra });
  const stoneFinish = { map: marble, bumpMap: stoneSurface, bumpScale: .008, roughnessMap: stoneSurface, clearcoat: .18, clearcoatRoughness: .28 };
  const textileFinish = { bumpMap: textileSurface, bumpScale: .016, roughnessMap: textileSurface, sheen: .6, sheenRoughness: .82, sheenColor: new THREE.Color('#e9e4da') };
  const oakFinish = { map: oak, bumpMap: oakSurface, bumpScale: .021, roughnessMap: oakSurface, clearcoat: .12, clearcoatRoughness: .45 };
  const materials = {
    wall: standard('#e9e7e2', .91, { bumpMap: plasterSurface, bumpScale: .009 }),
    trim: physical('#f7f4ef', .48, { clearcoat: .12, clearcoatRoughness: .36 }),
    taupe: standard('#aaa69d', .82, { bumpMap: plasterSurface, bumpScale: .006 }),
    slab: standard('#b9b7b0', .91, { bumpMap: plasterSurface, bumpScale: .013 }),
    stage: physical('#283039', .68, { clearcoat: .08 }),
    ground: standard('#cbd0d7', .97),
    tile: physical('#ffffff', .57, { ...stoneFinish, map: tile }),
    wood: physical('#ffffff', .95, oakFinish),
    outdoor: standard('#c8c6bb', .92, { bumpMap: plasterSurface, bumpScale: .024 }),
    grass: standard('#ffffff', .98, { map: grass }),
    roof: standard('#ffffff', .95, { map: roof, bumpMap: roofSurface, roughnessMap: roofSurface, bumpScale: .019, side: THREE.DoubleSide }),
    solar: physical('#ffffff', .25, { map: solar, metalness: .42, clearcoat: 1, clearcoatRoughness: .12, side: THREE.DoubleSide }),
    frame: physical('#343c3c', .4, { metalness: .58, clearcoat: .3, clearcoatRoughness: .38 }),
    metal: physical('#b9bec0', .27, { metalness: .88, clearcoat: .12, anisotropy: .35 }),
    glass: physical('#d2e1df', .075, { metalness: .08, transparent: true, opacity: .29, depthWrite: false, side: THREE.DoubleSide, ior: 1.5, clearcoat: .8, clearcoatRoughness: .06 }),
    sofa: physical('#dfddd6', .98, textileFinish),
    fabric: physical('#50545b', .98, { ...textileFinish, sheenColor: new THREE.Color('#9c9fa7') }),
    cushion: physical('#f0ece3', .98, textileFinish),
    accentCushion: physical('#ffffff', .98, { ...textileFinish, map: pillow }),
    rug: physical('#535961', 1, { ...textileFinish, bumpScale: .033, sheen: .32, sheenColor: new THREE.Color('#929aa3') }),
    timber: physical('#f0dfc7', .94, oakFinish),
    darkWood: physical('#6b5b4c', .92, oakFinish),
    cabinet: physical('#aaa9a4', .27, { clearcoat: .55, clearcoatRoughness: .2 }),
    leather: physical('#655246', .7, { bumpMap: leatherSurface, bumpScale: .018, roughnessMap: leatherSurface, clearcoat: .26, clearcoatRoughness: .42 }),
    mirror: physical('#abb5bf', .065, { metalness: 1, clearcoat: .85, clearcoatRoughness: .04 }),
    marble: physical('#ffffff', .3, stoneFinish),
    curtain: physical('#bfb9ad', 1, { ...textileFinish, bumpScale: .01, sheen: .75 }),
    led: standard('#fff2d7', .35, { emissive: '#ffdbaa', emissiveIntensity: 1.1, toneMapped: false }),
    screen: physical('#11232e', .16, { emissive: '#263d50', emissiveIntensity: .24, clearcoat: .9, clearcoatRoughness: .1 }),
    white: physical('#f6f2e9', .29, { clearcoat: .36, clearcoatRoughness: .21 }),
    black: physical('#252d2f', .37, { metalness: .18, clearcoat: .2 }),
    water: physical('#7dadae', .12, { metalness: .15, clearcoat: 1, clearcoatRoughness: .07 }),
    leaves: standard('#466447', .95),
    leavesLight: standard('#68835b', .92),
    trunk: standard('#76604a', 1, { bumpMap: oakSurface, bumpScale: .034 }),
    brass: physical('#bd9b59', .28, { metalness: .86, clearcoat: .16 }),
    selected: new THREE.MeshBasicMaterial({ color: '#5395e7', transparent: true, opacity: .065, depthWrite: false, side: THREE.DoubleSide }),
    hover: new THREE.MeshBasicMaterial({ color: '#5395e7', transparent: true, opacity: .035, depthWrite: false, side: THREE.DoubleSide }),
    invisible: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  };
  for (const [key, material] of Object.entries(materials)) {
    material.name = `hd:${key}`;
    material.userData.quality = 'hd';
  }
  return materials;
}
