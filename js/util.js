/* Flowtive One — Shared utility helpers */

function getSearchKeyword(ind,state,city){
  var abbrev=STATE_ABBREV[state]||state;
  return ind+' in '+city+', '+abbrev+', USA';
}

var COPY_ICON='<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
var CHECK_ICON='<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function copyKeyword(btn,keyword){
  var doAfter=function(){
    btn.innerHTML=CHECK_ICON;
    btn.classList.add('copied');
    btn.title='Copied!';
    setTimeout(function(){
      btn.innerHTML=COPY_ICON;
      btn.classList.remove('copied');
      btn.title='Copy to clipboard';
    },1800);
  };
  // Fix 14: Use only the modern Clipboard API; gracefully degrade with a visible prompt
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(keyword).then(doAfter).catch(function(){
      prompt('Copy this keyword:', keyword);
    });
  } else {
    // Last-resort fallback for very old browsers
    var ta=document.createElement('textarea');
    ta.value=keyword;
    ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();ta.select();
    try{ document.execCommand('copy'); doAfter(); }catch(e){ prompt('Copy this keyword:', keyword); }
    document.body.removeChild(ta);
  }
}

/* Standardized toast palette — keyed semantic names map to a single set of
   colors so the UI doesn't show 4 different shades of "green" for "success".
   Backward-compat: any hex string still works as before. */
var _TOAST_PALETTE = {
  success: '#3AC284',
  danger:  '#991B1B',
  warning: '#E67E22',
  neutral: '#475569',
  info:    '#1A1A2E'
};
function showToast(msg, color){
  // Map semantic tokens to palette colors; raw hex values pass through.
  var resolved = (color && _TOAST_PALETTE[color]) ? _TOAST_PALETTE[color] : (color || _TOAST_PALETTE.info);
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:'+resolved+';color:#fff;font-size:13px;font-weight:500;padding:10px 20px;border-radius:99px;box-shadow:0 4px 16px rgba(0,0,0,0.18);z-index:9999;opacity:0;transition:opacity 0.2s;pointer-events:none;white-space:nowrap';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity = '1'; });
  setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 250); }, 2500);
}

/* Undoable toast — used for destructive deletes. Shows a "msg • Undo" pill
   at the bottom for `duration` ms (default 5s). Clicking Undo runs onUndo
   and skips onCommit. If the toast times out, onCommit is invoked once. */
function showUndoToast(msg, onUndo, onCommit, duration){
  duration = duration || 5000;
  // Dismiss any prior undo toast first (commit it if still pending)
  if(window.__undoToast){
    try{ window.__undoToast._commitNow(); }catch(e){}
  }
  var t = document.createElement('div');
  t.className = 'undo-toast';
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:#fff;font-size:13px;font-weight:500;padding:8px 8px 8px 16px;border-radius:99px;box-shadow:0 4px 16px rgba(0,0,0,0.18);z-index:9999;opacity:0;transition:opacity 0.2s;display:flex;align-items:center;gap:12px;white-space:nowrap';
  var label = document.createElement('span');
  label.textContent = msg;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Undo';
  btn.style.cssText = 'background:rgba(255,255,255,0.18);color:#fff;border:0;border-radius:99px;padding:5px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit';
  btn.onmouseenter = function(){ btn.style.background = 'rgba(255,255,255,0.28)'; };
  btn.onmouseleave = function(){ btn.style.background = 'rgba(255,255,255,0.18)'; };
  t.appendChild(label);
  t.appendChild(btn);
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity = '1'; });

  var done = false;
  function close(){
    if(!t.parentElement) return;
    t.style.opacity = '0';
    setTimeout(function(){ if(t.parentElement) t.remove(); }, 250);
    if(window.__undoToast === api) window.__undoToast = null;
  }
  function commit(){
    if(done) return; done = true;
    try{ if(typeof onCommit === 'function') onCommit(); }catch(e){}
    close();
  }
  function undo(){
    if(done) return; done = true;
    try{ if(typeof onUndo === 'function') onUndo(); }catch(e){}
    close();
  }
  btn.onclick = undo;
  var timer = setTimeout(commit, duration);
  var api = { _commitNow: function(){ clearTimeout(timer); commit(); } };
  window.__undoToast = api;
  return api;
}


