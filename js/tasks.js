/* Flowtive One — Tasks: panel, list/board views, CRUD, drag-drop, drawer */

/* ── Tasks ─────────────────────────────────────────────────────── */
var tasksData = {};                    // {id: task}
var _tasksSubscribed = false;
var TASK_STATUSES = [
  {v:'todo',         l:'To Do'},
  {v:'in_progress',  l:'In Progress'},
  {v:'review',       l:'Review'},
  {v:'done',         l:'Done'}
];
var TASK_PRIORITIES = [
  {v:'low',     l:'Low'},
  {v:'medium',  l:'Medium'},
  {v:'high',    l:'High'},
  {v:'urgent',  l:'Urgent'}
];
var _taskView   = 'list';      // 'list' | 'board'
var _taskFilter = 'all';       // 'all' | 'mine' | 'overdue' | 'open' | 'done'
var _taskSearch = '';
var _taskSort   = 'smart';     // 'smart' | 'newest' | 'oldest' | 'due' | 'priority' | 'alpha'
var _taskGroup  = false;       // group list view by date bucket
var _drawerTaskId = null;

function subscribeTasks(){
  if(!firebaseReady || _tasksSubscribed) return;
  _tasksSubscribed = true;
  firebaseDb.ref('flowtive_tasks').on('value', function(snap){
    tasksData = snap.val() || {};
    autoCloseStaleTaskTimer();
    updateSidebarTasksCount();
    var panel = document.getElementById('panel-tasks');
    if(panel && panel.classList.contains('active')){
      // If the panel hasn't been built yet (no toolbar exists), build it.
      // Otherwise refresh only the task area so search input keeps focus.
      if(!document.getElementById('tasks-area')) renderTasksPanel();
      else renderTasksArea();
    }
    // If the drawer is open, refresh the live sections (subtasks/comments)
    // without rebuilding inputs that the user may be typing in.
    // If the open task was deleted by a teammate, close the drawer.
    if(_drawerTaskId){
      if(tasksData[_drawerTaskId]) refreshDrawerLiveSections(tasksData[_drawerTaskId]);
      else { showToast('Task was deleted'); closeTaskDrawer(); }
    }
  });
}
function unsubscribeTasks(){
  if(firebaseReady && firebaseDb){ try{ firebaseDb.ref('flowtive_tasks').off(); }catch(e){} }
  _tasksSubscribed = false;
  tasksData = {};
}

function updateSidebarTasksCount(){
  var el = document.getElementById('sid-tasks-count');
  if(!el || !currentUser) return;
  var n = Object.values(tasksData).filter(function(t){
    return t && t.assignee === currentUser.name && t.status !== 'done';
  }).length;
  el.textContent = n;
  el.classList.toggle('zero', n === 0);
}

function fmtDueLabel(ts){
  if(!ts) return '';
  var d = new Date(ts); d.setHours(0,0,0,0);
  var today = new Date(); today.setHours(0,0,0,0);
  var diff = Math.round((d - today) / 86400000);
  if(diff === 0) return 'Today';
  if(diff === 1) return 'Tomorrow';
  if(diff === -1) return 'Yesterday';
  if(diff > 1 && diff < 7) return d.toLocaleDateString(undefined, {weekday:'short'});
  return d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
}
function dueClass(ts, status){
  if(!ts || status === 'done') return '';
  var d = new Date(ts); d.setHours(0,0,0,0);
  var today = new Date(); today.setHours(0,0,0,0);
  if(d < today) return 'overdue';
  if(d.getTime() === today.getTime()) return 'today';
  return '';
}

function taskStatusLabel(v){
  var s = TASK_STATUSES.find(function(x){return x.v===v;}); return s ? s.l : v;
}
function taskPriorityLabel(v){
  var p = TASK_PRIORITIES.find(function(x){return x.v===v;}); return p ? p.l : v;
}

function getFilteredTasks(){
  var arr = Object.values(tasksData).filter(Boolean);
  // Search
  if(_taskSearch){
    var q = _taskSearch.toLowerCase();
    arr = arr.filter(function(t){
      return (t.title||'').toLowerCase().indexOf(q) >= 0 ||
             (t.description||'').toLowerCase().indexOf(q) >= 0;
    });
  }
  // Filter chip
  if(_taskFilter === 'mine'){
    arr = arr.filter(function(t){ return currentUser && t.assignee === currentUser.name; });
  } else if(_taskFilter === 'overdue'){
    var now = Date.now();
    arr = arr.filter(function(t){ return t.status !== 'done' && t.dueDate && t.dueDate < now; });
  } else if(_taskFilter === 'open'){
    arr = arr.filter(function(t){ return t.status !== 'done'; });
  } else if(_taskFilter === 'done'){
    arr = arr.filter(function(t){ return t.status === 'done'; });
  }
  return arr;
}

function renderTasksPanel(){
  var body = document.getElementById('tasks-panel-body');
  if(!body) return;
  body.innerHTML = renderTasksToolbar() + renderQuickAdd() + '<div id="tasks-area"></div>';
  renderTasksArea();
  if(typeof renderClockButton === 'function') renderClockButton();
  // Wire search (re-renders only the area so the input keeps focus)
  var searchEl = document.getElementById('tasks-search');
  if(searchEl){
    searchEl.addEventListener('input', function(e){
      _taskSearch = e.target.value;
      renderTasksArea();
    });
  }
  // Wire quick-add (Enter to create)
  var qa = document.getElementById('tasks-quick-add');
  if(qa){
    qa.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && qa.value.trim()){
        e.preventDefault();
        createTask({title: qa.value.trim()});
        qa.value = '';
        showToast('Task added', '#3AC284');
      }
    });
  }
}

/* Compute counts for filter chip badges so users see at-a-glance numbers. */
function getTaskCounts(){
  var all = Object.values(tasksData||{}).filter(Boolean);
  var now = Date.now();
  var me = currentUser ? currentUser.name : null;
  return {
    all:     all.length,
    mine:    all.filter(function(t){ return me && t.assignee === me; }).length,
    open:    all.filter(function(t){ return t.status !== 'done'; }).length,
    overdue: all.filter(function(t){ return t.status !== 'done' && t.dueDate && t.dueDate < now; }).length,
    done:    all.filter(function(t){ return t.status === 'done'; }).length
  };
}

function renderTasksToolbar(){
  var counts = getTaskCounts();
  var labels = {all:'All', mine:'My Tasks', open:'Open', overdue:'Overdue', done:'Done'};
  var sortLabels = {smart:'Smart', newest:'Newest', oldest:'Oldest', due:'Due Date', priority:'Priority', alpha:'A → Z'};
  var html = '<div class="tasks-toolbar">';
  html +=   '<input type="search" class="tasks-search" id="tasks-search" placeholder="Search tasks…" value="'+escapeHtml(_taskSearch)+'">';
  html +=   '<div class="task-filter-chips">';
  ['all','mine','open','overdue','done'].forEach(function(f){
    html += '<button class="'+(_taskFilter===f?'active':'')+'" onclick="setTaskFilter(\''+f+'\')">'
         +    labels[f]+' <span class="chip-count">'+counts[f]+'</span>'
         +  '</button>';
  });
  html +=   '</div>';
  // Sort dropdown — list-only useful, but offered everywhere for consistency.
  html +=   '<div class="task-sort">'
       +      '<select id="tasks-sort" title="Sort tasks" onchange="setTaskSort(this.value)">';
  Object.keys(sortLabels).forEach(function(k){
    html +=     '<option value="'+k+'"'+(_taskSort===k?' selected':'')+'>Sort: '+sortLabels[k]+'</option>';
  });
  html +=     '</select>'
       +    '</div>';
  // Group-by-date toggle (list only — board already groups by status)
  if(_taskView === 'list'){
    html += '<button class="task-group-btn'+(_taskGroup?' active':'')+'" title="Group by due date" onclick="toggleTaskGroup()">'
         +    '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 3h10M2 7h7M2 11h10"/></svg>'
         +    'Group'
         +  '</button>';
  }
  html +=   '<div class="view-toggle">';
  html +=     '<button class="'+(_taskView==='list'?'active':'')+'" onclick="setTaskView(\'list\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h10M2 7h10M2 10h10"/></svg>List</button>';
  html +=     '<button class="'+(_taskView==='board'?'active':'')+'" onclick="setTaskView(\'board\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="1.5" width="3.5" height="11" rx="0.5"/><rect x="6.5" y="1.5" width="3.5" height="7" rx="0.5"/><rect x="11" y="1.5" width="1.5" height="9" rx="0.5"/></svg>Board</button>';
  html +=   '</div>';
  html +=   '<button class="btn-new-task" onclick="openTaskDrawerForNew()"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>New Task</button>';
  html += '</div>';
  return html;
}

function setTaskSort(v){ _taskSort = v; renderTasksArea(); }
function toggleTaskGroup(){ _taskGroup = !_taskGroup; renderTasksPanel(); }

/* Quick-add: type → Enter → task created. The fastest path to capture an idea. */
function renderQuickAdd(){
  return '<div class="task-quick-add">'
    +    '<svg class="task-quick-add-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>'
    +    '<input type="text" class="task-quick-add-input" id="tasks-quick-add" placeholder="Add a task and press Enter…" autocomplete="off">'
    +    '<kbd class="task-quick-add-hint">Enter</kbd>'
    +  '</div>';
}

function renderTasksArea(){
  var area = document.getElementById('tasks-area');
  if(!area) return;
  var tasks = getFilteredTasks();
  area.innerHTML = (_taskView === 'list')
    ? renderTaskList(tasks)
    : renderTaskBoard(tasks);
}

function setTaskView(v){ _taskView = v; renderTasksPanel(); }
function setTaskFilter(f){ _taskFilter = f; renderTasksPanel(); }

/* Sort tasks by the chosen mode. Smart = incomplete first by priority/due,
   Newest/Oldest = createdAt, Due = dueDate (no-due last), Priority,
   Alpha = title A→Z. */
function sortTasks(tasks, mode){
  var prioWeight = {urgent:4, high:3, medium:2, low:1};
  var arr = tasks.slice();
  switch(mode){
    case 'newest':
      arr.sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); }); break;
    case 'oldest':
      arr.sort(function(a,b){ return (a.createdAt||0) - (b.createdAt||0); }); break;
    case 'due':
      arr.sort(function(a,b){
        if(!a.dueDate && !b.dueDate) return (b.createdAt||0) - (a.createdAt||0);
        if(!a.dueDate) return 1;
        if(!b.dueDate) return -1;
        return a.dueDate - b.dueDate;
      }); break;
    case 'priority':
      arr.sort(function(a,b){
        var ap = prioWeight[a.priority]||0, bp = prioWeight[b.priority]||0;
        if(ap !== bp) return bp - ap;
        return (b.createdAt||0) - (a.createdAt||0);
      }); break;
    case 'alpha':
      arr.sort(function(a,b){ return (a.title||'').localeCompare(b.title||''); }); break;
    case 'smart':
    default:
      arr.sort(function(a,b){
        var ad = a.status==='done' ? 1 : 0;
        var bd = b.status==='done' ? 1 : 0;
        if(ad !== bd) return ad - bd;
        var ap = prioWeight[a.priority]||0, bp = prioWeight[b.priority]||0;
        if(ap !== bp) return bp - ap;
        if(a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
        if(a.dueDate) return -1;
        if(b.dueDate) return 1;
        return (b.createdAt||0) - (a.createdAt||0);
      });
  }
  return arr;
}

