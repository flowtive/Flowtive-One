/* Flowtive One — Firebase init, sync, real-time listeners, presence */

/* ── Sync ──
   The indicator is hidden by default (CSS opacity:0). It only shows when
   sync is actively syncing or errored — once it lands back on "live" the
   indicator fades out. Trust by default, surface only when interesting. */
function setSyncing(s){
  var dot=document.getElementById('sync-dot');
  var label=document.getElementById('sync-label');
  var indicator=document.getElementById('sync-indicator');
  if(!dot) return;
  if(s==='syncing'){
    dot.className='sync-dot syncing';
    if(label) label.textContent='Syncing…';
    if(indicator) indicator.classList.add('is-active');
  } else if(s==='error'){
    dot.className='sync-dot error';
    if(label) label.textContent='Error';
    if(indicator) indicator.classList.add('is-active');
  } else {
    dot.className='sync-dot';
    if(label) label.textContent='Live';
    if(indicator) indicator.classList.remove('is-active');
  }
}


async function loadData(){
  try{
    setSyncing('syncing');
    if(firebaseReady){
      // Fix 3: Load all data from Firebase — do NOT call loadExtras() after this
      // to prevent stale localStorage values from overriding fresh Firebase data
      var snap = await firebaseDb.ref('flowtive_progress').once('value');
      doneData = snap.val() || {};
      var ssnap = await firebaseDb.ref('flowtive_status').once('value');
      statusData = ssnap.val() || {};
      // Fix 2: Load notes from Firebase
      var nsnap = await firebaseDb.ref('flowtive_notes').once('value');
      notesData = nsnap.val() || {};
      // Load email template overrides
      var esnap = await firebaseDb.ref('flowtive_email_templates').once('value');
      emailOverrides = esnap.val() || {};
      try{ localStorage.setItem('flowtive_email_overrides_v1', JSON.stringify(emailOverrides)); }catch(e){}
      // Load activity fallback from localStorage (Firebase listener will update live)
      try{ var a=localStorage.getItem('flowtive_activity_fallback'); if(a) activityLog=JSON.parse(a); }catch(e){}
      var asnap = await firebaseDb.ref('flowtive_avatars').once('value');
      if(asnap.val()){
        var avs = asnap.val();
        Object.keys(avs).forEach(function(name){
          try{ localStorage.setItem('flowtive_avatar_'+name.toLowerCase(), avs[name]); }catch(e){}
        });
      }
    } else {
      // Fallback to localStorage
      var stored = localStorage.getItem('flowtive_usa_state_v6');
      if(stored){ try{doneData=JSON.parse(stored);}catch(e){doneData={};} }
      else{ doneData={}; }
      // Only call loadExtras when Firebase is not available
      loadExtras();
    }
    setSyncing('live');
  }catch(e){ setSyncing('error'); doneData={}; }
}

async function saveData(){
  try{
    setSyncing('syncing');
    if(firebaseReady){
      await firebaseDb.ref('flowtive_progress').set(doneData);
    } else {
      localStorage.setItem('flowtive_usa_state_v6', JSON.stringify(doneData));
    }
    setSyncing('live');
  }catch(e){ setSyncing('error'); }
}


function initFirebase(){
  try{
    if(typeof firebase === 'undefined'){
      console.warn('Firebase SDK not loaded — activity feed will use local fallback.');
      return;
    }
    // Guard against double-init on logout/re-login — reuse existing app if already registered
    firebaseApp = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(FIREBASE_CONFIG);
    firebaseDb  = firebase.database();
    firebaseReady = true;
  }catch(e){
    console.warn('Firebase init failed:', e.message);
  }
}


function saveExtras(){
  try{
    localStorage.setItem('flowtive_notes_v1',  JSON.stringify(notesData));
    localStorage.setItem('flowtive_status_v1', JSON.stringify(statusData));
    localStorage.setItem('flowtive_activity_fallback', JSON.stringify(activityLog.slice(0,100)));
    if(firebaseReady){
      firebaseDb.ref('flowtive_status').set(statusData).catch(function(e){
        console.warn('Status Firebase sync failed:', e.message);
      });
      // Fix 2: Sync notes to Firebase so all team members can see them
      firebaseDb.ref('flowtive_notes').set(notesData).catch(function(e){
        console.warn('Notes Firebase sync failed:', e.message);
      });
    }
  }catch(e){}
}

/* ── Presence system ── */
var _presenceListener = false;

