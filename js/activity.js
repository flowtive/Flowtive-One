/* Flowtive One — Activity log writer, real-time listener, and feed renderer */

/* ── Firebase activity: write ── */
function logActivity(who, type, ind, state, city, meta){
  var entry = {who:who, type:type, ind:ind, state:state, city:city||null, ts:Date.now()};
  if(meta) Object.keys(meta).forEach(function(k){ entry[k]=meta[k]; });

  if(firebaseReady){
    // Push to shared Firebase path — all team members will see this
    firebaseDb.ref('flowtive_activity').push(entry).catch(function(e){
      console.warn('Firebase write failed, falling back to local:', e.message);
      _logActivityLocal(entry);
    });
    // Firebase listener will update activityLog automatically via subscribeActivity()
  } else {
    // Fallback: local only
    _logActivityLocal(entry);
    buildActivityFeed();
  }
}

function _logActivityLocal(entry){
  activityLog.unshift(entry);
  if(activityLog.length > 100) activityLog = activityLog.slice(0,100);
  saveExtras();
}

/* ── Firebase activity: listen (real-time) ── */
var _activityFirstLoad = true;
var _activitySeenMaxTs = 0;

function subscribeActivity(){
  if(!firebaseReady) return;
  if(_activityListener) return; // already subscribed

  // Listen to the last 100 entries, ordered by timestamp
  var ref = firebaseDb.ref('flowtive_activity').orderByChild('ts').limitToLast(100);
  _activityListener = ref.on('value', function(snapshot){
    var entries = [];
    snapshot.forEach(function(child){
      entries.push(child.val());
    });
    entries.sort(function(a,b){ return b.ts - a.ts; });
    activityLog = entries;
    _activityShowCount = 10;
    try{ localStorage.setItem('flowtive_activity_fallback', JSON.stringify(activityLog.slice(0,100))); }catch(e){}
    if(document.getElementById('panel-dashboard') &&
       document.getElementById('panel-dashboard').classList.contains('active')){
      buildActivityFeed();
    }
    if(document.getElementById('weekly-chart-canvas') &&
       document.getElementById('panel-dashboard') &&
       document.getElementById('panel-dashboard').classList.contains('active')){
      buildWeeklyChart();
    }
    // Fire browser notifications for new activity (skip the initial load
    // so we don't spam the user with all 100 historical entries on login).
    var maxTs = 0;
    entries.forEach(function(e){ if(e && e.ts > maxTs) maxTs = e.ts; });
    if(!_activityFirstLoad){
      entries.forEach(function(e){
        if(e && e.ts > _activitySeenMaxTs){
          maybeNotifyActivityEvent(e);
        }
      });
    }
    _activitySeenMaxTs = maxTs;
    _activityFirstLoad = false;
  }, function(err){
    console.warn('Firebase read error:', err.message);
  });
}

/* ── Browser notifications ──
   Three event types worth interrupting for: someone assigned you a task,
   someone commented on your task, someone completed a task you assigned.
   The user can mute these in-app via the bell button in the sidebar footer. */
var NOTIFS_MUTED_KEY = 'flowtive_notifications_muted';
function isNotificationsMuted(){
  try{ return localStorage.getItem(NOTIFS_MUTED_KEY) === '1'; }catch(e){ return false; }
}
function setNotificationsMuted(v){
  try{ localStorage.setItem(NOTIFS_MUTED_KEY, v ? '1' : '0'); }catch(e){}
}

/* Wired to the sidebar bell button. Toggles mute state, prompts for browser
   permission if we're enabling and permission hasn't been asked yet, and
   re-renders the button + shows a toast. */
function toggleNotifications(){
  var nowMuted = !isNotificationsMuted();
  setNotificationsMuted(nowMuted);

  // If unmuting and we never asked for permission, ask now
  if(!nowMuted && typeof Notification !== 'undefined' && Notification.permission === 'default'){
    if(typeof requestNotificationPermission === 'function') requestNotificationPermission();
  }

  // Refresh the bell's visual state + tooltip
  var btn = document.getElementById('sid-notifs-btn');
  if(btn){
    btn.classList.toggle('muted', nowMuted);
    btn.title = nowMuted ? 'Notifications muted — click to enable' : 'Notifications on — click to mute';
  }

  if(typeof showToast === 'function'){
    showToast(nowMuted ? 'Notifications muted' : 'Notifications enabled', nowMuted ? '#475569' : '#3AC284');
  }
}