/* Bucket tasks into time-based groups for the optional Group-by-date list. */
function groupTasksByDate(tasks){
  var now = new Date(); now.setHours(0,0,0,0);
  var todayMs = now.getTime();
  var tomMs = todayMs + 86400000;
  var weekEnd = todayMs + 7*86400000;
  var buckets = {overdue:[], today:[], tomorrow:[], week:[], later:[], none:[], done:[]};
  tasks.forEach(function(t){
    if(t.status === 'done'){ buckets.done.push(t); return; }
    if(!t.dueDate){ buckets.none.push(t); return; }
    var d = new Date(t.dueDate); d.setHours(0,0,0,0);
    var dms = d.getTime();
    if(dms < todayMs) buckets.overdue.push(t);
    else if(dms === todayMs) buckets.today.push(t);
    else if(dms === tomMs) buckets.tomorrow.push(t);
    else if(dms < weekEnd) buckets.week.push(t);
    else buckets.later.push(t);
  });
  return buckets;
}

function renderTaskList(tasks){
  if(!tasks.length){
    return emptyTaskState();
  }
  tasks = sortTasks(tasks, _taskSort);

  // Grouped (by due date bucket)
  if(_taskGroup){
    var b = groupTasksByDate(tasks);
    var groupOrder = [
      {k:'overdue',  l:'Overdue',     cls:'g-overdue'},
      {k:'today',    l:'Today',       cls:'g-today'},
      {k:'tomorrow', l:'Tomorrow',    cls:'g-tomorrow'},
      {k:'week',     l:'This Week',   cls:'g-week'},
      {k:'later',    l:'Later',       cls:'g-later'},
      {k:'none',     l:'No Due Date', cls:'g-none'},
      {k:'done',     l:'Done',        cls:'g-done'}
    ];
    var html = '';
    groupOrder.forEach(function(g){
      var rows = b[g.k];
      if(!rows.length) return;
      html += '<div class="task-group '+g.cls+'">'
           +    '<div class="task-group-head"><span class="task-group-name">'+g.l+'</span><span class="task-group-count">'+rows.length+'</span></div>'
           +    '<div class="task-list">'
           +      taskListHeadHtml()
           +      rows.map(renderTaskRow).join('')
           +    '</div>'
           +  '</div>';
    });
    return html;
  }

  // Flat (no grouping)
  var html = '<div class="task-list">';
  html += taskListHeadHtml();
  tasks.forEach(function(t){
    html += renderTaskRow(t);
  });
  html += '</div>';
  return html;
}

function taskListHeadHtml(){
  return '<div class="task-list-head">'
    +      '<div></div>'
    +      '<div>Title</div>'
    +      '<div>Status</div>'
    +      '<div>Priority</div>'
    +      '<div>Assignee</div>'
    +      '<div>Due</div>'
    +      '<div></div>'
    +    '</div>';
}

function renderTaskRow(t){
  var doneClass = t.status==='done' ? 'done' : '';
  var assignee = t.assignee
    ? renderTaskAssignee(t.assignee, t.id)
    : '<span class="task-assignee unassigned clickable" onclick="event.stopPropagation();openAssigneePicker(\''+t.id+'\', this)"><span class="av-mini">?</span>Unassigned</span>';
  var due = t.dueDate
    ? '<span class="task-due clickable '+dueClass(t.dueDate,t.status)+'" onclick="event.stopPropagation();openDuePicker(\''+t.id+'\', this)">'+fmtDueLabel(t.dueDate)+'</span>'
    : '<span class="task-due task-due-empty clickable" onclick="event.stopPropagation();openDuePicker(\''+t.id+'\', this)">Set date</span>';
  // Subtask progress badge ("3/5") if task has subtasks
  var subProg = subtaskProgress(t);
  var subBadge = subProg
    ? '<span class="subtask-progress'+(subProg.done===subProg.total?' complete':'')+'" title="'+subProg.done+' of '+subProg.total+' subtasks done">'
       + '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6M2 6.5h4M2 9h6"/><path d="M9 7l1.2 1.2L12 6.4"/></svg>'
       + subProg.done+'/'+subProg.total
       + '</span>'
    : '';
  return '<div class="task-row '+doneClass+'" data-id="'+t.id+'" onclick="openTaskDrawer(\''+t.id+'\')">'
    +    '<div class="task-checkbox-cell"><div class="task-cb '+(t.status==='done'?'on':'')+'" onclick="event.stopPropagation();toggleTaskDone(\''+t.id+'\')"></div></div>'
    +    '<div class="task-title-cell">'
    +      '<div class="task-title-row">'
    +        (t.recurrence ? '<span class="task-recurring-ico" title="Repeats: '+escapeHtml(shortRecurrenceLabel(t.recurrence))+'"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5a4 4 0 0 1 7-2.5L10 4M10 7a4 4 0 0 1-7 2.5L2 8"/><path d="M10 1.5V4H7.5M2 10.5V8h2.5"/></svg></span>' : '')
    +        '<div class="task-title" title="Double-click to rename" ondblclick="event.stopPropagation();editTaskTitleInline(\''+t.id+'\', this)">'+escapeHtml(t.title||'(Untitled)')+'</div>'
    +        subBadge
    +        renderTaskTimePill(t)
    +      '</div>'
    +      (t.description?'<div class="task-title-sub">'+escapeHtml(richHtmlToText(t.description).substring(0,80))+'</div>':'')
    +    '</div>'
    +    '<div class="task-meta-cell"><span class="status-pill s-'+t.status+' clickable" onclick="event.stopPropagation();openStatusPicker(\''+t.id+'\', this)">'+taskStatusLabel(t.status)+'</span></div>'
    +    '<div class="task-meta-cell"><span class="priority-pill p-'+t.priority+' clickable" onclick="event.stopPropagation();openPriorityPicker(\''+t.id+'\', this)">'+taskPriorityLabel(t.priority)+'</span></div>'
    +    '<div class="task-meta-cell">'+assignee+'</div>'
    +    '<div class="task-meta-cell">'+due+'</div>'
    +    '<div class="task-row-actions">'
    +      '<button title="Delete" onclick="event.stopPropagation();confirmDeleteTask(\''+t.id+'\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg></button>'
    +    '</div>'
    +  '</div>';
}

/* Returns {done, total} for a task's subtasks, or null if none. */
function subtaskProgress(t){
  if(!t || !t.subtasks) return null;
  var arr = Object.values(t.subtasks).filter(Boolean);
  if(!arr.length) return null;
  return { total: arr.length, done: arr.filter(function(s){return s.done;}).length };
}

/* Compact Start/Stop time pill — always shown in row title cell + kanban-card-meta
   so a user can start tracking from any task without opening the modal. Shows
   the live total when running or completed, or "0m" placeholder when fresh. */
function renderTaskTimePill(t){
  if(!t || !currentUser) return '';
  var name = currentUser.name;
  var myActive = !!(t.activeTimers && t.activeTimers[name]);
  var liveMs = getTaskLiveMs(t, name);
  var icon = myActive
    ? '<svg viewBox="0 0 12 12" fill="currentColor"><rect x="3" y="3" width="6" height="6" rx="0.5"/></svg>'
    : '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M3.5 2v8l6-4z"/></svg>';
  var title = myActive ? 'Click to stop tracking' : (liveMs > 0 ? 'Click to resume tracking' : 'Click to start tracking time');
  var label = liveMs > 0 ? fmtElapsed(liveMs) : '0m';
  var emptyCls = (!myActive && liveMs === 0) ? ' empty' : '';
  return '<span class="task-time-pill'+(myActive?' running':'')+emptyCls+'" data-task-id="'+t.id+'" title="'+title+'" onclick="event.stopPropagation();toggleTaskTimer(\''+t.id+'\')">'
    +    icon
    +    '<span class="task-time-val">'+label+'</span>'
    +  '</span>';
}

function renderTaskAssignee(name, taskId){
  var m = MEMBERS.find(function(x){return x.name===name;}) || {name:name, color:'#6B7280'};
  var img = (typeof loadAvatar==='function') ? loadAvatar(name) : null;
  var inner = img ? '<img src="'+img+'" alt="'+escapeHtml(name)+'">' : escapeHtml(name.substring(0,2).toUpperCase());
  var bg = img ? 'transparent' : m.color;
  // If a taskId is passed, render as a clickable picker trigger.
  var clickAttrs = taskId
    ? ' class="task-assignee clickable" onclick="event.stopPropagation();openAssigneePicker(\''+taskId+'\', this)"'
    : ' class="task-assignee"';
  return '<span'+clickAttrs+'><span class="av-mini" style="background:'+bg+'">'+inner+'</span>'+escapeHtml(name)+'</span>';
}

