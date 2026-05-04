try{var t=localStorage.getItem('theme')||'system';document.documentElement.classList.add(t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t)}catch(e){}
