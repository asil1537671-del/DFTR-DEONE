import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,Coins,FileText,Image as ImageIcon,Pencil,Plus,Save,Settings,Share2,Trash2} from 'lucide-react';
import {useApp} from './store';
import {Button,Confirm,ErrorBox,Field,Sheet} from './ui';
import {money,num,round,today} from './logic';

const makeId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clone=value=>JSON.parse(JSON.stringify(value));
const newEntry=(currency='USD')=>({id:makeId(),description:'',currency,amount:'',direction:'ours'});

function monthBefore(value){
 if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value))return '';
 const [year,month]=value.split('-').map(Number);
 return month===1?`${year-1}-12`:`${year}-${String(month-1).padStart(2,'0')}`;
}

function monthName(value){
 const [year,month]=value.split('-').map(Number);
 return new Intl.DateTimeFormat('ar',{month:'short',year:'numeric'}).format(new Date(year,month-1,1));
}

function isDailyPeriod(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));}

function periodName(value){
 if(!isDailyPeriod(value))return monthName(value);
 const [year,month,day]=value.split('-').map(Number);
 return new Intl.DateTimeFormat('ar',{day:'numeric',month:'long',year:'numeric'}).format(new Date(year,month-1,day));
}

function periodNoun(value){return isDailyPeriod(value)?'اليوم':'الشهر';}

function previousRecord(rows,record){
 if(!record)return null;
 if(isDailyPeriod(record.month))return [...rows].filter(row=>isDailyPeriod(row.month)&&row.month<record.month).sort((a,b)=>b.month.localeCompare(a.month))[0]||null;
 return rows.find(row=>row.month===monthBefore(record.month))||null;
}

function currencyMark(currency){
 const marks={USD:'🇺🇸 $',SAR:'🇸🇦 ر.س',YER:'🇾🇪 ر.ي',USDT:'₮'};
 return marks[currency.code]||currency.symbol||currency.code;
}

function signedAmount(entry){
 const amount=Number(entry.amount)||0;
 return entry.direction==='owed'?-amount:amount;
}

function signedMoney(value,symbol='$'){
 const amount=Number(value)||0,prefix=amount>0?'+':amount<0?'−':'';
 return `${prefix}${num(Math.abs(amount))} ${symbol}`;
}

function changePercent(change,previous){
 return change!==null&&previous!==0?round(change/Math.abs(previous)*100,2):null;
}

function monthTotal(record){
 if(!record)return 0;
 return round((record.entries||[]).reduce((total,entry)=>{
  const amount=Number(entry.amount)||0,rate=Number(record.rates?.[entry.currency]);
  return total+(rate>0?signedAmount(entry)/rate:0);
 },0));
}

function draftTotal(entries,rates){
 return round(entries.reduce((total,entry)=>{
  const amount=Number(entry.amount)||0,rate=Number(rates?.[entry.currency]);
  return total+(rate>0?signedAmount(entry)/rate:0);
 },0));
}