function renderTaskBoard(tasks){
  if(!tasks.length){
    return emptyTaskState();
  }
  var byStatus = {todo:[], in_progress:[], review:[], done:[]};
  tasks.forEach(function(t){ if(byStatus[t.status]) byStatus[t.status].push(t); });
  // Apply chosen sort within each column (smart = priority+due in this context)
  Object.keys(byStatus).forEach(function(s){
    byStatus[s] = sortTasks(byStatus[s], _taskSort);
  });
  var html = '<div class="kanban">';
  TASK_STATUSES.forEach(function(s){
    var col = byStatus[s.v] || [];
    html += '<div class="kanban-col" data-status="'+s.v+'" ondragover="onTaskDragOver(event)" ondragleave="onTaskDragLeave(event)" ondrop="onTaskDrop(event,\''+s.v+'\')">'
         +    '<div class="kanban-col-head">'
         +      '<span class="kanban-col-name">'+s.l+'</span>'
         +      '<span class="kanban-col-count">'+col.length+'</span>'
         +      '<button class="kanban-col-add" title="Add task" onclick="openTaskDrawerForNew(\''+s.v+'\')">+</button>'
         +    '</div>';
    col.forEach(function(t){
      var img, inner='', bg='#9CA3AF';
      if(t.assignee){
        var m = MEMBERS.find(function(x){return x.name===t.assignee;}) || {color:'#6B7280'};
        img = loadAvatar(t.assignee);
        inner = img ? '<img src="'+img+'" alt="'+escapeHtml(t.assignee)+'">' : escapeHtml(t.assignee.substring(0,2).toUpperCase());
        bg = img ? 'transparent' : m.color;
      }
      var avHtml = t.assignee
        ? '<span class="av-mini clickable" style="background:'+bg+'" title="'+escapeHtml(t.assignee)+' · click to reassign" onclick="event.stopPropagation();openAssigneePicker(\''+t.id+'\', this)">'+inner+'</span>'
        : '<span class="av-mini av-empty clickable" title="Assign someone" onclick="event.stopPropagation();openAssigneePicker(\''+t.id+'\', this)">+</span>';
      var dueHtml = t.dueDate
        ? '<span class="task-due clickable '+dueClass(t.dueDate,t.status)+'" onclick="event.stopPropagation();openDuePicker(\''+t.id+'\', this)">'+fmtDueLabel(t.dueDate)+'</span>'
        : '';
      var prog = subtaskProgress(t);
      var subHtml = prog
        ? '<span class="subtask-progress'+(prog.done===prog.total?' complete':'')+'" title="'+prog.done+' of '+prog.total+' subtasks done">'
          + '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6M2 6.5h4M2 9h6"/><path d="M9 7l1.2 1.2L12 6.4"/></svg>'
          + prog.done+'/'+prog.total
          + '</span>'
        : '';
      html += '<div class="kanban-card" draggable="true" data-id="'+t.id+'" ondragstart="onTaskDragStart(event,\''+t.id+'\')" ondragend="onTaskDragEnd(event)" onclick="openTaskDrawer(\''+t.id+'\')">'
           +    '<div class="kanban-card-title" title="Double-click to rename" ondblclick="event.stopPropagation();editTaskTitleInline(\''+t.id+'\', this)">'+escapeHtml(t.title||'(Untitled)')+'</div>'
           +    '<div class="kanban-card-meta">'
           +      '<span class="priority-pill p-'+t.priority+' clickable" onclick="event.stopPropagation();openPriorityPicker(\''+t.id+'\', this)">'+taskPriorityLabel(t.priority)+'</span>'
           +      dueHtml
           +      subHtml
           +      renderTaskTimePill(t)
           +      avHtml
           +    '</div>'
           +  '</div>';
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* Per-filter empty state — different message for each filter context */
function emptyTaskState(){
  var icons   = {all:'📋', mine:'☕', open:'🎉', overdue:'✅', done:'📭'};
  var titles  = {
    all:     'No tasks yet',
    mine:    'Nothing assigned to you',
    open:    'All clear — no open tasks',
    overdue: 'No overdue tasks',
    done:    'Nothing completed yet'
  };
  var subs = {
    all:     'Create your first task with the input above, or press N for a detailed form.',
    mine:    'Nothing on your plate right now. Take a breath, or pick something up from the team list.',
    open:    'Beautiful — every task is done or in another state. Keep it that way.',
    overdue: 'You\'re on top of everything. Nice work.',
    done:    'Tasks marked Done will show up here.'
  };
  var showCta = (_taskFilter === 'all' || _taskFilter === 'mine');
  return '<div class="task-list"><div class="task-empty">'
    +      '<div class="task-empty-icon">'+(icons[_taskFilter]||'📋')+'</div>'
    +      '<div class="task-empty-title">'+(titles[_taskFilter]||'No tasks')+'</div>'
    +      '<div class="task-empty-sub">'+(subs[_taskFilter]||'')+'</div>'
    +      (showCta ? '<button class="btn-new-task" style="margin:0 auto" onclick="openTaskDrawerForNew()">+ New Task</button>' : '')
    +    '</div></div>';
}

/* ── Drag and drop ── */
var _draggingTaskId = null;
function onTaskDragStart(e, id){
  _draggingTaskId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
}
function onTaskDragEnd(e){
  e.target.classList.remove('dragging');
  document.querySelectorAll('.kanban-col.drag-over').forEach(function(c){c.classList.remove('drag-over');});
  _draggingTaskId = null;
}
function onTaskDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onTaskDragLeave(e){
  if(e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)){
    e.currentTarget.classList.remove('drag-over');
  }
}
function onTaskDrop(e, status){
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if(!_draggingTaskId) return;
  setTaskStatus(_draggingTaskId, status);
}

/* ── CRUD ── */
function createTask(data){
  if(!firebaseReady){ showToast('Cannot Create Task — Offline'); return null; }
  if(!currentUser) return null;
  var ref = firebaseDb.ref('flowtive_tasks').push();
  var id = ref.key;
  var now = Date.now();
  var rec = {
    id: id,
    title: (data.title||'').trim() || 'Untitled task',
    description: data.description || '',
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    assignee: data.assignee || null,
    dueDate: data.dueDate || null,
    createdBy: currentUser.name,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
  ref.set(rec).catch(function(){ showToast('Save Failed'); });
  // Single activity entry for creation; the entry includes the assignee
  // so the feed can render "Created task X (to Emran)" without a separate assign event.
  logActivity(currentUser.name, 'task_create', null, null, null, {
    taskId: id, title: rec.title, assignee: rec.assignee
  });
  return id;
}

function updateTask(id, patch){
  if(!firebaseReady) return;
  var existing = tasksData[id];
  if(!existing) return;
  var update = {updatedAt: Date.now()};
  Object.keys(patch).forEach(function(k){ update[k] = patch[k]; });
  // Track completion
  if(patch.status === 'done' && existing.status !== 'done') update.completedAt = Date.now();
  if(patch.status && patch.status !== 'done') update.completedAt = null;
  firebaseDb.ref('flowtive_tasks/'+id).update(update).catch(function(){ showToast('Save Failed'); });

  // Recurring tasks: spawn next instance when this one is marked done
  if(patch.status === 'done' && existing.status !== 'done' && existing.recurrence){
    maybeSpawnRecurring(existing);
  }

  // Activity logs
  if(patch.status && patch.status !== existing.status && currentUser){
    logActivity(currentUser.name, 'task_status', null, null, null, {
      taskId: id, title: existing.title, fromStatus: existing.status, toStatus: patch.status
    });
  }
  if('assignee' in patch && patch.assignee !== existing.assignee && currentUser){
    logActivity(currentUser.name, 'task_assign', null, null, null, {
      taskId: id, title: existing.title, fromAssignee: existing.assignee, toAssignee: patch.assignee
    });
  }
}

function setTaskStatus(id, status){ updateTask(id, {status: status}); }

/* ── Recurring tasks ───────────────────────────────────────────────
   Stored as task.recurrence = 'daily' | 'weekdays' | 'weekly' | 'monthly' | null.
   When a recurring task is marked done, we spawn the next instance with the
   next due date. The completed task stays as the historical record. */

var TASK_RECURRENCE_OPTS = [
  {v:'',         l:'No repeat'},
  {v:'daily',    l:'Daily'},
  {v:'weekdays', l:'Weekdays (Mon–Fri)'},
  {v:'weekly',   l:'Weekly'},
  {v:'monthly',  l:'Monthly'}
];
function recurrenceLabel(v){
  var o = TASK_RECURRENCE_OPTS.find(function(x){return x.v === (v||'');});
  return o ? o.l : 'No repeat';
}
function shortRecurrenceLabel(v){
  switch(v){
    case 'daily':    return 'Daily';
    case 'weekdays': return 'Weekdays';
    case 'weekly':   return 'Weekly';
    case 'monthly':  return 'Monthly';
    default:         return 'No repeat';
  }
}

function computeNextDue(currentDue, recurrence){
  if(!recurrence) return null;
  // Use the existing due date if set, otherwise base on now (noon to avoid TZ slips)
  var d = currentDue ? new Date(currentDue) : (function(){ var x = new Date(); x.setHours(12,0,0,0); return x; })();
  switch(recurrence){
    case 'daily':
      d.setDate(d.getDate()+1); break;
    case 'weekdays':
      d.setDate(d.getDate()+1);
      while(d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate()+1);
      break;
    case 'weekly':
      d.setDate(d.getDate()+7); break;
    case 'monthly':
      d.setMonth(d.getMonth()+1); break;
    default:
      return null;
  }
  return d.getTime();
}

/* Called from updateTask when status flips to 'done'. Spawns the next instance
   if the task has a recurrence pattern. We copy title, description, priority,
   assignee, and recurrence — but NOT subtasks/comments/timeEntries/attachments
   (those belong to the completed instance). */
function maybeSpawnRecurring(existing){
  if(!existing || !existing.recurrence) return;
  if(!firebaseReady || !currentUser) return;
  var nextDue = computeNextDue(existing.dueDate || Date.now(), existing.recurrence);
  if(!nextDue) return;
  var ref = firebaseDb.ref('flowtive_tasks').push();
  var id = ref.key;
  var now = Date.now();
  var rec = {
    id: id,
    title: existing.title,
    description: existing.description || '',
    status: 'todo',
    priority: existing.priority || 'medium',
    assignee: existing.assignee || null,
    dueDate: nextDue,
    recurrence: existing.recurrence,
    createdBy: currentUser.name,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
  ref.set(rec).catch(function(){});
  logActivity(currentUser.name, 'task_create', null, null, null, {
    taskId: id, title: rec.title, assignee: rec.assignee, recurringFrom: existing.id
  });
  showToast('Next "'+existing.title+'" scheduled', '#3AC284');
}

function openRecurrencePicker(taskId, anchor){
  var t = tasksData[taskId]; if(!t) return;
  var items = TASK_RECURRENCE_OPTS.map(function(o){
    var icon = o.v
      ? '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5a4 4 0 0 1 7-2.5L10 4M10 7a4 4 0 0 1-7 2.5L2 8"/><path d="M10 1.5V4H7.5M2 10.5V8h2.5"/></svg>'
      : '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>';
    return { value: o.v, html: '<span class="ip-recur">'+icon+'<span class="ip-name'+(o.v?'':' ip-name-muted')+'">'+o.l+'</span></span>' };
  });
  openInlinePicker(anchor, items, t.recurrence || '', function(v){
    var newVal = v || null;
    if(newVal !== (t.recurrence || null)) updateTask(taskId, {recurrence: newVal});
  });
}

/* ── Per-task time tracking ───────────────────────────────────────
   Each task has:
     task.timeEntries = {[id]: {user, start, end, durationMs}}  // completed sessions
     task.activeTimers = {[userName]: {entryId, start}}         // who's tracking now
   Only one task can be actively tracked per user (we auto-stop the previous
   one when a new Start fires). Global Start Work in the sidebar is separate.
   16h auto-close prevents a forgotten timer from running indefinitely. */
var TASK_TIMER_AUTO_CLOSE_MS = 16*60*60*1000;

function getTaskTotalMs(t){
  if(!t || !t.timeEntries) return 0;
  var total = 0;
  Object.values(t.timeEntries).forEach(function(e){
    if(e && e.durationMs) total += e.durationMs;
  });
  return total;
}

/* Live total = stored total + the running session's elapsed (if any). */
function getTaskLiveMs(t, userName){
  var total = getTaskTotalMs(t);
  if(t && t.activeTimers && userName && t.activeTimers[userName]){
    total += Date.now() - t.activeTimers[userName].start;
  }
  return total;
}

/* Returns the task ID currently being tracked by the given user, or null. */
function getActiveTaskIdFor(userName){
  if(!userName) return null;
  for(var id in tasksData){
    var t = tasksData[id];
    if(t && t.activeTimers && t.activeTimers[userName]) return id;
  }
  return null;
}

/* If the user's active task timer has been running > 16h, auto-stop it at
   the 16h mark. Called every time tasks data refreshes — cheap O(1). */
function autoCloseStaleTaskTimer(){
  if(!currentUser) return;
  var name = currentUser.name;
  var taskId = getActiveTaskIdFor(name);
  if(!taskId) return;
  var t = tasksData[taskId];
  var act = t && t.activeTimers && t.activeTimers[name];
  if(!act) return;
  var elapsed = Date.now() - act.start;
  if(elapsed > TASK_TIMER_AUTO_CLOSE_MS){
    var end = act.start + TASK_TIMER_AUTO_CLOSE_MS;
    firebaseDb.ref('flowtive_tasks/'+taskId+'/timeEntries/'+act.entryId)
      .update({end: end, durationMs: TASK_TIMER_AUTO_CLOSE_MS, autoClosed: true});
    firebaseDb.ref('flowtive_tasks/'+taskId+'/activeTimers/'+name).remove();
  }
}

function startTaskTimer(taskId){
  if(!firebaseReady){ showToast('Cannot Start — Offline'); return; }
  if(!currentUser) return;
  var name = currentUser.name;
  var existing = getActiveTaskIdFor(name);
  if(existing === taskId) return; // already running on this task
  // Capture the previous task's title so we can show "switched from X" toast
  var prevTitle = '';
  if(existing){
    var prev = tasksData[existing];
    prevTitle = prev && prev.title ? prev.title : '';
    stopTaskTimer(existing, {silent:true});
  }
  var entryRef = firebaseDb.ref('flowtive_tasks/'+taskId+'/timeEntries').push();
  var entryId = entryRef.key;
  var now = Date.now();
  entryRef.set({user:name, start:now, end:null, durationMs:null}).catch(function(){ showToast('Save Failed'); });
  firebaseDb.ref('flowtive_tasks/'+taskId+'/activeTimers/'+name).set({entryId:entryId, start:now});
  firebaseDb.ref('flowtive_tasks/'+taskId+'/updatedAt').set(now);
  if(prevTitle){
    showToast('Switched from "'+prevTitle+'" — tracking new task', '#475569');
  } else {
    showToast('Tracking Started', '#3AC284');
  }
}

function stopTaskTimer(taskId, opts){
  opts = opts || {};
  if(!firebaseReady) return;
  if(!currentUser) return;
  var name = currentUser.name;
  taskId = taskId || getActiveTaskIdFor(name);
  if(!taskId) return;
  var t = tasksData[taskId]; if(!t) return;
  if(!t.activeTimers || !t.activeTimers[name]) return;
  var act = t.activeTimers[name];
  var end = Date.now();
  var dur = end - act.start;
  if(dur < 0) dur = 0;
  firebaseDb.ref('flowtive_tasks/'+taskId+'/timeEntries/'+act.entryId).update({end:end, durationMs:dur});
  firebaseDb.ref('flowtive_tasks/'+taskId+'/activeTimers/'+name).remove();
  firebaseDb.ref('flowtive_tasks/'+taskId+'/updatedAt').set(end);
  if(!opts.silent) showToast('Stopped · '+fmtElapsed(dur), '#991B1B');
}

function toggleTaskTimer(taskId){
  if(!currentUser) return;
  var active = getActiveTaskIdFor(currentUser.name);
  if(active === taskId) stopTaskTimer(taskId);
  else startTaskTimer(taskId);
}

/* Per-second tick — called from clock.js's tickClockUI. Updates every visible
   running counter (row badges, modal total) without re-rendering the DOM. */
function tickTaskTimers(){
  if(!currentUser) return;
  var name = currentUser.name;
  document.querySelectorAll('.task-time-pill.running').forEach(function(pill){
    var taskId = pill.getAttribute('data-task-id');
    var t = tasksData[taskId]; if(!t) return;
    var span = pill.querySelector('.task-time-val');
    if(span) span.textContent = fmtElapsed(getTaskLiveMs(t, name));
  });
  var modalTotal = document.getElementById('td-time-total');
  if(modalTotal && _drawerTaskId){
    var dt = tasksData[_drawerTaskId];
    if(dt && dt.activeTimers && dt.activeTimers[name]){
      modalTotal.textContent = fmtElapsed(getTaskLiveMs(dt, name));
    }
  }
}

/* ── Subtasks ─────────────────────────────────────────────────────
   Stored as task.subtasks = {[id]: {id, text, done, createdAt}}.
   We use Firebase's push() keys so concurrent adds don't collide. */
function addSubtask(taskId, text){
  if(!firebaseReady || !text) return;
  var t = tasksData[taskId]; if(!t) return;
  var ref = firebaseDb.ref('flowtive_tasks/'+taskId+'/subtasks').push();
  var rec = {id: ref.key, text: text.trim(), done: false, createdAt: Date.now()};
  ref.set(rec).catch(function(){ showToast('Save Failed'); });
  firebaseDb.ref('flowtive_tasks/'+taskId+'/updatedAt').set(Date.now());
}
function toggleSubtask(taskId, subId){
  var t = tasksData[taskId]; if(!t || !t.subtasks || !t.subtasks[subId]) return;
  var newVal = !t.subtasks[subId].done;
  firebaseDb.ref('flowtive_tasks/'+taskId+'/subtasks/'+subId+'/done').set(newVal);
  firebaseDb.ref('flowtive_tasks/'+taskId+'/updatedAt').set(Date.now());
}
function deleteSubtask(taskId, subId){
  firebaseDb.ref('flowtive_tasks/'+taskId+'/subtasks/'+subId).remove();
  firebaseDb.ref('flowtive_tasks/'+taskId+'/updatedAt').set(Date.now());
}

/* ── Comments ─────────────────────────────────────────────────────
   Stored as task.comments = {[id]: {id, user, text, createdAt, mentions?}}.
   mentions is an array of MEMBER names extracted from @Name patterns. */

/* Extract @Name mentions where Name matches a known team member.
   Matches @SingleWord or @"Multi Word" — keeps it simple, case-sensitive
   on first letter to avoid matching every "@" sign in casual writing. */
function parseMentions(text){
  if(!text || typeof MEMBERS === 'undefined') return [];
  var found = {};
  // Sort members by name length DESC so "John Smith" wins over "John"
  var names = MEMBERS.map(function(m){ return m.name; }).sort(function(a,b){ return b.length - a.length; });
  names.forEach(function(name){
    // Word-boundary @Name — case-insensitive, but only at start of a word
    var re = new RegExp('@' + name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '(?![A-Za-z])', 'gi');
    if(re.test(text)) found[name] = true;
  });
  return Object.keys(found);
}

function addComment(taskId, text){
  if(!firebaseReady || !currentUser || !text) return;
  var t = tasksData[taskId]; if(!t) return;
  var ref = firebaseDb.ref('flowtive_tasks/'+taskId+'/comments').push();
  var trimmed = text.trim();
  var mentions = parseMentions(trimmed);
  var rec = {id: ref.key, user: currentUser.name, text: trimmed, createdAt: Date.now()};
  if(mentions.length) rec.mentions = mentions;
  ref.set(rec).catch(function(){ showToast('Save Failed'); });
  firebaseDb.ref('flowtive_tasks/'+taskId+'/updatedAt').set(Date.now());
  logActivity(currentUser.name, 'task_comment', null, null, null, {
    taskId: taskId, title: t.title, mentions: mentions.length ? mentions : null
  });
}
function deleteComment(taskId, commentId){
  var t = tasksData[taskId]; if(!t || !t.comments || !t.comments[commentId]) return;
  // Owner-only delete (defense-in-depth; UI already hides the button for non-owner)
  if(!currentUser || t.comments[commentId].user !== currentUser.name) return;
  firebaseDb.ref('flowtive_tasks/'+taskId+'/comments/'+commentId).remove();
  firebaseDb.ref('flowtive_tasks/'+taskId+'/updatedAt').set(Date.now());
}

function toggleTaskDone(id){
  var t = tasksData[id]; if(!t) return;
  setTaskStatus(id, t.status === 'done' ? 'todo' : 'done');
}

function deleteTask(id){
  if(!firebaseReady) return;
  var t = tasksData[id]; if(!t) return;
  firebaseDb.ref('flowtive_tasks/'+id).remove().catch(function(){ showToast('Delete Failed'); });
  if(currentUser){
    logActivity(currentUser.name, 'task_delete', null, null, null, {taskId: id, title: t.title});
  }
  showToast('Task Deleted');
  if(_drawerTaskId === id) closeTaskDrawer();
}

function confirmDeleteTask(id){
  var t = tasksData[id]; if(!t) return;
  ftConfirm({
    title: 'Delete task?',
    message: '"'+(t.title||'Untitled')+'" will be permanently deleted. This cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    danger: true,
    onConfirm: function(){ deleteTask(id); }
  });
}

/* ── Detail drawer (edit + create form share UI) ── */
function openTaskDrawer(id){
  var t = tasksData[id]; if(!t) return;
  _drawerTaskId = id;
  showTaskDrawer(t, false);
}

function openTaskDrawerForNew(initialStatus){
  _drawerTaskId = null;
  var draft = {
    id: null,
    title: '',
    description: '',
    status: initialStatus || 'todo',
    priority: 'medium',
    assignee: currentUser ? currentUser.name : null,
    dueDate: null,
    createdBy: currentUser ? currentUser.name : '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  showTaskDrawer(draft, true);
}

/* ── Rich-text description ──
   Lightweight contentEditable + execCommand. Saves sanitized HTML so we can
   strip script/iframe/event-handler attrs (defense-in-depth — only team
   members write, but never trust raw HTML round-tripping through a DB). */
function sanitizeRichHtml(html){
  if(!html) return '';
  var doc;
  try{ doc = new DOMParser().parseFromString(html, 'text/html'); }
  catch(e){ return ''; }
  doc.querySelectorAll('script,iframe,object,embed,style,link,meta').forEach(function(el){ el.remove(); });
  doc.querySelectorAll('*').forEach(function(el){
    Array.from(el.attributes).forEach(function(attr){
      var n = attr.name.toLowerCase();
      var v = (attr.value || '').toLowerCase();
      if(n.indexOf('on') === 0) el.removeAttribute(attr.name);
      if((n === 'href' || n === 'src') && (v.indexOf('javascript:') === 0 || v.indexOf('data:text/html') === 0)){
        el.removeAttribute(attr.name);
      }
    });
  });
  var out = doc.body.innerHTML;
  // Normalize whitespace-only / browser-injected <br> leftovers to empty so
  // the :empty placeholder shows + the row preview stays clean.
  if(!doc.body.textContent.trim() && !doc.body.querySelector('img,a,iframe')) return '';
  return out;
}
/* True when the contentEditable is visually empty (browsers leave <br>/&nbsp;
   leftovers after delete-back-to-empty). Drives the placeholder visibility. */
function richEditorIsEmpty(el){
  if(!el) return true;
  var t = (el.textContent || '').replace(/ |\s/g, '');
  if(t.length) return false;
  return !el.querySelector('img,a,iframe');
}
/* Plain-text excerpt for the row preview under the title. */
function richHtmlToText(html){
  if(!html) return '';
  var d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g,' ').trim();
}
/* Toolbar handlers — execCommand is deprecated but still ships in every
   browser; the alternative (Tiptap/Trix) needs a build step we don't have. */
function richExec(cmd){
  document.execCommand(cmd, false, null);
  var ed = document.getElementById('td-desc');
  if(ed) ed.focus();
}
function richInsertLink(){
  var ed = document.getElementById('td-desc'); if(ed) ed.focus();
  var sel = window.getSelection();
  if(!sel || sel.isCollapsed){ showToast('Select text to link first'); return; }
  var url = prompt('Link URL (https://…):');
  if(!url) return;
  if(!/^https?:\/\//i.test(url)) url = 'https://'+url;
  document.execCommand('createLink', false, url);
}
function richClearFormat(){
  document.execCommand('removeFormat', false, null);
  document.execCommand('unlink', false, null);
  var ed = document.getElementById('td-desc'); if(ed) ed.focus();
}

/* ── ClickUp-style modal helpers ──
   The drawer is now a centered popup with a main column + activity sidebar.
   These helpers build the inner pieces. */

/* Fact rows — Status / Assignee / Due / Priority. Each value is the same
   clickable pill used in the row/board, so editing happens via inline picker. */
function renderTaskFactRows(t){
  var statusVal = '<span class="status-pill s-'+t.status+' clickable" onclick="openStatusPicker(\''+t.id+'\', this)">'+taskStatusLabel(t.status)+'</span>';
  var prioVal   = '<span class="priority-pill p-'+t.priority+' clickable" onclick="openPriorityPicker(\''+t.id+'\', this)">'+taskPriorityLabel(t.priority)+'</span>';
  var assigneeVal = t.assignee
    ? renderTaskAssignee(t.assignee, t.id)
    : '<span class="task-assignee unassigned clickable" onclick="openAssigneePicker(\''+t.id+'\', this)"><span class="av-mini">?</span>Unassigned</span>';
  var dueVal = t.dueDate
    ? '<span class="task-due clickable '+dueClass(t.dueDate,t.status)+'" onclick="openDuePicker(\''+t.id+'\', this)">'+fmtDueLabel(t.dueDate)+'</span>'
    : '<span class="task-due task-due-empty clickable" onclick="openDuePicker(\''+t.id+'\', this)">Set date</span>';
  var recurVal = t.recurrence
    ? '<span class="recurrence-pill clickable" onclick="openRecurrencePicker(\''+t.id+'\', this)"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5a4 4 0 0 1 7-2.5L10 4M10 7a4 4 0 0 1-7 2.5L2 8"/><path d="M10 1.5V4H7.5M2 10.5V8h2.5"/></svg>'+shortRecurrenceLabel(t.recurrence)+'</span>'
    : '<span class="recurrence-pill recurrence-pill-empty clickable" onclick="openRecurrencePicker(\''+t.id+'\', this)">No repeat</span>';
  // Lucide-style 13px outline icons for each label
  var icoStatus   = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"/><path d="M5 7l1.5 1.5L9.5 5.5"/></svg>';
  var icoAssignee = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="5" r="2.4"/><path d="M2.5 12c.6-2.2 2.4-3.4 4.5-3.4S10.9 9.8 11.5 12"/></svg>';
  var icoDue      = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="10" height="9" rx="1.5"/><path d="M2 5.5h10M5 2v2.5M9 2v2.5"/></svg>';
  var icoPrio     = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V2M3 2l7 1.5L8 5.5l2 2L3 8.5"/></svg>';
  var icoRepeat   = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6a4.5 4.5 0 0 1 8-3l1.5 1.5M12 8a4.5 4.5 0 0 1-8 3l-1.5-1.5"/><path d="M11.5 1.5v3h-3M2.5 12.5v-3h3"/></svg>';

  return '<div class="td-facts">'
    +    '<div class="td-fact"><div class="td-fact-label">'+icoStatus+'Status</div><div class="td-fact-value">'+statusVal+'</div></div>'
    +    '<div class="td-fact"><div class="td-fact-label">'+icoAssignee+'Assignee</div><div class="td-fact-value">'+assigneeVal+'</div></div>'
    +    '<div class="td-fact"><div class="td-fact-label">'+icoDue+'Due Date</div><div class="td-fact-value">'+dueVal+'</div></div>'
    +    '<div class="td-fact"><div class="td-fact-label">'+icoPrio+'Priority</div><div class="td-fact-value">'+prioVal+'</div></div>'
    +    '<div class="td-fact"><div class="td-fact-label">'+icoRepeat+'Repeat</div><div class="td-fact-value">'+recurVal+'</div></div>'
    +  '</div>';
}

/* Wire title + description autosave on blur (existing tasks only — new tasks
   still use the explicit Create button so we don't write empty drafts). */
function wireDrawerAutosave(taskId){
  var titleEl = document.getElementById('td-title');
  if(titleEl){
    titleEl.addEventListener('blur', function(){
      var t = tasksData[taskId]; if(!t) return;
      var v = titleEl.value.trim();
      if(v && v !== t.title) updateTask(taskId, {title: v});
      else if(!v) titleEl.value = t.title || ''; // refuse empty title
    });
    titleEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); titleEl.blur(); }
    });
  }
  var descEl = document.getElementById('td-desc');
  if(descEl){
    descEl.addEventListener('blur', function(){
      var t = tasksData[taskId]; if(!t) return;
      // Rich-text editor stores HTML, not plain text
      var v = descEl.isContentEditable
        ? sanitizeRichHtml(descEl.innerHTML)
        : descEl.value;
      if(v !== (t.description||'')) updateTask(taskId, {description: v});
    });
    if(descEl.isContentEditable){
      // Toggle is-empty class so the placeholder shows even after type-then-delete
      var syncEmpty = function(){ descEl.classList.toggle('is-empty', richEditorIsEmpty(descEl)); };
      descEl.addEventListener('input', syncEmpty);
      descEl.addEventListener('blur', syncEmpty);
      syncEmpty(); // initial state
    }
  }
}

function showTaskDrawer(t, isNew){
  var bd = document.getElementById('tdrawer-backdrop');
  var dr = document.getElementById('tdrawer');
  if(!bd){
    bd = document.createElement('div'); bd.className = 'tdrawer-backdrop'; bd.id = 'tdrawer-backdrop';
    bd.onclick = closeTaskDrawer;
    document.body.appendChild(bd);
  }
  if(!dr){
    dr = document.createElement('div'); dr.className = 'tdrawer'; dr.id = 'tdrawer';
    document.body.appendChild(dr);
  }

  if(isNew){
    dr.classList.add('is-new');
    dr.innerHTML = renderNewTaskDrawerHtml(t);
  } else {
    dr.classList.remove('is-new');
    dr.innerHTML = renderEditTaskDrawerHtml(t);
    wireDrawerAutosave(t.id);
  }

  bd.classList.add('show');
  requestAnimationFrame(function(){ dr.classList.add('show'); });
  // Esc closes the modal — bubble phase so the inline picker's capture-phase
  // handler can stopPropagation() and intercept Esc when a picker is open.
  document.addEventListener('keydown', _drawerEscHandler);
  setTimeout(function(){
    var ti = document.getElementById('td-title'); if(ti){ ti.focus(); if(isNew) ti.select(); }
  }, 250);
}
function _drawerEscHandler(e){
  if(e.key !== 'Escape') return;
  // Force a blur on the focused field so its autosave handler fires before
  // we close — otherwise an in-progress title/description edit is lost.
  if(document.activeElement && document.activeElement.blur && document.activeElement !== document.body){
    document.activeElement.blur();
  }
  closeTaskDrawer();
}

/* Centered modal for an existing task — single column */
function renderEditTaskDrawerHtml(t){
  var icoTask = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"/><path d="M5 7l1.5 1.5L9.5 5.5"/></svg>';
  var icoTrash = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg>';
  return ''
    + '<div class="tdrawer-head">'
    +   '<div class="tdrawer-head-left">'
    +     '<span class="tdrawer-type-badge">'+icoTask+'Task</span>'
    +   '</div>'
    +   '<div class="tdrawer-head-right">'
    +     '<button class="tdrawer-icon-btn" title="Delete task" onclick="confirmDeleteTask(\''+t.id+'\')">'+icoTrash+'</button>'
    +     '<button class="tdrawer-close" onclick="closeTaskDrawer()" type="button" aria-label="Close">×</button>'
    +   '</div>'
    + '</div>'
    + '<div class="tdrawer-body">'
    +   '<div class="tdrawer-main">'
    +     '<input class="tdrawer-title" id="td-title" type="text" value="'+escapeHtml(t.title||'')+'" placeholder="Task title…">'
    +     renderTaskFactRows(t)
    +     '<div class="tdrawer-section">'
    +       '<label class="tdrawer-section-title-h">Description</label>'
    +       '<div class="td-rich-toolbar">'
    +         '<button type="button" class="td-rich-btn" title="Bold (⌘B)" onmousedown="event.preventDefault();richExec(\'bold\')"><b>B</b></button>'
    +         '<button type="button" class="td-rich-btn" title="Italic (⌘I)" onmousedown="event.preventDefault();richExec(\'italic\')"><i>I</i></button>'
    +         '<button type="button" class="td-rich-btn" title="Underline (⌘U)" onmousedown="event.preventDefault();richExec(\'underline\')"><u>U</u></button>'
    +         '<span class="td-rich-sep"></span>'
    +         '<button type="button" class="td-rich-btn" title="Bulleted list" onmousedown="event.preventDefault();richExec(\'insertUnorderedList\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="2.5" cy="3.5" r="0.7" fill="currentColor"/><circle cx="2.5" cy="7" r="0.7" fill="currentColor"/><circle cx="2.5" cy="10.5" r="0.7" fill="currentColor"/><path d="M5 3.5h7M5 7h7M5 10.5h7"/></svg></button>'
    +         '<button type="button" class="td-rich-btn" title="Numbered list" onmousedown="event.preventDefault();richExec(\'insertOrderedList\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><text x="1" y="5" font-size="4" font-weight="700" fill="currentColor" stroke="none">1.</text><text x="1" y="10" font-size="4" font-weight="700" fill="currentColor" stroke="none">2.</text><path d="M5.5 3.5h7M5.5 7h7M5.5 10.5h7"/></svg></button>'
    +         '<span class="td-rich-sep"></span>'
    +         '<button type="button" class="td-rich-btn" title="Insert link" onmousedown="event.preventDefault();richInsertLink()"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6 8a2 2 0 0 0 2.8 0l2-2a2 2 0 0 0-2.8-2.8l-1 1M8 6a2 2 0 0 0-2.8 0l-2 2a2 2 0 0 0 2.8 2.8l1-1"/></svg></button>'
    +         '<button type="button" class="td-rich-btn" title="Clear formatting" onmousedown="event.preventDefault();richClearFormat()"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 3l8 8M5 3h6M5 11h2M9 3l-2 8"/></svg></button>'
    +       '</div>'
    +       '<div class="tdrawer-textarea tdrawer-desc td-rich-editor" id="td-desc" contenteditable="true" data-placeholder="Add a description…">'+sanitizeRichHtml(t.description||'')+'</div>'
    +     '</div>'
    +     '<div class="tdrawer-section" id="td-time-section">'+renderTimeTrackingSection(t)+'</div>'
    +     '<div class="tdrawer-section" id="td-subtasks-section">'+renderSubtasksSection(t)+'</div>'
    +     '<div class="tdrawer-section" id="td-comments-section">'+renderCommentsSection(t)+'</div>'
    +     '<div class="tdrawer-meta">'
    +       'Created by '+escapeHtml(t.createdBy||'—')+' · '+formatTimeAgo(t.createdAt)
    +       + (t.updatedAt && t.updatedAt !== t.createdAt ? ' · Updated '+formatTimeAgo(t.updatedAt) : '')
    +       + (t.completedAt ? ' · Completed '+formatTimeAgo(t.completedAt) : '')
    +     '</div>'
    +   '</div>'
    + '</div>';
}

/* New-task variant — single-column form with Create/Cancel footer */
function renderNewTaskDrawerHtml(t){
  var assigneeOpts = '<option value="">— Unassigned —</option>' + MEMBERS.map(function(m){
    return '<option value="'+escapeHtml(m.name)+'"'+(t.assignee===m.name?' selected':'')+'>'+escapeHtml(m.name)+'</option>';
  }).join('');
  var statusOpts = TASK_STATUSES.map(function(s){
    return '<option value="'+s.v+'"'+(t.status===s.v?' selected':'')+'>'+s.l+'</option>';
  }).join('');
  var prioOpts = TASK_PRIORITIES.map(function(p){
    return '<option value="'+p.v+'"'+(t.priority===p.v?' selected':'')+'>'+p.l+'</option>';
  }).join('');
  var dueVal = t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '';
  var icoTask = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"/><path d="M5 7l1.5 1.5L9.5 5.5"/></svg>';

  return ''
    + '<div class="tdrawer-head">'
    +   '<div class="tdrawer-head-left">'
    +     '<span class="tdrawer-type-badge">'+icoTask+'New Task</span>'
    +   '</div>'
    +   '<div class="tdrawer-head-right">'
    +     '<button class="tdrawer-close" onclick="closeTaskDrawer()" type="button" aria-label="Close">×</button>'
    +   '</div>'
    + '</div>'
    + '<div class="tdrawer-body tdrawer-body-new">'
    +   '<div class="tdrawer-main">'
    +     '<input class="tdrawer-title" id="td-title" type="text" value="'+escapeHtml(t.title||'')+'" placeholder="Task title…">'
    +     '<div class="tdrawer-section">'
    +       '<label class="tdrawer-section-title-h">Description</label>'
    +       '<textarea class="tdrawer-textarea tdrawer-desc" id="td-desc" placeholder="Add a description…">'+escapeHtml(t.description||'')+'</textarea>'
    +     '</div>'
    +     '<div class="tdrawer-grid2">'
    +       '<div class="tdrawer-field"><label class="tdrawer-label">Status</label><select class="tdrawer-select" id="td-status">'+statusOpts+'</select></div>'
    +       '<div class="tdrawer-field"><label class="tdrawer-label">Priority</label><select class="tdrawer-select" id="td-priority">'+prioOpts+'</select></div>'
    +     '</div>'
    +     '<div class="tdrawer-grid2">'
    +       '<div class="tdrawer-field"><label class="tdrawer-label">Assignee</label><select class="tdrawer-select" id="td-assignee">'+assigneeOpts+'</select></div>'
    +       '<div class="tdrawer-field"><label class="tdrawer-label">Due Date</label><input class="tdrawer-input" id="td-due" type="date" value="'+dueVal+'"></div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div class="tdrawer-foot">'
    +   '<button class="tdrawer-btn tdrawer-btn-cancel" onclick="closeTaskDrawer()">Cancel</button>'
    +   '<button class="tdrawer-btn tdrawer-btn-save" onclick="saveTaskFromDrawer(true)">Create Task</button>'
    + '</div>';
}

function closeTaskDrawer(){
  var bd = document.getElementById('tdrawer-backdrop');
  var dr = document.getElementById('tdrawer');
  if(dr) dr.classList.remove('show');
  if(bd) bd.classList.remove('show');
  _drawerTaskId = null;
  // If an inline picker (status/priority/assignee/due) was open, drop it too —
  // its anchor element is gone now.
  closeInlinePicker();
  document.removeEventListener('keydown', _drawerEscHandler);
}

/* Only used for the new-task variant — edits autosave via wireDrawerAutosave +
   inline pickers. */
function saveTaskFromDrawer(isNew){
  if(!isNew) return;
  var data = {
    title:       (document.getElementById('td-title').value || '').trim(),
    description: document.getElementById('td-desc').value,
    status:      document.getElementById('td-status').value,
    priority:    document.getElementById('td-priority').value,
    assignee:    document.getElementById('td-assignee').value || null,
    dueDate:     null
  };
  var dueRaw = document.getElementById('td-due').value;
  if(dueRaw){
    var d = new Date(dueRaw + 'T12:00:00');
    if(!isNaN(d.getTime())) data.dueDate = d.getTime();
  }
  if(!data.title){ showToast('Title Is Required'); return; }
  createTask(data);
  showToast('Task Created');
  closeTaskDrawer();
}

/* ── Drawer live sections ──
   When Firebase pushes an update for the open task, re-render the parts that
   depend on it (fact rows, subtasks, comments) in place. We do NOT touch the
   title input, description textarea, or comment textarea while the user is
   focused on them. */
function refreshDrawerLiveSections(t){
  if(!t) return;
  // Fact rows — replace the whole .td-facts wrapper
  var factsEl = document.querySelector('#tdrawer .td-facts');
  if(factsEl){
    var tmp = document.createElement('div');
    tmp.innerHTML = renderTaskFactRows(t);
    if(tmp.firstChild) factsEl.replaceWith(tmp.firstChild);
  }
  // Time tracking
  var timeEl = document.getElementById('td-time-section');
  if(timeEl) timeEl.innerHTML = renderTimeTrackingSection(t);
  // Subtasks
  var subEl = document.getElementById('td-subtasks-section');
  if(subEl) subEl.innerHTML = renderSubtasksSection(t);
  // Comments — preserve in-progress text in the comment input
  var comEl = document.getElementById('td-comments-section');
  if(comEl){
    var commentInput = document.getElementById('td-comment-input');
    var pendingComment = commentInput ? commentInput.value : '';
    comEl.innerHTML = renderCommentsSection(t);
    if(pendingComment){
      var ci = document.getElementById('td-comment-input');
      if(ci) ci.value = pendingComment;
    }
  }
  // Title + description: only sync if the user isn't editing them right now
  var ti = document.getElementById('td-title');
  if(ti && document.activeElement !== ti && ti.value !== (t.title||'')) ti.value = t.title || '';
  var de = document.getElementById('td-desc');
  if(de && document.activeElement !== de){
    if(de.isContentEditable){
      var newHtml = sanitizeRichHtml(t.description||'');
      if(de.innerHTML !== newHtml) de.innerHTML = newHtml;
    } else if(de.value !== (t.description||'')){
      de.value = t.description || '';
    }
  }
}

function renderSubtasksSection(t){
  var subs = t && t.subtasks ? Object.values(t.subtasks).filter(Boolean) : [];
  // Order: incomplete first, then by createdAt
  subs.sort(function(a,b){
    if(a.done !== b.done) return a.done ? 1 : -1;
    return (a.createdAt||0) - (b.createdAt||0);
  });
  var prog = subs.length ? subs.filter(function(s){return s.done;}).length+'/'+subs.length : '';
  var html = '<div class="tdrawer-section-head">'
       +      '<span class="tdrawer-section-title">Subtasks'+(prog?' <span class="tdrawer-section-count">'+prog+'</span>':'')+'</span>'
       +    '</div>';
  if(subs.length){
    html += '<div class="subtask-list">';
    subs.forEach(function(s){
      html += '<div class="subtask-item'+(s.done?' done':'')+'" data-id="'+s.id+'">'
           +    '<div class="task-cb '+(s.done?'on':'')+'" onclick="toggleSubtask(\''+t.id+'\',\''+s.id+'\')"></div>'
           +    '<div class="subtask-text">'+escapeHtml(s.text||'')+'</div>'
           +    '<button class="subtask-del" title="Delete subtask" onclick="deleteSubtask(\''+t.id+'\',\''+s.id+'\')">'
           +      '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>'
           +    '</button>'
           +  '</div>';
    });
    html += '</div>';
  }
  html += '<div class="subtask-add">'
       +    '<input type="text" id="td-subtask-input" class="subtask-add-input" placeholder="Add a subtask…" autocomplete="off" onkeydown="onSubtaskInputKey(event,\''+t.id+'\')">'
       +    '<button class="subtask-add-btn" onclick="submitSubtaskInput(\''+t.id+'\')">Add</button>'
       +  '</div>';
  return html;
}

function onSubtaskInputKey(e, taskId){
  if(e.key === 'Enter'){ e.preventDefault(); submitSubtaskInput(taskId); }
}
function submitSubtaskInput(taskId){
  var inp = document.getElementById('td-subtask-input');
  if(!inp) return;
  var v = (inp.value||'').trim();
  if(!v) return;
  addSubtask(taskId, v);
  inp.value = '';
  inp.focus();
}

/* Time-tracking section in the modal — big total + Start/Stop button +
   per-user breakdown (so a teammate can see who logged what). */
function renderTimeTrackingSection(t){
  if(!t || !currentUser) return '';
  var name = currentUser.name;
  var myActive = !!(t.activeTimers && t.activeTimers[name]);
  var liveMs = getTaskLiveMs(t, name);

  // Per-user totals — accumulate completed entries + live time for self
  var userTotals = {};
  if(t.timeEntries){
    Object.values(t.timeEntries).forEach(function(e){
      if(!e || !e.user) return;
      var ms = e.durationMs || 0;
      userTotals[e.user] = (userTotals[e.user] || 0) + ms;
    });
  }
  if(myActive){
    var liveAdd = Date.now() - t.activeTimers[name].start;
    userTotals[name] = (userTotals[name] || 0) + liveAdd;
  }

  // Other teammates currently tracking this task (informational)
  var others = [];
  if(t.activeTimers){
    Object.keys(t.activeTimers).forEach(function(u){ if(u !== name) others.push(u); });
  }

  var icon = myActive
    ? '<svg viewBox="0 0 14 14" fill="currentColor"><rect x="3.5" y="3.5" width="7" height="7" rx="1"/></svg>'
    : '<svg viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.5v9l7-4.5z"/></svg>';
  var btnLabel = myActive ? 'Stop Tracking' : 'Start Tracking';
  var btnClass = myActive ? 'time-btn time-btn-stop' : 'time-btn time-btn-start';

  var html = '<div class="tdrawer-section-head">'
    +    '<span class="tdrawer-section-title">Time Tracking</span>'
    +    '<span class="time-total" id="td-time-total">'+fmtElapsed(liveMs)+'</span>'
    +  '</div>'
    +  '<div class="time-controls">'
    +    '<button class="'+btnClass+'" onclick="toggleTaskTimer(\''+t.id+'\')">'+icon+'<span>'+btnLabel+'</span></button>'
    +    (myActive ? '<span class="time-running-badge"><span class="time-running-dot"></span>Tracking now</span>' : '')
    +  '</div>';

  if(others.length){
    html += '<div class="time-others">'
         +    '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="4.5" r="2"/><path d="M2 11c.6-2 2.2-3 4-3s3.4 1 4 3"/></svg>'
         +    escapeHtml(others.join(', '))+(others.length===1?' is':' are')+' currently tracking this task'
         +  '</div>';
  }

  if(Object.keys(userTotals).length){
    html += '<div class="time-user-list">';
    Object.keys(userTotals).sort().forEach(function(u){
      var m = MEMBERS.find(function(x){return x.name===u;}) || {color:'#6B7280'};
      var img = (typeof loadAvatar==='function') ? loadAvatar(u) : null;
      var avInner = img ? '<img src="'+img+'" alt="'+escapeHtml(u)+'">' : escapeHtml(u.substring(0,2).toUpperCase());
      var avBg = img ? 'transparent' : m.color;
      var ms = userTotals[u];
      html += '<div class="time-user-row">'
           +    '<div class="time-user-av" style="background:'+avBg+'">'+avInner+'</div>'
           +    '<span class="time-user-name">'+escapeHtml(u)+'</span>'
           +    '<span class="time-user-dur">'+fmtElapsed(ms)+'</span>'
           +  '</div>';
    });
    html += '</div>';
  }

  return html;
}

function renderCommentsSection(t){
  var coms = t && t.comments ? Object.values(t.comments).filter(Boolean) : [];
  coms.sort(function(a,b){ return (a.createdAt||0) - (b.createdAt||0); });
  var me = currentUser ? currentUser.name : null;
  var html = '<div class="tdrawer-section-head">'
       +      '<span class="tdrawer-section-title">Comments'+(coms.length?' <span class="tdrawer-section-count">'+coms.length+'</span>':'')+'</span>'
       +    '</div>';
  if(coms.length){
    html += '<div class="comment-list">';
    coms.forEach(function(c){
      var m = MEMBERS.find(function(x){return x.name===c.user;}) || {color:'#6B7280'};
      var img = (typeof loadAvatar==='function') ? loadAvatar(c.user) : null;
      var avInner = img
        ? '<img src="'+img+'" alt="'+escapeHtml(c.user)+'">'
        : escapeHtml((c.user||'?').substring(0,2).toUpperCase());
      var avBg = img ? 'transparent' : m.color;
      var canDelete = me && c.user === me;
      html += '<div class="comment-item">'
           +    '<div class="comment-av" style="background:'+avBg+'">'+avInner+'</div>'
           +    '<div class="comment-body">'
           +      '<div class="comment-meta"><span class="comment-author">'+escapeHtml(c.user||'')+'</span><span class="comment-time">'+formatTimeAgo(c.createdAt)+'</span>'
           +        (canDelete ? '<button class="comment-del" title="Delete" onclick="deleteComment(\''+t.id+'\',\''+c.id+'\')">×</button>' : '')
           +      '</div>'
           +      '<div class="comment-text">'+renderCommentTextWithMentions(c.text||'')+'</div>'
           +    '</div>'
           +  '</div>';
    });
    html += '</div>';
  }
  html += '<div class="comment-add">'
       +    '<textarea id="td-comment-input" class="comment-add-input" placeholder="Write a comment… use @Name to mention a teammate · ⌘/Ctrl + Enter to send" rows="2" '
       +      'oninput="onCommentInput(event,\''+t.id+'\')" '
       +      'onkeydown="onCommentInputKey(event,\''+t.id+'\')" '
       +      'onblur="setTimeout(closeMentionPicker, 150)"></textarea>'
       +    '<button class="comment-add-btn" onclick="submitCommentInput(\''+t.id+'\')">Comment</button>'
       +  '</div>';
  return html;
}

/* Render a comment's plain text with @mentions highlighted. We escape the
   text first (XSS-safe), then replace escaped @Name occurrences with a
   styled span. Only matches names that resolve to real members. */
function renderCommentTextWithMentions(text){
  var safe = escapeHtml(text || '');
  if(typeof MEMBERS === 'undefined' || !MEMBERS) return safe;
  // Sort by length DESC so "John Smith" wins over "John"
  var names = MEMBERS.map(function(m){ return m.name; }).sort(function(a,b){ return b.length - a.length; });
  names.forEach(function(name){
    var safeName = escapeHtml(name);
    var re = new RegExp('@' + safeName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '(?![A-Za-z])', 'gi');
    safe = safe.replace(re, '<span class="comment-mention">@'+safeName+'</span>');
  });
  return safe;
}

/* ── @-mention autocomplete ──
   Triggered when the user types '@' in the comment textarea. Shows a popover
   of matching team members; arrow keys navigate, Enter/Tab inserts, Esc closes.
   Filters live as you type after the @. */
var _mentionPicker = null;
var _mentionResults = [];
var _mentionSelected = 0;

/* Returns {atIdx, query, endIdx} if the cursor is currently inside an @-token,
   else null. The @ must be at start of input or preceded by whitespace so we
   don't trigger on email addresses. */
function detectMentionContext(input){
  var pos = (typeof input.selectionStart === 'number') ? input.selectionStart : input.value.length;
  var text = input.value;
  var atIdx = -1;
  for(var i = pos - 1; i >= 0; i--){
    var ch = text[i];
    if(ch === '@'){ atIdx = i; break; }
    if(/\s/.test(ch)) return null;        // hit whitespace before finding @
  }
  if(atIdx === -1) return null;
  if(atIdx > 0 && !/\s/.test(text[atIdx - 1])) return null; // @ must follow whitespace
  return { atIdx: atIdx, endIdx: pos, query: text.substring(atIdx + 1, pos) };
}

function onCommentInput(e, taskId){
  var input = e.target;
  var ctx = detectMentionContext(input);
  if(!ctx){ closeMentionPicker(); return; }
  showMentionPicker(taskId, input, ctx.query);
}

function showMentionPicker(taskId, input, query){
  var q = (query || '').toLowerCase();
  var matches = MEMBERS.map(function(m){
    var name = m.name.toLowerCase();
    var score = 0;
    if(!q)                     score = 1;
    else if(name === q)        score = 100;
    else if(name.indexOf(q)===0) score = 80;
    else if(name.indexOf(q)>=0)  score = 50;
    return {m: m, score: score};
  }).filter(function(x){ return x.score > 0; })
    .sort(function(a,b){ return b.score - a.score; })
    .map(function(x){ return x.m; });

  if(!matches.length){ closeMentionPicker(); return; }

  _mentionResults = matches;
  if(_mentionSelected >= matches.length) _mentionSelected = 0;

  if(!_mentionPicker){
    _mentionPicker = document.createElement('div');
    _mentionPicker.className = 'mention-picker';
    document.body.appendChild(_mentionPicker);
  }
  _mentionPicker.innerHTML = matches.map(function(m, i){
    var img = (typeof loadAvatar === 'function') ? loadAvatar(m.name) : null;
    var inner = img ? '<img src="'+img+'" alt="'+escapeHtml(m.name)+'">' : escapeHtml(m.name.substring(0,2).toUpperCase());
    var bg = img ? 'transparent' : m.color;
    return '<button type="button" class="mention-item'+(i===_mentionSelected?' selected':'')+'" data-idx="'+i+'" '
      +    'onmousedown="event.preventDefault();pickMention('+i+')" '
      +    'onmouseenter="hoverMention('+i+')">'
      +    '<span class="mention-av" style="background:'+bg+'">'+inner+'</span>'
      +    '<span class="mention-name">'+escapeHtml(m.name)+'</span>'
      +    '</button>';
  }).join('');

  // Position above the textarea (left-aligned to it). Fixed positioning so
  // it stays put if the modal scrolls.
  var rect = input.getBoundingClientRect();
  _mentionPicker.style.position = 'fixed';
  _mentionPicker.style.left = rect.left + 'px';
  _mentionPicker.style.width = Math.min(rect.width, 280) + 'px';
  // Measure picker height after render, then position above input
  var ph = _mentionPicker.offsetHeight;
  var top = rect.top - ph - 6;
  if(top < 8){ // not enough room above — fall back to below
    top = rect.bottom + 6;
  }
  _mentionPicker.style.top = top + 'px';
}

function closeMentionPicker(){
  if(_mentionPicker){
    _mentionPicker.remove();
    _mentionPicker = null;
  }
  _mentionResults = [];
  _mentionSelected = 0;
}

function hoverMention(idx){
  _mentionSelected = idx;
  updateMentionSelection();
}
function updateMentionSelection(){
  if(!_mentionPicker) return;
  var items = _mentionPicker.querySelectorAll('.mention-item');
  items.forEach(function(el, i){
    el.classList.toggle('selected', i === _mentionSelected);
    if(i === _mentionSelected) el.scrollIntoView({block:'nearest'});
  });
}

function pickMention(idx){
  var m = _mentionResults[idx];
  if(!m) return;
  var input = document.getElementById('td-comment-input');
  if(!input) return;
  var ctx = detectMentionContext(input);
  if(!ctx) return;
  var before = input.value.substring(0, ctx.atIdx);
  var after  = input.value.substring(ctx.endIdx);
  var inserted = '@' + m.name + ' ';
  input.value = before + inserted + after;
  var newPos = before.length + inserted.length;
  input.selectionStart = newPos;
  input.selectionEnd   = newPos;
  input.focus();
  closeMentionPicker();
}

function onCommentInputKey(e, taskId){
  // Mention picker keyboard nav (only when picker is open)
  if(_mentionPicker && _mentionResults.length){
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      _mentionSelected = Math.min(_mentionResults.length - 1, _mentionSelected + 1);
      updateMentionSelection();
      return;
    }
    if(e.key === 'ArrowUp'){
      e.preventDefault();
      _mentionSelected = Math.max(0, _mentionSelected - 1);
      updateMentionSelection();
      return;
    }
    if(e.key === 'Enter' || e.key === 'Tab'){
      e.preventDefault();
      pickMention(_mentionSelected);
      return;
    }
    if(e.key === 'Escape'){
      e.preventDefault();
      closeMentionPicker();
      return;
    }
  }
  // Cmd/Ctrl + Enter sends the comment (existing behavior)
  if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
    e.preventDefault();
    submitCommentInput(taskId);
  }
}
function submitCommentInput(taskId){
  var inp = document.getElementById('td-comment-input');
  if(!inp) return;
  var v = (inp.value||'').trim();
  if(!v) return;
  addComment(taskId, v);
  inp.value = '';
  inp.focus();
  // Scroll the modal so the just-posted comment + input are in view —
  // the comment renders above the input, so scrolling the input into view
  // brings the latest comment along with it.
  setTimeout(function(){
    if(inp && inp.scrollIntoView) inp.scrollIntoView({behavior:'smooth', block:'end'});
  }, 100);
}

/* ── Inline title edit ── double-click any task title in list or board view */
function editTaskTitleInline(id, el){
  var t = tasksData[id];
  if(!t || !el) return;
  var orig = t.title || '';
  var input = document.createElement('input');
  input.type = 'text';
  input.value = orig;
  input.className = 'task-title-inline-edit';
  el.replaceWith(input);
  input.focus();
  input.select();

  var done = false;
  var commit = function(){
    if(done) return; done = true;
    var v = input.value.trim();
    if(v && v !== orig){
      updateTask(id, {title: v});
      showToast('Title updated', '#3AC284');
    } else {
      // No change — re-render as-is
      renderTasksArea();
    }
  };
  var cancel = function(){
    if(done) return; done = true;
    renderTasksArea();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); commit(); }
    else if(e.key === 'Escape'){ e.preventDefault(); cancel(); }
  });
}

