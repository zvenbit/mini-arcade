export function calculate(a,b,op){if(op==='+')return a+b;if(op==='−')return a-b;if(op==='×')return a*b;if(op==='÷'&&Math.abs(b)>1e-9)return a/b;return null;}
export function solve(items){
  if(items.length===1)return Math.abs(items[0].value-24)<1e-8?items[0].expr:null;
  for(let i=0;i<items.length;i++)for(let j=0;j<items.length;j++)if(i!==j){
    for(const op of ['+','−','×','÷']){
      const value=calculate(items[i].value,items[j].value,op);if(value===null)continue;
      const answer=solve([...items.filter((_,k)=>k!==i&&k!==j),{value,expr:`(${items[i].expr} ${op} ${items[j].expr})`}]);if(answer)return answer;
    }
  }return null;
}
export const cards=numbers=>numbers.map((value,id)=>({value,expr:String(value),id}));
export function deal(rng=Math.random){for(let n=0;n<100;n++){const numbers=Array.from({length:4},()=>1+Math.floor(rng()*9));if(solve(cards(numbers)))return numbers;}return [3,3,8,8];}
export function combine(items,a,b,op){if(a===b||!items[a]||!items[b])return null;const value=calculate(items[a].value,items[b].value,op);if(value===null)return null;return [...items.filter((_,i)=>i!==a&&i!==b),{value,expr:`(${items[a].expr} ${op} ${items[b].expr})`,id:Math.max(...items.map(x=>x.id))+1}];}
export function display(value){return Number.isInteger(value)?String(value):Number(value.toFixed(4)).toString();}
