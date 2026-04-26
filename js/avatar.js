/* Flowtive One — Avatars: upload, save, render across the app */

/* ── Avatars ────────────────────────────────────────────────── */
function getAvatarKey(name){ return 'flowtive_avatar_' + name.toLowerCase(); }

function loadAvatar(name){
  try{ return localStorage.getItem(getAvatarKey(name)) || null; }
  catch(e){ return null; }
}

function saveAvatar(name, dataUrl){
  // Fix 12: Compress the image before storing to reduce localStorage size risk
  try{
    var img = new Image();
    img.onload = function(){
      var canvas = document.createElement('canvas');
      // Cap at 80x80px — enough for all avatar display sizes in the app
      var MAX = 80;
      var scale = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      var compressed = canvas.toDataURL('image/jpeg', 0.82);
      try{
        localStorage.setItem(getAvatarKey(name), compressed);
      } catch(storageErr){
        // Fix 12: Inform user instead of silently failing
        showToast('⚠️ Storage full — avatar could not be saved. Clear browser data to free space.', '#E67E22');
        console.warn('Avatar localStorage save failed:', storageErr);
        return;
      }
      // Push to Firebase so all team members see it
      if(firebaseReady){
        firebaseDb.ref('flowtive_avatars/'+name.toLowerCase()).set(compressed).catch(function(e){
          console.warn('Avatar Firebase sync failed:', e.message);
        });
      }
    };
    img.onerror = function(){ console.warn('Avatar image load failed'); };
    img.src = dataUrl;
  }catch(e){ console.warn('Avatar save failed', e); }
}

function triggerAvatarUpload(){
  document.getElementById('av-input-topbar').click();
}

function handleAvatarUpload(input){
  if(!input.files||!input.files[0]||!currentUser) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var dataUrl = e.target.result;
    saveAvatar(currentUser.name, dataUrl);
    refreshMemberPanel();
    applyAvatarsEverywhere();
  };
  reader.readAsDataURL(input.files[0]);
}

function handleMemberAvatarUpload(input, memberName){
  if(!currentUser || currentUser.name !== memberName) return;
  if(!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var dataUrl = e.target.result;
    saveAvatar(memberName, dataUrl);
    refreshMemberPanel();
    applyAvatarsEverywhere();
  };
  reader.readAsDataURL(input.files[0]);
}

function refreshMemberPanel(){
  // Fix 5: Preserve scroll position before rebuilding
  var mainEl = document.getElementById('main');
  var savedScroll = mainEl ? mainEl.scrollTop : 0;

  var activePanelId = null;
  document.querySelectorAll('.panel').forEach(function(p){
    if(p.classList.contains('active')) activePanelId = p.id;
  });
  buildSidebar();
  buildMain();
  updateSidebarCounts();
  if(activePanelId){
    var target = document.getElementById(activePanelId);
    if(target) target.classList.add('active');
    // Re-activate correct sidebar item
    var activeIdx = activePanelId.replace('panel-','');
    if(activeIdx === 'dashboard'){
      var dashSid = document.getElementById('sid-dashboard');
      if(dashSid) dashSid.classList.add('active');
    } else {
      var memSid = document.getElementById('sid-'+activeIdx);
      if(memSid) memSid.classList.add('active');
    }
  }
  applyAvatarsEverywhere();
  // Restore scroll position after rebuild
  if(mainEl) mainEl.scrollTop = savedScroll;
}

function renderAv(name, color, size, extraClass){
  size = size || 26;
  var img = loadAvatar(name);
  var initials = name.substring(0,2).toUpperCase();
  if(img){
    return '<img class="av-img" src="'+img+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="'+name+'">';
  }
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+color+';display:flex;align-items:center;justify-content:center;font-size:'+(size<=26?10:size<=32?11:12)+'px;font-weight:700;color:#fff;flex-shrink:0'+(extraClass?';'+extraClass:'')+'">'+ initials +'</div>';
}

