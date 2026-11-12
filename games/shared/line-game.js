import {setup,control,keyboardGrid,readSave,writeSave} from './board-ui.js';
export function runLineGame({id,title,eyebrow,size,logic}){
  let state=logic.newGame(),last=0,thinking=.28,buttons=[];
  const isGo=size===15, names=isGo?['','黑棋','白棋']:['','叉叉 X','圆圈 O'];
  const {ui,settings,detail}=setup({id,title,eyebrow,emblem:isGo?'●':'×',help:isGo?'黑棋先行，横竖斜连成五颗或以上即胜。\n无禁手 · 点击落子 · 方向键选点 · Enter 落子':'横、竖、斜，先连成三个即胜。\n你执 X 先手 · 点击落子 · 方向键选格',restart});
  document.querySelector('.scores small').textContent='轮到';document.querySelectorAll('.scores small')[1].textContent='落子';
  settings.innerHTML='<label for="opponent">对战方式</label><select id="opponent" aria-label="选择对战方式"><option value="ai">人机对战 · 我先手</option><option value="local">双人同屏 · 轮流落子</option></select>';
  const mode=document.getElementById('opponent');
  const board=document.createElement('div');board.className=isGo?'go-grid':'tic-grid';board.setAttribute('aria-label',isGo?'十五路五子棋棋盘':'三乘三井字棋棋盘');ui.surface.append(board);
  const undoButton=control(ui,'↶ 悔一步',()=>{if(!logic.undo(state))return;thinking=.28;ui.hide();render();save();ui.sound('undo');});
  function save(){writeSave(`${id}:run`,state);}
  function build(){
    board.replaceChildren();buttons=state.board.map((_,i)=>{
      const b=document.createElement('button');b.type='button';b.className=isGo?'go-cell':'tic-cell';
      if(isGo){const r=Math.floor(i/size),c=i%size;for(const [edge,condition] of [['top',r===0],['bottom',r===size-1],['left',c===0],['right',c===size-1]])if(condition)b.classList.add('edge-'+edge);
        if([3,7,11].includes(r)&&[3,7,11].includes(c)){const star=document.createElement('i');star.className='star-dot';star.setAttribute('aria-hidden','true');b.append(star);}}
      const piece=document.createElement('span');piece.className='board-piece';piece.setAttribute('aria-hidden','true');b.append(piece);
      b.addEventListener('click',()=>humanMove(i));board.append(b);return b;
    });keyboardGrid(board,buttons,size);render();
  }
  function render(){
    buttons.forEach((b,i)=>{
      b.dataset.player=state.board[i];b.classList.toggle('last-move',state.moves.at(-1)===i);b.classList.toggle('winning',state.line.includes(i));
      b.setAttribute('aria-label',`第 ${Math.floor(i/size)+1} 行第 ${i%size+1} 列，${state.board[i]?names[state.board[i]]:'空位'}`);
      b.setAttribute('aria-disabled',String(!!state.board[i]||!!state.winner));
    });
    const waiting=state.mode==='ai'&&state.turn===2&&!state.winner;
    const who=state.winner||state.turn;
    ui.score(state.winner===3?'平局':isGo?names[who]:who===1?'X':'O',state.moves.length);
    ui.status(state.winner?'本局结束，可以再来一局':waiting?'电脑正在思考…':state.mode==='ai'?'轮到你了，挑一个好位置':`${names[state.turn]}落子`);
    detail.textContent=state.mode==='ai'?(isGo?'你执黑棋 · 电脑执白棋':'你执 X · 电脑执 O'):'双人同屏，落子后交给另一位玩家';undoButton.disabled=!state.moves.length;
  }
  function announce(){
    if(!state.winner)return;
    const title=state.winner===3?'势均力敌，平局！':state.mode==='ai'?(state.winner===1?'漂亮，你赢啦！':'这一局电脑获胜'):`${names[state.winner]}获胜！`;
    ui.show(state.winner===2&&state.mode==='ai'?'over':'win',title,`共落子 ${state.moves.length} 手。${isGo?'横、竖、斜连成五颗或以上即胜。':'再来一局，试试新的开局。'}`,'再来一局',restart);
  }
  function makeMove(index){if(!logic.place(state,index))return false;thinking=.28;ui.sound('place');render();save();announce();return true;}
  function humanMove(index){if(ui.blocked||state.winner||state.mode==='ai'&&state.turn===2)return;makeMove(index);}
  function restart(){state=logic.newGame(mode.value);thinking=.28;build();save();ui.hide();ui.sound('start');}
  mode.addEventListener('change',restart);ui.onPause(save);window.addEventListener('pagehide',save);
  const saved=readSave(`${id}:run`,null);if(logic.validSave(saved))state=saved;mode.value=state.mode;build();
  if(state.winner)announce();else ui.show('ready',logic.validSave(saved)?'接着这一局':isGo?'落子之间，藏着好棋':'来一场小小对决',isGo?'你执黑棋先手。连成五颗或以上即胜，也可以切换双人同屏。':'你执 X 先手。连成三个即胜，也可以邀请朋友双人同屏。',logic.validSave(saved)?'继续游戏':'开始对局',()=>{ui.hide();ui.sound('start');});
  function tick(now){const dt=Math.min(.1,(now-(last||now))/1000);last=now;
    if(!ui.blocked&&!state.winner&&state.mode==='ai'&&state.turn===2){thinking-=dt;if(thinking<=0){const next=logic.chooseMove(state);if(next>=0)makeMove(next);}}
    requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
}
