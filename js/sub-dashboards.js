/* Flowtive One — Sub-page renderers for Tasks Dashboard, Time Tracker
   Dashboard, and the stub pages (Calendar / Reports / Tags / Projects /
   Team) under the new sidebar groups. */

/* ── Tasks Dashboard ──────────────────────────────────────────────
   Team-wide overview: status counts, overdue, this-week-done, busiest
   member, status-stack chart, top overdue list. Reads from tasksData. */
function renderTasksDashboardPanel(){
  var body = document.getElementById('tasks-dashboard-body');
  if(!body) return;
  var all = (typeof tasksData === 'object' && tasksData) ? Object.values(tasksData).filter(Boolean) : [];
  var now = Date.now();
  var weekStart = startOfWeek(now);

  // Top KPI cards
  var openCount    = all.filter(function(t){ return t.status !== 'done'; }).length;
  var overdueCount = all.filter(function(t){ return t.status !== 'done' && t.dueDate && t.dueDate < now; }).length;
  var doneThisWeek = all.filter(function(t){ return t.status === 'done' && t.completedAt && t.completedAt >= weekStart; }).length;
  var totalCount   = all.length;

  // Status breakdown
  var statusCounts = {todo:0, in_progress:0, review:0, done:0};
  all.forEach(function(t){ if(statusCounts.hasOwnProperty(t.status)) statusCounts[t.status]++; });
  var statusTotal = all.length || 1;

  // Per-member breakdown (assignees)
  var memberRows = MEMBERS.map(function(m){
    var mine = all.filter(function(t){ return t.assignee === m.name; });
    return {
      member: m,
      total:  mine.length,
      open:   mine.filter(function(t){ return t.status !== 'done'; }).length,
      overdue:mine.filter(function(t){ return t.status !== 'done' && t.dueDate && t.dueDate < now; }).length,
      done:   mine.filter(function(t){ return t.status === 'done' && t.completedAt && t.completedAt >= weekStart; }).length
    };
  }).filter(function(r){ return r.total > 0; })
    .sort(function(a,b){ return b.open - a.open; });

  // Top overdue tasks
  var topOverdue = all
    .filter(function(t){ return t.status !== 'done' && t.dueDate && t.dueDate < now; })
    .sort(function(a,b){ return a.dueDate - b.dueDate; })
    .slice(0, 5);

  body.innerHTML = ''
    + renderKPIRow([
        { label:'Open Tasks',       value: openCount,    tone:'primary' },
        { label:'Overdue',          value: overdueCount, tone:overdueCount>0 ? 'danger' : 'neutral' },
        { label:'Done This Week',   value: doneThisWeek, tone:'success' },
        { label:'Total Tasks',      value: totalCount,   tone:'neutral' }
      ])
    + '<div class="td-grid">'
    +   '<div class="td-card">'
    +     '<div class="td-card-head"><span class="td-card-title">Status Breakdown</span><span class="td-card-sub">'+all.length+' tasks</span></div>'
    +     renderStatusBreakdownBar(statusCounts, statusTotal)
    +   '</div>'
    +   '<div class="td-card">'
    +     '<div class="td-card-head"><span class="td-card-title">Top Overdue</span><span class="td-card-sub">'+topOverdue.length+'</span></div>'
    +     renderTopOverdueList(topOverdue, now)
    +   '</div>'
    + '</div>'
    + '<div class="td-card">'
    +   '<div class="td-card-head"><span class="td-card-title">By Team Member</span><span class="td-card-sub">Sorted by open tasks</span></div>'
    +   renderMemberBreakdown(memberRows)
    + '</div>';
}

// Date helper — startOfWeek lives in util.js (centralized)

function renderKPIRow(items){
  var html = '<div class="td-kpi-row">';
  items.forEach(function(it){
    html += '<div class="td-kpi td-kpi-'+(it.tone||'neutral')+'">'
         +    '<div class="td-kpi-value">'+it.value+'</div>'
         +    '<div class="td-kpi-label">'+escapeHtml(it.label)+'</div>'
         +  '</div>';
  });
  html += '</div>';
  return html;
}

