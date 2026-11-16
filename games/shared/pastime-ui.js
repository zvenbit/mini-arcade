import {setup,control,keyboardGrid,readSave,writeSave} from './board-ui.js?v=twenty-1';
export {control,keyboardGrid,readSave,writeSave};
export function setupPastime(options){const result=setup(options);document.body.classList.add('pastime');return result;}
export function levelPicker(settings,level,change){
  const label=document.createElement('label');label.htmlFor='puzzle-level';label.textContent='选择关卡';
  const select=document.createElement('select');select.id='puzzle-level';select.setAttribute('aria-label','选择关卡');
  for(let n=1;n<=30;n++){const option=document.createElement('option');option.value=n;option.textContent=`第 ${String(n).padStart(2,'0')} 关 · ${n<=10?'轻松':n<=20?'进阶':'挑战'}`;select.append(option);}
  select.value=level;select.addEventListener('change',()=>change(Number(select.value)));settings.append(label,select);return select;
}
export function readRecords(id){const records=readSave(`${id}:records`,{});return records&&typeof records==='object'&&!Array.isArray(records)?records:{};}
