import * as THREE from 'three';

// Procedural presentation materials. No source photograph is sent to the GPU.
function canvasTexture(draw, width = 256, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function createMaterials() {
  const wood = canvasTexture((c, w, h) => {
    c.fillStyle = '#ad8862'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) {
      const y = row * h / 8;
      c.fillStyle = ['#aa967f', '#ad9982', '#af9b85', '#ab9680'][row % 4];
      c.fillRect(0, y, w, h / 8 - 1);
      c.strokeStyle = 'rgba(82,57,34,.13)'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        c.beginPath(); c.moveTo(0, y + 5 + i * 6);
        c.bezierCurveTo(70, y + 2 + i * 6, 180, y + 8 + i * 6, w, y + 4 + i * 6); c.stroke();
      }
      c.fillStyle = 'rgba(75,49,29,.24)'; c.fillRect((row % 3) * w / 3, y, 1, h / 8);
    }
  });
  wood.repeat.set(1, 1);
  const tile = canvasTexture((c,w,h) => {
    c.fillStyle = '#f1f0ed'; c.fillRect(0,0,w,h);
    c.strokeStyle = '#cccac6'; c.lineWidth = .8;
    c.strokeRect(0,0,w,h);
    c.strokeStyle = 'rgba(192,187,174,.16)'; c.lineWidth = .8;
    c.beginPath(); c.moveTo(12, 90); c.bezierCurveTo(90,120,100,150,170,170); c.stroke();
  });
  tile.repeat.set(1.2, 1.2);
  const roofTile = canvasTexture((c,w,h) => {
    c.fillStyle = '#c78b62'; c.fillRect(0,0,w,h);
    for (let y = 0; y < h; y += 32) {
      c.fillStyle = y % 64 ? '#c38760' : '#cb9069'; c.fillRect(0,y,w,30);
      c.fillStyle = '#ad7354'; c.fillRect(0,y+30,w,2);
      for(let x=0;x<w;x+=24) { c.fillStyle='#d29870'; c.fillRect(x,y,2,29); }
    }
  });
  roofTile.repeat.set(7, 6);
  const solar = canvasTexture((c,w,h) => {
    c.fillStyle = '#173347'; c.fillRect(0,0,w,h);
    for(let y=0;y<6;y++) for(let x=0;x<10;x++) {
      c.fillStyle=(x+y)%3 ? '#203d54' : '#29485e';
      c.fillRect(x*w/10+2,y*h/6+2,w/10-4,h/6-4);
      c.fillStyle='rgba(176,198,209,.35)'; c.fillRect(x*w/10+6,y*h/6+4,1,h/6-8);
    }
  });
  const grass = canvasTexture((c,w,h) => {
    c.fillStyle = '#849f71'; c.fillRect(0,0,w,h);
    for (let i=0;i<1600;i++) {
      const x=(i*73.139)%w, y=(i*37.27)%h;
      c.fillStyle=i%2 ? 'rgba(53,88,43,.07)' : 'rgba(226,236,183,.13)';
      c.fillRect(x,y,2,3);
    }
  });
  grass.repeat.set(8,8);
  const textile=canvasTexture((c,w,h)=>{c.fillStyle='#eae7e2';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){c.fillStyle=(x+y)%2?'#dad7d3':'#f1efec';c.fillRect(x,y,1,2);}});textile.repeat.set(3,3);
  const pillowPattern=canvasTexture((c,w,h)=>{c.fillStyle='#eeece8';c.fillRect(0,0,w,h);c.strokeStyle='#4d5056';c.lineWidth=3;for(let y=-h;y<h*2;y+=50)for(let x=-w;x<w*2;x+=50){c.beginPath();c.moveTo(x,y+25);c.lineTo(x+25,y);c.lineTo(x+50,y+25);c.lineTo(x+25,y+50);c.closePath();c.stroke();}});
  const standard = (color, roughness=.75, extras={}) => new THREE.MeshStandardMaterial({color,roughness,...extras});
  return {
    wall: standard('#eeeded'), trim: standard('#faf9f7', .42), taupe: standard('#9d9a95'),
    slab: standard('#b8babc'), stage: standard('#444c55'), ground: standard('#cbd0d7'),
    tile: standard('#ffffff',.36,{map:tile}), wood: standard('#ffffff',.65,{map:wood}),
    outdoor: standard('#c2c3b5'), grass: standard('#ffffff',1,{map:grass}),
    roof: standard('#d6a082',.82,{map:roofTile,side:THREE.DoubleSide}),
    solar: standard('#ffffff',.3,{map:solar,metalness:.35,side:THREE.DoubleSide}),
    frame: standard('#4a504d',.42,{metalness:.25}), metal: standard('#737c75',.45,{metalness:.5}),
    glass: standard('#b9d3d1',.12,{transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide}),
    sofa: standard('#e4e1dc',.91,{map:textile}), fabric: standard('#535358',.88), cushion: standard('#faf8f4',.96),
    accentCushion: standard('#ffffff',.92,{map:pillowPattern}),
    rug: standard('#54575f',1), timber: standard('#927b64'), darkWood: standard('#423730'),
    cabinet: standard('#a9a8a2',.32), leather: standard('#504439',.48), mirror: standard('#99a1aa',.08,{metalness:.85}),
    marble: standard('#e8e7e4',.19), curtain: standard('#c5bfb3',1), led: standard('#fff0d1',.5,{emissive:'#fff0d1',emissiveIntensity:.55}),
    screen: standard('#182936',.22,{emissive:'#223b50',emissiveIntensity:.15}),
    white: standard('#f8f5eb',.54), black: standard('#2e3432',.4), water: standard('#94b5b7',.2),
    leaves: standard('#517154',1), leavesLight: standard('#75946a',1), trunk: standard('#826e53',1),
    brass: standard('#a18a58',.4,{metalness:.5}),
    selected: new THREE.MeshBasicMaterial({color:'#5395e7',transparent:true,opacity:.065,depthWrite:false,side:THREE.DoubleSide}),
    hover: new THREE.MeshBasicMaterial({color:'#5395e7',transparent:true,opacity:.035,depthWrite:false,side:THREE.DoubleSide}),
    invisible: new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),
  };
}
