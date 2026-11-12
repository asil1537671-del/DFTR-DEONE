import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Coins,Plus,Save,Settings,Trash2,WalletCards} from 'lucide-react';
import {useApp} from './store';
import {Button,ErrorBox,Field,Sheet} from './ui';
import {money,num,round,today} from './logic';

const makeId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clone=value=>JSON.parse(JSON.stringify(value));
const newEntry=(currency='USD')=>({id:makeId(),description:'',currency,amount:''});

function monthBefore(value){
 if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value))return '';
 const [year,month]=value.split('-').map(Number);
 return month===1?`${year-1}-12`:`${year}-${String(month-1).padStart(2,'0')}`;
}

function monthName(value){
 const [year,month]=value.split('-').map(Number);
 return new Intl.DateTimeFormat('ar',{month:'short',year:'numeric'}).format(new Date(year,month-1,1));
}

function monthTotal(record){
 if(!record)return 0;
 return round((record.entries||[]).reduce((total,entry)=>{
  const amount=Number(entry.amount)||0,rate=Number(record.rates?.[entry.currency]);
  return total+(rate>0?amount/rate:0);
 },0));
}

function draftTotal(entries,rates){
 return round(entries.reduce((total,entry)=>{
  const amount=Number(entry.amount)||0,rate=Number(rates?.[entry.currency]);
  return total+(rate>0?amount/rate:0);
 },0));
}

