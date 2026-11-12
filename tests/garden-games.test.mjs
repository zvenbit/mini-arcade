import test from 'node:test';
import assert from 'node:assert/strict';
import * as link from '../games/link/logic.js';
import * as tic from '../games/tictactoe/logic.js';
import * as go from '../games/gomoku/logic.js';
import * as slide from '../games/sliding/logic.js';
import {winningLine} from '../games/shared/line-logic.js';
const random=(seed=1)=>()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
function checkRoute(s,path){
  assert.ok(path);let turns=0,previous='';
  for(let i=1;i<path.length;i++){
    const [r,c]=path[i],[pr,pc]=path[i-1];assert.equal(Math.abs(r-pr)+Math.abs(c-pc),1);
    const d=`${r-pr},${c-pc}`;if(previous&&d!==previous)turns++;previous=d;
    if(i<path.length-1&&r>0&&r<=s.rows&&c>0&&c<=s.cols)assert.equal(s.board[(r-1)*s.cols+c-1],null);
  }assert.ok(turns<=2);
}
test('link paths use at most two bends, allow the outside corridor and never cross occupied cells',()=>{
  const s={rows:2,cols:3,board:[0,1,0,2,3,4]};const path=link.findPath(s,0,2);checkRoute(s,path);assert.ok(path.some(([r])=>r===0));
  assert.equal(link.connect(s,0,1),null);
  const trapped={rows:5,cols:5,board:Array(25).fill(1)};trapped.board[12]=trapped.board[24]=0;assert.equal(link.findPath(trapped,12,24),null);
  const open={rows:3,cols:3,board:[0,null,null,1,2,null,null,null,0]};checkRoute(open,link.findPath(open,0,8));
});
test('link games remain completable after every reshuffle, preserve tiles, and serialize at every level',()=>{
  for(const difficulty of Object.keys(link.LEVELS))for(let seed=1;seed<=6;seed++){
    const rng=random(seed),s=link.newGame(difficulty,rng);assert.ok(link.validSave(s));let loops=0;
    while(!link.won(s)&&loops++<40){
      let pair=link.findPair(s);
      if(!pair){const before=s.board.filter(v=>v!==null).sort();assert.ok(link.reshuffle(s,rng));assert.deepEqual(s.board.filter(v=>v!==null).sort(),before);pair=link.findPair(s);}
      assert.ok(pair);checkRoute(s,pair.path);assert.ok(link.connect(s,pair.a,pair.b));assert.ok(link.validSave(JSON.parse(JSON.stringify(s))));
    }assert.ok(link.won(s));
  }
});
test('link invalid counts, dimensions and elapsed values cannot be restored',()=>{
  const s=link.newGame();assert.equal(link.validSave({...s,elapsed:-1}),false);assert.equal(link.validSave({...s,cols:7}),false);
  s.board[0]=null;assert.equal(link.validSave(s),false);
});
test('tic-tac-toe optimal AI cannot lose against any sequence of human moves',()=>{
  function visit(s){assert.notEqual(s.winner,1);if(s.winner)return;
    if(s.turn===2){const i=tic.chooseMove(s);assert.ok(tic.place(s,i));visit(s);return;}
    for(let i=0;i<9;i++)if(!s.board[i]){const next=structuredClone(s);tic.place(next,i);visit(next);}
  }visit(tic.newGame());
});
test('line games reject occupied cells, restore legal history, and undo an entire human/AI turn',()=>{
  for(const logic of [tic,go]){
    const s=logic.newGame();assert.ok(logic.place(s,0));assert.equal(logic.place(s,0),false);assert.ok(logic.place(s,1));
    assert.ok(logic.validSave(JSON.parse(JSON.stringify(s))));assert.ok(logic.undo(s));assert.equal(s.moves.length,0);assert.equal(s.turn,1);
    logic.place(s,2);assert.ok(logic.undo(s));assert.equal(s.moves.length,0);
    assert.equal(logic.validSave({...s,turn:2}),false);
    const local=logic.newGame('local');logic.place(local,0);logic.place(local,1);logic.undo(local);assert.equal(local.moves.length,1);
  }
});
test('gomoku counts horizontal, vertical, both diagonals and overlines without wrapping',()=>{
  for(const [start,step] of [[33,1],[18,15],[18,16],[26,14]]){
    const board=Array(225).fill(0);for(let n=0;n<6;n++)board[start+n*step]=1;
    assert.equal(winningLine(board,15,5,start+2*step).length,6);
  }
  const board=Array(225).fill(0);[13,14,15,16,17].forEach(i=>board[i]=1);assert.equal(winningLine(board,15,5,15).length,0);
});
test('gomoku AI finishes its own four and otherwise blocks the opponent immediate win',()=>{
  for(const who of [2,1]){
    const s=go.newGame();[108,109,110,111].forEach(i=>s.board[i]=who);s.board[112]=3-who;s.moves=[108,109,110,111,112];s.turn=2;
    assert.equal(go.chooseMove(s),107);
  }
});
test('sliding shuffles are unsolved and solvable for both sizes; legal moves and undo restore exact boards',()=>{
  for(const size of [3,4])for(let seed=1;seed<=30;seed++){
    const s=slide.newGame(size,random(seed));assert.ok(slide.solvable(s.board,size));assert.equal(slide.solved(s.board),false);assert.ok(slide.validSave(s));
    const before=[...s.board],target=slide.neighbors(s.board.indexOf(0),size)[0];assert.ok(slide.move(s,target));assert.ok(slide.validSave(s));assert.ok(slide.undo(s));assert.deepEqual(s.board,before);assert.equal(s.steps,0);
  }
});
test('sliding rejects impossible/corrupt saves and detects the final move',()=>{
  const s=slide.newGame();s.board=[1,2,3,4,5,6,7,0,8];assert.ok(slide.move(s,8));assert.ok(slide.solved(s.board));assert.equal(slide.move(s,7),false);
  const broken=slide.newGame(4);[broken.board[0],broken.board[1]]=[broken.board[1],broken.board[0]];assert.equal(slide.validSave(broken),false);
  assert.equal(slide.validSave({...s,history:[Array(9).fill(0)]}),false);
});
test('sliding arrows move the numbered tile in the pressed direction',()=>{
  for(const [code,target,tile] of [['ArrowUp',7,7],['ArrowDown',1,2],['ArrowLeft',5,5],['ArrowRight',3,4]]){
    const s=slide.newGame();s.board=[1,2,3,4,0,5,6,7,8];
    const before=[...s.board];assert.equal(slide.keyboardTarget(s,code),target);
    assert.ok(slide.move(s,slide.keyboardTarget(s,code)));
    assert.equal(s.board[4],tile);assert.equal(s.board[target],0);assert.equal(s.steps,1);
    assert.ok(slide.undo(s));assert.deepEqual(s.board,before);
  }
  for(const size of [3,4])for(let blank=0;blank<size*size;blank++){
    const s=slide.newGame(size);s.board=Array.from({length:size*size},(_,i)=>i);[s.board[0],s.board[blank]]=[s.board[blank],s.board[0]];
    const row=Math.floor(blank/size),col=blank%size;
    for(const [code,expected] of [['ArrowUp',row<size-1?blank+size:-1],['ArrowDown',row>0?blank-size:-1],['ArrowLeft',col<size-1?blank+1:-1],['ArrowRight',col>0?blank-1:-1]])assert.equal(slide.keyboardTarget(s,code),expected);
    assert.equal(slide.keyboardTarget(s,'Space'),-1);
  }
});