/* ── Custom confirm modal (replaces native confirm() for delete + future ops) ──
   Lightweight: builds a centered modal, fades in, returns when user picks. */
function ftConfirm(opts){
  // opts: { title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }
  opts = opts || {};
  var bd = document.createElement('div');
  bd.className = 'ftc-backdrop';
  bd.innerHTML =
    '<div class="ftc-modal" role="dialog" aria-modal="true">'
    +  '<div class="ftc-title">'+escapeHtml(opts.title || 'Confirm')+'</div>'
    +  '<div class="ftc-message">'+escapeHtml(opts.message || '')+'</div>'
    +  '<div class="ftc-actions">'
    +    '<button class="ftc-btn ftc-cancel" type="button">'+escapeHtml(opts.cancelLabel || 'Cancel')+'</button>'
    +    '<button class="ftc-btn '+(opts.danger ? 'ftc-danger' : 'ftc-primary')+'" type="button">'+escapeHtml(opts.confirmLabel || 'Confirm')+'</button>'
    +  '</div>'
    +'</div>';
  document.body.appendChild(bd);
  requestAnimationFrame(function(){ bd.classList.add('show'); });
  var cleanup = function(){
    bd.classList.remove('show');
    setTimeout(function(){ bd.remove(); }, 200);
  };
  var cancelBtn = bd.querySelector('.ftc-cancel');
  var confirmBtn = bd.querySelector('.ftc-btn:not(.ftc-cancel)');
  cancelBtn.onclick = function(){ cleanup(); if(opts.onCancel) opts.onCancel(); };
  confirmBtn.onclick = function(){ cleanup(); if(opts.onConfirm) opts.onConfirm(); };
  bd.onclick = function(e){ if(e.target === bd){ cleanup(); if(opts.onCancel) opts.onCancel(); } };
  // Esc closes
  var keyHandler = function(e){
    if(e.key === 'Escape'){ cleanup(); if(opts.onCancel) opts.onCancel(); document.removeEventListener('keydown', keyHandler); }
    else if(e.key === 'Enter'){ cleanup(); if(opts.onConfirm) opts.onConfirm(); document.removeEventListener('keydown', keyHandler); }
  };
  document.addEventListener('keydown', keyHandler);
  setTimeout(function(){ confirmBtn.focus(); }, 50);
}

