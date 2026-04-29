/* Flowtive One — Time Tracker Timesheet (Phase 5)
   Project × day grid for the displayed week. Each cell shows the total
   hours tracked for that (project, day, current user). Click any cell —
   empty or filled — to open the manual entry dialog pre-filled with the
   project + date. Existing sessions stay; new ones are appended. */

var _tsAnchor = null;     // ms — start of the displayed week (Monday)

// Date helpers — startOfDay / startOfWeek live in util.js (centralized)

function _tsEnsureAnchor(){
  if(_tsAnchor === null) _tsAnchor = startOfWeek(Date.now());
}

function _tsFmtHM(ms){
  if(!ms || ms <= 0) return '0:00';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  return h + ':' + (m<10?'0'+m:m);
}

/* Find the first free 1-hour window for the current user on `dayStart`,
   starting at 9 AM and rolling forward in 30-minute increments to skip
   any existing sessions. Falls back to 9 AM if everything's taken. */
function _tsFindFreeHour(dayStart){
  var name = currentUser ? currentUser.name : null;
  var dayEnd = dayStart + 86400000;
  // Collect ranges occupied by this user's sessions on this day
  var occupied = [];
  if(name && typeof clockSessions === 'object' && clockSessions){
    Object.keys(clockSessions).forEach(function(sid){
      var s = clockSessions[sid];
      if(!s || s.user !== name || !s.start) return;
      var sStart = s.start;
      var sEnd = s.end || Date.now();
      if(sEnd <= dayStart || sStart >= dayEnd) return;
      occupied.push({ start: Math.max(sStart, dayStart), end: Math.min(sEnd, dayEnd) });
    });
  }
  // Per-task entries. L4: when a task entry just ended (end within the
  // last few seconds), Firebase may not have propagated the new end time
  // yet — `tasksData` could still show it as running and treat the
  // current moment as occupied. Treat very-recently-ended entries as
  // ended so the slot finder doesn't conservatively reject the moment.
  var nowMs = Date.now();
  var GRACE_MS = 5000; // ignore entries that ended in the last 5s
  if(name && typeof tasksData === 'object' && tasksData){
    Object.keys(tasksData).forEach(function(tid){
      var t = tasksData[tid];
      if(!t || !t.timeEntries) return;
      Object.keys(t.timeEntries).forEach(function(eid){
        var e = t.timeEntries[eid];
        if(!e || e.user !== name || !e.start) return;
        var eStart = e.start;
        // Treat "ended in the last 5s" as already-ended (use the stored
        // end time, not now) — avoids excluding the very moment a
        // teammate just stopped a task timer.
        var eEnd = e.end ? e.end : (nowMs - GRACE_MS);
        if(eEnd <= dayStart || eStart >= dayEnd) return;
        occupied.push({ start: Math.max(eStart, dayStart), end: Math.min(eEnd, dayEnd) });
      });
    });
  }
  // Try slots starting at 9 AM, advancing in 30-min steps until 8 PM
  var hourMs = 60*60*1000;
  var halfMs = 30*60*1000;
  for(var offset = 9*hourMs; offset + hourMs <= 20*hourMs; offset += halfMs){
    var candStart = dayStart + offset;
    var candEnd = candStart + hourMs;
    var clash = occupied.some(function(o){ return candStart < o.end && candEnd > o.start; });
    if(!clash) return candStart;
  }
  return dayStart + 9*hourMs; // fallback: original 9 AM
}

