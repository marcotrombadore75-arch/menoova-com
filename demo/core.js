(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Trace=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const UNITS={kg:{family:'mass',factor:1000},g:{family:'mass',factor:1},l:{family:'volume',factor:1000},ml:{family:'volume',factor:1},pz:{family:'count',factor:1}};
const PROCESSES=['Cottura','Abbattimento','Surgelamento','Confezionamento ed etichettatura','Stoccaggio a −18 °C','Stoccaggio a +4 °C'];
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
const clone=x=>JSON.parse(JSON.stringify(x));
function text(x,label){const v=String(x??'').trim();if(!v)throw Error('Inserisci '+label+'.');if(v.length>300)throw Error(label+': massimo 300 caratteri.');return v;}
function number(x,label,optional=false){if(optional&&(x===''||x==null))return null;const s=String(x).trim().replace(',','.');if(!/^\d+(\.\d+)?$/.test(s))throw Error('Controlla '+label+'.');const n=Number(s);if(!Number.isFinite(n)||n<=0||n>1e9)throw Error(label+': inserisci una quantità maggiore di zero.');return n;}
function date(x,label){if(!/^\d{4}-\d{2}-\d{2}$/.test(x||'')||new Date(x+'T12:00:00Z').toISOString().slice(0,10)!==x)throw Error('Controlla '+label+'.');return x;}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function empty(){return{schema:1,settings:{business:'',address:'',responsible:''},operators:[],ingredients:[],loads:[],products:[],productions:[],lotCounters:{},haccp:{targets:[],records:[],nextNumber:1}};}
function ingredient(s,id){const v=s.ingredients.find(i=>i.id===id);if(!v)throw Error('Materia prima non trovata.');if(v.deletedAt)throw Error(v.name+': prodotto eliminato dal carico. Seleziona una materia prima disponibile.');return v;}
function availableIngredients(s){return s.ingredients.filter(i=>!i.deletedAt);}
function deleteIngredient(s,id){const i=ingredient(s,id);i.deletedAt=new Date().toISOString();for(const l of s.loads)if(l.ingredientId===id&&l.active){l.active=false;l.removedAt=i.deletedAt;}return i;}
function activeLoad(s,id){return s.loads.find(l=>l.ingredientId===id&&l.active)||null;}
function hasRecipe(p){return !!(p&&Array.isArray(p.lines)&&p.lines.length&&p.yieldQty>0&&UNITS[p.yieldUnit]&&(p.kind!=='simple'||p.lines.length===1));}
function sameName(a,b){return a.trim().toLocaleLowerCase('it')===b.trim().toLocaleLowerCase('it');}
function storeProduct(s,current,p){
 if(!current||!sameName(current.name,p.name)){
  if(s.products.some(x=>x.id!==p.id&&sameName(x.name,p.name)))throw Error('Questo nome è già presente nei codici. Apri il prodotto esistente oppure scegli un altro nome.');
 }
 const linked=s.ingredients.find(i=>i.productId===p.id);
 if(linked&&s.ingredients.some(i=>i.id!==linked.id&&sameName(i.name,p.name)))throw Error('Esiste già un ingrediente del carico con questo nome. Scegli un nome diverso.');
 if(current)s.products[s.products.indexOf(current)]=p;else s.products.push(p);
 if(linked)linked.name=p.name;
 return p;
}
function saveCode(s,data){const current=data.id?s.products.find(p=>p.id===data.id):null;if(data.id&&!current)throw Error('Prodotto non trovato.');const name=text(data.name,'il nome del prodotto');if(!['simple','recipe'].includes(data.kind))throw Error('Scegli Singola o Composta.');if(data.kind==='simple'&&current?.lines.length>1)throw Error('La ricetta contiene più ingredienti. Modificala nella sezione Ricette prima di scegliere Singola.');const p={...(current||{id:uid(),code:Math.max(0,...s.products.map(p=>p.code))+1,yieldQty:null,yieldUnit:'pz',lines:[],processes:[]}),name,kind:data.kind,updatedAt:new Date().toISOString()};return storeProduct(s,current,p);}
function reserveLot(s,lot){const match=/^(L\.\d+-\d{6}-)(\d+)$/.exec(lot);if(match){s.lotCounters=s.lotCounters||{};s.lotCounters[match[1]]=Math.max(s.lotCounters[match[1]]||0,Number(match[2]));}}
function deleteProduction(s,id){const index=s.productions.findIndex(p=>p.id===id);if(index<0)throw Error('Scheda non trovata.');const record=s.productions[index];reserveLot(s,record.internalLot);s.productions.splice(index,1);return record;}
function addIngredient(s,data){const name=text(data.name,'il nome della materia prima');if(!UNITS[data.unit])throw Error('Unità non valida.');const current=s.ingredients.find(i=>i.name.toLocaleLowerCase('it')===name.toLocaleLowerCase('it'));if(current){if(!current.deletedAt)throw Error('Questa materia prima esiste già: selezionala dall’elenco.');if(current.unit!==data.unit)throw Error('Per ricaricare '+current.name+' usa l’unità '+current.unit+'.');delete current.deletedAt;return current;}const v={id:uid(),name,unit:data.unit};s.ingredients.push(v);return v;}
function codeIngredient(s,productId){
 const p=s.products.find(p=>p.id===productId);if(!p)throw Error('Prodotto non trovato nei codici.');
 return s.ingredients.find(i=>i.productId===p.id)||s.ingredients.find(i=>!i.productId&&sameName(i.name,p.name))||null;
}
function addLoad(s,data){
 const p=data.productId?s.products.find(p=>p.id===data.productId):null;
 if(data.productId&&!p)throw Error('Prodotto non trovato nei codici.');
 let i=p?codeIngredient(s,p.id):ingredient(s,data.ingredientId);
 if(p&&!i){
  if(s.ingredients.some(x=>sameName(x.name,p.name)))throw Error('Questo ingrediente è già collegato a un altro codice. Selezionalo dal carico.');
  if(!UNITS[data.unit])throw Error('Scegli l’unità di carico.');
  i={id:uid(),name:p.name,unit:data.unit};
 }
 if(p&&data.ingredientId&&data.ingredientId!==i.id)throw Error('Il codice e l’ingrediente selezionati non corrispondono.');
 if(p&&data.unit&&data.unit!==i.unit)throw Error('Per ricaricare '+i.name+' usa l’unità '+i.unit+'.');
 const v={id:uid(),ingredientId:i.id,lot:text(data.lot,'il lotto del fornitore'),supplier:text(data.supplier,'il fornitore'),expiry:date(data.expiry,'la scadenza'),receivedDate:date(data.receivedDate,'la data di carico'),quantity:number(data.quantity,'la quantità caricata'),unit:i.unit,active:true,createdAt:new Date().toISOString()};
 if(v.receivedDate>today())throw Error('La data di carico non può essere futura.');
 if(p){if(!s.ingredients.includes(i))s.ingredients.push(i);i.productId=p.id;delete i.deletedAt;}
 for(const l of s.loads)if(l.ingredientId===i.id&&l.active){l.active=false;l.replacedAt=v.createdAt;}
 s.loads.push(v);return v;
}
function saveProduct(s,data){let current=data.id?s.products.find(p=>p.id===data.id):null;if(data.id&&!current)throw Error('Prodotto non trovato.');const name=text(data.name,'il nome del prodotto');const kind=data.kind==='simple'?'simple':'recipe';const yieldQty=number(data.yieldQty,'la resa della ricetta');if(!UNITS[data.yieldUnit])throw Error('Unità della resa non valida.');if(!Array.isArray(data.lines)||!data.lines.length)throw Error('Aggiungi almeno una materia prima.');if(kind==='simple'&&data.lines.length!==1)throw Error('Un prodotto semplice deve avere una materia prima.');const ids=new Set();const lines=data.lines.map(l=>{const i=ingredient(s,l.ingredientId);if(ids.has(i.id))throw Error('La stessa materia prima è presente due volte.');ids.add(i.id);if(!UNITS[l.unit]||UNITS[l.unit].family!==UNITS[i.unit].family)throw Error('Unità incompatibile per '+i.name+'.');return{ingredientId:i.id,quantity:number(l.quantity,'la quantità di '+i.name),unit:l.unit};});const processes=(data.processes||[]).filter(x=>PROCESSES.includes(x));const p={id:current?.id||uid(),code:current?.code||Math.max(0,...s.products.map(p=>p.code))+1,name,kind,yieldQty,yieldUnit:data.yieldUnit,lines,processes,updatedAt:new Date().toISOString()};return storeProduct(s,current,p);}
function saveRecipe(s,data){
 const name=text(data.name,'il nome della ricetta');let id=data.id;
 if(!id){
  const matches=s.products.filter(p=>sameName(p.name,name));
  if(matches.length>1)throw Error('Questo nome è presente in più codici. Assegna nomi diversi nella legenda prima di creare la ricetta.');
  if(matches[0]){
   if(matches[0].kind!=='recipe')throw Error('Questo nome appartiene a un prodotto Singola. Scegli un altro nome per la ricetta.');
   if(hasRecipe(matches[0]))throw Error('Esiste già una ricetta con questo nome. Aprila da Ricette per modificarla.');
   id=matches[0].id;
  }
 }
 if(id&&s.products.find(p=>p.id===id)?.kind==='simple')throw Error('Seleziona un prodotto Composta per la ricetta.');
 return saveProduct(s,{...data,id,name,kind:'recipe'});
}
function preview(s,data){const p=s.products.find(p=>p.id===data.productId);if(!p)throw Error('Seleziona un prodotto.');if(!hasRecipe(p))throw Error('Completa prima gli ingredienti e la resa nella sezione Ricette.');const productionDate=date(data.productionDate,'la data di produzione');if(productionDate>today())throw Error('Registra la produzione nella data in cui viene effettuata.');const outputQty=number(data.outputQty,'la quantità prodotta');const factor=outputQty/p.yieldQty;const lines=p.lines.map((line,index)=>{const i=ingredient(s,line.ingredientId);const l=activeLoad(s,i.id);if(!l)throw Error('Manca il lotto attivo di '+i.name+'. Completa il carico.');if(l.receivedDate>productionDate)throw Error(i.name+': il lotto attivo è stato caricato dopo la data di produzione.');if(l.expiry<productionDate)throw Error(i.name+': la scadenza del lotto attivo precede la produzione. Verifica il carico.');const actual=data.actualQuantities?.[index];return{ingredientId:i.id,ingredientName:i.name,loadId:l.id,lot:l.lot,supplier:l.supplier,expiry:l.expiry,receivedDate:l.receivedDate,quantity:actual==null?Math.round(line.quantity*factor*1e6)/1e6:number(actual,'la quantità utilizzata di '+i.name),unit:line.unit};});return{product:p,productionDate,outputQty,lines};}
function createProduction(s,data){const v=preview(s,data);const packages=number(data.packages,'il numero di confezioni',true);if(packages!=null&&!Number.isInteger(packages))throw Error('Il numero di confezioni deve essere intero.');const processes=(data.processes||[]).filter(x=>PROCESSES.includes(x));if(!processes.length)throw Error('Seleziona almeno un trattamento effettuato.');const responsible=text(data.responsible,'il responsabile del processo');const business=text(s.settings.business,'il nome dell’attività nelle impostazioni');const day=v.productionDate.slice(8)+v.productionDate.slice(5,7)+v.productionDate.slice(2,4);const prefix='L.'+v.product.code+'-'+day+'-';const suffix=Math.max(0,s.lotCounters?.[prefix]||0,...s.productions.filter(p=>p.internalLot.startsWith(prefix)).map(p=>Number(p.internalLot.slice(prefix.length))||0))+1;const record={id:uid(),internalLot:prefix+String(suffix).padStart(2,'0'),productId:v.product.id,productCode:v.product.code,productName:v.product.name,productionDate:v.productionDate,documentDate:today(),outputQty:v.outputQty,outputUnit:v.product.yieldUnit,packages,totalWeightKg:number(data.totalWeightKg,'il peso totale',true),lines:clone(v.lines),recipeSnapshot:clone(v.product),processes,responsible,business,address:s.settings.address||'',notes:String(data.notes||'').trim().slice(0,1000),createdAt:new Date().toISOString(),status:'confirmed'};s.productions.push(record);reserveLot(s,record.internalLot);return record;}
function voidProduction(s,id,reason){const p=s.productions.find(p=>p.id===id);if(!p)throw Error('Scheda non trovata.');if(p.status==='void')throw Error('Scheda già annullata.');p.status='void';p.voidReason=text(reason,'il motivo dell’annullamento');p.voidedAt=new Date().toISOString();return p;}
function validate(s){if(!s||s.schema!==1||!s.settings||!['ingredients','loads','products','productions'].every(k=>Array.isArray(s[k])))throw Error('Copia di sicurezza non riconosciuta.');if(JSON.stringify(s).length>20*1024*1024)throw Error('Copia di sicurezza troppo grande.');const ids=new Set();for(const type of ['ingredients','loads','products','productions'])for(const x of s[type]){if(typeof x.id!=='string'||!x.id||ids.has(x.id))throw Error('Identificativi non validi nella copia.');ids.add(x.id);}
 const ingredients=new Map();for(const i of s.ingredients){text(i.name,'il nome');if(!UNITS[i.unit])throw Error('Unità non valida.');ingredients.set(i.id,i);}const active=new Set();for(const l of s.loads){if(!ingredients.has(l.ingredientId))throw Error('Carico senza materia prima.');text(l.lot,'il lotto');text(l.supplier,'il fornitore');date(l.expiry,'la scadenza');date(l.receivedDate,'la data di carico');number(l.quantity,'la quantità');if(l.unit!==ingredients.get(l.ingredientId).unit||typeof l.active!=='boolean')throw Error('Carico non valido.');if(l.active){if(ingredients.get(l.ingredientId).deletedAt)throw Error('Prodotto eliminato con lotto ancora attivo.');if(active.has(l.ingredientId))throw Error('Più lotti attivi per la stessa materia prima.');active.add(l.ingredientId);}}
 const codes=new Set();for(const p of s.products){if(!Number.isInteger(p.code)||p.code<1||codes.has(p.code))throw Error('Codice prodotto non valido o duplicato.');codes.add(p.code);text(p.name,'il prodotto');if(!['simple','recipe'].includes(p.kind))throw Error('Tipo prodotto non valido.');if(!UNITS[p.yieldUnit]||!Array.isArray(p.lines)||!Array.isArray(p.processes)||!p.processes.every(x=>PROCESSES.includes(x)))throw Error('Ricetta non valida.');if(p.lines.length){number(p.yieldQty,'la resa');if(p.kind==='simple'&&p.lines.length!==1)throw Error('Ricetta singola non valida.');}else if(p.yieldQty!=null)throw Error('Ricetta incompleta non valida.');const lines=new Set();for(const l of p.lines){const i=ingredients.get(l.ingredientId);if(!i||lines.has(i.id)||!UNITS[l.unit]||UNITS[l.unit].family!==UNITS[i.unit].family)throw Error('Ingrediente della ricetta non valido.');number(l.quantity,'la quantità');lines.add(i.id);}}
 const linkedCodes=new Set();for(const i of s.ingredients)if(i.productId!=null){if(typeof i.productId!=='string'||!s.products.some(p=>p.id===i.productId)||linkedCodes.has(i.productId))throw Error('Collegamento fra codice e ingrediente non valido.');linkedCodes.add(i.productId);}
 const lots=new Set();for(const p of s.productions){text(p.internalLot,'il lotto interno');if(lots.has(p.internalLot))throw Error('Lotto interno duplicato.');lots.add(p.internalLot);text(p.productName,'il prodotto');text(p.business,'l’attività');text(p.responsible,'il responsabile');if(!Number.isInteger(p.productCode)||p.productCode<1)throw Error('Codice scheda non valido.');date(p.productionDate,'la produzione');date(p.documentDate,'il documento');number(p.outputQty,'la quantità');if(!UNITS[p.outputUnit]||!['confirmed','void'].includes(p.status)||!Array.isArray(p.lines)||!p.lines.length||!Array.isArray(p.processes)||!p.processes.length||!p.processes.every(x=>PROCESSES.includes(x)))throw Error('Scheda non valida.');if(p.status==='void')text(p.voidReason,'il motivo di annullamento');if(p.packages!=null){number(p.packages,'le confezioni');if(!Number.isInteger(p.packages))throw Error('Confezioni non valide.');}if(p.totalWeightKg!=null)number(p.totalWeightKg,'il peso');for(const l of p.lines){text(l.ingredientName,'l’ingrediente');text(l.lot,'il lotto');text(l.supplier,'il fornitore');date(l.expiry,'la scadenza');number(l.quantity,'la quantità');if(!UNITS[l.unit])throw Error('Unità scheda non valida.');}}
 if(s.lotCounters!=null){if(typeof s.lotCounters!=='object'||Array.isArray(s.lotCounters))throw Error('Progressivi dei lotti non validi.');for(const [key,value] of Object.entries(s.lotCounters))if(!/^L\.\d+-\d{6}-$/.test(key)||!Number.isSafeInteger(value)||value<1)throw Error('Progressivo del lotto non valido.');}text(s.settings.business||'Attività','l’attività');return clone(s);}
const REGISTER_KINDS=['temperature','pulizia','infestanti'];
const REGISTER_RESULTS={temperature:{ok:'Entro i limiti',out:'Fuori dai limiti'},pulizia:{done:'Eseguita',partial:'Parziale',not_done:'Non eseguita'},infestanti:{clear:'Nessuna presenza',traces:'Tracce rilevate',found:'Presenza rilevata'}};
const PEST_TYPES={flying:'Insetti alati',crawling:'Insetti striscianti',rodents:'Roditori'};
function pestTypes(result,values){
 if(!Array.isArray(values)||values.some(v=>!Object.prototype.hasOwnProperty.call(PEST_TYPES,v))||new Set(values).size!==values.length)throw Error('Tipologia infestanti non valida.');
 if(result==='clear'&&values.length)throw Error('Nessuna presenza: non selezionare una tipologia di infestante.');
 if(result!=='clear'&&!values.length)throw Error('Seleziona almeno una tipologia di infestante.');
 return [...values];
}
function pestLabel(r){return r.kind!=='infestanti'||r.result==='clear'?'':r.pestTypes?.length?r.pestTypes.map(v=>PEST_TYPES[v]).join(', '):'Tipologia non specificata';}
function operatorList(s){
 if(s.operators===undefined){s.operators=[];if(String(s.settings.responsible||'').trim())saveOperator(s,{name:s.settings.responsible});}
 if(!Array.isArray(s.operators))throw Error('Elenco operatori non valido.');
 return s.operators;
}
function availableOperators(s){return operatorList(s).filter(o=>!o.archivedAt);}
function saveOperator(s,data){
 const list=operatorList(s),current=data.id?list.find(o=>o.id===data.id&&!o.archivedAt):null;
 if(data.id&&!current)throw Error('Operatore non disponibile.');
 const name=text(data.name,'il nome dell’operatore');
 if(list.some(o=>!o.archivedAt&&o.id!==data.id&&o.name.toLocaleLowerCase('it')===name.toLocaleLowerCase('it')))throw Error('Questo operatore è già presente.');
 const o={id:current?.id||uid(),name};
 if(current){if(s.settings.responsible===current.name)s.settings.responsible=name;list[list.indexOf(current)]=o;}else list.push(o);
 return o;
}
function archiveOperator(s,id){
 const o=operatorList(s).find(o=>o.id===id&&!o.archivedAt);if(!o)throw Error('Operatore non disponibile.');
 o.archivedAt=new Date().toISOString();if(s.settings.responsible===o.name)s.settings.responsible='';return o;
}
function validateOperators(s){
 const ids=new Set([...s.ingredients,...s.loads,...s.products,...s.productions,...s.haccp.targets,...s.haccp.records].map(x=>x.id)),names=new Set();
 for(const o of operatorList(s)){
  if(!o||typeof o.id!=='string'||!o.id||ids.has(o.id))throw Error('Identificativo operatore non valido.');ids.add(o.id);
  const name=text(o.name,'il nome dell’operatore').toLocaleLowerCase('it');
  if(!o.archivedAt){if(names.has(name))throw Error('Operatore duplicato.');names.add(name);}
 }
 return s;
}
function haccp(s){if(!s.haccp)s.haccp={targets:[],records:[],nextNumber:1};return s.haccp;}
function temperature(value,label='la temperatura',optional=false){if(optional&&(value==null||String(value).trim()===''))return null;const valueText=String(value??'').trim().replace(',','.');if(!/^[+-]?\d+(\.\d+)?$/.test(valueText))throw Error('Controlla '+label+'.');const v=Number(valueText);if(!Number.isFinite(v)||v<-100||v>300)throw Error('Controlla '+label+' (da −100 a 300 °C).');return v;}
function validLimits(min,max){if(min==null&&max==null)throw Error('Inserisci almeno un limite di temperatura previsto dal tuo piano.');if(min!=null&&max!=null&&min>max)throw Error('Il limite minimo deve essere inferiore o uguale al massimo.');}
function temperatureResult(value,min,max){return(min!=null&&value<min)||(max!=null&&value>max)?'out':'ok';}
function validSchedule(t){if(!Number.isInteger(t.intervalDays)||t.intervalDays<1||t.intervalDays>365||!Number.isInteger(t.checksPerDay)||t.checksPerDay<1||t.checksPerDay>24||t.intervalDays!==1&&t.checksPerDay!==1)throw Error('Controlla la frequenza: da 1 a 365 giorni; più controlli al giorno solo per la frequenza giornaliera.');}
function saveTarget(s,data){const list=haccp(s).targets,current=data.id?list.find(t=>t.id===data.id):null;if(data.id&&(!current||current.archivedAt))throw Error('Voce non disponibile.');if(!REGISTER_KINDS.includes(data.kind)||current&&current.kind!==data.kind)throw Error('Reparto non valido.');const scope=data.scope??current?.scope;const name=scope==='activity'?'Intera attività':text(data.name,'il nome');if(data.kind==='infestanti'&&s.setup?.completedAt&&list.some(t=>t.kind==='infestanti'&&!t.archivedAt&&t.id!==data.id))throw Error('Il controllo infestanti riguarda già l’intera attività.');if(list.some(t=>t.id!==data.id&&!t.archivedAt&&t.kind===data.kind&&t.name.toLocaleLowerCase('it')===name.toLocaleLowerCase('it')))throw Error('Questo nome è già presente nel reparto.');const t={id:current?.id||uid(),kind:data.kind,name,intervalDays:Number(data.intervalDays??1),checksPerDay:Number(data.checksPerDay??1),instructions:String(data.instructions||'').trim().slice(0,1000),updatedAt:new Date().toISOString()};validSchedule(t);if(t.kind==='temperature'){t.min=temperature(data.min,'il limite minimo',true);t.max=temperature(data.max,'il limite massimo',true);validLimits(t.min,t.max);}if(t.kind==='temperature'){
 const identifier=data.identifier??current?.identifier;if(identifier!==undefined){t.identifier=text(identifier,'l’identificativo').toUpperCase();if(t.identifier.length>32)throw Error('Identificativo: massimo 32 caratteri.');if(list.some(x=>x.kind==='temperature'&&!x.archivedAt&&x.id!==data.id&&x.identifier?.toUpperCase()===t.identifier))throw Error('Identificativo apparecchio già utilizzato.');}
 const type=data.applianceType??current?.applianceType;if(type!==undefined){if(!['fridge','freezer'].includes(type))throw Error('Scegli Frigorifero o Congelatore.');t.applianceType=type;}
 for(const key of ['isOff','offSince','powerCycle'])if(current?.[key]!==undefined)t[key]=current[key];
 }if(scope!==undefined){if(t.kind!=='infestanti'||scope!=='activity')throw Error('Ambito del controllo non valido.');t.scope=scope;}
 if(current)list[list.indexOf(current)]=t;else list.push(t);return t;}
function archiveTarget(s,id){const t=haccp(s).targets.find(t=>t.id===id&&!t.archivedAt);if(!t)throw Error('Voce non disponibile.');if(t.scope==='activity')throw Error('Il controllo infestanti è riferito all’intera attività.');t.archivedAt=new Date().toISOString();return t;}
function setEquipmentOff(s,id,isOff){
 const t=haccp(s).targets.find(t=>t.id===id&&!t.archivedAt&&t.kind==='temperature');
 if(!t)throw Error('Apparecchio non disponibile.');if(typeof isOff!=='boolean')throw Error('Stato apparecchio non valido.');
 if(!!t.isOff===isOff)return t;
 const stamp=new Date().toISOString();
 if(isOff)t.offSince=stamp;else{delete t.offSince;t.powerCycle=(t.powerCycle||0)+1;}
 t.isOff=isOff;t.updatedAt=stamp;return t;
}
function createCheck(s,data){const h=haccp(s),t=h.targets.find(t=>t.id===data.targetId&&!t.archivedAt);if(!t)throw Error('Seleziona una voce disponibile.');if(t.isOff)throw Error('L’apparecchio è spento (OFF). Riattivalo da Gestisci prima del controllo.');const checkDate=date(data.date,'la data del controllo');if(checkDate>today())throw Error('La data del controllo non può essere futura.');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time||''))throw Error('Controlla l’ora.');const business=text(s.settings.business,'il nome dell’attività nelle Impostazioni');const operator=text(data.operator,'l’operatore');const value=t.kind==='temperature'?temperature(data.value):null;const result=t.kind==='temperature'?temperatureResult(value,t.min,t.max):data.result;if(!Object.prototype.hasOwnProperty.call(REGISTER_RESULTS[t.kind],result))throw Error('Seleziona l’esito del controllo.');const r={id:uid(),number:h.nextNumber||1,kind:t.kind,targetId:t.id,targetName:t.name,targetSnapshot:clone(t),date:checkDate,time:data.time,value,result,operator,notes:String(data.notes||'').trim().slice(0,1000),business,address:s.settings.address||'',status:'confirmed',createdAt:new Date().toISOString()};if(t.kind==='infestanti')r.pestTypes=pestTypes(result,data.pestTypes||[]);h.records.push(r);h.nextNumber=r.number+1;return r;}
function voidCheck(s,id,reason){const r=haccp(s).records.find(r=>r.id===id);if(!r)throw Error('Registrazione non trovata.');if(r.status==='void')throw Error('Registrazione già annullata.');const why=text(reason,'il motivo dell’annullamento');r.status='void';r.voidReason=why;r.voidedAt=new Date().toISOString();return r;}
function checkSchedule(s,t,onDate=today()){
 const records=haccp(s).records.filter(r=>r.targetId===t.id&&r.status==='confirmed'&&r.date<=onDate).sort((a,b)=>(b.date+b.time+b.createdAt).localeCompare(a.date+a.time+a.createdAt));
 const last=records[0]||null,current=records.filter(r=>(r.targetSnapshot.powerCycle||0)===(t.powerCycle||0)),count=current.filter(r=>r.date===onDate).length;
 if(t.isOff)return{last,count,due:false,nextDate:null};
 if(t.intervalDays===1)return{last,count,due:count<t.checksPerDay,nextDate:onDate};
 if(!current.length)return{last,count,due:true,nextDate:onDate};
 const next=new Date(current[0].date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+t.intervalDays);const nextDate=next.toISOString().slice(0,10);return{last,count,due:nextDate<=onDate,nextDate};
}
function validateRegisters(s){const h=haccp(s);if(!Array.isArray(h.targets)||!Array.isArray(h.records)||!Number.isSafeInteger(h.nextNumber)||h.nextNumber<1)throw Error('Registri HACCP non validi.');const ids=new Set([...s.ingredients,...s.loads,...s.products,...s.productions].map(x=>x.id));const targetIds=new Map(),numbers=new Set();
 function target(t){if(!t||!REGISTER_KINDS.includes(t.kind)||typeof t.id!=='string'||!t.id)throw Error('Voce del registro non valida.');text(t.name,'il nome');validSchedule(t);if(t.identifier!==undefined&&(typeof t.identifier!=='string'||!t.identifier.trim()||t.identifier.length>32))throw Error('Identificativo apparecchio non valido.');if(t.applianceType!==undefined&&!['fridge','freezer'].includes(t.applianceType))throw Error('Tipo apparecchio non valido.');if(t.scope!==undefined&&(t.kind!=='infestanti'||t.scope!=='activity'))throw Error('Ambito infestanti non valido.');if(t.kind==='temperature'){if(t.min!==null&&typeof t.min!=='number'||t.max!==null&&typeof t.max!=='number')throw Error('Limiti del registro non validi.');if(t.min!==null)temperature(t.min);if(t.max!==null)temperature(t.max);validLimits(t.min,t.max);}}
 function powerState(t){if(t.isOff!==undefined&&(t.kind!=='temperature'||typeof t.isOff!=='boolean'))throw Error('Stato apparecchio non valido.');if(t.powerCycle!==undefined&&(t.kind!=='temperature'||!Number.isSafeInteger(t.powerCycle)||t.powerCycle<0))throw Error('Riattivazione apparecchio non valida.');if(t.offSince!==undefined&&(!t.isOff||typeof t.offSince!=='string'||!Number.isFinite(Date.parse(t.offSince))))throw Error('Data spegnimento non valida.');}
 const identifiers=new Set();for(const t of h.targets){target(t);powerState(t);if(!t.archivedAt&&t.kind==='temperature'&&t.identifier){const code=t.identifier.toUpperCase();if(identifiers.has(code))throw Error('Identificativo apparecchio duplicato.');identifiers.add(code);}if(ids.has(t.id))throw Error('Identificativi duplicati nei registri.');ids.add(t.id);targetIds.set(t.id,t);}
 for(const r of h.records){if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error('Identificativi dei controlli non validi.');ids.add(r.id);if(!Number.isSafeInteger(r.number)||r.number<1||numbers.has(r.number)||r.number>=h.nextNumber)throw Error('Progressivo del registro non valido.');numbers.add(r.number);const t=targetIds.get(r.targetId);if(!t||r.kind!==t.kind||!Object.prototype.hasOwnProperty.call(REGISTER_RESULTS[r.kind],r.result))throw Error('Controllo senza voce valida.');target(r.targetSnapshot);if(r.targetSnapshot.id!==r.targetId||r.targetSnapshot.kind!==r.kind||r.targetSnapshot.name!==r.targetName)throw Error('Dati storici del controllo non validi.');text(r.business,'l’attività');text(r.operator,'l’operatore');date(r.date,'la data del controllo');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time||''))throw Error('Ora del controllo non valida.');if(!['confirmed','void'].includes(r.status))throw Error('Stato del controllo non valido.');if(r.status==='void')text(r.voidReason,'il motivo');if(r.kind==='temperature'){if(typeof r.value!=='number')throw Error('Temperatura registrata non valida.');temperature(r.value);if(temperatureResult(r.value,r.targetSnapshot.min,r.targetSnapshot.max)!==r.result)throw Error('Esito della temperatura non coerente.');}else if(r.value!==null)throw Error('Valore del controllo non valido.');if(r.kind==='infestanti'&&r.pestTypes!==undefined)pestTypes(r.result,r.pestTypes);}
 for(const r of h.records)powerState(r.targetSnapshot);
 return s;}
function targetLabel(t){return (t.identifier?t.identifier+' · ':'')+t.name;}
const validateState=validate;
function validateAll(s){return validateOperators(validateRegisters(validateState(s)));}
return{targetLabel,UNITS,PROCESSES,empty,clone,number,today,activeLoad,availableIngredients,deleteIngredient,hasRecipe,saveCode,codeIngredient,addIngredient,addLoad,saveProduct,saveRecipe,preview,createProduction,voidProduction,deleteProduction,validate:validateAll,REGISTER_KINDS,REGISTER_RESULTS,PEST_TYPES,pestLabel,availableOperators,saveOperator,archiveOperator,temperature,temperatureResult,saveTarget,archiveTarget,setEquipmentOff,createCheck,voidCheck,checkSchedule};
});
