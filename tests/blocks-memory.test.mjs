import test from 'node:test';
import assert from 'node:assert/strict';
import * as blocks from '../games/tetris/logic.js';
import * as memory from '../games/memory/logic.js';
import {createDropControl} from '../games/tetris/drop-control.js';
import {createClearEffect} from '../games/tetris/effects.js';

function random(seed=42) { return () => ((seed=(seed*1664525+1013904223)>>>0)/2**32); }
test('seven-bag supplies every shape, initial state survives serialization',()=>{
  const s=blocks.newGame(random());
  assert.equal(new Set([s.active.type,...s.queue.slice(0,6)]).size,7);
  assert.ok(blocks.validSave(JSON.parse(JSON.stringify(s))));
});
test('hard drop clears four rows, scores correctly, preserves board size',()=>{
  const s=blocks.newGame(random());
  for(let y=16;y<20;y++)s.board[y]=Array.from({length:10},(_,x)=>x===4?0:2);
  s.active={type:1,rotation:1,x:2,y:0};
  assert.equal(blocks.ghost(s).y,16);
  const result=blocks.hardDrop(s,random());
  assert.equal(result.cleared,4);assert.equal(s.lines,4);assert.equal(s.score,832);
  assert.equal(result.points,800);
  assert.ok(result.before.slice(16).every(row=>row.every(Boolean)));
  assert.notEqual(result.before,s.board);
  const effect=createClearEffect(result,['','#fff','#fff']);
  assert.equal(effect.particles.length,120);
  assert.ok(effect.duration<=.35);
  assert.equal(createClearEffect(result,[],true).particles.length,0);
  assert.equal(s.board.length,20);assert.ok(s.board.every(row=>row.every(v=>v===0)));
});
test('double down accelerates only within the tap window and resets for a new piece or pause',()=>{
  const control=createDropControl();
  assert.equal(control.tap(1000),false);
  assert.equal(control.tap(1400),false);
  assert.equal(control.tap(1600),true);
  control.reset();assert.equal(control.fast,false);
  assert.equal(control.tap(1650),false);
  assert.equal(control.tap(1900),true);
  control.reset();assert.equal(control.tap(3000),false);
});
test('hold can be used once per piece, becomes available after landing',()=>{
  const s=blocks.newGame(random());const original=s.active.type;
  assert.ok(blocks.hold(s));assert.equal(s.held,original);
  assert.equal(blocks.hold(s),false);
  blocks.hardDrop(s);assert.equal(s.holdUsed,false);assert.ok(blocks.hold(s));assert.equal(s.active.type,original);
});
test('rotation kicks at the wall and movement never crosses occupied cells',()=>{
  const s=blocks.newGame(random());s.active={type:1,rotation:1,x:-2,y:4};
  assert.ok(blocks.fits(s.board,s.active));assert.ok(blocks.rotate(s));assert.ok(blocks.fits(s.board,s.active));
  while(blocks.move(s,-1)){}
  assert.equal(blocks.move(s,-1),false);
  const before=JSON.stringify(s.active);
  for(const c of blocks.cells({...s.active,y:s.active.y+1}))if(!blocks.cells(s.active).some(p=>p.x===c.x&&p.y===c.y))s.board[c.y][c.x]=2;
  assert.equal(blocks.move(s,0,1),false);assert.equal(JSON.stringify(s.active),before);
});
test('top-out stops the game without writing above the board',()=>{
  const s=blocks.newGame();s.active={type:3,rotation:0,x:3,y:-1};
  blocks.lock(s);assert.equal(s.over,true);assert.equal(s.board.length,20);
  assert.ok(s.board.every(row=>row.every(v=>v===0)));
});
test('seeded play keeps valid states until top-out; bad saves rejected',()=>{
  const rng=random(77);const s=blocks.newGame(rng);
  for(let i=0;i<300&&!s.over;i++) {
    for(let j=0;j<Math.floor(rng()*4);j++)blocks.rotate(s);
    for(let j=0;j<Math.floor(rng()*5);j++)blocks.move(s,rng()<.5?-1:1);
    blocks.hardDrop(s,rng);assert.ok(blocks.validSave(s));
  }
  assert.equal(s.over,true);
  assert.equal(blocks.validSave({...s,score:NaN}),false);
  assert.equal(blocks.validSave({...s,queue:[99]}),false);
});
test('memory creates exactly two copies of each fruit at every difficulty',()=>{
  for(const [difficulty,pairs] of Object.entries(memory.DIFFICULTIES)) {
    const s=memory.newGame(difficulty,random());assert.equal(s.deck.length,pairs*2);
    assert.equal(new Set(s.deck).size,pairs);assert.ok(memory.validSave(s));
  }
});
test('memory rejects repeated and third flips until mismatch is concealed',()=>{
  const s=memory.newGame('easy',random());const other=s.deck.findIndex(v=>v!==s.deck[0]);
  assert.equal(memory.flip(s,0),'flip');assert.equal(memory.flip(s,0),'ignored');
  assert.equal(memory.flip(s,other),'miss');assert.equal(s.turns,1);
  assert.equal(memory.flip(s,(other+1)%s.deck.length),'ignored');assert.ok(memory.validSave(s));
  memory.conceal(s);assert.equal(s.open.length,0);assert.equal(memory.flip(s,0),'flip');
});
for(const [difficulty,pairs] of Object.entries(memory.DIFFICULTIES)) test(`memory ${pairs} pairs can be completed and saved`,()=>{
  const s=memory.newGame(difficulty,random());
  for(const fruit of new Set(s.deck)) {
    const positions=s.deck.flatMap((v,i)=>v===fruit?[i]:[]);
    assert.equal(memory.flip(s,positions[0]),'flip');
    assert.ok(['match','win'].includes(memory.flip(s,positions[1])));
    assert.equal(memory.flip(s,positions[0]),'ignored');
  }
  assert.ok(memory.won(s));assert.equal(s.turns,pairs);assert.ok(memory.validSave(JSON.parse(JSON.stringify(s))));
  const broken={...s,matched:[...s.matched]};broken.matched[0]=false;assert.equal(memory.validSave(broken),false);
});
