/* Flowtive One — Time Tracker panel (Clockify-style)
   Top input bar with description + start/stop + manual entry button, then
   today's entries grouped by day with totals. Edit/delete/manual-add all
   work against flowtive_time_sessions (clock.js owns the writes).
   Per-task time entries are surfaced read-only — they're tied to a task
   so editing happens in the task modal, not here. */

var _ttFilter = 'today';   // 'today' | 'yesterday' | 'this_week' | 'last_week' | 'all'
var _ttScope  = (function(){ try{ return localStorage.getItem('flowtive_tt_scope') || 'me'; }catch(e){ return 'me'; } })(); // 'me' | 'all'
var _ttStagedProjectId = null;  // selection waiting for next clockIn
var _ttStagedTags      = [];

/* ── Bulk selection (entry log) ────────────────────────────────
   Each global entry row gets a checkbox. Selecting any of them slides up
   a bottom action bar with Delete + clear. Mirrors the Tasks bulk-select
   pattern from v2.14.0; reuses the same .tasks-bulk-bar styling. */
var _selectedSessionIds = {};
function toggleSessionSelected(sid){
  if(_selectedSessionIds[sid]) delete _selectedSessionIds[sid];
  else _selectedSessionIds[sid] = true;
  renderTimeTrackerPanel();
}
function clearSessionSelection(){
  _selectedSessionIds = {};
  renderTimeTrackerPanel();
}
function _selectedSessionCount(){
  // Drop dead IDs (deleted by another client / outside the active filter range)
  var alive = {};
  Object.keys(_selectedSessionIds).forEach(function(id){
    if(clockSessions[id]) alive[id] = true;
  });
  _selectedSessionIds = alive;
  return Object.keys(alive).length;
}
function _selectedSessionIdsList(){
  return Object.keys(_selectedSessionIds).filter(function(id){ return clockSessions[id]; });
}

/* IDs of every CURRENTLY VISIBLE entry the user is allowed to bulk-select.
   Respects the active filter range, scope toggle, and ownership rules
   (own non-running global entries only — never task entries or other
   users' data). Used by the master select-all helpers. */
function _allSelectableSessionIds(){
  if(!currentUser) return [];
  var name = currentUser.name;
  var range = _ttFilterRange();
  var ids = [];
  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || !s.start) return;
    if(s.user !== name) return;       // only my entries
    if(!s.end) return;                 // skip running
    if(s.end < range.start || s.start >= range.end) return;
    ids.push(id);
  });
  return ids;
}

/* Toggle select-all for every visible/owned entry across all days. */
function toggleSelectAllSessions(){
  var ids = _allSelectableSessionIds();
  if(!ids.length) return;
  var anyMissing = ids.some(function(id){ return !_selectedSessionIds[id]; });
  if(anyMissing){
    ids.forEach(function(id){ _selectedSessionIds[id] = true; });
  } else {
    ids.forEach(function(id){ delete _selectedSessionIds[id]; });
  }
  renderTimeTrackerPanel();
}

/* Toggle select-all for a specific day key (start-of-day ms). */
function toggleSelectDay(dayKey){
  if(!currentUser) return;
  var name = currentUser.name;
  var dayStart = Number(dayKey);
  var dayEnd = dayStart + 86400000;
  var ids = [];
  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || s.user !== name || !s.start || !s.end) return;
    // Same start-of-day bucketing as _ttGroupByDay (uses the start ms)
    if(startOfDay(s.start) !== dayStart) return;
    ids.push(id);
  });
  if(!ids.length) return;
  var anyMissing = ids.some(function(id){ return !_selectedSessionIds[id]; });
  if(anyMissing){
    ids.forEach(function(id){ _selectedSessionIds[id] = true; });
  } else {
    ids.forEach(function(id){ delete _selectedSessionIds[id]; });
  }
  renderTimeTrackerPanel();
}

/* Render (or remove) the fixed bottom bar for the Tracker entry log.
   Shares CSS with the Tasks bulk bar (.tasks-bulk-bar / .tbb-*) but
   uses its own DOM id and panel observer so the two don't collide. */
function renderTrackerBulkBar(){
  var ttPanel = document.getElementById('panel-time');
  var onPanel = ttPanel && ttPanel.classList.contains('active');
  if(!onPanel){
    if(Object.keys(_selectedSessionIds).length){ _selectedSessionIds = {}; }
    var stale = document.getElementById('tt-bulk-bar');
    if(stale) stale.remove();
    return;
  }
  // Set up the panel-active observer once per session
  if(ttPanel && !renderTrackerBulkBar._panelObserver){
    renderTrackerBulkBar._panelObserver = new MutationObserver(function(){ renderTrackerBulkBar(); });
    renderTrackerBulkBar._panelObserver.observe(ttPanel, { attributes: true, attributeFilter: ['class'] });
  }
  var count = _selectedSessionCount();
  var bar = document.getElementById('tt-bulk-bar');
  if(count === 0){
    if(bar){
      bar.classList.remove('show');
      setTimeout(function(){ if(bar.parentElement) bar.remove(); }, 220);
    }
    document.removeEventListener('keydown', _ttBulkBarEscHandler, true);
    return;
  }
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'tt-bulk-bar';
    bar.className = 'tasks-bulk-bar'; // reuse styling
    document.body.appendChild(bar);
    requestAnimationFrame(function(){ bar.classList.add('show'); });
    document.addEventListener('keydown', _ttBulkBarEscHandler, true);
  }
  // "Select all" link — handy for cross-day bulk select once the bar
  // is open. If everything is already selected, the link flips to
  // "Deselect all" so the same control round-trips.
  var allIds = _allSelectableSessionIds();
  var selectedAll = allIds.length > 0 && allIds.every(function(id){ return _selectedSessionIds[id]; });
  var selectAllLabel = (selectedAll ? 'Deselect all' : 'Select all') + ' (' + allIds.length + ')';
  bar.innerHTML = ''
    + '<div class="tbb-count" aria-live="polite">'+count+' selected</div>'
    + '<button class="tbb-link" type="button" onclick="toggleSelectAllSessions()">'+escapeHtml(selectAllLabel)+'</button>'
    + '<div class="tbb-divider"></div>'
    + '<button class="tbb-btn tbb-danger" type="button" onclick="bulkDeleteSelectedSessions()" title="Delete selected entries">'
    +   '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg>'
    +   '<span>Delete</span>'
    + '</button>'
    + '<button class="tbb-clear" type="button" onclick="clearSessionSelection()" aria-label="Clear selection (Esc)" title="Clear selection (Esc)">×</button>';
}
function _ttBulkBarEscHandler(e){
  if(e.key !== 'Escape') return;
  // Don't swallow Esc when a modal / drawer / picker is open. ftConfirm's
  // Esc handler is bubble-phase, so if we capture-stopPropagation here,
  // the modal won't close on the first press. Bail and let Esc bubble.
  if(document.querySelector('.ftc-backdrop, .tdrawer-backdrop.show, .pal-backdrop.show, .wn-backdrop.show, .pt-tag-picker, .pt-project-picker')) return;
  if(_selectedSessionCount() > 0){
    e.stopPropagation();
    clearSessionSelection();
  }
}