/* ── Inline pickers ──
   Click the status pill, priority pill, or assignee chip on any task row /
   kanban card to open a small popover. Pick a value → updateTask runs →
   Firebase syncs → activity feed gets the change event. No drawer needed.
   The popover is a single shared element that gets re-positioned and
   re-populated on each open. Outside-click and Esc close it. */

var _inlinePicker = null;          // current popover element
var _inlinePickerAnchor = null;    // element it's attached to (for toggle)

function closeInlinePicker(){
  if(_inlinePicker){
    _inlinePicker.remove();
    _inlinePicker = null;
    _inlinePickerAnchor = null;
    document.removeEventListener('mousedown', _inlineOutsideHandler, true);
    document.removeEventListener('keydown', _inlineEscHandler, true);
    window.removeEventListener('scroll', closeInlinePicker, true);
    window.removeEventListener('resize', closeInlinePicker);
  }
}
function _inlineOutsideHandler(e){
  if(_inlinePicker && !_inlinePicker.contains(e.target) && e.target !== _inlinePickerAnchor){
    closeInlinePicker();
  }
}
function _inlineEscHandler(e){
  if(e.key === 'Escape'){
    // Stop the drawer's bubble-phase Esc handler from also firing —
    // one Escape press should close one thing (picker), not two.
    e.stopPropagation();
    closeInlinePicker();
  }
}

