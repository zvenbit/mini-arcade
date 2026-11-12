import {createUI,readSave,writeSave} from './ui.js?v=garden-four-1';
import {frame} from './collection-ui.js';
export {readSave,writeSave};
export const clockText=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
export function setup({id,title,eyebrow,help,restart,emblem}){
  const ui=createUI({title,eyebrow,theme:id,help,onStart:()=>ui.hide(),onRestart:restart});
  document.body.classList.add('board-game');const panel=frame(ui,'board-emblem');
  panel.querySelector('.collection-emblem').textContent=emblem;
  const settings=document.createElement('div');settings.className='board-settings';panel.insertBefore(settings,ui.controls);
  const detail=document.createElement('p');detail.className='board-detail';panel.insertBefore(detail,ui.controls);
  return {ui,panel,settings,detail};
}
export function control(ui,text,callback){const button=document.createElement('button');button.type='button';button.textContent=text;button.addEventListener('click',callback);ui.controls.append(button);return button;}
const gridHandlers=new WeakMap();
export function keyboardGrid(board,buttons,columns,allowed=()=>true){
  const old=gridHandlers.get(board);if(old)board.removeEventListener('keydown',old);
  let focused=0;
  function focusAt(index){if(index<0||index>=buttons.length||!allowed(index))return;buttons[focused].tabIndex=-1;focused=index;buttons[focused].tabIndex=0;buttons[focused].focus({preventScroll:true});}
  buttons.forEach((button,i)=>{button.tabIndex=i===0?0:-1;button.addEventListener('focus',()=>{buttons[focused].tabIndex=-1;focused=i;button.tabIndex=0;});});
  const handler=event=>{
    const index=buttons.indexOf(document.activeElement);if(index<0)return;
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.code];if(delta===undefined)return;
    event.preventDefault();let next=index+delta;
    while(next>=0&&next<buttons.length&&!allowed(next))next+=delta;
    focusAt(next);
  };
  board.addEventListener('keydown',handler);gridHandlers.set(board,handler);
  return focusAt;
}
