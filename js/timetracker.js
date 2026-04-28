/* Flowtive One — Time Tracker panel (Clockify-style)
   Top input bar with description + start/stop + manual entry button, then
   today's entries grouped by day with totals. Edit/delete/manual-add all
   work against flowtive_time_sessions (clock.js owns the writes).
   Per-task time entries are surfaced read-only — they're tied to a task
   so editing happens in the task modal, not here. */

var _ttFilter = 'today';   // 'today' | 'yesterday' | 'this_week' | 'last_week' | 'all'

/* Date helpers — start-of-day in local timezone, returns timestamp ms */
function _ttStartOfDay(d){
  var x = new Date(d); x.setHours(0,0,0,0);
  return x.getTime();
}
function _ttStartOfWeek(d){
  var x = new Date(d); x.setHours(0,0,0,0);
  // Use Monday as week start (most common in business contexts)
  var day = x.getDay();
  var diff = (day === 0 ? -6 : 1 - day);  // Sun(0) → -6, Mon(1) → 0, etc.
  x.setDate(x.getDate() + diff);
  return x.getTime();
}

/* Returns {start, end} ms range for the active filter. */
function _ttFilterRange(){
  var now = Date.now();
  var today = _ttStartOfDay(now);
  var weekStart = _ttStartOfWeek(now);
  switch(_ttFilter){
    case 'today':     return { start: today, end: today + 86400000 };
    case 'yesterday': return { start: today - 86400000, end: today };
    case 'this_week': return { start: weekStart, end: weekStart + 7*86400000 };
    case 'last_week': return { start: weekStart - 7*86400000, end: weekStart };
    case 'all':       return { start: 0, end: now + 86400000 };
    default:          return { start: today, end: today + 86400000 };
  }
}

/* Pull all my sessions in the active filter range. Combines:
   - global sessions (flowtive_time_sessions) — editable
   - per-task time entries (task.timeEntries[*]) — read-only, linked to task
   Returns sorted newest-first. */
function _ttCollectEntries(){
  if(!currentUser) return [];
  var name = currentUser.name;
  var range = _ttFilterRange();
  var rows = [];

  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || s.user !== name || !s.start) return;
    var end = s.end || Date.now();
    // Include the entry if any part of it overlaps the range
    if(end < range.start || s.start >= range.end) return;
    rows.push({
      kind: 'global',
      id: id,
      start: s.start,
      end: s.end,                    // null if running
      durationMs: s.durationMs,
      description: s.description || '',
      autoClosed: !!s.autoClosed,
      manuallyAdded: !!s.manuallyAdded,
      running: !s.end
    });
  });

  if(typeof tasksData === 'object' && tasksData){
    Object.keys(tasksData).forEach(function(tid){
      var t = tasksData[tid];
      if(!t || !t.timeEntries) return;
      Object.keys(t.timeEntries).forEach(function(eid){
        var e = t.timeEntries[eid];
        if(!e || e.user !== name || !e.start) return;
        var end = e.end || Date.now();
        if(end < range.start || e.start >= range.end) return;
        var isActive = !!(t.activeTimers && t.activeTimers[name] && t.activeTimers[name].entryId === eid);
        rows.push({
          kind: 'task',
          id: eid,
          taskId: tid,
          taskTitle: t.title || '(Untitled task)',
          start: e.start,
          end: e.end,
          durationMs: e.durationMs,
          description: t.title || '',
          running: isActive
        });
      });
    });
  }

  rows.sort(function(a,b){ return b.start - a.start; });
  return rows;
}

function _ttSumMs(rows){
  var sum = 0;
  rows.forEach(function(r){
    if(r.durationMs) sum += r.durationMs;
    else if(r.running) sum += Date.now() - r.start;
  });
  return sum;
}

