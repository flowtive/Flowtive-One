/* Flowtive One — Time Tracker Calendar (Clockify-style week/day grid)
   Visualises tracked sessions as colored blocks on an hour grid. Click an
   empty area to add a manual entry at that time. Click a block to edit it
   (global session) or open the linked task. */

var _calView   = 'week';            // 'week' | 'day'
var _calAnchor = null;              // ms — start of the displayed week or day
var _calFilter = 'me';              // 'me' | 'all'
var CAL_HOUR_HEIGHT = 48;           // px per hour
var CAL_DAY_HEIGHT  = 24 * CAL_HOUR_HEIGHT;

// Date helpers — startOfDay / startOfWeek live in util.js (centralized)

function _calEnsureAnchor(){
  if(_calAnchor !== null) return;
  _calAnchor = _calView === 'week' ? startOfWeek(Date.now()) : startOfDay(Date.now());
}

function renderTimeCalendarPanel(){
  var body = document.getElementById('time-calendar-body');
  if(!body) return;
  _calEnsureAnchor();
  // On mobile, week is too cramped — force day mode under 640px
  if(window.innerWidth < 640 && _calView === 'week'){ _calView = 'day'; }

  body.innerHTML = ''
    + _calRenderToolbar()
    + _calRenderGrid();

  // Auto-scroll the grid to ~7am so the morning is in view by default
  setTimeout(function(){
    var grid = document.getElementById('cal-grid');
    if(grid && !grid.dataset.scrolled){
      grid.scrollTop = 7 * CAL_HOUR_HEIGHT;
      grid.dataset.scrolled = '1';
    }
  }, 0);
}

function _calRenderToolbar(){
  var label = _calRangeLabel();
  return '<div class="cal-toolbar">'
    + '<div class="cal-view-toggle">'
    +   '<button class="'+(_calView==='week'?'active':'')+'" onclick="setCalView(\'week\')">Week</button>'
    +   '<button class="'+(_calView==='day'?'active':'')+'" onclick="setCalView(\'day\')">Day</button>'
    + '</div>'
    + '<div class="cal-filter">'
    +   '<button class="'+(_calFilter==='me'?'active':'')+'" onclick="setCalFilter(\'me\')">Only Me</button>'
    +   '<button class="'+(_calFilter==='all'?'active':'')+'" onclick="setCalFilter(\'all\')">All Team</button>'
    + '</div>'
    + '<div class="cal-date-nav">'
    +   '<button class="cal-nav-btn" onclick="calNav(\'prev\')" title="Previous">'
    +     '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 3l-4 4 4 4"/></svg>'
    +   '</button>'
    +   '<button class="cal-today-btn" onclick="calNav(\'today\')">Today</button>'
    +   '<button class="cal-nav-btn" onclick="calNav(\'next\')" title="Next">'
    +     '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 3l4 4-4 4"/></svg>'
    +   '</button>'
    +   '<span class="cal-range-label">'+escapeHtml(label)+'</span>'
    + '</div>'
    + '<button class="cal-add-btn" onclick="openManualEntryDialog()" title="Add manual entry">'
    +   '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>'
    +   '<span>Add Entry</span>'
    + '</button>'
    + '</div>';
}

function _calRangeLabel(){
  var d = new Date(_calAnchor);
  if(_calView === 'day'){
    return d.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined});
  }
  var endD = new Date(_calAnchor + 6*86400000);
  var sameMonth = d.getMonth() === endD.getMonth();
  var sameYear  = d.getFullYear() === endD.getFullYear();
  var startStr = d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
  var endStr = endD.toLocaleDateString(undefined, sameMonth ? {day:'numeric'} : {month:'short', day:'numeric'});
  return startStr + ' – ' + endStr + (sameYear && d.getFullYear() === new Date().getFullYear() ? '' : ', '+d.getFullYear());
}

