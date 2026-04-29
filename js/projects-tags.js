/* Flowtive One — Projects + Tags
   Phase 3 of the Time Tracker rebuild. Adds a simple project list + tag
   list, both stored in Firebase. Time entries can be assigned a single
   project (with color) and any number of tags. */

var projectsData = {};       // {id: {id, name, color, archived?, createdAt, createdBy}}
var tagsData     = {};       // {id: {id, name, archived?, createdAt, createdBy}}
var _projectsSubscribed = false;
var _tagsSubscribed = false;

/* Default palette offered when creating a new project. Picks rotate through
   so two-clicks-create gives reasonable variety without forcing a color pick. */
var PROJECT_COLORS = [
  '#10B981', '#03A9F4', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#6366F1',
  '#F97316', '#84CC16', '#06B6D4', '#A855F7',
  // Neutral grays for "background" projects (Admin, Overhead, Internal)
  // — gives users a way to visually de-emphasize utility projects.
  '#94A3B8', '#64748B', '#475569'
];

/* ── Subscriptions ────────────────────────────────────────────── */
function subscribeProjects(){
  if(!firebaseReady || _projectsSubscribed) return;
  _projectsSubscribed = true;
  firebaseDb.ref('flowtive_projects').on('value', function(snap){
    projectsData = snap.val() || {};
    _onProjectsOrTagsChange();
  }, function(err){
    try{ console.warn('[projects-tags] could not read flowtive_projects:', err && (err.code || err.message)); }catch(e){}
  });
}
function subscribeTags(){
  if(!firebaseReady || _tagsSubscribed) return;
  _tagsSubscribed = true;
  firebaseDb.ref('flowtive_tags').on('value', function(snap){
    tagsData = snap.val() || {};
    _onProjectsOrTagsChange();
  }, function(err){
    try{ console.warn('[projects-tags] could not read flowtive_tags:', err && (err.code || err.message)); }catch(e){}
  });
}
function unsubscribeProjects(){
  if(firebaseReady && firebaseDb){ try{ firebaseDb.ref('flowtive_projects').off(); }catch(e){} }
  _projectsSubscribed = false; projectsData = {};
}
function unsubscribeTags(){
  if(firebaseReady && firebaseDb){ try{ firebaseDb.ref('flowtive_tags').off(); }catch(e){} }
  _tagsSubscribed = false; tagsData = {};
}
function _onProjectsOrTagsChange(){
  // Re-render whichever panel is currently active so chips/colors refresh
  var p1 = document.getElementById('panel-time-projects');
  if(p1 && p1.classList.contains('active') && typeof renderProjectsPanel === 'function') renderProjectsPanel();
  var p2 = document.getElementById('panel-time-tags');
  if(p2 && p2.classList.contains('active') && typeof renderTagsPanel === 'function') renderTagsPanel();
  var p3 = document.getElementById('panel-time');
  if(p3 && p3.classList.contains('active') && typeof renderTimeTrackerPanel === 'function') renderTimeTrackerPanel();
  var p4 = document.getElementById('panel-time-calendar');
  if(p4 && p4.classList.contains('active') && typeof renderTimeCalendarPanel === 'function') renderTimeCalendarPanel();
  var p5 = document.getElementById('panel-time-reports');
  if(p5 && p5.classList.contains('active') && typeof renderTimeReportsPanel === 'function') renderTimeReportsPanel();
  var p6 = document.getElementById('panel-time-timesheet');
  if(p6 && p6.classList.contains('active') && typeof renderTimeTimesheetPanel === 'function') renderTimeTimesheetPanel();
}

/* Shared error logger — surfaces the real Firebase reason in console
   AND in the toast, instead of swallowing it as a generic "Save Failed".
   Most common cause of these errors is Firebase Realtime Database
   security rules denying writes/reads to a path. */
function _ptHandleFbError(action, err){
  var code = err && (err.code || err.message);
  try{ console.error('[projects-tags] '+action+' failed:', code || err); }catch(e){}
  showToast(action + ' failed' + (code ? ' · ' + code : ''), 'danger');
}