function formatTimeAgo(ts){
  var diff=Math.floor((Date.now()-ts)/1000);
  if(diff<60) return 'Just Now';
  if(diff<3600) return Math.floor(diff/60)+'m ago';
  if(diff<86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}


function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ── Date helpers ──────────────────────────────────────────────
   Centralized so each feature file (timetracker, calendar, reports,
   timesheet, dashboards) doesn't carry its own _xxStartOfDay/Week.
   All return a millisecond timestamp at midnight local time. */
function startOfDay(d){
  var x = new Date(d);
  x.setHours(0,0,0,0);
  return x.getTime();
}
function startOfWeek(d){
  // Monday as the first day of the week — most common in business contexts.
  // Sunday(0) → -6 days, Mon(1) → 0, Tue(2) → -1, etc.
  var x = new Date(d);
  x.setHours(0,0,0,0);
  var day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x.getTime();
}
function startOfMonth(d){
  var x = new Date(d);
  x.setHours(0,0,0,0);
  x.setDate(1);
  return x.getTime();
}
function startOfYear(d){
  var x = new Date(d);
  x.setHours(0,0,0,0);
  x.setMonth(0, 1);
  return x.getTime();
}

/* ── O(1) member lookup ─────────────────────────────────────
   `MEMBERS` is a static array in config.js. Looking up a member by name
   used to scatter ~17 `MEMBERS.find(m => m.name === x)` callsites across
   render hot paths (entry log, reports, calendar, activity feed) — each
   one O(N) per row. Build once, lookup forever. The map is lazy: first
   call after the script loads pays for the build, subsequent calls are
   single property reads. Never invalidates because MEMBERS is config. */
var _membersByName = null;
function membersByName(){
  if(_membersByName) return _membersByName;
  _membersByName = Object.create(null);
  if(typeof MEMBERS !== 'undefined' && Array.isArray(MEMBERS)){
    MEMBERS.forEach(function(m){ if(m && m.name) _membersByName[m.name] = m; });
  }
  return _membersByName;
}

/* ── Keyboard activation for ARIA-role widgets ─────────────────
   Two surfaces that look interactive but only have inline onclick:
     1. Bulk-select checkboxes (.task-cb role="checkbox") — Tasks,
        Tracker per-day master, Tracker rows.
     2. Tracker row description spans (.tt-row-text-edit role="button")
        — click-to-edit description (v2.23.0).
   Both are tabindex="0" so they're keyboard-reachable, but Space/Enter
   on a focused element does nothing without this handler (and Space
   would scroll the page). One global capture-phase listener covers them. */
document.addEventListener('keydown', function(e){
  if(e.key !== ' ' && e.key !== 'Enter') return;
  var el = e.target;
  if(!el || !el.classList) return;
  var isCheckbox = el.classList.contains('task-cb') && el.getAttribute('role') === 'checkbox';
  var isTextEdit = el.classList.contains('tt-row-text-edit') && el.getAttribute('role') === 'button';
  if(!isCheckbox && !isTextEdit) return;
  e.preventDefault();
  // Re-fire whatever onclick the element has (set inline by the
  // emission site — toggleTaskSelected / toggleSessionSelected /
  // toggleSelectAllTasks / toggleSelectDay / editTimeRowDescriptionInline).
  if(typeof el.onclick === 'function') el.onclick(e);
  else el.click();
});

/* ── Render coalescing ─────────────────────────────────────────
   Multiple Firebase listeners can fire in rapid succession (e.g. when
   subscribeClock + subscribeTasks both refresh the workspace dashboard).
   `scheduleRender(key, fn)` collapses repeat calls per key into a single
   rAF-batched render — fixes both 8a (full rebuilds on every FB update)
   and 8c (no debounce on rapid updates) in one mechanism. */
var _renderQueue = {};
function scheduleRender(key, fn){
  if(typeof fn !== 'function') return;
  _renderQueue[key] = fn;
  if(scheduleRender._raf) return;
  scheduleRender._raf = requestAnimationFrame(function(){
    var queued = _renderQueue;
    _renderQueue = {};
    scheduleRender._raf = 0;
    Object.keys(queued).forEach(function(k){
      try{ queued[k](); }catch(e){}
    });
  });
}

/* ── Accessibility helper ──────────────────────────────────────
   Many icon buttons in the app set `title="…"` for hover hints but lack
   an explicit `aria-label`. Title-only buttons are inconsistent for
   screen readers. This sweeps the DOM and copies `title` → `aria-label`
   on any element with `role="button"`, <button>, or <a> when the latter
   is missing. Runs on load + a MutationObserver picks up dynamic UI. */
function _ensureAriaLabels(root){
  root = root || document.body;
  if(!root.querySelectorAll) return;
  var sel = 'button[title]:not([aria-label]),a[title]:not([aria-label]),[role="button"][title]:not([aria-label])';
  root.querySelectorAll(sel).forEach(function(el){
    var t = el.getAttribute('title');
    if(t && t.trim()) el.setAttribute('aria-label', t);
  });
}
document.addEventListener('DOMContentLoaded', function(){
  _ensureAriaLabels(document.body);
  // Watch for dynamically inserted UI (modals, drawers, list items, etc.)
  try{
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if(n.nodeType === 1) _ensureAriaLabels(n);
        });
      });
    });
    mo.observe(document.body, { childList:true, subtree:true });
  }catch(e){}
});

/* ── Lazy module loader ─────────────────────────────────────
   Inject a <script> tag on demand and return a Promise that resolves
   when the script's onload fires. Caches the Promise (not a boolean)
   so concurrent callers requesting the same src dedupe to a single
   network request. Used by panel onActivate handlers to defer
   panel-specific JS off the initial-load critical path. */
var _moduleCache = Object.create(null);
function loadModule(src){
  if(_moduleCache[src]) return _moduleCache[src];
  _moduleCache[src] = new Promise(function(resolve, reject){
    var s = document.createElement('script');
    s.src = src;
    // async:false preserves execution order if multiple loadModule
    // calls fire in the same tick (rare, but safe).
    s.async = false;
    s.onload  = function(){ resolve(); };
    s.onerror = function(){
      // Drop from cache on failure so a retry can re-attempt the load.
      delete _moduleCache[src];
      reject(new Error('Failed to load: ' + src));
    };
    document.head.appendChild(s);
  });
  return _moduleCache[src];
}

/* Chart.js gate. Resolves immediately if Chart is already on the page
   (loaded eagerly OR a previous call already loaded it), otherwise
   triggers the lazy load. Idempotent. */
function ensureChartJs(){
  if(typeof Chart !== 'undefined') return Promise.resolve();
  return loadModule('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js');
}
