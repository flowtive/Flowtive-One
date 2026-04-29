/* Flowtive One — Time Tracker Reports + CSV export (Phase 4)
   Three views (Summary / Detailed / Weekly) sharing a filter bar +
   date range. Reads clockSessions and tasksData (read-only) — no schema
   changes. CSV exports the active view in RFC 4180 format. */

var _repView          = 'summary';     // 'summary' | 'detailed' | 'weekly'
var _repRange         = 'this_week';   // preset key (or 'custom')
var _repCustomStart   = null;          // ms — set when _repRange === 'custom'
var _repCustomEnd     = null;
var _repFilterMember  = '';            // '' = All
var _repFilterProject = '';            // '' = All  ('__none__' = no project)
var _repFilterTag     = '';            // '' = All  ('__none__' = no tags)
var _repSearch        = '';
var _repGroupBy       = 'project';     // 'member' | 'project' | 'tag' | 'day'
var _repWeekAnchor    = null;          // ms — start of week for Weekly view
var _repSortKey       = 'start';
var _repSortDir       = 'desc';

/* Date helpers — startOfDay / startOfWeek / startOfMonth / startOfYear
   live in util.js (centralized — same Monday-start semantics across the app) */

/* Resolve the active filter range to {start, end} ms. End is exclusive. */
function _repResolveRange(){
  var now = Date.now();
  var today = startOfDay(now);
  var weekStart = startOfWeek(now);
  var monthStart = startOfMonth(now);
  var yearStart  = startOfYear(now);
  switch(_repRange){
    case 'today':       return { start: today, end: today + 86400000 };
    case 'yesterday':   return { start: today - 86400000, end: today };
    case 'this_week':   return { start: weekStart, end: weekStart + 7*86400000 };
    case 'last_week':   return { start: weekStart - 7*86400000, end: weekStart };
    case 'this_month':  return { start: monthStart, end: now + 86400000 };
    case 'last_month':
      var lastMonth = new Date(monthStart); lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { start: lastMonth.getTime(), end: monthStart };
    case 'this_year':   return { start: yearStart, end: now + 86400000 };
    case 'all_time':    return { start: 0, end: now + 86400000 };
    case 'custom':      return { start: _repCustomStart || today, end: (_repCustomEnd || today) + 86400000 };
    default:            return { start: weekStart, end: weekStart + 7*86400000 };
  }
}

function _repRangeLabel(){
  var labels = {
    today:'Today', yesterday:'Yesterday',
    this_week:'This Week', last_week:'Last Week',
    this_month:'This Month', last_month:'Last Month',
    this_year:'This Year', all_time:'All Time', custom:'Custom Range'
  };
  if(_repRange === 'custom' && _repCustomStart && _repCustomEnd){
    var s = new Date(_repCustomStart).toLocaleDateString(undefined,{month:'short',day:'numeric'});
    var e = new Date(_repCustomEnd).toLocaleDateString(undefined,{month:'short',day:'numeric'});
    return s + ' – ' + e;
  }
  return labels[_repRange] || labels.this_week;
}

/* ── Entry collection ──────────────────────────────────────────
   Returns a flat list of entries (global sessions + per-task entries)
   filtered by the active range + member/project/tag/description. Each
   entry: {kind, id, taskId?, user, start, end, durationMs, description,
          projectId, tags, ...}. Per-task entries have empty projectId/tags. */
function _repCollectEntries(rangeOverride){
  var range = rangeOverride || _repResolveRange();
  var rows = [];
  var search = (_repSearch || '').toLowerCase().trim();

  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id];
    if(!s || !s.start || !s.user) return;
    var end = s.end || Date.now();
    if(end <= range.start || s.start >= range.end) return;
    rows.push({
      kind: 'global', id: id, user: s.user,
      start: s.start, end: s.end || null,
      durationMs: getLiveDurationMs(s),
      description: s.description || '',
      projectId: s.projectId || null,
      tags: Array.isArray(s.tags) ? s.tags : []
    });
  });

  if(typeof tasksData === 'object' && tasksData){
    Object.keys(tasksData).forEach(function(tid){
      var t = tasksData[tid]; if(!t || !t.timeEntries) return;
      Object.keys(t.timeEntries).forEach(function(eid){
        var e = t.timeEntries[eid];
        if(!e || !e.start || !e.user) return;
        var end = e.end || Date.now();
        if(end <= range.start || e.start >= range.end) return;
        rows.push({
          kind: 'task', id: eid, taskId: tid, user: e.user,
          start: e.start, end: e.end || null,
          durationMs: getLiveDurationMs(e),
          description: t.title || '(Untitled task)',
          projectId: null, tags: []
        });
      });
    });
  }

  // Apply filters
  rows = rows.filter(function(r){
    if(_repFilterMember && r.user !== _repFilterMember) return false;
    if(_repFilterProject){
      if(_repFilterProject === '__none__'){ if(r.projectId) return false; }
      else if(r.projectId !== _repFilterProject) return false;
    }
    if(_repFilterTag){
      if(_repFilterTag === '__none__'){ if(r.tags && r.tags.length) return false; }
      else if(!r.tags || r.tags.indexOf(_repFilterTag) < 0) return false;
    }
    if(search && (r.description || '').toLowerCase().indexOf(search) < 0) return false;
    return true;
  });

  return rows;
}