/* ── CRUD: Projects ──────────────────────────────────────────── */
function createProject(name, color){
  if(!firebaseReady || !currentUser) return null;
  var trimmed = (name||'').trim();
  if(!trimmed) return null;
  // Reject duplicate names case-insensitively (parity with createTag).
  // Without this you can create five projects called "Marketing" and the
  // pickers + reports get confusing fast.
  var dup = Object.values(projectsData||{}).find(function(p){
    return p && p.name && p.name.toLowerCase() === trimmed.toLowerCase();
  });
  if(dup){
    showToast('Project "'+dup.name+'" already exists', 'warning');
    return null;
  }
  // Pick next color if none provided
  if(!color){
    var existing = Object.keys(projectsData||{}).length;
    color = PROJECT_COLORS[existing % PROJECT_COLORS.length];
  }
  var ref = firebaseDb.ref('flowtive_projects').push();
  var id = ref.key;
  var rec = {
    id: id, name: trimmed, color: color,
    createdAt: Date.now(), createdBy: currentUser.name
  };
  // Optimistic local write so any UI rendered in the same tick (e.g. the
  // tracker bar's project picker) sees the new project without waiting
  // for the on('value') listener to fire. If the Firebase write fails
  // (rules denied / offline), we ROLL BACK the optimistic entry so the
  // UI doesn't lie about success.
  projectsData[id] = rec;
  ref.set(rec).catch(function(err){
    _ptHandleFbError('Create project', err);
    // Rollback: drop the optimistic entry + re-render so the failed
    // create disappears from the list. (The error toast already explains.)
    if(projectsData[id]) delete projectsData[id];
    // Any session whose projectId was optimistically set to this id (e.g.
    // the tracker bar committed the picker selection while the project
    // create was in-flight) is now pointing at a deleted project. Clear
    // both the local copy and the persisted Firebase record so we don't
    // leave orphaned references that the UI silently hides.
    if(typeof clockSessions === 'object' && clockSessions){
      Object.keys(clockSessions).forEach(function(sid){
        if(clockSessions[sid] && clockSessions[sid].projectId === id){
          clockSessions[sid].projectId = null;
          if(firebaseReady){
            firebaseDb.ref('flowtive_time_sessions/'+sid+'/projectId').set(null).catch(function(){});
          }
        }
      });
    }
    if(typeof _onProjectsOrTagsChange === 'function') _onProjectsOrTagsChange();
  });
  // Defer the panel re-render to the next microtask so the calling
  // handler (e.g. onProjectAddSubmit) can finish clearing/refocusing
  // the input before this tears the DOM out from under it.
  if(typeof _onProjectsOrTagsChange === 'function'){
    setTimeout(_onProjectsOrTagsChange, 0);
  }
  return id;
}
function updateProject(id, patch){
  if(!firebaseReady || !id) return;
  if(!projectsData[id]) return;
  firebaseDb.ref('flowtive_projects/'+id).update(patch).catch(function(err){ _ptHandleFbError('Update project', err); });
}
function deleteProject(id){
  if(!firebaseReady || !id) return;
  var existing = projectsData && projectsData[id];
  var snapshot = null;
  if(existing){
    snapshot = {};
    Object.keys(existing).forEach(function(k){ snapshot[k] = existing[k]; });
  }
  firebaseDb.ref('flowtive_projects/'+id).remove().catch(function(err){ _ptHandleFbError('Delete project', err); });
  if(snapshot && typeof showUndoToast === 'function'){
    showUndoToast(
      'Project deleted',
      function(){
        firebaseDb.ref('flowtive_projects/'+id).set(snapshot).catch(function(err){ _ptHandleFbError('Restore project', err); });
      },
      null
    );
  }
}
function getProject(id){ return id && projectsData[id] ? projectsData[id] : null; }

/* ── CRUD: Tags ─────────────────────────────────────────────── */
function createTag(name){
  if(!firebaseReady || !currentUser) return null;
  var trimmed = (name||'').trim();
  if(!trimmed) return null;
  var ref = firebaseDb.ref('flowtive_tags').push();
  var id = ref.key;
  var rec = {
    id: id, name: trimmed,
    createdAt: Date.now(), createdBy: currentUser.name
  };
  // Optimistic local write — same pattern as createProject (F7). On
  // Firebase rejection, roll back so the UI doesn't lie about success.
  tagsData[id] = rec;
  ref.set(rec).catch(function(err){
    _ptHandleFbError('Create tag', err);
    if(tagsData[id]) delete tagsData[id];
    if(typeof _onProjectsOrTagsChange === 'function') _onProjectsOrTagsChange();
  });
  // Defer the panel re-render so the calling handler (onTagAddSubmit)
  // can finish clearing/refocusing the input before the DOM is replaced.
  if(typeof _onProjectsOrTagsChange === 'function'){
    setTimeout(_onProjectsOrTagsChange, 0);
  }
  return id;
}
function updateTag(id, patch){
  if(!firebaseReady || !id) return;
  if(!tagsData[id]) return;
  firebaseDb.ref('flowtive_tags/'+id).update(patch).catch(function(err){ _ptHandleFbError('Update tag', err); });
}
function deleteTag(id){
  if(!firebaseReady || !id) return;
  var existing = tagsData && tagsData[id];
  var snapshot = null;
  if(existing){
    snapshot = {};
    Object.keys(existing).forEach(function(k){ snapshot[k] = existing[k]; });
  }
  firebaseDb.ref('flowtive_tags/'+id).remove().catch(function(err){ _ptHandleFbError('Delete tag', err); });
  if(snapshot && typeof showUndoToast === 'function'){
    showUndoToast(
      'Tag deleted',
      function(){
        firebaseDb.ref('flowtive_tags/'+id).set(snapshot).catch(function(err){ _ptHandleFbError('Restore tag', err); });
      },
      null
    );
  }
}
function getTag(id){ return id && tagsData[id] ? tagsData[id] : null; }

