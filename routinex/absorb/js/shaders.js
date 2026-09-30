// GLSL for the one shared stage. Everything is procedural: impostor spheres (orbs), impostor capsules (rods),
// a ceramic plate disc, kiwi cross-sections and a gradient background. No textures.

export const TUN = { A: 3.2, B: 2.4, Y0: -30.0 };   // gut centre-line, shared with stage.js
const f = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

const HEAD = `#version 300 es
precision highp float;
in vec2 aQuad; in vec3 aH0; in vec3 aH1; in vec3 aH2; in vec4 aP; in vec4 aQ; in vec3 aC; in vec3 aDir;
uniform mat4 uV; uniform mat4 uP; uniform vec2 uRes; uniform float uT; uniform float uFocus; uniform float uAper;
uniform vec3 uCam; uniform float uVis; uniform float uFogD;
const float PI = 3.14159265;
vec3 cl(float z){ return vec3(${f(TUN.A)}*sin(z*.041), ${f(TUN.Y0)}+${f(TUN.B)}*sin(z*.027+.7), z); }
float h11(float x){ return fract(sin(x*127.1)*43758.5453); }
`;

// ── place() bodies ─────────────────────────────────────────────────────────
const PLACE = {
food: `
uniform vec3 uMixW; uniform float uDis; uniform vec3 uLens;
void place(out vec3 p,out float sz,out float rad,out float al,out vec3 col,out vec3 dir){
  float seed=aP.z, ph=aP.w, cls=aQ.x, kind=aQ.y;
  p = aH0*uMixW.x + aH1*uMixW.y + aH2*uMixW.z;
  float br = .06 + .5*(uMixW.y+uMixW.z);
  p += br*vec3(sin(uT*.6+ph*6.283), sin(uT*.8+ph*11.), cos(uT*.5+ph*7.));
  sz=aP.x; rad=aP.y; col=aC; dir=aDir; al=1.;
  if(cls==1.0 && seed>.42) col=mix(col,vec3(.66,.47,.26),uLens.x);
  if(cls==0.0 && seed>.78) col=mix(col,vec3(.52,.72,.26),uLens.y);
  if(cls==2.0 && seed>.55) col=mix(col,vec3(.94,.56,.17),uLens.y);
  if(cls==5.0){ al*=smoothstep(0.,.35,uMixW.y+uMixW.z); }
  if(cls==6.0){ al=uLens.z*uMixW.x; sz*=max(uLens.z,.001); rad*=max(uLens.z,.001); }
  if(kind>.5){ float keep = mix(1., step(seed,.34), uMixW.z); al*=keep; sz*=mix(1.,.6,uMixW.z); rad*=mix(1.,.6,uMixW.z); }
  if(kind<.5){
    float k = clamp(uDis*1.25 - seed*.4, 0., 1.);
    p.y += k*k*10.*(.5+seed); p.xz += vec2(sin(ph*20.),cos(ph*20.))*k*2.5;
    sz*=1.-k; rad*=1.-k; al*=1.-k; col=mix(col,vec3(1.,.93,.74),k*.7);
  }
}`,
wall: `
uniform float uWall;
void place(out vec3 p,out float sz,out float rad,out float al,out vec3 col,out vec3 dir){
  float ph=aP.w, seed=aP.z;
  float wave = .5+.5*sin(aH0.z*.33 - uT*.8 + ph*1.3);
  dir = normalize(aDir + .16*vec3(sin(uT*.7+ph*6.),cos(uT*.6+ph*9.),sin(uT*.5+ph*3.)));
  sz = aP.x*(.85+.4*wave); rad=aP.y;
  p = aH0 + dir*sz*.5;
  col = aC*(.82+.3*wave);
  al = uWall * (.6+.4*seed);
}`,
micro: `
uniform vec3 uAS; uniform vec3 uA0; uniform vec3 uA1; uniform vec3 uA2; uniform float uMicro; uniform float uDimM;
void place(out vec3 p,out float sz,out float rad,out float al,out vec3 col,out vec3 dir){
  float ph=aP.w, seed=aP.z, g=aQ.z;
  p = aH0 + vec3(sin(uT*.35+ph*6.28)*1.1, cos(uT*.31+ph*4.1)*1.0, sin(uT*.27+ph*9.)*1.1);
  vec3 att = g<.5?uA0:(g<1.5?uA1:uA2);
  float s = g<.5?uAS.x:(g<1.5?uAS.y:(g<2.5?uAS.z:0.));
  float a = uT*.55*(.4+seed) + ph*6.283;
  vec3 tgt = att + aH1 + vec3(cos(a),sin(a*1.3),sin(a*.8))*.4;
  p = mix(p,tgt,s);
  dir = normalize(aDir + .5*vec3(sin(uT*.9+ph*7.),cos(uT*.8+ph*5.),sin(uT*.6+ph*3.)));
  sz=aP.x; rad=aP.y; col=aC;
  al = smoothstep(seed*.6, seed*.6+.4, uMicro) * uDimM * smoothstep(3., 10., length(p-uCam));
}`,
strand: `
uniform vec3 uHero; uniform vec4 uRope; uniform vec3 uSVis; uniform vec3 uSpd; uniform vec2 uStream; uniform float uPulse; uniform float uDiff;
vec3 ropeP(float u,float typ){
  vec3 base = uHero + (typ<.5 ? vec3(2.4,.5,.0) : vec3(2.8,-1.5,-1.4));
  float x=(u-.5)*7.4;
  float y=.55*sin(u*8.+uT*.7+typ*2.) + .2*sin(u*17.+uT*1.1);
  float z=.8*sin(u*5.+typ*3.);
  return base + vec3(x,y,z);
}
vec3 strP(float u,float k){
  float z = uStream.x - u*uStream.y;
  float ang = k*2.094 + u*3.4 + uT*.12;
  float rr = 1.15 + .25*sin(u*13.+k*2.);
  return cl(z) + vec3(cos(ang)*rr, sin(ang)*rr*.8, 0.);
}
void place(out vec3 p,out float sz,out float rad,out float al,out vec3 col,out vec3 dir){
  float typ=aQ.x, u=aP.z, ph=aP.w;
  sz=aP.x; rad=aP.y; col=aC; al=1.; dir=vec3(1.,0.,0.); p=vec3(0.);
  if(typ<1.5){
    p = ropeP(u,typ); vec3 p2=ropeP(u+.01,typ); dir=normalize(p2-p);
    al = typ<.5 ? uRope.x : uRope.y;
    if(typ<.5) col = aC*(1.+.25*sin(u*30.-uT*2.)*uPulse);
  } else if(typ<2.5){
    float a = uT*.25;
    vec3 ax = normalize(vec3(cos(a+.5), sin(a*1.3)*.5+.35, 0.));
    vec3 c0 = uHero + vec3(-2.5, .1+.12*sin(uT*.8), 0.);
    p=c0; dir=ax; sz=aP.x*(1.+.03*sin(uT*1.6)); al=uRope.z;
  } else if(typ<3.5){
    float a = uT*.25;
    vec3 ax = normalize(vec3(cos(a+.5), sin(a*1.3)*.5+.35, 0.));
    vec3 nn = vec3(-ax.y, ax.x, 0.);
    float side = aQ.y;
    float tt = (u-.5);
    float bl = 2.6*(1.+.03*sin(uT*1.6)), br = .62;
    float capf = sqrt(max(1.-pow(tt*2.,2.)*.78,.05));
    vec3 c0 = uHero + vec3(-2.5, .1+.12*sin(uT*.8), 0.);
    vec3 base = c0 + ax*tt*bl*.94 + nn*side*br*capf;
    vec3 od = normalize(nn*side + ax*tt*.7 + .55*vec3(sin(uT*1.4+ph*9.),cos(uT*1.2+ph*7.),.3*sin(ph*5.)));
    dir = od; p = base + od*sz*.5; al=uRope.z*.85;
  } else {
    float k = typ-4.;
    float spd = k<.5?uSpd.x:(k<1.5?uSpd.y:uSpd.z);
    float cpt = mix(.86, k<.5?.32:(k<1.5?.6:1.02), uDiff);
    float uu = fract(u + uT*spd*.05);
    p = strP(uu,k);
    al *= smoothstep(6., 16., length(p-uCam)); vec3 p2=strP(uu+.004,k); dir=normalize(p2-p);
    float fade = 1. - smoothstep(cpt*.78, cpt, uu);
    al = uSVis.x * smoothstep(0.,.06,uu) * fade;
    col = aC * (1. + .3*fade);
  }
}`,
scfa: `
uniform float uScfa;
void place(out vec3 p,out float sz,out float rad,out float al,out vec3 col,out vec3 dir){
  float ph=aP.w, seed=aP.z;
  float u = fract(ph + uT*.11*(.6+seed*.8));
  p = aH0 + aH1*u*3.4 + vec3(sin(u*9.+ph*20.), cos(u*7.+ph*11.), sin(u*5.))*.25;
  float life = smoothstep(0.,.14,u)*(1.-smoothstep(.72,1.,u));
  sz = aP.x*life; rad=0.; al = uScfa*life; col=aC*(1.15+.3*sin(uT*3.+ph*30.)); dir=vec3(1.,0.,0.);
}`,
dust: `
uniform float uDust; uniform vec3 uDustCol;
void place(out vec3 p,out float sz,out float rad,out float al,out vec3 col,out vec3 dir){
  float ph=aP.w, seed=aP.z;
  vec3 h = aH0 + vec3(sin(uT*.05+ph*9.)*3., uT*(.12+.18*seed), cos(uT*.04+ph*5.)*3.);
  p = uCam + (mod(h - uCam, vec3(28.,20.,28.)) - vec3(14.,10.,14.));
  sz = aP.x; rad=0.; al = uDust*(.25+.75*aQ.x); col = mix(aC,uDustCol,.65); dir=vec3(1.,0.,0.);
}`,
};

