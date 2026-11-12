import {newLineGame,place,undo,validLineSave,winningLine} from '../shared/line-logic.js';
export {place,undo};
export const newGame=mode=>newLineGame(3,3,mode);
export const validSave=s=>validLineSave(s,3,3);
const order=[4,0,2,6,8,1,3,5,7];
const cache=new Map();
function score(board,turn){
  const key=board.join('')+turn;if(cache.has(key))return cache.get(key);
  const free=board.filter(v=>!v).length;
  for(let i=0;i<9;i++)if(board[i]&&winningLine(board,3,3,i).length)return board[i]===2?10+free:-10-free;
  if(!free)return 0;
  const values=[];
  for(const i of order)if(!board[i]){board[i]=turn;values.push(score(board,3-turn));board[i]=0;}
  const result=turn===2?Math.max(...values):Math.min(...values);cache.set(key,result);return result;
}
export function chooseMove(state){
  if(state.winner)return -1;
  const board=[...state.board];let best=-Infinity,choice=-1;
  for(const i of order)if(!board[i]){board[i]=2;const value=score(board,1);board[i]=0;if(value>best){best=value;choice=i;}}
  return choice;
}
