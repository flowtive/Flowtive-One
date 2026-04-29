/* Flowtive One — Topbar live clock + work-time tracker (clock in/out) */

/* ── Per-second tick — drives the live elapsed time on Stop Work buttons ──
   (Topbar live clock was removed in favour of relying on the OS clock; this
    interval just keeps the work-timer pill label updating in real time.) */
var _clockInterval = null;
var _clockTimeout = null;
function tickClock(){
  if(typeof tickClockUI === 'function') tickClockUI();
}
function startClock(){
  tickClock();
  if(_clockInterval) clearInterval(_clockInterval);
  if(_clockTimeout) clearTimeout(_clockTimeout);
  // Align to the next whole second, then tick every second
  var msToSecond = 1000 - (Date.now() % 1000);
  _clockTimeout = setTimeout(function(){
    tickClock();
    _clockInterval = setInterval(tickClock, 1000);
  }, msToSecond);
}
function stopClock(){
  if(_clockInterval) clearInterval(_clockInterval);
  if(_clockTimeout) clearTimeout(_clockTimeout);
  _clockInterval = null;
  _clockTimeout = null;
}


/* ── Time Tracker (Clock in / Clock out) ─────────────────────────── */
var clockSessions = {};   // {sessionId: {user, start, end, durationMs, autoClosed?}}
var clockActive = {};     // {userName: {sessionId, start, user}}
var _clockSubscribed = false;
var SESSION_AUTO_CLOSE_MS = 16*60*60*1000; // 16h cap

/* ── Session loading window ────────────────────────────────────
   We default to "last 12 months" via .startAt(threshold) instead of the
   old limitToLast(500) which silently dropped older entries.
   Older ranges are loaded on demand via _clockLoadOlderThan(targetMs)
   when the user picks a Reports preset (All Time / Last Year) or
   navigates the Calendar/Timesheet far enough back. */
var FRESH_WINDOW_MS = 365 * 86400000; // 12 months
var _clockFreshThreshold = 0;          // earliest ms covered by the live listener
var _clockOldestLoaded = 0;            // earliest ms we have data for (live + manual)
var _clockFreshKeys = {};              // ids currently in the live window (for delete-detection)
var _clockLoadingOlder = false;        // simple guard so concurrent triggers coalesce

function fmtElapsed(ms){
  if(!ms || ms < 0) return '0m';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  if(h > 0) return h+'h '+m+'m';
  if(totalMin > 0) return m+'m';
  return Math.max(1, Math.floor(ms/1000))+'s';
}
function fmtHours(ms){
  if(!ms || ms <= 0) return '0';
  var h = ms/3600000;
  return (Math.round(h*10)/10).toString();
}

/* Single source of truth for "how long has this entry been running / how long
   did it run?" Used by Tracker panel, Calendar, Reports, Dashboard so views
   stay in lockstep instead of drifting by a second.
   Accepts a session-like {start, end?, durationMs?}. */
function getLiveDurationMs(session){
  if(!session || !session.start) return 0;
  if(typeof session.durationMs === 'number') return session.durationMs;
  if(session.end) return Math.max(0, session.end - session.start);
  return Math.max(0, Date.now() - session.start);
}

