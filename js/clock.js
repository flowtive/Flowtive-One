/* Flowtive One — Topbar live clock + work-time tracker (clock in/out) */

/* ── Per-second tick — drives the live elapsed time on Stop Work buttons ──
   (Topbar live clock was removed in favour of relying on the OS clock; this
    interval just keeps the work-timer pill label updating in real time.) */
var _clockInterval = null;
var _clockTimeout = null;
function tickClock(){
  if(typeof tickClockUI === 'function') tickClockUI();
}
function startClock(){
  tickClock();
  if(_clockInterval) clearInterval(_clockInterval);
  if(_clockTimeout) clearTimeout(_clockTimeout);
  // Align to the next whole second, then tick every second
  var msToSecond = 1000 - (Date.now() % 1000);
  _clockTimeout = setTimeout(function(){
    tickClock();
    _clockInterval = setInterval(tickClock, 1000);
  }, msToSecond);
}
function stopClock(){
  if(_clockInterval) clearInterval(_clockInterval);
  if(_clockTimeout) clearTimeout(_clockTimeout);
  _clockInterval = null;
  _clockTimeout = null;
}


/* ── Time Tracker (Clock in / Clock out) ─────────────────────────── */
var clockSessions = {};   // {sessionId: {user, start, end, durationMs, autoClosed?}}
var clockActive = {};     // {userName: {sessionId, start, user}}
var _clockSubscribed = false;
var SESSION_AUTO_CLOSE_MS = 16*60*60*1000; // 16h cap

function fmtElapsed(ms){
  if(!ms || ms < 0) return '0m';
  var totalMin = Math.floor(ms/60000);
  var h = Math.floor(totalMin/60);
  var m = totalMin%60;
  if(h > 0) return h+'h '+m+'m';
  if(totalMin > 0) return m+'m';
  return Math.max(1, Math.floor(ms/1000))+'s';
}
function fmtHours(ms){
  if(!ms || ms <= 0) return '0';
  var h = ms/3600000;
  return (Math.round(h*10)/10).toString();
}

function subscribeClock(){
  if(!firebaseReady || _clockSubscribed) return;
  _clockSubscribed = true;
  firebaseDb.ref('flowtive_time_active').on('value', function(snap){
    clockActive = snap.val() || {};
    autoCloseStaleOwnSession();
    renderClockButton();
    renderOnTheClockCard();
    renderSidebarClockBadges();
  });
  firebaseDb.ref('flowtive_time_sessions').orderByChild('start').limitToLast(500).on('value', function(snap){
    clockSessions = snap.val() || {};
    if(document.getElementById('panel-dashboard') && document.getElementById('panel-dashboard').classList.contains('active')){
      renderHoursThisWeek();
    }
  });
}
function unsubscribeClock(){
  if(firebaseReady && firebaseDb){
    try{ firebaseDb.ref('flowtive_time_active').off(); }catch(e){}
    try{ firebaseDb.ref('flowtive_time_sessions').off(); }catch(e){}
  }
  _clockSubscribed = false;
  clockSessions = {};
  clockActive = {};
}

function clockIn(){
  if(!currentUser) return;
  if(!firebaseReady){ showToast('Cannot Start Work — Offline'); return; }
  var name = currentUser.name;
  if(clockActive[name]) return; // already started
  var ref = firebaseDb.ref('flowtive_time_sessions').push();
  var id = ref.key;
  var now = Date.now();
  var rec = {user:name, start:now, end:null, durationMs:null};
  ref.set(rec).catch(function(){ showToast('Start Work Failed'); });
  firebaseDb.ref('flowtive_time_active/'+name).set({sessionId:id, start:now, user:name}).catch(function(){});
  logActivity(name, 'clock_in', null, null, null, {sessionId:id});
  showToast('Started Work', '#065F46');
}

function clockOut(opts){
  if(!currentUser) return;
  if(!firebaseReady) return;
  opts = opts || {};
  var name = currentUser.name;
  var active = clockActive[name];
  if(!active) return;
  var end = opts.endAt || Date.now();
  var dur = end - active.start;
  if(dur < 0) dur = 0;
  var update = {end:end, durationMs:dur};
  if(opts.autoClosed) update.autoClosed = true;
  firebaseDb.ref('flowtive_time_sessions/'+active.sessionId).update(update).catch(function(){});
  firebaseDb.ref('flowtive_time_active/'+name).remove().catch(function(){});
  logActivity(name, opts.autoClosed?'clock_auto':'clock_out', null, null, null, {sessionId:active.sessionId, durationMs:dur});
  if(!opts.silent) showToast('Stopped Work · '+fmtElapsed(dur), '#991B1B');
}

function toggleClock(){
  if(!currentUser) return;
  if(clockActive[currentUser.name]) clockOut();
  else clockIn();
}

