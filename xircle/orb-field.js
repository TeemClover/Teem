/** Small, self-contained WebGL2 point field. Decorative only; no third-party runtime. */
export function createOrbField(canvas,progress){
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
  if(!gl){canvas.dataset.renderer='static';return null;}
  const vertex=`#version 300 es
precision highp float;
in vec3 seed;uniform float time;uniform float scroll;uniform float aspect;uniform float pixelRatio;out float glow;out float tone;
void main(){float a=seed.x*6.2831853;float b=seed.y*6.2831853;float morph=.5+.5*sin(scroll*8.0+a*.2);float r=.57+.09*sin(b+time*.12);vec3 torus=vec3((r+.17*cos(b))*cos(a),.17*sin(b),(r+.17*cos(b))*sin(a));float z=seed.y*2.0-1.0;float sr=sqrt(max(0.0,1.0-z*z));vec3 sphere=vec3(sr*cos(a),z,sr*sin(a))*.73;vec3 p=mix(torus,sphere,morph*.65);float rot=time*.045+scroll*4.0;mat2 turn=mat2(cos(rot),-sin(rot),sin(rot),cos(rot));p.xz=turn*p.xz;p.xy=mat2(.94,-.34,.34,.94)*p.xy;float perspective=1.5/(1.8-p.z*.35);p.xy*=perspective;p.x=p.x/aspect+.43;p.y+=.05;gl_Position=vec4(p.xy,p.z*.2,1.0);gl_PointSize=(1.0+seed.z*1.35)*pixelRatio;glow=.12+seed.z*.34;tone=seed.y;}`;
  const fragment=`#version 300 es
precision highp float;in float glow;in float tone;out vec4 outColor;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 c=mix(vec3(.40,.67,.48),vec3(.84,.91,.56),tone);outColor=vec4(c,glow*smoothstep(.5,.04,d));}`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Decorative shader unavailable');}return s;}
  let program,vs,fs,buffer,raf=0,disposed=false,last=0;
  try{vs=shader(gl.VERTEX_SHADER,vertex);fs=shader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Decorative program unavailable');gl.useProgram(program);
    const count=innerWidth<760?900:2200,data=new Float32Array(count*3);for(let i=0;i<count;i++){data[i*3]=(i*.61803398875)%1;data[i*3+1]=(i*.41421356237)%1;data[i*3+2]=(i*.73205080757)%1;}
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);const attribute=gl.getAttribLocation(program,'seed');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,0,0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.disable(gl.DEPTH_TEST);
    const uniforms=Object.fromEntries(['time','scroll','aspect','pixelRatio'].map(name=>[name,gl.getUniformLocation(program,name)]));
    function resize(){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(uniforms.aspect,innerWidth/innerHeight);gl.uniform1f(uniforms.pixelRatio,dpr);}
    function draw(now){if(disposed)return;raf=requestAnimationFrame(draw);if(document.hidden||now-last<32)return;last=now;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(uniforms.time,now/1000);gl.uniform1f(uniforms.scroll,progress());gl.drawArrays(gl.POINTS,0,count);}
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(document.documentElement);resize();raf=requestAnimationFrame(draw);canvas.dataset.renderer='webgl2';
    const destroy=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);canvas.dataset.renderer='static';};
    canvas.addEventListener('webglcontextlost',destroy,{once:true});return {destroy};
  }catch{if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);canvas.dataset.renderer='static';return null;}
}