/* ── Aggregations ────────────────────────────────────────────── */
function _repTotalMs(rows){
  var sum = 0;
  rows.forEach(function(r){ sum += r.durationMs || 0; });
  return sum;
}

/* Group rows by the chosen dimension. Returns [{key, label, color?, ms, count}]. */
function _repGroup(rows, by){
  var map = {};
  rows.forEach(function(r){
    var key, label, color;
    if(by === 'member'){
      key = r.user || '__none__';
      var m = MEMBERS.find(function(x){ return x.name === r.user; });
      label = key === '__none__' ? 'Unknown' : key;
      color = m ? m.color : '#6B7280';
    } else if(by === 'project'){
      if(!r.projectId){ key = '__none__'; label = 'No project'; color = '#94A3B8'; }
      else {
        key = r.projectId;
        var p = (typeof projectsData !== 'undefined') ? projectsData[r.projectId] : null;
        label = p ? p.name : '(Deleted project)';
        color = p ? p.color : '#94A3B8';
      }
    } else if(by === 'tag'){
      // One row per tag — entries with multiple tags contribute to each.
      // Entries with no tags get bucketed under '__none__'.
      if(!r.tags || !r.tags.length){
        key = '__none__'; label = 'No tags'; color = '#94A3B8';
      } else {
        // Special case: emit one map entry per tag and short-circuit
        r.tags.forEach(function(tid){
          var k = tid;
          var t = (typeof tagsData !== 'undefined') ? tagsData[tid] : null;
          var l = t ? t.name : '(Deleted tag)';
          if(!map[k]) map[k] = {key:k, label:l, color:'#10B981', ms:0, count:0};
          map[k].ms += r.durationMs || 0;
          map[k].count++;
        });
        return;
      }
    } else if(by === 'day'){
      var dayStart = startOfDay(r.start);
      key = String(dayStart);
      label = new Date(dayStart).toLocaleDateString(undefined, {weekday:'short',month:'short',day:'numeric'});
      color = '#10B981';
    } else {
      key = 'all'; label = 'All'; color = '#10B981';
    }
    if(!map[key]) map[key] = {key:key, label:label, color:color, ms:0, count:0};
    map[key].ms += r.durationMs || 0;
    map[key].count++;
  });
  var arr = Object.values(map);
  // Sort: day = chronological; everything else = ms desc
  if(by === 'day') arr.sort(function(a,b){ return Number(a.key) - Number(b.key); });
  else             arr.sort(function(a,b){ return b.ms - a.ms; });
  return arr;
}

/* ── Formatters ──────────────────────────────────────────────── */
function _repFmtHM(ms){
  if(!ms || ms < 0) return '0:00';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  return h + ':' + (m<10?'0'+m:m);
}
function _repFmtHours(ms){
  if(!ms || ms < 0) return '0';
  return (Math.round((ms/3600000) * 100) / 100).toString();
}
function _repFmtClock(ts){
  return new Date(ts).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
}
function _repFmtDate(ts){
  return new Date(ts).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
}
function _repFmtDateTime(ts){
  return new Date(ts).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}

/* ── Main render ─────────────────────────────────────────────── */
function renderTimeReportsPanel(){
  var body = document.getElementById('time-reports-body');
  if(!body) return;

  body.innerHTML = ''
    + _repRenderViewTabs()
    + _repRenderToolbar()
    + '<div id="rep-view-body"></div>';

  // Wire description search
  var srch = document.getElementById('rep-search');
  if(srch){
    srch.value = _repSearch;
    srch.addEventListener('input', function(){
      _repSearch = srch.value;
      _repRenderView();
    });
  }

  _repRenderView();
}

function _repRenderViewTabs(){
  function tab(id, label){
    return '<button class="rep-tab'+(_repView===id?' active':'')+'" onclick="setRepView(\''+id+'\')">'+label+'</button>';
  }
  return '<div class="rep-tabs">'
    + tab('summary','Summary')
    + tab('detailed','Detailed')
    + tab('weekly','Weekly')
    + '</div>';
}