function renderTimeTimesheetPanel(){
  var body = document.getElementById('time-timesheet-body');
  if(!body) return;
  if(!currentUser){
    body.innerHTML = '<div class="rep-empty"><div class="rep-empty-icon">🔒</div><div class="rep-empty-title">Log in to see your timesheet</div></div>';
    return;
  }
  _tsEnsureAnchor();

  var name = currentUser.name;
  var dayStarts = [];
  var dayLabels = [];
  for(var i=0;i<7;i++){
    var ds = _tsAnchor + i*86400000;
    dayStarts.push(ds);
    var d = new Date(ds);
    dayLabels.push({
      weekday: d.toLocaleDateString(undefined,{weekday:'short'}),
      date:    d.toLocaleDateString(undefined,{month:'short',day:'numeric'}),
      isToday: ds === startOfDay(Date.now())
    });
  }

  // Collect this user's sessions overlapping the week, distributed per day
  // and grouped by projectId. The cell value = ms of overlap on that day.
  var grid = {};       // {projectKey: {0:ms, 1:ms, ..., 6:ms, total:ms}}
  var projectKeys = [];
  function ensureRow(key){
    if(!grid[key]){
      grid[key] = {0:0,1:0,2:0,3:0,4:0,5:0,6:0,total:0};
      projectKeys.push(key);
    }
  }

  Object.values(clockSessions||{}).forEach(function(s){
    if(!s || !s.start || s.user !== name) return;
    var end = s.end || Date.now();
    var key = s.projectId || '__none__';
    if(end <= _tsAnchor || s.start >= _tsAnchor + 7*86400000) return;
    ensureRow(key);
    for(var di=0; di<7; di++){
      var ds = dayStarts[di], de = ds + 86400000;
      var overlap = Math.max(0, Math.min(end, de) - Math.max(s.start, ds));
      if(overlap){
        grid[key][di] += overlap;
        grid[key].total += overlap;
      }
    }
  });

  // Sort: __none__ last, others by name
  projectKeys.sort(function(a,b){
    if(a === '__none__') return 1;
    if(b === '__none__') return -1;
    var pa = projectsData[a]; var pb = projectsData[b];
    return ((pa && pa.name) || '').localeCompare((pb && pb.name) || '');
  });

  var colTotals = [0,0,0,0,0,0,0];
  var grandTotal = 0;
  projectKeys.forEach(function(k){
    for(var di=0; di<7; di++) colTotals[di] += grid[k][di];
    grandTotal += grid[k].total;
  });

  body.innerHTML = ''
    + _tsRenderToolbar()
    + _tsRenderGrid(projectKeys, dayLabels, dayStarts, grid, colTotals, grandTotal);
}