/* ── Projects management panel ──────────────────────────────── */
function renderProjectsPanel(){
  var body = document.getElementById('time-projects-body');
  if(!body) return;
  // Preserve keyboard focus + caret across re-renders. If the user was
  // typing in any input inside the panel (add-input or a row's name
  // input), record enough state to restore focus on the matching element
  // after innerHTML is replaced. Without this, optimistic re-renders
  // (F7) would silently kill focus after every Add or rename.
  var focusKey = _ptCaptureFocus(body);
  var rows = Object.values(projectsData||{}).filter(Boolean);
  rows.sort(function(a,b){ return (a.createdAt||0) - (b.createdAt||0); });

  // Compute per-project total tracked time from clockSessions (this week + all-time)
  var totals = {};
  Object.values(clockSessions||{}).forEach(function(s){
    if(!s || !s.projectId || !s.durationMs) return;
    totals[s.projectId] = (totals[s.projectId]||0) + s.durationMs;
  });

  var html = ''
    + '<div class="pt-add-row">'
    +   '<input type="text" class="pt-add-input" id="proj-add-input" placeholder="New project name…" maxlength="60">'
    +   '<button class="pt-add-btn" onclick="onProjectAddSubmit()">Add Project</button>'
    + '</div>';

  if(!rows.length){
    html += '<div class="pt-empty">'
      +    '<div class="pt-empty-icon">📁</div>'
      +    '<div class="pt-empty-title">No projects yet</div>'
      +    '<div class="pt-empty-sub">Create one above to start grouping your tracked time.</div>'
      +    '</div>';
  } else {
    html += '<div class="pt-list">';
    rows.forEach(function(p){
      var totalMs = totals[p.id] || 0;
      html += '<div class="pt-row">'
        +    '<button class="pt-color-swatch" style="background:'+p.color+'" title="Change color" onclick="openProjectColorPicker(\''+p.id+'\', this)"></button>'
        +    '<input type="text" class="pt-name-input" value="'+escapeHtml(p.name)+'" data-project-id="'+p.id+'" onblur="onProjectNameBlur(this)" onkeydown="if(event.key===\'Enter\'){this.blur();}">'
        +    '<span class="pt-row-meta">'+(totalMs ? _ptFmtHM(totalMs)+' tracked' : 'No time tracked')+'</span>'
        +    '<button class="pt-row-del" title="Delete project" onclick="confirmDeleteProject(\''+p.id+'\')">'
        +      '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg>'
        +    '</button>'
        +    '</div>';
    });
    html += '</div>';
  }
  body.innerHTML = html;
  // Wire enter-on-input-to-add
  var addInp = document.getElementById('proj-add-input');
  if(addInp){
    addInp.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); onProjectAddSubmit(); }
    });
  }
  _ptRestoreFocus(body, focusKey);
}

/* Capture which input within `root` is focused, plus its caret state, so a
   re-render can restore focus to the structurally-equivalent element
   afterwards. Returns null when no focused descendant. */
function _ptCaptureFocus(root){
  var el = document.activeElement;
  if(!el || !root.contains(el)) return null;
  var key = null;
  if(el.id === 'proj-add-input' || el.id === 'tag-add-input'){
    key = { type:'add', id: el.id };
  } else if(el.classList && el.classList.contains('pt-name-input')){
    var pid = el.getAttribute('data-project-id') || el.getAttribute('data-tag-id');
    if(pid) key = { type:'name', pid: pid };
  }
  if(key && (el.selectionStart != null)){
    key.selStart = el.selectionStart;
    key.selEnd = el.selectionEnd;
  }
  return key;
}
function _ptRestoreFocus(root, key){
  if(!key) return;
  var target = null;
  if(key.type === 'add'){
    target = root.querySelector('#'+key.id);
  } else if(key.type === 'name'){
    target = root.querySelector('input[data-project-id="'+key.pid+'"]')
          || root.querySelector('input[data-tag-id="'+key.pid+'"]');
  }
  if(!target) return;
  target.focus();
  if(key.selStart != null && target.setSelectionRange){
    try{ target.setSelectionRange(key.selStart, key.selEnd); }catch(e){}
  }
}

function onProjectAddSubmit(){
  var inp = document.getElementById('proj-add-input');
  if(!inp) return;
  var v = (inp.value||'').trim();
  if(!v){ inp.focus(); return; }
  createProject(v);
  inp.value = '';
  inp.focus();
  showToast('Project created', 'success');
}

function onProjectNameBlur(inp){
  var id = inp.getAttribute('data-project-id');
  var p = projectsData[id]; if(!p) return;
  var v = (inp.value||'').trim();
  if(!v){ inp.value = p.name; return; }      // refuse empty
  if(v !== p.name) updateProject(id, {name: v});
}

function confirmDeleteProject(id){
  var p = projectsData[id]; if(!p) return;
  // Find all sessions referencing this project — needed for both the count
  // shown in the dialog AND for the orphan-cleanup actions below.
  var refIds = [];
  Object.keys(clockSessions||{}).forEach(function(sid){
    if(clockSessions[sid] && clockSessions[sid].projectId === id) refIds.push(sid);
  });
  // Zero references → simple delete with the existing undo toast (no prompt).
  if(refIds.length === 0){ deleteProject(id); return; }
  // Otherwise open the 3-button flow: Move / Delete entries / Cancel.
  _ptOpenDeleteProjectFlow(id, refIds);
}

/* Three-button modal: "Move to No project" (recommended) · "Delete entries
   too" (danger) · "Cancel". Built bespoke because ftConfirm is two-button.
   Both destructive paths show an undo toast that can restore the project +
   the original entry assignments together. */