function downloadBlob(blob,filename){
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function roundRect(context,x,y,width,height,radius,fill){
 context.beginPath();context.roundRect(x,y,width,height,radius);context.fillStyle=fill;context.fill();
}

function wrapCanvasText(context,value,maxWidth,maxLines=2){
 const words=String(value||'').split(/\s+/),lines=[];let line='';
 for(const word of words){const next=line?`${line} ${word}`:word;if(line&&context.measureText(next).width>maxWidth){lines.push(line);line=word;if(lines.length===maxLines-1)break}else line=next}
 if(line&&lines.length<maxLines)lines.push(line);
 return lines;
}

async function liquidityImage(record,change,percent){
 if(document.fonts?.ready)await document.fonts.ready;
 const entries=record.entries||[],width=1200,rowHeight=112,height=Math.max(780,740+entries.length*rowHeight);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');if(!context)throw new Error('تعذّر إنشاء الصورة على هذا الجهاز');
 context.fillStyle='#f4f1e9';context.fillRect(0,0,width,height);
 roundRect(context,42,38,width-84,height-76,30,'#fffdf8');
 const gradient=context.createLinearGradient(width,40,0,360);gradient.addColorStop(0,'#0a7977');gradient.addColorStop(1,'#16aaa4');
 roundRect(context,42,38,width-84,320,30,gradient);
 const text=(value,x,y,font,color,align='right',direction='rtl')=>{context.direction=direction;context.textAlign=align;context.font=font;context.fillStyle=color;context.fillText(String(value),x,y)};
 const right=width-92;
 text('دفتري · السيولة',right,100,'600 27px Tajawal, sans-serif','#d8fffb');
 text('ملخص السيولة',right,162,'700 39px Tajawal, sans-serif','#ffffff');
 text(`${isDailyPeriod(record.month)?'التاريخ':'الشهر'}: ${periodName(record.month)}`,right,212,'500 25px Tajawal, sans-serif','#e5fffd');
 text('صافي السيولة بالدولار',right,284,'500 22px Tajawal, sans-serif','#d8fffb');
 text(signedMoney(monthTotal(record)),112,300,'700 43px Tajawal, sans-serif','#ffffff','left','ltr');
 const tableTop=394;
 text('تفاصيل الأرصدة',right,tableTop,'700 27px Tajawal, sans-serif','#164b47');
 entries.forEach((entry,index)=>{
  const top=tableTop+28+index*rowHeight;
  roundRect(context,70,top,width-140,rowHeight-12,18,index%2?'#f7faf7':'#f0f6f3');
  const currency=entry.currency||'USD',symbol=entry.currencySymbol||currency,amount=Number(entry.amount)||0,rate=Number(record.rates?.[currency])||1;
  const description=entry.description||'بدون وصف';
  context.direction='rtl';context.textAlign='right';context.font='700 25px Tajawal, sans-serif';context.fillStyle='#152a25';
  wrapCanvasText(context,description,590,2).forEach((line,lineIndex)=>context.fillText(line,right-12,top+38+lineIndex*31));
  const sign=entry.direction==='owed'?-1:1,directionLabel=sign<0?'علينا (−)':'لنا (+)';
  text(`${directionLabel} · ${entry.currencyName||currency} · ${currency}`,right-12,top+80,'500 17px Tajawal, sans-serif','#62756f');
  text(signedMoney(sign*amount,symbol),128,top+47,'700 24px Tajawal, sans-serif','#164b47','left','ltr');
  text(`≈ ${signedMoney(sign*amount/rate,'$')}`,128,top+78,'500 17px Tajawal, sans-serif','#62756f','left','ltr');
 });
 const summaryTop=tableTop+36+entries.length*rowHeight;
 roundRect(context,70,summaryTop,width-140,112,18,'#e5f5f2');
 text(isDailyPeriod(record.month)?'مقارنة باليوم السابق':'مقارنة بالشهر السابق',right-14,summaryTop+40,'600 21px Tajawal, sans-serif','#315e60');
 const changeLabel=change===null?'لا يوجد سجل سابق':`${change>0?'+':''}${money(change)}`;
 text(changeLabel,right-14,summaryTop+78,'700 25px Tajawal, sans-serif','#0a7977');
 text(percent===null?'—':`${percent>0?'+':''}${num(percent)}٪`,128,summaryTop+65,'700 25px Tajawal, sans-serif','#0a7977','left','ltr');
 text(`أسعار الصرف محفوظة مع سجل ${periodNoun(record.month)}`,right,summaryTop+160,'500 16px Tajawal, sans-serif','#62756f');
 return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('تعذّر تجهيز صورة التقرير')),'image/png'));
}