/* Bulk delete — single confirm + single undo toast that restores all. */
function bulkDeleteSelectedSessions(){
  var ids = _selectedSessionIdsList();
  if(!ids.length) return;
  ftConfirm({
    title: 'Delete ' + ids.length + ' time entr' + (ids.length===1?'y':'ies') + '?',
    message: 'These entries will be deleted. You can undo for a few seconds.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    danger: true,
    onConfirm: function(){
      // Snapshot all before removing so a single undo restores the lot.
      var snapshots = {};
      ids.forEach(function(id){
        var s = clockSessions[id];
        if(s){ snapshots[id] = JSON.parse(JSON.stringify(s)); }
      });
      ids.forEach(function(id){
        firebaseDb.ref('flowtive_time_sessions/'+id).remove().catch(function(){});
      });
      _selectedSessionIds = {};
      renderTimeTrackerPanel();
      if(typeof showUndoToast === 'function'){
        showUndoToast(
          ids.length + ' entr' + (ids.length===1?'y':'ies') + ' deleted',
          function(){
            // Restore — listener will repopulate the entry log
            Object.keys(snapshots).forEach(function(id){
              firebaseDb.ref('flowtive_time_sessions/'+id).set(snapshots[id]).catch(function(){});
            });
          },
          null
        );
      }
    }
  });
}

/* Date helpers — startOfDay / startOfWeek live in util.js (centralized) */

/* Returns {start, end} ms range for the active filter. */
function _ttFilterRange(){
  var now = Date.now();
  var today = startOfDay(now);
  var weekStart = startOfWeek(now);
  switch(_ttFilter){
    case 'today':     return { start: today, end: today + 86400000 };
    case 'yesterday': return { start: today - 86400000, end: today };
    case 'this_week': return { start: weekStart, end: weekStart + 7*86400000 };
    case 'last_week': return { start: weekStart - 7*86400000, end: weekStart };
    case 'all':       return { start: 0, end: now + 86400000 };
    default:          return { start: today, end: today + 86400000 };
  }
}

/* Pull sessions in the active filter range. Combines:
   - global sessions (flowtive_time_sessions) — editable by owner
   - per-task time entries (task.timeEntries[*]) — read-only, linked to task
   When _ttScope === 'me', filters to the current user only. When 'all',
   returns the whole team's entries. Each row carries a `user` field so
   the row renderer can show whose entry it is. Returns sorted newest-first. */
function _ttCollectEntries(){
  if(!currentUser) return [];
  var name = currentUser.name;
  var meOnly = (_ttScope === 'me');
  var range = _ttFilterRange();
  var rows = [];

  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || !s.start) return;
    if(meOnly && s.user !== name) return;
    var end = s.end || Date.now();
    // Include the entry if any part of it overlaps the range
    if(end < range.start || s.start >= range.end) return;
    rows.push({
      kind: 'global',
      id: id,
      user: s.user,
      start: s.start,
      end: s.end,                    // null if running
      durationMs: s.durationMs,
      description: s.description || '',
      projectId: s.projectId || null,
      tags: Array.isArray(s.tags) ? s.tags : [],
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
        if(!e || !e.start) return;
        if(meOnly && e.user !== name) return;
        var end = e.end || Date.now();
        if(end < range.start || e.start >= range.end) return;
        var isActive = !!(t.activeTimers && e.user && t.activeTimers[e.user] && t.activeTimers[e.user].entryId === eid);
        rows.push({
          kind: 'task',
          id: eid,
          taskId: tid,
          taskTitle: t.title || '(Untitled task)',
          user: e.user,
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
    // Use the centralized helper so totals tick in lockstep with the
    // tracker bar / Reports table / Calendar live duration.
    sum += getLiveDurationMs(r);
  });
  return sum;
}

/* Sum tracked time across an arbitrary [start, end) ms range.
   Mirrors the union logic in _ttCollectEntries — global sessions AND
   per-task time entries — and respects _ttScope so KPI cards stay
   consistent with the entry log below them. (F2 — was: "totals say
   4h, log says 5h" bug. Now also: scope toggle makes totals follow
   what the user is looking at.) */
/* Memoized within a single render pass. renderTimeTrackerPanel calls
   _ttSumForRange 2-3× per render (Today, This Week, sometimes a filtered
   range), and each call walks ALL clockSessions + ALL tasks×entries —
   on a busy team that's hundreds of iterations × 3. The cache lets the
   second and third call hit a precomputed answer.
   Invalidated whenever data changes (Firebase listener → time_sessions
   or tasks update) or when scope toggles. Skipped entirely while a
   running session exists for the current user — that value moves every
   tick, can't be cached. */
var _ttSumCache = Object.create(null);
function _ttInvalidateSumCache(){ _ttSumCache = Object.create(null); }
function _ttSumForRange(rangeStart, rangeEnd){
  if(!currentUser) return 0;
  var name = currentUser.name;
  // Live counter mode: any running session means the value is changing
  // every second. Skip the cache entirely so the live tick stays honest.
  var hasRunning = !!(clockActive && clockActive[name]);
  if(!hasRunning){
    var key = _ttScope + '|' + rangeStart + '|' + rangeEnd;
    if(key in _ttSumCache) return _ttSumCache[key];
  }
  var meOnly = (_ttScope === 'me');
  var sum = 0;
  // Global sessions
  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || !s.start) return;
    if(meOnly && s.user !== name) return;
    var end = s.end || Date.now();
    if(end < rangeStart || s.start >= rangeEnd) return;
    sum += getLiveDurationMs(s);
  });
  // Per-task time entries
  if(typeof tasksData === 'object' && tasksData){
    Object.keys(tasksData).forEach(function(tid){
      var t = tasksData[tid];
      if(!t || !t.timeEntries) return;
      Object.keys(t.timeEntries).forEach(function(eid){
        var e = t.timeEntries[eid];
        if(!e || !e.start) return;
        if(meOnly && e.user !== name) return;
        var end = e.end || Date.now();
        if(end < rangeStart || e.start >= rangeEnd) return;
        sum += getLiveDurationMs(e);
      });
    });
  }
  if(!hasRunning){
    _ttSumCache[_ttScope + '|' + rangeStart + '|' + rangeEnd] = sum;
  }
  return sum;
}