function _calRenderGrid(){
  var dayCount = _calView === 'week' ? 7 : 1;
  var dayStarts = [];
  for(var i=0; i<dayCount; i++) dayStarts.push(_calAnchor + i*86400000);

  // Day header row
  var headerHtml = '<div class="cal-header-row">'
    + '<div class="cal-hour-corner"></div>'
    + dayStarts.map(_calRenderDayHeader).join('')
    + '</div>';

  // Hour rail (left column with 0:00, 1:00, … 23:00)
  var hours = '';
  for(var h=0; h<24; h++){
    hours += '<div class="cal-hour-cell"><span class="cal-hour-label">'+_calFmtHour(h)+'</span></div>';
  }

  // Day columns with absolute-positioned entry blocks
  var entries = _calCollectEntries(dayStarts);
  var dayCols = dayStarts.map(function(ds, idx){
    var dayEntries = entries.filter(function(e){ return e._dayIdx === idx; });
    var blocksHtml = dayEntries.map(_calRenderBlock).join('');
    var nowLine = _calRenderNowLine(ds);
    var isToday = ds === startOfDay(Date.now());
    return '<div class="cal-day-col'+(isToday?' cal-today':'')+'" '
      + 'data-day-start="'+ds+'" '
      + 'onclick="_calOnEmptyClick(event, '+ds+')">'
      + '<div class="cal-day-grid">'+_calRenderHourLines()+'</div>'
      + nowLine
      + blocksHtml
      + '</div>';
  }).join('');

  return '<div class="cal-card">'
    + headerHtml
    + '<div class="cal-grid" id="cal-grid">'
    +   '<div class="cal-hour-rail">'+hours+'</div>'
    +   '<div class="cal-days-wrap" style="grid-template-columns: repeat('+dayCount+', minmax(0, 1fr))">'+dayCols+'</div>'
    + '</div>'
    + '</div>';
}

function _calRenderDayHeader(dayStart){
  var d = new Date(dayStart);
  var isToday = dayStart === startOfDay(Date.now());
  // Day total (all sessions overlapping this day, filtered)
  var name = currentUser ? currentUser.name : null;
  var total = 0;
  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || !s.start) return;
    if(_calFilter === 'me' && s.user !== name) return;
    var end = s.end || Date.now();
    var overlap = Math.max(0, Math.min(end, dayStart+86400000) - Math.max(s.start, dayStart));
    total += overlap;
  });
  if(typeof tasksData === 'object' && tasksData){
    Object.keys(tasksData).forEach(function(tid){
      var t = tasksData[tid]; if(!t || !t.timeEntries) return;
      Object.values(t.timeEntries).forEach(function(e){
        if(!e || !e.start) return;
        if(_calFilter === 'me' && e.user !== name) return;
        var end = e.end || Date.now();
        var overlap = Math.max(0, Math.min(end, dayStart+86400000) - Math.max(e.start, dayStart));
        total += overlap;
      });
    });
  }
  return '<div class="cal-day-header'+(isToday?' cal-today':'')+'">'
    + '<div class="cal-day-name">'+d.toLocaleDateString(undefined,{weekday:'short'})+'</div>'
    + '<div class="cal-day-date">'+d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+'</div>'
    + '<div class="cal-day-total">'+_calFmtHM(total)+'</div>'
    + '</div>';
}

function _calRenderHourLines(){
  var html = '';
  for(var h=0; h<24; h++){
    html += '<div class="cal-hour-line" style="top:'+(h*CAL_HOUR_HEIGHT)+'px"></div>';
  }
  return html;
}

function _calRenderNowLine(dayStart){
  var now = Date.now();
  if(now < dayStart || now >= dayStart + 86400000) return '';
  var minsFromMidnight = (now - dayStart) / 60000;
  var top = (minsFromMidnight / 60) * CAL_HOUR_HEIGHT;
  return '<div class="cal-now-line" style="top:'+top+'px"></div>';
}

/* Collect time entries that overlap the visible date range. Splits across
   day boundaries — an entry from Tue 11pm → Wed 1am renders as two blocks. */