function LiquidityChart({rows,daily}){
 if(!rows.length)return <p className="report-empty">سجّل رصيدًا {daily?'يوميًا':'شهريًا'} لعرض تطوّر السيولة.</p>;
 const width=720,height=230,padX=28,top=20,bottom=42;
 let min=Math.min(0,...rows.flatMap(row=>[row.total,row.open??row.total])),max=Math.max(0,...rows.flatMap(row=>[row.total,row.open??row.total]));
 if(min===max){min=-1;max=1}
 const plotHeight=height-top-bottom,valueY=value=>top+(max-value)/(max-min)*plotHeight;
 const points=rows.map((row,index)=>({
  ...row,
  x:rows.length===1?width/2:padX+index*(width-padX*2)/(rows.length-1),
  openY:row.open===null||row.open===undefined?null:valueY(row.open),
  closeY:valueY(row.total),
 }));
 const gridValues=[max,(max+min)/2,min,0].filter((value,index,all)=>all.indexOf(value)===index);
 const periodLabel=value=>daily?new Intl.DateTimeFormat('ar',{day:'numeric',month:'short'}).format(new Date(Number(value.slice(0,4)),Number(value.slice(5,7))-1,Number(value.slice(8,10)))):new Intl.DateTimeFormat('ar',{month:'short'}).format(new Date(Number(value.slice(0,4)),Number(value.slice(5,7))-1,1));
 const candleWidth=Math.max(10,Math.min(24,(width-padX*2)/Math.max(points.length,1)*.42));
 return <div className="liquidity-chart-wrap">
  <svg className="liquidity-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`مخطط الشموع اليابانية لتطور صافي السيولة بالدولار ${daily?'يوميًا':'شهريًا'}`}>
   {gridValues.map(value=><line key={value} x1={padX} x2={width-padX} y1={valueY(value)} y2={valueY(value)} className={value===0?'liquidity-grid-line liquidity-chart-zero':'liquidity-grid-line'}/>)}
   {points.map((point,index)=>{
    const showLabel=points.length<=8||index%2===0||index===points.length-1;
    const difference=point.open===null||point.open===undefined?null:point.total-point.open;
    const trend=difference===null?'origin':difference>0?'up':difference<0?'down':'flat';
    const rawHeight=difference===null?0:Math.abs(point.closeY-point.openY);
    const bodyHeight=difference===null?0:Math.max(4,rawHeight);
    const bodyY=difference===null?point.closeY:Math.min(point.closeY,point.openY)-Math.max(0,(4-rawHeight)/2);
    const title=difference===null?`${periodName(point.month)} · أول رصيد مسجل: ${signedMoney(point.total)}`:`${periodName(point.month)} · الافتتاح ${signedMoney(point.open)} · الإغلاق ${signedMoney(point.total)} · التغيّر ${signedMoney(difference)}`;
    return <g key={point.month}><title>{title}</title>{trend==='origin'?<circle cx={point.x} cy={point.closeY} r="5" className="liquidity-candle-origin"/>:<rect x={point.x-candleWidth/2} y={bodyY} width={candleWidth} height={bodyHeight} rx="2" className={`liquidity-candle ${trend}`}/>}{showLabel&&<text x={point.x} y={height-12} textAnchor="middle" className="liquidity-chart-label"><title>{periodName(point.month)}</title>{periodLabel(point.month)}</text>}</g>
   })}
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
    <p className="tiny">الأسعار التي تحفظها هنا لا تغيّر الأسعار الرئيسية. وكل سجل يومي أو شهري يحتفظ بسعره كما كان عند تسجيله.</p>
   </section>
   <ErrorBox>{error}</ErrorBox>
  </div>
 </Sheet>
}