function maybeNotifyActivityEvent(entry){
  if(!entry || !currentUser) return;
  if(entry.who === currentUser.name) return;            // never notify yourself
  if(typeof Notification === 'undefined') return;       // unsupported browser
  if(Notification.permission !== 'granted') return;
  if(isNotificationsMuted()) return;                    // user opted out via the bell button
  if(document.hidden === false && document.hasFocus && document.hasFocus()){
    // Tab is focused — user already sees the activity feed update; skip noise
    // EXCEPT for direct mentions (assigned/commented) which deserve a ping
    if(entry.type !== 'task_assign' && entry.type !== 'task_comment'){
      // task_create + assigned-to-me also worth notifying
      if(!(entry.type === 'task_create' && entry.assignee === currentUser.name)) return;
    }
  }

  var title = '', body = '', taskId = entry.taskId || null;
  var t = taskId && typeof tasksData !== 'undefined' ? tasksData[taskId] : null;

  // @mention takes priority over generic comment notification — louder signal
  var mentionedMe = entry.type === 'task_comment' && entry.mentions
                    && Array.isArray(entry.mentions)
                    && entry.mentions.indexOf(currentUser.name) >= 0;

  if(mentionedMe){
    title = entry.who + ' mentioned you';
    body  = entry.title ? 'In: '+entry.title : '';
  } else if(entry.type === 'task_assign' && entry.toAssignee === currentUser.name){
    title = entry.who + ' assigned you a task';
    body  = entry.title || '';
  } else if(entry.type === 'task_create' && entry.assignee === currentUser.name){
    title = entry.who + ' assigned you a new task';
    body  = entry.title || '';
  } else if(entry.type === 'task_comment' && t && t.assignee === currentUser.name){
    title = entry.who + ' commented on your task';
    body  = entry.title || '';
  } else if(entry.type === 'task_status' && entry.toStatus === 'done'
            && t && t.createdBy === currentUser.name && t.assignee !== currentUser.name){
    title = entry.who + ' completed a task you created';
    body  = entry.title || '';
  } else {
    return;
  }

  try{
    var n = new Notification('Flowtive · '+title, {
      body: body,
      tag: 'flowtive-'+(taskId||entry.ts),  // collapses duplicate notifications
      silent: false
    });
    n.onclick = function(){
      window.focus();
      if(taskId && typeof openTaskDrawer === 'function'){
        // Switch to Tasks panel first if needed
        if(typeof switchPanel === 'function') switchPanel('tasks');
        openTaskDrawer(taskId);
      }
      n.close();
    };
    setTimeout(function(){ try{ n.close(); }catch(e){} }, 8000);
  }catch(e){
    // Some browsers (Safari) restrict Notification constructor under cross-origin
    console.warn('Notification failed:', e.message);
  }
}

/* Ask for notification permission once after login. We don't pester — if user
   says "Block" or "Default", we just don't notify. */
function requestNotificationPermission(){
  if(typeof Notification === 'undefined') return;
  if(Notification.permission === 'default'){
    // Wait a beat after login so the prompt doesn't crowd the initial UI
    setTimeout(function(){
      try{ Notification.requestPermission(); }catch(e){}
    }, 1500);
  }
}


/* ── Activity feed renderer ── */
var _activityShowCount = 10; // Fixed cap: 10 most recent entries (no pagination)

