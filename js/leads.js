/* Flowtive One — Lead tracking: state/city helpers, member panels, status, notes */

function getStatePriority(ind,state){
  var p=IND_STATE_PRIORITY[ind];
  if(!p)return 3;
  if(p.P1.indexOf(state)>=0)return 1;
  if(p.P2.indexOf(state)>=0)return 2;
  return 3;
}

function getStateWhy(ind,state){
  var w=WHY[ind];
  if(w&&w[state])return w[state];
  var p=getStatePriority(ind,state);
  if(p===1)return "Top priority market for "+ind;
  if(p===2)return "Strong market for "+ind;
  return "Good coverage market for "+ind;
}

function getAllStatesForInd(ind){
  var p=IND_STATE_PRIORITY[ind]||{P1:[],P2:[]};
  var all=[];
  p.P1.forEach(function(s){all.push({state:s,priority:1});});
  p.P2.forEach(function(s){all.push({state:s,priority:2});});
  US_STATES.forEach(function(s){
    if(p.P1.indexOf(s)<0&&p.P2.indexOf(s)<0)all.push({state:s,priority:3});
  });
  return all;
}

function getCityKey(ind,state,city){ return ind+'::'+state+'::'+city; }
function isCityDone(ind,state,city){ return !!doneData[getCityKey(ind,state,city)]; }
function getCityDoneBy(ind,state,city){ return doneData[getCityKey(ind,state,city)]||null; }

function countCitiesDoneForState(ind,state){
  var cities=STATE_CITIES[state]||[];
  return cities.filter(function(c){return isCityDone(ind,state,c);}).length;
}

function countTotalCitiesForMember(mi){
  var m=MEMBERS[mi],c=0;
  m.inds.forEach(function(ind){
    getAllStatesForInd(ind).forEach(function(s){
      c+=countCitiesDoneForState(ind,s.state);
    });
  });
  return c;
}

function totalCitiesDoneAll(){
  var c=0;
  MEMBERS.forEach(function(_,i){c+=countTotalCitiesForMember(i);});
  return c;
}

function totalCitiesForMember(mi){
  var m=MEMBERS[mi],c=0;
  m.inds.forEach(function(ind){
    getAllStatesForInd(ind).forEach(function(s){
      c+=(STATE_CITIES[s.state]||[]).length;
    });
  });
  return c;
}

function countCitiesDoneForInd(ind){
  var c=0;
  getAllStatesForInd(ind).forEach(function(s){
    c+=countCitiesDoneForState(ind,s.state);
  });
  return c;
}

function totalCitiesForInd(ind){
  var c=0;
  getAllStatesForInd(ind).forEach(function(s){
    c+=(STATE_CITIES[s.state]||[]).length;
  });
  return c;
}

function getMemberForState(ind,state){ return doneData[ind+'::'+state]||null; }

function countDoneForMember(mi){ return countTotalCitiesForMember(mi); }
function totalDoneAll(){ return totalCitiesDoneAll(); }
function countDoneForInd(ind){ return countCitiesDoneForInd(ind); }

function countFullyDoneStates(){
  var count=0;
  ALL_INDUSTRIES.forEach(function(ind){
    getAllStatesForInd(ind).forEach(function(s){
      var cities=STATE_CITIES[s.state]||[];
      if(cities.length>0 && cities.every(function(c){return isCityDone(ind,s.state,c);})) count++;
    });
  });
  return count;
}

function totalPossibleStates(){
  var count=0;
  ALL_INDUSTRIES.forEach(function(ind){
    count+=getAllStatesForInd(ind).length;
  });
  return count;
}


function updateStats(mi){
  var m=MEMBERS[mi];
  var totalCities=totalCitiesForMember(mi);
  var doneCities=countTotalCitiesForMember(mi);
  var hotCities=0;
  m.inds.forEach(function(ind){
    getAllStatesForInd(ind).forEach(function(s){
      if(s.priority===1) hotCities+=countCitiesDoneForState(ind,s.state);
    });
  });
  var el=document.getElementById('stats-'+mi);
  if(el)el.innerHTML=
    '<div class="stat-card"><div class="stat-num">'+totalCities+'</div><div class="stat-label">Total Cities</div></div>'+
    '<div class="stat-card"><div class="stat-num" style="color:#E67E22">'+hotCities+'</div><div class="stat-label">Hot Cities Done</div></div>'+
    '<div class="stat-card"><div class="stat-num" style="color:var(--success)">'+doneCities+'</div><div class="stat-label">Cities Covered</div></div>';
}

