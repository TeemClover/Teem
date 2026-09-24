/** Owner corrections for the 3D presentation only. The source/2D plan stays intact. */
export function createModelHouse(source) {
  const house=structuredClone(source);
  const hall=house.rooms.find(room=>room.id==='f2-204-hall');
  const bathroom=house.rooms.find(room=>room.id==='f2-205-bath');
  if(!hall||!bathroom)return house;

  // The narrow strip beside the stair void belongs to the shower, not the hall.
  // Preserve the original fixture anchors in the main part of bathroom 205.
  bathroom.furniturePolygon=structuredClone(bathroom.polygon);
  bathroom.polygon=[[9.65,-10.3],[11.6,-10.3],[11.6,-6.9],[8.5,-6.9],[8.5,-9.15],[9.65,-9.15]];
  hall.polygon=[[3.3,-6.9],[5.5,-6.9],[5.5,-7.4],[8.5,-7.4],[8.5,-6.9],[9.8,-6.9],[9.8,-5.2],[3.3,-5.2]];
  const divider=house.walls.find(wall=>wall.id==='f2-bath-west');
  if(divider)divider.openings=[{kind:'open-passage',offset:1.5,width:.85,height:2.15,sill:0}];
  // The isolated L-shaped bathroom must not show a floating wall over the vent.
  // Split the shared rear wall at its corner, retaining the same world openings.
  const rearIndex=house.walls.findIndex(wall=>wall.id==='f2-back');
  if(rearIndex!==-1) {
    const rear=house.walls[rearIndex],split=9.65-rear.a[0];
    house.walls.splice(rearIndex,1,
      {...rear,b:[9.65,rear.b[1]],openings:rear.openings.filter(o=>o.offset<split),hiddenWhenIsolating:['f2-205-bath']},
      {...rear,id:'model-bath-rear',a:[9.65,rear.a[1]],openings:rear.openings.filter(o=>o.offset>=split).map(o=>({...o,offset:o.offset-split}))},
    );
  }
  const partition=(id,a,b,openings=[])=>({id,floor:'f2',a,b,height:2.7,thickness:.1,exterior:false,openings});
  house.walls.push(
    partition('model-shower-west',[8.5,-9.15],[8.5,-6.9]),
    partition('model-shower-front',[8.5,-6.9],[9.65,-6.9]),
    partition('model-shower-rear',[8.5,-9.15],[9.65,-9.15],
      [{kind:'window',offset:.14,width:.87,height:2.08,sill:.18}]),
  );
  return house;
}

export function furnishingRoom(room) {
  return room.furniturePolygon?{...room,polygon:room.furniturePolygon}:room;
}