// ── shared varying + main ──────────────────────────────────────────────────
function orbVS(name) {
  return HEAD + PLACE[name] + `
out vec2 vUV; out vec3 vCol; out float vCoc; out float vA; out float vFog;
void main(){
  vec3 p; float sz, rad, al; vec3 col; vec3 dir;
  place(p,sz,rad,al,col,dir);
  vec4 vc = uV*vec4(p,1.);
  float dist = max(-vc.z,.05);
  float coc = clamp(abs(1./dist - 1./uFocus)*uAper,0.,1.);
  al *= smoothstep(.35,1.6,dist) * uVis;
  float s = sz*(1.+coc*1.4);
  if(al<.003 || sz<=.0001 || vc.z>-.2){ gl_Position=vec4(2.,2.,2.,1.); vUV=vec2(0.); vCol=col; vCoc=0.; vA=0.; vFog=0.; return; }
  gl_Position = uP*(vc+vec4(aQuad*s,0.,0.));
  vUV=aQuad; vCol=col; vCoc=coc; vA=al; vFog=1.-exp(-dist*uFogD);
}`;
}
function rodVS(name) {
  return HEAD + PLACE[name] + `
out vec2 vPix; flat out vec2 vPA; flat out vec2 vPB; flat out float vRad; flat out float vSoft;
out vec3 vCol; out float vCoc; out float vA; out float vFog;
void main(){
  vec3 p; float sz, rad, al; vec3 col; vec3 dir;
  place(p,sz,rad,al,col,dir);
  vec3 a = p - dir*sz*.5, b = p + dir*sz*.5;
  vec4 va = uV*vec4(a,1.), vb = uV*vec4(b,1.);
  float dist = max(-(va.z+vb.z)*.5,.05);
  float coc = clamp(abs(1./dist - 1./uFocus)*uAper,0.,1.);
  al *= smoothstep(.35,1.6,dist) * uVis;
  if(al<.003 || sz<=.0001 || va.z>-.15 || vb.z>-.15){ gl_Position=vec4(2.,2.,2.,1.); vPix=vec2(0.);vPA=vec2(0.);vPB=vec2(1.);vRad=1.;vSoft=1.;vCol=col;vCoc=0.;vA=0.;vFog=0.; return; }
  vec4 ca = uP*va, cb = uP*vb;
  vec2 pa = (ca.xy/ca.w*.5+.5)*uRes, pb = (cb.xy/cb.w*.5+.5)*uRes;
  float rpx = max(rad*uP[1][1]*.5*uRes.y/dist, .7);
  float soft = rpx*coc*1.7 + 1.2;
  vec2 ax = pb-pa; float L = length(ax);
  vec2 t = L>1e-3 ? ax/L : vec2(1.,0.);
  vec2 n = vec2(-t.y,t.x);
  float ext = rpx+soft;
  vec2 base = aQuad.x<0. ? pa : pb;
  vec2 pix = base + t*aQuad.x*ext + n*aQuad.y*ext;
  gl_Position = vec4(pix/uRes*2.-1., 0., 1.);
  vPix=pix; vPA=pa; vPB=pb; vRad=rpx; vSoft=soft; vCol=col; vCoc=coc; vA=al; vFog=1.-exp(-dist*uFogD);
}`;
}

