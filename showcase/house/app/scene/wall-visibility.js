/** Shared cutaway policy. Focus is [x,z,elevation?]; the camera direction is horizontal. */
export function wallIsLowered(state,wall,focus,cameraDirection) {
  if(state.view==='whole')return false;
  if(state.wallMode==='low'||state.ceiling)return true;
  if(state.wallMode==='full')return false;
  const [ax,az]=wall.a,[bx,bz]=wall.b,dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);
  if(length<.02)return false;
  const t=state.selectedRoomId?Math.max(0,Math.min(1,((focus[0]-ax)*dx+(focus[1]-az)*dz)/(length*length))):.5;
  const rx=ax+t*dx-focus[0],rz=az+t*dz-focus[1];
  const facing=Math.abs((-dz*cameraDirection[0]+dx*cameraDirection[1])/length);
  const near=rx*cameraDirection[0]+rz*cameraDirection[1]>-.25;
  return near&&facing>.34||Boolean(state.selectedRoomId&&Math.hypot(rx,focus[2]||0,rz)<2.1&&facing>.6);
}