function subscribeClock(){
  if(!firebaseReady || _clockSubscribed) return;
  _clockSubscribed = true;
  firebaseDb.ref('flowtive_time_active').on('value', function(snap){
    clockActive = snap.val() || {};
    autoCloseStaleOwnSession();
    // Coalesce ALL renders through scheduleRender so back-to-back updates
    // (e.g. someone starts then immediately stops) stack into a single
    // rAF-batched render. Was previously firing three sync renders here
    // BEFORE the scheduled ones, which doubled work on each tick.
    scheduleRender('clock-button',     renderClockButton);
    scheduleRender('otc-card',         renderOnTheClockCard);
    scheduleRender('sid-clock-badges', renderSidebarClockBadges);
    scheduleRender('panel-time', function(){
      var tt = document.getElementById('panel-time');
      if(tt && tt.classList.contains('active') && typeof renderTimeTrackerPanel === 'function') renderTimeTrackerPanel();
    });
    scheduleRender('panel-dashboard', function(){
      var wd = document.getElementById('panel-dashboard');
      if(wd && wd.classList.contains('active') && typeof buildDashboard === 'function') buildDashboard();
    });
  });
  // Live listener: only the fresh window (last 12 months by default).
  // We MERGE rather than overwrite clockSessions so any older entries
  // pulled in via _clockLoadOlderThan() are preserved across updates.
  _clockFreshThreshold = Date.now() - FRESH_WINDOW_MS;
  _clockOldestLoaded = _clockFreshThreshold;
  firebaseDb.ref('flowtive_time_sessions').orderByChild('start').startAt(_clockFreshThreshold).on('value', function(snap){
    var fresh = snap.val() || {};
    // Drop any keys that were in the previous fresh window but vanished now
    // (i.e. deleted server-side). Older keys outside the window are untouched.
    Object.keys(_clockFreshKeys).forEach(function(k){
      if(!(k in fresh)) delete clockSessions[k];
    });
    _clockFreshKeys = {};
    Object.keys(fresh).forEach(function(k){
      _clockFreshKeys[k] = true;
      clockSessions[k] = fresh[k];
    });
    // Invalidate the Tracker totals cache — the data underneath it just
    // changed, any cached sum is now stale. Same for the Reports collect
    // cache (rows pulled from clockSessions); the next render rebuilds.
    if(typeof _ttInvalidateSumCache === 'function') _ttInvalidateSumCache();
    if(typeof _repInvalidate === 'function') _repInvalidate();
    // Coalesce panel rebuilds via scheduleRender (rAF-batched, per key)
    scheduleRender('panel-dashboard', function(){
      var wd = document.getElementById('panel-dashboard');
      if(wd && wd.classList.contains('active')){
        if(typeof buildDashboard === 'function') buildDashboard();
        else renderHoursThisWeek();
      }
    });
    scheduleRender('panel-time', function(){
      var tt = document.getElementById('panel-time');
      if(tt && tt.classList.contains('active') && typeof renderTimeTrackerPanel === 'function') renderTimeTrackerPanel();
    });
    scheduleRender('panel-time-calendar', function(){
      var cal = document.getElementById('panel-time-calendar');
      if(cal && cal.classList.contains('active') && typeof renderTimeCalendarPanel === 'function') renderTimeCalendarPanel();
    });
    scheduleRender('panel-time-reports', function(){
      var rep = document.getElementById('panel-time-reports');
      if(rep && rep.classList.contains('active') && typeof renderTimeReportsPanel === 'function') renderTimeReportsPanel();
    });
    scheduleRender('panel-time-timesheet', function(){
      var ts = document.getElementById('panel-time-timesheet');
      if(ts && ts.classList.contains('active') && typeof renderTimeTimesheetPanel === 'function') renderTimeTimesheetPanel();
    });
  });
}

/* On-demand loader for sessions older than what the live listener covers.
   Returns a Promise that resolves when the older entries have been merged
   into clockSessions and active panels re-rendered. No-op if `targetMs`
   is already covered. */