function renderStatusBreakdownBar(counts, total){
  var labels = {todo:'To Do', in_progress:'In Progress', review:'Review', done:'Done'};
  var html = '<div class="td-status-stack">';
  ['todo','in_progress','review','done'].forEach(function(s){
    var pct = total ? (counts[s]/total)*100 : 0;
    if(pct > 0){
      html += '<div class="td-status-seg td-status-'+s+'" style="width:'+pct+'%" title="'+labels[s]+': '+counts[s]+'"></div>';
    }
  });
  html += '</div>';
  html += '<div class="td-status-legend">';
  ['todo','in_progress','review','done'].forEach(function(s){
    html += '<div class="td-legend-item"><span class="td-legend-dot td-status-'+s+'"></span>'
         +  '<span class="td-legend-label">'+labels[s]+'</span>'
         +  '<span class="td-legend-count">'+counts[s]+'</span>'
         +  '</div>';
  });
  html += '</div>';
  return html;
}

function renderTopOverdueList(rows, now){
  if(!rows.length){
    return '<div class="td-empty-mini">🎉 Nothing overdue</div>';
  }
  return '<div class="td-overdue-list">' + rows.map(function(t){
    var daysLate = Math.floor((now - t.dueDate) / 86400000);
    var prio = t.priority || 'medium';
    var prioLabel = (typeof taskPriorityLabel === 'function') ? taskPriorityLabel(prio) : prio;
    var dueStr = '';
    try{
      dueStr = new Date(t.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'});
    }catch(e){}
    return '<div class="td-overdue-row" onclick="(typeof openTaskDrawer===\'function\') && openTaskDrawer(\''+t.id+'\')">'
      +    '<div class="td-overdue-title-row">'
      +      '<span class="priority-pill p-'+escapeHtml(prio)+'" style="pointer-events:none">'+escapeHtml(prioLabel)+'</span>'
      +      '<div class="td-overdue-title">'+escapeHtml(t.title||'(Untitled)')+'</div>'
      +    '</div>'
      +    '<div class="td-overdue-meta">'
      +      (t.assignee ? '<span>'+escapeHtml(t.assignee)+'</span> · ' : '')
      +      (dueStr ? '<span>Due '+escapeHtml(dueStr)+'</span> · ' : '')
      +      '<span class="td-overdue-late">'+(daysLate <= 0 ? 'Today' : daysLate+' day'+(daysLate>1?'s':'')+' late')+'</span>'
      +    '</div>'
      +  '</div>';
  }).join('') + '</div>';
}

function renderMemberBreakdown(rows){
  if(!rows.length){
    return '<div class="td-empty-mini">No tasks assigned yet — create one above or press N.</div>';
  }
  var maxOpen = rows.reduce(function(m,r){ return Math.max(m, r.open); }, 1);
  var html = '<div class="td-member-table">';
  html += '<div class="td-member-head">'
       +    '<div>Member</div>'
       +    '<div>Open</div>'
       +    '<div>Overdue</div>'
       +    '<div>Done This Week</div>'
       +    '<div>Total</div>'
       +  '</div>';
  rows.forEach(function(r){
    var img = (typeof loadAvatar==='function') ? loadAvatar(r.member.name) : null;
    var avInner = img ? '<img src="'+img+'" alt="'+escapeHtml(r.member.name)+'">' : escapeHtml(r.member.name.substring(0,2).toUpperCase());
    var avBg = img ? 'transparent' : r.member.color;
    var openPct = (r.open/maxOpen)*100;
    html += '<div class="td-member-row">'
         +    '<div class="td-member-name"><span class="td-member-av" style="background:'+avBg+'">'+avInner+'</span>'+escapeHtml(r.member.name)+'</div>'
         +    '<div class="td-member-cell"><div class="td-member-bar"><div class="td-member-bar-fill" style="width:'+openPct+'%;background:'+r.member.color+'"></div><span>'+r.open+'</span></div></div>'
         +    '<div class="td-member-cell '+(r.overdue>0?'td-cell-warn':'')+'">'+r.overdue+'</div>'
         +    '<div class="td-member-cell td-cell-good">'+r.done+'</div>'
         +    '<div class="td-member-cell">'+r.total+'</div>'
         +  '</div>';
  });
  html += '</div>';
  return html;
}

/* ── Time Tracker Dashboard ───────────────────────────────────────
   Total tracked time, top contributor, weekly chart, top tasks. */
function renderTimeDashboardPanel(){
  var body = document.getElementById('time-dashboard-body');
  if(!body) return;
  var weekStart = startOfWeek(Date.now());

  // Collect this week's tracked time across the team
  // (a) global sessions
  var perMember = {};      // {name: ms}
  var perDay    = {};      // {dayMs: {memberName: ms}}
  var totalMs   = 0;
  var activeNow = 0;

  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || !s.start || !s.user) return;
    var end = s.end || Date.now();
    if(end < weekStart) return;
    var dur = end - Math.max(s.start, weekStart);
    if(dur <= 0) return;
    perMember[s.user] = (perMember[s.user]||0) + dur;
    totalMs += dur;
    // Distribute across days within the week
    for(var d=0; d<7; d++){
      var dayStart = weekStart + d*86400000;
      var dayEnd = dayStart + 86400000;
      var overlap = Math.max(0, Math.min(end, dayEnd) - Math.max(s.start, dayStart));
      if(overlap > 0){
        if(!perDay[dayStart]) perDay[dayStart] = {};
        perDay[dayStart][s.user] = (perDay[dayStart][s.user]||0) + overlap;
      }
    }
  });
  Object.keys(clockActive||{}).forEach(function(name){ if(clockActive[name]) activeNow++; });

  // (b) per-task entries — top tracked tasks
  var perTask = {};      // {taskId: {title, ms}}
  if(typeof tasksData === 'object' && tasksData){
    Object.keys(tasksData).forEach(function(tid){
      var t = tasksData[tid]; if(!t || !t.timeEntries) return;
      Object.values(t.timeEntries).forEach(function(e){
        if(!e || !e.start) return;
        var end = e.end || Date.now();
        if(end < weekStart) return;
        var dur = end - Math.max(e.start, weekStart);
        if(dur <= 0) return;
        if(!perTask[tid]) perTask[tid] = { title: t.title || '(Untitled)', ms: 0 };
        perTask[tid].ms += dur;
      });
    });
  }

  var topMember = Object.keys(perMember).map(function(n){ return {name:n, ms:perMember[n]}; })
                  .sort(function(a,b){ return b.ms - a.ms; })[0] || null;
  var topTasks = Object.values(perTask).sort(function(a,b){ return b.ms - a.ms; }).slice(0,5);

  body.innerHTML = ''
    + renderKPIRow([
        { label:'Total This Week',  value: _fmtHM(totalMs),                    tone:'primary' },
        { label:'Active Right Now', value: activeNow,                          tone:activeNow>0?'success':'neutral' },
        { label:'Top Contributor',  value: topMember ? topMember.name : '—',   tone:'neutral' },
        { label:'Members Tracking', value: Object.keys(perMember).length,      tone:'neutral' }
      ])
    + '<div class="td-card">'
    +   '<div class="td-card-head"><span class="td-card-title">Hours This Week</span><span class="td-card-sub">By day, stacked by member</span></div>'
    +   '<div class="hours-week-chart-wrap"><canvas id="time-week-chart-canvas"></canvas></div>'
    + '</div>'
    + '<div class="td-grid">'
    +   '<div class="td-card">'
    +     '<div class="td-card-head"><span class="td-card-title">Top Tracked Tasks</span><span class="td-card-sub">'+topTasks.length+'</span></div>'
    +     renderTopTasksList(topTasks)
    +   '</div>'
    +   '<div class="td-card">'
    +     '<div class="td-card-head"><span class="td-card-title">By Member</span><span class="td-card-sub">This week</span></div>'
    +     renderTimeMemberBreakdown(perMember)
    +   '</div>'
    + '</div>';

  // Render the weekly chart using Chart.js (already loaded for other charts)
  setTimeout(_renderTimeWeekChart, 0);
}