function _tsRenderToolbar(){
  _tsEnsureAnchor();
  var d = new Date(_tsAnchor);
  var endD = new Date(_tsAnchor + 6*86400000);
  var label = d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' – '
            + endD.toLocaleDateString(undefined,{month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'});
  return '<div class="ts-toolbar">'
    + '<button class="rep-nav-btn" onclick="tsWeekNav(\'prev\')" title="Previous week"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 3l-4 4 4 4"/></svg></button>'
    + '<button class="rep-today-btn" onclick="tsWeekNav(\'today\')">This Week</button>'
    + '<button class="rep-nav-btn" onclick="tsWeekNav(\'next\')" title="Next week"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 3l4 4-4 4"/></svg></button>'
    + '<span class="ts-week-label">'+escapeHtml(label)+'</span>'
    + '<button class="ts-add-row-btn" onclick="tsAddRowPrompt()" title="Log time on a new project">'
    +   '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>'
    +   '<span>Add Project Row</span>'
    + '</button>'
    + '</div>';
}

function _tsRenderGrid(projectKeys, dayLabels, dayStarts, grid, colTotals, grandTotal){
  if(!projectKeys.length){
    return '<div class="rep-empty">'
      + '<div class="rep-empty-icon">📋</div>'
      + '<div class="rep-empty-title">No time tracked this week yet</div>'
      + '<div class="rep-empty-sub">Click "Add Project Row" above to log time, or use the timer / calendar.</div>'
      + '</div>';
  }

  // Header row
  var headHtml = '<tr><th class="ts-row-head">Project</th>'
    + dayLabels.map(function(l){
        return '<th class="ts-day-head'+(l.isToday?' ts-today':'')+'">'
          + '<span class="ts-day-weekday">'+escapeHtml(l.weekday)+'</span>'
          + '<span class="ts-day-date">'+escapeHtml(l.date)+'</span>'
          + '</th>';
      }).join('')
    + '<th class="ts-total-head">Total</th></tr>';

  // Body rows
  var bodyHtml = projectKeys.map(function(key){
    var p = projectsData[key];
    var label, color;
    if(key === '__none__'){ label = 'No project'; color = '#94A3B8'; }
    else { label = p ? p.name : '(Deleted project)'; color = p ? p.color : '#94A3B8'; }
    var row = grid[key];
    var cells = '';
    for(var di=0; di<7; di++){
      var ms = row[di];
      var dayStart = dayStarts[di];
      var pidArg = key === '__none__' ? "''" : "'"+key+"'";
      cells += '<td class="ts-cell'+(ms>0?'':' ts-cell-empty')+(dayLabels[di].isToday?' ts-today':'')+'" '
        + 'onclick="tsOpenAddDialog('+pidArg+', '+dayStart+')" '
        + 'title="Click to add time">'
        + (ms>0 ? '<span class="ts-cell-value">'+_tsFmtHM(ms)+'</span>' : '<span class="ts-cell-add">+</span>')
        + '</td>';
    }
    return '<tr class="ts-row">'
      + '<td class="ts-row-label">'
      +   '<span class="ts-row-dot" style="background:'+color+'"></span>'
      +   '<span class="ts-row-name">'+escapeHtml(label)+'</span>'
      + '</td>'
      + cells
      + '<td class="ts-row-total">'+_tsFmtHM(row.total)+'</td>'
      + '</tr>';
  }).join('');

  // Footer row (column totals)
  var footHtml = '<tr class="ts-foot"><td class="ts-row-label ts-foot-label">Daily Total</td>'
    + colTotals.map(function(v,i){
        return '<td class="ts-foot-cell'+(dayLabels[i].isToday?' ts-today':'')+'">'+(v>0 ? _tsFmtHM(v) : '–')+'</td>';
      }).join('')
    + '<td class="ts-grand-total">'+_tsFmtHM(grandTotal)+'</td></tr>';

  return '<div class="ts-card">'
    + '<div class="ts-table-scroll">'
    +   '<table class="ts-table">'
    +     '<thead>'+headHtml+'</thead>'
    +     '<tbody>'+bodyHtml+'</tbody>'
    +     '<tfoot>'+footHtml+'</tfoot>'
    +   '</table>'
    + '</div>'
    + '</div>';
}

/* ── Actions ── */
function tsWeekNav(dir){
  _tsEnsureAnchor();
  if(dir === 'prev')      _tsAnchor -= 7*86400000;
  else if(dir === 'next') _tsAnchor += 7*86400000;
  else if(dir === 'today') _tsAnchor = startOfWeek(Date.now());
  // Fetch older sessions on demand if we've navigated past the live window.
  if(typeof _clockLoadOlderThan === 'function' && typeof _clockOldestLoaded === 'number'){
    if(_tsAnchor < _clockOldestLoaded) _clockLoadOlderThan(_tsAnchor);
  }
  renderTimeTimesheetPanel();
}

/* Click cell → open manual entry dialog pre-filled with that project + date.
   Default block = first free hour on the clicked day for the current user
   (starting at 9 AM and rolling forward to skip existing entries). */
function tsOpenAddDialog(projectId, dayStart){
  if(typeof openManualEntryDialog !== 'function') return;
  var startTs = _tsFindFreeHour(dayStart);
  var endTs   = startTs + 60*60*1000;          // +1 hr default
  // Stage the time range via the neutral pre-fill API (no longer pokes
  // _calPendingManualEntry directly — that was a tight calendar coupling).
  if(typeof stageManualEntry === 'function'){
    stageManualEntry({ start: startTs, end: endTs });
  }
  // Stage the project for the dialog (it reads _ttStagedProjectId)
  _ttStagedProjectId = projectId || null;
  openManualEntryDialog();
}

/* "Add Project Row" — prompts for / picks a project, then opens manual
   entry on today's date with that project pre-filled. Cleanest UX given
   we don't track empty rows separately from sessions. */
function tsAddRowPrompt(){
  // If there are projects, pick one; if not, fall through to manual entry
  // and let the user create one inline.
  var projects = Object.values(projectsData||{}).filter(Boolean);
  if(!projects.length){
    showToast('Create a project first (Time Tracker → Projects)');
    return;
  }
  // Open a tiny inline picker anchored on the button. We re-use the
  // standard project picker.
  var btn = document.querySelector('.ts-add-row-btn');
  if(!btn) return;
  if(typeof openProjectPicker !== 'function') return;
  openProjectPicker(null, btn, function(pid){
    if(!pid) return;
    var dayStart = startOfDay(Date.now());
    // Default to today's slot in the displayed week if "today" is in range,
    // otherwise to the Monday of the displayed week.
    if(dayStart < _tsAnchor || dayStart >= _tsAnchor + 7*86400000){
      dayStart = _tsAnchor;
    }
    tsOpenAddDialog(pid, dayStart);
  });
}

/* Live tick — refresh totals when a tracked session crosses a minute boundary */
function tickTimesheetPanel(){
  var panel = document.getElementById('panel-time-timesheet');
  if(!panel || !panel.classList.contains('active')) return;
  if(!tickTimesheetPanel._lastFull || Date.now() - tickTimesheetPanel._lastFull > 60000){
    tickTimesheetPanel._lastFull = Date.now();
    renderTimeTimesheetPanel();
  }
}