/* Group entries by calendar day for the log. */
function _ttGroupByDay(rows){
  var groups = {};
  rows.forEach(function(r){
    var key = startOfDay(r.start);
    if(!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

/* Capture which Tracker input has focus + the user's typed-but-unsaved
   value + caret state, so a re-render can restore the same state without
   silent data loss. Two inputs we care about:
     • #tt-desc — the running tracker bar description input
     • .tt-row-text-input — the inline-edit input on an entry-log row
   Returns null if no relevant input is focused. */
function _ttCaptureFocus(){
  var ae = document.activeElement;
  if(!ae || !ae.classList) return null;
  if(ae.id === 'tt-desc'){
    return {
      type: 'desc',
      value: ae.value,
      selStart: ae.selectionStart,
      selEnd:   ae.selectionEnd
    };
  }
  if(ae.classList.contains('tt-row-text-input')){
    var sid = ae.getAttribute('data-session-id');
    if(sid) return {
      type: 'rowEdit',
      sessionId: sid,
      value: ae.value,
      selStart: ae.selectionStart,
      selEnd:   ae.selectionEnd
    };
  }
  return null;
}
/* Restore focus + value + caret after a panel re-render. For the row
   inline-edit case, we re-trigger editTimeRowDescriptionInline on the
   matching span so the input is re-created, then override its value
   with whatever the user had typed. */
function _ttRestoreFocus(snap){
  if(!snap) return;
  if(snap.type === 'desc'){
    var el = document.getElementById('tt-desc');
    if(!el) return;
    // Override the just-rendered value (which came from Firebase) with
    // whatever the user was actively typing — their unsaved content wins.
    if(el.value !== snap.value) el.value = snap.value;
    el.focus();
    if(snap.selStart != null && el.setSelectionRange){
      try{ el.setSelectionRange(snap.selStart, snap.selEnd); }catch(e){}
    }
    if(typeof _ttSyncDescWrapValue === 'function') _ttSyncDescWrapValue(el);
    if(el.value && typeof _ttStopDescTyper === 'function') _ttStopDescTyper();
  } else if(snap.type === 'rowEdit'){
    // Re-arm the inline edit on the new row's span and replay the typed
    // value + caret. If the row is no longer in the rendered range (e.g.
    // filter changed), there's nothing we can do — the edit silently
    // ends, but the typed value was already attempted-saved on every
    // input event below.
    var span = document.querySelector('.tt-row-text-edit[data-session-id="'+snap.sessionId+'"]');
    if(!span) return;
    if(typeof editTimeRowDescriptionInline === 'function'){
      editTimeRowDescriptionInline(snap.sessionId, span);
    }
    var newInput = document.querySelector('.tt-row-text-input[data-session-id="'+snap.sessionId+'"]');
    if(!newInput) return;
    newInput.value = snap.value;
    if(snap.selStart != null && newInput.setSelectionRange){
      try{ newInput.setSelectionRange(snap.selStart, snap.selEnd); }catch(e){}
    }
  }
}

function renderTimeTrackerPanel(){
  var body = document.getElementById('time-panel-body');
  if(!body) return;
  if(!currentUser){
    body.innerHTML = '<div class="task-empty"><div class="task-empty-icon">🔒</div><div class="task-empty-title">Log in to see your time</div></div>';
    return;
  }

  // Capture any in-progress typing BEFORE we innerHTML over the panel —
  // otherwise the input is destroyed without firing blur and the user's
  // unsaved text vanishes. Restored at the end after the new DOM is built.
  var focusSnap = _ttCaptureFocus();

  var active = clockActive[currentUser.name];
  // Totals card content is filter-aware:
  //  - When filter is 'today' or 'this_week' → show the classic two cards
  //    (Today + This Week) using the union sum (global sessions + task entries).
  //  - For any other filter → show a single "Filtered total · {label}" card.
  var todayMs = _ttSumForRange(startOfDay(Date.now()), startOfDay(Date.now()) + 86400000);
  var weekStart = startOfWeek(Date.now());
  var weekMs = _ttSumForRange(weekStart, weekStart + 7*86400000);

  body.innerHTML = ''
    + renderTrackerBar(active)
    + renderTotalsBar(todayMs, weekMs)
    + renderFilterChips()
    + renderEntryLog();

  // Sync the bulk bar with the current selection (handles re-renders
  // from filter changes, listener updates, etc.)
  if(typeof renderTrackerBulkBar === 'function') renderTrackerBulkBar();

  // Wire description input → live update Firebase if running, plus the
  // typewriter placeholder animation.
  var descInp = document.getElementById('tt-desc');
  if(descInp){
    // Debounced auto-save while typing: 600ms after the user stops typing,
    // commit to Firebase. Combined with _ttCaptureFocus / _ttRestoreFocus,
    // this means a re-render mid-typing both preserves the typed text in
    // the input AND has likely already persisted the most recent keystroke.
    var _descSaveTimer = null;
    function _descScheduleSave(){
      if(!active) return;
      if(_descSaveTimer) clearTimeout(_descSaveTimer);
      _descSaveTimer = setTimeout(function(){
        _descSaveTimer = null;
        // Only persist if the input is still around + active session still matches
        var stillAct = clockActive[currentUser ? currentUser.name : ''];
        if(!stillAct || !descInp.isConnected) return;
        updateActiveSessionDescription(descInp.value);
      }, 600);
    }
    descInp.addEventListener('blur', function(){
      if(_descSaveTimer){ clearTimeout(_descSaveTimer); _descSaveTimer = null; }
      if(active) updateActiveSessionDescription(descInp.value);
      // Field went empty after being focused → restart the typer so the
      // next viewer sees the animation again.
      if(!descInp.value){ _ttSyncDescWrapValue(descInp); _ttStartDescTyper(descInp); }
    });
    descInp.addEventListener('input', function(){
      // Keep the wrap's .has-value class in sync so the overlay shows/hides
      // immediately as the field gains/loses content (matches native
      // placeholder behavior). Also stop the typer the moment they type.
      _ttSyncDescWrapValue(descInp);
      if(descInp.value) _ttStopDescTyper();
      else              _ttStartDescTyper(descInp);
      _descScheduleSave();
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
    // Kick off the typewriter (or static-phrase fallback for reduced motion).
    _ttStartDescTyper(descInp);
  }

  // Restore any in-progress typing that was active before this re-render.
  // Must run AFTER the typewriter is wired so the typer doesn't kick on
  // top of the user's restored text.
  _ttRestoreFocus(focusSnap);
}

// Placeholder prompts for the "What are you working on?" input. We pick one
// at random every time the tracker bar renders so the bar feels alive instead
// of always whispering the same generic question. Each phrase is 4–6 words,
// action-led, and spans the kind of work this team actually does (design,
// dev, copy, analytics, leads, admin). Apostrophes are fine — escapeHtml
// handles them on the way into the placeholder attribute.
var _TT_DESC_PLACEHOLDERS = [
  'Designing the new landing page',
  'Polishing the onboarding flow',
  'Wireframing the next dashboard',
  'Drafting a client proposal',
  'Reviewing this week’s analytics',
  'Editing the brand brief',
  'Sketching ideas for the sprint',
  'Researching competitor pricing',
  'Building the export feature',
  'Fixing that alignment bug',
  'Writing copy for the homepage',
  'Cleaning up Figma layers',
  'Reading Firebase rules docs',
  'Catching up on Slack threads',
  'Planning tomorrow’s standup',
  'Drafting cold-pitch templates',
  'Mapping Texas territory leads',
  'Triaging this morning’s tickets',
  'Refining the QA punch list',
  'Prepping the Friday demo',
  'Logging billable hours',
  'Exporting the monthly report',
  'Sorting the design backlog',
  'Reviewing PRs and merge conflicts',
  'Tightening the homepage hero',
  'Brainstorming the next feature',
  'Auditing the sidebar navigation',
  'Capturing notes from yesterday’s call',
  'Mocking up the empty state',
  'Replying to the client thread'
];
function _ttPickDescPlaceholder(){
  var a = _TT_DESC_PLACEHOLDERS;
  return a[(Math.random() * a.length) | 0];
}

// Classic typewriter — characters appear one at a time via textContent
// updates, separate caret element blinks via CSS. No fades, no slides,
// no GSAP; just well-tuned timing and a clean DOM model.
//
// State persistence across re-renders:
//   The Tracker panel rebuilds via body.innerHTML on every filter chip
//   click, scope toggle, and Firebase listener tick. Each rebuild creates
//   a fresh typewriter DOM. Without persistence, every rebuild would
//   restart the animation from a new random phrase — visually jarring
//   when the user is just navigating filters.
//   `_ttDescTyperState` lives at module scope and survives re-renders
//   (lost only on page reload, which is fine). On each _ttStartDescTyper
//   call: if state exists, resume from the saved position; otherwise
//   start fresh with a lead-in pause.
//
// Cancellation:
//   _ttDescTyperTimeout holds the next scheduled tick. _ttStopDescTyper
//   clears it but PRESERVES state so the next start picks up seamlessly.
//   Each tick guards on detached element + non-empty input.
//
// Fallbacks:
//   • prefers-reduced-motion → static phrase, no animation, no caret blink.
//     Phrase is also cached in state so it doesn't change on each render.
var _ttDescTyperTimeout = null;
var _ttDescTyperState   = null; // { idx, pos, mode } for animated, { staticPhrase } for reduced-motion
function _ttStopDescTyper(){
  if(_ttDescTyperTimeout){ clearTimeout(_ttDescTyperTimeout); _ttDescTyperTimeout = null; }
  // Note: _ttDescTyperState INTENTIONALLY not cleared. Survives so the
  // next _ttStartDescTyper resumes from the same phrase + position
  // instead of restarting visually whenever the panel re-renders.
}
function _ttStartDescTyper(inp){
  _ttStopDescTyper();
  if(!inp || inp.value) return;
  var textEl = document.getElementById('tt-desc-typer-text');
  if(!textEl) return;
  // Reduced-motion → static phrase, done. Cache in state so the same
  // phrase shows on every subsequent render (otherwise reduced-motion
  // users would see a different phrase pop in on every filter chip click,
  // which is itself a kind of visual movement we should avoid for them).
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){
    if(!_ttDescTyperState || !_ttDescTyperState.staticPhrase){
      _ttDescTyperState = { staticPhrase: _ttPickDescPlaceholder() };
    }
    textEl.textContent = _ttDescTyperState.staticPhrase;
    return;
  }
  var phrases = _TT_DESC_PLACEHOLDERS;
  // Timing — milliseconds:
  //   TYPE_MS    base per-char delay while typing in
  //   TYPE_JIT   ± jitter on TYPE_MS so the rhythm reads as human
  //   DEL_MS     per-char delay while deleting (faster, no jitter)
  //   HOLD_MS    pause on the fully-typed phrase before deleting
  //   GAP_MS     pause between phrases (caret blinks alone here)
  //   LEAD_MS    initial pause before first char (lets caret blink once
  //              so the user sees there's a cursor before text appears).
  //              Only used on the very first run; subsequent re-renders
  //              resume immediately so navigation feels seamless.
  var TYPE_MS = 75;
  var TYPE_JIT = 18;
  var DEL_MS  = 35;
  var HOLD_MS = 1500;
  var GAP_MS  = 380;
  var LEAD_MS = 320;

  // Resume from previous state if we have one (filter chip click,
  // listener tick, etc.). Otherwise pick a fresh phrase + start at pos 0.
  var resuming = !!(_ttDescTyperState && typeof _ttDescTyperState.idx === 'number');
  var idx, pos, mode;
  if(resuming){
    idx  = _ttDescTyperState.idx;
    pos  = _ttDescTyperState.pos;
    mode = _ttDescTyperState.mode || 'type';
    // Defensive: clamp idx if pool size changed (shouldn't happen, but cheap).
    if(idx < 0 || idx >= phrases.length) idx = (Math.random() * phrases.length) | 0;
  } else {
    idx  = (Math.random() * phrases.length) | 0;
    pos  = 0;
    mode = 'type';
  }
  // Append "." to every phrase — gives each one a small "ending beat"
  // that the cursor sits next to during the hold pause, like the writer
  // just put down a sentence-ending mark.
  var phrase = phrases[idx] + '.';
  // Clamp pos to phrase length (defensive — pool entry could have been
  // edited and a saved pos might overshoot).
  if(pos > phrase.length) pos = phrase.length;
  if(pos < 0) pos = 0;

  function saveState(m){
    _ttDescTyperState = { idx: idx, pos: pos, mode: m };
  }
  function pickNext(){
    if(phrases.length < 2) return;
    var n = idx;
    while(n === idx) n = (Math.random() * phrases.length) | 0;
    idx = n;
    phrase = phrases[idx] + '.';
    pos = 0;
  }
  function bail(){ return !textEl.isConnected || (inp && inp.value); }

  function tickType(){
    if(bail()){ _ttDescTyperTimeout = null; return; }
    pos++;
    textEl.textContent = phrase.slice(0, pos);
    if(pos >= phrase.length){
      // Reached end of phrase — pause for HOLD then start deleting. State
      // is 'delete' from this point so a re-render mid-hold resumes
      // straight into deletion (foregoing the rest of the hold; visually
      // imperceptible).
      saveState('delete');
      _ttDescTyperTimeout = setTimeout(tickDelete, HOLD_MS);
    } else {
      saveState('type');
      _ttDescTyperTimeout = setTimeout(tickType, TYPE_MS + ((Math.random() * 2 - 1) * TYPE_JIT) | 0);
    }
  }
  function tickDelete(){
    if(bail()){ _ttDescTyperTimeout = null; return; }
    pos--;
    textEl.textContent = phrase.slice(0, Math.max(0, pos));
    if(pos <= 0){
      // Phrase fully erased — pick a new one and pause for GAP before
      // starting to type it.
      pickNext();
      saveState('type');
      _ttDescTyperTimeout = setTimeout(tickType, GAP_MS);
    } else {
      saveState('delete');
      _ttDescTyperTimeout = setTimeout(tickDelete, DEL_MS);
    }
  }

  // Paint current state immediately so a resume looks seamless (no
  // empty-input flash before the first scheduled tick fires).
  textEl.textContent = phrase.slice(0, Math.max(0, pos));

  if(resuming){
    // Continue mid-stream — no lead-in pause. Schedule the next tick
    // based on which mode we were in.
    if(mode === 'delete'){
      _ttDescTyperTimeout = setTimeout(tickDelete, DEL_MS);
    } else {
      _ttDescTyperTimeout = setTimeout(tickType, TYPE_MS);
    }
  } else {
    // First run — empty text + lead-in pause so the caret blinks alone
    // for ~320ms, signalling "someone's about to start typing".
    textEl.textContent = '';
    saveState('type');
    _ttDescTyperTimeout = setTimeout(tickType, LEAD_MS);
  }
}
function _ttSyncDescWrapValue(inp){
  // Toggle .has-value on the wrap so CSS hides the overlay when the
  // input has real content. Called from the input event listener.
  var wrap = document.getElementById('tt-desc-wrap');
  if(!wrap) return;
  if(inp.value) wrap.classList.add('has-value');
  else          wrap.classList.remove('has-value');
}

function renderTrackerBar(active){
  // Resolve current project + tags — from the running session if any, else
  // the staged values waiting for the next clockIn.
  var projectId, tags;
  if(active){
    var s = clockSessions[active.sessionId] || {};
    projectId = s.projectId || null;
    tags      = Array.isArray(s.tags) ? s.tags : [];
  } else {
    projectId = _ttStagedProjectId;
    tags      = _ttStagedTags || [];
  }
  var projectChip = renderTrackerProjectChip(projectId);
  var tagsChip    = renderTrackerTagsChip(tags);

  if(active){
    var elapsed = Date.now() - active.start;
    var existingDesc = '';
    if(clockSessions[active.sessionId]) existingDesc = clockSessions[active.sessionId].description || '';
    return '<div class="tt-tracker-bar tt-running">'
      // Description input is wrapped + paired with an absolutely-positioned
      // overlay (.tt-desc-typer) that runs the typewriter animation when
      // the field is empty. Native placeholder stays empty; we own the
      // visual entirely. `.has-value` on the wrap hides the overlay when
      // there's real content to display.
      + '<div class="tt-desc-wrap'+(existingDesc ? ' has-value' : '')+'" id="tt-desc-wrap">'
      +   '<input type="text" class="tt-desc" id="tt-desc" placeholder="" value="'+escapeHtml(existingDesc)+'">'
      +   '<span class="tt-desc-typer" id="tt-desc-typer" aria-hidden="true">'
      +     '<span class="tt-desc-typer-text" id="tt-desc-typer-text"></span>'
      +     '<span class="tt-desc-typer-caret" id="tt-desc-typer-caret"></span>'
      +   '</span>'
      + '</div>'
      + projectChip
      + tagsChip
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
    // See note in the running branch above — input is wrapped, overlay
    // runs the typewriter, native placeholder stays empty.
    + '<div class="tt-desc-wrap" id="tt-desc-wrap">'
    +   '<input type="text" class="tt-desc" id="tt-desc" placeholder="">'
    +   '<span class="tt-desc-typer" id="tt-desc-typer" aria-hidden="true">'
    +     '<span class="tt-desc-typer-text" id="tt-desc-typer-text"></span>'
    +     '<span class="tt-desc-typer-caret" id="tt-desc-typer-caret"></span>'
    +   '</span>'
    + '</div>'
    + projectChip
    + tagsChip
    // Idle timer doubles as a manual-entry shortcut. Click → opens the
    // same dialog the "+" button does. Discoverable via cursor + tooltip;
    // doesn\'t replace the explicit + button (kept for the bar layout).
    + '<button type="button" class="tt-live-time tt-live-idle tt-live-clickable" onclick="openManualEntryDialog()" title="Click to add time manually">00:00:00</button>'
    + '<button class="tt-start-btn" onclick="ttStart()">'
    +   '<svg viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.5v9l7-4.5z"/></svg>'
    +   '<span>Start</span>'
    + '</button>'
    + '<button class="tt-manual-btn" onclick="openManualEntryDialog()" title="Add a session retroactively">'
    +   '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>'
    + '</button>'
    + '</div>';
}

/* Project chip on the tracker bar — clickable to open the project picker.
   Shows the project name + color when set, "Project" placeholder when empty. */
function renderTrackerProjectChip(projectId){
  var p = projectId && typeof projectsData !== 'undefined' ? projectsData[projectId] : null;
  if(p){
    return '<button class="tt-project-chip" data-pt-pick-anchor="project" onclick="onTrackerProjectClick(this)" title="Change project">'
      +    '<span class="tt-project-dot" style="background:'+p.color+'"></span>'
      +    '<span class="tt-project-name">'+escapeHtml(p.name)+'</span>'
      +    '</button>';
  }
  return '<button class="tt-project-chip tt-project-chip-empty" data-pt-pick-anchor="project" onclick="onTrackerProjectClick(this)" title="Pick a project">'
    +    '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5h5.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V4z"/></svg>'
    +    '<span>Project</span>'
    +    '</button>';
}

/* Tag chip on the tracker bar — shows count if any tags, opens multi-select. */
function renderTrackerTagsChip(tagIds){
  var n = Array.isArray(tagIds) ? tagIds.length : 0;
  var label = n ? n + ' tag'+(n===1?'':'s') : 'Tags';
  return '<button class="tt-tag-chip'+(n?' tt-tag-chip-on':'')+'" data-pt-pick-anchor="tags" onclick="onTrackerTagsClick(this)" title="Pick tags">'
    +    '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 7V2.5a1 1 0 0 1 1-1H7l5.5 5.5-5 5-6-6z"/><circle cx="4" cy="4" r="0.7" fill="currentColor" stroke="none"/></svg>'
    +    '<span>'+label+'</span>'
    +    '</button>';
}

/* Handlers for the tracker bar's project/tag chips. If a timer is running,
   changes apply to the running session immediately. Otherwise they update
   staged state used by the next ttStart(). */
function onTrackerProjectClick(anchor){
  var active = currentUser ? clockActive[currentUser.name] : null;
  var current = active ? ((clockSessions[active.sessionId]||{}).projectId || null) : _ttStagedProjectId;
  if(typeof openProjectPicker !== 'function') return;
  openProjectPicker(current, anchor, function(v){
    if(active) updateSession(active.sessionId, {projectId: v || null});
    else { _ttStagedProjectId = v || null; renderTimeTrackerPanel(); }
  });
}
function onTrackerTagsClick(anchor){
  var active = currentUser ? clockActive[currentUser.name] : null;
  var current = active ? ((clockSessions[active.sessionId]||{}).tags || []) : (_ttStagedTags || []);
  if(typeof openTagPicker !== 'function') return;
  openTagPicker(current, anchor, function(v){
    if(active) updateSession(active.sessionId, {tags: v});
    else { _ttStagedTags = v || []; renderTimeTrackerPanel(); }
  });
}

function renderTotalsBar(todayMs, weekMs){
  // Default = the classic two cards (Today + This Week).
  // When the user picks a non-default filter (Yesterday / Last Week / All)
  // we add a third card showing the filtered total so the KPIs match the
  // entry log below them.
  var html = '<div class="tt-totals">'
    + '<div class="tt-total-card"><div class="tt-total-label">Today</div><div class="tt-total-value">'+fmtTrackerHM(todayMs)+'</div></div>'
    + '<div class="tt-total-card"><div class="tt-total-label">This week</div><div class="tt-total-value">'+fmtTrackerHM(weekMs)+'</div></div>';
  if(_ttFilter !== 'today' && _ttFilter !== 'this_week'){
    var filterLabels = {yesterday:'Yesterday', last_week:'Last Week', all:'All Time'};
    var range = _ttFilterRange();
    var filteredMs = _ttSumForRange(range.start, range.end);
    html += '<div class="tt-total-card tt-total-filtered">'
         +    '<div class="tt-total-label">Filtered · '+escapeHtml(filterLabels[_ttFilter] || 'Selection')+'</div>'
         +    '<div class="tt-total-value">'+fmtTrackerHM(filteredMs)+'</div>'
         +  '</div>';
  }
  html += '</div>';
  return html;
}

function renderFilterChips(){
  var labels = {today:'Today', yesterday:'Yesterday', this_week:'This Week', last_week:'Last Week', all:'All Time'};
  var html = '<div class="tt-filters-row">';
  // Time-range chips
  html +=   '<div class="tt-filters">';
  ['today','yesterday','this_week','last_week','all'].forEach(function(f){
    html += '<button class="tt-filter'+(_ttFilter===f?' active':'')+'" onclick="setTimeFilter(\''+f+'\')">'+labels[f]+'</button>';
  });
  html +=   '</div>';
  // Scope toggle: Only Me ↔ All Team — mirrors the calendar's filter so
  // users can see who else is tracking time at a glance.
  html +=   '<div class="tt-scope-toggle" role="group" aria-label="Tracker scope">'
       +      '<button class="'+(_ttScope==='me'?'active':'')+'" onclick="setTimeScope(\'me\')" type="button">Only Me</button>'
       +      '<button class="'+(_ttScope==='all'?'active':'')+'" onclick="setTimeScope(\'all\')" type="button">All Team</button>'
       +    '</div>';
  html += '</div>';
  return html;
}

function setTimeFilter(f){
  _ttFilter = f;
  renderTimeTrackerPanel();
}

function setTimeScope(s){
  if(s !== 'me' && s !== 'all') return;
  if(s === _ttScope) return;
  _ttScope = s;
  // Cached totals are keyed on _ttScope — old entries are now stale.
  _ttInvalidateSumCache();
  try{ localStorage.setItem('flowtive_tt_scope', s); }catch(e){}
  // Switching scope can hide selected entries (e.g. me → all is fine,
  // but selection should still be valid). Clear to be safe + simple.
  _selectedSessionIds = {};
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
  // tt-scope-all opens up a "who" column in the row grid (see CSS).
  var html = '<div class="tt-log'+(_ttScope === 'all' ? ' tt-scope-all' : '')+'">';
  var meName = currentUser ? currentUser.name : '';
  dayKeys.forEach(function(key){
    var dayRows = groups[key];
    var dayMs = _ttSumMs(dayRows);
    // Per-day select-all — only counts rows the current user can actually
    // bulk-select (their own non-running global entries). Tri-state.
    var dayCanSelect = dayRows.filter(function(r){
      return r.kind !== 'task' && !r.running && r.user === meName;
    }).map(function(r){ return r.id; });
    var daySel = dayCanSelect.filter(function(id){ return _selectedSessionIds[id]; }).length;
    var dayAll  = dayCanSelect.length > 0 && daySel === dayCanSelect.length;
    var daySome = daySel > 0 && !dayAll;
    var dayCbHtml = '';
    if(dayCanSelect.length){
      var dayCls = 'task-cb' + (dayAll ? ' selected' : '') + (daySome ? ' indeterminate' : '');
      var dayAria = dayAll ? 'true' : (daySome ? 'mixed' : 'false');
      var dayTitle = dayAll ? 'Deselect all in this day' : 'Select all in this day';
      dayCbHtml = '<div class="tt-day-cb-wrap"><div class="'+dayCls+'" role="checkbox" aria-checked="'+dayAria+'" tabindex="0" title="'+dayTitle+'" onclick="toggleSelectDay(\''+key+'\')"></div></div>';
    }
    html += '<div class="tt-day">'
      + '<div class="tt-day-head">'
      +   dayCbHtml
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
  var meName = currentUser ? currentUser.name : '';
  var isMine = !!(r.user && r.user === meName);
  // Empty global descriptions render as a placeholder. Task entries
  // always show the task title (read-only here — edited via the task).
  var hasDesc = !!(r.description && r.description.trim());
  var desc = hasDesc ? r.description : (isTask ? r.taskTitle : '(no description)');
  var startStr = formatTrackerClock(r.start);
  var endStr = r.running ? '<span class="tt-running-pill"><span class="tt-running-dot"></span>Running</span>' : (r.end ? formatTrackerClock(r.end) : '—');
  var durMs = getLiveDurationMs(r);
  var durStr = durMs > 0 ? fmtTrackerHM(durMs) : '—';
  var badges = '';
  if(isTask)            badges += '<span class="tt-badge tt-badge-task" title="Linked to a task">Task</span>';
  if(r.manuallyAdded)   badges += '<span class="tt-badge tt-badge-manual" title="Added manually">Manual</span>';
  if(r.autoClosed)      badges += '<span class="tt-badge tt-badge-auto" title="Auto-closed after 16h">Auto</span>';
  // Owner cell — sits on the right side of the row in "All Team" scope so
  // the row reads "description | who | when | how long | actions". Hidden
  // entirely in "Only Me" scope (a column of self-portraits adds nothing).
  var userCell = '';
  if(_ttScope === 'all' && r.user){
    var m = membersByName()[r.user] || null;
    var color = m ? m.color : '#6B7280';
    var img = (typeof loadAvatar === 'function') ? loadAvatar(r.user) : null;
    var inner = img
      ? '<img src="'+img+'" alt="'+escapeHtml(r.user)+'">'
      : escapeHtml(r.user.substring(0,2).toUpperCase());
    var bg = img ? 'transparent' : color;
    userCell = '<div class="tt-row-user-cell'+(isMine?' tt-row-user-me':'')+'" title="'+escapeHtml(r.user)+(isMine?' (you)':'')+'">'
             +   '<span class="av-mini" style="background:'+bg+'">'+inner+'</span>'
             +   '<span class="tt-row-user-name">'+escapeHtml(r.user)+(isMine?' <span class="tt-row-user-you">(you)</span>':'')+'</span>'
             + '</div>';
  } else if(_ttScope === 'all'){
    // Empty placeholder so the grid column lines up across rows
    userCell = '<div class="tt-row-user-cell tt-row-user-empty"></div>';
  }
  var actions = '';
  if(isTask){
    // Read-only — link to the task
    actions = '<button class="tt-row-link" onclick="openTaskDrawer(\''+r.taskId+'\')" title="Open task">'
            + '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l4-4M5 5h4v4"/></svg>'
            + '</button>';
  } else if(!r.running && isMine){
    // Edit + delete only on my own non-running global sessions. Other
    // people's entries are read-only here.
    actions = '<button class="tt-row-action" onclick="openEditEntryDialog(\''+r.id+'\')" title="Edit">'
            + '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l2 2-7 7H2v-2z"/></svg>'
            + '</button>'
            + '<button class="tt-row-action tt-row-action-danger" onclick="confirmDeleteEntry(\''+r.id+'\')" title="Delete">'
            + '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg>'
            + '</button>';
  }
  var projectHtml = (typeof renderProjectChip === 'function') ? renderProjectChip(r.projectId) : '';
  var tagsHtml    = (typeof renderTagPills    === 'function') ? renderTagPills(r.tags)        : '';
  // Per-row checkbox for bulk select. Only mine (other users' data is
  // read-only here), not task entries (those live on the task), not
  // running. Task entries and other-user entries get a placeholder cell
  // so columns line up.
  var canSelect = !isTask && !r.running && isMine;
  var isSelected = !!_selectedSessionIds[r.id];
  var cbCell;
  if(canSelect){
    cbCell = '<div class="tt-row-cb-cell">'
           +   '<div class="task-cb'+(isSelected?' selected':'')+'" role="checkbox" aria-checked="'+(isSelected?'true':'false')+'" tabindex="0" title="Select for bulk action" onclick="event.stopPropagation();toggleSessionSelected(\''+r.id+'\')"></div>'
           + '</div>';
  } else {
    cbCell = '<div class="tt-row-cb-cell tt-row-cb-empty"></div>';
  }
  // Description text — click to inline-edit on own global entries
  // (tasks are read-only here; other users' rows are too). Empty
  // descriptions render with a "tt-row-text-empty" class so users see
  // a faded placeholder that still invites a click.
  var canEditDesc = !isTask && isMine;
  var descCls = 'tt-row-text' + (hasDesc ? '' : ' tt-row-text-empty') + (canEditDesc ? ' tt-row-text-edit' : '');
  // data-session-id lets _ttRestoreFocus re-target this span after a
  // re-render (e.g. the 30s tickTimeTrackerPanel rebuild) so an
  // in-progress inline edit can be re-armed without losing the user's
  // typed text or caret position.
  var descAttrs = canEditDesc
    ? ' role="button" tabindex="0" data-session-id="'+r.id+'" title="Click to edit description" onclick="event.stopPropagation();editTimeRowDescriptionInline(\''+r.id+'\', this)"'
    : '';
  return '<div class="tt-row '+(r.running?'tt-row-running':'')+(isSelected?' tt-row-selected':'')+(!isMine?' tt-row-other':'')+'">'
    + cbCell
    + '<div class="tt-row-desc">'
    +   '<div class="tt-row-text-wrap">'
    +     '<span class="'+descCls+'"'+descAttrs+'>'+escapeHtml(desc)+'</span>'
    +     (projectHtml ? projectHtml : '')
    +     (tagsHtml    ? tagsHtml    : '')
    +   '</div>'
    +   (badges ? '<span class="tt-row-badges">'+badges+'</span>' : '')
    + '</div>'
    + userCell
    + '<div class="tt-row-times">'+startStr+' <span class="tt-arrow">–</span> '+endStr+'</div>'
    + '<div class="tt-row-dur">'+durStr+'</div>'
    + '<div class="tt-row-actions">'+actions+'</div>'
    + '</div>';
}

/* Inline-edit the description of a global time entry from the row in
   the entry log. Click → input; Enter / blur saves; Esc reverts.
   Mirrors the editTaskTitleInline pattern in tasks.js. */
function editTimeRowDescriptionInline(sessionId, el){
  if(!el || !sessionId) return;
  var s = clockSessions[sessionId]; if(!s) return;
  // Owner-only — silently bail if a non-owner somehow triggers this
  // (shouldn't happen because we don\'t emit the click handler for
  // other users' rows, but defensive anyway).
  if(currentUser && s.user !== currentUser.name) return;
  var orig = s.description || '';
  var input = document.createElement('input');
  input.type = 'text';
  input.value = orig;
  input.className = 'tt-row-text-input';
  input.placeholder = 'What did you work on?';
  input.maxLength = 500;
  // Carry the session id on the input so _ttCaptureFocus / _ttRestoreFocus
  // can re-arm this edit after a re-render mid-typing without losing state.
  input.setAttribute('data-session-id', sessionId);
  el.replaceWith(input);
  input.focus();
  input.select();
  var done = false;
  var commit = function(){
    if(done) return; done = true;
    var v = input.value.trim();
    if(v !== (orig || '')){
      updateSession(sessionId, {description: v});
      // Re-render handled by the Firebase listener — input vanishes
      // when the row re-renders. No explicit re-render needed.
    } else {
      // No change — restore the static text without a Firebase round-trip.
      renderTimeTrackerPanel();
    }
  };
  var cancel = function(){
    if(done) return; done = true;
    renderTimeTrackerPanel();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); commit(); }
    else if(e.key === 'Escape'){ e.preventDefault(); cancel(); }
  });
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
  var today = startOfDay(Date.now());
  if(ts === today) return 'Today, '+d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  if(ts === today - 86400000) return 'Yesterday, '+d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  return d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year: (d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined)});
}

/* ── Actions ── */
function ttStart(){
  var inp = document.getElementById('tt-desc');
  var desc = inp ? inp.value : '';
  clockIn(desc, { projectId: _ttStagedProjectId || null, tags: _ttStagedTags || [] });
  // Don't clear staged state here — keep it so consecutive sessions reuse the
  // same project/tags. User can change via the chips at any time.
}
function ttStop(){
  clockOut();
  // Reset staged state on stop so the bar starts clean for the next session.
  _ttStagedProjectId = null;
  _ttStagedTags = [];
}
function confirmDeleteEntry(sessionId){
  var s = clockSessions[sessionId]; if(!s) return;
  var preview = s.description ? '"'+s.description+'" — ' : '';
  // M3: multi-day clarifier. Calendar renders multi-day sessions as one
  // block per day, but they all share the session id — so deleting "this"
  // really deletes the whole span. Make that explicit in the modal copy.
  var msg = preview + fmtTrackerHM(s.durationMs||0)+' will be removed permanently.';
  if(s.start && s.end && (typeof startOfDay === 'function')){
    if(startOfDay(s.start) !== startOfDay(s.end - 1)){
      msg += ' This is a multi-day session — every day will be removed.';
    }
  }
  ftConfirm({
    title: 'Delete entry?',
    message: msg,
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
  // Update running entry row durations + day totals every minute (cheap).
  // Skip the panel-wide re-render entirely if the running session falls
  // outside the active filter range — the topbar pill keeps ticking on
  // its own, and re-rendering 60×/min for a session the user can't even
  // see in the entry log is wasted work. (F9)
  if(!tickTimeTrackerPanel._lastFull || Date.now() - tickTimeTrackerPanel._lastFull > 30000){
    tickTimeTrackerPanel._lastFull = Date.now();
    var hasRunning = (active || (typeof tasksData==='object' && Object.values(tasksData||{}).some(function(t){
      return t && t.activeTimers && currentUser && t.activeTimers[currentUser.name];
    })));
    if(!hasRunning) return;
    var range = _ttFilterRange();
    var runningStart = active ? active.start : (function(){
      var earliest = Infinity;
      Object.values(tasksData||{}).forEach(function(t){
        if(!t || !t.activeTimers) return;
        var at = t.activeTimers[currentUser ? currentUser.name : ''];
        if(at && at.start && at.start < earliest) earliest = at.start;
      });
      return earliest === Infinity ? null : earliest;
    })();
    // If the running session started before the range ends AND extends
    // into the range (which it does by definition — it's still going), it
    // overlaps. The only case to skip is when the running session started
    // AFTER the range end (filter is past, session is now → no overlap).
    if(runningStart != null && runningStart >= range.end) return;
    renderTimeTrackerPanel();
  }
}

/* ── Edit-entry dialog ── */
function openEditEntryDialog(sessionId){
  var s = clockSessions[sessionId]; if(!s) return;
  if(s.user !== (currentUser ? currentUser.name : '')){
    showToast('Only the owner can edit this');
    return;
  }
  // Editing an existing entry is an unrelated action — any staged
  // project/tags the user had queued for the next Start Work shouldn't
  // bleed into this dialog's flow. Clear them up-front so the user's
  // next clockIn starts fresh. (F6)
  _ttStagedProjectId = null;
  _ttStagedTags = [];
  _showEntryDialog({
    title: 'Edit Time Entry',
    description: s.description || '',
    start: s.start,
    end:   s.end,
    projectId: s.projectId || null,
    tags:      Array.isArray(s.tags) ? s.tags : [],
    onSave: function(data){
      updateSession(sessionId, data);
      showToast('Entry updated', 'success');
    }
  });
}

/* ── Manual-entry pre-fill API ──────────────────────────────────
   Either of {Calendar, Timesheet} can call stageManualEntry({start,end})
   to pre-fill the dialog with a specific time range, then call
   openManualEntryDialog(). The staged value is read once and cleared.
   This decouples the dialog from any single feature's globals. */
var _ttPendingManualEntry = null;
function stageManualEntry(payload){
  _ttPendingManualEntry = payload && payload.start && payload.end ? payload : null;
}

/* ── Manual-entry dialog ── */
function openManualEntryDialog(){
  if(!currentUser) return;
  // Read+clear the staged pre-fill (set by Calendar or Timesheet via
  // stageManualEntry). Legacy: still honors the older _calPendingManualEntry
  // global if some caller hasn't switched over yet.
  var pending = _ttPendingManualEntry;
  _ttPendingManualEntry = null;
  if(!pending && typeof _calPendingManualEntry !== 'undefined' && _calPendingManualEntry){
    pending = _calPendingManualEntry;
    _calPendingManualEntry = null;
  }
  var startTs, endTs;
  if(pending){
    startTs = pending.start;
    endTs   = pending.end;
  } else {
    var now = Date.now();
    var dayStart = startOfDay(now);
    endTs = Math.min(now, dayStart + 23*3600*1000 + 59*60*1000);
    startTs = Math.max(dayStart, endTs - 3600*1000);
  }
  _showEntryDialog({
    title: 'Add Manual Entry',
    description: '',
    start: startTs,
    end:   endTs,
    projectId: _ttStagedProjectId || null,
    tags:      _ttStagedTags || [],
    onSave: function(data){
      addManualSession(data.start, data.end, data.description, {
        projectId: data.projectId || null,
        tags:      data.tags || []
      });
      showToast('Entry added', 'success');
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
  // Track project + tags inside the dialog (mutable across picker callbacks)
  var dialogProjectId = opts.projectId || null;
  var dialogTags      = Array.isArray(opts.tags) ? opts.tags.slice() : [];

  bd.innerHTML =
    '<div class="ftc-modal" role="dialog" aria-modal="true" style="width:min(460px,calc(100vw - 32px))">'
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
    +    '<div class="te-grid2">'
    +      '<div><label class="te-label">Project</label><div id="te-project-slot"></div></div>'
    +      '<div><label class="te-label">Tags</label><div id="te-tags-slot"></div></div>'
    +    '</div>'
    +  '</div>'
    +  '<div class="ftc-actions">'
    +    '<button class="ftc-btn ftc-cancel" type="button">Cancel</button>'
    +    '<button class="ftc-btn ftc-primary" type="button">Save</button>'
    +  '</div>'
    +'</div>';
  document.body.appendChild(bd);
  requestAnimationFrame(function(){ bd.classList.add('show'); });

  // Render project + tag chip-buttons inside their slots (re-rendered on change)
  function renderProjectSlot(){
    var slot = bd.querySelector('#te-project-slot'); if(!slot) return;
    var p = dialogProjectId && typeof projectsData !== 'undefined' ? projectsData[dialogProjectId] : null;
    slot.innerHTML = p
      ? '<button type="button" class="te-chip-btn"><span class="tt-project-dot" style="background:'+p.color+'"></span><span>'+escapeHtml(p.name)+'</span></button>'
      : '<button type="button" class="te-chip-btn te-chip-empty"><span>No project</span></button>';
    var btn = slot.querySelector('button');
    if(btn) btn.addEventListener('click', function(){
      if(typeof openProjectPicker === 'function'){
        openProjectPicker(dialogProjectId, btn, function(v){
          dialogProjectId = v || null;
          renderProjectSlot();
        });
      }
    });
  }
  function renderTagsSlot(){
    var slot = bd.querySelector('#te-tags-slot'); if(!slot) return;
    var n = dialogTags.length;
    slot.innerHTML = '<button type="button" class="te-chip-btn'+(n?'':' te-chip-empty')+'">'
      + '<span>'+(n ? n+' tag'+(n===1?'':'s')+' selected' : 'No tags')+'</span>'
      + '</button>';
    var btn = slot.querySelector('button');
    if(btn) btn.addEventListener('click', function(){
      if(typeof openTagPicker === 'function'){
        openTagPicker(dialogTags, btn, function(v){
          dialogTags = v || [];
          renderTagsSlot();
        });
      }
    });
  }
  renderProjectSlot();
  renderTagsSlot();

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
    // Close any project/tag picker that was opened from inside this
    // dialog. Pickers are appended to document.body, so removing the
    // dialog backdrop wouldn't take them with it — they'd linger as
    // orphans floating over the page until the user clicked elsewhere.
    if(typeof closeAllPtPickers === 'function') closeAllPtPickers();
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
    if(opts.onSave) opts.onSave({
      description: desc,
      start: sMs,
      end: eMs,
      projectId: dialogProjectId || null,
      tags: dialogTags || []
    });
  };
  bd.onclick = function(e){ if(e.target === bd) cleanup(); };
  var keyHandler = function(e){
    if(e.key === 'Escape') cleanup();
  };
  document.addEventListener('keydown', keyHandler);
  setTimeout(function(){ bd.querySelector('#te-desc').focus(); }, 50);
}