function _clockLoadOlderThan(targetMs){
  if(!firebaseReady) return Promise.resolve();
  if(_clockLoadingOlder) return Promise.resolve();
  if(typeof targetMs !== 'number' || targetMs >= _clockOldestLoaded) return Promise.resolve();
  _clockLoadingOlder = true;
  return firebaseDb.ref('flowtive_time_sessions')
    .orderByChild('start')
    .startAt(targetMs)
    .endAt(_clockOldestLoaded - 1)
    .once('value')
    .then(function(snap){
      var older = snap.val() || {};
      Object.keys(older).forEach(function(k){
        clockSessions[k] = older[k];
      });
      _clockOldestLoaded = targetMs;
      // Trigger renders for whoever's active so older entries show up
      if(typeof scheduleRender === 'function'){
        ['panel-dashboard','panel-time','panel-time-calendar','panel-time-reports','panel-time-timesheet'].forEach(function(pid){
          scheduleRender(pid, function(){
            var p = document.getElementById(pid);
            if(!p || !p.classList.contains('active')) return;
            if(pid === 'panel-time' && typeof renderTimeTrackerPanel === 'function') renderTimeTrackerPanel();
            else if(pid === 'panel-time-calendar' && typeof renderTimeCalendarPanel === 'function') renderTimeCalendarPanel();
            else if(pid === 'panel-time-reports' && typeof renderTimeReportsPanel === 'function') renderTimeReportsPanel();
            else if(pid === 'panel-time-timesheet' && typeof renderTimeTimesheetPanel === 'function') renderTimeTimesheetPanel();
            else if(pid === 'panel-dashboard' && typeof buildDashboard === 'function') buildDashboard();
          });
        });
      }
    })
    .catch(function(){ /* swallow — UI just doesn't show older entries */ })
    .then(function(){ _clockLoadingOlder = false; });
}
function unsubscribeClock(){
  if(firebaseReady && firebaseDb){
    try{ firebaseDb.ref('flowtive_time_active').off(); }catch(e){}
    try{ firebaseDb.ref('flowtive_time_sessions').off(); }catch(e){}
  }
  _clockSubscribed = false;
  clockSessions = {};
  clockActive = {};
}

/* Hard cap on time-entry descriptions. Pasting a 10MB blob into the
   "What are you working on?" field would otherwise stall Firebase writes
   and bloat every subsequent read. 500 chars is plenty for a sentence
   or two of context, the only thing the field is meant for. (F8) */
var DESCRIPTION_MAX_CHARS = 500;
function _capDescription(s){
  if(typeof s !== 'string') return s;
  var trimmed = s.trim();
  if(trimmed.length <= DESCRIPTION_MAX_CHARS) return trimmed;
  // Surface the truncation so the user knows what happened.
  if(typeof showToast === 'function'){
    showToast('Description trimmed to '+DESCRIPTION_MAX_CHARS+' chars', 'warning');
  }
  return trimmed.slice(0, DESCRIPTION_MAX_CHARS);
}

function clockIn(description, opts){
  if(!currentUser) return;
  if(!firebaseReady){ showToast('Cannot Start Work — Offline'); return; }
  var name = currentUser.name;
  if(clockActive[name]) return; // already started
  opts = opts || {};
  var ref = firebaseDb.ref('flowtive_time_sessions').push();
  var id = ref.key;
  var now = Date.now();
  var rec = {user:name, start:now, end:null, durationMs:null};
  var capped = description ? _capDescription(description) : '';
  if(capped){ rec.description = capped; }
  if(opts.projectId) rec.projectId = opts.projectId;
  if(Array.isArray(opts.tags) && opts.tags.length) rec.tags = opts.tags;
  ref.set(rec).catch(function(){ showToast('Start Work Failed'); });
  firebaseDb.ref('flowtive_time_active/'+name).set({sessionId:id, start:now, user:name}).catch(function(){});
  logActivity(name, 'clock_in', null, null, null, {sessionId:id});
  showToast('Started Work', 'success');
}

/* Edit a past session — used by the Time Tracker panel's edit dialog. Pass any
   subset of {description, start, end}; durationMs is recomputed if start or
   end change. */