function _repRenderToolbar(){
  var rangeOpts = [
    {v:'today',l:'Today'}, {v:'yesterday',l:'Yesterday'},
    {v:'this_week',l:'This Week'}, {v:'last_week',l:'Last Week'},
    {v:'this_month',l:'This Month'}, {v:'last_month',l:'Last Month'},
    {v:'this_year',l:'This Year'}, {v:'all_time',l:'All Time'},
    {v:'custom',l:'Custom Range…'}
  ];
  var rangeSelect = '<select class="rep-select" id="rep-range" onchange="setRepRange(this.value)">'
    + rangeOpts.map(function(o){ return '<option value="'+o.v+'"'+(_repRange===o.v?' selected':'')+'>'+o.l+'</option>'; }).join('')
    + '</select>';

  var memberOpts = '<option value="">All Members</option>'
    + MEMBERS.map(function(m){ return '<option value="'+escapeHtml(m.name)+'"'+(_repFilterMember===m.name?' selected':'')+'>'+escapeHtml(m.name)+'</option>'; }).join('');

  var projectOpts = '<option value="">All Projects</option>'
    + '<option value="__none__"'+(_repFilterProject==='__none__'?' selected':'')+'>(No project)</option>'
    + Object.values(projectsData||{}).filter(Boolean)
        .sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); })
        .map(function(p){ return '<option value="'+p.id+'"'+(_repFilterProject===p.id?' selected':'')+'>'+escapeHtml(p.name)+'</option>'; }).join('');

  var tagOpts = '<option value="">All Tags</option>'
    + '<option value="__none__"'+(_repFilterTag==='__none__'?' selected':'')+'>(No tags)</option>'
    + Object.values(tagsData||{}).filter(Boolean)
        .sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); })
        .map(function(t){ return '<option value="'+t.id+'"'+(_repFilterTag===t.id?' selected':'')+'>'+escapeHtml(t.name)+'</option>'; }).join('');

  // Group-by only shown for Summary
  var groupByControl = '';
  if(_repView === 'summary'){
    var byOpts = [{v:'project',l:'Project'},{v:'member',l:'Member'},{v:'tag',l:'Tag'},{v:'day',l:'Day'}];
    groupByControl = '<select class="rep-select rep-groupby" onchange="setRepGroupBy(this.value)">'
      + byOpts.map(function(o){ return '<option value="'+o.v+'"'+(_repGroupBy===o.v?' selected':'')+'>Group by: '+o.l+'</option>'; }).join('')
      + '</select>';
  }

  return '<div class="rep-toolbar">'
    + (_repView !== 'weekly' ? rangeSelect : _repWeeklyNav())
    + '<select class="rep-select" onchange="setRepFilterMember(this.value)">'+memberOpts+'</select>'
    + '<select class="rep-select" onchange="setRepFilterProject(this.value)">'+projectOpts+'</select>'
    + '<select class="rep-select" onchange="setRepFilterTag(this.value)">'+tagOpts+'</select>'
    + '<input type="search" class="rep-search" id="rep-search" placeholder="Search description…">'
    + groupByControl
    + '<button class="rep-export-btn" onclick="repExportCSV()" title="Download as CSV">'
    +   '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5v8M3.5 6L7 9.5 10.5 6M2 12.5h10"/></svg>'
    +   '<span>Export CSV</span>'
    + '</button>'
    + '</div>';
}

