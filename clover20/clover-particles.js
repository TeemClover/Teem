import * as T from './vendor/three.module.min.js';

// Peer circles multiply in depth, then the camera pulls back to reveal four leaves.
// All eight rings and the final shape share one GPU point cloud.
export function createCloverParticles(count=5200){
  let seed=2406;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const heart=[];
  for(let i=0;i<160;i++){
    const t=i/160*Math.PI*2;
    heart.push([Math.sin(t)**3,(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16]);
  }
  function inside(x,y){
    let hit=false;
    for(let i=0,j=heart.length-1;i<heart.length;j=i++){
      const [xi,yi]=heart[i],[xj,yj]=heart[j];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
    }
    return hit;
  }
  const target=new Float32Array(count*3),outward=new Float32Array(count*3);
  const colors=new Float32Array(count*3),sizes=new Float32Array(count),circles=new Float32Array(count),phases=new Float32Array(count),angles=new Float32Array(count);
  const green=new T.Color(0x9cbd70),deepGreen=new T.Color(0x617b45),gold=new T.Color(0xe9c785),white=new T.Color(0xffedc5);
  for(let i=0;i<count;i++){
    let x,y,z,leaf=Math.floor(random()*4);
    if(i<count*.94){
      let hx,hy;
      do{hx=random()*2-1;hy=random()*1.85-1.08;}while(!inside(hx,hy));
      const angle=leaf*Math.PI/2+.13,c=Math.cos(angle),s=Math.sin(angle);
      const ly=hy*.97+1.06,lx=hx*.97;
      x=lx*c-ly*s;y=lx*s+ly*c;
      z=(1-hx*hx)*.32+Math.sin(hy*2)*.16+(random()-.5)*.18;
    }else{
      const t=random();x=.14+Math.sin(t*2.5)*.34;y=-.05-t*2.7;z=-.02;
      x+=(random()-.5)*.055;y+=(random()-.5)*.04;
    }
    target.set([x,y+.55,z],i*3);
    const angle=random()*Math.PI*2;
    outward.set([x*3.8+Math.cos(angle)*3,y*3+Math.sin(angle)*2,(random()-.5)*8],i*3);
    const color=deepGreen.clone().lerp(green,.25+random()*.75);
    color.lerp(gold,(leaf===1?.48:.12)+random()*.23);
    if(random()>.95)color.lerp(white,.8);
    colors.set([color.r,color.g,color.b],i*3);
    sizes[i]=.024+random()*.029;circles[i]=i%8;phases[i]=random()*Math.PI*2;angles[i]=angle;
  }
  const geometry=new T.BufferGeometry();
  for(const [name,array,size] of [['position',target,3],['aOutward',outward,3],['aColor',colors,3],['aSize',sizes,1],['aCircle',circles,1],['aPhase',phases,1],['aAngle',angles,1]])geometry.setAttribute(name,new T.BufferAttribute(array,size));
  const uniforms={uTime:{value:0},uIntro:{value:0},uDeparture:{value:0},uHeight:{value:800},uDpr:{value:1},uOpacity:{value:1}};
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms,
    vertexShader:`
      attribute vec3 aOutward; attribute vec3 aColor;
      attribute float aSize; attribute float aCircle; attribute float aPhase; attribute float aAngle;
      uniform float uTime; uniform float uIntro; uniform float uDeparture;
      uniform float uHeight; uniform float uDpr;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float two=smoothstep(1.1,1.75,uIntro);
        float four=smoothstep(2.65,3.35,uIntro);
        float eight=smoothstep(4.25,5.,uIntro);
        float gathering=smoothstep(6.05,8.5,uIntro);
        float a4=aCircle*1.5707963+.785398;
        float a8=aCircle*.785398;
        vec3 centre=vec3(0.,.55,0.);
        centre=mix(centre,vec3(mod(aCircle,2.)*1.5-.75,.55,(mod(aCircle,2.)-.5)*.45),two);
        centre=mix(centre,vec3(cos(a4)*1.06,sin(a4)*1.06+.55,sin(a4*2.)*.42),four);
        centre=mix(centre,vec3(cos(a8)*1.72,sin(a8)*1.42+.55,cos(a8)*.68),eight);
        float radius=mix(mix(mix(.59,.53,two),.45,four),.36,eight);
        float angle=aAngle+uTime*.075;
        float band=sin(aPhase*13.7)*.035;
        vec3 ring=vec3(cos(angle)*(radius+band),sin(angle)*(radius+band),sin(aPhase)*.10);
        float tilt=sin(aCircle*1.7)*.3;
        ring.xz=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*ring.xz;
        vec3 p=centre+ring;
        float pullback=mix(mix(mix(2.9,2.18,two),1.66,four),1.24,eight);
        p=(p-vec3(0.,.55,0.))*pullback+vec3(0.,.55,0.);
        p=mix(p,position,gathering);
        p=mix(p,aOutward,uDeparture);
        p.z+=sin(uTime*.65+aPhase)*.055;
        p.y+=sin(uTime*.35)*.045;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aSize*uHeight*1.5/max(.8,-mv.z),1.,6.*uDpr);
        float visible=aCircle<.5?1.:aCircle<1.5?two:aCircle<3.5?four:eight;
        vColor=mix(mix(vec3(.94,.73,.38),aColor,gathering),vec3(1.,.92,.68),pow(max(0.,sin(uTime*.6+aPhase)),16.)*.38);
        vAlpha=(.66+.28*sin(uTime*.7+aPhase))*visible*smoothstep(0.,.45,uIntro);
      }`,
    fragmentShader:`
      uniform float uOpacity; varying vec3 vColor; varying float vAlpha;
      void main(){
        float r=length(gl_PointCoord-.5)*2.;
        if(r>1.)discard;
        float light=exp(-r*r*6.)+.13*exp(-r*r*1.6);
        gl_FragColor=vec4(vColor,light*vAlpha*uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points=new T.Points(geometry,material);points.frustumCulled=false;
  return {points,update({time,introSeconds,departure,height,dpr}){
    uniforms.uTime.value=time;uniforms.uIntro.value=introSeconds;uniforms.uDeparture.value=departure;
    uniforms.uHeight.value=height*dpr;uniforms.uDpr.value=dpr;
  }};
}