function updateSession(sessionId, patch){
  if(!firebaseReady) return;
  var existing = clockSessions[sessionId];
  if(!existing) return;
  var update = {};
  if('description' in patch){
    var d = _capDescription(patch.description || '');
    update.description = d || null;
  }
  if('start' in patch && typeof patch.start === 'number') update.start = patch.start;
  if('end'   in patch && typeof patch.end   === 'number') update.end   = patch.end;
  if('projectId' in patch) update.projectId = patch.projectId || null;
  if('tags' in patch){
    update.tags = (Array.isArray(patch.tags) && patch.tags.length) ? patch.tags : null;
  }
  // Recompute duration if either bound changed
  if('start' in update || 'end' in update){
    var newStart = 'start' in update ? update.start : existing.start;
    var newEnd   = 'end'   in update ? update.end   : existing.end;
    if(newStart && newEnd) update.durationMs = Math.max(0, newEnd - newStart);
  }
  update.editedAt = Date.now();
  firebaseDb.ref('flowtive_time_sessions/'+sessionId).update(update).catch(function(){ showToast('Save Failed'); });
}

function deleteSession(sessionId){
  if(!firebaseReady) return;
  var existing = clockSessions && clockSessions[sessionId];
  var snapshot = null;
  if(existing){
    snapshot = {};
    Object.keys(existing).forEach(function(k){ snapshot[k] = existing[k]; });
  }
  firebaseDb.ref('flowtive_time_sessions/'+sessionId).remove().catch(function(){ showToast('Delete Failed'); });
  if(snapshot && typeof showUndoToast === 'function'){
    showUndoToast(
      'Entry deleted',
      function(){
        firebaseDb.ref('flowtive_time_sessions/'+sessionId).set(snapshot).catch(function(){ showToast('Restore failed'); });
      },
      null
    );
  }
}

/* Add a retroactive session — for "I forgot to start the timer" cases.
   Validates start < end and returns the new id (or null on failure). */
function addManualSession(start, end, description, opts){
  if(!firebaseReady){ showToast('Cannot Add — Offline'); return null; }
  if(!currentUser) return null;
  if(typeof start !== 'number' || typeof end !== 'number' || end <= start){
    showToast('End must be after start');
    return null;
  }
  opts = opts || {};
  var ref = firebaseDb.ref('flowtive_time_sessions').push();
  var id = ref.key;
  var rec = {
    user: currentUser.name,
    start: start,
    end: end,
    durationMs: end - start,
    manuallyAdded: true
  };
  var capped = description ? _capDescription(description) : '';
  if(capped) rec.description = capped;
  if(opts.projectId) rec.projectId = opts.projectId;
  if(Array.isArray(opts.tags) && opts.tags.length) rec.tags = opts.tags;
  ref.set(rec).catch(function(){ showToast('Save Failed'); });
  return id;
}

/* Update only the description of the currently-running session — called
   live as the user types in the Time Tracker panel's description field. */
function updateActiveSessionDescription(description){
  if(!currentUser || !firebaseReady) return;
  var active = clockActive[currentUser.name];
  if(!active) return;
  var d = _capDescription(description || '');
  firebaseDb.ref('flowtive_time_sessions/'+active.sessionId+'/description').set(d || null).catch(function(){});
}

function clockOut(opts){
  if(!currentUser) return;
  if(!firebaseReady) return;
  opts = opts || {};
  var name = currentUser.name;
  var active = clockActive[name];
  if(!active) return;
  var end = opts.endAt || Date.now();
  var dur = end - active.start;
  if(dur < 0) dur = 0;
  var update = {end:end, durationMs:dur};
  if(opts.autoClosed) update.autoClosed = true;
  firebaseDb.ref('flowtive_time_sessions/'+active.sessionId).update(update).catch(function(){});
  firebaseDb.ref('flowtive_time_active/'+name).remove().catch(function(){});
  logActivity(name, opts.autoClosed?'clock_auto':'clock_out', null, null, null, {sessionId:active.sessionId, durationMs:dur});
  if(!opts.silent) showToast('Stopped Work · '+fmtElapsed(dur), 'danger');
}

function toggleClock(){
  if(!currentUser) return;
  if(clockActive[currentUser.name]) clockOut();
  else clockIn();
}