/* Position the picker below the anchor; flip above if no room; clamp to viewport. */
function _positionInlinePicker(anchor){
  if(!_inlinePicker) return;
  var pop = _inlinePicker;
  var rect = anchor.getBoundingClientRect();
  var pw = pop.offsetWidth;
  var ph = pop.offsetHeight;
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var top = rect.bottom + 4;
  var left = rect.left;
  if(top + ph + 8 > vh && rect.top - ph - 4 > 0) top = rect.top - ph - 4;
  if(left + pw + 8 > vw) left = vw - pw - 8;
  if(left < 8) left = 8;
  pop.style.top = (top + window.scrollY) + 'px';
  pop.style.left = (left + window.scrollX) + 'px';
}
/* Wire outside-click + Esc + scroll/resize close listeners. Deferred so the
   opening click doesn't immediately re-trigger the outside handler. */
function _attachInlineCloseHandlers(){
  setTimeout(function(){
    document.addEventListener('mousedown', _inlineOutsideHandler, true);
    document.addEventListener('keydown', _inlineEscHandler, true);
    window.addEventListener('scroll', closeInlinePicker, true);
    window.addEventListener('resize', closeInlinePicker);
  }, 0);
}

function openInlinePicker(anchor, items, currentValue, onPick){
  // Toggle off if clicking the same anchor twice
  if(_inlinePicker && _inlinePickerAnchor === anchor){
    closeInlinePicker();
    return;
  }
  closeInlinePicker();
  var pop = document.createElement('div');
  pop.className = 'inline-picker';
  items.forEach(function(item){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inline-picker-item' + (item.value === currentValue ? ' active' : '');
    btn.innerHTML = item.html;
    btn.onclick = function(e){
      e.stopPropagation();
      onPick(item.value);
      closeInlinePicker();
    };
    pop.appendChild(btn);
  });
  document.body.appendChild(pop);
  _inlinePicker = pop;
  _inlinePickerAnchor = anchor;
  _positionInlinePicker(anchor);
  requestAnimationFrame(function(){ pop.classList.add('show'); });
  _attachInlineCloseHandlers();
}

