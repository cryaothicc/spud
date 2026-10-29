(()=>{
  const mobile=matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)');
  const phone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const state=window.PotatoViewport={mobile:mobile.matches||phone};
  function fit(){
    const wasMobile=state.mobile;
    state.mobile=mobile.matches||phone;
    document.documentElement.classList.toggle('mobile-only',state.mobile);
    document.querySelector('.site-wrap').inert=state.mobile;
    document.querySelector('.mobile-notice').inert=!state.mobile;
    const width=document.documentElement.clientWidth,height=window.innerHeight;
    document.documentElement.style.setProperty('--ui-scale',String(Math.max(.1,Math.min((width-24)/1180,(height-16)/800,1.5))));
    if(wasMobile!==state.mobile)window.dispatchEvent(new CustomEvent('potato:viewport',{detail:{mobile:state.mobile}}));
  }
  fit();window.addEventListener('resize',fit);mobile.addEventListener('change',fit);
})();
