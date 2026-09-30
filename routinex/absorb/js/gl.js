// Minimal WebGL2 helpers + tiny mat4/vec3 kit. Column-major, right-handed, like GL.

export function getGL(canvas) {
  try {
    return canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: matchMedia('(max-width: 820px), (pointer: coarse)').matches ? 'low-power' : 'default', preserveDrawingBuffer: false,
    });
  } catch (e) { return null; }
}

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('shader: ' + log + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
  }
  return s;
}

export function program(gl, vs, fs, uniforms) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aQuad');
  gl.bindAttribLocation(p, 1, 'aH0');
  gl.bindAttribLocation(p, 2, 'aH1');
  gl.bindAttribLocation(p, 3, 'aH2');
  gl.bindAttribLocation(p, 4, 'aP');
  gl.bindAttribLocation(p, 5, 'aQ');
  gl.bindAttribLocation(p, 6, 'aC');
  gl.bindAttribLocation(p, 7, 'aDir');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

// ---- math -------------------------------------------------------------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => x * x * (3 - 2 * x);
export const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));

export function persp(out, fovy, aspect, near, far, sx = 0, sy = 0) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect; out[5] = f;
  out[8] = -sx; out[9] = -sy;
  out[10] = (far + near) * nf; out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function lookAt(out, e, t, up) {
  let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2];
  let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
  out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
  out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
  out[15] = 1;
  return out;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hex(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