function autoCloseStaleOwnSession(){
  if(!currentUser) return;
  var active = clockActive[currentUser.name];
  if(!active) return;
  if(Date.now() - active.start > SESSION_AUTO_CLOSE_MS){
    clockOut({endAt: active.start + SESSION_AUTO_CLOSE_MS, autoClosed:true, silent:true});
  }
}

function renderClockButton(){
  if(!currentUser) return;
  var active = clockActive[currentUser.name];
  // Update every .clock-btn on the page (sidebar footer, future locations)
  document.querySelectorAll('.clock-btn').forEach(function(btn){
    var label = btn.querySelector('.clock-btn-label-text');
    if(active){
      var elapsed = Date.now() - active.start;
      btn.classList.add('running');
      if(label) label.textContent = 'Stop Work · '+fmtElapsed(elapsed);
      btn.title = 'Click To Stop Work';
    } else {
      btn.classList.remove('running');
      if(label) label.textContent = 'Start Work';
      btn.title = 'Click To Start Work';
    }
  });
}

function renderSidebarClockBadges(){
  MEMBERS.forEach(function(m, i){
    var pill = document.getElementById('sid-clock-'+i);
    var count = document.getElementById('sid-count-'+i);
    if(!pill) return;
    var active = clockActive[m.name];
    if(active){
      pill.style.display = 'inline-flex';
      pill.textContent = fmtElapsed(Date.now() - active.start);
      if(count) count.style.display = 'none';
    } else {
      pill.style.display = 'none';
      if(count) count.style.display = '';
    }
  });
}

function renderOnTheClockCard(){
  var card = document.getElementById('otc-card');
  var list = document.getElementById('otc-list');
  if(!card || !list) return;
  var entries = Object.keys(clockActive).map(function(k){ return clockActive[k]; }).filter(Boolean);
  if(!entries.length){ card.classList.remove('show'); list.innerHTML=''; return; }
  card.classList.add('show');
  // Sort by start asc (longest-running first)
  entries.sort(function(a,b){ return a.start - b.start; });
  list.innerHTML = entries.map(function(a){
    var m = MEMBERS.find(function(x){return x.name===a.user;}) || {name:a.user, color:'#6B7280'};
    var img = (typeof loadAvatar==='function') ? loadAvatar(m.name) : null;
    var avInner = img
      ? '<img src="'+img+'" alt="'+escapeHtml(m.name)+'">'
      : escapeHtml(m.name.substring(0,2).toUpperCase());
    var bg = img ? 'transparent' : m.color;
    return '<div class="otc-item">'
      + '<div class="otc-av" style="background:'+bg+'">'+avInner+'</div>'
      + '<span>'+escapeHtml(m.name)+'</span>'
      + '<span class="otc-time">'+fmtElapsed(Date.now()-a.start)+'</span>'
      + '</div>';
  }).join('');
}

function renderHoursThisWeek(){
  var ctx = document.getElementById('hours-week-chart-canvas');
  if(!ctx) return;
  if(charts.hoursWeek){ charts.hoursWeek.destroy(); }

  // Build last 7 day labels (oldest first)
  var labels=[];
  var dayStarts=[];
  var now = new Date();
  var todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  for(var i=6;i>=0;i--){
    var d = new Date(todayStart); d.setDate(todayStart.getDate()-i);
    labels.push(d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}));
    dayStarts.push(d.getTime());
  }
  // Per member, sum hours per day
  var datasets = MEMBERS.map(function(m){
    var dayHours = new Array(7).fill(0);
    Object.values(clockSessions||{}).forEach(function(s){
      if(!s || s.user !== m.name || !s.start) return;
      // Effective end: real end OR now (for active session)
      var end = s.end || Date.now();
      // Distribute across days the session spans
      for(var di=0; di<7; di++){
        var ds = dayStarts[di];
        var de = ds + 86400000;
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
  charts.hoursWeek = new Chart(ctx,{
    type:'bar',
    data:{ labels: labels, datasets: datasets },
    options:{
      responsive:true,
      maintainAspectRatio:false,
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


function tickClockUI(){
  if(!currentUser) return;
  var active = clockActive[currentUser.name];
  // Update label on every .clock-btn (topbar, tasks toolbar, etc.) when running
  if(active){
    var elapsed = Date.now() - active.start;
    document.querySelectorAll('.clock-btn .clock-btn-label-text').forEach(function(label){
      label.textContent = 'Stop Work · '+fmtElapsed(elapsed);
    });
  }
  // Update per-task timer counters (row pills + modal total) every second
  if(typeof tickTaskTimers === 'function') tickTaskTimers();
  // Update sidebar badges + otc card every minute (less frequent than per-second to save reflows)
  var now = Date.now();
  if(!tickClockUI._lastMinute || (now - tickClockUI._lastMinute) > 30000){
    tickClockUI._lastMinute = now;
    renderSidebarClockBadges();
    if(document.getElementById('panel-dashboard') && document.getElementById('panel-dashboard').classList.contains('active')){
      renderOnTheClockCard();
    }
  }
}

// Check session on load
