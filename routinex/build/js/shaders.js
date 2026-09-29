// B / Build — GLSL for the fibre world. Everything procedural.
//  fibre  : long striated filaments (screen-space capsules), animated assembly / turnover / contraction
//  bead   : pearl-like amino-acid units, chains → units → gather at fibres → recycling loop
//  memb   : soft pearl membrane plane (the boundary the units cross)
//  dust   : bokeh motes,  bg : gradient
const HEAD = `#version 300 es
precision highp float;
in vec2 aQuad; in vec3 aH0; in vec3 aH1; in vec3 aH2; in vec4 aP; in vec4 aQ; in vec3 aC; in vec3 aDir;
uniform mat4 uV; uniform mat4 uP; uniform vec2 uRes; uniform float uT; uniform float uFocus; uniform float uAper;
uniform vec3 uCam; uniform float uVis; uniform float uFogD;
const float PI = 3.14159265;
float h11(float x){ return fract(sin(x*127.1)*43758.5453); }
vec3 h13(float x){ return vec3(h11(x), h11(x+17.3), h11(x+41.7)); }
`;

const RIB_HEAD = `
uniform float uBuild; uniform float uTurn; uniform float uContract; uniform float uTension; uniform float uCalm; uniform float uPulse;
uniform float uSide; uniform float uSideK;
const int NS = 360;
vec3 fp(float u){
  float L = aH2.x;
  float x = (u-.5)*L*(1.-.14*uContract) + aH0.x;
  float ang = aH1.z + u*L*aH1.y + uT*.05*(1.-.7*uCalm);
  float rr = aH1.x*(1.+.12*sin(u*9.+aH2.y)+.16*uTension*sin(uT*2.6+u*38.+aH1.z));
  vec3 c = vec3(x, aH0.y + (x-aH0.x)*aH2.z + .5*sin(u*5.+aH2.y*2.+uT*.09), aH0.z + .4*sin(u*3.7+aH2.y*1.7));
  return c + vec3(0., sin(ang)*rr, cos(ang)*rr);
}
`;
const BEAD_PLACE = `
uniform vec4 uBw;      // dig, cross, absorb, reappear
uniform float uLoop;   // recycling loop weight
uniform float uBeadA;  // global bead alpha
uniform float uBoost;
vec3 chainP(float chain, float k, float seed){
  vec3 org = vec3(-18.+chain*36., 2.6+h11(chain*9.1)*4.2, -12.+h11(chain*3.3)*13.);
  org.x += sin(uT*.05+chain*20.)*1.5;
  float s = (k-.5)*3.8;
  float a = k*15.+uT*.55+chain*6.28;
  return org + vec3(s, .36*sin(a), .36*cos(a));
}
void place(out vec3 p, out float sz, out float al, out vec3 col, out float lit){
  float chain = aH0.x, k = aH0.y, seed = aP.z, ph = aP.w;
  vec3 pc = chainP(chain,k,seed);
  vec3 unit = pc + uBw.x*(aH2*1.3 + vec3(0.,-.4,0.)*uBw.x) + uBw.x*.25*vec3(sin(uT*.7+ph*6.),cos(uT*.6+ph*9.),sin(uT*.5+ph*4.));
  float e = smoothstep(seed*.55, seed*.55+.45, uBw.y);
  vec3 anchor = aH1 + .35*vec3(sin(uT*.8+ph*7.),cos(uT*.7+ph*5.),sin(uT*.6+ph*3.));
  vec3 mid = mix(unit, anchor, e);
  mid.y += sin(e*PI)*.6*(seed-.5);
  float a = uT*.5*(.5+seed)+ph*6.283;
  vec3 orb = aH1 + vec3(cos(a),sin(a)*.62,sin(a*.8)*.8)*(1.1+seed*1.4);
  p = mix(mid, orb, uLoop);
  sz = aP.x*(1.-.35*uBw.x*(1.-uBw.y))*uBoost;
  al = 1. - (1.-uBw.w)*clamp(uBw.z*1.7 - seed*.7,0.,1.);
  al *= uBeadA;
  col = aC; lit = 1.;
}`;

