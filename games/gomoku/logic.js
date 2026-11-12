import {newLineGame,place,undo,validLineSave,winningLine} from '../shared/line-logic.js';
export {place,undo};
export const newGame=mode=>newLineGame(15,5,mode);
export const validSave=s=>validLineSave(s,15,5);
function strength(board,index,player){
  const size=15,row=Math.floor(index/size),col=index%size;let value=0;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
    let count=1,open=0;
    for(const sign of [-1,1]){
      let r=row+dr*sign,c=col+dc*sign;
      while(r>=0&&r<size&&c>=0&&c<size&&board[r*size+c]===player){count++;r+=dr*sign;c+=dc*sign;}
      if(r>=0&&r<size&&c>=0&&c<size&&!board[r*size+c])open++;
    }
    if(count>=5)value+=1e8;
    else if(open)value+=count===4?(open===2?1e6:60000):count===3?(open===2?9000:800):count===2?(open===2?450:50):open*6;
    // Also notice broken fours/threes inside a five-intersection window.
    for(let start=-4;start<=0;start++){
      let own=0,empty=0,blocked=false;
      for(let step=0;step<5;step++){
        const r=row+(start+step)*dr,c=col+(start+step)*dc;
        if(r<0||r>=size||c<0||c>=size){blocked=true;break;}
        const v=r===row&&c===col?player:board[r*size+c];
        if(v===player)own++;else if(!v)empty++;else{blocked=true;break;}
      }
      if(!blocked)value+=own===4&&empty===1?5000:own===3?150:0;
    }
  }
  return value;
}
export function chooseMove(state){
  if(state.winner)return -1;if(!state.moves.length)return 112;
  const board=[...state.board],candidates=[];
  for(let i=0;i<225;i++)if(!board[i]){
    const r=Math.floor(i/15),c=i%15;
    if(state.moves.some(j=>Math.abs(Math.floor(j/15)-r)<=2&&Math.abs(j%15-c)<=2))candidates.push(i);
  }
  for(const player of [2,1])for(const i of candidates){board[i]=player;const wins=winningLine(board,15,5,i).length;board[i]=0;if(wins)return i;}
  let best=-Infinity,choice=candidates[0]??-1;
  for(const i of candidates){const value=strength(board,i,2)+strength(board,i,1)*1.05+(14-Math.abs(i%15-7)-Math.abs(Math.floor(i/15)-7));if(value>best){best=value;choice=i;}}
  return choice;
}
