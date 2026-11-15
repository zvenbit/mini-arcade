export function affected(index,size){return [index,index-size,index+size,index%size?index-1:-1,index%size<size-1?index+1:-1].filter(i=>i>=0&&i<size*size);}
export function flip(board,index,size){for(const i of affected(index,size))board[i]^=1;}
export function solved(s){return s.board.every(v=>v===0);}
export function newGame(level=1){
  level=Math.max(1,Math.min(30,Math.floor(level)||1));const size=level<=10?3:level<=20?4:5,board=Array(size*size).fill(0);
  let seed=level*7417+17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const order=Array.from({length:board.length},(_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  order.slice(0,Math.min(board.length,3+(level-1)%10+Math.floor(level/10))).forEach(i=>flip(board,i,size));if(board.every(v=>!v))flip(board,0,size);
  return {version:1,level,size,board,moves:0,hints:0,history:[]};
}
export function move(s,index){if(!Number.isInteger(index)||index<0||index>=s.board.length||solved(s))return false;flip(s.board,index,s.size);s.moves++;s.history.push(index);if(s.history.length>200)s.history.shift();return true;}
export function undo(s){if(!s.history.length)return false;flip(s.board,s.history.pop(),s.size);s.moves--;return true;}
// Gaussian elimination over GF(2): a hint always solves the current board, even after a detour.
export function solution(s){
  const n=s.board.length,rows=Array.from({length:n},(_,i)=>[...Array(n).fill(0),s.board[i]]);
  for(let c=0;c<n;c++)for(const r of affected(c,s.size))rows[r][c]=1;
  let rank=0;const pivots=[];
  for(let col=0;col<n;col++){let pivot=rows.findIndex((r,i)=>i>=rank&&r[col]);if(pivot<0)continue;[rows[pivot],rows[rank]]=[rows[rank],rows[pivot]];
    for(let r=0;r<n;r++)if(r!==rank&&rows[r][col])for(let c=col;c<=n;c++)rows[r][c]^=rows[rank][c];pivots.push(col);rank++;}
  if(rows.slice(rank).some(r=>r[n]))return null;
  const free=Array.from({length:n},(_,i)=>i).filter(i=>!pivots.includes(i));let best=null;
  for(let bits=0;bits<2**free.length;bits++){
    const answer=Array(n).fill(0);free.forEach((c,i)=>answer[c]=(bits>>i)&1);
    pivots.forEach((c,r)=>answer[c]=free.reduce((v,f)=>v^(rows[r][f]&answer[f]),rows[r][n]));
    const steps=answer.map((v,i)=>v?i:-1).filter(i=>i>=0);if(!best||steps.length<best.length)best=steps;
  }return best;
}
export function validSave(s){return !!s&&s.version===1&&Number.isInteger(s.level)&&s.level>=1&&s.level<=30&&s.size===newGame(s.level).size&&Array.isArray(s.board)&&s.board.length===s.size*s.size&&s.board.every(v=>v===0||v===1)&&Number.isSafeInteger(s.moves)&&s.moves>=0&&Number.isSafeInteger(s.hints)&&s.hints>=0&&Array.isArray(s.history)&&s.history.length<=200&&s.history.length<=s.moves&&s.history.every(i=>Number.isInteger(i)&&i>=0&&i<s.board.length)&&solution(s)!==null;}