function applyAvatarsEverywhere(){
  if(!currentUser) return;
  var name = currentUser.name;
  var m = MEMBERS.find(function(m){ return m.name === name; });
  var color = m ? m.color : '#406093';
  var img = loadAvatar(name);

  // Update remove photo button visibility
  var removeBtn = document.getElementById('remove-photo-btn');
  if(removeBtn) removeBtn.style.display = img ? '' : 'none';

  // Topbar pill
  var pillAv = document.getElementById('user-pill-av');
  if(pillAv){
    if(img){
      pillAv.innerHTML = '';
      pillAv.style.background = 'transparent';
      pillAv.style.padding = '0';
      pillAv.innerHTML = '<img src="'+img+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:block" alt="'+name+'">';
    } else {
      pillAv.innerHTML = name.substring(0,2).toUpperCase();
      pillAv.style.background = color;
      pillAv.style.overflow = '';
    }
  }

  // Sidebar avatars — update all 6 member items, preserve presence dot
  MEMBERS.forEach(function(mem, i){
    var sidAv = document.getElementById('sid-av-'+i);
    if(!sidAv) return;
    var memImg = loadAvatar(mem.name);
    if(memImg){
      sidAv.style.background = 'transparent';
      sidAv.style.overflow = 'hidden';
      sidAv.style.padding = '0';
      sidAv.innerHTML = '<img src="'+memImg+'" style="width:26px;height:26px;border-radius:50%;object-fit:cover;display:block" alt="'+mem.name+'">';
    } else {
      sidAv.innerHTML = mem.name.substring(0,2).toUpperCase();
      sidAv.style.background = mem.color;
      sidAv.style.overflow = '';
      sidAv.style.padding = '';
    }
  });

  // Page title avatars
  MEMBERS.forEach(function(mem, i){
    var ptAv = document.getElementById('pt-av-'+i);
    if(!ptAv) return;
    var memImg = loadAvatar(mem.name);
    if(memImg){
      ptAv.innerHTML = '<img src="'+memImg+'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block" alt="'+mem.name+'">';
      ptAv.style.background = 'transparent';
    } else {
      ptAv.innerHTML = mem.name.substring(0,2).toUpperCase();
      ptAv.style.background = mem.color;
      ptAv.style.overflow = '';
    }
  });

  // Leaderboard avatars (guard: panel may not exist if app shell hasn't built yet)
  var dashPanel = document.getElementById('panel-dashboard');
  if(dashPanel && dashPanel.classList.contains('active')) buildDashboard();

  // Done-by avatars in all state table rows
  document.querySelectorAll('[id^="by-"]').forEach(function(el){
    var text = el.textContent.trim();
    if(!text) return;
    var matchedMember = MEMBERS.find(function(m){ return el.textContent.indexOf(m.name) >= 0; });
    if(!matchedMember) return;
    var img = loadAvatar(matchedMember.name);
    if(img){
      el.innerHTML = '<img src="'+img+'" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px" alt="'+matchedMember.name+'">'+matchedMember.name;
    }
  });
}


function removeAvatar(){
  if(!currentUser) return;
  var name = currentUser.name;
  if(!loadAvatar(name)){ showToast('No profile photo to remove.', '#6B7280'); return; }
  // Remove from localStorage
  try{ localStorage.removeItem(getAvatarKey(name)); }catch(e){}
  // Remove from Firebase
  if(firebaseReady){
    firebaseDb.ref('flowtive_avatars/'+name.toLowerCase()).remove().catch(function(e){
      console.warn('Avatar Firebase remove failed:', e.message);
    });
  }
  // Update topbar pill back to initials
  var m = MEMBERS.find(function(m){ return m.name === name; });
  var color = m ? m.color : '#406093';
  var pillEl = document.getElementById('user-pill-av');
  if(pillEl){ pillEl.innerHTML = name.substring(0,2).toUpperCase(); pillEl.style.background = color; }
  // Hide remove button
  var removeBtn = document.getElementById('remove-photo-btn');
  if(removeBtn) removeBtn.style.display = 'none';
  // Refresh everywhere
  refreshMemberPanel();
  applyAvatarsEverywhere();
  showToast('Profile photo removed.', '#6B7280');
}

