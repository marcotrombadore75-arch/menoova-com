(() => {
  'use strict';
  if(parent!==window)document.documentElement.classList.add('embedded-demo');
  const allowed=new Set(['temperature','pulizia','infestanti','schede','setup','etichette']);
  function labelPreview(id,format='54x101'){
    const record=state.productions.find(p=>p.id===id&&p.status==='confirmed');
    if(!record){toast('Crea una produzione per visualizzare l’etichetta.');return;}
    const payload=P.labelPayload(record);
    showModal('Etichetta di produzione',
      '<p class="sub demo-label-intro">Esplora i dati che accompagnano il prodotto. La stampa USB sulla DYMO LabelWriter 4XL si esegue nell’app Android.</p><div class="label-controls" style="margin-top:18px">'+
      ['54x101','104x159'].map(size=>'<button type="button" data-demo-label="'+size+'" data-record="'+e(id)+'" aria-pressed="'+(size===format)+'">'+(size==='54x101'?'Etichetta 54 × 101':'Scheda 104 × 159')+'</button>').join('')+
      '</div><div class="demo-label-stage">'+HaccpLabels.render(payload,format)+'</div><p class="small">Anteprima web illustrativa. L’impaginazione della stampa Android può differire; gli ingredienti provengono dalla scheda selezionata.</p><div class="form-actions">'+button('Torna alla scheda','view','primary',id)+'</div>');
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action],[data-demo-label]');if(!button)return;
    if(button.dataset.demoLabel){event.preventDefault();event.stopImmediatePropagation();labelPreview(button.dataset.record,button.dataset.demoLabel);return;}
    if(!['usb-label','usb-sheet','usb-printers'].includes(button.dataset.action))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(button.dataset.action==='usb-printers'){toast('La connessione USB si prova nell’app Android. Apri una scheda per vedere l’anteprima delle etichette.');return;}
    labelPreview(button.dataset.id,button.dataset.action==='usb-sheet'?'104x159':'54x101');
  },true);
  function navigate(destination){
    if(!allowed.has(destination))return;
    closeModal(true);
    clearTimeout(wizardSaveTimer);
    if(destination==='setup'){beginSetup(true);}else{
      wizardRequested=false;wizardDraft=null;
      // A demo navigation leaves the completed sample configuration available.
      if(state.setup?.draft)delete state.setup.draft;
      page=destination==='etichette'?'schede':destination;render();
      if(destination==='etichette')labelPreview(state.productions.find(p=>p.status==='confirmed')?.id);
    }
    window.scrollTo(0,0);
    if(parent!==window)document.querySelector('.content').scrollTop=0;
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='haccpiq:navigate')return;
    navigate(event.data.page);
  });
  navigate(location.hash.slice(1)||'temperature');
  if(parent!==window)parent.postMessage({type:'haccpiq:ready'},location.origin);
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(parent===window||!['nav','setup-start','setup-restart','setup-exit'].includes(action))return;
    document.querySelector('.content').scrollTop=0;
    const current=wizardRequested?'setup':['temperature','pulizia','infestanti'].includes(page)?page:['schede','ricette','carico','codici'].includes(page)?'schede':null;
    if(current)parent.postMessage({type:'haccpiq:page',page:current},location.origin);
  });

  // Keyboard access to the app's modal forms in the website demo.
  let lastFocus=null,dialogOpen=false;
  const root=document.getElementById('modal-root');
  new MutationObserver(()=>{
    const dialog=root.querySelector('[role=dialog]');
    if(dialog){
      if(!dialogOpen){lastFocus=document.activeElement;dialogOpen=true;}
      const control=dialog.querySelector('input:not([type=hidden]),select,textarea,button');
      if(control&&!dialog.contains(document.activeElement))control.focus();
    }else if(dialogOpen){dialogOpen=false;if(lastFocus?.isConnected)lastFocus.focus();}
  }).observe(root,{childList:true});
  document.addEventListener('keydown',event=>{
    const dialog=root.querySelector('[role=dialog]');if(!dialog)return;
    if(event.key==='Escape'){closeModal();return;}
    if(event.key!=='Tab')return;
    const controls=Array.from(dialog.querySelectorAll('button,input:not([type=hidden]),select,textarea,a[href],summary')).filter(el=>!el.disabled&&el.getClientRects().length>0);
    if(!controls.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
})();