function autoCloseStaleOwnSession(){
  if(!currentUser) return;
  var active = clockActive[currentUser.name];
  if(!active) return;
  if(Date.now() - active.start > SESSION_AUTO_CLOSE_MS){
    clockOut({endAt: active.start + SESSION_AUTO_CLOSE_MS, autoClosed:true, silent:true});
  }
}

function renderClockButton(){
  if(!currentUser) return;
  var active = clockActive[currentUser.name];
  // Update every .clock-btn on the page (sidebar footer, future locations)
  document.querySelectorAll('.clock-btn').forEach(function(btn){
    var label = btn.querySelector('.clock-btn-label-text');
    if(active){
      var elapsed = Date.now() - active.start;
      btn.classList.add('running');
      if(label) label.textContent = 'Stop Work · '+fmtElapsed(elapsed);
      btn.title = 'Click To Stop Work';
    } else {
      btn.classList.remove('running');
      if(label) label.textContent = 'Start Work';
      btn.title = 'Click To Start Work';
    }
  });
}

function renderSidebarClockBadges(){
  MEMBERS.forEach(function(m, i){
    var pill = document.getElementById('sid-clock-'+i);
    var count = document.getElementById('sid-count-'+i);
    if(!pill) return;
    var active = clockActive[m.name];
    if(active){
      pill.style.display = 'inline-flex';
      pill.textContent = fmtElapsed(Date.now() - active.start);
      if(count) count.style.display = 'none';
    } else {
      pill.style.display = 'none';
      if(count) count.style.display = '';
    }
  });
}

function renderOnTheClockCard(){
  var card = document.getElementById('otc-card');
  var list = document.getElementById('otc-list');
  if(!card || !list) return;
  var entries = Object.keys(clockActive).map(function(k){ return clockActive[k]; }).filter(Boolean);
  if(!entries.length){ card.classList.remove('show'); list.innerHTML=''; return; }
  card.classList.add('show');
  // Sort by start asc (longest-running first)
  entries.sort(function(a,b){ return a.start - b.start; });
  list.innerHTML = entries.map(function(a){
    var m = membersByName()[a.user] || {name:a.user, color:'#6B7280'};
    var img = (typeof loadAvatar==='function') ? loadAvatar(m.name) : null;
    var avInner = img
      ? '<img src="'+img+'" alt="'+escapeHtml(m.name)+'">'
      : escapeHtml(m.name.substring(0,2).toUpperCase());
    var bg = img ? 'transparent' : m.color;
    return '<div class="otc-item">'
      + '<div class="otc-av" style="background:'+bg+'">'+avInner+'</div>'
      + '<span>'+escapeHtml(m.name)+'</span>'
      + '<span class="otc-time">'+fmtElapsed(Date.now()-a.start)+'</span>'
      + '</div>';
  }).join('');
}

