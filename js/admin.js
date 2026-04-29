/* Flowtive One — Admin role + Admin sub-page (Tier 2)
   Trust-based UI enforcement. Admin status lives at flowtive_admins/{name}
   in Firebase. Bootstrap = the names in DEFAULT_ADMINS below — first user
   to log in seeds the list if Firebase is empty.

   What admins can do (more than regular members):
   - Edit + delete OTHER PEOPLE'S time entries (own only for everyone else)
   - Delete OTHER PEOPLE'S task comments
   - Force-stop a teammate's running timer
   - See team-wide controls in the Admin panel: per-user time totals,
     promote/demote others, cleanup tools, full data export
   - Get a small "Admin" pill next to their name in the sidebar / activity
     feed / tracker rows / comment authors

   Security caveats: this is UI-only enforcement. Anyone with the team
   password could DevTools their way around it. Fine for an honest
   6-person team; not a real boundary. Real auth = a separate build with
   Firebase Authentication + matching security rules. */

var DEFAULT_ADMINS = ['Emran', 'Mugdho'];

var adminNames = {};        // {name: true} — synced from Firebase
var _adminsSubscribed = false;
var _adminsBootstrapped = false;

function subscribeAdmins(){
  if(!firebaseReady || _adminsSubscribed) return;
  _adminsSubscribed = true;
  firebaseDb.ref('flowtive_admins').on('value', function(snap){
    var v = snap.val();
    if(v && Object.keys(v).length){
      adminNames = v;
    } else if(!_adminsBootstrapped){
      // First-ever load — seed from DEFAULT_ADMINS so the founders are
      // admins on day 1. Subsequent loads read whatever's in Firebase.
      _adminsBootstrapped = true;
      var seed = {};
      DEFAULT_ADMINS.forEach(function(n){ seed[n] = true; });
      adminNames = seed;
      // Best-effort write — log the result so we know if Firebase rules
      // are blocking the seed (which would prevent persistence across
      // browsers but not break the in-memory admin checks).
      firebaseDb.ref('flowtive_admins').set(seed).catch(function(err){
        try{ console.warn('[admin] could not seed flowtive_admins (Firebase rules may block writes):', err && err.code); }catch(e){}
      });
    }
    _onAdminsChange();
  }, function(err){
    try{ console.warn('[admin] could not read flowtive_admins:', err && err.code); }catch(e){}
  });
}
function unsubscribeAdmins(){
  if(firebaseReady && firebaseDb){ try{ firebaseDb.ref('flowtive_admins').off(); }catch(e){} }
  _adminsSubscribed = false;
  adminNames = {};
}

function isUserAdmin(name){
  if(!name) return false;
  if(adminNames[name]) return true;
  // Defensive fallback — if Firebase hasn't responded yet (adminNames is
  // still empty), assume DEFAULT_ADMINS so the founders see the Admin
  // sidebar item immediately on first paint instead of after a network
  // round-trip. Once subscribeAdmins fires, this branch is bypassed
  // because adminNames will be populated.
  if(Object.keys(adminNames).length === 0 && DEFAULT_ADMINS.indexOf(name) >= 0){
    return true;
  }
  return false;
}
function isCurrentUserAdmin(){
  return !!(currentUser && isUserAdmin(currentUser.name));
}

/* Promote/demote — admin-only. Last-admin guard so you can't lock yourself
   out (must always have at least one admin in the system). */
function setUserAdmin(name, makeAdmin){
  if(!isCurrentUserAdmin()){ showToast('Only admins can change roles'); return; }
  if(!name) return;
  if(!makeAdmin){
    var remaining = Object.keys(adminNames).filter(function(n){ return n !== name && adminNames[n]; });
    if(remaining.length === 0){
      showToast('Cannot demote the last admin');
      return;
    }
  }
  if(makeAdmin){
    firebaseDb.ref('flowtive_admins/'+name).set(true).catch(function(){ showToast('Save failed'); });
    if(typeof logActivity === 'function' && currentUser){
      logActivity(currentUser.name, 'admin_promote', null, null, null, {target: name});
    }
    showToast(name + ' is now an admin', 'success');
  } else {
    firebaseDb.ref('flowtive_admins/'+name).remove().catch(function(){ showToast('Save failed'); });
    if(typeof logActivity === 'function' && currentUser){
      logActivity(currentUser.name, 'admin_demote', null, null, null, {target: name});
    }
    showToast(name + ' is no longer an admin', 'neutral');
  }
}