/* Group entries by calendar day for the log. */
function _ttGroupByDay(rows){
  var groups = {};
  rows.forEach(function(r){
    var key = _ttStartOfDay(r.start);
    if(!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

function renderTimeTrackerPanel(){
  var body = document.getElementById('time-panel-body');
  if(!body) return;
  if(!currentUser){
    body.innerHTML = '<div class="task-empty"><div class="task-empty-icon">🔒</div><div class="task-empty-title">Log in to see your time</div></div>';
    return;
  }

  var active = clockActive[currentUser.name];
  var todayMs = _ttSumMs(Object.keys(clockSessions||{}).map(function(id){
    var s = clockSessions[id]; if(!s || s.user !== currentUser.name) return null;
    var dayStart = _ttStartOfDay(Date.now());
    if((s.end||Date.now()) < dayStart) return null;
    return {durationMs: s.durationMs, running: !s.end, start: s.start};
  }).filter(Boolean));
  var weekRange = { start: _ttStartOfWeek(Date.now()), end: _ttStartOfWeek(Date.now()) + 7*86400000 };
  var weekMs = _ttSumMs(Object.keys(clockSessions||{}).map(function(id){
    var s = clockSessions[id]; if(!s || s.user !== currentUser.name) return null;
    var end = s.end || Date.now();
    if(end < weekRange.start || s.start >= weekRange.end) return null;
    return {durationMs: s.durationMs, running: !s.end, start: s.start};
  }).filter(Boolean));

  body.innerHTML = ''
    + renderTrackerBar(active)
    + renderTotalsBar(todayMs, weekMs)
    + renderFilterChips()
    + renderEntryLog();

  // Wire description input → live update Firebase if running
  var descInp = document.getElementById('tt-desc');
  if(descInp){
    descInp.addEventListener('blur', function(){
      if(active) updateActiveSessionDescription(descInp.value);
    });
    descInp.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){
        e.preventDefault();
        if(active){
          updateActiveSessionDescription(descInp.value);
          descInp.blur();
        } else {
          ttStart();
        }
      }
    });
  }
}

function renderTrackerBar(active){
  if(active){
    var elapsed = Date.now() - active.start;
    var existingDesc = '';
    if(clockSessions[active.sessionId]) existingDesc = clockSessions[active.sessionId].description || '';
    return '<div class="tt-tracker-bar tt-running">'
      + '<input type="text" class="tt-desc" id="tt-desc" placeholder="What are you working on?" value="'+escapeHtml(existingDesc)+'">'
      + '<div class="tt-live-time" id="tt-live-time">'+fmtTrackerTime(elapsed)+'</div>'
      + '<button class="tt-stop-btn" onclick="ttStop()">'
      +   '<svg viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/></svg>'
      +   '<span>Stop</span>'
      + '</button>'
      + '<button class="tt-manual-btn" onclick="openManualEntryDialog()" title="Add a session retroactively">'
      +   '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>'
      + '</button>'
      + '</div>';
  }
  return '<div class="tt-tracker-bar">'
    + '<input type="text" class="tt-desc" id="tt-desc" placeholder="What are you working on?">'
    + '<div class="tt-live-time tt-live-idle">00:00:00</div>'
    + '<button class="tt-start-btn" onclick="ttStart()">'
    +   '<svg viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.5v9l7-4.5z"/></svg>'
    +   '<span>Start</span>'
    + '</button>'
    + '<button class="tt-manual-btn" onclick="openManualEntryDialog()" title="Add a session retroactively">'
    +   '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>'
    + '</button>'
    + '</div>';
}

function renderTotalsBar(todayMs, weekMs){
  return '<div class="tt-totals">'
    + '<div class="tt-total-card"><div class="tt-total-label">Today</div><div class="tt-total-value">'+fmtTrackerHM(todayMs)+'</div></div>'
    + '<div class="tt-total-card"><div class="tt-total-label">This week</div><div class="tt-total-value">'+fmtTrackerHM(weekMs)+'</div></div>'
    + '</div>';
}

function renderFilterChips(){
  var labels = {today:'Today', yesterday:'Yesterday', this_week:'This Week', last_week:'Last Week', all:'All Time'};
  var html = '<div class="tt-filters">';
  ['today','yesterday','this_week','last_week','all'].forEach(function(f){
    html += '<button class="tt-filter'+(_ttFilter===f?' active':'')+'" onclick="setTimeFilter(\''+f+'\')">'+labels[f]+'</button>';
  });
  html += '</div>';
  return html;
}

function setTimeFilter(f){
  _ttFilter = f;
  renderTimeTrackerPanel();
}

function renderEntryLog(){
  var rows = _ttCollectEntries();
  if(!rows.length){
    return '<div class="tt-log"><div class="tt-empty">'
      + '<div class="tt-empty-icon">⏱</div>'
      + '<div class="tt-empty-title">No time tracked in this range</div>'
      + '<div class="tt-empty-sub">Start a timer above or click + to add a manual entry.</div>'
      + '</div></div>';
  }
  var groups = _ttGroupByDay(rows);
  var dayKeys = Object.keys(groups).sort(function(a,b){ return Number(b) - Number(a); });
  var html = '<div class="tt-log">';
  dayKeys.forEach(function(key){
    var dayRows = groups[key];
    var dayMs = _ttSumMs(dayRows);
    html += '<div class="tt-day">'
      + '<div class="tt-day-head">'
      +   '<span class="tt-day-label">'+formatTrackerDayLabel(Number(key))+'</span>'
      +   '<span class="tt-day-total">'+fmtTrackerHM(dayMs)+'</span>'
      + '</div>'
      + '<div class="tt-day-rows">'
      + dayRows.map(renderTimeRow).join('')
      + '</div>'
      + '</div>';
  });
  html += '</div>';
  return html;
}

function renderTimeRow(r){
  var isTask = r.kind === 'task';
  var desc = r.description || (isTask ? r.taskTitle : '(no description)');
  var startStr = formatTrackerClock(r.start);
  var endStr = r.running ? '<span class="tt-running-pill"><span class="tt-running-dot"></span>Running</span>' : (r.end ? formatTrackerClock(r.end) : '—');
  var durStr = r.running ? fmtTrackerHM(Date.now() - r.start) : (r.durationMs ? fmtTrackerHM(r.durationMs) : '—');
  var badges = '';
  if(isTask)            badges += '<span class="tt-badge tt-badge-task" title="Linked to a task">Task</span>';
  if(r.manuallyAdded)   badges += '<span class="tt-badge tt-badge-manual" title="Added manually">Manual</span>';
  if(r.autoClosed)      badges += '<span class="tt-badge tt-badge-auto" title="Auto-closed after 16h">Auto</span>';
  var actions = '';
  if(isTask){
    // Read-only — link to the task
    actions = '<button class="tt-row-link" onclick="openTaskDrawer(\''+r.taskId+'\')" title="Open task">'
            + '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l4-4M5 5h4v4"/></svg>'
            + '</button>';
  } else if(!r.running){
    actions = '<button class="tt-row-action" onclick="openEditEntryDialog(\''+r.id+'\')" title="Edit">'
            + '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l2 2-7 7H2v-2z"/></svg>'
            + '</button>'
            + '<button class="tt-row-action tt-row-action-danger" onclick="confirmDeleteEntry(\''+r.id+'\')" title="Delete">'
            + '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg>'
            + '</button>';
  }
  return '<div class="tt-row '+(r.running?'tt-row-running':'')+'">'
    + '<div class="tt-row-desc">'
    +   '<span class="tt-row-text">'+escapeHtml(desc)+'</span>'
    +   (badges ? '<span class="tt-row-badges">'+badges+'</span>' : '')
    + '</div>'
    + '<div class="tt-row-times">'+startStr+' <span class="tt-arrow">–</span> '+endStr+'</div>'
    + '<div class="tt-row-dur">'+durStr+'</div>'
    + '<div class="tt-row-actions">'+actions+'</div>'
    + '</div>';
}

/* ── Formatters ── */
function fmtTrackerTime(ms){
  if(!ms || ms < 0) ms = 0;
  var s = Math.floor(ms/1000);
  var h = Math.floor(s/3600);
  var m = Math.floor((s%3600)/60);
  var ss = s%60;
  function pad(n){ return n<10?'0'+n:''+n; }
  return pad(h)+':'+pad(m)+':'+pad(ss);
}
function fmtTrackerHM(ms){
  if(!ms || ms < 0) return '0:00';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  return h + ':' + (m<10?'0'+m:m);
}
function formatTrackerClock(ts){
  return new Date(ts).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
}
function formatTrackerDayLabel(ts){
  var d = new Date(ts);
  var today = _ttStartOfDay(Date.now());
  if(ts === today) return 'Today, '+d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  if(ts === today - 86400000) return 'Yesterday, '+d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  return d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year: (d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined)});
}

