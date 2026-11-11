import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as logic from '../games/tetris/logic.js';
import {createDropControl} from '../games/tetris/drop-control.js';
import {createClearEffect,drawClearEffect} from '../games/tetris/effects.js';
import {createAudio} from '../games/shared/audio.js';

class Element {
  children=[]; style={setProperty(){}}; classList={add(){},toggle(){}}; listeners={}; replacements=0;
  append(...items){this.children.push(...items);} insertBefore(item){this.append(item);}
  replaceChildren(...items){this.replacements++;this.children=items;}
  setAttribute(){} addEventListener(name,fn){this.listeners[name]=fn;}
  getContext(){return new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});}
}
function gameHarness() {
  const elements=new Map(), saved=new Map(); const listeners={};let now=0,raf,writes=0;
  const ui={surface:new Element(),arena:new Element(),controls:new Element(),blocked:false,
    hide(){this.blocked=false;},show(){this.blocked=true;},score(){},status(){},sound(){},onPause(fn){this.pauseHook=fn;}};
  const context={...logic,createDropControl,createClearEffect,drawClearEffect,
    createUI:()=>ui,frame:()=>new Element(),readSave:(_,fallback)=>fallback,readBest:()=>0,writeSave:(key,value)=>{writes++;saved.set(key,structuredClone(value));},
    matchMedia:()=>({matches:false}),performance:{now:()=>now},
    document:{createElement:()=>new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},addEventListener:(name,fn)=>listeners[name]=fn},
    window:{addEventListener(){}},requestAnimationFrame:fn=>raf=fn};
  vm.createContext(context);
  const source=readFileSync(new URL('../games/tetris/game.js',import.meta.url),'utf8').replace(/^import .*$/gm,'');
  vm.runInContext(source+'\nglobalThis.flow={get state(){return state},heldKeys,action};',context);
  ui.hide(); raf(0);
  return {ui,elements,saved,flow:context.flow,get writes(){return writes;},
    key(code){listeners.keydown({code,repeat:false,target:{closest:()=>false},preventDefault(){}});},
    advance(ms){for(let n=0;n<ms;n+=10){now+=10;raf(now);}}};
}
test('held down locks promptly and continues on the next piece',()=>{
  const h=gameHarness();h.flow.state.active={type:2,rotation:0,x:4,y:18};
  h.key('ArrowDown');h.advance(160);
  assert.ok(h.flow.state.board[19][4], 'soft drop must lock within 160 ms instead of waiting half a second');
  assert.ok(h.flow.heldKeys.has('ArrowDown'),'landing must not discard a physically held key');
  const nextY=h.flow.state.active.y;h.advance(80);
  assert.ok(h.flow.state.active.y>nextY,'held down must continue without releasing and pressing again');
});
test('soft drop does not rebuild previews or synchronously save for every cell',()=>{
  const h=gameHarness();h.key('ArrowDown');
  const before=h.elements.get('next-pieces').replacements,writes=h.writes;
  h.advance(140);
  assert.equal(h.elements.get('next-pieces').replacements,before,'unchanged previews should be reused');
  assert.equal(h.writes,writes,'score-only updates should stay in memory until a checkpoint');
});
function audioHarness(theme) {
  const voices=[],events={};
  const param={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
  class AudioContext {state='running';currentTime=0;destination={};
    createGain(){return {gain:param,connect(){},disconnect(){}};}
    createOscillator(){const voice={frequency:param,connect(){},disconnect(){},start(t){this.startTime=t;},stop(t=0){this.stopTime=t;}};voices.push(voice);return voice;}
  }
  const saved={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
  Object.assign(globalThis,{window:{AudioContext,addEventListener(){}},document:{addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem:()=>null},setInterval:()=>1,clearInterval:()=>{}});
  try {const audio=createAudio(theme,new Element());events.pointerdown();return {audio,voices,start:voices.length};}
  finally {Object.assign(globalThis,saved);}
}
test('Tetris landing and clear sounds finish with the visual impact',()=>{
  for(const [name,limit] of [['drop',.065],['clear',.125]]){
    const h=audioHarness('tetris');h.audio.play(name);
    const tail=Math.max(...h.voices.slice(h.start).map(v=>v.stopTime));
    assert.ok(tail<=limit,`${name} tail ${Math.round(tail*1000)} ms exceeds ${limit*1000} ms`);
  }
});
test('rapid Tetris impacts replace their previous tail instead of stacking',()=>{
  const h=audioHarness('tetris');h.audio.play('drop');const old=h.voices.slice(h.start);
  h.audio.play('clear');assert.ok(old.every(v=>v.stopTime<=.015),'new impact should cut the old impact tail');
});
test('holding sideways survives hard drop and pause releases all held controls',()=>{
  const h=gameHarness();h.key('ArrowLeft');h.flow.action('drop');
  const spawnX=h.flow.state.active.x;h.advance(250);
  assert.ok(h.flow.state.active.x<spawnX,'held left must carry over after hard drop');
  h.ui.pauseHook();assert.equal(h.flow.heldKeys.size,0);
});
test('best score is saved at a checkpoint instead of every falling cell',()=>{
  const h=gameHarness();h.key('ArrowDown');h.advance(140);
  const score=h.flow.state.score;assert.ok(score>0);
  h.ui.pauseHook();
  assert.equal(h.saved.get('tetris:best'),score);
  assert.equal(h.saved.get('tetris:run').score,score);
});
test('other games keep their original audio and pausing cancels scheduled voices',()=>{
  const h=audioHarness('memory');h.audio.play('drop');
  assert.ok(Math.max(...h.voices.slice(h.start).map(v=>v.stopTime))>.14);
  h.audio.setActive(false);assert.ok(h.voices.every(v=>v.stopTime===0));
});
test('four-line clear accepts the next move immediately while particles are visible',()=>{
  const h=gameHarness();const s=h.flow.state;
  for(let y=16;y<20;y++)s.board[y]=Array.from({length:10},(_,x)=>x===4?0:2);
  s.active={type:1,rotation:1,x:2,y:0};
  h.flow.action('drop');assert.equal(s.lines,4);
  const x=s.active.x;h.key('ArrowLeft');assert.equal(s.active.x,x-1);
  h.advance(140);assert.equal(s.over,false);
});
