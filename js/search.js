/* Flowtive One — Topbar search: index, runSearch, results UI, navigateToResult */

/* ── Search ── */
var searchIndex = [];
var searchActive = false;
var searchSelectedIdx = -1;

function buildSearchIndex(){
  searchIndex = [];
  MEMBERS.forEach(function(m, mi){
    m.inds.forEach(function(ind, indIdx){
      getAllStatesForInd(ind).forEach(function(s){
        var state = s.state;
        var priority = s.priority;
        // Add state entry
        searchIndex.push({type:'state', label:state, sub:ind+' · '+m.name, member:m, mi:mi, ind:ind, indIdx:indIdx, state:state, priority:priority});
        // Add city entries
        var cities = STATE_CITIES[state] || [];
        cities.forEach(function(city){
          searchIndex.push({type:'city', label:city, sub:state+' · '+ind+' · '+m.name, member:m, mi:mi, ind:ind, indIdx:indIdx, state:state, city:city, priority:priority});
        });
      });
    });
  });
}

function highlightMatch(text, query){
  if(!query) return text;
  var idx = text.toLowerCase().indexOf(query.toLowerCase());
  if(idx < 0) return text;
  return text.substring(0, idx) + '<mark>' + text.substring(idx, idx + query.length) + '</mark>' + text.substring(idx + query.length);
}

function onSearchInput(val){
  var clearBtn = document.getElementById('search-clear');
  if(clearBtn) clearBtn.className = 'search-clear' + (val ? ' show' : '');
  // Fallback for browsers without :has() support — toggle .has-text on the wrap
  // so the ⌘K hint can hide via plain selector.
  var wrap = document.getElementById('search-wrap');
  if(wrap) wrap.classList.toggle('has-text', !!val);
  if(!val.trim()){ closeSearchResults(); return; }
  runSearch(val.trim());
}

function onSearchFocus(){
  var val = document.getElementById('search-input').value.trim();
  if(val) runSearch(val);
}

function onSearchKey(e){
  var results = document.getElementById('search-results');
  var items = results ? results.querySelectorAll('.sr-item') : [];
  if(e.key === 'ArrowDown'){ e.preventDefault(); searchSelectedIdx = Math.min(searchSelectedIdx+1, items.length-1); highlightSelected(items); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); searchSelectedIdx = Math.max(searchSelectedIdx-1, 0); highlightSelected(items); }
  else if(e.key === 'Enter'){ e.preventDefault(); if(searchSelectedIdx >= 0 && items[searchSelectedIdx]) items[searchSelectedIdx].click(); }
  else if(e.key === 'Escape'){ clearSearch(); }
}

function highlightSelected(items){
  items.forEach(function(it, i){ it.style.background = i === searchSelectedIdx ? 'var(--accent-subtle)' : ''; });
  if(items[searchSelectedIdx]) items[searchSelectedIdx].scrollIntoView({block:'nearest'});
}

function runSearch(query){
  if(!searchIndex.length) buildSearchIndex();
  var q = query.toLowerCase();
  var matches = searchIndex.filter(function(r){ return r.label.toLowerCase().indexOf(q) >= 0; });

  // Deduplicate states (show each state once per industry per member)
  var seen = {};
  matches = matches.filter(function(r){
    if(r.type === 'state'){
      var key = r.mi+'|'+r.ind+'|'+r.state;
      if(seen[key]) return false;
      seen[key] = true;
    }
    return true;
  });

  // Sort: states first, then cities; priority 1 before 2 before 3
  matches.sort(function(a,b){
    if(a.type !== b.type) return a.type === 'state' ? -1 : 1;
    return a.priority - b.priority;
  });

  var top = matches.slice(0, 30);
  renderSearchResults(top, query);
}

