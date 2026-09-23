import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Glass should reveal a room, not leave an opaque AO silhouette in front of it.
class ArchitecturalAO extends GTAOPass {
  _overrideVisibility() {
    super._overrideVisibility();
    this.scene.traverse(object => {
      if (!object.visible || !object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some(m => m.transparent || m.isShadowMaterial)) {
        this._visibilityCache.push(object);
        object.visible = false;
      }
    });
  }
}

// This module (and its render targets) is created only after the first HD click.
export function createHDRendering({ renderer, scene, camera }) {
  // Some WebGL2 devices cannot render into floating-point color targets. They
  // still get HD materials/geometry/lighting through the normal beauty pass.
  if (!renderer.extensions.has('EXT_color_buffer_float')) {
    return { resize() {}, render() { renderer.render(scene,camera); }, dispose() {} };
  }
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const beauty = new RenderPass(scene, camera);
  const ao = new ArchitecturalAO(scene, camera, 1, 1);
  ao.blendIntensity = 1.05;
  ao.updateGtaoMaterial({ radius: .7, distanceExponent: 1.4, thickness: .8, distanceFallOff: 1, scale: 1, samples: 16, screenSpaceRadius: false });
  ao.updatePdMaterial({ samples: 12, rings: 2, radius: 3, lumaPhi: 8, depthPhi: 2, normalPhi: 3 });
  const output = new OutputPass();
  // The canvas uses premultiplied alpha. Tone-map unassociated color, then
  // premultiply again so translucent grid lines/shadow edges never turn white.
  output.material.fragmentShader=output.material.fragmentShader
    .replace('// tone mapping','gl_FragColor.rgb /= max(gl_FragColor.a, 0.00001);\n// tone mapping')
    .replace(/\n\s*}\s*$/, '\n gl_FragColor.rgb *= gl_FragColor.a;\n}');
  composer.addPass(beauty);composer.addPass(ao);composer.addPass(output);
  let previousSize = '';
  return {
    resize(width, height, pixelRatio, low = false) {
      const key = `${width}:${height}:${pixelRatio}:${low}`;
      if (key === previousSize) return;
      previousSize = key;
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
      // AO remains a subtle contact cue; low-power mode uses the same materials
      // with a simpler single beauty pass.
      ao.enabled = !low;
    },
    render() {
      const target=renderer.getRenderTarget(),autoClear=renderer.autoClear,autoReset=renderer.info.autoReset;
      const clearColor=renderer.getClearColor(new THREE.Color()),clearAlpha=renderer.getClearAlpha();
      const override=scene.overrideMaterial;
      renderer.info.autoReset = false;
      renderer.info.reset();
      try { composer.render(); }
      finally {
        ao._restoreVisibility();scene.overrideMaterial=override;
        renderer.setRenderTarget(target);renderer.autoClear=autoClear;
        renderer.setClearColor(clearColor,clearAlpha);renderer.info.autoReset=autoReset;
      }
    },
    dispose() {
      ao.dispose();ao.gtaoMaterial.dispose();ao.blendMaterial.dispose();
      beauty.dispose();output.dispose();composer.dispose();
    },
  };
}