function _repWeeklyNav(){
  if(_repWeekAnchor === null) _repWeekAnchor = startOfWeek(Date.now());
  var d = new Date(_repWeekAnchor);
  var endD = new Date(_repWeekAnchor + 6*86400000);
  var label = d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' – '
            + endD.toLocaleDateString(undefined,{month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'});
  return '<div class="rep-week-nav">'
    + '<button class="rep-nav-btn" onclick="repWeekNav(\'prev\')" title="Previous week"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 3l-4 4 4 4"/></svg></button>'
    + '<button class="rep-today-btn" onclick="repWeekNav(\'today\')">This Week</button>'
    + '<button class="rep-nav-btn" onclick="repWeekNav(\'next\')" title="Next week"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 3l4 4-4 4"/></svg></button>'
    + '<span class="rep-week-label">'+escapeHtml(label)+'</span>'
    + '</div>';
}

function _repRenderView(){
  var slot = document.getElementById('rep-view-body');
  if(!slot) return;
  if(_repView === 'summary')   slot.innerHTML = _repRenderSummary();
  else if(_repView === 'detailed') slot.innerHTML = _repRenderDetailed();
  else if(_repView === 'weekly')   slot.innerHTML = _repRenderWeekly();
  // Render the chart after innerHTML is in (Chart.js needs the canvas in DOM)
  if(_repView === 'summary') setTimeout(_repRenderSummaryChart, 0);
}

/* ── Summary view ────────────────────────────────────────────── */
function _repRenderSummary(){
  var rows = _repCollectEntries();
  var totalMs = _repTotalMs(rows);
  var groups = _repGroup(rows, _repGroupBy);

  // KPIs
  var range = _repResolveRange();
  var dayCount = Math.max(1, Math.round((range.end - range.start) / 86400000));
  var avgPerDay = totalMs / dayCount;
  var topMember = _repGroup(rows, 'member').slice(0,1)[0];
  var topProject = _repGroup(rows.filter(function(r){return r.projectId;}), 'project').slice(0,1)[0];

  var kpis = [
    {label:'Total Time',     value:_repFmtHM(totalMs)},
    {label:'Avg / Day',      value:_repFmtHM(avgPerDay)},
    {label:'Top Member',     value: topMember  ? topMember.label  : '—'},
    {label:'Top Project',    value: topProject ? topProject.label : '—'}
  ];

  if(!rows.length){
    return _repKpiRow(kpis)
      + '<div class="rep-empty">'
      + '<div class="rep-empty-icon">📊</div>'
      + '<div class="rep-empty-title">No entries match your filters</div>'
      + '<div class="rep-empty-sub">Try a wider date range, or clear filters with the button above.</div>'
      + '<button type="button" class="rep-empty-cta" onclick="setRepRange(\'all_time\')">Show all time</button>'
      + '</div>';
  }

  var maxMs = groups[0] ? groups[0].ms : 0;
  var tableRows = groups.map(function(g){
    var pct = maxMs ? (g.ms/maxMs)*100 : 0;
    return '<tr>'
      + '<td class="rep-cell-label"><span class="rep-cell-dot" style="background:'+g.color+'"></span>'+escapeHtml(g.label)+'</td>'
      + '<td class="rep-cell-num">'+g.count+'</td>'
      + '<td class="rep-cell-num rep-cell-strong">'+_repFmtHM(g.ms)+'</td>'
      + '<td class="rep-cell-bar"><div class="rep-bar-track"><div class="rep-bar-fill" style="width:'+pct+'%;background:'+g.color+'"></div></div></td>'
      + '</tr>';
  }).join('');

  return _repKpiRow(kpis)
    + '<div class="rep-card" id="rep-chart-card">'
    +   '<div class="rep-card-head"><span class="rep-card-title">Hours by Day · Stacked by '+_repGroupByLabel()+'</span><span class="rep-card-sub">'+_repRangeLabel()+'</span></div>'
    +   '<div class="rep-chart-wrap"><canvas id="rep-chart-canvas"></canvas></div>'
    + '</div>'
    + '<div class="rep-card">'
    +   '<div class="rep-card-head">'
    +     '<span class="rep-card-title">By '+_repGroupByLabel()+'</span>'
    +     '<span class="rep-card-sub">'+groups.length+' '+(groups.length===1?'group':'groups')+'</span>'
    +     // Tooltip explaining the multi-bucket math when grouping by tag —
    +     // entries with N tags contribute their full duration to each tag's
    +     // total. So the sum across rows can exceed the grand total.
    +     (_repGroupBy === 'tag' ? '<span class="rep-card-hint" title="Each entry counts toward every tag it has — sum across rows may exceed the grand total.">ⓘ multi-tag</span>' : '')
    +   '</div>'
    +   '<table class="rep-table">'
    +     '<thead><tr><th>'+_repGroupByLabel()+'</th><th class="rep-cell-num">Entries</th><th class="rep-cell-num">Time</th><th></th></tr></thead>'
    +     '<tbody>'+tableRows+'</tbody>'
    +   '</table>'
    + '</div>';
}

function _repGroupByLabel(){
  return {member:'Member', project:'Project', tag:'Tag', day:'Day'}[_repGroupBy] || 'Group';
}

function _repKpiRow(kpis){
  return '<div class="rep-kpi-row">' + kpis.map(function(k){
    return '<div class="rep-kpi"><div class="rep-kpi-value">'+escapeHtml(String(k.value))+'</div><div class="rep-kpi-label">'+escapeHtml(k.label)+'</div></div>';
  }).join('') + '</div>';
}

function _repRenderSummaryChart(){
  var ctx = document.getElementById('rep-chart-canvas');
  if(!ctx || typeof Chart === 'undefined') return;
  if(charts.repSummary){ charts.repSummary.destroy(); }

  var rows = _repCollectEntries();
  var range = _repResolveRange();
  var dayCount = Math.max(1, Math.round((range.end - range.start) / 86400000));

  // Auto-bucket so large ranges stay readable: day → week → month
  // ≤ 31 days = per day, 32–120 = per week, > 120 = per month
  var bucketMode = dayCount <= 31 ? 'day' : (dayCount <= 120 ? 'week' : 'month');
  var buckets = [];   // { start, end, label }
  if(bucketMode === 'day'){
    for(var i=0; i<dayCount; i++){
      var ds = range.start + i*86400000;
      buckets.push({ start: ds, end: ds + 86400000,
        label: new Date(ds).toLocaleDateString(undefined,{month:'short',day:'numeric'}) });
    }
  } else if(bucketMode === 'week'){
    var ws = startOfWeek(new Date(range.start));
    while(ws < range.end){
      var we = ws + 7*86400000;
      buckets.push({ start: ws, end: we,
        label: 'Wk ' + new Date(ws).toLocaleDateString(undefined,{month:'short',day:'numeric'}) });
      ws = we;
    }
  } else { // month
    var d = new Date(range.start);
    var ms = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    while(ms < range.end){
      var nd = new Date(ms);
      var me = new Date(nd.getFullYear(), nd.getMonth()+1, 1).getTime();
      buckets.push({ start: ms, end: me,
        label: nd.toLocaleDateString(undefined,{month:'short',year:'2-digit'}) });
      ms = me;
    }
  }
  var labels = buckets.map(function(b){ return b.label; });
  var bucketCount = buckets.length;

  // Group by chosen dimension to build datasets
  var groups = _repGroup(rows, _repGroupBy);
  var datasets = groups.map(function(g){
    var data = new Array(bucketCount).fill(0);
    rows.forEach(function(r){
      var rGroupKey;
      if(_repGroupBy === 'member')  rGroupKey = r.user;
      else if(_repGroupBy === 'project'){ rGroupKey = r.projectId || '__none__'; }
      else if(_repGroupBy === 'tag'){
        if(!r.tags || !r.tags.length){ rGroupKey = '__none__'; }
        else { /* many groups per row — handled below */ }
      } else if(_repGroupBy === 'day'){ rGroupKey = String(startOfDay(r.start)); }
      // Tag distribution across multiple buckets
      var matches = (_repGroupBy === 'tag' && r.tags && r.tags.length)
        ? (r.tags.indexOf(g.key) >= 0 ? 1 : 0)
        : (rGroupKey === g.key ? 1 : 0);
      if(!matches) return;
      // Distribute the entry's duration across the buckets it covers
      for(var di=0; di<bucketCount; di++){
        var bs = buckets[di].start, be = buckets[di].end;
        var end = r.end || Date.now();
        var overlap = Math.max(0, Math.min(end, be) - Math.max(r.start, bs));
        data[di] += overlap / 3600000;
      }
    });
    return {
      label: g.label,
      data: data.map(function(v){ return Math.round(v*100)/100; }),
      backgroundColor: g.color,
      borderRadius: 4,
      maxBarThickness: 32
    };
  });

  charts.repSummary = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font:{size:11}, boxWidth:10, padding:8, color: themeColor('--text-secondary','#6B7280') } },
        tooltip: { callbacks: { label: function(c){ return c.dataset.label + ': ' + c.parsed.y + 'h'; } } }
      },
      scales: {
        x: { stacked: true, grid: {display:false}, ticks: { font:{size:10}, color: themeColor('--text-secondary','#6B7280') } },
        y: { stacked: true, beginAtZero: true, grid: { color: themeColor('--border-default','#F3F4F6') }, ticks: { font:{size:10}, color: themeColor('--text-tertiary','#9CA3AF'), callback: function(v){ return v+'h'; } } }
      }
    }
  });
}

