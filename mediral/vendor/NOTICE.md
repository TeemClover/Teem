# Vendored Three.js runtime

Prepared 2026-09-28. These runtime files are byte-for-byte copies of the existing `homechew/vendor/` files in this repository:

- `three.module.min.js`
- `addons/environments/RoomEnvironment.js`

The unchanged [VENDOR.json](VENDOR.json) records Three.js **0.186.1**, the original esbuild version, exported symbols, byte sizes and SHA-256 checksums. The upstream copyright/SPDX comment remains embedded in the runtime. [LICENSE.three.txt](LICENSE.three.txt) is copied from the matching locally available Three.js 0.186.1 package.

The original subset build recipe remains at `../../homechew/vendor/build-three.mjs`; this delivery does not rebuild or modify that subset. `RoomEnvironment.js` retains its original comments and attribution to the model-viewer environment implementation. Its `three` imports are resolved through the Mediral page's import map.

Project: [Three.js](https://github.com/mrdoob/three.js) · License: MIT. No CDN request or runtime package installation is required for these copied modules.