function updateIndProgress(mi,ind,indIdx){
  var doneCities=0,totalCities=0;
  getAllStatesForInd(ind).forEach(function(s){
    doneCities+=countCitiesDoneForState(ind,s.state);
    totalCities+=(STATE_CITIES[s.state]||[]).length;
  });
  var el=document.getElementById('prog-'+mi+'-'+indIdx);
  if(el)el.textContent=doneCities+'/'+totalCities+' cities';
}

function updateStateProgress(mi,ind,indIdx,state){
  var cities=STATE_CITIES[state]||[];
  var done=countCitiesDoneForState(ind,state);
  var total=cities.length;
  var pct=total>0?Math.round(done/total*100):0;
  var safeState=state.replace(/[^a-zA-Z]/g,'_');
  var barEl=document.getElementById('spbar-'+mi+'-'+ind.replace(/[^a-zA-Z]/g,'')+'-'+safeState);
  var textEl=document.getElementById('sptext-'+mi+'-'+ind.replace(/[^a-zA-Z]/g,'')+'-'+safeState);
  if(barEl) barEl.style.width=pct+'%';
  if(textEl) textEl.textContent=done+'/'+total;
}


async function toggleCity(mi,ind,state,city,indIdx){
  if(!currentUser)return;
  var m=MEMBERS[mi];
  if(m.name!==currentUser.name)return;
  var key=getCityKey(ind,state,city);
  var wasDone = !!doneData[key];
  if(doneData[key]===m.name){ delete doneData[key]; }
  else if(doneData[key]){
    // Fix 4: Inform user why the tick is blocked
    showToast('⚠️ This city was marked done by '+doneData[key], 'warning');
    return;
  }
  else{ doneData[key]=m.name; }
  var isDoneNow = !!doneData[key];
  logActivity(m.name, isDoneNow?'tick':'untick', ind, state, city);

  // Update city row UI
  var safeInd=ind.replace(/[^a-zA-Z]/g,'');
  var safeState=state.replace(/[^a-zA-Z]/g,'_');
  var cityKey=mi+'-'+safeInd+'-'+safeState+'-'+city.replace(/[^a-zA-Z]/g,'_');
  var ccb=document.getElementById('ccb-'+cityKey);
  var cityRow=document.getElementById('cityrow-'+cityKey);
  var cbyEl=document.getElementById('cby-'+cityKey);
  if(ccb){ ccb.classList.toggle('on',isDoneNow); }
  if(cityRow){
    var nameEl=cityRow.querySelector('.city-name');
    if(nameEl){
      if(isDoneNow){ nameEl.style.textDecoration='line-through'; nameEl.style.color='var(--hint)'; }
      else{ nameEl.style.textDecoration=''; nameEl.style.color=''; }
    }
  }
  if(cbyEl){
    if(isDoneNow){
      var img=loadAvatar(m.name);
      cbyEl.innerHTML=img
        ?'<img src="'+img+'" style="width:16px;height:16px;border-radius:50%;object-fit:cover" alt="'+m.name+'">'+m.name
        :'<div style="width:16px;height:16px;border-radius:50%;background:'+m.color+';display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">'+m.name.substring(0,2).toUpperCase()+'</div>'+m.name;
    } else { cbyEl.innerHTML=''; }
  }

  // Sync status dropdown to match tick state
  // Fix 5: Preserve 'progress' status — only upgrade to 'finished' on tick, only reset to 'todo' on untick if not 'progress'
  var statusKey='status::'+ind+'::'+state+'::'+city;
  var currentStatus = statusData[statusKey] || 'todo';
  var newStatus;
  if(isDoneNow){
    newStatus = 'finished'; // tick always marks finished
  } else {
    // untick: if it was 'progress', preserve it; otherwise reset to 'todo'
    newStatus = currentStatus === 'progress' ? 'progress' : 'todo';
  }
  statusData[statusKey] = newStatus;
  var sel=document.getElementById('status-'+cityKey);
  if(sel){ sel.value=newStatus; sel.className='status-select s-'+newStatus; }
  updateStateStatusBadge(ind, state, mi, indIdx);

  // Update state progress bar
  updateStateProgress(mi,ind,indIdx,state);
  // Update industry progress
  updateIndProgress(mi,ind,indIdx);
  updateStats(mi);
  updateSidebarCounts();
  if(document.getElementById('panel-dashboard').classList.contains('active')) buildDashboard();
  var tDash = document.getElementById('panel-territory-dashboard');
  if(tDash && tDash.classList.contains('active') && typeof buildTerritoryDashboard === 'function') buildTerritoryDashboard();
  await saveData();
  saveExtras();
}