function LiquidityChart({rows}){
 if(!rows.length)return <p className="report-empty">سجّل رصيد شهر لعرض تطوّر السيولة.</p>;
 const width=720,height=230,padX=28,top=20,bottom=42;
 const max=Math.max(1,...rows.map(row=>row.total));
 const points=rows.map((row,index)=>({
  ...row,
  x:rows.length===1?width/2:padX+index*(width-padX*2)/(rows.length-1),
  y:top+(height-top-bottom)*(1-row.total/max),
 }));
 const line=points.map((point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' ');
 return <div className="liquidity-chart-wrap">
  <svg className="liquidity-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="مخطط تطور إجمالي السيولة بالدولار">
   {[0,.5,1].map((fraction,index)=>{const y=top+(height-top-bottom)*fraction;return <line key={index} x1={padX} x2={width-padX} y1={y} y2={y} className="liquidity-grid-line"/>})}
   {points.length>1&&<path d={line} className="liquidity-chart-line"/>}
   {points.map(point=><g key={point.month}><circle cx={point.x} cy={point.y} r="5" className="liquidity-chart-point"><title>{monthName(point.month)}: {money(point.total)}</title></circle><text x={point.x} y={height-12} textAnchor="middle" className="liquidity-chart-label">{monthName(point.month)}</text></g>)}
  </svg>
 </div>
}

function LiquidityRateSheet({draft,setDraft,onClose,onSave,busy,onAddCurrency,newCurrency,setNewCurrency,error}){
 return <Sheet title="أسعار صرف السيولة" subtitle="هذه الأسعار مستقلة عن أسعار صرف الديون والتسديدات." onClose={onClose} wide footer={<><Button icon={Save} disabled={busy} onClick={onSave}>{busy?'جارٍ الحفظ…':'حفظ الأسعار والعملات'}</Button><Button kind="ghost" onClick={onClose}>إغلاق</Button></>}>
  <div className="stack">
   <div className="liquidity-note"><b>طريقة السعر:</b> أدخل عدد وحدات العملة التي تساوي دولارًا واحدًا. مثلًا: إذا كان الدولار يساوي 3.75 ريالًا، اكتب 3.75 أمام SAR. سعر USD ثابت على 1. عند إنشاء التبويب أول مرة، تكون أسعار الدفتر الحالية قيم بداية فقط، وبعدها تعدّل أسعار السيولة مستقلة عنها.</div>
   <div className="table-scroll"><table className="data-table liquidity-rate-table"><thead><tr><th>العملة</th><th>الاسم</th><th>الرمز</th><th>وحدات لكل دولار</th></tr></thead><tbody>{(draft?.currencies||[]).map(currency=><tr key={currency.code}><th className="num">{currency.code}</th><td>{currency.name}</td><td>{currency.symbol}</td><td><input className="field compact num" aria-label={`سعر ${currency.code} في السيولة`} type="number" min="0.000001" step="any" inputMode="decimal" disabled={currency.code==='USD'} value={draft?.rates?.[currency.code]??''} onChange={event=>setDraft(current=>({...current,rates:{...current.rates,[currency.code]:event.target.value}}))}/></td></tr>)}</tbody></table></div>
   <section className="liquidity-add-currency">
    <h3>إضافة عملة</h3>
    <div className="liquidity-currency-form">
     <Field label="رمز العملة" value={newCurrency.code} placeholder="مثال: EUR" maxLength={12} onChange={event=>setNewCurrency(current=>({...current,code:event.target.value.toUpperCase()}))}/>
     <Field label="اسم العملة" value={newCurrency.name} placeholder="مثال: يورو" onChange={event=>setNewCurrency(current=>({...current,name:event.target.value}))}/>
     <Field label="الرمز" value={newCurrency.symbol} placeholder="مثال: €" onChange={event=>setNewCurrency(current=>({...current,symbol:event.target.value}))}/>
     <Field label="وحدات لكل دولار" type="number" min="0.000001" step="any" inputMode="decimal" value={newCurrency.rate} onChange={event=>setNewCurrency(current=>({...current,rate:event.target.value}))}/>
     <Button kind="ghost" icon={Plus} onClick={onAddCurrency}>إضافة</Button>
    </div>
    <p className="tiny">الأسعار التي تحفظها هنا لا تغيّر الأسعار الرئيسية. وكل شهر محفوظ يحتفظ بسعره كما كان عند تسجيله.</p>
   </section>
   <ErrorBox>{error}</ErrorBox>
  </div>
 </Sheet>
}

export function LiquidityPage(){
 const {settings,liquidity=[],liquiditySettings=[],mutate,online}=useApp();
 const config=liquiditySettings.find(row=>row.id==='main');
 const [configDraft,setConfigDraft]=useState(null),[month,setMonth]=useState(today().slice(0,7));
 const [entries,setEntries]=useState([newEntry()]),[showRates,setShowRates]=useState(false);
 const [newCurrency,setNewCurrency]=useState({code:'',name:'',symbol:'',rate:''});
 const [busy,setBusy]=useState(false),[rateBusy,setRateBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const initialized=useRef(false);
 const currentRecord=liquidity.find(row=>row.month===month);

 useEffect(()=>{
  if(config){setConfigDraft(clone(config));initialized.current=true;return}
  if(!settings||initialized.current)return;
  initialized.current=true;
  const currencies=settings.currencies.map(currency=>({...currency}));
  const rates=Object.fromEntries(currencies.map(currency=>[currency.code,currency.code==='USD'?1:Number(settings.rates?.debt?.[currency.code])||1]));
  const initial={id:'main',currencies,rates};
  setConfigDraft(initial);
  mutate('liquidity-settings',initial).catch(reason=>setError(reason.message));
 },[config?.id,config?.updatedAt,settings?.id]);

 useEffect(()=>{
  setEntries(currentRecord?.entries?.length?clone(currentRecord.entries):[newEntry()]);
  setError('');setNotice('');
 },[month,currentRecord?.id,currentRecord?.updatedAt]);

 const currencies=configDraft?.currencies||[];
 const rates={...(configDraft?.rates||{}),...(currentRecord?.rates||{})};
 const total=draftTotal(entries,rates);
 const hasCurrentBalance=!!currentRecord||entries.some(entry=>Number(entry.amount)>0);
 const priorMonth=monthBefore(month),priorRecord=liquidity.find(row=>row.month===priorMonth),priorTotal=monthTotal(priorRecord);
 const change=hasCurrentBalance&&priorRecord?round(total-priorTotal):null;
 const percent=change!==null&&priorTotal>0?round((change/priorTotal)*100,2):null;
 const displayRows=useMemo(()=>{
  const map=new Map(liquidity.map(row=>[row.month,{month:row.month,total:monthTotal(row)}]));
  if(entries.some(entry=>Number(entry.amount)>0))map.set(month,{month,total});
  return [...map.values()].sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
 },[liquidity,month,entries,total]);
 const firstRecord=[...liquidity].filter(row=>row.month<=month).sort((a,b)=>a.month.localeCompare(b.month))[0];
 const sinceStart=hasCurrentBalance&&firstRecord?round(total-monthTotal(firstRecord)):null;
 const totalsByCurrency=entries.reduce((result,entry)=>{
  const amount=Number(entry.amount)||0;
  if(amount>0)result[entry.currency]=(result[entry.currency]||0)+amount;
  return result;
 },{});

 function updateEntry(id,key,value){setEntries(current=>current.map(entry=>entry.id===id?{...entry,[key]:value}:entry));setNotice('');}
 function addEntry(){setEntries(current=>[...current,newEntry(currencies[0]?.code||'USD')]);}
 function removeEntry(id){setEntries(current=>current.length===1?[newEntry(currencies[0]?.code||'USD')]:current.filter(entry=>entry.id!==id));}

 async function saveMonth(){
  setError('');setNotice('');
  if(entries.some(entry=>entry.amount!==''&&(!Number.isFinite(Number(entry.amount))||Number(entry.amount)<0))){setError('أدخل مبالغ صحيحة غير سالبة');return}
  const cleanEntries=entries.filter(entry=>Number(entry.amount)>0).map(entry=>{
   const currency=currencies.find(item=>item.code===entry.currency);
   return {...entry,description:String(entry.description||'').trim(),currencyName:currency?.name||entry.currency,currencySymbol:currency?.symbol||entry.currency,amount:Number(entry.amount)};
  });
  if(!cleanEntries.length){setError('أدخل مبلغًا واحدًا على الأقل');return}
  const usedCurrencies=[...new Set(cleanEntries.map(entry=>entry.currency))];
  if(usedCurrencies.some(code=>!(Number(rates[code])>0))){setError('أدخل سعر صرف صحيحًا لكل عملة مستخدمة');setShowRates(true);return}
  setBusy(true);
  try{
   const currentConfig={id:'main',currencies,rates:Object.fromEntries(currencies.map(currency=>[currency.code,currency.code==='USD'?1:Number(configDraft?.rates?.[currency.code])]))};
   if(!config||JSON.stringify(currentConfig)!==JSON.stringify({id:'main',currencies:config.currencies,rates:config.rates}))await mutate('liquidity-settings',currentConfig,config?.id);
   await mutate('liquidity',{id:month,month,entries:cleanEntries,rates:clone(rates)},currentRecord?.id);
   setNotice(online?'تم حفظ سيولة الشهر.':'حُفظت السيولة على هذا الجهاز وستُزامن عند عودة الاتصال.');
  }catch(reason){setError(reason.message)}finally{setBusy(false)}
 }

 async function saveRates(){
  setError('');
  if(!configDraft?.currencies?.length){setError('أضف عملة واحدة على الأقل');return}
  const cleanRates={};
  for(const currency of configDraft.currencies){
   const value=currency.code==='USD'?1:Number(configDraft.rates?.[currency.code]);
   if(!(value>0)){setError(`أدخل سعر صرف أكبر من صفر لعملة ${currency.code}`);return}
   cleanRates[currency.code]=value;
  }
  setRateBusy(true);
  try{
   const next={id:'main',currencies:configDraft.currencies,rates:cleanRates};
   await mutate('liquidity-settings',next,config?.id);
   setConfigDraft(next);setNotice('تم حفظ أسعار صرف السيولة.');setShowRates(false);
  }catch(reason){setError(reason.message)}finally{setRateBusy(false)}
 }

 function addCurrency(){
  const code=newCurrency.code.trim().toUpperCase(),rate=Number(newCurrency.rate);
  if(!/^[A-Z0-9]{2,12}$/.test(code)){setError('اكتب رمز عملة صحيحًا من حرفين إلى 12 حرفًا أو رقمًا');return}
  if(currencies.some(currency=>currency.code===code)){setError('هذه العملة موجودة بالفعل');return}
  if(!newCurrency.name.trim()){setError('اكتب اسم العملة');return}
  if(!(rate>0)){setError('أدخل سعر صرف أكبر من صفر');return}
  setConfigDraft(current=>({...current,currencies:[...current.currencies,{code,name:newCurrency.name.trim(),symbol:newCurrency.symbol.trim()||code}],rates:{...current.rates,[code]:rate}}));
  setNewCurrency({code:'',name:'',symbol:'',rate:''});setError('');
 }

 const percentLabel=percent===null?'—':`${percent>0?'+':''}${num(percent)}٪`;
 return <div className="stack liquidity-page">
  <div className="page-heading">
   <div><h1>السيولة</h1><p>سجّل الأرصدة الموجودة معك حسب العملة والمكان، وتابع تغيّرها كل شهر.</p></div>
   <Button kind="ghost" icon={Settings} disabled={!configDraft} onClick={()=>{setError('');setShowRates(true)}}>أسعار صرف السيولة</Button>
  </div>
  <div className="liquidity-independence"><WalletCards size={17}/><span>هذا القسم مستقل عن أرصدة العملاء والديون والسحوبات.</span></div>
  <section className="card liquidity-entry-card">
   <div className="liquidity-entry-head">
    <Field label="شهر السيولة" type="month" value={month} onChange={event=>{if(event.target.value)setMonth(event.target.value)}}/>
    <div className="liquidity-month-total"><small>إجمالي الشهر بالدولار</small><strong>{money(total)}</strong></div>
   </div>
   <div className="liquidity-entry-list">
    <div className="liquidity-entry-labels"><span>العملة</span><span>المبلغ الموجود</span><span>وصف الرصيد (اختياري)</span><span/></div>
    {entries.map(entry=><div className="liquidity-entry" key={entry.id}>
     <Field label="العملة"><select className="field" value={entry.currency} onChange={event=>updateEntry(entry.id,'currency',event.target.value)}>{currencies.map(currency=><option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}</select></Field>
     <Field label="المبلغ الموجود" type="number" min="0" step="any" inputMode="decimal" placeholder="0" value={entry.amount} onChange={event=>updateEntry(entry.id,'amount',event.target.value)}/>
     <Field label="وصف الرصيد (اختياري)" value={entry.description} placeholder="جيب كريمي، حساب البنك…" onChange={event=>updateEntry(entry.id,'description',event.target.value)}/>
     <button className="icon liquidity-remove" aria-label="حذف المبلغ" onClick={()=>removeEntry(entry.id)}><Trash2 size={16}/></button>
    </div>)}
   </div>
   <div className="liquidity-entry-actions"><Button kind="ghost" icon={Plus} onClick={addEntry}>إضافة مبلغ</Button><Button icon={Save} disabled={busy||!configDraft} onClick={saveMonth}>{busy?'جارٍ الحفظ…':currentRecord?'حفظ تعديل الشهر':'حفظ سيولة الشهر'}</Button></div>
   {Object.keys(totalsByCurrency).length>0&&<div className="liquidity-currency-summary">{Object.entries(totalsByCurrency).map(([code,amount])=>{const currency=currencies.find(item=>item.code===code);return <span className="chip" key={code}>{num(amount)} {currency?.symbol||code} · {code}</span>})}</div>}
   {!online&&<p className="offline-note">بدون اتصال: تُحفظ التغييرات على هذا الجهاز وتُزامن عند عودة الشبكة.</p>}
   <ErrorBox>{error}</ErrorBox>{notice&&<div className="success">{notice}</div>}
  </section>
  <section className="kpi-grid liquidity-kpis">
   <div className="tile"><small>سيولة الشهر الحالي</small><strong className="num">{money(total)}</strong></div>
   <div className="tile"><small>الفرق عن الشهر السابق</small><strong className={`num ${change===null?'':change>=0?'pay':'debt'}`}>{change===null?'—':money(change)}</strong></div>
   <div className="tile"><small>نسبة التغيّر الشهري</small><strong className={`num ${percent===null?'':percent>=0?'pay':'debt'}`}>{percentLabel}</strong></div>
   <div className="tile"><small>التغيّر منذ أول تسجيل</small><strong className={`num ${sinceStart===null?'':sinceStart>=0?'pay':'debt'}`}>{sinceStart===null?'—':money(sinceStart)}</strong></div>
  </section>
  <section className="card liquidity-chart-card"><div className="section-heading padded"><div><h2><Coins size={17}/> تطوّر السيولة</h2><p className="tiny">الإجمالي بالدولار حسب سعر الصرف المحفوظ لكل شهر.</p></div></div><LiquidityChart rows={displayRows}/></section>
  {showRates&&<LiquidityRateSheet draft={configDraft} setDraft={setConfigDraft} onClose={()=>setShowRates(false)} onSave={saveRates} busy={rateBusy} onAddCurrency={addCurrency} newCurrency={newCurrency} setNewCurrency={setNewCurrency} error={error}/>}
 </div>
}
