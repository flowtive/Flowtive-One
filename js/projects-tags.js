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
  '#F97316', '#84CC16', '#06B6D4', '#A855F7'
];

/* ── Subscriptions ────────────────────────────────────────────── */
function subscribeProjects(){
  if(!firebaseReady || _projectsSubscribed) return;
  _projectsSubscribed = true;
  firebaseDb.ref('flowtive_projects').on('value', function(snap){
    projectsData = snap.val() || {};
    _onProjectsOrTagsChange();
  });
}
function subscribeTags(){
  if(!firebaseReady || _tagsSubscribed) return;
  _tagsSubscribed = true;
  firebaseDb.ref('flowtive_tags').on('value', function(snap){
    tagsData = snap.val() || {};
    _onProjectsOrTagsChange();
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

/* ── CRUD: Projects ──────────────────────────────────────────── */
function createProject(name, color){
  if(!firebaseReady || !currentUser) return null;
  var trimmed = (name||'').trim();
  if(!trimmed) return null;
  // Pick next color if none provided
  if(!color){
    var existing = Object.keys(projectsData||{}).length;
    color = PROJECT_COLORS[existing % PROJECT_COLORS.length];
  }
  var ref = firebaseDb.ref('flowtive_projects').push();
  var id = ref.key;
  ref.set({
    id: id, name: trimmed, color: color,
    createdAt: Date.now(), createdBy: currentUser.name
  }).catch(function(){ showToast('Save Failed'); });
  return id;
}
function updateProject(id, patch){
  if(!firebaseReady || !id) return;
  if(!projectsData[id]) return;
  firebaseDb.ref('flowtive_projects/'+id).update(patch).catch(function(){ showToast('Save Failed'); });
}
function deleteProject(id){
  if(!firebaseReady || !id) return;
  var existing = projectsData && projectsData[id];
  var snapshot = null;
  if(existing){
    snapshot = {};
    Object.keys(existing).forEach(function(k){ snapshot[k] = existing[k]; });
  }
  firebaseDb.ref('flowtive_projects/'+id).remove().catch(function(){ showToast('Delete Failed'); });
  if(snapshot && typeof showUndoToast === 'function'){
    showUndoToast(
      'Project deleted',
      function(){
        firebaseDb.ref('flowtive_projects/'+id).set(snapshot).catch(function(){ showToast('Restore failed'); });
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
  ref.set({
    id: id, name: trimmed,
    createdAt: Date.now(), createdBy: currentUser.name
  }).catch(function(){ showToast('Save Failed'); });
  return id;
}
function updateTag(id, patch){
  if(!firebaseReady || !id) return;
  if(!tagsData[id]) return;
  firebaseDb.ref('flowtive_tags/'+id).update(patch).catch(function(){ showToast('Save Failed'); });
}
function deleteTag(id){
  if(!firebaseReady || !id) return;
  var existing = tagsData && tagsData[id];
  var snapshot = null;
  if(existing){
    snapshot = {};
    Object.keys(existing).forEach(function(k){ snapshot[k] = existing[k]; });
  }
  firebaseDb.ref('flowtive_tags/'+id).remove().catch(function(){ showToast('Delete Failed'); });
  if(snapshot && typeof showUndoToast === 'function'){
    showUndoToast(
      'Tag deleted',
      function(){
        firebaseDb.ref('flowtive_tags/'+id).set(snapshot).catch(function(){ showToast('Restore failed'); });
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
  // Count entries that reference this project
  var refCount = 0;
  Object.values(clockSessions||{}).forEach(function(s){ if(s && s.projectId === id) refCount++; });
  var msg = '"'+p.name+'" will be deleted permanently.';
  if(refCount) msg += ' '+refCount+' time entr'+(refCount===1?'y is':'ies are')+' assigned to it — they will keep their times but lose the project tag.';
  ftConfirm({
    title: 'Delete project?',
    message: msg,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    danger: true,
    onConfirm: function(){
      deleteProject(id);
      // Clear projectId from any sessions referencing it (best-effort cleanup)
      Object.keys(clockSessions||{}).forEach(function(sid){
        if(clockSessions[sid] && clockSessions[sid].projectId === id){
          firebaseDb.ref('flowtive_time_sessions/'+sid+'/projectId').set(null);
        }
      });
      showToast('Project deleted');
    }
  });
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
  var refCount = 0;
  Object.values(clockSessions||{}).forEach(function(s){
    if(s && Array.isArray(s.tags) && s.tags.indexOf(id) >= 0) refCount++;
  });
  var msg = '"'+t.name+'" will be removed.';
  if(refCount) msg += ' '+refCount+' time entr'+(refCount===1?'y has':'ies have')+' this tag — they will keep their times but lose the tag.';
  ftConfirm({
    title: 'Delete tag?',
    message: msg,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    danger: true,
    onConfirm: function(){
      deleteTag(id);
      Object.keys(clockSessions||{}).forEach(function(sid){
        var s = clockSessions[sid];
        if(s && Array.isArray(s.tags) && s.tags.indexOf(id) >= 0){
          var clean = s.tags.filter(function(x){ return x !== id; });
          firebaseDb.ref('flowtive_time_sessions/'+sid+'/tags').set(clean.length ? clean : null);
        }
      });
      showToast('Tag deleted');
    }
  });
}

/* ── Project picker (single-select, used by tracker bar + dialogs) ── */
function openProjectPicker(currentId, anchor, onPick){
  if(typeof openInlinePicker !== 'function') return;
  var rows = Object.values(projectsData||{}).filter(Boolean)
              .sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
  var items = [{
    value: '',
    html: '<span class="pt-pick-row"><span class="pt-pick-dot" style="background:transparent;border:1px dashed var(--border)"></span><span class="pt-pick-name pt-pick-muted">No project</span></span>'
  }];
  rows.forEach(function(p){
    items.push({
      value: p.id,
      html: '<span class="pt-pick-row"><span class="pt-pick-dot" style="background:'+p.color+'"></span><span class="pt-pick-name">'+escapeHtml(p.name)+'</span></span>'
    });
  });
  if(!rows.length){
    items.push({
      value: '__new__',
      html: '<span class="pt-pick-row pt-pick-action"><span class="pt-pick-plus">＋</span><span class="pt-pick-name">Create your first project…</span></span>'
    });
  }
  openInlinePicker(anchor, items, currentId || '', function(v){
    if(v === '__new__'){
      var name = prompt('Project name:');
      if(name && name.trim()){
        var newId = createProject(name.trim());
        if(newId && onPick) onPick(newId);
      }
    } else {
      if(onPick) onPick(v || null);
    }
  });
}

/* ── Tag picker (multi-select) ───────────────────────────────
   Uses a custom popover (openInlinePicker is single-select). Each row is a
   checkbox-style line; clicking toggles selection without closing. A "Done"
   button at the bottom commits the selection. */
var _tagPickerCurrent = null;
function openTagPicker(currentTagIds, anchor, onPick){
  closeInlinePicker();   // dismiss any single-select picker that's open
  if(_tagPickerCurrent){ _tagPickerCurrent.cleanup(); _tagPickerCurrent = null; }

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
            // Wait for Firebase to update before re-rendering
            setTimeout(function(){
              rows = Object.values(tagsData||{}).filter(Boolean).sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
              render();
              positionAndAttach();
              var i2 = pop.querySelector('#tag-pick-input'); if(i2) i2.focus();
            }, 200);
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

  function positionAndAttach(){
    var rect = anchor.getBoundingClientRect();
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
