export const DIRECTIONS=[[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]];
export const MASKS=[3,5,6,9,10,12];
export function rotate(mask){return ((mask<<1)&15)|(mask>>3);}
export function newGame(level=1){
  level=Math.max(1,Math.min(30,Math.floor(level)||1));const size=level<=10?4:level<=20?5:6;
  let seed=level*9719+29;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const path=[0],seen=new Set([0]);
  function visit(i){if(i===size*size-1)return true;const options=DIRECTIONS.map(([dr,dc])=>[Math.floor(i/size)+dr,i%size+dc]).filter(([r,c])=>r>=0&&r<size&&c>=0&&c<size).map(([r,c])=>r*size+c).filter(j=>!seen.has(j));
    for(let k=options.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[options[k],options[j]]=[options[j],options[k]];}
    for(const j of options){seen.add(j);path.push(j);if(visit(j))return true;path.pop();}return false;
  }visit(0);
  const target=Array.from({length:size*size},()=>MASKS[Math.floor(random()*MASKS.length)]);
  for(let k=0;k<path.length;k++){
    const i=path[k];let mask=0;
    for(const j of [path[k-1],path[k+1]])if(j!==undefined){const d=j-i;mask|=d===1?2:d===-1?8:d===size?4:1;}
    if(k===0)mask|=8;if(k===path.length-1)mask|=2;target[i]=mask;
  }
  const board=target.map(mask=>{for(let n=Math.floor(random()*4);n>0;n--)mask=rotate(mask);return mask;});
  const state={version:1,level,size,board,moves:0,hints:0,history:[]};
  if(connected(state))state.board[0]=rotate(state.board[0]);
  return {...state,target,path};
}
export function wetCells(s){
  if(!(s.board[0]&8))return [];
  const wet=new Set([0]),queue=[0];
  for(let k=0;k<queue.length;k++){
    const i=queue[k],r=Math.floor(i/s.size),c=i%s.size;
    for(const [dr,dc,bit,opposite] of DIRECTIONS){const nr=r+dr,nc=c+dc,j=nr*s.size+nc;
      if(nr<0||nr>=s.size||nc<0||nc>=s.size||!(s.board[i]&bit)||!(s.board[j]&opposite)||wet.has(j))continue;
      wet.add(j);queue.push(j);
    }
  }return [...wet];
}
export function connected(s){return !!(s.board.at(-1)&2)&&wetCells(s).includes(s.board.length-1);}
export function move(s,index){if(connected(s)||!Number.isInteger(index)||index<0||index>=s.board.length)return false;s.board[index]=rotate(s.board[index]);s.moves++;s.history.push(index);if(s.history.length>200)s.history.shift();return true;}
export function undo(s){if(!s.history.length)return false;const i=s.history.pop();for(let n=0;n<3;n++)s.board[i]=rotate(s.board[i]);s.moves--;return true;}
export function hint(s){const generated=newGame(s.level);return generated.path.find(i=>s.board[i]!==generated.target[i])??-1;}
export function validSave(s){
  if(!s||s.version!==1||!Number.isInteger(s.level)||s.level<1||s.level>30)return false;
  const initial=newGame(s.level);return s.size===initial.size&&Array.isArray(s.board)&&s.board.length===s.size*s.size&&s.board.every((m,i)=>MASKS.includes(m)&&(m===5||m===10)===(initial.target[i]===5||initial.target[i]===10))&&Number.isSafeInteger(s.moves)&&s.moves>=0&&Number.isSafeInteger(s.hints)&&s.hints>=0&&Array.isArray(s.history)&&s.history.length<=200&&s.history.length<=s.moves&&s.history.every(i=>Number.isInteger(i)&&i>=0&&i<s.board.length);
}
