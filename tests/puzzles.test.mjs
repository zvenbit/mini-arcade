import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBoard, difficulties, neighbors, reveal, flag, validSave } from '../games/minesweeper/logic.js';
import { parseLevel, step, isWon, inCorner, validState } from '../games/sokoban/logic.js';
import { levels } from '../games/sokoban/levels.js';
const solutions=JSON.parse(readFileSync(new URL('./sokoban-solutions.json',import.meta.url)));
test('Minesweeper: all difficulties preserve safe first cell and neighborhood',()=>{
 for(const difficulty of Object.keys(difficulties))for(const first of [0,10,difficulties[difficulty].size**2-1]){
  const s=createBoard(difficulty);reveal(s,first,()=>.42);
  assert.equal(s.cells.filter(v=>v===-1).length,s.mines);
  for(const i of [first,...neighbors(first,s.size)])assert.notEqual(s.cells[i],-1);
  assert.ok(s.open[first]);assert.equal(s.result,'');assert.ok(validSave(s));
 }
});
test('Minesweeper: flags protect cells, toggling does not start game, safe reveals win',()=>{
 const s=createBoard();flag(s,0);assert.equal(s.started,false);assert.equal(reveal(s,0),false);flag(s,0);reveal(s,0);
 s.cells.forEach((v,i)=>{if(v!==-1)reveal(s,i);});assert.equal(s.result,'won');assert.ok(validSave(s));assert.equal(flag(s,1),false);
});
test('Minesweeper: chording opens neighbors and wrong flags can lose',()=>{
 const s=createBoard();reveal(s,40,()=>.51);
 const i=s.cells.findIndex((v,i)=>v>0&&neighbors(i,s.size).some(j=>!s.open[j]&&s.cells[j]!==-1));
 reveal(s,i);for(const j of neighbors(i,s.size))if(s.cells[j]===-1)flag(s,j);
 reveal(s,i);assert.notEqual(s.result,'lost');
 const bad=createBoard();reveal(bad,40,()=>.51);
 const k=bad.cells.findIndex((v,i)=>v===1&&neighbors(i,bad.size).some(j=>!bad.open[j]&&bad.cells[j]!==-1));
 reveal(bad,k);const wrong=neighbors(k,bad.size).find(j=>!bad.open[j]&&bad.cells[j]!==-1);flag(bad,wrong);reveal(bad,k);assert.equal(bad.result,'lost');assert.ok(validSave(bad));
});
test('Minesweeper: corrupt saves are rejected',()=>{assert.equal(validSave({}),false);const s=createBoard();s.open[0]=true;assert.equal(validSave(s),false);});
test('Sokoban: all 20 original levels have legal, complete solutions',()=>{
 assert.equal(levels.length,20);assert.equal(new Set(levels.map(l=>l.rows.join(''))).size,20);
 levels.forEach((entry,index)=>{
  const l=parseLevel(entry.rows);assert.equal(l.boxes.length,l.goals.length);let s={player:l.player,boxes:l.boxes,moves:0,pushes:0};assert.ok(validState(l,s));assert.ok(!isWon(l,s));
  for(const direction of solutions[index]){const next=step(l,s,direction);assert.ok(next,`Level ${index+1}: illegal ${direction}`);s=next;}
  assert.ok(isWon(l,s),`Level ${index+1} unsolved`);
 });
});
test('Sokoban: walls, double boxes and undo snapshot preserve state',()=>{
 const l=parseLevel(['#######','#@$$ .#','#   . #','#######']);const s={player:l.player,boxes:l.boxes,moves:0,pushes:0};
 assert.equal(step(l,s,'left'),null);assert.equal(step(l,s,'right'),null);
 const next=step(l,s,'down');assert.equal(next.moves,1);assert.equal(s.moves,0);assert.deepEqual(s.boxes,l.boxes);
 assert.ok(inCorner(l,{...s,boxes:[8,9]}));
});