function _renderTimeWeekChart(){
  var ctx = document.getElementById('time-week-chart-canvas');
  if(!ctx) return;
  // Lazy-load Chart.js — sub-dashboards is itself lazy-loaded, but Chart.js
  // is shared across all chart-using panels and may already be on the page
  // (e.g. if the user landed on the main dashboard first). ensureChartJs
  // dedupes via promise cache.
  if(typeof Chart === 'undefined'){
    ensureChartJs().then(_renderTimeWeekChart);
    return;
  }
  var labels = [];
  var dayStarts = [];
  var weekStart = startOfWeek(Date.now());
  for(var i=0;i<7;i++){
    var d = new Date(weekStart + i*86400000);
    labels.push(d.toLocaleDateString(undefined,{weekday:'short',day:'numeric'}));
    dayStarts.push(weekStart + i*86400000);
  }
  var datasets = MEMBERS.map(function(m){
    var dayHours = new Array(7).fill(0);
    Object.values(clockSessions||{}).forEach(function(s){
      if(!s || s.user !== m.name || !s.start) return;
      var end = s.end || Date.now();
      for(var di=0; di<7; di++){
        var ds = dayStarts[di], de = ds + 86400000;
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
  // GPU buffer reallocation or replaying entry animations.
  if(charts.timeWeek){
    charts.timeWeek.data.labels = labels;
    charts.timeWeek.data.datasets = datasets;
    charts.timeWeek.update('none');
  } else {
    charts.timeWeek = new Chart(ctx,{
      type:'bar',
      data:{ labels: labels, datasets: datasets },
      options:{
        responsive:true, maintainAspectRatio:false,
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

function renderTopTasksList(rows){
  if(!rows.length){
    return '<div class="td-empty-mini">No task time tracked this week — open a task and click ▶ to log time against it.</div>';
  }
  var maxMs = rows[0].ms || 1;
  return '<div class="td-tasks-list">' + rows.map(function(r){
    var pct = (r.ms/maxMs)*100;
    return '<div class="td-tasks-row">'
      +    '<div class="td-tasks-title">'+escapeHtml(r.title)+'</div>'
      +    '<div class="td-tasks-bar"><div class="td-tasks-bar-fill" style="width:'+pct+'%"></div></div>'
      +    '<div class="td-tasks-dur">'+_fmtHM(r.ms)+'</div>'
      +  '</div>';
  }).join('') + '</div>';
}

function renderTimeMemberBreakdown(perMember){
  var entries = Object.keys(perMember).map(function(n){ return {name:n, ms:perMember[n]}; })
                .sort(function(a,b){ return b.ms - a.ms; });
  if(!entries.length){
    return '<div class="td-empty-mini">No time tracked this week — hit Start Work in the sidebar to begin.</div>';
  }
  var maxMs = entries[0].ms || 1;
  return '<div class="td-tasks-list">' + entries.map(function(r){
    var m = membersByName()[r.name] || {color:'#6B7280'};
    var img = (typeof loadAvatar==='function') ? loadAvatar(r.name) : null;
    var avInner = img ? '<img src="'+img+'" alt="'+escapeHtml(r.name)+'">' : escapeHtml(r.name.substring(0,2).toUpperCase());
    var avBg = img ? 'transparent' : m.color;
    var pct = (r.ms/maxMs)*100;
    return '<div class="td-tasks-row">'
      +    '<div class="td-tasks-title"><span class="td-member-av" style="background:'+avBg+'">'+avInner+'</span>'+escapeHtml(r.name)+'</div>'
      +    '<div class="td-tasks-bar"><div class="td-tasks-bar-fill" style="width:'+pct+'%;background:'+m.color+'"></div></div>'
      +    '<div class="td-tasks-dur">'+_fmtHM(r.ms)+'</div>'
      +  '</div>';
  }).join('') + '</div>';
}

function _fmtHM(ms){
  if(!ms || ms <= 0) return '0:00';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  return h + ':' + (m<10?'0'+m:m);
}

