export function newLineGame(size,target,mode='ai'){
  return {version:1,size,target,mode:mode==='local'?'local':'ai',board:Array(size*size).fill(0),moves:[],turn:1,winner:0,line:[]};
}
export function winningLine(board,size,target,index){
  const who=board[index];if(!who)return [];
  const row=Math.floor(index/size),col=index%size;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
    const line=[index];
    for(const sign of [-1,1]){
      for(let step=1;step<size;step++){
        const r=row+dr*step*sign,c=col+dc*step*sign;
        if(r<0||r>=size||c<0||c>=size||board[r*size+c]!==who)break;
        if(sign<0)line.unshift(r*size+c);else line.push(r*size+c);
      }
    }
    if(line.length>=target)return line;
  }
  return [];
}
export function place(state,index){
  if(state.winner||!Number.isInteger(index)||index<0||index>=state.board.length||state.board[index])return false;
  state.board[index]=state.turn;state.moves.push(index);
  state.line=winningLine(state.board,state.size,state.target,index);
  if(state.line.length)state.winner=state.turn;
  else if(state.moves.length===state.board.length)state.winner=3;
  else state.turn=3-state.turn;
  return true;
}
export function undo(state){
  if(!state.moves.length)return false;
  const count=state.mode==='ai'&&state.board[state.moves.at(-1)]===2?2:1;
  const moves=state.moves.slice(0,-count);
  const restored=newLineGame(state.size,state.target,state.mode);moves.forEach(i=>place(restored,i));
  Object.assign(state,restored);return true;
}
export function validLineSave(s,size,target){
  if(!s||s.version!==1||s.size!==size||s.target!==target||!['ai','local'].includes(s.mode)||!Array.isArray(s.moves)||s.moves.length>size*size||!Array.isArray(s.board))return false;
  const rebuilt=newLineGame(size,target,s.mode);
  for(const i of s.moves)if(!place(rebuilt,i))return false;
  return JSON.stringify(rebuilt.board)===JSON.stringify(s.board)&&rebuilt.turn===s.turn&&rebuilt.winner===s.winner&&JSON.stringify(rebuilt.line)===JSON.stringify(s.line);
}