function ribVS(){
  return HEAD + RIB_HEAD + `
out vec3 vCol; out vec2 vPerp; out float vAcross; out float vSoftK; out float vU; out float vBand; out float vCoc; out float vA; out float vFog;
vec4 viewAt(float u){ return uV*vec4(fp(u),1.); }
void main(){
  int id = gl_VertexID; int seg = id>>1; float side = ((id&1)==0) ? -1. : 1.;
  float st = 1./float(NS-1);
  float u = float(seg)*st;
  vec4 va = viewAt(u);
  vec4 vn = viewAt(u+st), vp = viewAt(max(u-st,0.));
  float NEAR = -.22;
  // near-plane handling: pull a vertex that is behind the camera onto the near plane along its strand
  if(va.z > NEAR){
    vec4 nb = vn.z < NEAR ? vn : (vp.z < NEAR ? vp : va);
    if(nb.z < NEAR){ float t = (NEAR - va.z)/(nb.z - va.z); va = mix(va, nb, t); }
  }
  bool ok = va.z < NEAR + .001;
  bool nOk = vn.z < NEAR;
  vec4 vb = nOk ? vn : vp;
  float g = aQ.x;
  float seed = aP.y;
  float uw0 = aQ.z, uw1 = aQ.w;
  float al = 1., rad = aP.x*(1.+.16*uTension);
  vec3 col = aC;
  if(g > .5 && g < 1.5){                                // growing filament: extends toward its tip as units arrive
    float front = mix(uw0, uw1, uBuild);
    al *= 1. - smoothstep(front - .012, front, u);
    rad *= mix(1., .35, smoothstep(front - .06, front, u));
    col = mix(col, vec3(1., .93, .78), smoothstep(front - .05, front, u)*.9);
  } else if(g > 1.5){                                   // renewing filament: a wave of breakdown and rebuild travels along it
    float win = smoothstep(uw0, uw0 + .03, u) * (1. - smoothstep(uw1 - .03, uw1, u));
    float wv = .5 + .5*sin(u*aH2.x*.55 - uT*.9 + seed*6.283);
    float dip = uTurn*smoothstep(.72, 1., wv)*win;
    al *= 1. - .86*dip; rad *= 1. - .6*dip; col = mix(col, vec3(.74, .72, .74), dip*.6);
  }
  float pulse = uPulse*(.5+.5*sin(uT*3.2 - u*aH2.x*.22));
  col *= 1. + .5*uContract*pulse + .2*uTension;
  col *= 1. - .18*uCalm;
  col *= .9 + .2*sin(u*aH2.x*.6 + aH1.z*3.);
  float dist = max(-va.z, .05);
  float coc = clamp(abs(1./dist - 1./uFocus)*uAper, 0., 1.);
  al *= smoothstep(.3, 1.6, dist) * uVis;
  vec4 ca = uP*va, cb = uP*vb;
  vec2 pa = (ca.xy/ca.w*.5+.5)*uRes, pb = (cb.xy/cb.w*.5+.5)*uRes;
  vec2 d = pb - pa; if(!nOk) d = -d;
  vec2 t = length(d) > 1e-3 ? normalize(d) : vec2(1., 0.);
  vec2 n = vec2(-t.y, t.x);
  float rpx = max(rad*uP[1][1]*.5*uRes.y/dist, .55);
  float soft = rpx*coc*1.5 + .9;
  // calm foreground on the text side
  vec2 ndc = ca.xy/ca.w;
  float side01 = uSide < 0. ? (ndc.x*.5+.5) : (1. - (ndc.x*.5+.5));
  float calm = mix(1., .22, uSideK*abs(uSide)*(1. - smoothstep(.2, .72, side01)));
  al *= calm;
  if(!ok || al < .003){ gl_Position = vec4(2., 2., 2., 1.); vCol = col; vPerp = vec2(0.); vAcross = 0.; vSoftK = 0.; vU = 0.; vBand = 0.; vCoc = 0.; vA = 0.; vFog = 0.; return; }
  vec2 pix = pa + n*side*(rpx + soft);
  gl_Position = vec4(pix/uRes*2. - 1., 0., 1.);
  vCol = col; vPerp = n; vAcross = side*(rpx + soft)/rpx; vSoftK = soft/rpx; vU = u; vBand = aQ.y + u*aH2.x*1.75*(1.+.16*uContract);
  vCoc = coc; vA = al; vFog = 1. - exp(-dist*uFogD);
}`;
}

