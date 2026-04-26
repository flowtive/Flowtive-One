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
var _drawerTaskId = null;

function subscribeTasks(){
  if(!firebaseReady || _tasksSubscribed) return;
  _tasksSubscribed = true;
  firebaseDb.ref('flowtive_tasks').on('value', function(snap){
    tasksData = snap.val() || {};
    updateSidebarTasksCount();
    var panel = document.getElementById('panel-tasks');
    if(panel && panel.classList.contains('active')){
      // If the panel hasn't been built yet (no toolbar exists), build it.
      // Otherwise refresh only the task area so search input keeps focus.
      if(!document.getElementById('tasks-area')) renderTasksPanel();
      else renderTasksArea();
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
  var toolbarHtml = renderTasksToolbar();
  body.innerHTML = toolbarHtml + '<div id="tasks-area"></div>';
  renderTasksArea();
  // Wire search input once per panel build (toolbar isn't re-rendered on search keystrokes,
  // so the input keeps focus + cursor position naturally).
  var searchEl = document.getElementById('tasks-search');
  if(searchEl){
    searchEl.addEventListener('input', function(e){
      _taskSearch = e.target.value;
      renderTasksArea();
    });
  }
}

function renderTasksToolbar(){
  var html = '<div class="tasks-toolbar">';
  html +=   '<input type="search" class="tasks-search" id="tasks-search" placeholder="Search tasks…" value="'+escapeHtml(_taskSearch)+'">';
  html +=   '<div class="task-filter-chips">';
  ['all','mine','open','overdue','done'].forEach(function(f){
    var labels={all:'All',mine:'My Tasks',open:'Open',overdue:'Overdue',done:'Done'};
    html += '<button class="'+(_taskFilter===f?'active':'')+'" onclick="setTaskFilter(\''+f+'\')">'+labels[f]+'</button>';
  });
  html +=   '</div>';
  html +=   '<div class="view-toggle">';
  html +=     '<button class="'+(_taskView==='list'?'active':'')+'" onclick="setTaskView(\'list\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h10M2 7h10M2 10h10"/></svg>List</button>';
  html +=     '<button class="'+(_taskView==='board'?'active':'')+'" onclick="setTaskView(\'board\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="1.5" width="3.5" height="11" rx="0.5"/><rect x="6.5" y="1.5" width="3.5" height="7" rx="0.5"/><rect x="11" y="1.5" width="1.5" height="9" rx="0.5"/></svg>Board</button>';
  html +=   '</div>';
  html +=   '<button class="btn-new-task" onclick="openTaskDrawerForNew()"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>New Task</button>';
  html += '</div>';
  return html;
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

function renderTaskList(tasks){
  if(!tasks.length){
    return emptyTaskState();
  }
  // Sort: incomplete first by priority desc + due asc, done last
  var prioWeight = {urgent:4, high:3, medium:2, low:1};
  tasks.sort(function(a,b){
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
  var html = '<div class="task-list">';
  html += '<div class="task-list-head">'
       +    '<div></div>'
       +    '<div>Title</div>'
       +    '<div>Status</div>'
       +    '<div>Priority</div>'
       +    '<div>Assignee</div>'
       +    '<div>Due</div>'
       +    '<div></div>'
       +  '</div>';
  tasks.forEach(function(t){
    html += renderTaskRow(t);
  });
  html += '</div>';
  return html;
}

function renderTaskRow(t){
  var doneClass = t.status==='done' ? 'done' : '';
  var assignee = t.assignee
    ? renderTaskAssignee(t.assignee)
    : '<span class="task-assignee unassigned"><span class="av-mini">?</span>Unassigned</span>';
  var due = t.dueDate
    ? '<span class="task-due '+dueClass(t.dueDate,t.status)+'">'+fmtDueLabel(t.dueDate)+'</span>'
    : '<span class="task-due">—</span>';
  return '<div class="task-row '+doneClass+'" data-id="'+t.id+'" onclick="openTaskDrawer(\''+t.id+'\')">'
    +    '<div class="task-checkbox-cell"><div class="task-cb '+(t.status==='done'?'on':'')+'" onclick="event.stopPropagation();toggleTaskDone(\''+t.id+'\')"></div></div>'
    +    '<div class="task-title-cell"><div class="task-title">'+escapeHtml(t.title||'(Untitled)')+'</div>'
    +      (t.description?'<div class="task-title-sub">'+escapeHtml((t.description||'').substring(0,80))+'</div>':'')
    +    '</div>'
    +    '<div class="task-meta-cell"><span class="status-pill s-'+t.status+'">'+taskStatusLabel(t.status)+'</span></div>'
    +    '<div class="task-meta-cell"><span class="priority-pill p-'+t.priority+'">'+taskPriorityLabel(t.priority)+'</span></div>'
    +    '<div class="task-meta-cell">'+assignee+'</div>'
    +    '<div class="task-meta-cell">'+due+'</div>'
    +    '<div class="task-row-actions">'
    +      '<button title="Delete" onclick="event.stopPropagation();confirmDeleteTask(\''+t.id+'\')"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg></button>'
    +    '</div>'
    +  '</div>';
}

function renderTaskAssignee(name){
  var m = MEMBERS.find(function(x){return x.name===name;}) || {name:name, color:'#6B7280'};
  var img = (typeof loadAvatar==='function') ? loadAvatar(name) : null;
  var inner = img ? '<img src="'+img+'" alt="'+escapeHtml(name)+'">' : escapeHtml(name.substring(0,2).toUpperCase());
  var bg = img ? 'transparent' : m.color;
  return '<span class="task-assignee"><span class="av-mini" style="background:'+bg+'">'+inner+'</span>'+escapeHtml(name)+'</span>';
}

function renderTaskBoard(tasks){
  if(!tasks.length){
    return emptyTaskState();
  }
  var byStatus = {todo:[], in_progress:[], review:[], done:[]};
  tasks.forEach(function(t){ if(byStatus[t.status]) byStatus[t.status].push(t); });
  var prioWeight = {urgent:4, high:3, medium:2, low:1};
  Object.keys(byStatus).forEach(function(s){
    byStatus[s].sort(function(a,b){
      var ap = prioWeight[a.priority]||0, bp = prioWeight[b.priority]||0;
      if(ap !== bp) return bp - ap;
      if(a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      return (b.createdAt||0) - (a.createdAt||0);
    });
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
        ? '<span class="av-mini" style="background:'+bg+'" title="'+escapeHtml(t.assignee)+'">'+inner+'</span>'
        : '';
      var dueHtml = t.dueDate ? '<span class="task-due '+dueClass(t.dueDate,t.status)+'">'+fmtDueLabel(t.dueDate)+'</span>' : '';
      html += '<div class="kanban-card" draggable="true" data-id="'+t.id+'" ondragstart="onTaskDragStart(event,\''+t.id+'\')" ondragend="onTaskDragEnd(event)" onclick="openTaskDrawer(\''+t.id+'\')">'
           +    '<div class="kanban-card-title">'+escapeHtml(t.title||'(Untitled)')+'</div>'
           +    '<div class="kanban-card-meta">'
           +      '<span class="priority-pill p-'+t.priority+'">'+taskPriorityLabel(t.priority)+'</span>'
           +      dueHtml
           +      avHtml
           +    '</div>'
           +  '</div>';
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function emptyTaskState(){
  return '<div class="task-list"><div class="task-empty">'
    +      '<div class="task-empty-icon">📋</div>'
    +      '<div class="task-empty-title">No tasks yet</div>'
    +      '<div class="task-empty-sub">Create your first task to get started.</div>'
    +      '<button class="btn-new-task" style="margin:0 auto" onclick="openTaskDrawerForNew()">+ New Task</button>'
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
  if(confirm('Delete this task?\n\n"'+t.title+'"\n\nThis cannot be undone.')){
    deleteTask(id);
  }
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

function showTaskDrawer(t, isNew){
  // Build the drawer fresh each time (rebuilds inputs)
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

  dr.innerHTML =
    '<div class="tdrawer-head">'
    +  '<div style="font-size:14px;font-weight:600">'+(isNew?'New Task':'Edit Task')+'</div>'
    +  '<button class="tdrawer-close" onclick="closeTaskDrawer()" type="button">&times;</button>'
    +'</div>'
    +'<div class="tdrawer-body">'
    +  '<div class="tdrawer-field">'
    +    '<label class="tdrawer-label">Title</label>'
    +    '<input class="tdrawer-input" id="td-title" type="text" value="'+escapeHtml(t.title||'')+'" placeholder="Task title…" autofocus>'
    +  '</div>'
    +  '<div class="tdrawer-field">'
    +    '<label class="tdrawer-label">Description</label>'
    +    '<textarea class="tdrawer-textarea" id="td-desc" placeholder="What needs to be done…">'+escapeHtml(t.description||'')+'</textarea>'
    +  '</div>'
    +  '<div class="tdrawer-grid2">'
    +    '<div class="tdrawer-field"><label class="tdrawer-label">Status</label><select class="tdrawer-select" id="td-status">'+statusOpts+'</select></div>'
    +    '<div class="tdrawer-field"><label class="tdrawer-label">Priority</label><select class="tdrawer-select" id="td-priority">'+prioOpts+'</select></div>'
    +  '</div>'
    +  '<div class="tdrawer-grid2">'
    +    '<div class="tdrawer-field"><label class="tdrawer-label">Assignee</label><select class="tdrawer-select" id="td-assignee">'+assigneeOpts+'</select></div>'
    +    '<div class="tdrawer-field"><label class="tdrawer-label">Due Date</label><input class="tdrawer-input" id="td-due" type="date" value="'+dueVal+'"></div>'
    +  '</div>'
    +  (isNew ? '' :
       '<div class="tdrawer-meta">'
       +  'Created by '+escapeHtml(t.createdBy||'—')+' · '+formatTimeAgo(t.createdAt)
       +  (t.updatedAt && t.updatedAt !== t.createdAt ? ' · Updated '+formatTimeAgo(t.updatedAt) : '')
       +  (t.completedAt ? ' · Completed '+formatTimeAgo(t.completedAt) : '')
       + '</div>')
    +'</div>'
    +'<div class="tdrawer-foot">'
    +  (isNew ? '' : '<button class="delete" onclick="confirmDeleteTask(\''+t.id+'\')">Delete</button>')
    +  '<button class="save" onclick="saveTaskFromDrawer('+(isNew?'true':'false')+')">'+(isNew?'Create Task':'Save Changes')+'</button>'
    +'</div>';

  bd.classList.add('show');
  // Defer add of show class so transition runs
  requestAnimationFrame(function(){ dr.classList.add('show'); });
  setTimeout(function(){
    var ti = document.getElementById('td-title'); if(ti) ti.focus();
  }, 250);
}

function closeTaskDrawer(){
  var bd = document.getElementById('tdrawer-backdrop');
  var dr = document.getElementById('tdrawer');
  if(dr) dr.classList.remove('show');
  if(bd) bd.classList.remove('show');
  _drawerTaskId = null;
}

function saveTaskFromDrawer(isNew){
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
    var d = new Date(dueRaw + 'T12:00:00'); // noon to avoid TZ edge cases
    if(!isNaN(d.getTime())) data.dueDate = d.getTime();
  }
  if(!data.title){ showToast('Title Is Required'); return; }
  if(isNew){
    var newId = createTask(data);
    showToast('Task Created');
  } else {
    if(!_drawerTaskId) return;
    updateTask(_drawerTaskId, data);
    showToast('Task Saved');
  }
  closeTaskDrawer();
}

/* Tick every second for clock UI updates (button elapsed + sidebar pills + otc card) */
