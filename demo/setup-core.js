(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.TraceSetup=factory(root.Trace);})(typeof globalThis!=='undefined'?globalThis:this,function(T){
'use strict';
const MAX_ITEMS=100;
const schedule={intervalDays:1,checksPerDay:1,instructions:''};
const required=(value,label)=>{const text=String(value??'').trim();if(!text||text.length>300)throw Error('Inserisci '+label+' (massimo 300 caratteri).');return text;};
function count(value,label){const n=Number(value);if(value===''||value==null||!Number.isInteger(n)||n<0||n>MAX_ITEMS)throw Error(label+': inserisci un numero da 0 a '+MAX_ITEMS+'.');return n;}
function nextIdentifier(s){const used=new Set(s.haccp.targets.filter(t=>t.kind==='temperature').map(t=>t.identifier?.toUpperCase()));let n=1;while(used.has('F'+String(n).padStart(2,'0')))n++;return 'F'+String(n).padStart(2,'0');}
function newEquipment(rows=[]){const used=new Set(rows.map(t=>String(t.identifier||'').toUpperCase()));let n=1;while(used.has('F'+String(n).padStart(2,'0')))n++;return{...schedule,identifier:'F'+String(n).padStart(2,'0'),name:'',applianceType:'',min:'',max:''};}
function makeDraft(s){
 const operators=T.availableOperators(s).map(o=>({id:o.id,name:o.name}));if(!operators.length)operators.push({name:s.settings.responsible||''});
 const equipment=[];for(const t of s.haccp.targets.filter(t=>t.kind==='temperature'&&!t.archivedAt))equipment.push({...newEquipment(equipment),...T.clone(t),applianceType:t.applianceType||'',min:t.min??'',max:t.max??''});
 const cleaning=s.haccp.targets.filter(t=>t.kind==='pulizia'&&!t.archivedAt).map(T.clone);
 const pest=s.haccp.targets.find(t=>t.kind==='infestanti'&&t.scope==='activity'&&!t.archivedAt);
 return{step:0,business:s.settings.business||'',address:s.settings.address||'',operators,defaultOperator:Math.max(0,operators.findIndex(o=>o.name===s.settings.responsible)),equipmentCount:equipment.length,equipment,cleaningCount:cleaning.length,cleaning,pest:pest?T.clone(pest):{...schedule},productionEnabled:typeof s.settings.productionEnabled==='boolean'?s.settings.productionEnabled:s.products.length||s.productions.length?true:null};
}
function shape(d){
 if(!d||typeof d!=='object'||!Number.isInteger(d.step)||d.step<0||d.step>6)throw Error('Avanzamento della configurazione non valido.');
 for(const key of ['operators','equipment','cleaning'])if(!Array.isArray(d[key])||d[key].length>MAX_ITEMS||d[key].some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw Error('Elenco della configurazione non valido.');
 if(!d.pest||typeof d.pest!=='object'||Array.isArray(d.pest))throw Error('Configurazione infestanti non valida.');
 if(![true,false,null].includes(d.productionEnabled))throw Error('Scelta della produzione non valida.');
}
function unique(rows,key,label){const used=new Set();for(const row of rows){const value=required(row[key],label).toLocaleLowerCase('it');if(used.has(value))throw Error(label+': valore duplicato «'+row[key]+'».');used.add(value);}}
function validateStep(d,step){
 shape(d);
 if(step===0){required(d.business,'il nome dell’attività');if(String(d.address||'').length>300)throw Error('Indirizzo troppo lungo.');}
 if(step===1){if(!d.operators.length)throw Error('Inserisci almeno un operatore.');unique(d.operators,'name','il nome dell’operatore');if(!Number.isInteger(d.defaultOperator)||d.defaultOperator<0||d.defaultOperator>=d.operators.length)throw Error('Scegli l’operatore predefinito.');}
 if(step===2||step===3){
  const kind=step===2?'temperature':'pulizia',key=step===2?'equipment':'cleaning',total=count(d[key+'Count'],'Numero di '+(step===2?'apparecchi':'aree'));
  if(d[key].length<total)throw Error('Completa tutti i nomi.');const rows=d[key].slice(0,total);unique(rows,'name','il nome');if(step===2)unique(rows,'identifier','l’identificativo');
  const scratch=T.empty();for(const [index,row] of rows.entries())try{if(step===2&&!['fridge','freezer'].includes(row.applianceType))throw Error('Scegli Frigorifero o Congelatore.');T.saveTarget(scratch,{...row,id:undefined,kind});}catch(err){throw Error((step===2?'Apparecchio ':'Area ')+(index+1)+': '+err.message);}
 }
 if(step===4)T.saveTarget(T.empty(),{...d.pest,id:undefined,kind:'infestanti',name:'Intera attività',scope:'activity'});
 if(step===5&&typeof d.productionEnabled!=='boolean')throw Error('Indica se effettui produzione e abbattimento.');
}
function validate(s){
 const value=T.validate(s),setup=value.setup;
 if(setup!==undefined){if(!setup||setup.version!==1)throw Error('Configurazione iniziale non riconosciuta.');if(setup.completedAt!==undefined&&(typeof setup.completedAt!=='string'||!Number.isFinite(Date.parse(setup.completedAt))))throw Error('Data della configurazione non valida.');if(setup.draft!==undefined){shape(setup.draft);for(let step=0;step<setup.draft.step;step++)validateStep(setup.draft,step);}}
 if(value.settings.productionEnabled!==undefined&&typeof value.settings.productionEnabled!=='boolean')throw Error('Impostazione produzione non valida.');
 if(setup?.completedAt&&(value.haccp.targets.filter(t=>t.kind==='infestanti'&&!t.archivedAt).length!==1||!value.haccp.targets.some(t=>t.kind==='infestanti'&&!t.archivedAt&&t.scope==='activity')))throw Error('Manca il controllo infestanti dell’intera attività.');
 return value;
}
function saveDraft(s,d){shape(d);s.setup={...(s.setup||{}),version:1,draft:T.clone(d)};}
function changes(s,d){
 const removed=(current,rows)=>current.filter(x=>!rows.some(r=>r.id===x.id)).length;
 return{operators:removed(T.availableOperators(s),d.operators),equipment:removed(s.haccp.targets.filter(t=>t.kind==='temperature'&&!t.archivedAt),d.equipment.slice(0,Number(d.equipmentCount)||0)),cleaning:removed(s.haccp.targets.filter(t=>t.kind==='pulizia'&&!t.archivedAt),d.cleaning.slice(0,Number(d.cleaningCount)||0)),pestPoints:s.haccp.targets.filter(t=>t.kind==='infestanti'&&!t.archivedAt&&t.scope!=='activity').length};
}
function complete(s,d){
 for(let step=0;step<6;step++)validateStep(d,step);
 const next=T.clone(s),stamp=new Date().toISOString();
 function existingRow(list,row,kind){if(!row.id)return null;const current=list.find(x=>x.id===row.id&&!x.archivedAt&&(!kind||x.kind===kind));if(!current)throw Error('Una voce è cambiata. Nelle Impostazioni scegli Ricomincia dai dati attuali.');return current;}
 function syncTargets(kind,rows){
  const scratch=T.empty(),ids=new Set(),saved=rows.map(row=>{const old=existingRow(next.haccp.targets,row,kind);if(old&&ids.has(old.id))throw Error('Voce duplicata nella configurazione.');if(old)ids.add(old.id);const t=T.saveTarget(scratch,{...row,id:undefined,kind});if(old&&kind==='temperature')for(const key of ['isOff','offSince','powerCycle'])if(old[key]!==undefined)t[key]=old[key];return{...t,id:old?.id||t.id};});
  next.haccp.targets=next.haccp.targets.map(t=>{const replacement=saved.find(x=>x.id===t.id);return replacement||t.kind===kind&&!t.archivedAt?replacement||{...t,archivedAt:stamp}:t;});
  for(const t of saved)if(!next.haccp.targets.some(x=>x.id===t.id))next.haccp.targets.push(t);
 }
 const scratch=T.empty(),operatorIds=new Set();
 const operators=d.operators.map(row=>{const old=existingRow(next.operators,row);if(old&&operatorIds.has(old.id))throw Error('Operatore duplicato.');if(old)operatorIds.add(old.id);const op=T.saveOperator(scratch,{name:row.name});return{...op,id:old?.id||op.id};});
 next.operators=next.operators.map(o=>operators.find(x=>x.id===o.id)||(!o.archivedAt?{...o,archivedAt:stamp}:o));
 for(const o of operators)if(!next.operators.some(x=>x.id===o.id))next.operators.push(o);
 next.settings={...next.settings,business:required(d.business,'il nome dell’attività'),address:String(d.address||'').trim(),responsible:operators[d.defaultOperator].name,productionEnabled:d.productionEnabled};
 syncTargets('temperature',d.equipment.slice(0,Number(d.equipmentCount)));
 syncTargets('pulizia',d.cleaning.slice(0,Number(d.cleaningCount)));
 syncTargets('infestanti',[{...d.pest,name:'Intera attività',scope:'activity'}]);
 next.setup={version:1,completedAt:stamp};
 const result=validate(next);Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,result);return s;
}
const isComplete=s=>!!s.setup?.completedAt;
return{MAX_ITEMS,nextIdentifier,newEquipment,makeDraft,validateStep,validate,saveDraft,complete,changes,isComplete};
});
