import * as T from './vendor/three.module.min.js';

// Four heart-shaped leaves meet at the centre. The stem is a separate, quiet arc.
// Positions are assembled on the GPU; scrolling never uploads the point cloud.
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
  const target=new Float32Array(count*3),origin=new Float32Array(count*3),outward=new Float32Array(count*3);
  const colors=new Float32Array(count*3),sizes=new Float32Array(count),births=new Float32Array(count),phases=new Float32Array(count);
  const green=new T.Color(0x9cbd70),deepGreen=new T.Color(0x617b45),gold=new T.Color(0xe9c785),white=new T.Color(0xffedc5);
  for(let i=0;i<count;i++){
    let x,y,z,leaf=Math.floor(random()*4);
    if(i<count*.94){
      let hx,hy;
      do{hx=random()*2-1;hy=random()*1.85-1.08;}while(!inside(hx,hy));
      const angle=leaf*Math.PI/2+.13,c=Math.cos(angle),s=Math.sin(angle);
      const ly=hy*.97+1.06,lx=hx*.97;
      x=lx*c-ly*s;y=lx*s+ly*c;
      z=(1-hx*hx)*.18+Math.sin(hy*2)*.09+(random()-.5)*.12;
    }else{
      const t=random();x=.14+Math.sin(t*2.5)*.34;y=-.05-t*2.7;z=-.02;
      x+=(random()-.5)*.055;y+=(random()-.5)*.04;
    }
    target.set([x,y+.55,z],i*3);
    const angle=random()*Math.PI*2,r=3.3+random()*4.7;
    origin.set([Math.cos(angle)*r,Math.sin(angle)*r*.7+.6,(random()-.5)*7],i*3);
    outward.set([x*3.8+Math.cos(angle)*3,y*3+Math.sin(angle)*2,(random()-.5)*8],i*3);
    const color=deepGreen.clone().lerp(green,.25+random()*.75);
    color.lerp(gold,(leaf===1?.48:.12)+random()*.23);
    if(random()>.95)color.lerp(white,.8);
    colors.set([color.r,color.g,color.b],i*3);
    sizes[i]=.023+random()*.025;births[i]=random()*.34;phases[i]=random()*Math.PI*2;
  }
  const geometry=new T.BufferGeometry();
  for(const [name,array,size] of [['position',target,3],['aOrigin',origin,3],['aOutward',outward,3],['aColor',colors,3],['aSize',sizes,1],['aBirth',births,1],['aPhase',phases,1]])geometry.setAttribute(name,new T.BufferAttribute(array,size));
  const uniforms={uTime:{value:0},uAssembly:{value:0},uDeparture:{value:0},uHeight:{value:800},uDpr:{value:1},uOpacity:{value:1}};
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms,
    vertexShader:`
      attribute vec3 aOrigin; attribute vec3 aOutward; attribute vec3 aColor;
      attribute float aSize; attribute float aBirth; attribute float aPhase;
      uniform float uTime; uniform float uAssembly; uniform float uDeparture;
      uniform float uHeight; uniform float uDpr;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float arrival=smoothstep(aBirth,aBirth+.66,uAssembly);
        vec3 cloud=aOrigin;
        float turn=(1.-arrival)*.6;
        cloud.xy=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*cloud.xy;
        vec3 p=mix(cloud,position,arrival);
        p=mix(p,aOutward,uDeparture);
        p.z+=sin(uTime*.65+aPhase)*.055;
        p.y+=sin(uTime*.35)*.045;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aSize*uHeight*1.4/max(.8,-mv.z),1.,5.*uDpr);
        vColor=aColor;
        vAlpha=(.52+.30*sin(uTime*.7+aPhase))*(.45+.55*arrival);
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
  return {points,update({time,assembly,departure,height,dpr}){
    uniforms.uTime.value=time;uniforms.uAssembly.value=assembly;uniforms.uDeparture.value=departure;
    uniforms.uHeight.value=height*dpr;uniforms.uDpr.value=dpr;
  }};
}