/* Re-render whichever surfaces depend on admin status when the list
   changes. Cheap — just toggles visibility / refreshes the active panel. */
function _onAdminsChange(){
  var amAdmin = isCurrentUserAdmin();
  // Sidebar admin item visibility
  var item = document.getElementById('sid-admin');
  if(item) item.style.display = amAdmin ? '' : 'none';
  // Topbar user pill admin badge
  var pillBadge = document.getElementById('user-pill-admin');
  if(pillBadge) pillBadge.classList.toggle('app-hidden', !amAdmin);
  // Active Admin panel — re-render so the team list reflects current roles
  var p = document.getElementById('panel-admin');
  if(p && p.classList.contains('active') && typeof renderAdminPanel === 'function'){
    renderAdminPanel();
  }
  // Active Tasks / Tracker panels — admin pill on user names refreshes
  if(typeof scheduleRender === 'function'){
    scheduleRender('panel-tasks', function(){
      var pt = document.getElementById('panel-tasks');
      if(pt && pt.classList.contains('active') && typeof renderTasksArea === 'function') renderTasksArea();
    });
    scheduleRender('panel-time', function(){
      var pt = document.getElementById('panel-time');
      if(pt && pt.classList.contains('active') && typeof renderTimeTrackerPanel === 'function') renderTimeTrackerPanel();
    });
  }
}

/* ── Admin panel renderer ────────────────────────────────────────
   Lives on panel-admin (registered in main.js). Three sections:
   1. Team — list of members with admin toggle + week's tracked time +
      online status + Force-stop running timer
   2. Cleanup — clear done tasks older than N days (with confirm + undo)
   3. Export — download a JSON snapshot of every workspace doc
*/
function renderAdminPanel(){
  var body = document.getElementById('admin-panel-body');
  if(!body) return;
  if(!isCurrentUserAdmin()){
    body.innerHTML = ''
      + '<div class="rep-empty">'
      +   '<div class="rep-empty-icon">🔒</div>'
      +   '<div class="rep-empty-title">Admin only</div>'
      +   '<div class="rep-empty-sub">This page is restricted to admins. Ask an existing admin to grant you access.</div>'
      + '</div>';
    return;
  }
  body.innerHTML = ''
    + _renderAdminTeamSection()
    + _renderAdminCleanupSection()
    + _renderAdminExportSection();
}

