// Translate the grabbed cell, rather than the tray button, onto the board grid.
export function dragPlacement({x,y,grabX,grabY,lift=0,cellWidth,cellHeight,stepX,stepY,left,top},shape){
  const ghostX=x-grabX*stepX-cellWidth/2,ghostY=y-lift-grabY*stepY-cellHeight/2;
  const col=Math.round((ghostX-left)/stepX),row=Math.round((ghostY-top)/stepY);
  const inside=col>=0&&row>=0&&col<10&&row<10;
  const cells=shape.map(([dx,dy])=>[col+dx,row+dy]);
  const fits=inside&&cells.every(([cx,cy])=>cx>=0&&cy>=0&&cx<10&&cy<10);
  return {ghostX,ghostY,col,row,index:inside?row*10+col:-1,fits,cells:cells.filter(([cx,cy])=>cx>=0&&cy>=0&&cx<10&&cy<10).map(([cx,cy])=>cy*10+cx)};
}