/* ── Actions ── */
function ttStart(){
  var inp = document.getElementById('tt-desc');
  var desc = inp ? inp.value : '';
  clockIn(desc);
}
function ttStop(){
  clockOut();
}
function confirmDeleteEntry(sessionId){
  var s = clockSessions[sessionId]; if(!s) return;
  var preview = s.description ? '"'+s.description+'" — ' : '';
  ftConfirm({
    title: 'Delete entry?',
    message: preview + fmtTrackerHM(s.durationMs||0)+' will be removed permanently.',
    confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true,
    onConfirm: function(){
      deleteSession(sessionId);
      showToast('Entry deleted');
    }
  });
}

/* ── Live tick — keep the running timer + running rows ticking ── */
function tickTimeTrackerPanel(){
  var panel = document.getElementById('panel-time');
  if(!panel || !panel.classList.contains('active')) return;
  if(!currentUser) return;
  var active = clockActive[currentUser.name];
  var liveEl = document.getElementById('tt-live-time');
  if(liveEl){
    if(active) liveEl.textContent = fmtTrackerTime(Date.now() - active.start);
    else liveEl.textContent = '00:00:00';
  }
  // Update running entry row durations + day totals every minute (cheap)
  if(!tickTimeTrackerPanel._lastFull || Date.now() - tickTimeTrackerPanel._lastFull > 30000){
    tickTimeTrackerPanel._lastFull = Date.now();
    var hasRunning = (active || (typeof tasksData==='object' && Object.values(tasksData||{}).some(function(t){
      return t && t.activeTimers && currentUser && t.activeTimers[currentUser.name];
    })));
    if(hasRunning) renderTimeTrackerPanel();
  }
}

