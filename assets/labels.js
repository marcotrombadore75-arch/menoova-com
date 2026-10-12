(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HaccpLabels=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):'—';
  const number=value=>value==null?'—':Number(value).toLocaleString('it-IT',{maximumFractionDigits:3});
  function render(p,format='54x101'){
    if(!p||p.status!=='confirmed'||!Array.isArray(p.ingredients)||!p.ingredients.length)throw Error('Seleziona una scheda di produzione confermata.');
    const full=format==='104x159';
    if(!full&&format!=='54x101')throw Error('Formato etichetta non disponibile.');
    const row=full?'<table><caption>Materie prime utilizzate</caption><thead><tr><th>Ingrediente / lotto</th><th>Quantità</th></tr></thead><tbody>'+p.ingredients.map(i=>'<tr><td><b>'+esc(i.name)+'</b><br>Lotto '+esc(i.lot)+'<small>'+esc(i.supplier)+'<br>Scad. '+date(i.expiry)+'</small></td><td>'+number(i.quantity)+' '+esc(i.unit)+'</td></tr>').join('')+'</tbody></table>':'<div class="label-ingredients"><h4>Ingredienti e lotti di origine</h4>'+p.ingredients.map(i=>'<div><b>'+esc(i.name)+'</b><span>'+esc(i.lot)+'</span></div>').join('')+'</div>';
    return '<article class="label-paper '+(full?'label-full':'label-compact')+'" aria-label="Etichetta dimostrativa '+(full?'104 per 159':'54 per 101')+' millimetri"><div class="label-demo">DEMO · DATI FITTIZI</div><header><span>HaccpIQ</span><span>COD. '+esc(p.productCode)+'</span></header><div class="label-business">'+esc(p.business)+'</div><h3>'+esc(p.productName)+'</h3><div class="label-lot"><span>Lotto interno</span><strong>'+esc(p.internalLot)+'</strong></div><div class="label-facts"><span>Produzione <b>'+date(p.productionDate)+'</b></span><span>Quantità <b>'+number(p.outputQty)+' '+esc(p.outputUnit)+'</b></span></div>'+row+'<div class="label-treatment">'+p.processes.map(esc).join(' · ')+'</div><div class="label-operator">Operatore: <b>'+esc(p.responsible)+'</b></div>'+(full?'<div class="label-facts"><span>Confezioni <b>'+number(p.packages)+'</b></span><span>Peso totale <b>'+number(p.totalWeightKg)+' kg</b></span></div>'+(p.notes?'<p class="label-note">'+esc(p.notes)+'</p>':'')+'<div class="label-signature">Firma del responsabile __________________</div>':'')+'<footer>Anteprima illustrativa · '+(full?'104 × 159':'54 × 101')+' mm</footer></article>';
  }
  return {render};
});
