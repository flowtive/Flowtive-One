/* Flowtive One — Dashboard: build, KPIs, leaderboard, charts */

/* ── Dashboard ── */
function buildDashboard(){
  var total=0,done=totalCitiesDoneAll();
  MEMBERS.forEach(function(_,i){ total+=totalCitiesForMember(i); });
  var pct=total>0?Math.round(done/total*100):0;
  // Fix 8: Use the dynamically computed total, not a hardcoded number
  document.getElementById('kpi-total').textContent=total.toLocaleString();
  // Fix 9: pct is already computed using the correct dynamic denominator above
  var statesCovered=countFullyDoneStates();
  document.getElementById('kpi-done').textContent=statesCovered.toLocaleString();
  var statePct=Math.round(statesCovered/totalPossibleStates()*100);
  document.getElementById('kpi-done-bar').style.width=statePct+'%';
  document.getElementById('kpi-pct').textContent=pct+'%';
  var hotDone=0;
  MEMBERS.forEach(function(m){
    m.inds.forEach(function(ind){
      getAllStatesForInd(ind).forEach(function(s){
        if(s.priority===1) hotDone+=countCitiesDoneForState(ind,s.state);
      });
    });
  });
  document.getElementById('kpi-hot').textContent=hotDone;

  // Leaderboard
  var lbData=MEMBERS.map(function(m,i){
    var memberTotal=totalCitiesForMember(i);
    return{name:m.name,color:m.color,done:countTotalCitiesForMember(i),total:memberTotal};
  });
  lbData.sort(function(a,b){return b.done-a.done;});
  var lbEl=document.getElementById('leaderboard');
  lbEl.innerHTML='';
  lbData.forEach(function(d,i){
    var pct2=d.total>0?Math.round(d.done/d.total*100):0;
    var isMe=currentUser&&d.name===currentUser.name;
    var row=document.createElement('div');
    row.className='lb-row';
    if(isMe)row.style.cssText='border-color:'+d.color+';background:var(--accent-subtle-2)';

    var medalHtml;
    if(i===0)      medalHtml='<span class="lb-medal" title="Gold">🥇</span>';
    else if(i===1) medalHtml='<span class="lb-medal" title="Silver">🥈</span>';
    else if(i===2) medalHtml='<span class="lb-medal" title="Bronze">🥉</span>';
    else           medalHtml='<div class="lb-rank">'+(i+1)+'</div>';

    row.innerHTML=
      medalHtml+
      (function(){
        var lbImg = loadAvatar(d.name);
        var lbContent = lbImg ? '<img src="'+lbImg+'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block" alt="'+d.name+'">' : d.name.substring(0,2).toUpperCase();
        var lbBg = lbImg ? 'transparent' : d.color;
        return '<div class="lb-av" style="background:'+lbBg+'">'+lbContent+'</div>';
      })()+
      '<div class="lb-info">'+
        '<div class="lb-name">'+d.name+(isMe?' <span style="font-size:10px;color:'+d.color+';font-weight:600">(you)</span>':'')+'</div>'+
        '<div class="lb-bar-wrap"><div class="lb-bar" style="width:'+pct2+'%;background:'+d.color+'"></div></div>'+
      '</div>'+
      '<div class="lb-right">'+
        '<div class="lb-num" style="color:'+d.color+'">'+d.done+'</div>'+
        '<div class="lb-pct">'+pct2+'% of '+d.total+' cities</div>'+
      '</div>';
    lbEl.appendChild(row);
  });

  // Donut
  var ctx1=document.getElementById('donut-chart');
  if(charts.donut){charts.donut.destroy();}
  charts.donut=new Chart(ctx1,{
    type:'doughnut',
    data:{
      labels:MEMBERS.map(function(m){return m.name;}),
      datasets:[{data:MEMBERS.map(function(m,i){return Math.max(countTotalCitiesForMember(i),0);}),backgroundColor:MEMBERS.map(function(m){return m.color;}),borderWidth:2,borderColor:getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim()||'#fff'}]
    },
    options:{responsive:true,maintainAspectRatio:true,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.label+': '+c.parsed+' cities';}}}}}
  });
  var legEl=document.getElementById('donut-legend');
  legEl.innerHTML='';
  var totalDoneAllVal=totalCitiesDoneAll();
  MEMBERS.forEach(function(m,i){
    var doneCities=countTotalCitiesForMember(i);
    var totalMemberCities=totalCitiesForMember(i);
    var pctOfTotal=totalDoneAllVal>0?Math.round(doneCities/totalDoneAllVal*100):0;
    var pctComplete=totalMemberCities>0?Math.round(doneCities/totalMemberCities*100):0;
    var item=document.createElement('div');
    item.className='donut-leg-item';
    item.style.cssText='display:flex;flex-direction:column;gap:3px;padding:6px 8px;border-radius:6px;background:var(--off);border:1px solid var(--border);transition:background 0.1s';
    item.innerHTML=
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
        '<div style="display:flex;align-items:center;gap:6px">'+
          '<div style="width:9px;height:9px;border-radius:50%;background:'+m.color+';flex-shrink:0"></div>'+
          '<span style="font-size:12px;font-weight:600;color:var(--text)">'+m.name+'</span>'+
        '</div>'+
        '<span style="font-size:11px;font-weight:700;color:'+m.color+'">'+pctComplete+'%</span>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:6px">'+
        '<div style="flex:1;height:3px;background:var(--border);border-radius:99px;overflow:hidden">'+
          '<div style="width:'+pctComplete+'%;height:100%;background:'+m.color+';border-radius:99px"></div>'+
        '</div>'+
        '<span style="font-size:10px;color:var(--muted);white-space:nowrap">'+doneCities+'/'+totalMemberCities+'</span>'+
      '</div>';
    legEl.appendChild(item);
  });

  // Bar chart — horizontal on mobile for readability
  var ctx2=document.getElementById('bar-chart-canvas');
  if(charts.bar){charts.bar.destroy();}
  var isMobile = window.innerWidth < 640;
  charts.bar=new Chart(ctx2,{
    type: isMobile ? 'bar' : 'bar',
    data:{
      labels:MEMBERS.map(function(m){return m.name;}),
      datasets:[{label:'Cities covered',data:MEMBERS.map(function(m,i){return countTotalCitiesForMember(i);}),backgroundColor:MEMBERS.map(function(m){return m.color+'CC';}),borderColor:MEMBERS.map(function(m){return m.color;}),borderWidth:1,borderRadius:6}]
    },
    options:{
      indexAxis: isMobile ? 'y' : 'x',
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return (isMobile?c.parsed.x:c.parsed.y)+' cities covered';}}}},
      scales:{
        y:{beginAtZero:true,grid:{color: isMobile?themeColor('--border-default','#F3F4F6'):'transparent'},ticks:{color:themeColor('--text-secondary','#6B7280'),font:{size: isMobile?11:12,weight:'500'}}},
        x:{beginAtZero:true,grid:{color: isMobile?'transparent':themeColor('--border-default','#F3F4F6')},ticks:{color:themeColor('--text-tertiary','#9CA3AF'),font:{size:11}},display:!isMobile}
      }
    }
  });

  // Industry progress
  var indEl=document.getElementById('ind-progress-grid');
  indEl.innerHTML='';
  ALL_INDUSTRIES.forEach(function(ind){
    var d2=countCitiesDoneForInd(ind),total2=totalCitiesForInd(ind),pct3=total2>0?Math.round(d2/total2*100):0;
    var item=document.createElement('div');
    item.className='ind-prog-item';
    item.innerHTML=
      '<div class="ind-prog-top"><span class="ind-prog-name">'+ind+'</span><span class="ind-prog-pct">'+pct3+'%</span></div>'+
      '<div class="ind-prog-bar"><div class="ind-prog-fill" style="width:'+pct3+'%"></div></div>';
    indEl.appendChild(item);
  });

  // New features
  buildWeeklyChart();
  buildActivityFeed();
  renderOnTheClockCard();
  renderHoursThisWeek();
}

