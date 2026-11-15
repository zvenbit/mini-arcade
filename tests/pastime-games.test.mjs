import test from 'node:test';
import assert from 'node:assert/strict';
import * as whack from '../games/whack/logic.js';
import * as blocks from '../games/block1010/logic.js';
import * as lights from '../games/lights/logic.js';
import * as pipes from '../games/pipes/logic.js';
function random(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}

test('whack hits once, rewards gold and combo, misses expire and time ends exactly',()=>{
  const s=whack.newGame();s.holes[0]={life:1,kind:1};assert.equal(whack.hit(s,0).points,10);assert.equal(s.hits,1);assert.equal(whack.hit(s,0).points,0);
  s.holes[1]={life:1,kind:2};assert.equal(whack.hit(s,1).points,20);s.holes[2]={life:1,kind:1};assert.equal(whack.hit(s,2).points,12);
  s.holes[3]={life:.05,kind:1};whack.tick(s,.1,random(1));assert.equal(s.misses,1);assert.equal(s.combo,0);assert.ok(whack.validSave(s));
  whack.tick(s,100);assert.equal(s.time,0);assert.equal(s.ended,true);assert.equal(whack.hit(s,0),null);assert.ok(whack.validSave(s));
});
test('whack 60-second simulations keep bounded holes and resumable saves',()=>{
  for(let seed=1;seed<=10;seed++){const rng=random(seed),s=whack.newGame();for(let n=0;n<601;n++){whack.tick(s,.1,rng);if(n%3===0)whack.hit(s,Math.floor(rng()*9));assert.ok(whack.validSave(s));}assert.equal(s.ended,true);}
  assert.equal(whack.validSave({...whack.newGame(),time:NaN}),false);
});
test('1010 rejects out-of-bounds and overlaps without mutating or consuming a piece',()=>{
  const s=blocks.newGame(random(1));s.pieces=[3,5,0];const before=structuredClone(s);assert.equal(blocks.place(s,0,9),null);assert.deepEqual(s,before);
  assert.ok(blocks.place(s,0,0));assert.equal(s.pieces[0],null);assert.equal(s.score,3);assert.equal(blocks.place(s,1,0),null);
  assert.ok(blocks.undo(s));assert.deepEqual(s,before);assert.equal(blocks.undo(s),false);
});
test('1010 clears intersecting row and column simultaneously, scores both, and refills only after three',()=>{
  const s=blocks.newGame(random(2));s.pieces=[0,null,null];for(let n=1;n<10;n++){s.board[n]=1;s.board[n*10]=2;}
  const result=blocks.place(s,0,0,random(3));assert.equal(result.lines,2);assert.equal(result.cleared.length,19);assert.ok(s.board.every(v=>v===0));assert.equal(s.score,21);assert.ok(s.pieces.every(p=>p!==null));assert.ok(blocks.validSave(s));
  assert.ok(blocks.undo(s));assert.equal(s.pieces[0],0);assert.equal(s.pieces[1],null);assert.equal(s.board[1],1);
});
test('1010 game over considers every remaining shape and every legal anchor',()=>{
  const s=blocks.newGame();s.board.fill(1);s.board[99]=0;s.pieces=[5,null,null];assert.equal(blocks.hasMove(s),false);s.pieces[1]=0;assert.equal(blocks.hasMove(s),true);
  s.board[99]=1;assert.equal(blocks.hasMove(s),false);assert.equal(blocks.validSave({...s,pieces:[99,null,null]}),false);
});
test('lights all 30 deterministic levels and detours are solvable; hints really finish',()=>{
  for(let level=1;level<=30;level++){
    const s=lights.newGame(level),initial=structuredClone(s);assert.equal(lights.solved(s),false);assert.deepEqual(lights.newGame(level),s);assert.ok(lights.validSave(s));
    assert.ok(lights.move(s,0));assert.ok(lights.undo(s));assert.deepEqual(s,initial);
    for(let n=0;n<4&&!lights.solved(s);n++)lights.move(s,(n*3+2)%s.board.length);
    const solution=lights.solution(s);assert.ok(solution);solution.forEach(i=>lights.move(s,i));assert.ok(lights.solved(s),`level ${level}`);
    assert.equal(lights.move(s,0),false);assert.ok(lights.validSave(s));
  }
});
test('lights corner flips exactly three cells; corrupted states rejected',()=>{
  const board=Array(9).fill(0);lights.flip(board,0,3);assert.deepEqual(board,[1,1,0,1,0,0,0,0,0]);lights.flip(board,0,3);assert.ok(board.every(v=>!v));
  assert.equal(lights.validSave({...lights.newGame(),board:[0]}),false);
});
test('pipes all 30 levels have valid paths, start disconnected, and solve by rotating hinted pipes',()=>{
  for(let level=1;level<=30;level++){
    const s=pipes.newGame(level);assert.deepEqual(s,pipes.newGame(level));assert.ok(pipes.validSave(s));assert.equal(pipes.connected(s),false);
    const original=structuredClone(s);assert.ok(pipes.move(s,0));assert.ok(pipes.undo(s));assert.deepEqual(s,original);
    let n=0;while(!pipes.connected(s)&&n++<s.board.length*4){const i=pipes.hint(s);assert.ok(i>=0);pipes.move(s,i);}
    assert.ok(pipes.connected(s),`level ${level}`);assert.ok(pipes.validSave(s));assert.equal(pipes.move(s,0),false);
  }
});
test('pipes require reciprocal connections and an open outlet; rotation cycles exactly',()=>{
  for(const mask of pipes.MASKS){let m=mask;for(let n=0;n<4;n++)m=pipes.rotate(m);assert.equal(m,mask);}
  const s={size:2,board:[10,12,3,3]};assert.deepEqual(pipes.wetCells(s),[0,1,3]);assert.equal(pipes.connected(s),true);
  s.board[3]=6;assert.equal(pipes.connected(s),false);s.board[0]=5;assert.deepEqual(pipes.wetCells(s),[]);
  assert.equal(pipes.validSave({...pipes.newGame(),board:[99]}),false);
});
