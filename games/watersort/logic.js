export const CAPACITY=4;
export function solved(tubes){return tubes.every(t=>!t.length||(t.length===4&&t.every(v=>v===t[0])));}
export function amount(tubes,from,to){const a=tubes[from],b=tubes[to];if(from===to||!a?.length||!b||b.length===4||(b.length&&b.at(-1)!==a.at(-1)))return 0;let count=1;while(count<a.length&&a[a.length-1-count]===a.at(-1))count++;return Math.min(count,4-b.length);}
export function pour(tubes,from,to){const n=amount(tubes,from,to);if(!n)return null;const next=tubes.map(t=>[...t]);next[to].push(...next[from].splice(-n));return next;}
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function level(number){
  const colors=Math.min(6,3+Math.floor((number-1)/8)),rng=random(741+number*193);let tubes=Array.from({length:colors},(_,i)=>Array(4).fill(i));tubes.push([],[]);let solution=[],seen=new Set([JSON.stringify(tubes)]);
  // Reverse only moves whose normal maximal pour exactly restores the previous board.
  // Recording their inverses gives every generated level a constructive solution.
  for(let k=0;k<5000&&solution.length<18+number*3;k++){
    const a=Math.floor(rng()*tubes.length),b=Math.floor(rng()*tubes.length);if(a===b||!tubes[a].length||tubes[b].length===4)continue;
    const next=tubes.map(t=>[...t]);next[b].push(next[a].pop());const restored=pour(next,b,a),key=JSON.stringify(next);
    if(!restored||JSON.stringify(restored)!==JSON.stringify(tubes)||seen.has(key))continue;
    seen.add(key);tubes=next;solution.unshift([b,a]);
  }
  return {tubes,solution,colors};
}
export function validTubes(tubes,colors){return Array.isArray(tubes)&&tubes.length>=colors+2&&tubes.length<=colors+3&&tubes.every(t=>Array.isArray(t)&&t.length<=4&&t.every(c=>Number.isInteger(c)&&c>=0&&c<colors))&&Array.from({length:colors},(_,c)=>tubes.flat().filter(v=>v===c).length).every(n=>n===4);}