/* ── Notes ── */
function openNoteModal(ind, state, city){
  // Fix 10: Determine the owner of this industry/state/city
  var ownerMember = null;
  MEMBERS.forEach(function(m){
    if(m.inds.indexOf(ind) >= 0) ownerMember = m;
  });
  var isOwner = currentUser && ownerMember && currentUser.name === ownerMember.name;

  var key='note::'+ind+'::'+state+'::'+city;
  var existingNote = notesData[key]||'';
  _noteContext = {ind:ind, state:state, city:city, readOnly: !isOwner, originalNote: existingNote}; // Fix 15: store original
  document.getElementById('note-modal-title').textContent = city+', '+state;
  document.getElementById('note-modal-sub').textContent = isOwner
    ? ind+' — add a note about this city'
    : ind+' — note by '+( ownerMember ? ownerMember.name : 'team')+' (read-only)';
  var ta = document.getElementById('note-textarea');
  ta.value = existingNote;
  ta.readOnly = !isOwner;
  ta.style.background = isOwner ? '' : 'var(--bg-elevated)';
  ta.style.color = isOwner ? '' : 'var(--muted)';
  // Hide save/clear for non-owners
  document.getElementById('note-clear-btn').style.display = isOwner ? '' : 'none';
  document.querySelector('.note-btn-save').style.display = isOwner ? '' : 'none';
  document.getElementById('note-modal-backdrop').classList.remove('app-hidden');
  setTimeout(function(){ if(isOwner) ta.focus(); },80);
}

function cancelNoteModal(){
  // Fix 15: Restore original note on explicit Cancel click
  if(_noteContext && _noteContext.originalNote !== undefined){
    document.getElementById('note-textarea').value = _noteContext.originalNote;
  }
  document.getElementById('note-modal-backdrop').classList.add('app-hidden');
  _noteContext = null;
}

function closeNoteModal(e){
  if(e && e.target !== document.getElementById('note-modal-backdrop')) return;
  // Fix 15: Restore original note text so reopening shows saved state, not typed-but-unsaved text
  if(_noteContext && _noteContext.originalNote !== undefined){
    document.getElementById('note-textarea').value = _noteContext.originalNote;
  }
  document.getElementById('note-modal-backdrop').classList.add('app-hidden');
  _noteContext = null;
}

function saveNote(){
  if(!_noteContext) return;
  if(_noteContext.readOnly) return; // Fix 10: Block saves for non-owners
  var key='note::'+_noteContext.ind+'::'+_noteContext.state+'::'+_noteContext.city;
  var val=document.getElementById('note-textarea').value.trim();
  if(val){ notesData[key]=val; } else { delete notesData[key]; }

  // Update note button appearance
  var mi=MEMBERS.findIndex(function(m){return currentUser&&m.name===currentUser.name;});
  var safeInd=_noteContext.ind.replace(/[^a-zA-Z]/g,'');
  var safeState=_noteContext.state.replace(/[^a-zA-Z]/g,'_');
  var cityKey=mi+'-'+safeInd+'-'+safeState+'-'+_noteContext.city.replace(/[^a-zA-Z]/g,'_');
  var btn=document.getElementById('notebtn-'+cityKey);
  if(btn){
    if(val){btn.classList.add('has-note');btn.title='View/edit note';}
    else{btn.classList.remove('has-note');btn.title='Add note';}
  }

  // Log activity
  if(val && currentUser){
    logActivity(currentUser.name,'note',_noteContext.ind,_noteContext.state,_noteContext.city);
  }

  saveExtras();
  searchIndex = []; // Fix 10: invalidate search index after note save
  document.getElementById('note-modal-backdrop').classList.add('app-hidden');
  _noteContext=null;
}

function clearNote(){
  document.getElementById('note-textarea').value='';
}


