export function solved(board){return board.every((v,i)=>v===(i+1)%board.length);}
export function solvable(board,size){
  let inversions=0;for(let i=0;i<board.length;i++)for(let j=i+1;j<board.length;j++)if(board[i]&&board[j]&&board[i]>board[j])inversions++;
  return size%2?inversions%2===0:(inversions+size-Math.floor(board.indexOf(0)/size))%2===1;
}
export function neighbors(index,size){return [-size,size,-1,1].map(d=>index+d).filter(i=>i>=0&&i<size*size&&Math.abs(i%size-index%size)+Math.abs(Math.floor(i/size)-Math.floor(index/size))===1);}
export function keyboardTarget(state,code){
  // The arrow describes the tile's movement, so select the tile opposite the empty cell.
  const delta={ArrowUp:state.size,ArrowDown:-state.size,ArrowLeft:1,ArrowRight:-1}[code];
  if(delta===undefined)return -1;
  const blank=state.board.indexOf(0),target=blank+delta;
  return neighbors(blank,state.size).includes(target)?target:-1;
}
export function newGame(size=3,rng=Math.random){
  size=size===4?4:3;const board=Array.from({length:size*size},(_,i)=>(i+1)%(size*size));let blank=board.length-1,previous=-1;
  for(let n=0;n<size*size*30;n++){
    const options=neighbors(blank,size).filter(i=>i!==previous),next=options[Math.floor(rng()*options.length)];
    [board[blank],board[next]]=[board[next],board[blank]];previous=blank;blank=next;
  }
  if(solved(board)){const next=neighbors(blank,size)[0];[board[blank],board[next]]=[board[next],board[blank]];}
  return {version:1,size,board,steps:0,elapsed:0,history:[],started:false};
}
export function move(state,index){
  if(solved(state.board)||!neighbors(state.board.indexOf(0),state.size).includes(index))return false;
  const blank=state.board.indexOf(0);state.history.push([...state.board]);if(state.history.length>200)state.history.shift();
  [state.board[blank],state.board[index]]=[state.board[index],state.board[blank]];state.steps++;state.started=true;return true;
}
export function undo(state){if(!state.history.length)return false;state.board=state.history.pop();state.steps=Math.max(0,state.steps-1);return true;}
function validBoard(board,size){return Array.isArray(board)&&board.length===size*size&&new Set(board).size===size*size&&board.every(v=>Number.isInteger(v)&&v>=0&&v<size*size)&&solvable(board,size);}
export function validSave(s){
  if(!s||s.version!==1||![3,4].includes(s.size)||!validBoard(s.board,s.size)||!Number.isSafeInteger(s.steps)||s.steps<0||!Number.isFinite(s.elapsed)||s.elapsed<0||typeof s.started!=='boolean'||(!s.started&&(s.steps||s.elapsed))||!Array.isArray(s.history)||s.history.length>200||s.history.length>s.steps)return false;
  let next=s.board;
  for(const previous of [...s.history].reverse()){
    if(!validBoard(previous,s.size))return false;
    const blank=previous.indexOf(0),other=next.indexOf(0);
    if(!neighbors(blank,s.size).includes(other))return false;
    const copy=[...previous];[copy[blank],copy[other]]=[copy[other],copy[blank]];
    if(copy.some((v,i)=>v!==next[i]))return false;next=previous;
  }
  return true;
}
