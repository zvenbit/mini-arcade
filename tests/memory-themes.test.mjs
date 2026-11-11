import test from 'node:test';
import assert from 'node:assert/strict';
import {playingCard,cardLabel,storageKeys} from '../games/memory/themes.js';
import {newGame,flip,won,validSave} from '../games/memory/logic.js';
test('twenty card identities cover all four suits and five ranks without collisions',()=>{
  const cards=Array.from({length:20},(_,id)=>playingCard(id));
  assert.equal(new Set(cards.map(c=>c.label)).size,20);
  for(let suit=0;suit<4;suit++)assert.deepEqual(cards.filter(c=>c.suit===suit).map(c=>c.rank),['A','2','3','4','5']);
  assert.equal(cards.filter(c=>c.red).length,10);
});
test('card theme matches exact suit and rank and supports a complete 20-pair save',()=>{
  const s=newGame('master');
  for(const id of new Set(s.deck)){
    const [a,b]=s.deck.flatMap((v,i)=>v===id?[i]:[]);
    assert.equal(cardLabel('cards',s.deck[a]),cardLabel('cards',s.deck[b]));
    flip(s,a);flip(s,b);
  }
  assert.ok(won(s));assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  assert.notEqual(cardLabel('cards',0),cardLabel('cards',1));
  assert.notEqual(cardLabel('cards',0),cardLabel('cards',4));
});
test('theme progress and records use distinct keys while preserving legacy fruit keys',()=>{
  assert.deepEqual(storageKeys('fruits'),{run:'memory:run',records:'memory:records'});
  assert.notEqual(storageKeys('cards').run,storageKeys('fruits').run);
  assert.notEqual(storageKeys('cards').records,storageKeys('fruits').records);
});
