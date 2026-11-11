export function frame(ui, motif) {
  const shell = document.querySelector('.game-shell');
  const panel = document.createElement('aside');
  panel.className = 'collection-panel';
  panel.setAttribute('aria-label','游戏信息与操作');
  shell.prepend(panel);
  for (const selector of ['.game-header','.toolbar','.touch-controls','.help','.storage-note']) panel.append(shell.querySelector(selector));
  const emblem = document.createElement('div');
  emblem.className = `collection-emblem ${motif}`;
  emblem.setAttribute('aria-hidden','true');
  if (motif==='crystal') emblem.innerHTML='<i></i><i></i><i></i><i></i>';
  panel.prepend(emblem);
  return panel;
}
