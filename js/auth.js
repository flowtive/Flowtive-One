/* Flowtive One — Auth: login / logout / session restore / welcome modal */


/* ── Auth ──────────────────────────────────────────────────────── */


function togglePass(){
  var inp = document.getElementById('login-pass');
  var btn = document.getElementById('pass-toggle-btn');
  if(inp.type === 'password'){inp.type = 'text'; btn.textContent = 'Hide';}
  else{inp.type = 'password'; btn.textContent = 'Show';}
}

function doLogin(){
  var email = document.getElementById('login-email').value.trim().toLowerCase();
  var pass  = document.getElementById('login-pass').value;
  var errEl = document.getElementById('login-error');
  var btn   = document.getElementById('login-btn');

  document.getElementById('login-email').classList.remove('error');
  document.getElementById('login-pass').classList.remove('error');
  errEl.classList.remove('show');

  var account = TEAM_ACCOUNTS.find(function(a){ return a.email === email; });
  if(!account || pass !== TEAM_PASSWORD){
    document.getElementById('login-email').classList.add('error');
    document.getElementById('login-pass').classList.add('error');
    errEl.classList.add('show');
    btn.disabled = false; // Fix 7: Always re-enable on failure
    return;
  }

  currentUser = account;
  var _isFirst = isFirstLogin();
  localStorage.setItem('flowtive_user', JSON.stringify(account));
  // Hint to Chrome's password manager to save credentials
  if(window.PasswordCredential){
    var cred = new PasswordCredential({id: email, password: pass});
    navigator.credentials.store(cred).catch(function(){});
  }
  showApp();
  if(_isFirst){ setTimeout(showWelcome, 600); }
}

function doLogout(){
  stopClock();
  // Auto-clock-out the current user before tearing down Firebase listeners
  if(currentUser && firebaseReady && clockActive[currentUser.name]){
    try{ clockOut({silent:true}); }catch(e){}
  }
  unsubscribeClock();
  unsubscribeTasks();
  // Fix 3: Detach Firebase listeners before clearing state so they don't fire on stale data
  if(firebaseReady && firebaseDb){
    firebaseDb.ref('flowtive_progress').off();
    firebaseDb.ref('flowtive_status').off();
    firebaseDb.ref('flowtive_notes').off();
    firebaseDb.ref('flowtive_email_templates').off();
    firebaseDb.ref('flowtive_activity').off();
    firebaseDb.ref('flowtive_avatars').off();
    firebaseDb.ref('flowtive_presence').off();
    firebaseDb.ref('.info/connected').off();
  }
  // Reset all listener guards so they re-subscribe on next login
  _realtimeListeners = false;
  _activityListener = null;
  _presenceListener = false;
  firebaseReady = false;
  firebaseApp = null;
  firebaseDb = null;

  localStorage.removeItem('flowtive_user');
  currentUser = null;
  appInitialized = false;
  doneData = {};
  // Fix 8: Also clear statusData, notesData, claimsData and activityLog on logout
  statusData = {};
  notesData = {};
  claimsData = {};
  activityLog = [];
  emailOverrides = {};
  // Fix 6: Reset activity feed pagination on logout
  _activityShowCount = 20;
  document.getElementById('app').classList.add('app-hidden');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').classList.remove('show');
}

function showApp(){
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.remove('app-hidden');

  var m = MEMBERS.find(function(m){ return m.name === currentUser.name; });
  var color = m ? m.color : '#406093';
  var _pillImg1 = loadAvatar(currentUser.name);
  var _pillEl1 = document.getElementById('user-pill-av');
  if(_pillImg1){ _pillEl1.innerHTML='<img src="'+_pillImg1+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:block" alt="'+currentUser.name+'">'; _pillEl1.style.background='transparent'; }
  else { _pillEl1.style.background=color; _pillEl1.textContent=currentUser.name.substring(0,2).toUpperCase(); }
  document.getElementById('user-pill-name').textContent = currentUser.name;

  startClock();
  initApp().then(function(){ applyAvatarsEverywhere(); subscribeClock(); subscribeTasks(); });
}


/* ── Welcome Modal ── */
function showWelcome(){
  var modal = document.getElementById('welcome-backdrop');
  if(!modal) return;
  var title = document.getElementById('welcome-title');
  if(title && currentUser) title.textContent = 'Hey, '+currentUser.name+'! 👋';
  modal.classList.remove('app-hidden');
}

function closeWelcome(){
  var modal = document.getElementById('welcome-backdrop');
  if(modal) modal.classList.add('app-hidden');
  if(currentUser){
    localStorage.setItem('flowtive_welcomed_'+currentUser.name.toLowerCase(), '1');
  }
}

function isFirstLogin(){
  if(!currentUser) return false;
  return !localStorage.getItem('flowtive_welcomed_'+currentUser.name.toLowerCase());
}

