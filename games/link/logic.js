export const LEVELS={easy:[6,6],normal:[6,8],hard:[8,8]};
function shuffle(items,rng){for(let i=items.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
export function findPath(s,a,b){
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||a<0||b<0||a>=s.board.length||b>=s.board.length||s.board[a]===null||s.board[b]===null)return null;
  const w=s.cols+2,h=s.rows+2,start=[Math.floor(a/s.cols)+1,a%s.cols+1],end=[Math.floor(b/s.cols)+1,b%s.cols+1];
  const dirs=[[0,1],[1,0],[0,-1],[-1,0]],seen=new Map(),queue=[{r:start[0],c:start[1],dir:-1,turns:0,path:[start]}];
  for(let head=0;head<queue.length;head++){
    const node=queue[head];
    for(let d=0;d<4;d++){
      const turns=node.turns+(node.dir!==-1&&node.dir!==d?1:0);if(turns>2)continue;
      const r=node.r+dirs[d][0],c=node.c+dirs[d][1];if(r<0||r>=h||c<0||c>=w)continue;
      const path=[...node.path,[r,c]];
      if(r===end[0]&&c===end[1])return path;
      if(r>0&&r<h-1&&c>0&&c<w-1&&s.board[(r-1)*s.cols+c-1]!==null)continue;
      const key=(r*w+c)*4+d;if((seen.get(key)??3)<=turns)continue;
      seen.set(key,turns);queue.push({r,c,dir:d,turns,path});
    }
  }
  return null;
}
export function findPair(s){
  for(let a=0;a<s.board.length;a++)if(s.board[a]!==null)for(let b=a+1;b<s.board.length;b++)if(s.board[a]===s.board[b]){
    const path=findPath(s,a,b);if(path)return {a,b,path};
  }
  return null;
}
export function reshuffle(s,rng=Math.random){
  const slots=s.board.flatMap((v,i)=>v===null?[]:[i]);if(slots.length<2)return false;
  const values=slots.map(i=>s.board[i]);
  for(let attempt=0;attempt<24;attempt++){shuffle(values,rng);slots.forEach((i,n)=>s.board[i]=values[n]);if(findPair(s))return true;}
  // Deterministic fallback: give a geometrically connectable pair the same fruit.
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++)if(findPath(s,slots[i],slots[j])){
    const a=slots[i],b=slots[j],match=slots.find(k=>k!==a&&s.board[k]===s.board[a]);
    [s.board[b],s.board[match]]=[s.board[match],s.board[b]];return true;
  }
  return false;
}
export function newGame(difficulty='easy',rng=Math.random){
  if(!Object.hasOwn(LEVELS,difficulty))difficulty='easy';const [rows,cols]=LEVELS[difficulty];
  const board=Array.from({length:rows*cols/2},(_,i)=>[i%12,i%12]).flat();
  const s={version:1,difficulty,rows,cols,board,elapsed:0,moves:0,hints:0,shuffles:0,started:false};reshuffle(s,rng);return s;
}
export function connect(s,a,b){
  if(s.board[a]===null||s.board[a]!==s.board[b])return null;
  const path=findPath(s,a,b);if(!path)return null;s.board[a]=s.board[b]=null;s.moves++;s.started=true;return path;
}
export function won(s){return s.board.every(v=>v===null);}
export function validSave(s){
  if(!s||s.version!==1||!Object.hasOwn(LEVELS,s.difficulty))return false;
  const [rows,cols]=LEVELS[s.difficulty];
  if(s.rows!==rows||s.cols!==cols||!Array.isArray(s.board)||s.board.length!==rows*cols||!s.board.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<12))return false;
  if(![s.moves,s.hints,s.shuffles].every(v=>Number.isSafeInteger(v)&&v>=0)||s.moves!==s.board.filter(v=>v===null).length/2||!Number.isFinite(s.elapsed)||s.elapsed<0||typeof s.started!=='boolean'||!s.started&&(s.moves||s.elapsed))return false;
  return Array.from({length:12},(_,v)=>s.board.filter(x=>x===v).length).every(n=>n%2===0);
}