function _calCollectEntries(dayStarts){
  var name = currentUser ? currentUser.name : null;
  var rangeStart = dayStarts[0];
  var rangeEnd = dayStarts[dayStarts.length-1] + 86400000;
  var rows = [];

  function pushSplit(base){
    var s = base.start, e = base.end || Date.now();
    if(e <= rangeStart || s >= rangeEnd) return;
    var fullStart = base.start;
    var fullEnd = base.end;
    s = Math.max(s, rangeStart);
    e = Math.min(e, rangeEnd);
    // Walk day-by-day so entries spanning midnight render in each day column
    var cursor = s;
    while(cursor < e){
      var dayStart = startOfDay(cursor);
      var dayIdx = -1;
      for(var i=0;i<dayStarts.length;i++){ if(dayStarts[i] === dayStart){ dayIdx = i; break; } }
      if(dayIdx < 0) break;
      var dayEnd = dayStart + 86400000;
      var blockEnd = Math.min(e, dayEnd);
      var copy = {};
      Object.keys(base).forEach(function(k){ copy[k] = base[k]; });
      copy.start = cursor;
      copy.end = blockEnd;
      copy._dayIdx = dayIdx;
      copy._dayStart = dayStart;
      copy._origStart = fullStart;
      copy._origEnd = fullEnd;
      copy._continuesBefore = cursor > fullStart;
      copy._continuesAfter = blockEnd < (fullEnd || Date.now());
      rows.push(copy);
      cursor = blockEnd;
    }
  }

  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || !s.start || !s.user) return;
    if(_calFilter === 'me' && s.user !== name) return;
    var member = MEMBERS.find(function(m){ return m.name === s.user; }) || {color:'#6B7280'};
    // Project color overrides member color when set — keeps the user's
    // project palette consistent across the week.
    var color = member.color;
    if(s.projectId && typeof projectsData !== 'undefined' && projectsData[s.projectId]){
      color = projectsData[s.projectId].color;
    }
    pushSplit({
      kind:'global', id:id, user:s.user, color:color,
      start:s.start, end:s.end || null,
      description: s.description || '',
      projectId: s.projectId || null,
      tags: Array.isArray(s.tags) ? s.tags : [],
      running: !s.end,
      autoClosed: !!s.autoClosed,
      manuallyAdded: !!s.manuallyAdded
    });
  });

  if(typeof tasksData === 'object' && tasksData){
    Object.keys(tasksData).forEach(function(tid){
      var t = tasksData[tid]; if(!t || !t.timeEntries) return;
      Object.keys(t.timeEntries).forEach(function(eid){
        var e = t.timeEntries[eid];
        if(!e || !e.start || !e.user) return;
        if(_calFilter === 'me' && e.user !== name) return;
        var member = MEMBERS.find(function(m){ return m.name === e.user; }) || {color:'#6B7280'};
        var isActive = !!(t.activeTimers && t.activeTimers[e.user] && t.activeTimers[e.user].entryId === eid);
        pushSplit({
          kind:'task', id:eid, taskId:tid, user:e.user, color:member.color,
          start:e.start, end:e.end || null,
          description: t.title || '(Untitled task)',
          running: isActive
        });
      });
    });
  }

  return rows;
}

/* Position a single block within its day column. */
function _calRenderBlock(b){
  var dayStart = b._dayStart;
  var startMin = (b.start - dayStart) / 60000;
  var endTs = b.end || Date.now();
  var endMin   = (endTs - dayStart) / 60000;
  var top = (startMin / 60) * CAL_HOUR_HEIGHT;
  var height = Math.max(14, ((endMin - startMin) / 60) * CAL_HOUR_HEIGHT);
  var bg = b.color || '#6B7280';
  var clickHandler = b.kind === 'task'
    ? "openTaskDrawer('"+b.taskId+"')"
    : "openEditEntryDialog('"+b.id+"')";
  var startStr = new Date(b.start).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  var endStr   = b.end ? new Date(b.end).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}) : 'now';
  var desc = b.description || '(no description)';
  var compact = height < 40;
  // For multi-day entries: show only this slice's clamped times in the meta;
  // tooltip carries the full original span for context.
  var spans = b._continuesBefore || b._continuesAfter;
  var fullStartStr = b._origStart ? new Date(b._origStart).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : startStr;
  var fullEndStr = b._origEnd ? new Date(b._origEnd).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'now';
  var sliceLabel = startStr + ' – ' + endStr + (b._continuesBefore ? ' ←' : '') + (b._continuesAfter ? ' →' : '');
  var titleStr = spans
    ? desc + ' · this slice: ' + sliceLabel + ' · full entry: ' + fullStartStr + ' → ' + fullEndStr
    : desc + ' · ' + startStr + ' – ' + endStr;
  var meta = compact ? '' : '<div class="cal-block-meta">'+escapeHtml(sliceLabel)+'</div>';
  return '<div class="cal-block'
    + (b.kind==='task'?' cal-block-task':'')
    + (b.running?' cal-block-running':'')
    + (compact?' cal-block-compact':'')
    + (spans?' cal-block-spans':'')
    + '" '
    + 'data-start="'+b.start+'" '
    + 'style="top:'+top+'px;height:'+height+'px;background:'+_calLighten(bg)+';border-left-color:'+bg+'" '
    + 'onclick="event.stopPropagation();'+clickHandler+'" '
    + 'title="'+escapeHtml(titleStr)+'">'
    + '<div class="cal-block-title">'+escapeHtml(desc)+'</div>'
    + meta
    + (b.running ? '<span class="cal-block-running-dot"></span>' : '')
    + '</div>';
}