function openStatusPicker(taskId, anchor){
  var t = tasksData[taskId]; if(!t) return;
  var items = TASK_STATUSES.map(function(s){
    return {
      value: s.v,
      html: '<span class="status-pill s-'+s.v+'" style="pointer-events:none">'+s.l+'</span>'
    };
  });
  openInlinePicker(anchor, items, t.status, function(v){
    if(v !== t.status) updateTask(taskId, {status: v});
  });
}

function openPriorityPicker(taskId, anchor){
  var t = tasksData[taskId]; if(!t) return;
  var items = TASK_PRIORITIES.map(function(p){
    return {
      value: p.v,
      html: '<span class="priority-pill p-'+p.v+'" style="pointer-events:none">'+p.l+'</span>'
    };
  });
  openInlinePicker(anchor, items, t.priority, function(v){
    if(v !== t.priority) updateTask(taskId, {priority: v});
  });
}

function openAssigneePicker(taskId, anchor){
  var t = tasksData[taskId]; if(!t) return;
  var items = [{
    value: '',
    html: '<span class="ip-assignee"><span class="av-mini ip-av-empty">?</span><span class="ip-name ip-name-muted">Unassigned</span></span>'
  }];
  MEMBERS.forEach(function(m){
    var img = (typeof loadAvatar==='function') ? loadAvatar(m.name) : null;
    var inner = img ? '<img src="'+img+'" alt="'+escapeHtml(m.name)+'">' : escapeHtml(m.name.substring(0,2).toUpperCase());
    var bg = img ? 'transparent' : m.color;
    items.push({
      value: m.name,
      html: '<span class="ip-assignee"><span class="av-mini" style="background:'+bg+'">'+inner+'</span><span class="ip-name">'+escapeHtml(m.name)+'</span></span>'
    });
  });
  openInlinePicker(anchor, items, t.assignee || '', function(v){
    var newVal = v || null;
    if(newVal !== t.assignee) updateTask(taskId, {assignee: newVal});
  });
}

