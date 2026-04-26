/* Flowtive One — Topbar behaviours: user dropdown, scroll shadow, Cmd+K, goHome */

function toggleUserDropdown(){
  var dd = document.getElementById('user-dropdown');
  var wrap = document.getElementById('user-pill-wrap');
  if(!dd) return;
  var removeBtn = document.getElementById('remove-photo-btn');
  if(removeBtn && currentUser){
    removeBtn.style.display = loadAvatar(currentUser.name) ? '' : 'none';
  }
  var open = dd.classList.toggle('open');
  if(wrap) wrap.classList.toggle('open', open);
}
function closeUserDropdown(){
  var dd = document.getElementById('user-dropdown');
  var wrap = document.getElementById('user-pill-wrap');
  if(dd) dd.classList.remove('open');
  if(wrap) wrap.classList.remove('open');
}
document.addEventListener('click', function(e){
  var wrap = document.getElementById('user-pill-wrap');
  if(wrap && !wrap.contains(e.target)){
    closeUserDropdown();
  }
});

/* ── World-class topbar behaviours ── */
/* Scroll-aware shadow on the topbar */
(function(){
  function updateTopbarScrollState(){
    var bar = document.getElementById('topbar');
    if(!bar) return;
    bar.classList.toggle('is-scrolled', (window.scrollY || document.documentElement.scrollTop) > 4);
  }
  window.addEventListener('scroll', updateTopbarScrollState, {passive:true});
  // Also listen on .main scroll (the inner scrolling region)
  document.addEventListener('DOMContentLoaded', function(){
    var main = document.getElementById('main');
    if(main){ main.addEventListener('scroll', function(){
      var bar = document.getElementById('topbar'); if(!bar) return;
      bar.classList.toggle('is-scrolled', main.scrollTop > 4);
    }, {passive:true}); }
  });
  // Run once on load
  updateTopbarScrollState();
})();

/* Cmd/Ctrl + K → focus the search input */
document.addEventListener('keydown', function(e){
  var isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
  var modKey = isMac ? e.metaKey : e.ctrlKey;
  if(modKey && (e.key === 'k' || e.key === 'K')){
    var input = document.getElementById('search-input');
    if(input){
      e.preventDefault();
      input.focus();
      input.select();
    }
  }
});

/* Show the right shortcut symbol on non-Mac */
(function(){
  try{
    var kbd = document.getElementById('search-kbd');
    if(kbd){
      var isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
      kbd.textContent = isMac ? '⌘K' : 'Ctrl K';
    }
  }catch(e){}
})();

/* Logo click → go to dashboard panel */
function goHome(){
  var d = document.getElementById('sid-dashboard');
  if(d) d.click();
  return false;
}

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    var pop = document.getElementById('lib-info-pop');
    if(pop && pop.classList.contains('show')){ closeGoldenRulesPop(); return; }
    var eb = document.getElementById('email-backdrop');
    var gb = document.getElementById('gr-backdrop');
    var lb = document.getElementById('lib-backdrop');
    if(eb && !eb.classList.contains('app-hidden')) closeEmailModal();
    if(gb && !gb.classList.contains('app-hidden')) closeGoldenRules();
    if(lb && !lb.classList.contains('app-hidden')) closeEmailLibrary();
  }
});



