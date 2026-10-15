import * as T from './vendor/three.module.min.js';
import { memoryOrder } from './memory-order.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

export function createMemoryRiver(scene,info,anisotropy=1){
  const root=new T.Group();scene.add(root);
  const loader=new T.TextureLoader(),plane=new T.PlaneGeometry(1,1),cache=new Map();
  const empty=new T.Texture();
  const cards=memoryOrder.map((id,i)=>{
    const p=info.get(id);
    const material=new T.ShaderMaterial({
      transparent:true,depthWrite:false,
      uniforms:{uMap:{value:empty},uAlpha:{value:0},uBlur:{value:0},uTexel:{value:new T.Vector2(1/p.width,1/p.height)}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`
        uniform sampler2D uMap; uniform float uAlpha; uniform float uBlur; uniform vec2 uTexel; varying vec2 vUv;
        void main(){
          vec2 d=uTexel*uBlur;
          vec3 color=texture2D(uMap,vUv).rgb*.4;
          color+=(texture2D(uMap,vUv+vec2(d.x,0.)).rgb+texture2D(uMap,vUv-vec2(d.x,0.)).rgb+texture2D(uMap,vUv+vec2(0.,d.y)).rgb+texture2D(uMap,vUv-vec2(0.,d.y)).rgb)*.15;
          float grey=dot(color,vec3(.2126,.7152,.0722));
          color=mix(vec3(grey),color,.76)*vec3(1.,.98,.9);
          vec2 edge=min(vUv,1.-vUv);
          float feather=smoothstep(0.,.035,min(edge.x,edge.y));
          gl_FragColor=vec4(color,uAlpha*feather);
          #include <colorspace_fragment>
        }`,
    });
    const mesh=new T.Mesh(plane,material);mesh.visible=false;root.add(mesh);
    return {id,info:p,mesh,start:.86+i*.212,duration:.69+(i%3)*.045,lane:i%3,index:i};
  });

  function load(card){
    if(cache.has(card.id))return cache.get(card.id);
    const entry={ready:false};cache.set(card.id,entry);
    entry.texture=loader.load(card.info.src,()=>{
      // A fast scroll can discard an in-flight image before it finishes.
      if(cache.get(card.id)!==entry){entry.texture.dispose();return;}
      entry.ready=true;
    },undefined,()=>{entry.failed=true;});
    entry.texture.colorSpace=T.SRGBColorSpace;
    entry.texture.anisotropy=anisotropy;
    return entry;
  }
  let active=0;
  function update(phase,camera,small,time){
    root.position.copy(camera.position);root.quaternion.copy(camera.quaternion);active=0;
    for(const card of cards){
      const u=(phase-card.start)/card.duration;
      const nearby=u>-.65&&u<1.65;
      const cached=nearby?load(card):cache.get(card.id);
      const alpha=smooth(0,.26,u)*(1-smooth(.68,1,u));
      card.mesh.visible=alpha>.003&&!!cached?.ready;
      if(!card.mesh.visible)continue;
      active++;
      const lane=card.lane,index=card.index;
      const depth=20-u*3.5+(lane===1?1.4:0);
      const halfH=Math.tan(camera.fov*Math.PI/360)*depth,halfW=halfH*camera.aspect;
      const x=small?[-.48,.42,.12][lane]:[.28,.77,.62][lane];
      const y=small?[-.48,-.73,-.55][lane]:[.48,-.43,.02][lane];
      card.mesh.position.set((x+Math.sin(time*.13+index)*.012)*halfW,(y+(u-.5)*.18)*halfH,-depth);
      const fraction=small?[.51,.45,.43][lane]:[.22,.23,.19][lane];
      const width=halfW*2*fraction*(1+u*.12);
      card.mesh.scale.set(width,width*card.info.height/card.info.width,1);
      card.mesh.rotation.set(Math.sin(index*1.7)*.09,Math.sin(index*2.1)*.17+(u-.5)*.07,Math.sin(index*2.4)*.035);
      card.mesh.renderOrder=-10+Math.round(u*3);
      const uniforms=card.mesh.material.uniforms;
      uniforms.uMap.value=cached.texture;
      uniforms.uAlpha.value=alpha*(lane===1?.27:.46);
      uniforms.uBlur.value=lane===1?2.4:.45;
    }
    // Bound GPU photo memory while retaining enough nearby frames for reverse scroll.
    for(const [id,entry] of cache){
      const card=cards.find(c=>c.id===id);
      if(phase<card.start-1.1||phase>card.start+card.duration+1.1){
        card.mesh.material.uniforms.uMap.value=empty;
        entry.texture.dispose();cache.delete(id);
      }
    }
  }
  return {update,get stats(){return {total:cards.length,active,cached:cache.size};}};
}
