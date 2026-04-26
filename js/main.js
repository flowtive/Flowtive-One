/* Flowtive One — App entry: buildMain panel container + initApp + session restore */

/* ── Main panels ── */
function buildMain(){
  var main=document.getElementById('main');
  main.innerHTML='';

  // Dashboard
  var dash=document.createElement('div');
  var defaultMiCheck = currentUser ? MEMBERS.findIndex(function(m){return m.name===currentUser.name;}) : -1;
  dash.className='panel'+(defaultMiCheck>=0?'':' active');dash.id='panel-dashboard';
  dash.innerHTML=
    '<div class="dash-title">Team Progress Dashboard</div>'+
    '<div class="dash-sub">Live Overview Of USA State Coverage — Welcome Back, '+( currentUser?currentUser.name:'')+'</div>'+
    '<div class="otc-card" id="otc-card"><div class="otc-head"><div class="otc-pulse"></div><div class="otc-title">Working Now</div></div><div class="otc-list" id="otc-list"></div></div>'+
    '<div class="kpi-grid">'+
      '<div class="kpi-card kpi-strip-brand"><div class="kpi-label">Total Cities</div><div class="kpi-num" id="kpi-total">—</div><div class="kpi-sub">All Members &amp; Industries</div></div>'+
      '<div class="kpi-card kpi-strip-success"><div class="kpi-label">States Covered</div><div class="kpi-num" style="color:var(--success)" id="kpi-done">0</div><div class="kpi-sub">All Cities Ticked</div><div class="kpi-bar"><div class="kpi-bar-fill" id="kpi-done-bar" style="background:var(--success);width:0%"></div></div></div>'+
      '<div class="kpi-card kpi-strip-warning"><div class="kpi-label">Hot Cities Done</div><div class="kpi-num" style="color:var(--warning)" id="kpi-hot">0</div><div class="kpi-sub">Priority 1 Cities</div></div>'+
      '<div class="kpi-card kpi-strip-info"><div class="kpi-label">Overall Completion</div><div class="kpi-num" style="color:var(--info)" id="kpi-pct">0%</div><div class="kpi-sub">Of Total USA Coverage</div></div>'+
    '</div>'+
    '<div class="charts-grid">'+
      /* Row 1: bar + donut side by side on desktop, stacked on mobile */
      '<div class="chart-card" id="card-bar"><div class="chart-title">States Covered Per Person</div><div class="bar-chart-wrap"><canvas id="bar-chart-canvas"></canvas></div></div>'+
      '<div class="chart-card" id="card-donut"><div class="chart-title">Coverage Distribution</div><div class="donut-wrap"><div class="donut-canvas-wrap"><canvas id="donut-chart"></canvas></div><div class="donut-legend" id="donut-legend"></div></div></div>'+
      /* Row 2: weekly progress — full width */
      '<div class="chart-card chart-full" id="card-weekly"><div class="chart-title">Weekly Progress <span class="chart-title-sub">(Last 7 Days)</span></div><div class="weekly-chart-wrap"><canvas id="weekly-chart-canvas"></canvas></div></div>'+
      /* Row 2.5: hours this week — full width */
      '<div class="chart-card chart-full" id="card-hours-week"><div class="chart-title">Hours This Week <span class="chart-title-sub">(Last 7 Days, Per Member)</span></div><div class="hours-week-chart-wrap"><canvas id="hours-week-chart-canvas"></canvas></div></div>'+
      /* Row 3: leaderboard + activity side by side on desktop, stacked on mobile */
      '<div class="chart-card" id="card-leaderboard" style="overflow:hidden"><div class="chart-title">Team Leaderboard</div><div class="leaderboard" id="leaderboard"></div></div>'+
      '<div class="chart-card" id="card-activity" style="overflow:hidden"><div class="chart-title">Recent Activity</div><div class="activity-list" id="activity-list" style="max-height:340px;overflow-y:auto"></div></div>'+
      /* Row 4: industry progress — full width */
      '<div class="chart-card chart-full" id="card-industry"><div class="chart-title">Industry Coverage Progress</div><div class="ind-prog-grid" id="ind-progress-grid"></div></div>'+
    '</div>';
  main.appendChild(dash);

  // Tasks panel container (rendered on demand by renderTasksPanel)
  var tasksPanel=document.createElement('div');
  tasksPanel.className='panel';
  tasksPanel.id='panel-tasks';
  tasksPanel.innerHTML='<div class="dash-title">Tasks</div><div class="dash-sub">Team-wide task board · drag cards on the board to change status.</div><div id="tasks-panel-body"></div>';
  main.appendChild(tasksPanel);

  // Member panels — open logged-in user's panel by default
  var defaultMi = currentUser ? MEMBERS.findIndex(function(m){return m.name===currentUser.name;}) : -1;

  MEMBERS.forEach(function(m,mi){
    var isMe=currentUser&&m.name===currentUser.name;
    var panel=document.createElement('div');
    panel.className='panel'+(isMe&&defaultMi>=0?' active':'');
    panel.id='panel-'+mi;
    panel.innerHTML=
      '<div class="page-header">'+
        '<div class="page-title">'+
          (function(){
          var ptImg = loadAvatar(m.name);
          var ptContent = ptImg ? '<img src="'+ptImg+'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block" alt="'+m.name+'">' : m.name.substring(0,2).toUpperCase();
          var ptBg = ptImg ? 'transparent' : m.color;
          var ptClick = isMe ? ' onclick="document.getElementById(\'pt-upload-'+mi+'\').click()" title="Click to change your avatar" style="cursor:pointer"' : '';
          return '<div class="av-wrap" id="pt-av-'+mi+'" style="width:32px;height:32px;border-radius:50%;background:'+ptBg+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff"'+ptClick+'>'+ptContent+(isMe?'<div class="av-upload-hint">Edit</div><input type="file" id="pt-upload-'+mi+'" class="av-input" accept="image/*" onchange="handleMemberAvatarUpload(this,\''+m.name+'\')">':'')+ '</div>';
        })()+
          m.name+"'s USA State Guide"+(isMe?'<span class="my-tag">You</span>':'')+
        '</div>'+
        '<div class="page-sub">'+m.inds.join(' · ')+' · All 50 States · City-Level Tracking · Changes Sync Live</div>'+
      '</div>'+
      '<div class="tip-bar"><strong>How to use:</strong> Expand a state to see its cities, then tick each city once you have found leads from it. '+(isMe?'Your ticks are automatically saved under your name.':'You are viewing '+m.name+"'s progress. You can only tick cities on your own page.")+' Start from Hot states.</div>'+
      '<div class="stats-row" id="stats-'+mi+'"></div>';

    var indGridWrap=document.createElement('div');
    indGridWrap.className='ind-grid-wrap';
    m.inds.forEach(function(ind,indIdx){
      var states=getAllStatesForInd(ind);
      var block=document.createElement('div');block.className='ind-block';
      var head=document.createElement('div');head.className='ind-head';
      head.style.borderLeft='3px solid '+m.color;
      // Compute real done/total at render time so placeholder is never wrong
      var _indDone=0,_indTotal=0;
      states.forEach(function(s){
        _indDone+=countCitiesDoneForState(ind,s.state);
        _indTotal+=(STATE_CITIES[s.state]||[]).length;
      });
      head.innerHTML=
        '<span class="ind-name">'+ind+'</span>'+
        '<div class="ind-meta">'+
          '<button class="email-btn" onclick="event.stopPropagation();openEmailModal(\''+ind.replace(/'/g,"\\'")+'\', true)" type="button" title="Email templates for '+ind+'">'+
            '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="11" height="8" rx="1"/><path d="M2 4l5 4 5-4"/></svg>'+
            'Emails'+
          '</button>'+
          '<span class="ind-prog-text" id="prog-'+mi+'-'+indIdx+'">'+_indDone+'/'+_indTotal+' cities</span>'+
          '<svg class="chevron" id="chev-'+mi+'-'+indIdx+'" viewBox="0 0 16 16" fill="none"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'+
        '</div>';
      head.onclick=function(){
        var tbl=document.getElementById('tbl-'+mi+'-'+indIdx);
        var chev=document.getElementById('chev-'+mi+'-'+indIdx);
        if(tbl) tbl.style.display=(tbl.style.display==='none'||tbl.style.display==='')?'block':'none';
        if(chev) chev.classList.toggle('open');
      };
      block.appendChild(head);

      var tbl=document.createElement('div');tbl.className='states-list';tbl.id='tbl-'+mi+'-'+indIdx;
      states.forEach(function(s){
        var state=s.state;
        var cities=STATE_CITIES[state]||[];
        var safeInd=ind.replace(/[^a-zA-Z]/g,'');
        var safeState=state.replace(/[^a-zA-Z]/g,'_');
        var stateId='st-'+mi+'-'+safeInd+'-'+safeState;
        var doneCities=countCitiesDoneForState(ind,state);
        var totalCities=cities.length;
        var pct=totalCities>0?Math.round(doneCities/totalCities*100):0;
        var badge=s.priority===1?'<span class="pri-badge p1">Hot</span>':s.priority===2?'<span class="pri-badge p2">Strong</span>':'<span class="pri-badge p3">Good</span>';

        var stateBlock=document.createElement('div');
        stateBlock.style.borderBottom='1px solid var(--border)';

        // Compute state status from city statuses
        var allCityStatuses=cities.map(function(c){ return statusData['status::'+ind+'::'+state+'::'+c]||'todo'; });
        var stateStatusBadge='';
        if(cities.length>0 && allCityStatuses.every(function(s){return s==='finished';})){
          stateStatusBadge='<span class="state-status-badge ssb-finished">✓ Completed</span>';
        } else if(allCityStatuses.some(function(s){return s==='progress'||s==='finished';})){
          stateStatusBadge='<span class="state-status-badge ssb-progress">● In Progress</span>';
        }

        var stateHead=document.createElement('div');
        stateHead.className='state-row-head';
        stateHead.innerHTML=
          '<svg class="state-chevron" id="schev-'+stateId+'" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'+
          '<span class="state-row-name">'+state+'</span>'+
          '<span class="state-badge-wrap" id="state-status-'+stateId+'">'+badge+stateStatusBadge+'</span>'+
          '<div class="state-prog-bar-wrap"><div class="state-prog-bar" id="spbar-'+mi+'-'+safeInd+'-'+safeState+'" style="width:'+pct+'%;background:'+m.color+'"></div></div>'+
          '<span class="state-prog-text" id="sptext-'+mi+'-'+safeInd+'-'+safeState+'">'+doneCities+'/'+totalCities+'</span>';
        stateHead.onclick=function(){
          var cw=document.getElementById('cities-'+stateId);
          var ch=document.getElementById('schev-'+stateId);
          if(cw){cw.classList.toggle('open');}
          if(ch){ch.classList.toggle('open');}
        };
        stateBlock.appendChild(stateHead);

        // Cities grid
        var citiesWrap=document.createElement('div');
        citiesWrap.className='cities-wrap';
        citiesWrap.id='cities-'+stateId;

        // Column headers
        var citiesHeader=document.createElement('div');
        citiesHeader.className='cities-header';
        citiesHeader.innerHTML=
          '<span class="ch-num">#</span>'+
          '<span class="ch-cb"></span>'+
          '<span class="ch-city">City</span>'+
          '<span class="ch-keyword">Search Keyword</span>'+
          '<span class="ch-doneby" style="width:108px">Status</span>'+
          '<span class="ch-doneby">Done By</span>';
        citiesWrap.appendChild(citiesHeader);

        var citiesGrid=document.createElement('div');
        citiesGrid.className='cities-grid';

        cities.forEach(function(city,cityIdx){
          var cityKey=mi+'-'+safeInd+'-'+safeState+'-'+city.replace(/[^a-zA-Z]/g,'_');
          var done=isCityDone(ind,state,city);
          var by=getCityDoneBy(ind,state,city);
          var byMember=by?MEMBERS.find(function(mm){return mm.name===by;}):null;
          var byColor=byMember?byMember.color:'#888';
          var canTick=isMe&&(!done||(done&&by===m.name));
          var cbClass='cb'+(done?' on':'')+(canTick?'':' locked');

          var keyword=getSearchKeyword(ind,state,city);
          var noteKey='note::'+ind+'::'+state+'::'+city;
          var hasNote=!!(notesData[noteKey]);
          var statusKey='status::'+ind+'::'+state+'::'+city;
          var cityStatus=statusData[statusKey]||'todo';
          var cityRow=document.createElement('div');
          cityRow.className='city-row';
          cityRow.id='cityrow-'+cityKey;
          cityRow.innerHTML=
            '<span class="city-num">'+(cityIdx+1)+'</span>'+
            '<div class="'+cbClass+'" id="ccb-'+cityKey+'" '+
              (canTick?'onclick="toggleCity('+mi+',\''+ind.replace(/'/g,"\\'")+'\',\''+state.replace(/'/g,"\\'")+'\',\''+city.replace(/'/g,"\\'")+'\','+indIdx+')"':'')+'>'+  // Fix 7: escape apostrophes
              '<div class="ck"></div></div>'+
            '<span class="city-name"'+(done?' style="text-decoration:line-through;color:var(--hint)"':'')+'>'+city+'</span>'+
            '<span class="city-keyword-wrap">'+
              '<span class="city-keyword">'+keyword+'</span>'+
              '<button class="copy-icon-btn" id="copybtn-'+cityKey+'" onclick="copyKeyword(this,\''+keyword.replace(/'/g,"\\'")+'\')" type="button" title="Copy to clipboard">'+
                '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'+
              '</button>'+
              '<button class="note-btn'+(hasNote?' has-note':'')+'" id="notebtn-'+cityKey+'" onclick="openNoteModal(\''+ind.replace(/'/g,"\\'")+ '\',\''+state.replace(/'/g,"\\'")+'\',\''+city.replace(/'/g,"\\'")+'\')" type="button" title="'+(hasNote?'View/edit note':'Add note')+'">'+
                '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2h8v7l-2 2H2V2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 5h4M4 7h2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>'+
              '</button>'+
            '</span>'+
            '<span style="width:108px;flex-shrink:0">'+
              (isMe
                ? '<select class="status-select s-'+cityStatus+'" id="status-'+cityKey+'" onchange="setCityStatus(\''+ind.replace(/'/g,"\\'")+'\',\''+state.replace(/'/g,"\\'")+'\',\''+city.replace(/'/g,"\\'")+'\','+mi+','+indIdx+',this)">'+
                    '<option value="todo"'+(cityStatus==='todo'?' selected':'')+'>To Do</option>'+
                    '<option value="progress"'+(cityStatus==='progress'?' selected':'')+'>In Progress</option>'+
                    '<option value="finished"'+(cityStatus==='finished'?' selected':'')+'>Finished</option>'+
                  '</select>'
                : '<span class="status-select s-'+cityStatus+'" style="display:inline-flex;align-items:center;pointer-events:none">'+
                    (cityStatus==='todo'?'To Do':cityStatus==='progress'?'In Progress':'Finished')+
                  '</span>')+
            '</span>'+
            (by?'<span class="city-done-by" id="cby-'+cityKey+'">'+
              (function(){
                var img=loadAvatar(by);
                return img
                  ?'<img src="'+img+'" style="width:16px;height:16px;border-radius:50%;object-fit:cover" alt="'+by+'">'+by
                  :'<div style="width:16px;height:16px;border-radius:50%;background:'+byColor+';display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">'+by.substring(0,2).toUpperCase()+'</div>'+by;
              })()+
            '</span>':'<span class="city-done-by" id="cby-'+cityKey+'"></span>');
          citiesGrid.appendChild(cityRow);
        });

        citiesWrap.appendChild(citiesGrid);
        stateBlock.appendChild(citiesWrap);
        tbl.appendChild(stateBlock);
      });
      block.appendChild(tbl);indGridWrap.appendChild(block);
      updateIndProgress(mi,ind,indIdx);
    });
    panel.appendChild(indGridWrap);
    main.appendChild(panel);updateStats(mi);
  });

  // Fix dashboard to be active if no user match
  var pdash = document.getElementById('panel-dashboard');
  var sdash = document.getElementById('sid-dashboard');
  if(defaultMi<0){
    if(pdash) pdash.classList.add('active');
  } else {
    if(pdash) pdash.classList.remove('active');
    if(sdash) sdash.classList.remove('active');
  }
}


async function initApp(){
  if(appInitialized)return;
  appInitialized=true;
  initFirebase();
  await loadData();
  buildSidebar();
  buildMain();
  updateSidebarCounts();
  buildDashboard();
  applyAvatarsEverywhere();
  subscribeActivity();
  subscribeRealtime();
  initPresence();
  subscribePresence();
  // Fallback polling only used when Firebase is not available
  if(!firebaseReady){
    setInterval(function(){
      var stored = localStorage.getItem('flowtive_usa_state_v6');
      if(!stored) return;
      try{
        var fresh = JSON.parse(stored);
        if(JSON.stringify(fresh) !== JSON.stringify(doneData)){
          doneData = fresh;
          loadExtras();
          searchIndex = [];
          buildSidebar(); buildMain(); updateSidebarCounts();
          if(document.getElementById('panel-dashboard').classList.contains('active')) buildDashboard();
        }
      }catch(e){}
    },3000);
  }
}


window.addEventListener('load', function(){
  var stored = localStorage.getItem('flowtive_user');
  if(stored){
    try{
      currentUser = JSON.parse(stored);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').classList.remove('app-hidden');
      var m = MEMBERS.find(function(m){ return m.name === currentUser.name; });
      var color = m ? m.color : '#406093';
      var _pillImg2 = loadAvatar(currentUser.name);
      var _pillEl2 = document.getElementById('user-pill-av');
      if(_pillImg2){ _pillEl2.innerHTML='<img src="'+_pillImg2+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:block" alt="'+currentUser.name+'">'; _pillEl2.style.background='transparent'; }
      else { _pillEl2.style.background=color; _pillEl2.textContent=currentUser.name.substring(0,2).toUpperCase(); }
      document.getElementById('user-pill-name').textContent = currentUser.name;
      startClock();
      initApp().then(function(){ applyAvatarsEverywhere(); subscribeClock(); subscribeTasks(); }); // Fix 4: apply avatars after restore
      if(typeof requestNotificationPermission === 'function') requestNotificationPermission();
    }catch(e){ localStorage.removeItem('flowtive_user'); }
  }
});



