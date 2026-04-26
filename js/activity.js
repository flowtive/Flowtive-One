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
    _activityShowCount = 20; // Reset pagination on fresh data
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
  }, function(err){
    console.warn('Firebase read error:', err.message);
  });
}


/* ── Activity feed renderer ── */
var _activityShowCount = 20; // Fix 16: Track how many entries to show

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
    } else {
      text='<strong>'+entry.who+'</strong> updated '+loc+' '+indBadge;
    }
    var timeStr=formatTimeAgo(entry.ts);

    var item=document.createElement('div');
    item.className='activity-item';
    item.innerHTML=
      '<div style="width:26px;height:26px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-top:1px">'+avHtml+'</div>'+
      '<div class="activity-body">'+
        '<div class="activity-text">'+text+'</div>'+
        '<div class="activity-time">'+timeStr+'</div>'+
      '</div>';
    el.appendChild(item);
  });

  // Fix 16: Show "Load more" button if there are more entries
  if(activityLog.length > _activityShowCount){
    var remaining = activityLog.length - _activityShowCount;
    var moreBtn = document.createElement('button');
    moreBtn.style.cssText='display:block;width:100%;margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-surface);font-size:12px;color:var(--blue);font-weight:500;cursor:pointer;font-family:inherit;transition:background 0.15s';
    moreBtn.textContent='Show '+Math.min(remaining, 20)+' more ('+remaining+' remaining)';
    moreBtn.onmouseenter=function(){ this.style.background='var(--blue-light)'; };
    moreBtn.onmouseleave=function(){ this.style.background='var(--bg-surface)'; };
    moreBtn.onclick=function(){
      _activityShowCount += 20;
      buildActivityFeed();
    };
    el.appendChild(moreBtn);
  } else if(_activityShowCount > 20){
    // Show "Collapse" option when expanded
    var colBtn = document.createElement('button');
    colBtn.style.cssText='display:block;width:100%;margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-surface);font-size:12px;color:var(--muted);font-weight:500;cursor:pointer;font-family:inherit;transition:background 0.15s';
    colBtn.textContent='Show less';
    colBtn.onmouseenter=function(){ this.style.background='var(--off)'; };
    colBtn.onmouseleave=function(){ this.style.background='var(--bg-surface)'; };
    colBtn.onclick=function(){
      _activityShowCount = 20;
      buildActivityFeed();
    };
    el.appendChild(colBtn);
  }
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

