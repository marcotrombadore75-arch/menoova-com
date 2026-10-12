'use strict';
function operatorField(label,name,value='',required=true){
 const list=T.availableOperators(state),extra=required?'required':'';
 if(!list.length)return field(label,name,value,'text',extra+' maxlength="300" placeholder="Nome operatore"').replace('</label>','<small>Puoi salvare gli operatori nelle Impostazioni.</small></label>');
 const names=list.map(o=>o.name);if(value&&!names.includes(value))names.push(value);
 return '<label class="field">'+label+'<select name="'+name+'" '+extra+'><option value="">'+(required?'Seleziona operatore':'Nessun predefinito')+'</option>'+names.map(x=>'<option value="'+e(x)+'"'+(x===value?' selected':'')+'>'+e(x)+'</option>').join('')+'</select></label>';
}
function saveBusinessSettings(s,data){
 s.settings={...s.settings,...data};
 const name=s.settings.responsible;
 if(name&&!T.availableOperators(s).some(o=>o.name===name))T.saveOperator(s,{name});
}
function operatorsCard(){
 const list=T.availableOperators(state);
 return '<div class="card"><div class="archive-head"><h2 style="margin:0">Operatori</h2>'+button('Aggiungi operatore','op-edit','primary','','plus')+'</div><p class="sub">Salva i nomi da richiamare nelle produzioni e nei registri.</p>'+(list.length?'<div class="operator-list">'+list.map(o=>'<div class="operator-row"><div><b>'+e(o.name)+'</b>'+(state.settings.responsible===o.name?'<div class="td-sub">Predefinito</div>':'')+'</div><div class="actions">'+button('Modifica','op-edit','',o.id)+button('Rimuovi','op-remove','danger',o.id)+'</div></div>').join('')+'</div>':'<p class="small">Nessun operatore ancora salvato.</p>')+'</div>';
}
function openOperator(id=''){
 const o=T.availableOperators(state).find(x=>x.id===id);
 showModal(o?'Modifica operatore':'Aggiungi operatore','<form id="operator-form">'+field('Nome operatore','name',o?.name||'','text','required maxlength="300"')+'<label class="check" style="margin-top:16px"><input type="checkbox" name="defaultOperator"'+(o&&o.name===state.settings.responsible?' checked':'')+'>Usa come operatore predefinito</label><div id="form-error"></div><div class="form-actions">'+button('Annulla','close')+'<button class="primary" type="submit">Salva operatore</button></div></form>');
 $('#operator-form').onsubmit=ev=>{ev.preventDefault();try{
  const f=ev.target;commit(s=>{const saved=T.saveOperator(s,{id:o?.id,name:f.elements.name.value});if(f.defaultOperator.checked)s.settings.responsible=saved.name;else if(s.settings.responsible===saved.name)s.settings.responsible='';});
  closeModal(true);render();toast('Operatore salvato');
 }catch(err){formError(err);}};
}
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-action]');if(!b||!b.dataset.action.startsWith('op-'))return;
 const id=b.dataset.id||'';
 try{switch(b.dataset.action){
  case'op-edit':openOperator(id);break;
  case'op-remove':{const o=T.availableOperators(state).find(x=>x.id===id);if(!o)return;showModal('Rimuovi operatore','<p><b>'+e(o.name)+'</b></p><p>Il nome verrà tolto dall’elenco di scelta. Le schede già registrate conserveranno il nome originale.</p><div id="form-error"></div><div class="form-actions">'+button('Mantieni','close')+button('Rimuovi operatore','op-remove-confirm','danger',id)+'</div>');break;}
  case'op-remove-confirm':commit(s=>T.archiveOperator(s,id));closeModal(true);render();toast('Operatore rimosso dall’elenco');break;
 }}catch(err){formError(err);}
});