function orbVS(){
  return HEAD + BEAD_PLACE + `
out vec2 vUV; out vec3 vCol; out float vCoc; out float vA; out float vFog;
void main(){
  vec3 p; float sz,al; vec3 col; float lit;
  place(p,sz,al,col,lit);
  vec4 vc = uV*vec4(p,1.);
  float dist = max(-vc.z,.05);
  float coc = clamp(abs(1./dist - 1./uFocus)*uAper,0.,1.);
  al *= smoothstep(.35,1.6,dist) * uVis;
  float s = sz*(1.+coc*1.3);
  if(al<.003 || sz<=.0001 || vc.z>-.2){ gl_Position=vec4(2.,2.,2.,1.); vUV=vec2(0.); vCol=col; vCoc=0.; vA=0.; vFog=0.; return; }
  gl_Position = uP*(vc+vec4(aQuad*s,0.,0.));
  vUV=aQuad; vCol=col; vCoc=coc; vA=al; vFog=1.-exp(-dist*uFogD);
}`;
}

// hero units: leucine (big, copper) + HMB (small, silver) — driven only by uniforms
const heroVS = HEAD + `
uniform vec3 uHmbPos; uniform float uHmb; uniform float uHmbVis;
out vec2 vUV; out vec3 vCol; out float vCoc; out float vA; out float vFog;
void main(){
  float kind = aQ.x;  // 1 leucine, 2 HMB
  vec3 p = uHmbPos; float sz = .55; vec3 col = vec3(.9,.55,.28);
  if(kind>1.5){
    float b = smoothstep(0.,1.,uHmb);
    float a = uT*.9;
    p += vec3(.62,.46,.1)*b*1.6 + b*.18*vec3(cos(a),sin(a*1.3),sin(a*.7));
    sz = .19*(.25+.75*b); col = vec3(.86,.9,.95);
  } else { p += .05*vec3(sin(uT*.6),cos(uT*.5),sin(uT*.4)); }
  vec4 vc = uV*vec4(p,1.);
  float dist = max(-vc.z,.05);
  float coc = clamp(abs(1./dist - 1./uFocus)*uAper,0.,1.);
  float al = uHmbVis*uVis*(kind>1.5 ? smoothstep(0.,.15,uHmb) : 1.);
  float s = sz*(1.+coc*1.3);
  if(al<.003 || vc.z>-.2){ gl_Position=vec4(2.,2.,2.,1.); vUV=vec2(0.); vCol=col; vCoc=0.; vA=0.; vFog=0.; return; }
  gl_Position = uP*(vc+vec4(aQuad*s,0.,0.));
  vUV=aQuad; vCol=col; vCoc=coc; vA=al; vFog=1.-exp(-dist*uFogD);
}`;

const SHADE = `
uniform vec3 uFog; uniform vec3 uLight; uniform float uGlow; uniform float uExpo; uniform float uRim;
vec3 shade(vec3 base, vec3 n, float coc, float fog, float rimK, float sheen){
  vec3 L = normalize(uLight);
  float dif = clamp(dot(n,L)*.55+.45,0.,1.);
  float ndv = clamp(n.z,0.,1.);
  float rim = pow(1.-ndv,2.4);
  float spec = pow(clamp(dot(reflect(-L,n),vec3(0.,0.,1.)),0.,1.),26.)*(.5+.5*sheen);
  vec3 c = base*(.3+.95*dif*dif) + spec*vec3(1.,.96,.9) + rim*rimK*uRim*mix(base,vec3(1.,.92,.8),.55);
  c = mix(c, base*(.92+uGlow*.5), coc*.55);
  c *= uExpo;
  return mix(c, uFog, fog*.88);
}`;
const OUT = `#version 300 es
precision highp float;
out vec4 o;` + SHADE;

