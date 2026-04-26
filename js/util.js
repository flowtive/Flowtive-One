/* Flowtive One — Shared utility helpers */

function getSearchKeyword(ind,state,city){
  var abbrev=STATE_ABBREV[state]||state;
  return ind+' in '+city+', '+abbrev+', USA';
}

var COPY_ICON='<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
var CHECK_ICON='<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function copyKeyword(btn,keyword){
  var doAfter=function(){
    btn.innerHTML=CHECK_ICON;
    btn.classList.add('copied');
    btn.title='Copied!';
    setTimeout(function(){
      btn.innerHTML=COPY_ICON;
      btn.classList.remove('copied');
      btn.title='Copy to clipboard';
    },1800);
  };
  // Fix 14: Use only the modern Clipboard API; gracefully degrade with a visible prompt
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(keyword).then(doAfter).catch(function(){
      prompt('Copy this keyword:', keyword);
    });
  } else {
    // Last-resort fallback for very old browsers
    var ta=document.createElement('textarea');
    ta.value=keyword;
    ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();ta.select();
    try{ document.execCommand('copy'); doAfter(); }catch(e){ prompt('Copy this keyword:', keyword); }
    document.body.removeChild(ta);
  }
}

function showToast(msg, color){
  color = color || '#1A1A2E';
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:'+color+';color:#fff;font-size:13px;font-weight:500;padding:10px 20px;border-radius:99px;box-shadow:0 4px 16px rgba(0,0,0,0.18);z-index:9999;opacity:0;transition:opacity 0.2s;pointer-events:none;white-space:nowrap';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity = '1'; });
  setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 250); }, 2500);
}


function formatTimeAgo(ts){
  var diff=Math.floor((Date.now()-ts)/1000);
  if(diff<60) return 'Just Now';
  if(diff<3600) return Math.floor(diff/60)+'m ago';
  if(diff<86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}


function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
