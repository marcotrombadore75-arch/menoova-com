/* Isolated demonstration data. No localStorage, server, or app data is used. */
(() => {
  const C=Trace, s=C.empty();
  const shifted=days=>{const date=new Date();date.setDate(date.getDate()+days);return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');};
  s.settings={business:'Laboratorio Demo',address:'Attività e dati di esempio',responsible:'Marco',productionEnabled:true};
  C.saveOperator(s,{name:'Marco'});C.saveOperator(s,{name:'Sara'});
  const bread=C.saveCode(s,{name:'Panini al cioccolato',kind:'recipe'});
  const chicken=C.saveCode(s,{name:'Pollo porzionato',kind:'simple'});
  C.saveCode(s,{name:'Impasto per pizza',kind:'recipe'});
  const raw=[['Farina','kg','F-0010',25,150],['Zucchero','kg','Z-1248',5,200],['Gocce di cioccolato','kg','C-1122',5,120],['Sale','kg','S-0022',1,365],['Lievito','kg','L-0011',1,10],['Pollo','kg','P-0042',10,4]];
  const ingredients=raw.map(([name,unit,lot,quantity,expiry],i)=>{
    const code=C.saveCode(s,{name,kind:'simple'});
    C.addLoad(s,{productId:code.id,unit,lot,supplier:'Fornitore demo '+(i+1),expiry:shifted(expiry),receivedDate:shifted(-2),quantity});
    return C.codeIngredient(s,code.id);
  });
  C.saveRecipe(s,{...bread,yieldQty:20,yieldUnit:'pz',lines:ingredients.slice(0,5).map((item,index)=>({ingredientId:item.id,quantity:[1,.1,.15,.02,.02][index],unit:'kg'})),processes:['Abbattimento','Surgelamento','Stoccaggio a −18 °C']});
  C.saveProduct(s,{...chicken,yieldQty:1,yieldUnit:'kg',lines:[{ingredientId:ingredients[5].id,quantity:1,unit:'kg'}],processes:['Abbattimento','Surgelamento','Stoccaggio a −18 °C']});
  C.saveCode(s,{name:'Burro',kind:'simple'});
  C.createProduction(s,{productId:bread.id,productionDate:shifted(0),outputQty:20,packages:20,responsible:'Marco',processes:['Abbattimento','Surgelamento','Stoccaggio a −18 °C'],notes:'DEMO — Esempio illustrativo, non una registrazione operativa.'});
  C.createProduction(s,{productId:chicken.id,productionDate:shifted(-1),outputQty:3,packages:6,responsible:'Sara',processes:['Abbattimento','Surgelamento','Stoccaggio a −18 °C'],notes:'DEMO — Esempio illustrativo, non una registrazione operativa.'});
  const cold=[['F01','Frigo laboratorio','fridge',0,4],['F02','Frigo banco vendita','fridge',0,4],['C01','Congelatore magazzino','freezer',-24,-18]].map(([identifier,name,applianceType,min,max])=>C.saveTarget(s,{kind:'temperature',identifier,name,applianceType,min,max,intervalDays:1,checksPerDay:1,instructions:'DEMO: limiti e frequenze sono fittizi. Nell’app vanno configurati in base al piano della tua attività.'}));
  cold.forEach((item,index)=>C.createCheck(s,{targetId:item.id,date:shifted(-1),time:'08:30',value:[3.2,2.5,-20][index],operator:'Marco',notes:'Misurazione di esempio.'}));
  C.createCheck(s,{targetId:cold[1].id,date:shifted(0),time:'08:20',value:2.8,operator:'Sara',notes:'Misurazione di esempio.'});
  const reserve=C.saveTarget(s,{kind:'temperature',identifier:'F03',name:'Frigo di riserva',applianceType:'fridge',min:0,max:4,intervalDays:1,checksPerDay:1});
  C.setEquipmentOff(s,reserve.id,true);
  ['Laboratorio','Banco vendita','Bagno','Magazzino'].forEach(name=>{
    const area=C.saveTarget(s,{kind:'pulizia',name,intervalDays:1,checksPerDay:1,instructions:'Esempio: segui la procedura prevista dal tuo piano di pulizia.'});
    C.createCheck(s,{targetId:area.id,date:shifted(-1),time:'18:30',result:'done',operator:'Sara',notes:'Controllo di esempio.'});
  });
  const pests=C.saveTarget(s,{kind:'infestanti',name:'Intera attività',scope:'activity',intervalDays:1,checksPerDay:1});
  C.createCheck(s,{targetId:pests.id,date:shifted(-1),time:'09:00',result:'clear',pestTypes:[],operator:'Marco',notes:'Controllo di esempio.'});
  s.setup={version:1,completedAt:new Date().toISOString()};
  TraceSetup.validate(s);
  let memory=JSON.stringify(s);
  window.DemoStorage={getItem(){return memory;},setItem(key,value){memory=value;}};
  for(const method of ['sheet','legend','register']){
    const original=TracePrint[method];
    TracePrint[method]=(...args)=>original(...args).replace(/<body([^>]*)>/i,'<body$1><div style="border:2px solid #174f43;padding:8px;margin-bottom:12px;text-align:center;font-weight:bold">DEMO HaccpIQ — DATI FITTIZI — NON USARE COME REGISTRAZIONE OPERATIVA</div>');
  }
})();
