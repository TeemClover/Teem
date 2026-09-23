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
