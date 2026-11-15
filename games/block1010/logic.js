export const SHAPES=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1]],[[0,0],[1,0],[1,1]],[[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,0],[0,1],[0,2],[0,3],[0,4]],[[0,0],[0,1],[0,2],[1,2],[2,2]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]];
export function hand(rng=Math.random){return Array.from({length:3},()=>Math.floor(rng()*SHAPES.length));}
export function newGame(rng=Math.random){return {version:1,board:Array(100).fill(0),pieces:hand(rng),score:0,lines:0,moves:0,previous:null};}
export function cellsFor(shape,index){
  if(!Number.isInteger(index)||index<0||index>=100||!SHAPES[shape])return null;
  const x=index%10,y=Math.floor(index/10),cells=SHAPES[shape].map(([dx,dy])=>[x+dx,y+dy]);
  return cells.some(([cx,cy])=>cx>=10||cy>=10)?null:cells.map(([cx,cy])=>cy*10+cx);
}
export function canPlace(s,slot,index){const shape=s.pieces[slot];if(shape===null||shape===undefined)return false;const cells=cellsFor(shape,index);return !!cells&&cells.every(i=>!s.board[i]);}
export function hasMove(s){return s.pieces.some((p,slot)=>p!==null&&s.board.some((_,i)=>canPlace(s,slot,i)));}
export function place(s,slot,index,rng=Math.random){
  if(!canPlace(s,slot,index))return null;
  s.previous={board:[...s.board],pieces:[...s.pieces],score:s.score,lines:s.lines,moves:s.moves};
  const cells=cellsFor(s.pieces[slot],index),color=s.pieces[slot]%5+1;cells.forEach(i=>s.board[i]=color);
  const rows=[],cols=[];
  for(let n=0;n<10;n++){if(s.board.slice(n*10,n*10+10).every(Boolean))rows.push(n);if(Array.from({length:10},(_,r)=>s.board[r*10+n]).every(Boolean))cols.push(n);}
  const cleared=s.board.map((_,i)=>rows.includes(Math.floor(i/10))||cols.includes(i%10)?i:-1).filter(i=>i>=0);
  cleared.forEach(i=>s.board[i]=0);const lines=rows.length+cols.length;
  s.score+=cells.length+lines*10;s.lines+=lines;s.moves++;s.pieces[slot]=null;
  if(s.pieces.every(p=>p===null))s.pieces=hand(rng);
  return {cleared,lines};
}
export function undo(s){if(!s.previous)return false;Object.assign(s,s.previous,{previous:null});return true;}
function validPosition(s){return !!s&&Array.isArray(s.board)&&s.board.length===100&&s.board.every(v=>Number.isInteger(v)&&v>=0&&v<=5)&&Array.isArray(s.pieces)&&s.pieces.length===3&&s.pieces.some(p=>p!==null)&&s.pieces.every(p=>p===null||Number.isInteger(p)&&p>=0&&p<SHAPES.length)&&['score','lines','moves'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0);}
export function validSave(s){return !!s&&s.version===1&&validPosition(s)&&(s.previous===null||validPosition(s.previous)&&s.previous.moves===s.moves-1);}
