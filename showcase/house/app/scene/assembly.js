// Rendered assembly bands close the floor/ceiling zone without changing plan datums.
// Their depth is a presentation assumption, not a structural beam specification.
export function assemblyBands(house, defaults) {
  const floors=[...house.floors].sort((a,b)=>a.elevation-b.elevation);
  return house.walls.filter(w=>w.exterior).map(wall=>{
    const index=floors.findIndex(f=>f.id===wall.floor),floor=floors[index],next=floors[index+1];
    const bottom=wall.height||defaults.wallHeight;
    const top=next?next.elevation-floor.elevation:defaults.wallHeight+.2+(Math.max(wall.a[0],wall.b[0])<=5.5?.12:0);
    return {wall,bottom,top,depth:wall.thickness||defaults.exteriorWallThickness};
  }).filter(band=>band.top>band.bottom);
}

// Meet the beam underside exactly. Extending the columns into the beam leaves
// coplanar front faces with different finishes, which flicker as the camera moves.
export function carportFrame(house, defaults) {
  const floor2=house.floors.find(floor=>floor.id==='f2').elevation;
  const base=house.rooms.find(room=>room.id==='f1-carport').levelOffset;
  const beamBottom=defaults.wallHeight;
  return {
    beam:{size:[5.7,floor2-beamBottom,.54],position:[2.7,(floor2+beamBottom)/2,.15]},
    columns:[.05,5.4].map(x=>({size:[.27,beamBottom-base,.34],position:[x,(beamBottom+base)/2,.25]})),
    plinths:[.05,5.4].map(x=>({size:[.36,.1,.43],position:[x,base+.05,.25]})),
  };
}