/* ── City Status ── */
async function setCityStatus(ind, state, city, mi, indIdx, selectEl){
  if(!currentUser) return;
  var m = MEMBERS[mi];
  if(m.name !== currentUser.name) return;

  var val = selectEl.value;
  var key = 'status::'+ind+'::'+state+'::'+city;
  var prevStatus = statusData[key] || 'todo'; // capture before overwrite
  statusData[key] = val;

  // Log the status change with from/to context
  logActivity(m.name, 'status_change', ind, state, city, {fromStatus: prevStatus, toStatus: val});

  // Update dropdown color class
  selectEl.className = 'status-select s-'+val;

  // If Finished → auto-tick; if back to todo/progress → untick
  var cityDoneKey = getCityKey(ind, state, city);
  if(val === 'finished'){
    if(!doneData[cityDoneKey]){
      doneData[cityDoneKey] = m.name;
      // No separate tick log — the status_change entry already covers this
      // Update checkbox + city name UI
      var safeInd=ind.replace(/[^a-zA-Z]/g,'');
      var safeState=state.replace(/[^a-zA-Z]/g,'_');
      var cityKey=mi+'-'+safeInd+'-'+safeState+'-'+city.replace(/[^a-zA-Z]/g,'_');
      var ccb=document.getElementById('ccb-'+cityKey);
      if(ccb) ccb.classList.add('on');
      var cityRow=document.getElementById('cityrow-'+cityKey);
      if(cityRow){ var nameEl=cityRow.querySelector('.city-name'); if(nameEl){nameEl.style.textDecoration='line-through';nameEl.style.color='var(--hint)';} }
      var cbyEl=document.getElementById('cby-'+cityKey);
      if(cbyEl){ var img=loadAvatar(m.name); cbyEl.innerHTML=img?'<img src="'+img+'" style="width:16px;height:16px;border-radius:50%;object-fit:cover" alt="'+m.name+'">'+m.name:'<div style="width:16px;height:16px;border-radius:50%;background:'+m.color+';display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">'+m.name.substring(0,2).toUpperCase()+'</div>'+m.name; }
      await saveData(); // Fix 2: await so sync indicator reflects true save state
    }
  } else if(val === 'todo' || val === 'progress'){
    if(doneData[cityDoneKey] === m.name){
      delete doneData[cityDoneKey];
      // No separate untick log — the status_change entry already covers this
      var safeInd2=ind.replace(/[^a-zA-Z]/g,'');
      var safeState2=state.replace(/[^a-zA-Z]/g,'_');
      var cityKey2=mi+'-'+safeInd2+'-'+safeState2+'-'+city.replace(/[^a-zA-Z]/g,'_');
      var ccb2=document.getElementById('ccb-'+cityKey2);
      if(ccb2) ccb2.classList.remove('on');
      var cityRow2=document.getElementById('cityrow-'+cityKey2);
      if(cityRow2){ var nameEl2=cityRow2.querySelector('.city-name'); if(nameEl2){nameEl2.style.textDecoration='';nameEl2.style.color='';} }
      var cbyEl2=document.getElementById('cby-'+cityKey2);
      if(cbyEl2) cbyEl2.innerHTML='';
      await saveData(); // Fix 2: await so sync indicator reflects true save state
    }
  }

  // Update state status badge
  updateStateStatusBadge(ind, state, mi, indIdx);
  updateStateProgress(mi, ind, indIdx, state);
  updateIndProgress(mi, ind, indIdx);
  updateStats(mi);
  updateSidebarCounts();
  if(document.getElementById('panel-dashboard').classList.contains('active')) buildDashboard();
  var tDash2 = document.getElementById('panel-territory-dashboard');
  if(tDash2 && tDash2.classList.contains('active') && typeof buildTerritoryDashboard === 'function') buildTerritoryDashboard();
  saveExtras();
}

function updateStateStatusBadge(ind, state, mi, indIdx){
  var safeInd=ind.replace(/[^a-zA-Z]/g,'');
  var safeState=state.replace(/[^a-zA-Z]/g,'_');
  var stateId='st-'+mi+'-'+safeInd+'-'+safeState;
  var badgeWrap=document.getElementById('state-status-'+stateId);
  if(!badgeWrap) return;
  var cities=STATE_CITIES[state]||[];
  var allStatuses=cities.map(function(c){ return statusData['status::'+ind+'::'+state+'::'+c]||'todo'; });
  var badge=mi>=0&&MEMBERS[mi]?
    (getAllStatesForInd(ind).find(function(s){return s.state===state;})||{priority:3}).priority===1?'<span class="pri-badge p1">Hot</span>':
    (getAllStatesForInd(ind).find(function(s){return s.state===state;})||{priority:3}).priority===2?'<span class="pri-badge p2">Strong</span>':'<span class="pri-badge p3">Good</span>':'';
  var statusBadge='';
  if(cities.length>0 && allStatuses.every(function(s){return s==='finished';})){
    statusBadge='<span class="state-status-badge ssb-finished">✓ Completed</span>';
  } else if(allStatuses.some(function(s){return s==='progress'||s==='finished';})){
    statusBadge='<span class="state-status-badge ssb-progress">● In Progress</span>';
  }
  badgeWrap.innerHTML=badge+statusBadge;
}