function initPresence(){
  if(!firebaseReady || !currentUser) return;

  var presenceRef = firebaseDb.ref('flowtive_presence/' + currentUser.name.toLowerCase());
  var connectedRef = firebaseDb.ref('.info/connected');

  connectedRef.on('value', function(snap){
    if(!snap.val()) return;
    // Write online status, remove on disconnect automatically
    presenceRef.onDisconnect().remove();
    presenceRef.set({
      name: currentUser.name,
      online: true,
      ts: Date.now()
    });
  });
}

function subscribePresence(){
  if(!firebaseReady || _presenceListener) return;
  _presenceListener = true;

  firebaseDb.ref('flowtive_presence').on('value', function(snap){
    var online = {};
    if(snap.val()){
      Object.keys(snap.val()).forEach(function(key){
        var entry = snap.val()[key];
        if(entry && entry.name) online[entry.name.toLowerCase()] = true;
      });
    }
    // Update each member's presence dot in the sidebar
    MEMBERS.forEach(function(m, i){
      var dot = document.getElementById('presence-'+i);
      if(!dot) return;
      var isOnline = !!online[m.name.toLowerCase()];
      dot.className = 'presence-dot ' + (isOnline ? 'online' : 'offline');
      dot.title = isOnline ? m.name + ' is online' : m.name + ' is offline';
    });
  });
}
var _realtimeListeners = false;


/* ── Surgical UI patch — updates only changed city rows without rebuilding DOM ── */
function patchUIFromData(oldData, newData){
  // Find keys that changed
  var allKeys = {};
  Object.keys(oldData).forEach(function(k){ allKeys[k]=true; });
  Object.keys(newData).forEach(function(k){ allKeys[k]=true; });

  Object.keys(allKeys).forEach(function(key){
    var wasVal = oldData[key];
    var isVal  = newData[key];
    if(wasVal === isVal) return; // unchanged

    // Key format: "ind::state::city"
    var parts = key.split('::');
    if(parts.length !== 3) return;
    var ind=parts[0], state=parts[1], city=parts[2];

    var isDone = !!isVal;
    var byName = isVal || null;
    var byMember = byName ? MEMBERS.find(function(m){return m.name===byName;}) : null;
    var byColor  = byMember ? byMember.color : '#888';

    MEMBERS.forEach(function(m, mi){
      if(m.inds.indexOf(ind) < 0) return;
      var safeInd   = ind.replace(/[^a-zA-Z]/g,'');
      var safeState = state.replace(/[^a-zA-Z]/g,'_');
      var cityKey   = mi+'-'+safeInd+'-'+safeState+'-'+city.replace(/[^a-zA-Z]/g,'_');

      // Checkbox
      var ccb = document.getElementById('ccb-'+cityKey);
      if(ccb) ccb.classList.toggle('on', isDone);

      // City name strikethrough
      var cityRow = document.getElementById('cityrow-'+cityKey);
      if(cityRow){
        var nameEl = cityRow.querySelector('.city-name');
        if(nameEl){
          nameEl.style.textDecoration = isDone ? 'line-through' : '';
          nameEl.style.color = isDone ? 'var(--hint)' : '';
        }
      }

      // Done-by cell
      var cbyEl = document.getElementById('cby-'+cityKey);
      if(cbyEl){
        if(isDone && byName){
          var img = loadAvatar(byName);
          cbyEl.innerHTML = img
            ? '<img src="'+img+'" style="width:16px;height:16px;border-radius:50%;object-fit:cover" alt="'+byName+'">'+byName
            : '<div style="width:16px;height:16px;border-radius:50%;background:'+byColor+';display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">'+byName.substring(0,2).toUpperCase()+'</div>'+byName;
        } else {
          cbyEl.innerHTML = '';
        }
      }

      // Sync status dropdown to match tick (for other members viewing this panel)
      var newStatus = isDone ? 'finished' : 'todo';
      var statusKey = 'status::'+ind+'::'+state+'::'+city;
      // Only update statusData if the member who ticked owns it
      if(byName) statusData[statusKey] = newStatus;
      // Fix 12: Handle both <select> (owner) and <span> (non-owner) elements
      var sel = document.getElementById('status-'+cityKey);
      if(sel){
        if(sel.tagName === 'SELECT'){
          sel.value=newStatus; sel.className='status-select s-'+newStatus;
        } else {
          sel.className='status-select s-'+newStatus;
          sel.textContent = newStatus==='todo'?'To Do':newStatus==='progress'?'In Progress':'Finished';
        }
      }

      // Update state badge
      var indIdx = m.inds.indexOf(ind);
      updateStateStatusBadge(ind, state, mi, indIdx);

      // State progress bar + text
      updateStateProgress(mi, ind, indIdx, state);
      updateIndProgress(mi, ind, indIdx);
      updateStats(mi);
    });
  });

  // Update sidebar counts + whichever dashboard is currently visible
  updateSidebarCounts();
  if(document.getElementById('panel-dashboard') &&
     document.getElementById('panel-dashboard').classList.contains('active')){
    buildDashboard();
  }
  if(document.getElementById('panel-territory-dashboard') &&
     document.getElementById('panel-territory-dashboard').classList.contains('active') &&
     typeof buildTerritoryDashboard === 'function'){
    buildTerritoryDashboard();
  }
}