function renderHoursThisWeek(){
  var ctx = document.getElementById('hours-week-chart-canvas');
  if(!ctx) return;
  // Lazy-load Chart.js if not already on the page. ensureChartJs resolves
  // immediately once Chart is loaded; the wrapped recall below is a no-op
  // on the second pass. Keeps Chart.js (~200 KB) off the initial-load
  // critical path for users who never open the dashboard.
  if(typeof Chart === 'undefined'){
    ensureChartJs().then(renderHoursThisWeek);
    return;
  }
  // Build last 7 day labels (oldest first)
  var labels=[];
  var dayStarts=[];
  var now = new Date();
  var todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  for(var i=6;i>=0;i--){
    var d = new Date(todayStart); d.setDate(todayStart.getDate()-i);
    labels.push(d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}));
    dayStarts.push(d.getTime());
  }
  // Per member, sum hours per day
  var datasets = MEMBERS.map(function(m){
    var dayHours = new Array(7).fill(0);
    Object.values(clockSessions||{}).forEach(function(s){
      if(!s || s.user !== m.name || !s.start) return;
      // Effective end: real end OR now (for active session)
      var end = s.end || Date.now();
      // Distribute across days the session spans
      for(var di=0; di<7; di++){
        var ds = dayStarts[di];
        var de = ds + 86400000;
        var overlap = Math.max(0, Math.min(end, de) - Math.max(s.start, ds));
        dayHours[di] += overlap/3600000;
      }
    });
    return {
      label: m.name,
      data: dayHours.map(function(h){ return Math.round(h*10)/10; }),
      backgroundColor: m.color,
      borderRadius: 4,
      maxBarThickness: 28
    };
  });
  // Reuse instance if present — `.update('none')` swaps data without
  // recreating GPU buffers or replaying the entry animation.
  if(charts.hoursWeek){
    charts.hoursWeek.data.labels = labels;
    charts.hoursWeek.data.datasets = datasets;
    charts.hoursWeek.update('none');
  } else {
    charts.hoursWeek = new Chart(ctx,{
      type:'bar',
      data:{ labels: labels, datasets: datasets },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          legend:{ position:'bottom', labels:{ font:{size:11}, boxWidth:10, padding:8, color:themeColor('--text-secondary','#6B7280') }},
          tooltip:{ callbacks:{ label:function(c){ return c.dataset.label+': '+c.parsed.y+'h'; }}}
        },
        scales:{
          x:{ stacked:true, grid:{display:false}, ticks:{ font:{size:10}, color:themeColor('--text-secondary','#6B7280') } },
          y:{ stacked:true, beginAtZero:true, grid:{color:themeColor('--border-default','#F3F4F6')}, ticks:{ font:{size:10}, color:themeColor('--text-tertiary','#9CA3AF'), callback:function(v){ return v+'h'; } } }
        }
      }
    });
  }
}


function tickClockUI(){
  if(!currentUser) return;
  var active = clockActive[currentUser.name];
  var now = Date.now();
  var minuteBoundary = !tickClockUI._lastMinute || (now - tickClockUI._lastMinute) > 60000;
  // Update the .clock-btn label ONLY at minute boundaries. fmtElapsed
  // floors to minutes for any duration ≥ 1 minute, so per-second updates
  // produced identical strings — paying for querySelectorAll + DOM writes
  // every second to render the same text. Now we only update when the
  // visible value actually changes.
  if(active && minuteBoundary){
    var elapsed = now - active.start;
    document.querySelectorAll('.clock-btn .clock-btn-label-text').forEach(function(label){
      label.textContent = 'Stop Work · '+fmtElapsed(elapsed);
    });
  }
  // Update per-task timer counters (row pills + modal total) every second —
  // these can show seconds, so a 1Hz tick is real, not redundant.
  if(typeof tickTaskTimers === 'function') tickTaskTimers();
  // Update the Time Tracker panel live counter when it's the active panel —
  // the running session's HH:MM:SS counter ticks at 1Hz.
  if(typeof tickTimeTrackerPanel === 'function') tickTimeTrackerPanel();
  // Update the calendar's now-line + running blocks every second.
  if(typeof tickCalendarPanel === 'function') tickCalendarPanel();
  // Refresh timesheet totals when a session crosses a minute boundary —
  // moved into the minute-boundary block below.
  // Update sidebar badges + otc card every minute (less frequent than
  // per-second to save reflows). Bumped from 30s → 60s — the labels show
  // "1h 23m" precision so anything sub-minute is invisible anyway, and
  // halving the reflow rate is a free perf win.
  if(minuteBoundary){
    tickClockUI._lastMinute = now;
    renderSidebarClockBadges();
    if(typeof tickTimesheetPanel === 'function') tickTimesheetPanel();
    if(document.getElementById('panel-dashboard') && document.getElementById('panel-dashboard').classList.contains('active')){
      renderOnTheClockCard();
    }
  }
}

// Check session on load
