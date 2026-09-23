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
      c.fillStyle = ['#ae8b66', '#b89a77', '#ab8763', '#bea07a'][row % 4];
      c.fillRect(0, y, w, h / 8 - 1);
      c.strokeStyle = 'rgba(82,57,34,.13)'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        c.beginPath(); c.moveTo(0, y + 5 + i * 6);
        c.bezierCurveTo(70, y + 2 + i * 6, 180, y + 8 + i * 6, w, y + 4 + i * 6); c.stroke();
      }
      c.fillStyle = 'rgba(75,49,29,.24)'; c.fillRect((row % 3) * w / 3, y, 1, h / 8);
    }
  });
  wood.repeat.set(.6, .6);
  const tile = canvasTexture((c,w,h) => {
    c.fillStyle = '#efede5'; c.fillRect(0,0,w,h);
    c.strokeStyle = '#d9d7ce'; c.lineWidth = 1.4;
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
  const standard = (color, roughness=.75, extras={}) => new THREE.MeshStandardMaterial({color,roughness,...extras});
  return {
    wall: standard('#f4f1e9'), trim: standard('#fcfaf4', .62), taupe: standard('#bcb6a7'),
    slab: standard('#d8d4c9'), stage: standard('#d0c7b5'), ground: standard('#e8e4d8'),
    tile: standard('#ffffff',.36,{map:tile}), wood: standard('#ffffff',.65,{map:wood}),
    outdoor: standard('#c2c3b5'), grass: standard('#ffffff',1,{map:grass}),
    roof: standard('#ffffff',.82,{map:roofTile,side:THREE.DoubleSide}),
    solar: standard('#ffffff',.3,{map:solar,metalness:.35,side:THREE.DoubleSide}),
    frame: standard('#4a504d',.42,{metalness:.25}), metal: standard('#737c75',.45,{metalness:.5}),
    glass: standard('#b9d3d1',.12,{transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide}),
    sofa: standard('#e1dccf',.95), fabric: standard('#6c7472',.95), cushion: standard('#f6f2e7',.95),
    rug: standard('#9ca39a',1), timber: standard('#8b6e50'), darkWood: standard('#5f5549'),
    white: standard('#f8f5eb',.54), black: standard('#2e3432',.4), water: standard('#94b5b7',.2),
    leaves: standard('#517154',1), leavesLight: standard('#75946a',1), trunk: standard('#826e53',1),
    brass: standard('#a18a58',.4,{metalness:.5}),
    selected: new THREE.MeshBasicMaterial({color:'#377b62',transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}),
    hover: new THREE.MeshBasicMaterial({color:'#377b62',transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide}),
    invisible: new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),
  };
}
