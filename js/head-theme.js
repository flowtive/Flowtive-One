/* Flowtive One — applies theme synchronously before first paint to prevent flash. */
/* Apply theme synchronously before first paint to prevent flash of unthemed content */
(function(){
  try{
    var stored = localStorage.getItem('flowtive_theme');
    var theme = stored;
    if(!theme){
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  }catch(e){}
})();