function _ptOpenDeleteProjectFlow(id, refIds){
  var p = projectsData[id]; if(!p) return;
  var bd = document.createElement('div');
  bd.className = 'ftc-backdrop';
  var n = refIds.length;
  bd.innerHTML =
    '<div class="ftc-modal" role="dialog" aria-modal="true">'
    +  '<div class="ftc-title">Delete "'+escapeHtml(p.name)+'"?</div>'
    +  '<div class="ftc-message">'
    +    n+' time entr'+(n===1?'y is':'ies are')+' assigned to this project. What should happen to '
    +    (n===1?'it':'them')+'?'
    +  '</div>'
    +  '<div class="ftc-actions ftc-actions-stack">'
    +    '<button class="ftc-btn ftc-primary" type="button" data-act="move">Move to No project</button>'
    +    '<button class="ftc-btn ftc-danger" type="button" data-act="delete">Delete entries too</button>'
    +    '<button class="ftc-btn ftc-cancel" type="button" data-act="cancel">Cancel</button>'
    +  '</div>'
    +'</div>';
  document.body.appendChild(bd);
  requestAnimationFrame(function(){ bd.classList.add('show'); });
  function cleanup(){ bd.classList.remove('show'); setTimeout(function(){ bd.remove(); }, 200); document.removeEventListener('keydown', keyHandler); }
  var keyHandler = function(e){ if(e.key === 'Escape'){ cleanup(); } };
  document.addEventListener('keydown', keyHandler);
  bd.onclick = function(e){ if(e.target === bd) cleanup(); };
  bd.querySelectorAll('.ftc-btn').forEach(function(b){
    b.onclick = function(){
      var act = b.getAttribute('data-act');
      cleanup();
      if(act === 'move')   _ptDeleteProjectMoveEntries(id, refIds);
      if(act === 'delete') _ptDeleteProjectAndEntries(id, refIds);
      // 'cancel' = no-op
    };
  });
  setTimeout(function(){ var primary = bd.querySelector('.ftc-primary'); if(primary) primary.focus(); }, 50);
}

/* Soft path — keep the time entries, just nullify their projectId, then
   remove the project. Undo restores both. */
function _ptDeleteProjectMoveEntries(id, refIds){
  if(!firebaseReady) return;
  var existing = projectsData && projectsData[id];
  var projectSnap = existing ? Object.assign({}, existing) : null;
  // Snapshot current projectId per affected session so undo can restore it.
  var entrySnaps = {};
  refIds.forEach(function(sid){
    if(clockSessions[sid]) entrySnaps[sid] = clockSessions[sid].projectId;
  });
  // Apply: clear projectId on each session, then remove the project.
  refIds.forEach(function(sid){
    firebaseDb.ref('flowtive_time_sessions/'+sid+'/projectId').set(null).catch(function(err){ _ptHandleFbError('Update entry project', err); });
  });
  firebaseDb.ref('flowtive_projects/'+id).remove().catch(function(err){ _ptHandleFbError('Delete project', err); });
  if(projectSnap && typeof showUndoToast === 'function'){
    showUndoToast(
      'Project deleted · '+refIds.length+' entr'+(refIds.length===1?'y':'ies')+' moved',
      function(){
        firebaseDb.ref('flowtive_projects/'+id).set(projectSnap).catch(function(err){ _ptHandleFbError('Restore project', err); });
        Object.keys(entrySnaps).forEach(function(sid){
          firebaseDb.ref('flowtive_time_sessions/'+sid+'/projectId').set(entrySnaps[sid] || null).catch(function(err){ _ptHandleFbError('Restore entry project', err); });
        });
      },
      null
    );
  }
}

/* Hard path — delete the project AND every session that referenced it.
   Undo restores the project + every entry from snapshots. */
function _ptDeleteProjectAndEntries(id, refIds){
  if(!firebaseReady) return;
  var existing = projectsData && projectsData[id];
  var projectSnap = existing ? Object.assign({}, existing) : null;
  var entrySnaps = {};
  refIds.forEach(function(sid){
    if(clockSessions[sid]) entrySnaps[sid] = Object.assign({}, clockSessions[sid]);
  });
  // Apply: remove sessions, then the project.
  refIds.forEach(function(sid){
    firebaseDb.ref('flowtive_time_sessions/'+sid).remove().catch(function(err){ _ptHandleFbError('Delete entry', err); });
  });
  firebaseDb.ref('flowtive_projects/'+id).remove().catch(function(err){ _ptHandleFbError('Delete project', err); });
  if(projectSnap && typeof showUndoToast === 'function'){
    showUndoToast(
      'Project + '+refIds.length+' entr'+(refIds.length===1?'y':'ies')+' deleted',
      function(){
        firebaseDb.ref('flowtive_projects/'+id).set(projectSnap).catch(function(err){ _ptHandleFbError('Restore project', err); });
        Object.keys(entrySnaps).forEach(function(sid){
          firebaseDb.ref('flowtive_time_sessions/'+sid).set(entrySnaps[sid]).catch(function(err){ _ptHandleFbError('Restore entry', err); });
        });
      },
      null
    );
  }
}

/* Color picker — uses the same inline-picker engine as the task pickers */
function openProjectColorPicker(projectId, anchor){
  var p = projectsData[projectId]; if(!p) return;
  if(typeof openInlinePicker !== 'function') return;
  var items = PROJECT_COLORS.map(function(c){
    return {
      value: c,
      html: '<span class="pt-color-row"><span class="pt-color-dot" style="background:'+c+'"></span><span class="pt-color-hex">'+c+'</span></span>'
    };
  });
  openInlinePicker(anchor, items, p.color, function(v){
    if(v && v !== p.color) updateProject(projectId, {color: v});
  });
}

