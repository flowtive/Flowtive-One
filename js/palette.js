/* Flowtive One — Cmd+K quick switcher (palette)
   Lightweight command palette that searches across tasks, members, email
   industries, and offers a few quick actions. Open with ⌘K / Ctrl+K. */

var _palOpen = false;
var _palResults = [];
var _palSelected = 0;

/* Bind global keydown once at script load (DOM-independent — listener checks
   target on each fire so it works whether opened via shortcut or button). */
(function bindPaletteShortcut(){
  document.addEventListener('keydown', function(e){
    // Open: Cmd/Ctrl+K
    if((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')){
      e.preventDefault();
      togglePalette();
      return;
    }
    // The palette has its own internal keydown handlers wired when open
  });
})();

function togglePalette(){
  if(_palOpen) closePalette(); else openPalette();
}

function openPalette(){
  if(_palOpen) return;
  _palOpen = true;
  var bd = document.getElementById('pal-backdrop');
  var pn = document.getElementById('pal-panel');
  if(!bd){
    bd = document.createElement('div');
    bd.className = 'pal-backdrop';
    bd.id = 'pal-backdrop';
    bd.onclick = function(e){ if(e.target === bd) closePalette(); };
    document.body.appendChild(bd);
  }
  if(!pn){
    pn = document.createElement('div');
    pn.className = 'pal-panel';
    pn.id = 'pal-panel';
    pn.innerHTML =
      '<div class="pal-input-wrap">'
      + '<svg class="pal-search-ico" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4.5"/><path d="M10 10l3 3"/></svg>'
      + '<input type="text" class="pal-input" id="pal-input" placeholder="Search tasks, members, emails…" autocomplete="off" spellcheck="false">'
      + '<kbd class="pal-esc">ESC</kbd>'
      + '</div>'
      + '<div class="pal-results" id="pal-results"></div>'
      + '<div class="pal-foot">'
      +   '<span class="pal-foot-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>'
      +   '<span class="pal-foot-hint"><kbd>↵</kbd> open</span>'
      +   '<span class="pal-foot-hint"><kbd>esc</kbd> close</span>'
      + '</div>';
    document.body.appendChild(pn);
    var inp = pn.querySelector('#pal-input');
    inp.addEventListener('input', function(){ runPaletteSearch(inp.value); });
    inp.addEventListener('keydown', onPaletteKey);
  }
  bd.classList.add('show');
  requestAnimationFrame(function(){ pn.classList.add('show'); });
  var ip = document.getElementById('pal-input');
  if(ip){ ip.value = ''; setTimeout(function(){ ip.focus(); }, 60); }
  runPaletteSearch('');
}

function closePalette(){
  _palOpen = false;
  var bd = document.getElementById('pal-backdrop');
  var pn = document.getElementById('pal-panel');
  if(bd) bd.classList.remove('show');
  if(pn) pn.classList.remove('show');
}

function onPaletteKey(e){
  if(e.key === 'Escape'){
    e.preventDefault();
    closePalette();
  } else if(e.key === 'ArrowDown'){
    e.preventDefault();
    _palSelected = Math.min(_palResults.length - 1, _palSelected + 1);
    updatePaletteSelection();
  } else if(e.key === 'ArrowUp'){
    e.preventDefault();
    _palSelected = Math.max(0, _palSelected - 1);
    updatePaletteSelection();
  } else if(e.key === 'Enter'){
    e.preventDefault();
    var r = _palResults[_palSelected];
    if(r) executePaletteResult(r);
  }
}

function updatePaletteSelection(){
  var items = document.querySelectorAll('.pal-result');
  items.forEach(function(el, i){
    el.classList.toggle('selected', i === _palSelected);
    if(i === _palSelected) el.scrollIntoView({block:'nearest'});
  });
}

/* Build the searchable corpus. Pure data — no DOM access. */
function buildPaletteCorpus(){
  var rows = [];
  var me = currentUser ? currentUser.name : null;

  // Quick actions (always present)
  rows.push({type:'action', id:'goto-dashboard',       label:'Go to Dashboard',           hint:'Switch panel', kind:'action'});
  rows.push({type:'action', id:'goto-tasks-dashboard', label:'Go to Tasks Dashboard',     hint:'Team overview', kind:'action'});
  rows.push({type:'action', id:'goto-tasks',           label:'Go to Tasks',               hint:'Task list / board', kind:'action'});
  rows.push({type:'action', id:'goto-time',            label:'Go to Time Tracker',        hint:'Log + edit time', kind:'action'});
  rows.push({type:'action', id:'goto-time-dashboard',  label:'Go to Time Tracker Dashboard', hint:'Hours analytics', kind:'action'});
  rows.push({type:'action', id:'new-task',             label:'New Task',                  hint:'Create a task', kind:'action'});
  rows.push({type:'action', id:'open-emails',          label:'Open Email Templates Library', hint:'All industries', kind:'action'});
  rows.push({type:'action', id:'toggle-theme',         label:'Toggle Dark / Light Mode',  hint:'Theme', kind:'action'});

  // Tasks (incomplete first, then done)
  if(typeof tasksData === 'object' && tasksData){
    Object.values(tasksData).forEach(function(t){
      if(!t || !t.id) return;
      var sub = (t.assignee || 'Unassigned')
        + (t.dueDate ? ' · '+(typeof fmtDueLabel==='function'?fmtDueLabel(t.dueDate):'') : '')
        + (t.status === 'done' ? ' · Done' : '');
      rows.push({
        type:'task',
        id: t.id,
        label: t.title || '(Untitled)',
        hint: sub,
        kind: 'task',
        meta: t
      });
    });
  }

  // Members
  if(typeof MEMBERS !== 'undefined' && MEMBERS){
    MEMBERS.forEach(function(m, i){
      rows.push({type:'member', id: m.name, label: m.name, hint: 'Team member', kind:'member', color: m.color, idx: i});
    });
  }

  // Email industries (open the per-industry modal directly)
  if(typeof EMAIL_TEMPLATES === 'object' && EMAIL_TEMPLATES){
    Object.keys(EMAIL_TEMPLATES).forEach(function(ind){
      var d = EMAIL_TEMPLATES[ind];
      rows.push({
        type:'email',
        id: ind,
        label: ind,
        hint: 'Email templates · '+(d && d.owner ? d.owner : ''),
        kind:'email'
      });
    });
  }

  return rows;
}

/* Score a row against the query — simple substring + token-prefix scoring.
   Higher = better. Returns 0 to skip. */
function scorePalette(row, q){
  if(!q) return row.kind === 'action' ? 5 : 1;
  q = q.toLowerCase();
  var label = (row.label || '').toLowerCase();
  var hint  = (row.hint  || '').toLowerCase();
  if(label === q) return 100;
  if(label.indexOf(q) === 0) return 80;
  if(label.indexOf(q) >= 0)  return 60;
  if(hint.indexOf(q)  >= 0)  return 30;
  // Token match (e.g. "fix bug" matches "Fix the login bug")
  var tokens = q.split(/\s+/).filter(Boolean);
  var allMatch = tokens.every(function(tok){ return label.indexOf(tok) >= 0 || hint.indexOf(tok) >= 0; });
  if(allMatch) return 20;
  return 0;
}

function runPaletteSearch(q){
  var corpus = buildPaletteCorpus();
  var scored = [];
  corpus.forEach(function(r){
    var s = scorePalette(r, q);
    if(s > 0) scored.push({score:s, row:r});
  });
  // Sort by score desc, then by type priority (actions first when no query)
  var typeOrder = {action:0, task:1, member:2, email:3};
  scored.sort(function(a,b){
    if(a.score !== b.score) return b.score - a.score;
    return (typeOrder[a.row.type]||9) - (typeOrder[b.row.type]||9);
  });
  _palResults = scored.slice(0, 30).map(function(s){ return s.row; });
  _palSelected = 0;
  renderPaletteResults(q);
}

function renderPaletteResults(q){
  var el = document.getElementById('pal-results');
  if(!el) return;
  if(!_palResults.length){
    el.innerHTML = '<div class="pal-empty">No results for "'+escapeHtml(q||'')+'"</div>';
    return;
  }
  el.innerHTML = _palResults.map(function(r, i){
    return '<button type="button" class="pal-result'+(i===_palSelected?' selected':'')+'" data-idx="'+i+'" onclick="onPaletteClick('+i+')" onmouseenter="onPaletteHover('+i+')">'
      +    '<span class="pal-result-ico pal-ico-'+r.kind+'">'+paletteIcon(r)+'</span>'
      +    '<span class="pal-result-body">'
      +      '<span class="pal-result-label">'+escapeHtml(r.label||'')+'</span>'
      +      (r.hint ? '<span class="pal-result-hint">'+escapeHtml(r.hint)+'</span>' : '')
      +    '</span>'
      +    '<span class="pal-result-type">'+paletteTypeLabel(r)+'</span>'
      +  '</button>';
  }).join('');
}

function paletteIcon(r){
  if(r.kind === 'task'){
    return '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/><path d="M4 7.5L6 9.5 10 5.5"/></svg>';
  }
  if(r.kind === 'member'){
    var img = (typeof loadAvatar === 'function') ? loadAvatar(r.id) : null;
    if(img) return '<img src="'+img+'" alt="'+escapeHtml(r.label)+'">';
    return '<span class="pal-av-fallback" style="background:'+(r.color||'#6B7280')+'">'+escapeHtml((r.label||'?').substring(0,2).toUpperCase())+'</span>';
  }
  if(r.kind === 'email'){
    return '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="11" height="8" rx="1"/><path d="M2 4l5 4 5-4"/></svg>';
  }
  // action
  return '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 2"/></svg>';
}
function paletteTypeLabel(r){
  switch(r.kind){
    case 'task':   return 'Task';
    case 'member': return 'Member';
    case 'email':  return 'Email';
    default:       return 'Action';
  }
}

function onPaletteClick(i){
  var r = _palResults[i];
  if(r) executePaletteResult(r);
}
function onPaletteHover(i){
  _palSelected = i;
  updatePaletteSelection();
}

/* Route the picked result to the right action. */
function executePaletteResult(r){
  closePalette();
  if(r.type === 'task'){
    if(typeof switchPanel === 'function') switchPanel('tasks');
    else _switchToPanel('panel-tasks');
    if(typeof openTaskDrawer === 'function') openTaskDrawer(r.id);
  } else if(r.type === 'member'){
    // Switch to that member's panel (they're rendered as #panel-{idx})
    _switchToPanel('panel-'+r.idx);
  } else if(r.type === 'email'){
    if(typeof openEmailModal === 'function') openEmailModal(r.id, false);
  } else if(r.type === 'action'){
    handlePaletteAction(r.id);
  }
}

function handlePaletteAction(id){
  function clickSidebar(elId){ var el = document.getElementById(elId); if(el) el.click(); }
  switch(id){
    case 'goto-dashboard':
      _switchToPanel('panel-dashboard');
      if(typeof buildDashboard === 'function') buildDashboard();
      break;
    case 'goto-tasks-dashboard':
      clickSidebar('sid-tasks-dashboard');
      break;
    case 'goto-tasks':
      clickSidebar('sid-tasks');
      break;
    case 'goto-time':
      clickSidebar('sid-time');
      break;
    case 'goto-time-dashboard':
      clickSidebar('sid-time-dashboard');
      break;
    case 'new-task':
      clickSidebar('sid-tasks');
      setTimeout(function(){ if(typeof openTaskDrawerForNew === 'function') openTaskDrawerForNew(); }, 80);
      break;
    case 'open-emails':
      if(typeof openEmailLibrary === 'function') openEmailLibrary();
      break;
    case 'toggle-theme':
      if(typeof toggleTheme === 'function') toggleTheme();
      break;
  }
}

/* Generic panel switch — clicks the matching sidebar item if present, falls
   back to direct DOM toggling so it works even if the sidebar item is missing. */
function _switchToPanel(panelId){
  var sidebarMap = {
    'panel-dashboard': 'sid-dashboard',
    'panel-tasks':     'sid-tasks'
  };
  var sidId = sidebarMap[panelId];
  if(sidId){
    var item = document.getElementById(sidId);
    if(item){ item.click(); return; }
  }
  // Member panels use #sid-{idx} — extract idx from panelId
  var m = panelId.match(/^panel-(\d+)$/);
  if(m){
    var sidItem = document.getElementById('sid-'+m[1]);
    if(sidItem){ sidItem.click(); return; }
  }
  // Fallback
  document.querySelectorAll('.sid-item,.sid-dashboard').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
  var p = document.getElementById(panelId);
  if(p) p.classList.add('active');
}