export function LiquidityPage(){
 const {settings,liquidity=[],liquiditySettings=[],mutate,remove,online}=useApp();
 const config=liquiditySettings.find(row=>row.id==='main');
 const [configDraft,setConfigDraft]=useState(null),[periodType,setPeriodType]=useState('monthly'),[month,setMonth]=useState(today().slice(0,7)),[day,setDay]=useState(today());
 const [entries,setEntries]=useState([newEntry()]),[showRates,setShowRates]=useState(false),[showEntry,setShowEntry]=useState(false),[detailRecord,setDetailRecord]=useState(null);
 const [recordToDelete,setRecordToDelete]=useState(null);
 const [newCurrency,setNewCurrency]=useState({code:'',name:'',symbol:'',rate:''});
 const [busy,setBusy]=useState(false),[rateBusy,setRateBusy]=useState(false),[exportBusy,setExportBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[exportError,setExportError]=useState(''),[exportNotice,setExportNotice]=useState('');
 const initialized=useRef(false);
 const amountRefs=useRef([]);
 const daily=periodType==='daily',period=daily?day:month;
 const currentRecord=liquidity.find(row=>row.month===period);

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
 },[period,currentRecord?.id,currentRecord?.updatedAt]);

 const currencies=configDraft?.currencies||[];
 const rates={...(configDraft?.rates||{}),...(currentRecord?.rates||{})};
 const total=monthTotal(currentRecord),draftAmount=draftTotal(entries,rates);
 const hasCurrentBalance=!!currentRecord;
 const priorRecord=previousRecord(liquidity,currentRecord),priorTotal=monthTotal(priorRecord);
 const change=hasCurrentBalance&&priorRecord?round(total-priorTotal):null;
 const percent=changePercent(change,priorTotal);
 const displayRows=useMemo(()=>{const snapshots=liquidity.filter(row=>isDailyPeriod(row.month)===daily).sort((a,b)=>a.month.localeCompare(b.month)).map(row=>({month:row.month,total:monthTotal(row)})),start=Math.max(0,snapshots.length-(daily?30:12));return snapshots.slice(start).map((row,index)=>({...row,open:snapshots[start+index-1]?.total??null}))},[liquidity,daily]);
 const periodRecords=liquidity.filter(row=>isDailyPeriod(row.month)===daily&&row.month<=period).sort((a,b)=>a.month.localeCompare(b.month));
 const firstRecord=periodRecords[0];
 const sinceStart=hasCurrentBalance&&firstRecord?round(total-monthTotal(firstRecord)):null;
 const totalsByCurrency=(currentRecord?.entries||[]).reduce((result,entry)=>{
  if(Number(entry.amount)>0)result[entry.currency]=(result[entry.currency]||0)+signedAmount(entry);
  return result;
 },{});

 function updateEntry(id,key,value){setEntries(current=>current.map(entry=>entry.id===id?{...entry,[key]:value}:entry));setNotice('');}
 function focusAmount(index){setTimeout(()=>{const input=amountRefs.current[index];if(!input)return;input.focus({preventScroll:true});input.scrollIntoView({behavior:'smooth',block:'center'});},40);}
 function appendEntry(currency=currencies[0]?.code||'USD'){const index=entries.length;setEntries(current=>[...current,newEntry(currency)]);focusAmount(index);}
 function addEntry(){appendEntry();}
 function advanceAmount(entry,index){if(index<entries.length-1){focusAmount(index+1);return}if(Number(entry.amount)>0)appendEntry(entry.currency);}
 function removeEntry(id){setEntries(current=>current.length===1?[newEntry(currencies[0]?.code||'USD')]:current.filter(entry=>entry.id!==id));}

 async function savePeriod(){
  setError('');setNotice('');
  if(entries.some(entry=>entry.amount!==''&&(!Number.isFinite(Number(entry.amount))||Number(entry.amount)<0))){setError('أدخل مبالغ صحيحة غير سالبة');return}
  const cleanEntries=entries.filter(entry=>Number(entry.amount)>0).map(entry=>{
   const currency=currencies.find(item=>item.code===entry.currency);
   return {...entry,description:String(entry.description||'').trim(),currencyName:currency?.name||entry.currency,currencySymbol:currency?.symbol||entry.currency,amount:Number(entry.amount),direction:entry.direction==='owed'?'owed':'ours'};
  });
  if(!cleanEntries.length){setError('أدخل مبلغًا واحدًا على الأقل');return}
  const usedCurrencies=[...new Set(cleanEntries.map(entry=>entry.currency))];
  if(usedCurrencies.some(code=>!(Number(rates[code])>0))){setError('أدخل سعر صرف صحيحًا لكل عملة مستخدمة');setShowRates(true);return}
  setBusy(true);
  try{
   const currentConfig={id:'main',currencies,rates:Object.fromEntries(currencies.map(currency=>[currency.code,currency.code==='USD'?1:Number(configDraft?.rates?.[currency.code])]))};
   if(!config||JSON.stringify(currentConfig)!==JSON.stringify({id:'main',currencies:config.currencies,rates:config.rates}))await mutate('liquidity-settings',currentConfig,config?.id);
   await mutate('liquidity',{id:period,month:period,entries:cleanEntries,rates:clone(rates)},currentRecord?.id);
   setNotice(online?`تم حفظ سيولة ${daily?'اليوم':'الشهر'}.`:`حُفظت السيولة على هذا الجهاز وستُزامن عند عودة الشبكة.`);setShowEntry(false);
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

 async function downloadPdf(record){
  setExportBusy(true);setExportError('');setExportNotice('');
  try{
   const response=await fetch(`/api/liquidity/${record.month}/pdf`,{credentials:'same-origin'});
   if(!response.ok){let message='تعذّر إنشاء ملف PDF';try{const body=await response.json();message=body.detail||message}catch{}throw new Error(message)}
   downloadBlob(await response.blob(),`السيولة-${record.month}.pdf`);
  }catch(reason){setExportError(reason.message)}finally{setExportBusy(false)}
 }

 async function downloadImage(record){
  setExportBusy(true);setExportError('');setExportNotice('');
  try{
   const previous=previousRecord(liquidity,record),delta=previous?round(monthTotal(record)-monthTotal(previous)):null;
   const percent=previous?changePercent(delta,monthTotal(previous)):null;
   downloadBlob(await liquidityImage(record,delta,percent),`السيولة-${record.month}.png`);
  }catch(reason){setExportError(reason.message)}finally{setExportBusy(false)}
 }

 async function shareImage(record){
  setExportBusy(true);setExportError('');setExportNotice('');
  try{
   const previous=previousRecord(liquidity,record),delta=previous?round(monthTotal(record)-monthTotal(previous)):null;
   const percent=previous?changePercent(delta,monthTotal(previous)):null;
   const blob=await liquidityImage(record,delta,percent),filename=`السيولة-${record.month}.png`;
   const file=typeof File==='undefined'?null:new File([blob],filename,{type:'image/png'});
   if(file&&navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({files:[file],title:`ملخص السيولة · ${periodName(record.month)}`,text:`ملخص السيولة ${isDailyPeriod(record.month)?'اليومي':'الشهري'}`});
   }else{
    downloadBlob(blob,filename);setExportNotice('المشاركة المباشرة غير متاحة في هذا المتصفح؛ نزّلت الصورة لتشاركها من جهازك.');
   }
  }catch(reason){if(reason.name!=='AbortError')setExportError(reason.message)}finally{setExportBusy(false)}
 }

 function editRecord(record){const isDaily=isDailyPeriod(record.month);setPeriodType(isDaily?'daily':'monthly');if(isDaily)setDay(record.month);else setMonth(record.month);setDetailRecord(null);setShowEntry(true);}

 const percentLabel=percent===null?'—':`${percent>0?'+':''}${num(percent)}٪`;
 const history=[...liquidity].sort((a,b)=>b.month.localeCompare(a.month));
 const detailPrevious=detailRecord&&previousRecord(liquidity,detailRecord);
 const detailChange=detailRecord&&detailPrevious?round(monthTotal(detailRecord)-monthTotal(detailPrevious)):null;
 const detailPercent=detailChange!==null?changePercent(detailChange,monthTotal(detailPrevious)):null;
 return <div className="stack liquidity-page">
  <section className="hero liquidity-hero">
   <div className="between items-start"><div><p className="hero-label">ملخص السيولة · {periodName(period)}</p><p className="hero-caption">رصيدك المستقل عن الديون والسحوبات.</p></div><button className="hero-icon liquidity-rate-trigger" type="button" aria-label="أسعار صرف السيولة" title="أسعار صرف السيولة" disabled={!configDraft} onClick={()=>{setError('');setShowRates(true)}}><Settings size={22}/></button></div>
   <div className="liquidity-hero-main"><div><small>صافي {daily?'اليوم':'الشهر'} المحوّل إلى الدولار</small><div className="hero-amount num">{signedMoney(total)}</div></div><div className="liquidity-hero-action"><span className="chip">{num(currentRecord?.entries?.length||0)} مبلغ مسجّل</span><Button kind="white" icon={Plus} disabled={!configDraft} onClick={()=>{setError('');setShowEntry(true)}}>إضافة</Button></div></div>
   {Object.keys(totalsByCurrency).length>0?<div className="liquidity-currency-summary">{Object.entries(totalsByCurrency).map(([code,amount])=>{const entry=currentRecord.entries.find(item=>item.currency===code),currency=currencies.find(item=>item.code===code);return <span className="chip" key={code}>{signedMoney(amount,entry?.currencySymbol||currency?.symbol||code)} · {code}</span>})}</div>:<p className="liquidity-empty-summary">لا توجد مبالغ مسجلة لهذا {daily?'اليوم':'الشهر'} بعد.</p>}
  </section>
  <div className="liquidity-period-control">
   <div className="segments liquidity-period-switch" role="group" aria-label="فترة تسجيل السيولة"><button type="button" className={daily?'selected':''} aria-pressed={daily} onClick={()=>{setPeriodType('daily');setNotice('')}}>يومي</button><button type="button" className={!daily?'selected':''} aria-pressed={!daily} onClick={()=>{setPeriodType('monthly');setNotice('')}}>شهري</button></div>
   <Field label={daily?'اليوم المعروض':'الشهر المعروض'} type={daily?'date':'month'} value={daily?day:month} onChange={event=>{if(event.target.value){if(daily)setDay(event.target.value);else setMonth(event.target.value);setNotice('')}}}/>
  </div>
  {notice&&<div className="success">{notice}</div>}
  <section className="kpi-grid liquidity-kpis">
   <div className="tile"><small>الفرق عن {daily?'آخر يوم مسجل':'الشهر السابق'}</small><strong className={`num ${change===null?'':change>=0?'pay':'debt'}`}>{change===null?'—':signedMoney(change)}</strong></div>
   <div className="tile"><small>نسبة التغيّر {daily?'اليومي':'الشهري'}</small><strong className={`num ${percent===null?'':percent>=0?'pay':'debt'}`}>{percentLabel}</strong></div>
   <div className="tile"><small>التغيّر منذ أول تسجيل</small><strong className={`num ${sinceStart===null?'':sinceStart>=0?'pay':'debt'}`}>{sinceStart===null?'—':signedMoney(sinceStart)}</strong></div>
  </section>
  <section className="card liquidity-chart-card"><div className="section-heading padded"><div><h2><Coins size={17}/> تطوّر صافي السيولة {daily?'اليومي':'الشهري'}</h2><p className="tiny">الشمعة تقارن الرصيد بآخر سجل محفوظ: الأخضر ارتفاع والأحمر انخفاض. لا تظهر ظلال داخل {daily?'اليوم':'الشهر'} لعدم تسجيل أعلى وأدنى رصيد.</p></div></div><LiquidityChart rows={displayRows} daily={daily}/></section>
  <section className="card liquidity-history-card">
   <div className="section-heading padded"><div><h2>سجل السيولة</h2><p className="tiny">افتح سجل أي يوم أو شهر لعرض مبالغه وتنزيله أو مشاركته.</p></div></div>
   {history.length?<div className="record-list">{history.map(record=><div className="liquidity-history-item" key={record.id}><button type="button" className="record-row liquidity-history-row" onClick={()=>{setDetailRecord(record);setExportError('');setExportNotice('')}}><span className="soft-icon"><Coins size={19}/></span><div className="grow min-zero text-right"><b>سيولة {periodName(record.month)}</b><small>{num(record.entries?.length||0)} مبلغ · {isDailyPeriod(record.month)?'يومي':'شهري'} · {record._pending?'بانتظار المزامنة':'اضغط لعرض التفاصيل'}</small></div><div className="left nowrap"><b>{signedMoney(monthTotal(record))}</b><small>الصافي بالدولار</small></div><ChevronLeft size={16}/></button><button type="button" className="icon liquidity-history-delete" aria-label={`حذف سجل سيولة ${periodName(record.month)}`} title={record._pending?'لا يمكن حذف سجل بانتظار المزامنة':!online?'الحذف يتطلب اتصالًا بالإنترنت':`حذف سجل ${periodName(record.month)}`} disabled={!online||record._pending} onClick={()=>setRecordToDelete(record)}><Trash2 size={17}/></button></div>)}</div>:<p className="report-empty">لا توجد سجلات بعد. اضغط «إضافة» لتسجيل السيولة.</p>}
  </section>
  {showEntry&&<Sheet title={currentRecord?`تعديل سيولة ${daily?'اليوم':'الشهر'}`:`إضافة سيولة ${daily?'اليوم':'الشهر'}`} subtitle={periodName(period)} wide onClose={()=>setShowEntry(false)} footer={<><Button icon={Save} disabled={busy||!configDraft} onClick={savePeriod}>{busy?'جارٍ الحفظ…':currentRecord?`حفظ تعديل ${daily?'اليوم':'الشهر'}`:`حفظ سيولة ${daily?'اليوم':'الشهر'}`}</Button><Button kind="ghost" onClick={()=>setShowEntry(false)}>إلغاء</Button></>}>
   <div className="stack">
    <div className="liquidity-month-total"><small>صافي المبالغ بالدولار</small><strong>{signedMoney(draftAmount)}</strong></div>
    <p className="tiny">أدخل المبلغ بدون إشارة، ثم اختر هل هو لنا أم علينا. الوصف اختياري، ويمكن تكرار العملة لأكثر من حساب أو مكان. اضغط Enter أو «التالي» للانتقال إلى المبلغ التالي وإظهاره تلقائيًا.</p>
    <div className="liquidity-entry-list">
     <div className="liquidity-entry-labels"><span>المبلغ الموجود</span><span>العملة</span><span>الوصف / الجهة</span><span/></div>
     {entries.map((entry,index)=><div className="liquidity-entry" key={entry.id}>
      <Field label="المبلغ الموجود"><input ref={element=>amountRefs.current[index]=element} className="field num" aria-label={`المبلغ الموجود ${index+1}`} type="number" min="0" step="any" inputMode="decimal" enterKeyHint="next" placeholder="0" value={entry.amount} onChange={event=>updateEntry(entry.id,'amount',event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();advanceAmount(entry,index);}}}/></Field>
      <Field label="العملة"><select className="field liquidity-currency-select" value={entry.currency} aria-label={`العملة ${currencies.find(currency=>currency.code===entry.currency)?.name||entry.currency}`} title={currencies.find(currency=>currency.code===entry.currency)?.name||entry.currency} onChange={event=>updateEntry(entry.id,'currency',event.target.value)}>{currencies.map(currency=><option key={currency.code} value={currency.code}>{currencyMark(currency)}</option>)}</select></Field>
      <div className="liquidity-entry-meta"><Field label="وصف الرصيد (اختياري)" value={entry.description} placeholder="جيب كريمي، حساب البنك…" onChange={event=>updateEntry(entry.id,'description',event.target.value)}/><div className="liquidity-entry-direction" role="group" aria-label="جهة المبلغ"><button type="button" className={`liquidity-direction-option ${entry.direction!=='owed'?'selected':''}`} aria-pressed={entry.direction!=='owed'} onClick={()=>updateEntry(entry.id,'direction','ours')}>لنا (+)</button><button type="button" className={`liquidity-direction-option ${entry.direction==='owed'?'selected owed':''}`} aria-pressed={entry.direction==='owed'} onClick={()=>updateEntry(entry.id,'direction','owed')}>علينا (−)</button></div></div>
      <button className="icon liquidity-remove" aria-label="حذف المبلغ" onClick={()=>removeEntry(entry.id)}><Trash2 size={16}/></button>
     </div>)}
    </div>
    <Button kind="ghost" icon={Plus} onClick={addEntry}>إضافة مبلغ</Button>
    {!online&&<p className="offline-note">بدون اتصال: تُحفظ التغييرات على هذا الجهاز وتُزامن عند عودة الشبكة.</p>}
    <ErrorBox>{error}</ErrorBox>
   </div>
  </Sheet>}
  {detailRecord&&<Sheet title="تفاصيل السيولة" subtitle={periodName(detailRecord.month)} wide onClose={()=>setDetailRecord(null)} footer={<Button kind="ghost" onClick={()=>setDetailRecord(null)}>إغلاق</Button>}>
   <div className="stack">
    <div className="liquidity-detail-total"><small>صافي السيولة بالدولار</small><strong>{signedMoney(monthTotal(detailRecord))}</strong><div className="between"><span>الفرق عن {isDailyPeriod(detailRecord.month)?'آخر يوم مسجل':'الشهر السابق'}</span><b className={detailChange===null?'':detailChange>=0?'pay':'debt'}>{detailChange===null?'—':signedMoney(detailChange)}</b></div><div className="between"><span>نسبة التغيّر {isDailyPeriod(detailRecord.month)?'اليومي':'الشهري'}</span><b>{detailPercent===null?'—':`${detailPercent>0?'+':''}${num(detailPercent)}٪`}</b></div></div>
    <h3>المبالغ المسجلة ({detailRecord.entries?.length||0})</h3>
    <div className="liquidity-detail-list">{(detailRecord.entries||[]).map(entry=>{const rate=Number(detailRecord.rates?.[entry.currency])||1,amount=signedAmount(entry),direction=entry.direction==='owed'?'علينا (−)':'لنا (+)';return <div className="liquidity-detail-row" key={entry.id}><div className="grow min-zero"><b>{entry.description||'بدون وصف'}</b><small><span className={`liquidity-side-badge ${entry.direction==='owed'?'owed':''}`}>{direction}</span> · {entry.currencyName||entry.currency} · {entry.currency}</small><small>سعر الصرف: 1 USD = {num(rate)} {entry.currency}</small></div><div className="left nowrap"><b>{signedMoney(amount,entry.currencySymbol||entry.currency)}</b><small>≈ {signedMoney(amount/rate)}</small></div></div>})}</div>
    <div className="liquidity-export-actions"><Button kind="ghost" icon={FileText} disabled={!online||!!detailRecord._pending||exportBusy} onClick={()=>downloadPdf(detailRecord)}>{exportBusy?'جارٍ التجهيز…':'تنزيل PDF'}</Button><Button kind="ghost" icon={ImageIcon} disabled={exportBusy} onClick={()=>downloadImage(detailRecord)}>تنزيل صورة PNG</Button><Button icon={Share2} disabled={exportBusy} onClick={()=>shareImage(detailRecord)}>مشاركة</Button><Button kind="ghost" icon={Pencil} onClick={()=>editRecord(detailRecord)}>تعديل {isDailyPeriod(detailRecord.month)?'اليوم':'الشهر'}</Button></div>
    {(!online||detailRecord._pending)&&<p className="tiny">تنزيل PDF يتطلب اتصالًا ومزامنة السجل. يمكنك تنزيل الصورة ومشاركتها من بيانات هذا الجهاز.</p>}
    <ErrorBox>{exportError}</ErrorBox>{exportNotice&&<p className="tiny">{exportNotice}</p>}
   </div>
  </Sheet>}
   {recordToDelete&&<Confirm title={`حذف سجل سيولة ${periodName(recordToDelete.month)}`} onClose={()=>setRecordToDelete(null)} onConfirm={async()=>{await remove('liquidity',recordToDelete.id);if(detailRecord?.id===recordToDelete.id)setDetailRecord(null)}}><p>سيُحذف سجل هذه الفترة وجميع مبالغه نهائيًا، وسيُعاد حساب مخطط السيولة. لا يمكن التراجع عن الحذف.</p></Confirm>}
  {showRates&&<LiquidityRateSheet draft={configDraft} setDraft={setConfigDraft} onClose={()=>setShowRates(false)} onSave={saveRates} busy={rateBusy} onAddCurrency={addCurrency} newCurrency={newCurrency} setNewCurrency={setNewCurrency} error={error}/>}
 </div>
}
