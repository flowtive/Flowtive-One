/* Flowtive One — What's New modal (changelog viewer)
   Reads APP_CHANGELOG from config.js. Newest version is highlighted with
   a "Current" badge. Each change is tagged: New / Improved / Fixed. */

function openWhatsNew(){
  var bd = document.getElementById('wn-backdrop');
  var pn = document.getElementById('wn-panel');
  if(!bd){
    bd = document.createElement('div');
    bd.className = 'wn-backdrop';
    bd.id = 'wn-backdrop';
    bd.onclick = function(e){ if(e.target === bd) closeWhatsNew(); };
    document.body.appendChild(bd);
  }
  if(!pn){
    pn = document.createElement('div');
    pn.className = 'wn-panel';
    pn.id = 'wn-panel';
    document.body.appendChild(pn);
  }
  pn.innerHTML = renderWhatsNewHtml();
  bd.classList.add('show');
  requestAnimationFrame(function(){ pn.classList.add('show'); });
  document.addEventListener('keydown', _wnEscHandler);
  // Clear the unread red dot on the sidebar version pill
  if(typeof _markWhatsNewSeen === 'function') _markWhatsNewSeen();
  var pill = document.querySelector('.sid-version.has-update');
  if(pill){
    pill.classList.remove('has-update');
    var dot = pill.querySelector('.sid-version-dot');
    if(dot) dot.remove();
  }
}

function closeWhatsNew(){
  var bd = document.getElementById('wn-backdrop');
  var pn = document.getElementById('wn-panel');
  if(bd) bd.classList.remove('show');
  if(pn) pn.classList.remove('show');
  document.removeEventListener('keydown', _wnEscHandler);
}
function _wnEscHandler(e){ if(e.key === 'Escape') closeWhatsNew(); }

function renderWhatsNewHtml(){
  var current = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '?';
  var log = (typeof APP_CHANGELOG !== 'undefined' && APP_CHANGELOG) ? APP_CHANGELOG : [];
  var html = ''
    + '<div class="wn-head">'
    +   '<div class="wn-head-left">'
    +     '<div class="wn-title">What\'s New</div>'
    +     '<div class="wn-sub">Flowtive One <span class="wn-curver">v'+escapeHtml(current)+'</span></div>'
    +   '</div>'
    +   '<button class="wn-close" onclick="closeWhatsNew()" type="button" aria-label="Close"><span aria-hidden="true">×</span></button>'
    + '</div>'
    + '<div class="wn-body">';
  if(!log.length){
    html += '<div class="wn-empty">No changelog yet.</div>';
  } else {
    log.forEach(function(v, i){
      var isCurrent = v.version === current;
      html += '<section class="wn-version'+(isCurrent?' wn-current':'')+'">'
        +      '<header class="wn-version-head">'
        +        '<div class="wn-version-meta">'
        +          '<span class="wn-version-num">v'+escapeHtml(v.version||'')+'</span>'
        +          (isCurrent ? '<span class="wn-current-badge">Current</span>' : '')
        +          '<span class="wn-version-date">'+escapeHtml(v.date||'')+'</span>'
        +        '</div>'
        +        (v.title ? '<h3 class="wn-version-title">'+escapeHtml(v.title)+'</h3>' : '')
        +        (v.notes ? '<p class="wn-version-notes">'+escapeHtml(v.notes)+'</p>' : '')
        +      '</header>'
        +      renderChangeList(v.changes||[])
        + '</section>';
    });
  }
  html += '</div>';
  return html;
}

function renderChangeList(changes){
  if(!changes.length) return '';
  // Group by type for cleaner reading
  var groups = { 'new':[], 'improvement':[], 'fix':[] };
  changes.forEach(function(c){
    var t = c.type || 'improvement';
    if(!groups[t]) groups[t] = [];
    groups[t].push(c);
  });
  var labels = { 'new':'New', 'improvement':'Improved', 'fix':'Fixed' };
  var html = '<ul class="wn-changes">';
  ['new','improvement','fix'].forEach(function(t){
    if(!groups[t] || !groups[t].length) return;
    groups[t].forEach(function(c){
      html += '<li class="wn-change wn-change-'+t+'">'
        +      '<span class="wn-change-tag">'+labels[t]+'</span>'
        +      '<span class="wn-change-text">'+escapeHtml(c.text||'')+'</span>'
        +    '</li>';
    });
  });
  html += '</ul>';
  return html;
}