/* ── Tags management panel ─────────────────────────────────── */
function renderTagsPanel(){
  var body = document.getElementById('time-tags-body');
  if(!body) return;
  // Preserve keyboard focus across re-renders (see renderProjectsPanel comment)
  var focusKey = _ptCaptureFocus(body);
  var rows = Object.values(tagsData||{}).filter(Boolean);
  rows.sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });

  // How many entries use each tag
  var counts = {};
  Object.values(clockSessions||{}).forEach(function(s){
    if(!s || !s.tags || !Array.isArray(s.tags)) return;
    s.tags.forEach(function(tid){ counts[tid] = (counts[tid]||0) + 1; });
  });

  var html = ''
    + '<div class="pt-add-row">'
    +   '<input type="text" class="pt-add-input" id="tag-add-input" placeholder="New tag name (e.g. Outreach, Meetings)…" maxlength="40">'
    +   '<button class="pt-add-btn" onclick="onTagAddSubmit()">Add Tag</button>'
    + '</div>';

  if(!rows.length){
    html += '<div class="pt-empty">'
      +    '<div class="pt-empty-icon">🏷️</div>'
      +    '<div class="pt-empty-title">No tags yet</div>'
      +    '<div class="pt-empty-sub">Tags are cross-project labels — handy for marking entries as Outreach, Admin, Meetings, etc.</div>'
      +    '</div>';
  } else {
    html += '<div class="pt-tag-grid">';
    rows.forEach(function(t){
      var n = counts[t.id] || 0;
      html += '<div class="pt-tag-row">'
        +    '<input type="text" class="pt-name-input" value="'+escapeHtml(t.name)+'" data-tag-id="'+t.id+'" onblur="onTagNameBlur(this)" onkeydown="if(event.key===\'Enter\'){this.blur();}">'
        +    '<span class="pt-row-meta">'+n+' entr'+(n===1?'y':'ies')+'</span>'
        +    '<button class="pt-row-del" title="Delete tag" onclick="confirmDeleteTag(\''+t.id+'\')">'
        +      '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 8h5L10 4"/></svg>'
        +    '</button>'
        +    '</div>';
    });
    html += '</div>';
  }
  body.innerHTML = html;
  var addInp = document.getElementById('tag-add-input');
  if(addInp){
    addInp.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); onTagAddSubmit(); }
    });
  }
  _ptRestoreFocus(body, focusKey);
}

function onTagAddSubmit(){
  var inp = document.getElementById('tag-add-input');
  if(!inp) return;
  var v = (inp.value||'').trim();
  if(!v){ inp.focus(); return; }
  // Refuse duplicates (case-insensitive)
  var dup = Object.values(tagsData||{}).find(function(t){ return t && t.name && t.name.toLowerCase() === v.toLowerCase(); });
  if(dup){ showToast('Tag "'+dup.name+'" already exists'); inp.focus(); return; }
  createTag(v);
  inp.value = '';
  inp.focus();
  showToast('Tag created', 'success');
}

function onTagNameBlur(inp){
  var id = inp.getAttribute('data-tag-id');
  var t = tagsData[id]; if(!t) return;
  var v = (inp.value||'').trim();
  if(!v){ inp.value = t.name; return; }
  if(v !== t.name) updateTag(id, {name: v});
}

function confirmDeleteTag(id){
  var t = tagsData[id]; if(!t) return;
  // Find every session that references this tag — needed both for the
  // count in the dialog AND for the undo to restore those references.
  var refSids = [];
  Object.keys(clockSessions||{}).forEach(function(sid){
    var s = clockSessions[sid];
    if(s && Array.isArray(s.tags) && s.tags.indexOf(id) >= 0) refSids.push(sid);
  });
  var refCount = refSids.length;
  var msg = '"'+t.name+'" will be removed.';
  if(refCount) msg += ' '+refCount+' time entr'+(refCount===1?'y has':'ies have')+' this tag — they will lose the tag (times are kept).';
  ftConfirm({
    title: 'Delete tag?',
    message: msg,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    danger: true,
    onConfirm: function(){
      // Snapshot the tag itself + every affected session's tag list so a
      // single undo restores the lot. Bypass deleteTag's built-in undo
      // (it only restores the tag, not the references — which left
      // entries un-tagged after undo).
      var tagSnap = Object.assign({}, t);
      var sessionTagSnaps = {};
      refSids.forEach(function(sid){
        if(clockSessions[sid] && Array.isArray(clockSessions[sid].tags)){
          sessionTagSnaps[sid] = clockSessions[sid].tags.slice();
        }
      });
      // Apply: clear tag from each session, then remove the tag itself.
      refSids.forEach(function(sid){
        var s = clockSessions[sid];
        if(s && Array.isArray(s.tags) && s.tags.indexOf(id) >= 0){
          var clean = s.tags.filter(function(x){ return x !== id; });
          firebaseDb.ref('flowtive_time_sessions/'+sid+'/tags').set(clean.length ? clean : null).catch(function(err){ _ptHandleFbError('Update entry tags', err); });
        }
      });
      firebaseDb.ref('flowtive_tags/'+id).remove().catch(function(err){ _ptHandleFbError('Delete tag', err); });
      // One undo toast that restores BOTH the tag AND its references.
      if(typeof showUndoToast === 'function'){
        showUndoToast(
          refCount ? ('Tag deleted · ' + refCount + ' entr' + (refCount===1?'y':'ies') + ' updated') : 'Tag deleted',
          function(){
            firebaseDb.ref('flowtive_tags/'+id).set(tagSnap).catch(function(err){ _ptHandleFbError('Restore tag', err); });
            Object.keys(sessionTagSnaps).forEach(function(sid){
              var arr = sessionTagSnaps[sid];
              firebaseDb.ref('flowtive_time_sessions/'+sid+'/tags').set(arr && arr.length ? arr : null).catch(function(err){ _ptHandleFbError('Restore entry tags', err); });
            });
          },
          null
        );
      }
    }
  });
}

/* Close every picker this module owns. Called by dialogs/drawers when
   they close so any picker opened from inside them goes away with the
   parent surface (otherwise the picker pop is appended to body and would
   linger after the dialog disappears). */