/* Due-date picker: quick presets + a native date input + clear (when set).
   Built bespoke (not via openInlinePicker) because it needs a date input
   and a divider rather than a flat list of buttons. */
function openDuePicker(taskId, anchor){
  var t = tasksData[taskId]; if(!t) return;
  if(_inlinePicker && _inlinePickerAnchor === anchor){ closeInlinePicker(); return; }
  closeInlinePicker();

  var pop = document.createElement('div');
  pop.className = 'inline-picker due-picker';

  // Build presets relative to today (noon, to dodge TZ edge cases on display)
  var base = new Date(); base.setHours(12,0,0,0);
  var presets = [
    {label:'Today',     ts: base.getTime()},
    {label:'Tomorrow',  ts: base.getTime() + 86400000},
    {label:'In 3 Days', ts: base.getTime() + 3*86400000},
    {label:'Next Week', ts: base.getTime() + 7*86400000}
  ];
  presets.forEach(function(p){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inline-picker-item';
    var dateLabel = new Date(p.ts).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
    btn.innerHTML = '<span class="due-preset-label">'+p.label+'</span>'
                  + '<span class="due-preset-date">'+dateLabel+'</span>';
    btn.onclick = function(e){
      e.stopPropagation();
      updateTask(taskId, {dueDate: p.ts});
      closeInlinePicker();
    };
    pop.appendChild(btn);
  });

  // Divider
  var div = document.createElement('div');
  div.className = 'inline-picker-divider';
  pop.appendChild(div);

  // Custom date row
  var row = document.createElement('div');
  row.className = 'due-picker-input-row';
  var currentVal = t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '';
  row.innerHTML = '<label class="due-picker-label">Custom</label>'
              + '<input type="date" class="due-picker-date" value="'+currentVal+'">';
  pop.appendChild(row);
  var inp = row.querySelector('input');
  // Prevent the native picker click from triggering the outside-close handler
  inp.addEventListener('mousedown', function(e){ e.stopPropagation(); });
  inp.addEventListener('click', function(e){ e.stopPropagation(); });
  inp.addEventListener('change', function(){
    if(!inp.value){
      updateTask(taskId, {dueDate: null});
    } else {
      var d = new Date(inp.value + 'T12:00:00');
      if(!isNaN(d.getTime())) updateTask(taskId, {dueDate: d.getTime()});
    }
    closeInlinePicker();
  });

  // Clear button (only when a date is currently set)
  if(t.dueDate){
    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'inline-picker-item due-picker-clear';
    clearBtn.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>'
                       + '<span>Clear due date</span>';
    clearBtn.onclick = function(e){
      e.stopPropagation();
      updateTask(taskId, {dueDate: null});
      closeInlinePicker();
    };
    pop.appendChild(clearBtn);
  }

  document.body.appendChild(pop);
  _inlinePicker = pop;
  _inlinePickerAnchor = anchor;
  _positionInlinePicker(anchor);
  requestAnimationFrame(function(){ pop.classList.add('show'); });
  _attachInlineCloseHandlers();
}

/* ── Keyboard shortcuts ──
   N      → open New Task drawer (when Tasks panel is active)
   /      → focus the search input  (when Tasks panel is active)
   Esc    → close drawer (handled by closeTaskDrawer; ftConfirm + inline-edit
            wire their own Esc listeners). We rely on those — this only adds
            N and / so we don't fight existing handlers. */
var _tasksShortcutsBound = false;
function bindTasksShortcuts(){
  if(_tasksShortcutsBound) return;
  _tasksShortcutsBound = true;
  document.addEventListener('keydown', function(e){
    // Skip if typing in any field — never hijack input
    var t = e.target;
    if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    // Only fire when Tasks panel is the visible one
    var panel = document.getElementById('panel-tasks');
    if(!panel || !panel.classList.contains('active')) return;
    // Don't fire if a drawer / confirm is already open
    if(document.getElementById('tdrawer') && document.getElementById('tdrawer').classList.contains('show')) return;
    if(document.querySelector('.ftc-backdrop.show')) return;

    if(e.key === 'n' || e.key === 'N'){
      e.preventDefault();
      openTaskDrawerForNew();
    } else if(e.key === '/'){
      e.preventDefault();
      var s = document.getElementById('tasks-search');
      if(s){ s.focus(); s.select(); }
    } else if(e.key === 'Escape'){
      // Esc on Tasks panel with nothing open → blur whatever has focus (e.g. search)
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
  });
}
// Wire shortcuts as soon as the script loads
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', bindTasksShortcuts);
} else {
  bindTasksShortcuts();
}

/* Tick every second for clock UI updates (button elapsed + sidebar pills + otc card) */
