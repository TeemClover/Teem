import * as THREE from 'three';

/** One panel layout for SD cell planes and HD mounting hardware.
 * House coordinates: rear is negative Z. The owner's correction moves the
 * front bank to the opposite rear slope; the east bank stays in place.
 */
export function solarModuleLayout({x0,x1,z0,z1,y,rise}) {
  const inset=Math.min(x1-x0,z1-z0)*.44;
  let east,rear;
  if(z1-z0>x1-x0) {
    const cx=(x0+x1)/2,ra=z0+inset,rb=z1-inset;
    east=[[x1,y,z1],[x1,y,z0],[cx,y+rise,ra],[cx,y+rise,rb]];
    rear=[[x1,y,z0],[x0,y,z0],[cx,y+rise,ra],[cx,y+rise,ra]];
  } else {
    const cz=(z0+z1)/2,ra=x0+inset,rb=x1-inset;
    east=[[x1,y,z1],[x1,y,z0],[rb,y+rise,cz],[rb,y+rise,cz]];
    rear=[[x1,y,z0],[x0,y,z0],[ra,y+rise,cz],[rb,y+rise,cz]];
  }
  const modules=[],width=1.02,depth=1.28;
  for(const [side,face] of [['east',east],['rear',rear]]) {
    const [a,b,c,d]=face.map(v=>new THREE.Vector3(...v));
    const base=a.clone().add(b).multiplyScalar(.5),top=c.clone().add(d).multiplyScalar(.5);
    const across=b.clone().sub(a).normalize(),slope=top.clone().sub(base),length=slope.length(),up=slope.clone().normalize();
    const normal=new THREE.Vector3().crossVectors(across,up).normalize();
    if(normal.y<0)normal.negate();
    const bottomWidth=a.distanceTo(b),topWidth=c.distanceTo(d);
    const point=(x,h)=>base.clone().addScaledVector(across,x).addScaledVector(up,h).add(new THREE.Vector3(0,.065,0));
    for(let row=0;row<2;row++) {
      const h0=.32+row*1.35,h1=h0+depth;if(h1>length-.2)continue;
      const columns=Math.max(0,Math.floor((bottomWidth+(topWidth-bottomWidth)*h1/length-.55)/1.09));
      for(let column=0;column<columns;column++) {
        const x=(column-(columns-1)/2)*1.09;
        modules.push({id:`${side}-${row}-${column}`,side,row,column,width,depth,
          center:point(x,(h0+h1)/2),across:across.clone(),up:up.clone(),normal:normal.clone(),
          corners:[point(x-width/2,h0),point(x+width/2,h0),point(x+width/2,h1),point(x-width/2,h1)].map(p=>p.toArray()),
        });
      }
    }
  }
  return modules;
}