function closeAllPtPickers(){
  if(typeof closeInlinePicker === 'function') closeInlinePicker();
  if(_projectPickerCurrent){ _projectPickerCurrent.cleanup(); _projectPickerCurrent = null; }
  if(_tagPickerCurrent){ _tagPickerCurrent.cleanup(); _tagPickerCurrent = null; }
}

/* ── Project picker (single-select, used by tracker bar + dialogs) ──
   Custom popover — same shape as the tag picker so users get inline
   "type a name + Enter to create" behavior without a separate prompt
   modal. Single-select: clicking a row commits + closes. */
var _projectPickerCurrent = null;
function openProjectPicker(currentId, anchor, onPick){
  closeInlinePicker();   // dismiss any single-select picker that's open
  if(_projectPickerCurrent){ _projectPickerCurrent.cleanup(); _projectPickerCurrent = null; }
  // Mutually exclusive with the tag picker — only one shows at a time so
  // the user isn't stacking two overlays inside a dialog.
  if(_tagPickerCurrent){ _tagPickerCurrent.cleanup(); _tagPickerCurrent = null; }

  var pop = document.createElement('div');
  pop.className = 'inline-picker pt-tag-picker';   // reuse tag picker styling

  function _projectRows(){
    return Object.values(projectsData||{}).filter(Boolean)
             .sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
  }
  function _rowHtml(p, on){
    return '<button type="button" class="pt-tag-picker-row pt-proj-pick-row'+(on?' on':'')+'" data-project-id="'+p.id+'">'
      +    '<span class="pt-tag-picker-check">'+(on?'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5l2 2 4-4.5"/></svg>':'')+'</span>'
      +    '<span class="pt-pick-dot" style="background:'+p.color+'"></span>'
      +    '<span class="pt-tag-picker-name">'+escapeHtml(p.name)+'</span>'
      +    '</button>';
  }
  function _noProjectRowHtml(on){
    return '<button type="button" class="pt-tag-picker-row'+(on?' on':'')+'" data-project-id="">'
      +    '<span class="pt-tag-picker-check">'+(on?'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5l2 2 4-4.5"/></svg>':'')+'</span>'
      +    '<span class="pt-pick-dot" style="background:transparent;border:1px dashed var(--border)"></span>'
      +    '<span class="pt-tag-picker-name pt-pick-muted">No project</span>'
      +    '</button>';
  }
  function _wireRows(scope){
    scope.querySelectorAll('.pt-tag-picker-row').forEach(function(btn){
      btn.addEventListener('mousedown', function(e){
        e.preventDefault();
        var id = btn.getAttribute('data-project-id');
        commit(id || null);
      });
    });
  }
  function render(){
    var rows = _projectRows();
    var html = '<div class="pt-tag-picker-search">'
      +    '<input type="text" class="pt-tag-picker-input" id="proj-pick-input" placeholder="Filter or add new…" autocomplete="off">'
      +  '</div>'
      +  '<div class="pt-tag-picker-list">';
    html += _noProjectRowHtml(!currentId);
    rows.forEach(function(p){ html += _rowHtml(p, currentId === p.id); });
    html += '</div>'
      +  '<div class="pt-tag-picker-foot pt-proj-pick-foot">'
      +    '<span class="pt-tag-picker-foot-hint">Type + Enter to create</span>'
      +  '</div>';
    pop.innerHTML = html;
    _wireRows(pop);
    var inp = pop.querySelector('#proj-pick-input');
    if(inp){
      inp.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          var v = (inp.value||'').trim();
          if(!v) return;
          // If it matches an existing project (case-insensitive), select that.
          var dup = _projectRows().find(function(p){ return p.name && p.name.toLowerCase() === v.toLowerCase(); });
          if(dup){ commit(dup.id); return; }
          // Otherwise create + select
          var newId = createProject(v);
          if(newId) commit(newId);
        } else if(e.key === 'Escape'){
          e.preventDefault();
          cleanup();
        }
      });
      inp.addEventListener('input', function(){
        var q = (inp.value||'').toLowerCase();
        var listEl = pop.querySelector('.pt-tag-picker-list');
        if(!listEl) return;
        var visible = _projectRows().filter(function(p){ return !q || (p.name||'').toLowerCase().indexOf(q) >= 0; });
        var listHtml = _noProjectRowHtml(!currentId);
        visible.forEach(function(p){ listHtml += _rowHtml(p, currentId === p.id); });
        if(q && !visible.length){
          listHtml += '<div class="pt-tag-picker-empty">Press Enter to create "'+escapeHtml(inp.value.trim())+'"</div>';
        }
        listEl.innerHTML = listHtml;
        _wireRows(listEl);
      });
    }
  }

  // Anchor + position (mirrors the tag picker — caches rect + falls back
  // to a stable selector if the original chip element gets re-rendered).
  // Scope the fallback to the original anchor's containing root (modal,
  // drawer, or body) so the picker can't latch onto an unrelated chip in
  // a different surface (e.g. a tracker bar chip when picker was opened
  // from the Manual Entry dialog).
  var anchorRoot = (anchor && anchor.closest)
    ? (anchor.closest('.ftc-modal, .tdrawer, .pal-modal') || document)
    : document;
  var cachedRect = null;
  function _liveAnchorRect(){
    if(anchor && document.body.contains(anchor)){
      var r = anchor.getBoundingClientRect();
      if(r.width > 0 || r.height > 0) return r;
    }
    var live = anchorRoot.querySelector('[data-pt-pick-anchor="project"]');
    if(live){
      var r2 = live.getBoundingClientRect();
      if(r2.width > 0 || r2.height > 0) return r2;
    }
    return cachedRect;
  }
  function positionAndAttach(){
    var rect = _liveAnchorRect();
    if(!rect || (rect.left === 0 && rect.top === 0 && rect.width === 0)) return;
    cachedRect = rect;
    pop.style.position = 'fixed';
    pop.style.left = rect.left + 'px';
    pop.style.width = Math.max(240, Math.min(rect.width, 320)) + 'px';
    var ph = pop.offsetHeight;
    var top = rect.bottom + 6;
    if(top + ph + 8 > window.innerHeight) top = Math.max(8, rect.top - ph - 6);
    pop.style.top = top + 'px';
  }

  document.body.appendChild(pop);
  render();
  requestAnimationFrame(function(){
    pop.classList.add('show');
    positionAndAttach();
    var inp = pop.querySelector('#proj-pick-input'); if(inp) inp.focus();
  });

  function commit(value){
    if(onPick) onPick(value);
    cleanup();
  }
  function cleanup(){
    document.removeEventListener('mousedown', outsideHandler, true);
    document.removeEventListener('keydown', escHandler, true);
    pop.classList.remove('show');
    setTimeout(function(){ try{ pop.remove(); }catch(e){} }, 160);
    _projectPickerCurrent = null;
  }
  function outsideHandler(e){
    if(!pop.contains(e.target) && e.target !== anchor) cleanup();
  }
  function escHandler(e){
    if(e.key === 'Escape'){ e.stopPropagation(); cleanup(); }
  }
  setTimeout(function(){
    document.addEventListener('mousedown', outsideHandler, true);
    document.addEventListener('keydown', escHandler, true);
  }, 0);
  _projectPickerCurrent = { cleanup: cleanup };
}