/* Lighten a hex color for the block fill (left border keeps the solid color). */
function _calLighten(hex){
  var m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if(!m) return hex;
  var r = parseInt(m[1].substring(0,2),16);
  var g = parseInt(m[1].substring(2,4),16);
  var b = parseInt(m[1].substring(4,6),16);
  // Mix toward white at 80% (light theme) or stay darker for dark theme via opacity
  // We'll just return rgba so it works in both themes
  return 'rgba('+r+','+g+','+b+',0.18)';
}

function _calFmtHour(h){
  // 12-hour clock for the rail (matches Clockify's default)
  if(h === 0) return '12 AM';
  if(h === 12) return '12 PM';
  if(h < 12) return h + ' AM';
  return (h - 12) + ' PM';
}
function _calFmtHM(ms){
  if(!ms || ms <= 0) return '0:00';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  return h + ':' + (m<10?'0'+m:m);
}

/* ── Click handlers ── */
function _calOnEmptyClick(evt, dayStart){
  // Calculate the y-offset within the column → time clicked → 15-min rounded
  var col = evt.currentTarget;
  var rect = col.getBoundingClientRect();
  var y = evt.clientY - rect.top;
  var minutes = Math.max(0, Math.min(24*60-15, Math.round(y / CAL_HOUR_HEIGHT * 60)));
  // Round to nearest 15 minutes
  minutes = Math.round(minutes / 15) * 15;
  var startTs = dayStart + minutes*60000;
  var endTs = startTs + 60*60*1000;     // default 1-hour block
  if(typeof openManualEntryDialog === 'function'){
    // Pre-fill via the neutral staging API (decoupled from internals)
    if(typeof stageManualEntry === 'function'){
      stageManualEntry({ start: startTs, end: endTs });
    }
    openManualEntryDialog();
  }
}

/* ── Toolbar handlers ── */
function setCalView(v){
  if(v === _calView) return;
  _calView = v;
  // When switching to day, anchor on today (or current day if anchor was a week)
  if(v === 'day' && _calView !== 'day'){
    _calAnchor = startOfDay(_calAnchor || Date.now());
  } else if(v === 'week'){
    _calAnchor = startOfWeek(_calAnchor || Date.now());
  }
  renderTimeCalendarPanel();
}
function setCalFilter(f){
  _calFilter = f;
  renderTimeCalendarPanel();
}
function calNav(dir){
  var step = (_calView === 'week' ? 7 : 1) * 86400000;
  if(dir === 'prev')  _calAnchor -= step;
  if(dir === 'next')  _calAnchor += step;
  if(dir === 'today') _calAnchor = _calView === 'week' ? startOfWeek(Date.now()) : startOfDay(Date.now());
  renderTimeCalendarPanel();
}

/* ── Live tick — refresh the now-line and running blocks ── */
function tickCalendarPanel(){
  var panel = document.getElementById('panel-time-calendar');
  if(!panel || !panel.classList.contains('active')) return;
  // Update now-line position only — cheaper than re-rendering all blocks
  document.querySelectorAll('.cal-now-line').forEach(function(el){
    var col = el.parentElement;
    if(!col) return;
    var ds = parseInt(col.getAttribute('data-day-start'), 10);
    if(!ds) return;
    var now = Date.now();
    if(now < ds || now >= ds + 86400000){ el.style.display = 'none'; return; }
    el.style.display = '';
    el.style.top = (((now - ds) / 60000) / 60 * CAL_HOUR_HEIGHT) + 'px';
  });
  // Update running blocks' height
  document.querySelectorAll('.cal-block-running').forEach(function(el){
    var startStr = el.getAttribute('data-start');
    if(!startStr) return;
    var start = parseInt(startStr, 10);
    if(!start) return;
    var dayStart = startOfDay(start);
    var endMin = (Date.now() - dayStart) / 60000;
    var startMin = (start - dayStart) / 60000;
    el.style.height = Math.max(14, ((endMin - startMin)/60) * CAL_HOUR_HEIGHT) + 'px';
  });
  // Once a minute, re-render the day totals (cheap re-render of the header row)
  if(!tickCalendarPanel._lastFull || Date.now() - tickCalendarPanel._lastFull > 60000){
    tickCalendarPanel._lastFull = Date.now();
    renderTimeCalendarPanel();
  }
}