function renderSearchResults(results, query){
  var el = document.getElementById('search-results');
  if(!el) return;
  searchSelectedIdx = -1;

  if(!results.length){
    el.innerHTML = '<div class="sr-empty">No states or cities found for "'+query+'"</div>';
    el.classList.add('open');
    return;
  }

  var stateResults = results.filter(function(r){ return r.type === 'state'; });
  var cityResults  = results.filter(function(r){ return r.type === 'city'; });
  var html = '';

  if(stateResults.length){
    html += '<div class="sr-header">States ('+stateResults.length+')</div>';
    stateResults.forEach(function(r){
      var badgeClass = r.priority===1?'p1':r.priority===2?'p2':'p3';
      var badgeText  = r.priority===1?'Hot':r.priority===2?'Strong':'Good';
      html +=
        '<div class="sr-item" onclick="navigateToResult('+r.mi+',\''+r.ind+'\','+r.indIdx+',\''+r.state+'\',null)">'+
          '<div class="sr-icon" style="background:'+r.member.color+'">'+r.member.name.substring(0,2).toUpperCase()+'</div>'+
          '<div class="sr-info">'+
            '<div class="sr-main">'+highlightMatch(r.label, query)+'</div>'+
            '<div class="sr-sub">'+r.sub+'</div>'+
          '</div>'+
          '<span class="sr-badge pri-badge '+badgeClass+'">'+badgeText+'</span>'+
        '</div>';
    });
  }

  if(cityResults.length){
    html += '<div class="sr-header">Cities ('+cityResults.length+(results.length===30?' — showing top 30':'')+')</div>';
    cityResults.forEach(function(r){
      html +=
        '<div class="sr-item" onclick="navigateToResult('+r.mi+',\''+r.ind+'\','+r.indIdx+',\''+r.state+'\',\''+r.city.replace(/'/g,"\\'")+'\'  )">'+
          '<div class="sr-icon" style="background:'+r.member.color+';border-radius:50%">'+r.member.name.substring(0,2).toUpperCase()+'</div>'+
          '<div class="sr-info">'+
            '<div class="sr-main">'+highlightMatch(r.label, query)+'</div>'+
            '<div class="sr-sub">'+r.sub+'</div>'+
          '</div>'+
        '</div>';
    });
  }

  el.innerHTML = html;
  el.classList.add('open');
}

function navigateToResult(mi, ind, indIdx, state, city){
  clearSearch();

  // Switch to member panel
  document.querySelectorAll('.sid-item,.sid-dashboard').forEach(function(s){ s.classList.remove('active'); });
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  var sidItem = document.getElementById('sid-'+mi);
  var panel   = document.getElementById('panel-'+mi);
  if(sidItem) sidItem.classList.add('active');
  if(panel)   panel.classList.add('active');

  // Open industry block
  setTimeout(function(){
    var tbl  = document.getElementById('tbl-'+mi+'-'+indIdx);
    var chev = document.getElementById('chev-'+mi+'-'+indIdx);
    if(tbl && (tbl.style.display === 'none' || tbl.style.display === '')){
      tbl.style.display = 'block';
      if(chev) chev.classList.add('open');
    }

    // Open state
    var safeInd   = ind.replace(/[^a-zA-Z]/g,'');
    var safeState = state.replace(/[^a-zA-Z]/g,'_');
    var stateId   = 'st-'+mi+'-'+safeInd+'-'+safeState;
    var citiesWrap = document.getElementById('cities-'+stateId);
    var stateChev  = document.getElementById('schev-'+stateId);
    if(citiesWrap){ citiesWrap.classList.add('open'); }
    if(stateChev)  { stateChev.classList.add('open'); }

    // Scroll to state or city
    var scrollTarget = null;
    if(city){
      var cityKey = mi+'-'+safeInd+'-'+safeState+'-'+city.replace(/[^a-zA-Z]/g,'_');
      scrollTarget = document.getElementById('cityrow-'+cityKey);
      if(scrollTarget){
        scrollTarget.style.transition = 'background 0.3s';
        scrollTarget.style.background = 'var(--accent-subtle)';
        setTimeout(function(){ scrollTarget.style.background = ''; }, 1800);
      }
    } else {
      scrollTarget = document.getElementById('cities-'+stateId);
    }
    if(scrollTarget){
      setTimeout(function(){ scrollTarget.scrollIntoView({behavior:'smooth', block:'center'}); }, 80);
    }
  }, 50);
}

function closeSearchResults(){
  var el = document.getElementById('search-results');
  if(el) el.classList.remove('open');
}

function clearSearch(){
  var inp = document.getElementById('search-input');
  var clearBtn = document.getElementById('search-clear');
  var wrap = document.getElementById('search-wrap');
  if(inp) inp.value = '';
  if(clearBtn) clearBtn.className = 'search-clear';
  if(wrap) wrap.classList.remove('has-text');
  closeSearchResults();
}

