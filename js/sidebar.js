/* Flowtive One — Sidebar: build + count updates */

/* ── Sidebar ── */
function buildSidebar(){
  var sb=document.getElementById('sidebar');
  sb.innerHTML='';

  var sec1=document.createElement('div');
  sec1.className='sid-section';sec1.textContent='Overview';
  sb.appendChild(sec1);

  var defaultMiSidebar = currentUser ? MEMBERS.findIndex(function(m){return m.name===currentUser.name;}) : -1;
  var dashItem=document.createElement('div');
  dashItem.className='sid-dashboard'+(defaultMiSidebar<0?' active':'');
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

  // ── Tasks group (collapsible) ───────────────────────────────────
  buildSidebarGroup(sb, {
    id:        'tasks',
    label:     'Tasks',
    icon:      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/><path d="M4 7.5L6 9.5 10 5.5"/></svg>',
    storageKey:'flowtive_sidebar_tasks_open',
    countId:   'sid-tasks-count',          // open-tasks badge on the parent row
    items: [
      { id:'sid-tasks-dashboard', label:'Tasks Dashboard', panelId:'panel-tasks-dashboard',
        onActivate:function(){ if(typeof renderTasksDashboardPanel==='function') renderTasksDashboardPanel(); } },
      { id:'sid-tasks',           label:'Tasks',           panelId:'panel-tasks',
        onActivate:function(){ if(typeof renderTasksPanel==='function') renderTasksPanel(); } }
    ]
  });

  // ── Time Tracker group (collapsible) ────────────────────────────
  buildSidebarGroup(sb, {
    id:        'time',
    label:     'Time Tracker',
    icon:      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 2"/></svg>',
    storageKey:'flowtive_sidebar_time_open',
    items: [
      { id:'sid-time',           label:'Time Tracker', panelId:'panel-time',
        onActivate:function(){ if(typeof renderTimeTrackerPanel==='function') renderTimeTrackerPanel(); } },
      { id:'sid-time-calendar',  label:'Calendar',     panelId:'panel-time-calendar',
        onActivate:function(){ if(typeof renderTimeCalendarStub==='function') renderTimeCalendarStub(); } },
      { id:'sid-time-dashboard', label:'Dashboard',    panelId:'panel-time-dashboard',
        onActivate:function(){ if(typeof renderTimeDashboardPanel==='function') renderTimeDashboardPanel(); } },
      { id:'sid-time-reports',   label:'Reports',      panelId:'panel-time-reports',
        onActivate:function(){ if(typeof renderTimeReportsStub==='function') renderTimeReportsStub(); } },
      { id:'sid-time-projects',  label:'Projects',     panelId:'panel-time-projects',
        onActivate:function(){ if(typeof renderTimeProjectsStub==='function') renderTimeProjectsStub(); } },
      { id:'sid-time-tags',      label:'Tags',         panelId:'panel-time-tags',
        onActivate:function(){ if(typeof renderTimeTagsStub==='function') renderTimeTagsStub(); } },
      { id:'sid-time-team',      label:'Team',         panelId:'panel-time-team',
        onActivate:function(){ if(typeof renderTimeTeamStub==='function') renderTimeTeamStub(); } }
    ]
  });

  var collapsed = localStorage.getItem('flowtive_sidebar_members_collapsed') === '1';
  var sec2=document.createElement('div');
  sec2.className='sid-section-toggle'+(collapsed?'':' open');
  sec2.id='sid-members-toggle';
  sec2.style.marginTop='8px';
  sec2.innerHTML =
    '<svg class="sid-sec-chev" viewBox="0 0 10 10" fill="none"><path d="M3.5 2l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
    '<span>Team Members</span>'+
    '<span style="margin-left:auto;font-size:10px;color:var(--hint)">'+MEMBERS.length+'</span>';
  sb.appendChild(sec2);

  var group=document.createElement('div');
  group.className='sid-members-group'+(collapsed?' collapsed':'');
  group.id='sid-members-group';
  sb.appendChild(group);

  sec2.onclick=function(){
    var isOpen = sec2.classList.toggle('open');
    group.classList.toggle('collapsed', !isOpen);
    try{ localStorage.setItem('flowtive_sidebar_members_collapsed', isOpen?'0':'1'); }catch(e){}
  };

  MEMBERS.forEach(function(m,i){
    var isMe=currentUser&&m.name===currentUser.name;
    var item=document.createElement('div');
    item.className='sid-item'+(isMe?' active':'');
    item.id='sid-'+i;
    item.innerHTML=
      (function(){
        var _sImg=loadAvatar(m.name);
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
    item.onclick=function(){
      document.querySelectorAll('.sid-item,.sid-dashboard').forEach(function(s){s.classList.remove('active');});
      document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
      item.classList.add('active');
      document.getElementById('panel-'+i).classList.add('active');
    };
    group.appendChild(item);
  });

  var sec3=document.createElement('div');
  sec3.className='sid-section';sec3.style.marginTop='8px';sec3.textContent='Resources';
  sb.appendChild(sec3);

  var emailItem=document.createElement('div');
  emailItem.className='sid-dashboard';
  emailItem.id='sid-email-templates';
  emailItem.innerHTML=
    '<div class="sid-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="11" height="8" rx="1"/><path d="M2 4l5 4 5-4"/></svg></div>Email Templates';
  emailItem.onclick=function(){ openEmailLibrary(); };
  sb.appendChild(emailItem);

  // Sidebar footer — Start/Stop Work pill + version pill anchored at the bottom
  var footer=document.createElement('div');
  footer.className='sid-footer';
  footer.innerHTML='<button class="clock-btn" onclick="toggleClock()" type="button" title="Track Your Work Time">'
    +'<span class="clock-btn-icon"></span>'
    +'<span class="clock-btn-label-text">Start Work</span>'
    +'</button>'
    +'<button class="sid-version" onclick="openWhatsNew()" type="button" title="What\'s new in Flowtive One">'
    +'  v'+(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?')
    +'</button>';
  sb.appendChild(footer);
  // Sync button to current state
  if(typeof renderClockButton === 'function') renderClockButton();
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
function buildSidebarGroup(sb, cfg){
  var openByDefault = true;
  var stored = null;
  try{ stored = localStorage.getItem(cfg.storageKey); }catch(e){}
  var isOpen = stored === null ? openByDefault : stored === '1';

  // Group header (clickable)
  var header = document.createElement('div');
  header.className = 'sid-group-head' + (isOpen ? ' open' : '');
  header.id = 'sid-group-head-' + cfg.id;
  header.innerHTML =
    '<svg class="sid-group-chev" viewBox="0 0 10 10" fill="none"><path d="M3.5 2l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '<div class="sid-icon">' + (cfg.icon || '') + '</div>' +
    '<span class="sid-group-label">' + escapeHtml(cfg.label) + '</span>' +
    (cfg.countId ? '<span class="sid-tasks-count zero" id="' + cfg.countId + '">0</span>' : '');
  sb.appendChild(header);

  // Group body — child items stacked, collapsible via class
  var body = document.createElement('div');
  body.className = 'sid-group-body' + (isOpen ? '' : ' collapsed');
  body.id = 'sid-group-body-' + cfg.id;
  sb.appendChild(body);

  header.onclick = function(){
    var nowOpen = !header.classList.contains('open');
    header.classList.toggle('open', nowOpen);
    body.classList.toggle('collapsed', !nowOpen);
    try{ localStorage.setItem(cfg.storageKey, nowOpen ? '1' : '0'); }catch(e){}
  };

  // Sub-items
  cfg.items.forEach(function(item){
    var sub = document.createElement('div');
    sub.className = 'sid-subitem';
    sub.id = item.id;
    sub.innerHTML = '<span class="sid-subitem-dot"></span>' +
                    '<span class="sid-subitem-label">' + escapeHtml(item.label) + '</span>';
    sub.onclick = function(){
      // Clear active state across all sidebar entries
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

