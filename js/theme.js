/* Flowtive One — Theme (light / dark) system + system-pref listener */

/* ── Theme (light / dark) ────────────────────────────────────────── */
function getCurrentTheme(){
  return document.documentElement.getAttribute('data-theme') || 'light';
}
/* Read a CSS custom property's resolved value at the document root.
   Used by Chart.js options so axis ticks / grid lines re-theme on toggle.
   Falls back to a sensible literal when the var isn't defined yet. */
function themeColor(varName, fallback){
  try{
    var v = getComputedStyle(document.documentElement).getPropertyValue(varName);
    if(v && v.trim()) return v.trim();
  }catch(e){}
  return fallback;
}
function applyTheme(theme, persist){
  // The actual swap — wrapped so we can call it inside a View Transition
  var doSwap = function(){
    document.documentElement.setAttribute('data-theme', theme);
    if(typeof Chart !== 'undefined'){
      var s = getComputedStyle(document.documentElement);
      Chart.defaults.color = s.getPropertyValue('--text-secondary').trim() || '#6B7280';
      Chart.defaults.borderColor = s.getPropertyValue('--border-default').trim() || '#E4E8EE';
    }
    // Rebuild whichever dashboard is currently active so its charts re-paint
    // with the new theme colors during the transition snapshot
    var dash = document.getElementById('panel-dashboard');
    if(dash && dash.classList.contains('active') && typeof buildDashboard === 'function'){
      try{ buildDashboard(); }catch(e){}
    }
    var tDash = document.getElementById('panel-territory-dashboard');
    if(tDash && tDash.classList.contains('active') && typeof buildTerritoryDashboard === 'function'){
      try{ buildTerritoryDashboard(); }catch(e){}
    }
  };

  if(persist){
    try{ localStorage.setItem('flowtive_theme', theme); }catch(e){}
  }

  // PRIMARY PATH — View Transitions API (Chrome/Edge 111+, Safari 18+).
  // Browser snapshots the page, applies the change, and crossfades automatically.
  if(document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    try{
      document.startViewTransition(doSwap);
      return;
    }catch(e){ /* fall through to fallback path */ }
  }

  // FALLBACK PATH — temporarily enable a global color/bg/border transition,
  // do the swap, defer chart rebuild until the fade has visibly started, then
  // remove the temp class so normal hover states stay snappy.
  var root = document.documentElement;
  root.classList.add('theme-transitioning');
  // Apply attribute + chart defaults immediately, but defer the heavy chart
  // rebuild slightly so the CSS color fade can begin first.
  document.documentElement.setAttribute('data-theme', theme);
  if(typeof Chart !== 'undefined'){
    var s2 = getComputedStyle(document.documentElement);
    Chart.defaults.color = s2.getPropertyValue('--text-secondary').trim() || '#6B7280';
    Chart.defaults.borderColor = s2.getPropertyValue('--border-default').trim() || '#E4E8EE';
  }
  setTimeout(function(){
    var dash = document.getElementById('panel-dashboard');
    if(dash && dash.classList.contains('active') && typeof buildDashboard === 'function'){
      try{ buildDashboard(); }catch(e){}
    }
    var tDash = document.getElementById('panel-territory-dashboard');
    if(tDash && tDash.classList.contains('active') && typeof buildTerritoryDashboard === 'function'){
      try{ buildTerritoryDashboard(); }catch(e){}
    }
  }, 420);
  setTimeout(function(){ root.classList.remove('theme-transitioning'); }, 540);
}
function toggleTheme(){
  var t = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(t, true);
}
/* On boot: if no explicit choice, follow system + listen for system changes */
(function(){
  try{
    if(!localStorage.getItem('flowtive_theme') && window.matchMedia){
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      // Set initial (matches the head-script choice; idempotent)
      applyTheme(mq.matches ? 'dark' : 'light', false);
      // Live: respond to system-level toggles
      var handler = function(e){
        if(!localStorage.getItem('flowtive_theme')){
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      };
      if(mq.addEventListener) mq.addEventListener('change', handler);
      else if(mq.addListener) mq.addListener(handler); // older Safari
    }
    // Sync Chart.js defaults to whatever theme was applied by the head script
    if(typeof Chart !== 'undefined'){
      var s = getComputedStyle(document.documentElement);
      Chart.defaults.color = s.getPropertyValue('--text-secondary').trim() || '#6B7280';
      Chart.defaults.borderColor = s.getPropertyValue('--border-default').trim() || '#E4E8EE';
    }
  }catch(e){}
})();