const FS_COMMON = `#version 300 es
precision highp float;
uniform vec3 uFog; uniform vec3 uLight; uniform float uGlow; uniform float uExpo; uniform float uRim;
out vec4 o;
vec3 shade(vec3 base, vec3 n, float coc, float fog, float rimK){
  vec3 L = normalize(uLight);
  float ndl = dot(n,L);
  float dif = clamp(ndl*.55+.45,0.,1.);
  float ndv = clamp(n.z,0.,1.);
  float rim = pow(1.-ndv,2.4);
  float spec = pow(clamp(dot(reflect(-L,n),vec3(0.,0.,1.)),0.,1.),22.)*.55;
  vec3 c = base*(.32+.9*dif*dif) + spec*vec3(1.,.96,.9) + rim*rimK*uRim*mix(base,vec3(1.,.9,.75),.5);
  c = mix(c, base*(.9+uGlow*.5)+ .25*uGlow*base, coc*.6);
  c *= uExpo;
  return mix(c, uFog, fog*.88);
}
`;
const orbFS = FS_COMMON + `
in vec2 vUV; in vec3 vCol; in float vCoc; in float vA; in float vFog;
void main(){
  float r2 = dot(vUV,vUV);
  if(r2>1.) discard;
  float r = sqrt(r2);
  vec3 n = vec3(vUV, sqrt(1.-r2));
  float edge = 1. - smoothstep(1.-.03-vCoc*.97, 1., r);
  vec3 c = shade(vCol, n, vCoc, vFog, 1.0);
  c += vCoc*.09*smoothstep(.55,1.,r)*vCol;
  float a = vA*edge*(1.-.5*vCoc)*(1.-vFog*.35);
  o = vec4(c*a, a);
}`;
const rodFS = FS_COMMON + `
in vec2 vPix; flat in vec2 vPA; flat in vec2 vPB; flat in float vRad; flat in float vSoft;
in vec3 vCol; in float vCoc; in float vA; in float vFog;
void main(){
  vec2 ba = vPB-vPA;
  float h = clamp(dot(vPix-vPA,ba)/max(dot(ba,ba),1e-4),0.,1.);
  vec2 d = vPix-(vPA+ba*h);
  float dl = length(d);
  float edge = 1. - smoothstep(vRad-.6, vRad+vSoft, dl);
  if(edge<=.002) discard;
  vec2 v = d/max(vRad,.6);
  float rr = min(dot(v,v),1.);
  vec3 n = vec3(v.x,-v.y, sqrt(1.-rr));
  vec3 c = shade(vCol, n, vCoc, vFog, 1.0);
  c += vCoc*.08*smoothstep(.5,1.,sqrt(rr))*vCol;
  float a = vA*edge*(1.-.45*vCoc)*(1.-vFog*.3);
  o = vec4(c*a, a);
}`;