/* ── Detailed view ───────────────────────────────────────────── */
function _repRenderDetailed(){
  var rows = _repCollectEntries();
  var totalMs = _repTotalMs(rows);

  // Sort
  rows.sort(function(a,b){
    var av, bv;
    switch(_repSortKey){
      case 'description': av=(a.description||'').toLowerCase(); bv=(b.description||'').toLowerCase(); break;
      case 'member':      av=(a.user||'').toLowerCase(); bv=(b.user||'').toLowerCase(); break;
      case 'project':
        var ap = a.projectId && projectsData[a.projectId] ? projectsData[a.projectId].name : '';
        var bp = b.projectId && projectsData[b.projectId] ? projectsData[b.projectId].name : '';
        av = ap.toLowerCase(); bv = bp.toLowerCase(); break;
      case 'duration':    av=a.durationMs||0; bv=b.durationMs||0; break;
      case 'start':
      default:            av=a.start||0; bv=b.start||0;
    }
    if(av < bv) return _repSortDir === 'asc' ? -1 : 1;
    if(av > bv) return _repSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if(!rows.length){
    return _repKpiRow([{label:'Total Entries',value:0},{label:'Total Time',value:'0:00'},{label:'Range',value:_repRangeLabel()}])
      + '<div class="rep-empty">'
      + '<div class="rep-empty-icon">📋</div>'
      + '<div class="rep-empty-title">No entries match your filters</div>'
      + '<div class="rep-empty-sub">Try a wider date range, or clear filters with the button above.</div>'
      + '<button type="button" class="rep-empty-cta" onclick="setRepRange(\'all_time\')">Show all time</button>'
      + '</div>';
  }

  function sortHeader(key, label, numeric){
    var cls = 'rep-th-sort' + (_repSortKey===key ? ' active' : '') + (numeric ? ' rep-cell-num' : '');
    var arrow = _repSortKey===key ? (_repSortDir==='asc' ? ' ↑' : ' ↓') : '';
    return '<th class="'+cls+'" onclick="repToggleSort(\''+key+'\')">'+label+arrow+'</th>';
  }

  var tbody = rows.map(function(r){
    var member = MEMBERS.find(function(m){ return m.name === r.user; });
    var memberColor = member ? member.color : '#6B7280';
    var projectChip = '';
    if(r.projectId && projectsData[r.projectId]){
      var p = projectsData[r.projectId];
      projectChip = '<span class="entry-project-chip"><span class="entry-project-dot" style="background:'+p.color+'"></span>'+escapeHtml(p.name)+'</span>';
    } else if(r.kind === 'task'){
      projectChip = '<span class="rep-task-badge" onclick="(typeof openTaskDrawer===\'function\') && openTaskDrawer(\''+r.taskId+'\')" title="Open task">Task</span>';
    }
    var tagsHtml = '';
    if(r.tags && r.tags.length){
      tagsHtml = r.tags.map(function(tid){
        var t = tagsData[tid];
        return t ? '<span class="entry-tag-pill">'+escapeHtml(t.name)+'</span>' : '';
      }).join('');
    }
    return '<tr>'
      + '<td data-label="Description">'+escapeHtml(r.description||'(no description)')+'</td>'
      + '<td data-label="Member"><span class="rep-member-cell"><span class="rep-member-dot" style="background:'+memberColor+'"></span>'+escapeHtml(r.user||'')+'</span></td>'
      + '<td data-label="Project">'+projectChip+'</td>'
      + '<td data-label="Tags">'+(tagsHtml || '<span class="rep-cell-mute">—</span>')+'</td>'
      + '<td class="rep-cell-num" data-label="Start">'+_repFmtDateTime(r.start)+'</td>'
      + '<td class="rep-cell-num" data-label="End">'+(r.end ? _repFmtClock(r.end) : '<span class="rep-cell-mute">running</span>')+'</td>'
      + '<td class="rep-cell-num rep-cell-strong" data-label="Duration">'+_repFmtHM(r.durationMs)+'</td>'
      + '</tr>';
  }).join('');

  return _repKpiRow([
      {label:'Total Entries', value: rows.length},
      {label:'Total Time',    value: _repFmtHM(totalMs)},
      {label:'Range',         value: _repRangeLabel()},
      {label:'Avg / Entry',   value: _repFmtHM(rows.length ? totalMs / rows.length : 0)}
    ])
    + '<div class="rep-card">'
    +   '<div class="rep-card-head"><span class="rep-card-title">All Entries</span><span class="rep-card-sub">Click a column header to sort</span></div>'
    +   '<div class="rep-table-scroll"><table class="rep-table rep-detailed-table">'
    +     '<thead><tr>'
    +       sortHeader('description','Description')
    +       sortHeader('member','Member')
    +       sortHeader('project','Project')
    +     '<th>Tags</th>'
    +       sortHeader('start','Start',true)
    +     '<th class="rep-cell-num">End</th>'
    +       sortHeader('duration','Duration',true)
    +     '</tr></thead>'
    +     '<tbody>'+tbody+'</tbody>'
    +   '</table></div>'
    + '</div>';
}

/* ── Weekly view ─────────────────────────────────────────────── */
function _repRenderWeekly(){
  if(_repWeekAnchor === null) _repWeekAnchor = startOfWeek(Date.now());
  var range = { start: _repWeekAnchor, end: _repWeekAnchor + 7*86400000 };
  var rows = _repCollectEntries(range);
  var totalMs = _repTotalMs(rows);

  var dayStarts = [];
  var dayLabels = [];
  for(var i=0;i<7;i++){
    var ds = _repWeekAnchor + i*86400000;
    dayStarts.push(ds);
    dayLabels.push(new Date(ds).toLocaleDateString(undefined,{weekday:'short',day:'numeric'}));
  }

  // Build group × day matrix using Group-by setting (default: project)
  var by = _repGroupBy === 'tag' ? 'tag' : (_repGroupBy === 'member' ? 'member' : 'project');
  var groups = _repGroup(rows, by);
  if(!groups.length){
    return _repKpiRow([{label:'Total Time',value:'0:00'},{label:'Range',value:_repRangeLabel()},{label:'Group by',value:_repGroupByLabel()}])
      + '<div class="rep-empty"><div class="rep-empty-icon">📅</div><div class="rep-empty-title">No entries this week</div><div class="rep-empty-sub">Use the navigator above to pick a different week.</div></div>';
  }

  // Build cells: groupKey -> [d0..d6 ms]
  var cells = {};
  groups.forEach(function(g){ cells[g.key] = new Array(7).fill(0); });

  rows.forEach(function(r){
    function bucketsFor(){
      if(by === 'member') return [r.user || '__none__'];
      if(by === 'project') return [r.projectId || '__none__'];
      if(by === 'tag')   return r.tags && r.tags.length ? r.tags.slice() : ['__none__'];
      return ['all'];
    }
    var keys = bucketsFor();
    var end = r.end || Date.now();
    for(var di=0; di<7; di++){
      var ds = dayStarts[di], de = ds + 86400000;
      var overlap = Math.max(0, Math.min(end, de) - Math.max(r.start, ds));
      if(!overlap) continue;
      keys.forEach(function(k){
        if(cells[k] !== undefined) cells[k][di] += overlap;
      });
    }
  });

  // Column totals
  var colTotals = new Array(7).fill(0);
  groups.forEach(function(g){
    cells[g.key].forEach(function(v,i){ colTotals[i] += v; });
  });

  var head = '<tr><th class="rep-week-group-head">'+_repGroupByLabel()+'</th>'
    + dayLabels.map(function(l){ return '<th class="rep-cell-num">'+escapeHtml(l)+'</th>'; }).join('')
    + '<th class="rep-cell-num rep-cell-strong">Total</th></tr>';

  var tbody = groups.map(function(g){
    var row = cells[g.key];
    var rowTotal = row.reduce(function(s,v){ return s+v; }, 0);
    return '<tr>'
      + '<td class="rep-cell-label"><span class="rep-cell-dot" style="background:'+g.color+'"></span>'+escapeHtml(g.label)+'</td>'
      + row.map(function(v){
          return '<td class="rep-cell-num'+(v?'':' rep-cell-mute')+'">'+(v ? _repFmtHM(v) : '–')+'</td>';
        }).join('')
      + '<td class="rep-cell-num rep-cell-strong">'+_repFmtHM(rowTotal)+'</td>'
      + '</tr>';
  }).join('');

  var foot = '<tr class="rep-week-foot"><td>Daily Total</td>'
    + colTotals.map(function(v){ return '<td class="rep-cell-num">'+(v ? _repFmtHM(v) : '–')+'</td>'; }).join('')
    + '<td class="rep-cell-num rep-cell-strong">'+_repFmtHM(totalMs)+'</td>'
    + '</tr>';

  return _repKpiRow([
      {label:'Total Time', value: _repFmtHM(totalMs)},
      {label:'Active Days', value: colTotals.filter(function(v){ return v>0; }).length},
      {label:'Top Day', value: (function(){
          var max = 0, idx = -1;
          colTotals.forEach(function(v,i){ if(v>max){ max=v; idx=i; } });
          return idx>=0 ? new Date(dayStarts[idx]).toLocaleDateString(undefined,{weekday:'short'}) : '—';
        })()},
      {label:'Group by', value: _repGroupByLabel()}
    ])
    + '<div class="rep-card">'
    +   '<div class="rep-card-head"><span class="rep-card-title">Weekly Totals</span><span class="rep-card-sub">Hours per day, by '+_repGroupByLabel()+'</span></div>'
    +   '<div class="rep-table-scroll"><table class="rep-table rep-week-table">'
    +     '<thead>'+head+'</thead>'
    +     '<tbody>'+tbody+'</tbody>'
    +     '<tfoot>'+foot+'</tfoot>'
    +   '</table></div>'
    + '</div>';
}

/* ── State setters (called from inline handlers) ─────────────── */
function setRepView(v){
  _repView = v;
  // For Weekly, ensure groupBy is one of the supported axes (not 'day')
  if(v === 'weekly' && _repGroupBy === 'day') _repGroupBy = 'project';
  renderTimeReportsPanel();
}
function setRepRange(v){
  if(v === 'custom'){
    _repOpenCustomRangeDialog();
    return;
  }
  _repRange = v;
  // Some presets (All Time / This Year / Last Year) reach further back than
  // the live listener's 12-month window. Trigger an on-demand fetch so the
  // older entries appear in the report instead of being silently missing.
  _repEnsureRangeLoaded(_repResolveRange().start);
  renderTimeReportsPanel();
}

/* Make sure clockSessions covers `targetStartMs`. Falls through silently
   when already covered, when offline, or when the helper isn't available
   (legacy load order). Re-renders whichever panel becomes ready. */
function _repEnsureRangeLoaded(targetStartMs){
  if(typeof _clockLoadOlderThan !== 'function') return;
  if(typeof _clockOldestLoaded !== 'number' || targetStartMs >= _clockOldestLoaded) return;
  // Render a small loading hint in the chart area while we fetch
  var card = document.getElementById('rep-chart-card');
  if(card && !card.querySelector('.rep-loading-hint')){
    var hint = document.createElement('div');
    hint.className = 'rep-loading-hint';
    hint.textContent = 'Loading older entries…';
    card.appendChild(hint);
  }
  // M6: race the fetch against a 10s timeout. If we're offline / Firebase
  // is unreachable, _clockLoadOlderThan can resolve silently without any
  // older data ever arriving — leaving the user staring at a near-empty
  // report. Detect that case and show a non-blocking "couldn't load"
  // message (still removable on the next range change).
  var startBound = _clockOldestLoaded;
  var settled = false;
  _clockLoadOlderThan(targetStartMs).then(function(){
    settled = true;
    var h = document.querySelector('.rep-loading-hint');
    if(h) h.remove();
  });
  setTimeout(function(){
    if(settled) return;
    // Still pending after 10s. If _clockOldestLoaded hasn't budged the
    // load truly didn't progress — surface that to the user.
    if(_clockOldestLoaded === startBound){
      var h = document.querySelector('.rep-loading-hint');
      if(h){
        h.textContent = 'Couldn\'t load older entries — check your connection';
        h.classList.add('rep-loading-hint-error');
      }
    }
  }, 10000);
}
function setRepFilterMember(v){ _repFilterMember = v; _repRenderView(); }
function setRepFilterProject(v){ _repFilterProject = v; _repRenderView(); }
function setRepFilterTag(v){ _repFilterTag = v; _repRenderView(); }
function setRepGroupBy(v){ _repGroupBy = v; _repRenderView(); }
function repToggleSort(key){
  if(_repSortKey === key) _repSortDir = (_repSortDir === 'asc' ? 'desc' : 'asc');
  else { _repSortKey = key; _repSortDir = (key === 'description' || key === 'member' || key === 'project') ? 'asc' : 'desc'; }
  _repRenderView();
}
function repWeekNav(dir){
  if(_repWeekAnchor === null) _repWeekAnchor = startOfWeek(Date.now());
  if(dir === 'prev')      _repWeekAnchor -= 7*86400000;
  else if(dir === 'next') _repWeekAnchor += 7*86400000;
  else if(dir === 'today') _repWeekAnchor = startOfWeek(Date.now());
  renderTimeReportsPanel();
}

/* ── Custom range dialog ─────────────────────────────────────── */
function _repOpenCustomRangeDialog(){
  var bd = document.createElement('div');
  bd.className = 'ftc-backdrop';
  function pad(n){ return n<10?'0'+n:''+n; }
  function dateVal(ts){ var d = new Date(ts); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  var start = _repCustomStart || startOfDay(Date.now() - 7*86400000);
  var end   = _repCustomEnd   || startOfDay(Date.now());
  bd.innerHTML =
    '<div class="ftc-modal" role="dialog" aria-modal="true" style="width:min(380px,calc(100vw - 32px))">'
    +  '<div class="ftc-title">Custom Date Range</div>'
    +  '<div class="te-form">'
    +    '<div class="te-grid" style="grid-template-columns:1fr 1fr">'
    +      '<div><label class="te-label">From</label><input type="date" class="te-input" id="rep-custom-from" value="'+dateVal(start)+'"></div>'
    +      '<div><label class="te-label">To</label><input type="date" class="te-input" id="rep-custom-to" value="'+dateVal(end)+'"></div>'
    +    '</div>'
    +  '</div>'
    +  '<div class="ftc-actions">'
    +    '<button class="ftc-btn ftc-cancel" type="button">Cancel</button>'
    +    '<button class="ftc-btn ftc-primary" type="button">Apply</button>'
    +  '</div>'
    +'</div>';
  document.body.appendChild(bd);
  requestAnimationFrame(function(){ bd.classList.add('show'); });
  function cleanup(){
    bd.classList.remove('show');
    setTimeout(function(){ bd.remove(); }, 200);
    // Reset the dropdown if user cancels (stay on the previous range)
    var sel = document.getElementById('rep-range');
    if(sel && _repRange !== 'custom') sel.value = _repRange;
  }
  bd.querySelector('.ftc-cancel').onclick = cleanup;
  bd.querySelector('.ftc-primary').onclick = function(){
    var f = bd.querySelector('#rep-custom-from').value;
    var t = bd.querySelector('#rep-custom-to').value;
    if(!f || !t){ showToast('Pick both dates'); return; }
    var fMs = new Date(f+'T00:00:00').getTime();
    var tMs = new Date(t+'T00:00:00').getTime();
    if(tMs < fMs){ showToast('"To" must be on or after "From"'); return; }
    _repCustomStart = fMs;
    _repCustomEnd   = tMs;
    _repRange = 'custom';
    cleanup();
    _repEnsureRangeLoaded(fMs);
    renderTimeReportsPanel();
  };
  bd.onclick = function(e){ if(e.target === bd) cleanup(); };
}

/* ── CSV export ──────────────────────────────────────────────── */
function _repCSVEscape(v){
  v = (v === null || v === undefined) ? '' : String(v);
  if(/[",\n\r]/.test(v)) return '"' + v.replace(/"/g,'""') + '"';
  return v;
}
function _repCSVDownload(filename, rows){
  var csv = rows.map(function(row){
    return row.map(_repCSVEscape).join(',');
  }).join('\r\n');
  // Add BOM so Excel reads UTF-8 chars cleanly
  var blob = new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
function _repFilenameStub(){
  var range = _repView === 'weekly' ? { start: _repWeekAnchor, end: _repWeekAnchor + 7*86400000 } : _repResolveRange();
  function fmt(ts){ var d = new Date(ts); return d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate(); }
  return 'flowtive-time-' + _repView + '-' + fmt(range.start) + '-' + fmt(range.end - 86400000) + '.csv';
}
function repExportCSV(){
  var fname = _repFilenameStub();
  if(_repView === 'summary'){
    var rows = _repCollectEntries();
    var groups = _repGroup(rows, _repGroupBy);
    var out = [[_repGroupByLabel(), 'Entries', 'Total Hours', 'Total Time']];
    groups.forEach(function(g){
      out.push([g.label, g.count, _repFmtHours(g.ms), _repFmtHM(g.ms)]);
    });
    out.push([]);
    out.push(['Total', rows.length, _repFmtHours(_repTotalMs(rows)), _repFmtHM(_repTotalMs(rows))]);
    _repCSVDownload(fname, out);
  } else if(_repView === 'detailed'){
    var rows2 = _repCollectEntries();
    rows2.sort(function(a,b){ return b.start - a.start; });
    var out2 = [['Description','Member','Project','Tags','Start','End','Duration (hours)','Duration (h:mm)']];
    rows2.forEach(function(r){
      var p = r.projectId && projectsData[r.projectId] ? projectsData[r.projectId].name : (r.kind === 'task' ? '(Task)' : '');
      var tagNames = (r.tags||[]).map(function(tid){ return tagsData[tid] ? tagsData[tid].name : ''; }).filter(Boolean).join('; ');
      out2.push([
        r.description || '',
        r.user || '',
        p,
        tagNames,
        _repFmtDateTime(r.start),
        r.end ? _repFmtDateTime(r.end) : 'running',
        _repFmtHours(r.durationMs),
        _repFmtHM(r.durationMs)
      ]);
    });
    _repCSVDownload(fname, out2);
  } else if(_repView === 'weekly'){
    if(_repWeekAnchor === null) _repWeekAnchor = startOfWeek(Date.now());
    var range3 = { start: _repWeekAnchor, end: _repWeekAnchor + 7*86400000 };
    var rows3 = _repCollectEntries(range3);
    var by = _repGroupBy === 'day' ? 'project' : _repGroupBy;
    var groups3 = _repGroup(rows3, by);
    var dayStarts3 = [];
    var dayLabels3 = [];
    for(var i=0;i<7;i++){
      var ds = _repWeekAnchor + i*86400000;
      dayStarts3.push(ds);
      dayLabels3.push(new Date(ds).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}));
    }
    var head3 = [_repGroupByLabel()].concat(dayLabels3).concat(['Total']);
    var out3 = [head3];
    groups3.forEach(function(g){
      var row = new Array(7).fill(0);
      rows3.forEach(function(r){
        var keys = (by === 'member') ? [r.user || '__none__']
                : (by === 'project') ? [r.projectId || '__none__']
                : (by === 'tag') ? (r.tags && r.tags.length ? r.tags : ['__none__'])
                : ['all'];
        if(keys.indexOf(g.key) < 0) return;
        var end = r.end || Date.now();
        for(var di=0; di<7; di++){
          var dsi = dayStarts3[di], dei = dsi + 86400000;
          row[di] += Math.max(0, Math.min(end, dei) - Math.max(r.start, dsi));
        }
      });
      var rowTotal = row.reduce(function(s,v){return s+v;}, 0);
      out3.push([g.label].concat(row.map(_repFmtHours)).concat([_repFmtHours(rowTotal)]));
    });
    _repCSVDownload(fname, out3);
  }
  showToast('CSV downloaded', 'success');
}