/* ── Tag picker (multi-select) ───────────────────────────────
   Uses a custom popover (openInlinePicker is single-select). Each row is a
   checkbox-style line; clicking toggles selection without closing. A "Done"
   button at the bottom commits the selection. */
var _tagPickerCurrent = null;
function openTagPicker(currentTagIds, anchor, onPick){
  closeInlinePicker();   // dismiss any single-select picker that's open
  if(_tagPickerCurrent){ _tagPickerCurrent.cleanup(); _tagPickerCurrent = null; }
  // Mutually exclusive with the project picker — only one shows at a time.
  if(_projectPickerCurrent){ _projectPickerCurrent.cleanup(); _projectPickerCurrent = null; }

  var selected = (currentTagIds || []).slice();
  var rows = Object.values(tagsData||{}).filter(Boolean)
              .sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });

  var pop = document.createElement('div');
  pop.className = 'inline-picker pt-tag-picker';
  function render(){
    var html = '<div class="pt-tag-picker-search">'
      +    '<input type="text" class="pt-tag-picker-input" id="tag-pick-input" placeholder="Filter or add new…" autocomplete="off">'
      +  '</div>';
    if(!rows.length){
      html += '<div class="pt-tag-picker-empty">No tags yet — type a name above and press Enter to create one.</div>';
    } else {
      html += '<div class="pt-tag-picker-list">';
      rows.forEach(function(t){
        var on = selected.indexOf(t.id) >= 0;
        html += '<button type="button" class="pt-tag-picker-row'+(on?' on':'')+'" data-tag-id="'+t.id+'">'
          +    '<span class="pt-tag-picker-check">'+(on?'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5l2 2 4-4.5"/></svg>':'')+'</span>'
          +    '<span class="pt-tag-picker-name">'+escapeHtml(t.name)+'</span>'
          +    '</button>';
      });
      html += '</div>';
    }
    html += '<div class="pt-tag-picker-foot">'
      +    '<button type="button" class="pt-tag-picker-done" id="tag-pick-done">Done</button>'
      +  '</div>';
    pop.innerHTML = html;

    pop.querySelectorAll('.pt-tag-picker-row').forEach(function(btn){
      btn.addEventListener('mousedown', function(e){
        e.preventDefault();
        var id = btn.getAttribute('data-tag-id');
        var idx = selected.indexOf(id);
        if(idx >= 0) selected.splice(idx, 1);
        else selected.push(id);
        render();
        positionAndAttach();
      });
    });
    var inp = pop.querySelector('#tag-pick-input');
    if(inp){
      inp.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          var v = (inp.value||'').trim();
          if(v){
            var dup = Object.values(tagsData||{}).find(function(t){ return t && t.name && t.name.toLowerCase() === v.toLowerCase(); });
            if(dup){
              if(selected.indexOf(dup.id) < 0) selected.push(dup.id);
            } else {
              var newId = createTag(v);
              if(newId) selected.push(newId);
            }
            inp.value = '';
            // createTag does an optimistic write so tagsData is already
            // updated synchronously — no need to wait for Firebase. A
            // single-tick defer is enough to let the optimistic re-render
            // settle before we re-pull the rows for the picker.
            setTimeout(function(){
              rows = Object.values(tagsData||{}).filter(Boolean).sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
              render();
              positionAndAttach();
              var i2 = pop.querySelector('#tag-pick-input'); if(i2) i2.focus();
            }, 0);
          }
        } else if(e.key === 'Escape'){
          e.preventDefault();
          cleanup();
        }
      });
      inp.addEventListener('input', function(){
        var q = (inp.value||'').toLowerCase();
        var visible = rows.filter(function(t){ return !q || (t.name||'').toLowerCase().indexOf(q) >= 0; });
        var listEl = pop.querySelector('.pt-tag-picker-list');
        if(listEl){
          listEl.innerHTML = visible.map(function(t){
            var on = selected.indexOf(t.id) >= 0;
            return '<button type="button" class="pt-tag-picker-row'+(on?' on':'')+'" data-tag-id="'+t.id+'">'
              +    '<span class="pt-tag-picker-check">'+(on?'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5l2 2 4-4.5"/></svg>':'')+'</span>'
              +    '<span class="pt-tag-picker-name">'+escapeHtml(t.name)+'</span>'
              +    '</button>';
          }).join('');
          listEl.querySelectorAll('.pt-tag-picker-row').forEach(function(btn){
            btn.addEventListener('mousedown', function(e){
              e.preventDefault();
              var id = btn.getAttribute('data-tag-id');
              var idx = selected.indexOf(id);
              if(idx >= 0) selected.splice(idx, 1);
              else selected.push(id);
              render();
              positionAndAttach();
            });
          });
        }
      });
    }
    var doneBtn = pop.querySelector('#tag-pick-done');
    if(doneBtn) doneBtn.addEventListener('mousedown', function(e){
      e.preventDefault();
      commit();
    });
  }

  // Cache the anchor's position the first time we open. Tracker bar
  // re-renders (Firebase update / scope toggle) replace the chip element,
  // detaching `anchor` — getBoundingClientRect on a detached node returns
  // 0,0,0,0 and the picker snaps to the top-left of the viewport. Cache
  // covers that. Also re-query the live anchor each call as a backup so
  // the picker tracks the chip if it DOES move (e.g. after a re-render
  // the new chip may be at a slightly different x position).
  // Scope the fallback to the anchor's containing root (modal/drawer/body)
  // so the picker can't latch onto an unrelated chip in a different
  // surface (e.g. tracker bar's tags chip when picker was opened from
  // the Manual Entry dialog).
  var anchorRoot = (anchor && anchor.closest)
    ? (anchor.closest('.ftc-modal, .tdrawer, .pal-modal') || document)
    : document;
  var cachedRect = null;
  function _liveAnchorRect(){
    // Try the original anchor first
    if(anchor && document.body.contains(anchor)){
      var r = anchor.getBoundingClientRect();
      if(r.width > 0 || r.height > 0) return r;
    }
    // Fall back to re-querying by data-pt-pick-anchor (set by callers
    // — see renderTrackerTagsChip in timetracker.js). Scoped to the
    // anchor's original surface so a re-rendered tracker chip doesn't
    // hijack a picker opened from a modal.
    var live = anchorRoot.querySelector('[data-pt-pick-anchor="tags"]');
    if(live){
      var r2 = live.getBoundingClientRect();
      if(r2.width > 0 || r2.height > 0) return r2;
    }
    return cachedRect;
  }
  function positionAndAttach(){
    var rect = _liveAnchorRect();
    if(!rect || (rect.left === 0 && rect.top === 0 && rect.width === 0)) return; // anchor gone — leave picker where it was
    cachedRect = rect; // remember for next time
    pop.style.position = 'fixed';
    pop.style.left = rect.left + 'px';
    pop.style.width = Math.max(240, Math.min(rect.width, 320)) + 'px';
    var ph = pop.offsetHeight;
    var top = rect.bottom + 6;
    if(top + ph + 8 > window.innerHeight) top = Math.max(8, rect.top - ph - 6);
    pop.style.top = top + 'px';
  }

  document.body.appendChild(pop);
  render();
  requestAnimationFrame(function(){
    pop.classList.add('show');
    positionAndAttach();
    var inp = pop.querySelector('#tag-pick-input'); if(inp) inp.focus();
  });

  function commit(){
    if(onPick) onPick(selected);
    cleanup();
  }
  function cleanup(){
    document.removeEventListener('mousedown', outsideHandler, true);
    document.removeEventListener('keydown', escHandler, true);
    pop.classList.remove('show');
    setTimeout(function(){ try{ pop.remove(); }catch(e){} }, 160);
    _tagPickerCurrent = null;
  }
  function outsideHandler(e){
    if(!pop.contains(e.target) && e.target !== anchor){
      commit();
    }
  }
  function escHandler(e){
    if(e.key === 'Escape'){ e.stopPropagation(); cleanup(); }
  }
  setTimeout(function(){
    document.addEventListener('mousedown', outsideHandler, true);
    document.addEventListener('keydown', escHandler, true);
  }, 0);
  _tagPickerCurrent = { cleanup: cleanup };
}

/* ── Helpers ───────────────────────────────────────────────── */
function _ptFmtHM(ms){
  if(!ms || ms <= 0) return '0:00';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  return h + ':' + (m<10?'0'+m:m);
}

/* Render a small project chip (color dot + name) — used in the time log row.
   Returns '' if the entry has no project or the project no longer exists. */
function renderProjectChip(projectId){
  if(!projectId) return '';
  var p = projectsData[projectId];
  if(!p) return '';
  return '<span class="entry-project-chip" title="Project: '+escapeHtml(p.name)+'">'
    +    '<span class="entry-project-dot" style="background:'+p.color+'"></span>'
    +    escapeHtml(p.name)
    +  '</span>';
}

/* Render the tag pills — used in the time log row. */
function renderTagPills(tagIds){
  if(!Array.isArray(tagIds) || !tagIds.length) return '';
  var html = '';
  tagIds.forEach(function(tid){
    var t = tagsData[tid];
    if(!t) return;
    html += '<span class="entry-tag-pill">'+escapeHtml(t.name)+'</span>';
  });
  return html ? '<span class="entry-tag-pills">'+html+'</span>' : '';
}