// ── special programs ───────────────────────────────────────────────────────
const bgVS = `#version 300 es
precision highp float;
out vec2 vUV;
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUV=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const bgFS = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uGlowC; uniform vec3 uGlowP; uniform float uAsp; uniform float uVig;
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec3 c = mix(uBot,uTop,smoothstep(0.,1.,vUV.y));
  vec2 g = (vUV-uGlowP.xy)*vec2(uAsp,1.);
  float gl = exp(-dot(g,g)*2.4)*uGlowP.z;
  c += uGlowC*gl;
  vec2 q=(vUV-.5)*vec2(uAsp,1.);
  c *= 1.-uVig*smoothstep(.35,1.05,length(q));
  c += (hash(gl_FragCoord.xy)-.5)/255.;
  o = vec4(c,1.);
}`;

const discVS = `#version 300 es
precision highp float;
in vec2 aQuad;
uniform mat4 uV; uniform mat4 uP; uniform float uR;
out vec2 vQ;
void main(){ vQ=aQuad; gl_Position = uP*(uV*vec4(aQuad.x*uR,0.,aQuad.y*uR,1.)); }`;
const discFS = `#version 300 es
precision highp float;
in vec2 vQ; out vec4 o;
uniform float uVis; uniform float uK;
void main(){
  float r = length(vQ)*1.32;
  vec3 ivory = vec3(.985,.965,.925);
  float well = smoothstep(.86,.78,r);
  vec3 c = ivory*(1.-.06*well*(1.-smoothstep(0.,.8,r)*.6));
  c = mix(c, vec3(1.,.99,.96), smoothstep(.9,.96,r)*(1.-smoothstep(.96,1.,r)));
  c *= 1. - .05*smoothstep(.98,1.,r)*(1.-smoothstep(1.,1.03,r));
  float plate = 1.-smoothstep(.985,1.,r);
  float sh = .34*(1.-smoothstep(.98,1.32,r))*(1.-plate);
  vec3 sc = vec3(.42,.27,.17);
  float a = uVis*(plate + sh);
  vec3 col = mix(sc, c, plate);
  o = vec4(col*a, a);
}`;

