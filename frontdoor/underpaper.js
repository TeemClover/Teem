/** A cumulative paper cut, over a raster landscape. No scene replacement. */
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function position(x, y) {
  return { x: clamp(Number.isFinite(x) ? x : .44, .12, .88), y: clamp(Number.isFinite(y) ? y : .55, .22, .82) };
}
export function createTrail() {
  const points = [];
  const trail = {
    points,
    add(x, y, rx = .16, ry = .105) {
      const p = { ...position(x, y), rx, ry };
      // Union coverage stays bounded; already explored ground does not allocate.
      if (points.some(old => Math.hypot((p.x-old.x)/old.rx, (p.y-old.y)/old.ry) < .32 && old.rx >= rx)) return false;
      if (points.length >= 256) return false;
      points.push(p); return true;
    },
    connect(from,to) {
      const end=position(to.x,to.y),start=position(from.x,from.y);
      const steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.y-start.y)/.025));
      let changed=false;
      for(let i=0;i<=steps;i++)changed=trail.add(start.x+(end.x-start.x)*i/steps,start.y+(end.y-start.y)*i/steps)||changed;
      return changed;
    },
  };
  return trail;
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => img.decode().then(() => resolve(img), reject);
    img.onerror = () => reject(new Error('discovery-image-unavailable')); img.src = url;
  });
}
const vertex = `attribute vec2 a_position; varying vec2 uv;
void main(){uv=(a_position+1.0)*.5;gl_Position=vec4(a_position.x,-a_position.y,0,1);}`;
const fragment = `precision mediump float;
varying vec2 uv; uniform sampler2D world, cut, paperRim; uniform vec2 pixel; uniform float time, opening;
float maskAt(vec2 p){return texture2D(cut,p).a;}
void main(){
  vec4 maskPixel=texture2D(cut,uv);float a=maskPixel.a;
  vec2 rimUV=(uv-vec2(.44,.55))/max(vec2(.83,.53)*opening,vec2(.0001))+.5;
  float inside=step(0.0,rimUV.x)*step(rimUV.x,1.0)*step(0.0,rimUV.y)*step(rimUV.y,1.0);
  vec4 curled=texture2D(paperRim,rimUV);curled.a*=inside*(1.0-a*(1.0-maskPixel.g));
  if(a<.01&&curled.a<.01)discard;
  vec2 imageUV=vec2(1.0-uv.x,uv.y);
  vec3 base=texture2D(world,imageUV).rgb;
  // Refraction is restricted to water pixels in the actual supplied image.
  float water=smoothstep(.018,.12,min(base.b-base.r,base.g-base.r));
  float riverX=mix(.74,.12,smoothstep(.06,.9,uv.y));
  float foam=smoothstep(.45,.76,min(base.r,min(base.g,base.b)))*(1.0-smoothstep(.08,.20,abs(imageUV.x-riverX)));
  water=max(water,foam);
  vec2 drift=vec2(sin(uv.y*135.0-time*2.1)*2.0,sin(uv.x*108.0+uv.y*78.0-time*3.4)*3.4)*pixel*water;
  vec3 scene=texture2D(world,imageUV+drift).rgb;
  scene*=1.0+water*.025*sin(uv.y*220.0-time*3.0);
  float nearEdge=1.0-min(min(maskAt(uv+pixel*vec2(5.0,0)),maskAt(uv-pixel*vec2(5.0,0))),min(maskAt(uv+pixel*vec2(0,5.0)),maskAt(uv-pixel*vec2(0,5.0))));
  float depth=1.0-min(min(maskAt(uv+pixel*vec2(13.0,0)),maskAt(uv-pixel*vec2(13.0,0))),min(maskAt(uv+pixel*vec2(0,13.0)),maskAt(uv-pixel*vec2(0,13.0))));
  float topShade=1.0-maskAt(uv-pixel*vec2(5.0,20.0));
  scene*=1.0-depth*.25-topShade*.34;
  // The narrow ivory cut edge sits in front of its deeper, inward shadow.
  vec3 rim=mix(vec3(.64,.47,.27),vec3(1.0,.91,.73),maskAt(uv+pixel*vec2(0,5.0)));
  scene=mix(scene,rim,nearEdge*.65);
  float combined=a*(1.0-curled.a)+curled.a;
  vec3 color=(scene*a*(1.0-curled.a)+curled.rgb*curled.a)/max(combined,.001);
  gl_FragColor=vec4(color,combined);
}`;
function shader(gl, type, source) {
  const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('discovery-shader');
  return s;
}
export function createUnderpaper(canvas) {
  const mask = document.createElement('canvas'), m = mask.getContext('2d');
  const trail = createTrail();
  let gl, program, worldTexture, maskTexture, rimTexture, fallback, landscape, paperRim, aperture, loaded = false;
  let frame = 0, lastFrame = 0, started = false, elapsed = 0, waterElapsed = 0, visible = false, motion = true, lastTouch = 0, dirty = true, completed = false, completionPending = false, firstPaint;
  const seed = { x:.44, y:.55, rx:.315, ry:.195 };
  let lastFocus={x:seed.x,y:seed.y};
  try {
    gl = canvas.getContext('webgl', { alpha:true, antialias:false, premultipliedAlpha:false, preserveDrawingBuffer:true });
    if (!gl) throw new Error('no-webgl');
    program = gl.createProgram(); gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('discovery-program');
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const texture = unit => { gl.activeTexture(gl.TEXTURE0+unit); const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; };
    worldTexture=texture(0); maskTexture=texture(1);rimTexture=texture(2);
    gl.uniform1i(gl.getUniformLocation(program,'world'),0); gl.uniform1i(gl.getUniformLocation(program,'cut'),1);gl.uniform1i(gl.getUniformLocation(program,'paperRim'),2);
  } catch {
    // Preserve the same DOM canvas and interaction if WebGL is unavailable.
    // A context already acquired cannot become 2D; use a private raster surface.
    fallback = document.createElement('canvas'); canvas.after(fallback); fallback.className=canvas.className; fallback.id='underpaper-raster'; canvas.hidden=true; gl=null;
  }
  let raster = fallback?.getContext('2d');
  const rimLayer=document.createElement('canvas'),r=rimLayer.getContext('2d');
  function resize() {
    const bounds = canvas.parentElement.getBoundingClientRect();
    const width = Math.min(640, Math.round(bounds.width * Math.min(devicePixelRatio || 1, 1.3)));
    const height = Math.min(1200, Math.round(width * bounds.height / bounds.width));
    if (mask.width===width && mask.height===height) return;
    canvas.width=mask.width=rimLayer.width=width; canvas.height=mask.height=rimLayer.height=height;
    if (fallback) { fallback.width=width; fallback.height=height; }
    if(gl)gl.viewport(0,0,width,height); dirty=true; request();
  }
  function brush(p, progress=1, context=m) {
    if(progress<=0)return;
    const rx=p.rx*mask.width*progress, ry=p.ry*mask.height*progress;
    context.beginPath();
    // Deterministic roughness defines the reveal boundary, not landscape artwork.
    for(let i=0;i<=160;i++){
      const angle=i/160*Math.PI*2;
      const rough=1+.038*Math.sin(angle*7+1)+.022*Math.sin(angle*17)+.012*Math.sin(angle*39+2);
      const x=p.x*mask.width+Math.cos(angle)*rx*rough,y=p.y*mask.height+Math.sin(angle)*ry*rough;
      if(i===0)context.moveTo(x,y);else context.lineTo(x,y);
    }
    context.closePath();context.fill();
  }
  function updateMask(progress) {
    m.clearRect(0,0,mask.width,mask.height); m.fillStyle='#fff';
    const w=.83*mask.width*progress,h=.53*mask.height*progress;
    const x=seed.x*mask.width-w/2,y=seed.y*mask.height-h/2;
    if(w>0&&h>0)m.drawImage(aperture,x,y,w,h);
    m.fillStyle='#f00';for(const p of trail.points)brush(p);
    if(raster){
      r.clearRect(0,0,mask.width,mask.height);r.globalCompositeOperation='source-over';if(w>0&&h>0)r.drawImage(paperRim,x,y,w,h);
      // Remove original paper folds only where new exploration has cut through.
      r.globalCompositeOperation='destination-out';
      for(const p of trail.points)brush(p,1,r);
      r.globalCompositeOperation='source-over';
    }
    if(gl){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,maskTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mask);}
    dirty=false;
  }
  function draw(t) {
    frame=0;if(!visible||!loaded||document.hidden)return;
    if(t-lastFrame<32){request();return;} const dt=lastFrame?Math.min(50,t-lastFrame):0;lastFrame=t;
    if(motion){elapsed+=dt;waterElapsed+=dt;}else elapsed=Math.max(elapsed,3000);
    const progress=motion?Math.min(1,Math.max(0,(elapsed-120)/1600)):1;
    const eased=1-Math.pow(1-progress,3);
    if(dirty||!completed)updateMask(eased);
    if(gl){
      gl.uniform2f(gl.getUniformLocation(program,'pixel'),1/mask.width,1/mask.height);
      gl.uniform1f(gl.getUniformLocation(program,'time'),waterElapsed*.001);
      gl.uniform1f(gl.getUniformLocation(program,'opening'),eased);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
      // A lost context silently ignores drawing before its async loss event runs.
      // Let that event repaint with the raster before acknowledging discovery.
      if(gl.isContextLost())return;
    }else{
      raster.clearRect(0,0,mask.width,mask.height);raster.globalCompositeOperation='source-over';raster.save();raster.translate(mask.width,0);raster.scale(-1,1);raster.drawImage(landscape,0,0,mask.width,mask.height);raster.restore();
      raster.globalCompositeOperation='destination-in';raster.drawImage(mask,0,0);raster.globalCompositeOperation='source-over';
      raster.drawImage(rimLayer,0,0);
    }
    canvas.dataset.painted=String(eased>.95);
    canvas.dataset.reveals=String(trail.points.length);
    if(progress>=1&&(!completed||completionPending)){completed=true;completionPending=false;firstPaint?.();}
    // No continuous rendering before pickup, while hidden, reduced, or long idle.
    if(!completed||(motion&&t-lastTouch<30000))request();
  }
  function request(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  const ready = async () => {
    if(loaded)return;
    [landscape,paperRim,aperture]=await Promise.all([loadImage((globalThis.innerWidth||1000)<=700?'/frontdoor/art/underpaper-valley-mobile.webp':'/frontdoor/art/underpaper-valley.webp'),loadImage('/frontdoor/art/paper-rim.webp'),loadImage('/frontdoor/art/paper-aperture.png')]);
    if(gl){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,worldTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,landscape);}
    if(gl){gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,rimTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,paperRim);}
    loaded=true;canvas.dataset.ready='true';resize();request();
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();gl=null;
    if(!fallback){fallback=document.createElement('canvas');canvas.after(fallback);fallback.className=canvas.className;fallback.id='underpaper-raster';canvas.hidden=true;raster=fallback.getContext('2d');fallback.width=mask.width;fallback.height=mask.height;}
    dirty=true;request();
  });
  return {
    ready,
    start(onPaint){firstPaint=onPaint;completionPending=true;visible=true;started=true;lastTouch=performance.now();lastFrame=0;request();},
    explore(x,y){lastTouch=performance.now();const p=position(x,y),changed=trail.connect(lastFocus,p);lastFocus=p;if(changed)dirty=true;request();return changed;},
    activity(){lastTouch=performance.now();request();},
    suspend(){visible=false;if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;},
    continue(){if(!started)return;visible=true;completionPending=true;lastFrame=0;request();},
    setMotion(value){if(value===motion)return;motion=value;lastFrame=0;if(motion)lastTouch=performance.now();request();},
    get painted(){return loaded&&completed;},
    get count(){return trail.points.length;},
    snapshot(){return trail.points.map(p=>({x:p.x,y:p.y}));},
    restore(points){trail.points.length=0;for(const p of points.slice(0,256))trail.add(p.x,p.y);elapsed=5000;dirty=true;request();},
    paperEdge(side,y){
      // Anchor to the current paper edge, including ground the visitor exposed.
      y=clamp(y,.38,.72);const row=m.getImageData(0,Math.round(y*(mask.height-1)),mask.width,1).data;
      let edge=side==='left'?.1:.86;
      for(let i=0;i<mask.width;i++){const x=side==='left'?i:mask.width-1-i;if(row[x*4+3]>128){edge=x/mask.width+(side==='left'?-.018:.018);break;}}
      return {x:clamp(edge,.07,.93),y};
    },
  };
}