function subscribeRealtime(){
  if(!firebaseReady || _realtimeListeners) return;
  _realtimeListeners = true;

  // Listen to city progress changes — patch UI surgically, never rebuild DOM
  firebaseDb.ref('flowtive_progress').on('value', function(snap){
    var fresh = snap.val() || {};
    if(JSON.stringify(fresh) === JSON.stringify(doneData)) return;
    var old = doneData;
    doneData = fresh;
    try{ localStorage.setItem('flowtive_usa_state_v6', JSON.stringify(doneData)); }catch(e){}
    searchIndex = [];
    patchUIFromData(old, fresh);
  });

  // Listen to status changes — update dropdowns and state badges surgically
  firebaseDb.ref('flowtive_status').on('value', function(snap){
    var fresh = snap.val() || {};
    if(JSON.stringify(fresh) === JSON.stringify(statusData)) return;
    var oldStatus = statusData;
    statusData = fresh;
    searchIndex = []; // Fix 6: Invalidate search index on status change

    // For every changed status key, also sync doneData and patch the full city UI
    MEMBERS.forEach(function(m, mi){
      m.inds.forEach(function(ind, indIdx){
        getAllStatesForInd(ind).forEach(function(s){
          var safeInd=ind.replace(/[^a-zA-Z]/g,'');
          var safeState=s.state.replace(/[^a-zA-Z]/g,'_');
          var cities=STATE_CITIES[s.state]||[];
          cities.forEach(function(city){
            var statusKey='status::'+ind+'::'+s.state+'::'+city;
            var oldVal=oldStatus[statusKey]||'todo';
            var newVal=fresh[statusKey]||'todo';
            var cityKey=mi+'-'+safeInd+'-'+safeState+'-'+city.replace(/[^a-zA-Z]/g,'_');

            // Fix 12: Update dropdown (select for owner) OR read-only span (for non-owners)
            var sel=document.getElementById('status-'+cityKey);
            if(sel){
              if(sel.tagName === 'SELECT'){
                sel.value=newVal;
                sel.className='status-select s-'+newVal;
              } else {
                // It's a read-only <span> shown to non-owners — update its text and class
                sel.className='status-select s-'+newVal;
                sel.textContent = newVal==='todo'?'To Do':newVal==='progress'?'In Progress':'Finished';
              }
            }

            // If status changed, sync checkbox + city name + done-by
            if(oldVal !== newVal){
              var doneKey=getCityKey(ind,s.state,city);
              var isDoneNow = newVal==='finished';

              // Sync doneData to match
              if(isDoneNow && !doneData[doneKey]){
                doneData[doneKey]=m.name;
              } else if(!isDoneNow && doneData[doneKey]===m.name){
                delete doneData[doneKey];
              }

              // Patch checkbox
              var ccb=document.getElementById('ccb-'+cityKey);
              if(ccb) ccb.classList.toggle('on', isDoneNow);

              // Patch city name strikethrough
              var cityRow=document.getElementById('cityrow-'+cityKey);
              if(cityRow){
                var nameEl=cityRow.querySelector('.city-name');
                if(nameEl){
                  nameEl.style.textDecoration=isDoneNow?'line-through':'';
                  nameEl.style.color=isDoneNow?'var(--hint)':'';
                }
              }

              // Patch done-by cell
              var cbyEl=document.getElementById('cby-'+cityKey);
              if(cbyEl){
                if(isDoneNow){
                  var img=loadAvatar(m.name);
                  cbyEl.innerHTML=img
                    ?'<img src="'+img+'" style="width:16px;height:16px;border-radius:50%;object-fit:cover" alt="'+m.name+'">'+m.name
                    :'<div style="width:16px;height:16px;border-radius:50%;background:'+m.color+';display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">'+m.name.substring(0,2).toUpperCase()+'</div>'+m.name;
                } else {
                  cbyEl.innerHTML='';
                }
              }

              // Update progress bars
              updateStateProgress(mi,ind,indIdx,s.state);
              updateIndProgress(mi,ind,indIdx);
              updateStats(mi);
            }
          });
          updateStateStatusBadge(ind, s.state, mi, indIdx);
        });
      });
    });

    // Sync local fallback + update sidebar + dashboard
    try{ localStorage.setItem('flowtive_usa_state_v6', JSON.stringify(doneData)); }catch(e){}
    updateSidebarCounts();
    if(document.getElementById('panel-dashboard') &&
       document.getElementById('panel-dashboard').classList.contains('active')){
      buildDashboard();
    }
    if(document.getElementById('panel-territory-dashboard') &&
       document.getElementById('panel-territory-dashboard').classList.contains('active') &&
       typeof buildTerritoryDashboard === 'function'){
      buildTerritoryDashboard();
    }
  });

  // Fix 2: Listen to notes changes — sync across all team members
  firebaseDb.ref('flowtive_notes').on('value', function(snap){
    var fresh = snap.val() || {};
    if(JSON.stringify(fresh) === JSON.stringify(notesData)) return;
    notesData = fresh;
    try{ localStorage.setItem('flowtive_notes_v1', JSON.stringify(notesData)); }catch(e){}
    // Refresh note button indicators for the active panel
    if(currentUser){
      var mi = MEMBERS.findIndex(function(m){ return m.name === currentUser.name; });
      if(mi >= 0){
        MEMBERS[mi].inds.forEach(function(ind, indIdx){
          getAllStatesForInd(ind).forEach(function(s){
            var cities = STATE_CITIES[s.state] || [];
            var safeInd = ind.replace(/[^a-zA-Z]/g,'');
            var safeState = s.state.replace(/[^a-zA-Z]/g,'_');
            cities.forEach(function(city){
              var cityKey = mi+'-'+safeInd+'-'+safeState+'-'+city.replace(/[^a-zA-Z]/g,'_');
              var btn = document.getElementById('notebtn-'+cityKey);
              if(!btn) return;
              var noteKey = 'note::'+ind+'::'+s.state+'::'+city;
              var hasNote = !!notesData[noteKey];
              if(hasNote){ btn.classList.add('has-note'); btn.title='View/edit note'; }
              else{ btn.classList.remove('has-note'); btn.title='Add note'; }
            });
          });
        });
      }
    }
  });

  // Listen to email template overrides — sync edits across all team members
  firebaseDb.ref('flowtive_email_templates').on('value', function(snap){
    var fresh = snap.val() || {};
    if(JSON.stringify(fresh) === JSON.stringify(emailOverrides)) return;
    emailOverrides = fresh;
    try{ localStorage.setItem('flowtive_email_overrides_v1', JSON.stringify(emailOverrides)); }catch(e){}
    // If an email modal is open, re-render its cards
    if(_currentOpenInd && EMAIL_TEMPLATES[_currentOpenInd]){
      EMAIL_TEMPLATES[_currentOpenInd].emails.forEach(function(_, i){
        var card = document.getElementById('email-card-'+i);
        if(card && !card.querySelector('.email-edit-textarea')){
          rerenderEmailCard(_currentOpenInd, i);
        }
      });
    }
  });

  // Listen to avatar changes
  firebaseDb.ref('flowtive_avatars').on('value', function(snap){
    if(!snap.val()) return;
    var avs = snap.val();
    var changed = false;
    Object.keys(avs).forEach(function(name){
      var key = 'flowtive_avatar_'+name.toLowerCase();
      var existing = localStorage.getItem(key);
      if(existing !== avs[name]){
        try{ localStorage.setItem(key, avs[name]); }catch(e){}
        changed = true;
      }
    });
    if(changed) applyAvatarsEverywhere();
  });
}


function loadExtras(){
  try{
    var n=localStorage.getItem('flowtive_notes_v1');  if(n) notesData=JSON.parse(n);
    var s=localStorage.getItem('flowtive_status_v1'); if(s) statusData=JSON.parse(s);
    var a=localStorage.getItem('flowtive_activity_fallback'); if(a) activityLog=JSON.parse(a);
    var eo=localStorage.getItem('flowtive_email_overrides_v1'); if(eo) emailOverrides=JSON.parse(eo);
  }catch(e){}
}