function buildActivityFeed(){
  var el=document.getElementById('activity-list');
  if(!el) return;
  if(!activityLog.length){
    el.innerHTML='<div class="activity-empty">No activity yet — start ticking cities!</div>';
    return;
  }
  var show=activityLog.slice(0, _activityShowCount);
  el.innerHTML='';
  show.forEach(function(entry){
    var mem=MEMBERS.find(function(m){return m.name===entry.who;})||{name:entry.who,color:'#888'};
    var img=loadAvatar(mem.name);
    var avHtml=img
      ?'<img src="'+img+'" style="width:26px;height:26px;border-radius:50%;object-fit:cover" alt="'+mem.name+'">'
      :'<div class="activity-av" style="background:'+mem.color+'">'+mem.name.substring(0,2).toUpperCase()+'</div>';

    var typeLabel='', badgeClass='', text='';
    var loc = entry.city ? '<strong>'+entry.city+', '+entry.state+'</strong>' : '<strong>'+entry.state+'</strong>';
    var indBadge = '<span class="activity-badge act-ind">'+entry.ind+'</span>';

    function statusLabel(s){
      return s==='todo'?'To Do': s==='progress'?'In Progress':'Finished';
    }
    function statusPill(s){
      var cls = s==='todo'?'act-status-todo': s==='progress'?'act-status-progress':'act-status-finished';
      return '<span class="activity-badge '+cls+'">'+statusLabel(s)+'</span>';
    }

    if(entry.type==='tick'){
      badgeClass='act-tick';
      text='<strong>'+entry.who+'</strong> marked '+loc+' as Completed '+indBadge;
    } else if(entry.type==='untick'){
      badgeClass='act-untick';
      text='<strong>'+entry.who+'</strong> marked '+loc+' as Incomplete '+indBadge;
    } else if(entry.type==='status_change'){
      badgeClass='act-status';
      var from = entry.fromStatus||'todo';
      var to   = entry.toStatus||'todo';
      text='<strong>'+entry.who+'</strong> updated '+loc+' status '+statusPill(from)+' → '+statusPill(to)+' '+indBadge;
    } else if(entry.type==='note'){
      badgeClass='act-note';
      text='<strong>'+entry.who+'</strong> added a note on '+loc+' '+indBadge;
    } else if(entry.type==='claim'){
      badgeClass='act-claim';
      text='<strong>'+entry.who+'</strong> claimed '+loc+' '+indBadge;
    } else if(entry.type==='unclaim'){
      badgeClass='act-unclaim';
      text='<strong>'+entry.who+'</strong> released claim on '+loc+' '+indBadge;
    } else if(entry.type==='email_edit' || entry.type==='email_copy'){
      var emailNum = (entry.emailIdx!=null ? entry.emailIdx+1 : 1);
      var dayStr = entry.emailDay ? ' Day '+entry.emailDay : '';
      var isEdit = entry.type==='email_edit';
      var actionPill = '<span class="activity-badge '+(isEdit?'act-email-edit':'act-email-copy')+'">'+(isEdit?'Edited':'Copied')+'</span>';
      text='<strong>'+entry.who+'</strong> '+(isEdit?'edited':'copied')+' <strong>Email '+emailNum+dayStr+'</strong> '+actionPill+' '+indBadge;
    } else if(entry.type==='clock_in'){
      text='<strong>'+entry.who+'</strong> Started Work <span class="activity-badge act-clock-in">▶ Active</span>';
    } else if(entry.type==='clock_out'){
      var dur = entry.durationMs ? fmtElapsed(entry.durationMs) : '';
      text='<strong>'+entry.who+'</strong> Stopped Work <span class="activity-badge act-clock-out">■ '+(dur||'Ended')+'</span>';
    } else if(entry.type==='clock_auto'){
      var durA = entry.durationMs ? fmtElapsed(entry.durationMs) : '';
      text='<strong>'+entry.who+"</strong>'s Work Session Auto-Stopped After 16h <span class=\"activity-badge act-clock-auto\">"+(durA||'Auto')+'</span>';
    } else if(entry.type==='task_create'){
      var assignText = entry.assignee ? ' to <strong>'+escapeHtml(entry.assignee)+'</strong>' : '';
      text='<strong>'+entry.who+'</strong> Created Task <strong>"'+escapeHtml(entry.title||'')+'"</strong>'+assignText+' <span class="activity-badge act-task-create">+ Task</span>';
    } else if(entry.type==='task_status'){
      var fromS = taskStatusLabel(entry.fromStatus); var toS = taskStatusLabel(entry.toStatus);
      var pillCls = entry.toStatus==='done' ? 'act-task-complete' : 'act-task-status';
      text='<strong>'+entry.who+'</strong> Moved <strong>"'+escapeHtml(entry.title||'')+'"</strong> '+fromS+' → '+toS+' <span class="activity-badge '+pillCls+'">'+toS+'</span>';
    } else if(entry.type==='task_assign'){
      var to = entry.toAssignee ? '<strong>'+escapeHtml(entry.toAssignee)+'</strong>' : '<em>Unassigned</em>';
      text='<strong>'+entry.who+'</strong> Assigned <strong>"'+escapeHtml(entry.title||'')+'"</strong> To '+to+' <span class="activity-badge act-task-assign">Assigned</span>';
    } else if(entry.type==='task_delete'){
      text='<strong>'+entry.who+'</strong> Deleted Task <strong>"'+escapeHtml(entry.title||'')+'"</strong> <span class="activity-badge act-task-delete">Deleted</span>';
    } else if(entry.type==='task_comment'){
      text='<strong>'+entry.who+'</strong> Commented on <strong>"'+escapeHtml(entry.title||'')+'"</strong> <span class="activity-badge act-task-comment">💬 Comment</span>';
    } else {
      text='<strong>'+entry.who+'</strong> updated '+loc+' '+indBadge;
    }
    var timeStr=formatTimeAgo(entry.ts);
    var absTimeStr = '';
    try{
      absTimeStr = new Date(entry.ts).toLocaleString(undefined, {
        weekday:'short', month:'short', day:'numeric',
        hour:'numeric', minute:'2-digit'
      });
    }catch(e){ absTimeStr = ''; }

    var item=document.createElement('div');
    item.className='activity-item';
    item.innerHTML=
      '<div style="width:26px;height:26px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-top:1px">'+avHtml+'</div>'+
      '<div class="activity-body">'+
        '<div class="activity-text">'+text+'</div>'+
        '<div class="activity-time" title="'+escapeHtml(absTimeStr)+'">'+timeStr+'</div>'+
      '</div>';
    el.appendChild(item);
  });
}


