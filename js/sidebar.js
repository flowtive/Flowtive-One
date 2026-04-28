/* Flowtive One — Sidebar: build + count updates */

/* Has the user seen the "What's New" entry for the CURRENT app version yet?
   We mark a version as read when they actually open the modal. */
function _isWhatsNewUnread(){
  try{
    if(typeof APP_VERSION === 'undefined') return false;
    var seen = localStorage.getItem('flowtive_whatsnew_seen');
    return seen !== APP_VERSION;
  }catch(e){ return false; }
}
function _markWhatsNewSeen(){
  try{
    if(typeof APP_VERSION !== 'undefined'){
      localStorage.setItem('flowtive_whatsnew_seen', APP_VERSION);
    }
  }catch(e){}
}

/* ── Sidebar ── */
function buildSidebar(){
  var sb=document.getElementById('sidebar');
  sb.innerHTML='';
  // Reset the "first group defaults open" flag so a fresh build evaluates
  // the saved-open-group correctly each time (handles logout/login + reloads).
  if(typeof buildSidebarGroup === 'function') buildSidebarGroup._defaulted = false;

  var sec1=document.createElement('div');
  sec1.className='sid-section';sec1.textContent='Overview';
  sb.appendChild(sec1);

  // Dashboard is the universal landing — always active by default.
  var dashItem=document.createElement('div');
  dashItem.className='sid-dashboard active';
  dashItem.id='sid-dashboard';
  dashItem.innerHTML=
    '<div class="sid-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor"/><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.55"/><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.55"/><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.35"/></svg></div>Dashboard';
  dashItem.onclick=function(){
    document.querySelectorAll('.sid-item,.sid-dashboard').forEach(function(s){s.classList.remove('active');});
    document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
    dashItem.classList.add('active');
    document.getElementById('panel-dashboard').classList.add('active');
    buildDashboard();
  };
  sb.appendChild(dashItem);

  // ── Flowtive Workflow group (collapsible) ───────────────────────
  buildSidebarGroup(sb, {
    id:        'tasks',
    label:     'Flowtive Workflow',
    icon:      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/><path d="M4 7.5L6 9.5 10 5.5"/></svg>',
    storageKey:'flowtive_sidebar_tasks_open',
    countId:   'sid-tasks-count',          // open-tasks badge on the parent row
    items: [
      { id:'sid-tasks-dashboard', label:'Dashboard', panelId:'panel-tasks-dashboard',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12V8M7 12V4M12 12V6"/></svg>',
        onActivate:function(){ if(typeof renderTasksDashboardPanel==='function') renderTasksDashboardPanel(); } },
      { id:'sid-tasks',           label:'Board',     panelId:'panel-tasks',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.5l1 1 1.5-1.5"/><path d="M6.5 4h5.5"/><path d="M2 7l1 1 1.5-1.5"/><path d="M6.5 7.5h5.5"/><path d="M2 10.5l1 1 1.5-1.5"/><path d="M6.5 11h5.5"/></svg>',
        onActivate:function(){ if(typeof renderTasksPanel==='function') renderTasksPanel(); } }
    ]
  });

  // ── Flowtive Logbook group (collapsible) ────────────────────────
  buildSidebarGroup(sb, {
    id:        'time',
    label:     'Flowtive Logbook',
    icon:      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 2"/></svg>',
    storageKey:'flowtive_sidebar_time_open',
    items: [
      { id:'sid-time',           label:'Tracker',      panelId:'panel-time',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="8" r="4.5"/><path d="M7 5.5v3l2 1.5"/><path d="M5.5 1.5h3"/><path d="M7 1.5v2"/></svg>',
        onActivate:function(){ if(typeof renderTimeTrackerPanel==='function') renderTimeTrackerPanel(); } },
      { id:'sid-time-calendar',  label:'Calendar',     panelId:'panel-time-calendar',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="11" height="9.5" rx="1"/><path d="M1.5 5.5h11"/><path d="M4 1.5v3M10 1.5v3"/></svg>',
        onActivate:function(){ if(typeof renderTimeCalendarPanel==='function') renderTimeCalendarPanel(); } },
      { id:'sid-time-timesheet', label:'Timesheet',    panelId:'panel-time-timesheet',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="1.5" width="11" height="11" rx="1"/><path d="M1.5 5.5h11M1.5 9.5h11M5 1.5v11M9 1.5v11"/></svg>',
        onActivate:function(){ if(typeof renderTimeTimesheetPanel==='function') renderTimeTimesheetPanel(); } },
      { id:'sid-time-dashboard', label:'Dashboard',    panelId:'panel-time-dashboard',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="0.8"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="0.8"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="0.8"/><rect x="8" y="8" width="4.5" height="4.5" rx="0.8"/></svg>',
        onActivate:function(){ if(typeof renderTimeDashboardPanel==='function') renderTimeDashboardPanel(); } },
      { id:'sid-time-reports',   label:'Reports',      panelId:'panel-time-reports',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="1.5" width="10" height="11" rx="1"/><path d="M5 9.5v-2M7 9.5v-4M9 9.5v-3"/></svg>',
        onActivate:function(){ if(typeof renderTimeReportsPanel==='function') renderTimeReportsPanel(); } },
      { id:'sid-time-projects',  label:'Projects',     panelId:'panel-time-projects',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5h5.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V4z"/></svg>',
        onActivate:function(){ if(typeof renderProjectsPanel==='function') renderProjectsPanel(); } },
      { id:'sid-time-tags',      label:'Tags',         panelId:'panel-time-tags',
        icon:'<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 7V2.5a1 1 0 0 1 1-1H7l5.5 5.5-5 5-6-6z"/><circle cx="4" cy="4" r="0.7" fill="currentColor" stroke="none"/></svg>',
        onActivate:function(){ if(typeof renderTagsPanel==='function') renderTagsPanel(); } }
    ]
  });

  // ── Resources section ── reference tools (not standalone apps) ──────
  var sec3=document.createElement('div');
  sec3.className='sid-section';sec3.style.marginTop='8px';sec3.textContent='Resources';
  sb.appendChild(sec3);

  // Flowtive Cold Pitch — opens the email templates modal
  var emailItem=document.createElement('div');
  emailItem.className='sid-dashboard';
  emailItem.id='sid-email-templates';
  emailItem.innerHTML=
    '<div class="sid-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="11" height="8" rx="1"/><path d="M2 4l5 4 5-4"/></svg></div>Flowtive Cold Pitch';
  emailItem.onclick=function(){ openEmailLibrary(); };
  sb.appendChild(emailItem);

  // Flowtive Territory — Dashboard sub-item (state-coverage analytics) +
  // a collapsible reference list of team members; each member item opens
  // that person's state-by-state lead pipeline panel.
  buildSidebarGroup(sb, {
    id:    'members',
    label: 'Flowtive Territory',
    icon:  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6c0 3.2 4.5 6.5 4.5 6.5s4.5-3.3 4.5-6.5c0-2.5-2-4.5-4.5-4.5z"/><circle cx="7" cy="6" r="1.5"/></svg>',
    count: MEMBERS.length,
    renderItems: function(group){
      // Dashboard sub-item — state-tracker analytics (was the main dashboard)
      var dashSub = document.createElement('div');
      dashSub.className = 'sid-subitem';
      dashSub.id = 'sid-territory-dashboard';
      dashSub.innerHTML =
        '<span class="sid-subitem-icon"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="0.8"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="0.8"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="0.8"/><rect x="8" y="8" width="4.5" height="4.5" rx="0.8"/></svg></span>'+
        '<span class="sid-subitem-label">Dashboard</span>';
      dashSub.onclick = function(){
        document.querySelectorAll('.sid-item,.sid-dashboard,.sid-subitem').forEach(function(s){s.classList.remove('active');});
        document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
        dashSub.classList.add('active');
        var panel = document.getElementById('panel-territory-dashboard');
        if(panel) panel.classList.add('active');
        if(typeof buildTerritoryDashboard === 'function') buildTerritoryDashboard();
      };
      group.appendChild(dashSub);

      MEMBERS.forEach(function(m,i){
        var isMe = currentUser && m.name === currentUser.name;
        // No auto-active on the user's own row — Dashboard is the landing
        var item = document.createElement('div');
        item.className = 'sid-item';
        item.id = 'sid-' + i;
        item.innerHTML =
          (function(){
            var _sImg = loadAvatar(m.name);
            var avInner = _sImg
              ? '<img src="'+_sImg+'" style="width:26px;height:26px;border-radius:50%;object-fit:cover;display:block" alt="'+m.name+'">'
              : m.name.substring(0,2).toUpperCase();
            var avBg = _sImg ? 'transparent' : m.color;
            var avOverflow = _sImg ? 'overflow:hidden;' : '';
            return '<div style="position:relative;width:26px;height:26px;flex-shrink:0">'+
              '<div class="sid-av" id="sid-av-'+i+'" style="background:'+avBg+';'+avOverflow+'width:26px;height:26px;">'+avInner+'</div>'+
              '<span class="presence-dot offline" id="presence-'+i+'" title="Offline" style="position:absolute;bottom:-1px;right:-1px;width:9px;height:9px;border-radius:50%;border:2px solid #fff;z-index:2"></span>'+
            '</div>';
          })()+
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+m.name+(isMe?' <span style="font-size:9px;color:'+m.color+'">you</span>':'')+'</span>'+
          '<span class="sid-clock-pill" id="sid-clock-'+i+'" style="display:none" title="Currently Working"></span>'+
          '<span class="sid-done-count" id="sid-count-'+i+'">…</span>';
        item.onclick = function(){
          document.querySelectorAll('.sid-item,.sid-dashboard,.sid-subitem').forEach(function(s){s.classList.remove('active');});
          document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
          item.classList.add('active');
          document.getElementById('panel-'+i).classList.add('active');
        };
        group.appendChild(item);
      });
    }
  });

  // Sidebar footer — Start/Stop Work pill on top; bell + version pill below
  var footer=document.createElement('div');
  footer.className='sid-footer';
  // Notification bell — muted state styled differently. SVG is a bell;
  // when muted we add the slash via a CSS pseudo-element so the icon stays simple.
  var muted = (typeof isNotificationsMuted === 'function') ? isNotificationsMuted() : false;
  var bellSvg = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M3 6.5a4 4 0 1 1 8 0v3l1 1.5H2l1-1.5z"/>'
    + '<path d="M5.5 11.5a1.5 1.5 0 0 0 3 0"/>'
    + '</svg>';
  footer.innerHTML='<button class="clock-btn" onclick="toggleClock()" type="button" title="Track Your Work Time">'
    +'<span class="clock-btn-icon"></span>'
    +'<span class="clock-btn-label-text">Start Work</span>'
    +'</button>'
    +'<div class="sid-footer-row">'
    +  '<button class="sid-icon-btn'+(muted?' muted':'')+'" id="sid-notifs-btn" onclick="toggleNotifications()" type="button" title="'+(muted?'Notifications muted — click to enable':'Notifications on — click to mute')+'">'
    +    bellSvg
    +  '</button>'
    +  '<button class="sid-version'+(_isWhatsNewUnread()?' has-update':'')+'" onclick="openWhatsNew()" type="button" title="What\'s new in Flowtive One">'
    +    'v'+(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?')
    +    (_isWhatsNewUnread() ? '<span class="sid-version-dot" aria-label="Unread update"></span>' : '')
    +  '</button>'
    +'</div>';
  sb.appendChild(footer);
  // Sync button to current state
  if(typeof renderClockButton === 'function') renderClockButton();
  // Wire up the mobile drawer auto-close (idempotent)
  if(typeof _bindSidebarAutoClose === 'function') _bindSidebarAutoClose();
}

/* Auto-close the mobile drawer whenever the user picks a nav entry. We
   use event delegation on the sidebar so we don't have to touch every
   handler — any click that lands on a known nav class closes the drawer. */
function _bindSidebarAutoClose(){
  var sb = document.getElementById('sidebar');
  if(!sb || sb._autoCloseBound) return;
  sb._autoCloseBound = true;
  sb.addEventListener('click', function(e){
    var t = e.target;
    while(t && t !== sb){
      if(t.classList && (t.classList.contains('sid-item') || t.classList.contains('sid-subitem') || t.classList.contains('sid-dashboard'))){
        // Only auto-close on phones where the drawer pattern is active
        if(window.matchMedia && window.matchMedia('(max-width:899px)').matches){
          setTimeout(closeMobileSidebar, 60);
        }
        return;
      }
      t = t.parentNode;
    }
  });
}
// Bind after the sidebar exists. buildSidebar() is called on login;
// also run on DOMContentLoaded for the rare case the sidebar already exists.
document.addEventListener('DOMContentLoaded', _bindSidebarAutoClose);

/* ── Mobile drawer open/close ──────────────────────────────────
   On phones the sidebar is hidden and slides in over a backdrop when the
   topbar hamburger is tapped. Tapping any nav item, the backdrop, or
   pressing Escape closes it. Above 900px (where the sidebar is normally
   visible) these calls are no-ops. */
function openMobileSidebar(){
  var sb = document.getElementById('sidebar');
  if(!sb) return;
  sb.classList.add('is-open');
  document.body.classList.add('sidebar-open');
  var bd = document.getElementById('sidebar-backdrop');
  if(!bd){
    bd = document.createElement('div');
    bd.className = 'sidebar-backdrop';
    bd.id = 'sidebar-backdrop';
    bd.onclick = closeMobileSidebar;
    document.body.appendChild(bd);
    // Force a reflow before adding is-open so the transition runs
    void bd.offsetWidth;
  }
  bd.classList.add('is-open');
  document.addEventListener('keydown', _sidebarEscHandler);
}
function closeMobileSidebar(){
  var sb = document.getElementById('sidebar');
  if(sb) sb.classList.remove('is-open');
  document.body.classList.remove('sidebar-open');
  var bd = document.getElementById('sidebar-backdrop');
  if(bd) bd.classList.remove('is-open');
  document.removeEventListener('keydown', _sidebarEscHandler);
}
function toggleMobileSidebar(){
  var sb = document.getElementById('sidebar');
  if(sb && sb.classList.contains('is-open')) closeMobileSidebar();
  else openMobileSidebar();
}
function _sidebarEscHandler(e){ if(e.key === 'Escape') closeMobileSidebar(); }

/* On phones the topbar omits the search bar and shows a search button
   that opens the Cmd+K palette instead. */
function openSearchOnMobile(){
  if(typeof openPalette === 'function') openPalette();
  else if(typeof onSearchFocus === 'function'){
    var inp = document.getElementById('search-input');
    if(inp){ inp.focus(); }
  }
}

function updateSidebarCounts(){
  MEMBERS.forEach(function(_,i){
    var el=document.getElementById('sid-count-'+i);
    var total=totalCitiesForMember(i);
    var done=countTotalCitiesForMember(i);
    if(el)el.textContent=done+'/'+total;
  });
}

/* ── Collapsible sidebar group ─────────────────────────────────────
   Used for "Tasks" and "Time Tracker" headers with sub-items beneath.
   Click the header to expand/collapse; state is persisted to localStorage.
   Each item in cfg.items has {id, label, panelId, onActivate?}. */
var SIDEBAR_OPEN_GROUP_KEY = 'flowtive_sidebar_open_group';
function buildSidebarGroup(sb, cfg){
  // Accordion behaviour — only one group can be open at a time. State is
  // stored in a single key holding the id of the open group (or '' for none).
  // When no preference is saved yet, default to opening the FIRST group built
  // this render pass (Tasks).
  var saved = null;
  try{ saved = localStorage.getItem(SIDEBAR_OPEN_GROUP_KEY); }catch(e){}
  var isOpen;
  if(saved === null){
    if(!buildSidebarGroup._defaulted){
      isOpen = true;
      buildSidebarGroup._defaulted = true;
    } else {
      isOpen = false;
    }
  } else {
    isOpen = saved === cfg.id;
  }

  // Group header (clickable)
  var header = document.createElement('div');
  header.className = 'sid-group-head' + (isOpen ? ' open' : '');
  header.id = 'sid-group-head-' + cfg.id;
  header.setAttribute('data-group-id', cfg.id);
  // Chevron points DOWN when collapsed; rotates 180° to UP when open.
  header.innerHTML =
    '<div class="sid-icon">' + (cfg.icon || '') + '</div>' +
    '<span class="sid-group-label">' + escapeHtml(cfg.label) + '</span>' +
    (cfg.count !== undefined ? '<span class="sid-group-count">' + cfg.count + '</span>' : '') +
    (cfg.countId ? '<span class="sid-tasks-count zero" id="' + cfg.countId + '">0</span>' : '') +
    '<svg class="sid-group-chev" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  sb.appendChild(header);

  // Group body — child items stacked, collapsible via class
  var body = document.createElement('div');
  body.className = 'sid-group-body' + (isOpen ? '' : ' collapsed');
  body.id = 'sid-group-body-' + cfg.id;
  sb.appendChild(body);

  header.onclick = function(){
    var nowOpen = !header.classList.contains('open');
    if(nowOpen){
      // Accordion — close every other open group first
      document.querySelectorAll('.sid-group-head.open').forEach(function(otherHead){
        if(otherHead === header) return;
        otherHead.classList.remove('open');
        var otherBody = otherHead.nextElementSibling;
        if(otherBody && otherBody.classList.contains('sid-group-body')){
          otherBody.classList.add('collapsed');
        }
      });
    }
    header.classList.toggle('open', nowOpen);
    body.classList.toggle('collapsed', !nowOpen);
    try{ localStorage.setItem(SIDEBAR_OPEN_GROUP_KEY, nowOpen ? cfg.id : ''); }catch(e){}
  };

  // Sub-items — either standard simple {id,label,icon,panelId} entries OR a
  // custom renderer for richer items (Team Members uses this for avatars,
  // presence dots, clock pills, etc.)
  if(typeof cfg.renderItems === 'function'){
    cfg.renderItems(body);
  } else if(Array.isArray(cfg.items)){
    cfg.items.forEach(function(item){
      var sub = document.createElement('div');
      sub.className = 'sid-subitem';
      sub.id = item.id;
      sub.innerHTML = '<span class="sid-subitem-icon">' + (item.icon || '') + '</span>' +
                      '<span class="sid-subitem-label">' + escapeHtml(item.label) + '</span>';
      sub.onclick = function(){
        document.querySelectorAll('.sid-item,.sid-dashboard,.sid-subitem').forEach(function(s){s.classList.remove('active');});
        document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
        sub.classList.add('active');
        var panel = document.getElementById(item.panelId);
        if(panel) panel.classList.add('active');
        if(typeof item.onActivate === 'function') item.onActivate();
      };
      body.appendChild(sub);
    });
  }
}