const kiwiVS = `#version 300 es
precision highp float;
in vec2 aQuad;
uniform mat4 uV; uniform mat4 uP; uniform vec3 uPos; uniform float uS;
out vec2 vUV;
void main(){ vUV=aQuad; vec4 vc = uV*vec4(uPos,1.); gl_Position = uP*(vc+vec4(aQuad*uS,0.,0.)); }`;
const kiwiFS = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform vec3 uA; uniform vec3 uB; uniform float uVis; uniform float uRot; uniform vec3 uFog; uniform float uFogK;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = vUV; float cr=cos(uRot), sr=sin(uRot);
  uv = mat2(cr,-sr,sr,cr)*uv;
  uv.x *= .92;
  float r = length(uv);
  if(r>1.) discard;
  float ang = atan(uv.y,uv.x);
  float streak = .5+.5*sin(ang*46.+sin(ang*7.)*2.);
  float fl = smoothstep(.2,.92,r);
  vec3 flesh = mix(uA,uB,fl);
  flesh *= .86+.22*streak*smoothstep(.22,.7,r);
  float skin = smoothstep(.92,.965,r);
  flesh = mix(flesh, vec3(.33,.23,.13), skin);
  float sr2 = length(vec2(uv.x*.9,uv.y*1.05));
  float seeds = 0.;
  float sang = ang*22.;
  float cell = floor(sang);
  float sc = fract(sang)-.5;
  float ring = smoothstep(.055,.0,abs(sr2-.4-.02*sin(cell*3.)))*smoothstep(.34,.0,abs(sc));
  seeds = ring;
  flesh = mix(flesh, vec3(.05,.04,.03), seeds*.95);
  float core = smoothstep(.24,.1,length(vec2(uv.x*.75,uv.y*1.25)));
  flesh = mix(flesh, vec3(.98,.95,.82), core*.9);
  float lit = .84 + .3*(.5-uv.y*.5);
  flesh *= lit;
  flesh += .05*(hash(gl_FragCoord.xy)-.5);
  float edge = 1.-smoothstep(.985,1.,r);
  flesh = mix(flesh, uFog, uFogK);
  float a = uVis*edge;
  o = vec4(flesh*a, a);
}`;


const tubeVS = `#version 300 es
precision highp float;
uniform mat4 uV; uniform mat4 uP; uniform float uWall;
out vec3 vW; out float vFade; out vec2 vTZ;
vec3 cl(float z){ return vec3(${f(TUN.A)}*sin(z*.041), ${f(TUN.Y0)}+${f(TUN.B)}*sin(z*.027+.7), z); }
void main(){
  int ring = gl_InstanceID + (gl_VertexID & 1);
  int ti = gl_VertexID >> 1;
  float z = -0.5 - float(ring)*0.52;
  float th = float(ti)/56.*6.28318531;
  float R = 5.0 + .5*sin(z*.35) + .3*sin(z*.9+th*2.);
  vec3 c = cl(z);
  vec3 p = c + vec3(cos(th)*R, sin(th)*R*.92, 0.);
  vW = p; vTZ = vec2(th, z);
  vFade = uWall * smoothstep(-.5,-9.,z);
  gl_Position = uP*(uV*vec4(p,1.));
}`;
const tubeFS = `#version 300 es
precision highp float;
in vec3 vW; in float vFade; in vec2 vTZ; out vec4 o;
uniform vec3 uCam; uniform vec3 uFog; uniform float uFogD; uniform float uT;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
float field(vec2 q){ return vn(q*1.6)*.55 + vn(q*4.3+7.)*.3 + vn(q*11.+3.)*.15; }
void main(){
  vec2 q = vec2(vTZ.x*5.0, vTZ.y*.9);
  float fd = field(q);
  vec3 dx = dFdx(vW), dy = dFdy(vW);
  vec3 gn = normalize(cross(dx,dy));
  vec3 toC = uCam - vW;
  if(dot(gn,toC)<0.) gn=-gn;
  float e = .015;
  float fx = field(q+vec2(e,0.))-fd, fy = field(q+vec2(0.,e))-fd;
  vec3 tX = normalize(dx), tY = normalize(dy);
  vec3 n = normalize(gn - (tX*fx + tY*fy)*2.2);
  float d = length(toC); vec3 V = toC/d; vec3 L = V;
  float att = 1./(1.+.012*d*d);
  float fold = smoothstep(.15,-.85,sin(vTZ.y*.35));
  vec3 base = mix(vec3(.9,.47,.42), vec3(.98,.62,.5), fd);
  base = mix(base, vec3(.42,.15,.2), fold*.75);
  float cells = smoothstep(.5,.75,vn(q*7.+2.));
  base *= .88 + .18*cells;
  float dif = clamp(dot(n,L),0.,1.);
  float spec = pow(clamp(dot(reflect(-L,n),V),0.,1.), 28.)*.8;
  float rim = pow(1.-clamp(dot(n,V),0.,1.), 2.);
  vec3 c = base*(.12 + 1.15*dif*att) + spec*att*vec3(1.,.86,.78) + rim*.06*vec3(1.,.6,.5);
  float fog = 1.-exp(-d*uFogD*.9);
  c = mix(c, uFog, clamp(fog,0.,1.));
  o = vec4(c*vFade, vFade);
}`;

export const SRC = {
  tube: [tubeVS, tubeFS],
  foodRod: [rodVS('food'), rodFS], foodOrb: [orbVS('food'), orbFS],
  wall: [rodVS('wall'), rodFS],
  microRod: [rodVS('micro'), rodFS], microOrb: [orbVS('micro'), orbFS],
  strand: [rodVS('strand'), rodFS],
  scfa: [orbVS('scfa'), orbFS],
  dust: [orbVS('dust'), orbFS],
  bg: [bgVS, bgFS], disc: [discVS, discFS], kiwi: [kiwiVS, kiwiFS],
};
