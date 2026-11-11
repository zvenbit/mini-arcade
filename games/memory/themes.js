import {FRUITS} from './logic.js?v=20-pairs';
export const THEMES = {
  cards:{name:'经典纸牌',eyebrow:'LITTLE CARD CLUB',noun:'纸牌',hint:'记住花色和点数，找到同一张牌',win:'漂亮，全牌配对！'},
  fruits:{name:'缤纷果园',eyebrow:'LITTLE FRUIT GARDEN',noun:'水果',hint:'慢慢看，记住每一颗水果',win:'果园大丰收！'}
};
const suits=[['红桃','♥'],['黑桃','♠'],['方块','♦'],['梅花','♣']];
export function playingCard(id){
  const rank=Math.floor(id/4)+1,suit=id%4;
  return {rank:rank===1?'A':String(rank),count:rank,suit,symbol:suits[suit][1],red:suit===0||suit===2,label:`${suits[suit][0]} ${rank===1?'A':rank}`};
}
export function cardLabel(theme,id){return theme==='cards'?playingCard(id).label:FRUITS[id];}
export function storageKeys(theme){
  const base=theme==='cards'?'memory:cards':'memory';
  return {run:`${base}:run`,records:`${base}:records`};
}