/* ── Weekly Progress Chart ── */
function buildWeeklyChart(){
  var ctx=document.getElementById('weekly-chart-canvas');
  if(!ctx) return;
  if(charts.weekly){ charts.weekly.destroy(); }

  // Responsive height
  var isMobile = window.innerWidth < 640;
  var wrapEl = ctx.parentElement;
  if(wrapEl) wrapEl.style.height = isMobile ? '160px' : '180px';

  // Build last 7 day labels
  var labels=[];
  var now=new Date();
  for(var i=6;i>=0;i--){
    var d=new Date(now);
    d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
  }

  // Count activity per member per day
  var datasets=MEMBERS.map(function(m){
    var dayCounts=new Array(7).fill(0);
    activityLog.forEach(function(e){
      if(e.who!==m.name||e.type!=='tick') return;
      var d=new Date(e.ts);
      for(var i=0;i<7;i++){
        var ref=new Date(now);
        ref.setDate(ref.getDate()-(6-i));
        if(d.getFullYear()===ref.getFullYear()&&d.getMonth()===ref.getMonth()&&d.getDate()===ref.getDate()){
          dayCounts[i]++;
        }
      }
    });
    return{
      label:m.name,
      data:dayCounts,
      borderColor:m.color,
      backgroundColor:m.color+'33',
      tension:0.3,
      fill:false,
      pointBackgroundColor:m.color,
      pointRadius:4,
      borderWidth:2
    };
  });

  charts.weekly=new Chart(ctx,{
    type:'line',
    data:{labels:labels,datasets:datasets},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11},padding:12,color:themeColor('--text-secondary','#6B7280')}},tooltip:{mode:'index',intersect:false}},
      scales:{
        y:{beginAtZero:true,grid:{color:themeColor('--border-default','#F3F4F6')},ticks:{color:themeColor('--text-tertiary','#9CA3AF'),font:{size:11},stepSize:1}},
        x:{grid:{display:false},ticks:{color:themeColor('--text-secondary','#6B7280'),font:{size:10},maxRotation:30}}
      }
    }
  });
}

// Close search when clicking outside
document.addEventListener('click', function(e){
  var wrap = document.getElementById('search-wrap');
  if(wrap && !wrap.contains(e.target)) closeSearchResults();
});

// Rebuild charts on resize/orientation change so mobile ↔ desktop transitions work
var _resizeTimer;
window.addEventListener('resize', function(){
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function(){
    if(document.getElementById('panel-dashboard') &&
       document.getElementById('panel-dashboard').classList.contains('active')){
      buildDashboard();
    }
  }, 200);
});