function _renderAdminTeamSection(){
  // Per-member: this-week tracked time, online status, running timer
  // (with force-stop button), admin toggle
  var weekStart = startOfWeek(Date.now());
  var weekEnd = weekStart + 7*86400000;
  var perUser = {};   // name → {ms, isRunning, runningSessionId}
  MEMBERS.forEach(function(m){ perUser[m.name] = { ms: 0, isRunning: false, runningSessionId: null }; });
  Object.keys(clockSessions||{}).forEach(function(id){
    var s = clockSessions[id]; if(!s || !s.user || !s.start) return;
    if(!perUser[s.user]) return;
    var end = s.end || Date.now();
    if(end < weekStart || s.start >= weekEnd) return;
    perUser[s.user].ms += getLiveDurationMs(s);
  });
  Object.keys(clockActive||{}).forEach(function(name){
    var a = clockActive[name];
    if(perUser[name] && a && a.sessionId){
      perUser[name].isRunning = true;
      perUser[name].runningSessionId = a.sessionId;
    }
  });

  var html = '<div class="adm-card">'
    + '<div class="adm-card-head">'
    +   '<div class="adm-card-title">Team</div>'
    +   '<div class="adm-card-sub">Promote / demote, see this week\'s totals, force-stop running timers.</div>'
    + '</div>'
    + '<div class="adm-team-list">';
  MEMBERS.forEach(function(m){
    var stats = perUser[m.name] || { ms: 0 };
    var isAdmin = isUserAdmin(m.name);
    var isMe = currentUser && m.name === currentUser.name;
    var img = (typeof loadAvatar === 'function') ? loadAvatar(m.name) : null;
    var avInner = img
      ? '<img src="'+img+'" alt="'+escapeHtml(m.name)+'">'
      : escapeHtml(m.name.substring(0,2).toUpperCase());
    var avBg = img ? 'transparent' : m.color;
    html += '<div class="adm-team-row">'
      +    '<div class="adm-team-id">'
      +      '<span class="av-mini" style="background:'+avBg+'">'+avInner+'</span>'
      +      '<div class="adm-team-name-wrap">'
      +        '<span class="adm-team-name">'+escapeHtml(m.name)+(isMe?' <span class="adm-team-self">(you)</span>':'')+'</span>'
      +        (isAdmin ? '<span class="adm-pill">Admin</span>' : '')
      +      '</div>'
      +    '</div>'
      +    '<div class="adm-team-stat" title="Tracked this week">'+fmtTrackerHM(stats.ms)+'</div>'
      +    '<div class="adm-team-running">'
      +      (stats.isRunning
        ? '<button class="adm-stop-btn" type="button" onclick="adminForceStop(\''+escapeHtml(m.name).replace(/\\/g,'\\\\').replace(/\'/g,"\\'")+'\')" title="Force-stop running timer">'
          + '<span class="adm-running-dot"></span><span>Stop</span></button>'
        : '<span class="adm-team-idle">Idle</span>')
      +    '</div>'
      +    '<div class="adm-team-toggle">'
      +      _renderAdminToggle(m.name, isAdmin, isMe)
      +    '</div>'
      +  '</div>';
  });
  html += '</div></div>';
  return html;
}

function _renderAdminToggle(name, isAdmin, isMe){
  var safeName = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  // Last-admin: if this user is the ONLY admin, disable demote
  var totalAdmins = Object.keys(adminNames).filter(function(n){ return adminNames[n]; }).length;
  var canDemote = !(isAdmin && totalAdmins <= 1);
  if(isAdmin){
    return '<button type="button" class="adm-toggle adm-toggle-on" '
      + (canDemote ? '' : 'disabled title="Cannot demote the last admin" ')
      + 'onclick="setUserAdmin(\''+safeName+'\', false)">'
      + '<span class="adm-toggle-knob"></span>'
      + '</button>';
  }
  return '<button type="button" class="adm-toggle adm-toggle-off" onclick="setUserAdmin(\''+safeName+'\', true)">'
    + '<span class="adm-toggle-knob"></span>'
    + '</button>';
}

function _renderAdminCleanupSection(){
  // Count of done tasks older than 30 days
  var cutoff = Date.now() - 30*86400000;
  var oldDone = Object.values(tasksData||{}).filter(function(t){
    return t && t.status === 'done' && t.completedAt && t.completedAt < cutoff;
  });
  var n = oldDone.length;
  return '<div class="adm-card">'
    + '<div class="adm-card-head">'
    +   '<div class="adm-card-title">Cleanup</div>'
    +   '<div class="adm-card-sub">Tidy up old data without leaving the app.</div>'
    + '</div>'
    + '<div class="adm-cleanup-list">'
    +   '<div class="adm-cleanup-row">'
    +     '<div class="adm-cleanup-label">'
    +       '<div class="adm-cleanup-title">Done tasks older than 30 days</div>'
    +       '<div class="adm-cleanup-sub">'+n+' task'+(n===1?'':'s')+' eligible. Deleted with single undo toast.</div>'
    +     '</div>'
    +     '<button type="button" class="adm-cleanup-btn'+(n===0?' adm-cleanup-disabled':'')+'" '+(n===0?'disabled':'')+' onclick="adminCleanupOldDone()">Clear ('+n+')</button>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

function _renderAdminExportSection(){
  var taskCount = Object.keys(tasksData||{}).length;
  var sessionCount = Object.keys(clockSessions||{}).length;
  return '<div class="adm-card">'
    + '<div class="adm-card-head">'
    +   '<div class="adm-card-title">Export</div>'
    +   '<div class="adm-card-sub">Download a snapshot of the workspace as JSON.</div>'
    + '</div>'
    + '<div class="adm-export-list">'
    +   '<div class="adm-export-row">'
    +     '<div class="adm-export-label">'
    +       '<div class="adm-export-title">Full workspace export</div>'
    +       '<div class="adm-export-sub">'+taskCount+' tasks · '+sessionCount+' time entries · projects · tags · activity</div>'
    +     '</div>'
    +     '<button type="button" class="adm-export-btn" onclick="adminExportAll()">Download JSON</button>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

/* Force-stop a running timer for any member. The session's `end` is set
   to now, durationMs computed, and active marker removed. Logs activity
   tagged with the admin who did it. */
function adminForceStop(name){
  if(!isCurrentUserAdmin()){ showToast('Only admins can force-stop'); return; }
  var active = clockActive[name];
  if(!active){ showToast(name + ' is not currently tracking'); return; }
  ftConfirm({
    title: 'Force-stop ' + name + '\'s timer?',
    message: 'Their running session will be ended now. They will still see the entry in their log.',
    confirmLabel: 'Force-stop',
    cancelLabel: 'Cancel',
    danger: true,
    onConfirm: function(){
      var end = Date.now();
      var dur = Math.max(0, end - active.start);
      var update = { end: end, durationMs: dur, autoClosed: true };
      firebaseDb.ref('flowtive_time_sessions/'+active.sessionId).update(update).catch(function(){ showToast('Save failed'); });
      firebaseDb.ref('flowtive_time_active/'+name).remove().catch(function(){});
      if(typeof logActivity === 'function' && currentUser){
        logActivity(currentUser.name, 'admin_force_stop', null, null, null, {target: name, sessionId: active.sessionId, durationMs: dur});
      }
      showToast(name + '\'s timer stopped', 'success');
    }
  });
}

/* Bulk-cleanup: delete every "done" task whose completedAt is older than
   30 days. Single undo toast restores the lot. */
function adminCleanupOldDone(){
  if(!isCurrentUserAdmin()){ showToast('Only admins can run cleanup'); return; }
  var cutoff = Date.now() - 30*86400000;
  var ids = Object.keys(tasksData||{}).filter(function(id){
    var t = tasksData[id];
    return t && t.status === 'done' && t.completedAt && t.completedAt < cutoff;
  });
  if(!ids.length){ showToast('Nothing to clean up'); return; }
  ftConfirm({
    title: 'Delete ' + ids.length + ' old done task' + (ids.length===1?'':'s') + '?',
    message: 'Tasks marked Done more than 30 days ago. Single undo restores them all.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    danger: true,
    onConfirm: function(){
      var snapshots = {};
      ids.forEach(function(id){
        var t = tasksData[id];
        if(t){ snapshots[id] = JSON.parse(JSON.stringify(t)); }
      });
      ids.forEach(function(id){
        firebaseDb.ref('flowtive_tasks/'+id).remove().catch(function(){});
      });
      if(typeof showUndoToast === 'function'){
        showUndoToast(
          ids.length + ' old done task' + (ids.length===1?'':'s') + ' deleted',
          function(){
            Object.keys(snapshots).forEach(function(id){
              firebaseDb.ref('flowtive_tasks/'+id).set(snapshots[id]).catch(function(){});
            });
          },
          function(){
            if(typeof logActivity === 'function' && currentUser){
              logActivity(currentUser.name, 'admin_cleanup', null, null, null, {count: ids.length});
            }
          }
        );
      }
      renderAdminPanel();
    }
  });
}

/* JSON snapshot — pulls tasks, sessions, projects, tags, activity, admins.
   Excludes Firebase config + per-user localStorage data (preferences, avatars). */
function adminExportAll(){
  if(!isCurrentUserAdmin()){ showToast('Only admins can export'); return; }
  if(!firebaseReady){ showToast('Firebase not ready'); return; }
  showToast('Preparing export…', 'neutral');
  var paths = ['flowtive_tasks','flowtive_time_sessions','flowtive_time_active','flowtive_projects','flowtive_tags','flowtive_activity','flowtive_admins','flowtive_progress','flowtive_status','flowtive_notes'];
  Promise.all(paths.map(function(p){
    return firebaseDb.ref(p).once('value').then(function(s){ return [p, s.val()]; }).catch(function(){ return [p, null]; });
  })).then(function(pairs){
    var snapshot = {
      exportedAt: Date.now(),
      exportedBy: currentUser ? currentUser.name : null,
      version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?',
      data: {}
    };
    pairs.forEach(function(p){ snapshot.data[p[0]] = p[1]; });
    var json = JSON.stringify(snapshot, null, 2);
    var blob = new Blob([json], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var d = new Date(); var pad = function(n){ return n<10?'0'+n:''+n; };
    a.download = 'flowtive-export-' + d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    showToast('Export downloaded', 'success');
  });
}