/* ── Edit-entry dialog ── */
function openEditEntryDialog(sessionId){
  var s = clockSessions[sessionId]; if(!s) return;
  if(s.user !== (currentUser ? currentUser.name : '')){
    showToast('Only the owner can edit this');
    return;
  }
  _showEntryDialog({
    title: 'Edit Time Entry',
    description: s.description || '',
    start: s.start,
    end:   s.end,
    onSave: function(data){
      updateSession(sessionId, data);
      showToast('Entry updated', '#3AC284');
    }
  });
}

/* ── Manual-entry dialog ── */
function openManualEntryDialog(){
  if(!currentUser) return;
  // Default: an hour-long block ending now, on today's date
  var now = Date.now();
  var dayStart = _ttStartOfDay(now);
  var endTs = Math.min(now, dayStart + 23*3600*1000 + 59*60*1000);
  var startTs = Math.max(dayStart, endTs - 3600*1000);
  _showEntryDialog({
    title: 'Add Manual Entry',
    description: '',
    start: startTs,
    end:   endTs,
    onSave: function(data){
      addManualSession(data.start, data.end, data.description);
      showToast('Entry added', '#3AC284');
    }
  });
}

/* Shared dialog used by both edit + manual entry. */
function _showEntryDialog(opts){
  var bd = document.createElement('div');
  bd.className = 'ftc-backdrop';
  var startD = new Date(opts.start);
  var endD = opts.end ? new Date(opts.end) : new Date();
  function pad(n){ return n<10?'0'+n:''+n; }
  function dateVal(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function timeVal(d){ return pad(d.getHours())+':'+pad(d.getMinutes()); }
  bd.innerHTML =
    '<div class="ftc-modal" role="dialog" aria-modal="true" style="width:min(440px,calc(100vw - 32px))">'
    +  '<div class="ftc-title">'+escapeHtml(opts.title)+'</div>'
    +  '<div class="te-form">'
    +    '<label class="te-label">Description</label>'
    +    '<input type="text" class="te-input" id="te-desc" placeholder="What did you work on?" value="'+escapeHtml(opts.description||'')+'">'
    +    '<div class="te-grid">'
    +      '<div><label class="te-label">Date</label><input type="date" class="te-input" id="te-date" value="'+dateVal(startD)+'"></div>'
    +      '<div><label class="te-label">Start</label><input type="time" class="te-input" id="te-start" value="'+timeVal(startD)+'"></div>'
    +      '<div><label class="te-label">End</label><input type="time" class="te-input" id="te-end" value="'+timeVal(endD)+'"></div>'
    +    '</div>'
    +    '<div class="te-duration" id="te-duration"></div>'
    +  '</div>'
    +  '<div class="ftc-actions">'
    +    '<button class="ftc-btn ftc-cancel" type="button">Cancel</button>'
    +    '<button class="ftc-btn ftc-primary" type="button">Save</button>'
    +  '</div>'
    +'</div>';
  document.body.appendChild(bd);
  requestAnimationFrame(function(){ bd.classList.add('show'); });

  function recalcDur(){
    var d = bd.querySelector('#te-date').value;
    var s = bd.querySelector('#te-start').value;
    var e = bd.querySelector('#te-end').value;
    if(!d || !s || !e){ bd.querySelector('#te-duration').textContent = ''; return; }
    var sMs = new Date(d+'T'+s).getTime();
    var eMs = new Date(d+'T'+e).getTime();
    if(eMs <= sMs){
      bd.querySelector('#te-duration').textContent = '⚠ End must be after start';
      bd.querySelector('#te-duration').classList.add('te-duration-error');
    } else {
      bd.querySelector('#te-duration').textContent = 'Duration: '+fmtTrackerHM(eMs - sMs);
      bd.querySelector('#te-duration').classList.remove('te-duration-error');
    }
  }
  bd.querySelectorAll('#te-date,#te-start,#te-end').forEach(function(el){
    el.addEventListener('input', recalcDur);
    el.addEventListener('change', recalcDur);
  });
  recalcDur();

  var cleanup = function(){
    bd.classList.remove('show');
    setTimeout(function(){ bd.remove(); }, 200);
    document.removeEventListener('keydown', keyHandler);
  };
  bd.querySelector('.ftc-cancel').onclick = cleanup;
  bd.querySelector('.ftc-primary').onclick = function(){
    var d = bd.querySelector('#te-date').value;
    var s = bd.querySelector('#te-start').value;
    var e = bd.querySelector('#te-end').value;
    if(!d || !s || !e){ showToast('Fill date, start, and end'); return; }
    var sMs = new Date(d+'T'+s).getTime();
    var eMs = new Date(d+'T'+e).getTime();
    if(eMs <= sMs){ showToast('End must be after start'); return; }
    var desc = bd.querySelector('#te-desc').value;
    cleanup();
    if(opts.onSave) opts.onSave({description: desc, start: sMs, end: eMs});
  };
  bd.onclick = function(e){ if(e.target === bd) cleanup(); };
  var keyHandler = function(e){
    if(e.key === 'Escape') cleanup();
  };
  document.addEventListener('keydown', keyHandler);
  setTimeout(function(){ bd.querySelector('#te-desc').focus(); }, 50);
}
