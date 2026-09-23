import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createHDMaterials } from '../app/scene/hd-materials.js';

const keys = 'wall trim taupe slab stage ground tile wood outdoor grass roof solar frame metal glass sofa fabric cushion accentCushion rug timber darkWood cabinet leather mirror marble curtain led screen white black water leaves leavesLight trunk brass selected hover invisible'.split(' ');
const textureSet = materials => new Set(Object.values(materials).flatMap(material => Object.values(material).filter(value => value?.isTexture)));
const dispose = materials => {
  for (const texture of textureSet(materials)) texture.dispose();
  for (const material of Object.values(materials)) material.dispose();
};

test('HD can replace the complete SD material table without changing material keys or picking', () => {
  const materials = createHDMaterials();
  try {
    assert.deepEqual(Object.keys(materials).sort(), keys.sort());
    for (const [key, material] of Object.entries(materials)) {
      assert.equal(material.isMaterial, true, key);
      assert.equal(material.userData.quality, 'hd', key);
      assert.ok(Number.isFinite(material.opacity), key);
    }
    assert.equal(materials.invisible.opacity, 0);
    assert.equal(materials.invisible.depthWrite, false);
    assert.equal(materials.selected.opacity, .065);
    assert.equal(materials.hover.opacity, .035);
    assert.equal(materials.glass.depthWrite, false);
  } finally { dispose(materials); }
});

test('HD textures have a bounded shared memory footprint and deterministic pixel data', () => {
  const a = createHDMaterials(), b = createHDMaterials();
  try {
    const textures = textureSet(a), other = new Map([...textureSet(b)].map(texture => [texture.name, texture]));
    assert.ok(textures.size <= 16, 'shared material families must not allocate one texture per mesh');
    let bytes = 0;
    for (const texture of textures) {
      const { data, width, height } = texture.image;
      assert.ok(width <= 512 && height <= 512, texture.name);
      assert.equal(data.length, width * height * 4, texture.name);
      assert.equal(texture.generateMipmaps, true, texture.name);
      assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter, texture.name);
      assert.equal(texture.colorSpace, texture.name.endsWith('surface') ? THREE.NoColorSpace : THREE.SRGBColorSpace, texture.name);
      bytes += data.byteLength;
      const digest = array => createHash('sha256').update(array).digest('hex');
      assert.equal(digest(data), digest(other.get(texture.name).image.data), texture.name);
    }
    assert.ok(bytes * 4 / 3 < 16 * 1024 * 1024, 'texture budget including mipmaps must stay under 16 MiB');
    for (const material of [a.wood, a.roof, a.leather, a.tile, a.sofa]) assert.equal(material.bumpMap, material.roughnessMap);
  } finally { dispose(a); dispose(b); }
});
