import test from 'node:test';
import assert from 'node:assert/strict';
import {dragPlacement} from '../games/block1010/drag.js';
import {newGame,canPlace,SHAPES} from '../games/block1010/logic.js';
const grid={left:100,top:80,cellWidth:28,cellHeight:28,stepX:30,stepY:30};
test('drag anchors the grabbed cell, not the whole shape at the pointer',()=>{
  const shape=SHAPES[5]; // 2 x 2
  const p=dragPlacement({...grid,x:204,y:214,grabX:1,grabY:1},shape);
  assert.equal(p.index,32);assert.equal(p.fits,true);assert.deepEqual(p.cells,[32,33,42,43]);assert.equal(p.ghostX,160);assert.equal(p.ghostY,170);
});
test('touch lift uses the same visual and placement coordinates',()=>{
  const mouse=dragPlacement({...grid,x:174,y:184,grabX:0,grabY:0},SHAPES[3]);
  const touch=dragPlacement({...grid,x:174,y:232,grabX:0,grabY:0,lift:48},SHAPES[3]);
  assert.deepEqual(touch,mouse);
});
test('edge and occupied-cell previews stay invalid and never wrap rows',()=>{
  const outside=dragPlacement({...grid,x:384,y:94,grabX:0,grabY:0},SHAPES[3]);
  assert.equal(outside.index,9);assert.equal(outside.fits,false);assert.deepEqual(outside.cells,[9]);
  const left=dragPlacement({...grid,x:84,y:94,grabX:0,grabY:0},SHAPES[3]);assert.equal(left.index,-1);assert.equal(left.fits,false);
  const valid=dragPlacement({...grid,x:174,y:184,grabX:0,grabY:0},SHAPES[3]);const s=newGame();s.pieces=[3,null,null];assert.ok(canPlace(s,0,valid.index));s.board[valid.cells[1]]=1;assert.equal(canPlace(s,0,valid.index),false);
});
