(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const toggle = $('.menu-toggle'), nav = $('#main-nav');
  function closeMenu(){nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Apri menu');}
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Chiudi menu':'Apri menu');});
  nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});
  document.addEventListener('click',event=>{if(!event.target.closest('.header'))closeMenu();});
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

  const hints={temperature:'Tocca un apparecchio per registrare la temperatura. In Gestisci puoi provare ON/OFF. Le soglie della demo sono solo esempi.',pulizia:'Scegli un locale, indica l’esito della pulizia e registra il controllo con l’operatore.',infestanti:'Registra il controllo sull’intera attività. In caso di tracce o presenza, seleziona anche la tipologia rilevata.',schede:'Apri una scheda pronta oppure tocca + per una nuova produzione. In Ricette puoi partire dal nome e scegliere gli ingredienti.',setup:'Esplora la configurazione iniziale: attività, operatori, apparecchi, locali e produzione.',etichette:'Confronta i due formati e controlla ingredienti e lotti della scheda. La stampa USB effettiva si esegue nell’app Android.'};
  let frame=null,selected='temperature';
  const launcher=$('#demo-launcher'), active=$('#demo-active'), reset=$('#reset-demo');
  function createFrame(page){
    const iframe=document.createElement('iframe');
    iframe.className='demo-frame';iframe.title='Demo interattiva di HaccpIQ — dati fittizi';
    iframe.src='demo/index.html#'+page;
    iframe.setAttribute('referrerpolicy','same-origin');
    $('#demo-frame-container').replaceChildren(iframe);
    frame=iframe;
  }
  function startDemo(page,scroll=true){
    selected=Object.hasOwn(hints,page)?page:'temperature';
    if(!frame)createFrame(selected);else frame.contentWindow.postMessage({type:'haccpiq:navigate',page:selected},location.origin);
    launcher.hidden=true;active.hidden=false;reset.hidden=false;
    $('#demo-hint').textContent=hints[selected];
    $('#fullscreen-demo').href='demo/index.html#'+selected;
    if(scroll)$('.demo-shell').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  document.querySelectorAll('[data-demo-start]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();startDemo(button.dataset.demoStart);}));
  reset.addEventListener('click',()=>{createFrame(selected);$('#demo-hint').textContent='Demo ripristinata. '+hints[selected];});
  $('#change-department').addEventListener('click',()=>{launcher.hidden=false;active.hidden=true;launcher.querySelector('button').focus();});
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow)return;
    if(event.data?.type==='haccpiq:ready')frame.contentWindow.postMessage({type:'haccpiq:navigate',page:selected},location.origin);
    if(event.data?.type==='haccpiq:page'&&Object.hasOwn(hints,event.data.page)){selected=event.data.page;$('#demo-hint').textContent=hints[selected];$('#fullscreen-demo').href='demo/index.html#'+selected;}
  });

  // Reveal content progressively while retaining a visible fallback.
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if('IntersectionObserver' in window&&!reducedMotion){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{threshold:0.08});
    document.querySelectorAll('.department,.setup-copy,.setup-steps li,.trace-copy,.paper-stage,.label-section-copy,.printer-stage,.download-card,.faq-list details').forEach(el=>{el.classList.add('scroll-reveal');observer.observe(el);});
  }

  // No request to YouTube is made before the visitor explicitly activates it.
  const id=String(window.HACCPIQ_CONFIG?.youtubeId||'').trim();
  if(/^[A-Za-z0-9_-]{11}$/.test(id)){
    $('#video').hidden=false;
    $('#youtube-link').href='https://www.youtube.com/watch?v='+encodeURIComponent(id);
    $('#load-video').addEventListener('click',()=>{
      const iframe=document.createElement('iframe');iframe.className='video-player-frame';iframe.title='HaccpIQ — video di presentazione';
      iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0';
      iframe.allow='encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
      $('#video-player').replaceChildren(iframe);$('#video-player').hidden=false;$('#video-consent').hidden=true;$('#disable-video').hidden=false;
      $('#disable-video').focus();
    });
    $('#disable-video').addEventListener('click',()=>{$('#video-player').replaceChildren();$('#video-player').hidden=true;$('#video-consent').hidden=false;$('#disable-video').hidden=true;$('#load-video').focus();});
  }
})();