const ribFS = OUT + `
in vec3 vCol; in vec2 vPerp; in float vAcross; in float vSoftK; in float vU; in float vBand; in float vCoc; in float vA; in float vFog;
void main(){
  float ax = abs(vAcross);
  float edge = 1. - smoothstep(1. - .08, 1. + vSoftK, ax);
  if(edge <= .002) discard;
  float x = clamp(vAcross, -1., 1.);
  vec3 n = vec3(vPerp*x, sqrt(max(1. - x*x, 0.)));
  float band = .5 + .5*sin(vBand*6.2832);
  float stri = mix(1., .86 + .26*band, 1. - vCoc);
  vec3 c = shade(vCol*stri, n, vCoc, vFog, 1., band);
  c += (1. - vCoc)*.06*pow(1. - n.z, 2.)*vec3(1., .9, .75);       // faint luminous edge
  float a = vA*edge*(1. - .45*vCoc)*(1. - vFog*.3);
  o = vec4(c*a, a);
}`;
const orbFS = OUT + `
in vec2 vUV; in vec3 vCol; in float vCoc; in float vA; in float vFog;
void main(){
  float r2 = dot(vUV,vUV);
  if(r2>1.) discard;
  float r = sqrt(r2);
  vec3 n = vec3(vUV, sqrt(1.-r2));
  float edge = 1. - smoothstep(1.-.03-vCoc*.97, 1., r);
  vec3 c = shade(vCol, n, vCoc, vFog, 1., 1.);
  c += .12*vec3(1.,.95,.9)*pow(1.-n.z,3.)*(1.-vCoc);       // pearl sheen at the edge
  float a = vA*edge*(1.-.5*vCoc)*(1.-vFog*.35);
  o = vec4(c*a, a);
}`;

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
  c += uGlowC*exp(-dot(g,g)*2.2)*uGlowP.z;
  vec2 q=(vUV-.5)*vec2(uAsp,1.);
  c *= 1.-uVig*smoothstep(.35,1.05,length(q));
  c += (hash(gl_FragCoord.xy)-.5)/255.;
  o = vec4(c,1.);
}`;

const membVS = `#version 300 es
precision highp float;
in vec2 aQuad; uniform mat4 uV; uniform mat4 uP; uniform float uY;
out vec3 vW; out vec2 vQ;
void main(){ vec3 w = vec3(aQuad.x*44., uY, -8.+aQuad.y*14.); vW=w; vQ=aQuad; gl_Position=uP*(uV*vec4(w,1.)); }`;
const membFS = `#version 300 es
precision highp float;
in vec3 vW; in vec2 vQ; out vec4 o;
uniform float uMemb; uniform vec3 uCam; uniform vec3 uFog; uniform float uT;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 g = vW.xz*.9; vec2 i=floor(g), f=fract(g)-.5;
  float cell = 1.-smoothstep(.18,.5,length(f+ (vec2(hash(i),hash(i+3.))-.5)*.22));
  float d = length(vW-uCam);
  float fres = pow(1.-clamp(abs(normalize(uCam-vW).y),0.,1.),1.5);
  float a = uMemb*(.10+.34*fres+.12*cell)*(1.-smoothstep(14.,40.,d))*(1.-smoothstep(.7,1.,abs(vQ.y)))*(1.-smoothstep(.8,1.,abs(vQ.x)));
  vec3 c = mix(vec3(1.,.96,.9), vec3(1.,.83,.66), cell*.6);
  o = vec4(c*a, a);
}`;
const dustVS = HEAD + `
uniform float uDust; uniform vec3 uDustCol;
out vec2 vUV; out vec3 vCol; out float vCoc; out float vA; out float vFog;
void main(){
  float ph=aP.w, seed=aP.z;
  vec3 h = aH0 + vec3(sin(uT*.05+ph*9.)*3., uT*(.1+.16*seed), cos(uT*.04+ph*5.)*3.);
  vec3 p = uCam + (mod(h - uCam, vec3(30.,20.,30.)) - vec3(15.,10.,15.));
  vec4 vc = uV*vec4(p,1.);
  float dist = max(-vc.z,.05);
  float coc = clamp(abs(1./dist - 1./uFocus)*uAper,0.,1.);
  float al = uDust*(.25+.75*aQ.x)*uVis*smoothstep(.35,1.6,dist);
  float s = aP.x*(1.+coc*1.3);
  if(al<.003 || vc.z>-.2){ gl_Position=vec4(2.,2.,2.,1.); vUV=vec2(0.); vCol=aC; vCoc=0.; vA=0.; vFog=0.; return; }
  gl_Position = uP*(vc+vec4(aQuad*s,0.,0.));
  vUV=aQuad; vCol=mix(aC,uDustCol,.65); vCoc=coc; vA=al; vFog=0.;
}`;

export const SRC = {
  fibre: [ribVS(), ribFS], bead: [orbVS(), orbFS], hero: [heroVS, orbFS], dust: [dustVS, orbFS],
  bg: [bgVS, bgFS], memb: [membVS, membFS],
};
