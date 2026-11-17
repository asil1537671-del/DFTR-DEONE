import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {aggregate} from './logic';
import {enqueue,acknowledge,uuid} from './outbox';
const Context=createContext();
export async function api(path,options={}){const {timeoutMs=20000,...request}=options;let response;try{response=await fetch('/api'+path,{credentials:'same-origin',signal:AbortSignal.timeout(timeoutMs),...request,headers:{'Content-Type':'application/json',...request.headers},body:request.body===undefined?undefined:JSON.stringify(request.body)})}catch{const error=new Error('تعذّر الاتصال بالخادم. بيانات الجهاز المحفوظة لا تتأثر بهذا الخطأ.');error.network=true;throw error}let body;try{body=await response.json()}catch{body={}}if(!response.ok){const error=new Error(typeof body.detail==='string'?body.detail:'تعذّر تنفيذ الطلب');error.status=response.status;throw error}return body}
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
export function Provider({children}){
 const [user,setUser]=useState(null),[ready,setReady]=useState(false),[data,setData]=useState({clients:[],records:[],withdrawals:[],settings:null,liquidity:[],liquiditySettings:[]}),[online,setOnline]=useState(navigator.onLine),[queue,setQueue]=useState([]),[error,setError]=useState(''),[lastSync,setLastSync]=useState(''),[notice,setNotice]=useState('');
 const syncing=useRef(false),retryRequested=useRef(false),noticeTimer=useRef(null),key=user?'daftari:'+user.id:null,queueRef=useRef(queue),dataRef=useRef(data),userRef=useRef(user);queueRef.current=queue;dataRef.current=data;userRef.current=user;
 function notify(message){setNotice(message);clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),6500)}
 useEffect(()=>()=>clearTimeout(noticeTimer.current),[]);
 const persistQueue=next=>{if(key)try{localStorage.setItem(key+':queue',JSON.stringify(next))}catch{const error=new Error('تعذّر حفظ العملية على هذا الجهاز. لم تُرسل بعد؛ تحقق من مساحة التخزين ثم أعد المحاولة.');error.code='QUEUE_STORAGE';throw error}queueRef.current=next;setQueue(next)};
 const saveData=next=>{dataRef.current=next;setData(next);try{if(key)localStorage.setItem(key+':data',JSON.stringify(next))}catch{setError('تعذّر حفظ نسخة العرض على الجهاز — تأكد من مساحة التخزين. العمليات المنتظرة محفوظة بشكل مستقل.')}};
 useEffect(()=>{api('/auth/me').then(setUser).catch(e=>{if(!navigator.onLine||e.network||e.status>=500){const remembered=read('daftari:identity',null);if(remembered)setUser(remembered)}if(e.status!==401)setError(e.message)}).finally(()=>setReady(true));const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener('online',on);window.addEventListener('offline',off);return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[]);
 async function refresh(attempt=0){if(!user)return;try{const [clients,records,withdrawals,settings,liquidity,liquiditySettings]=await Promise.all(['clients','records','withdrawals','settings','liquidity','liquidity-settings'].map(x=>api('/'+x)));if(userRef.current?.id!==user.id)return;const next={clients,records,withdrawals,settings,liquidity,liquiditySettings};for(const q of queueRef.current){const rows=next[q.collection],idx=rows.findIndex(r=>r.id===q.id);const row={...(idx>=0?rows[idx]:{}),...q.body,id:q.id,_pending:true,_failed:!!q.failed};if(idx>=0)rows[idx]=row;else rows.push(row)}saveData(next)}catch(error){const retryable=error.network||!error.status||[408,425,429].includes(error.status)||error.status>=500;if(attempt<2&&retryable){await new Promise(resolve=>setTimeout(resolve,700*(attempt+1)));return refresh(attempt+1)}throw error}}
 useEffect(()=>{if(!user){setData({clients:[],records:[],withdrawals:[],settings:null,liquidity:[],liquiditySettings:[]});setQueue([]);return}localStorage.setItem('daftari:identity',JSON.stringify(user));setData({clients:[],records:[],withdrawals:[],settings:null,liquidity:[],liquiditySettings:[],...read(key+':data',{})});const q=read(key+':queue',[]);queueRef.current=q;setQueue(q);if(navigator.onLine)refresh().catch(e=>setError(e.message))},[user?.id]);
 async function sync(retry=false){
  if(!user||!navigator.onLine)return;
  if(syncing.current){if(retry)retryRequested.current=true;return}
  syncing.current=true;
  try{
   if(retry){persistQueue(queueRef.current.map(q=>({...q,failed:null})));setError('')}
   let refreshAfterSync=true;
   while(userRef.current?.id===user.id){
    const entry=queueRef.current.find(q=>!q.failed);
    if(!entry)break;
    try{
     await api('/'+entry.collection+(entry.method==='PUT'?'/'+entry.id:''),{method:entry.method,body:{...entry.body,id:entry.id}});
     if(userRef.current?.id!==user.id)return;
     persistQueue(acknowledge(queueRef.current,entry));
    }catch(e){
     if(userRef.current?.id!==user.id)return;
     if(e.code==='QUEUE_STORAGE'){setError(e.message);refreshAfterSync=false;break}
     if(e.status===401){
      persistQueue(queueRef.current.map(q=>({...q,failed:'انتهت الجلسة — أعد تسجيل الدخول ثم أعد المزامنة.'})));
      setError('انتهت الجلسة — بقيت العملية محفوظة على الجهاز. أعد تسجيل الدخول ثم اضغط «مزامنة الآن».');
      refreshAfterSync=false;break;
     }
     const retryable=!e.status||[408,425,429].includes(e.status)||e.status>=500;
     if(retryable){setError('تعذّر الاتصال بالخادم أو انتهت مهلة الرد. بقيت العملية محفوظة على الجهاز وستُعاد المحاولة تلقائيًا.');refreshAfterSync=false;break}
     persistQueue(queueRef.current.map(q=>q.op===entry.op?{...q,failed:e.message}:q));
     setError(e.message);
    }
   }
   if(refreshAfterSync){await refresh();if(userRef.current?.id===user.id){setLastSync(new Date().toLocaleString('ar'));if(queueRef.current.length===0)setError('')}}
  }catch(e){setError(e.message)}finally{
   syncing.current=false;
   if(retryRequested.current){retryRequested.current=false;queueMicrotask(()=>sync(true))}
  }
 }
 useEffect(()=>{if(online&&user)sync(true)},[online,user?.id]);
 useEffect(()=>{const timer=setInterval(()=>{if(queueRef.current.some(q=>!q.failed))sync()},15000);return()=>clearInterval(timer)},[user?.id]);
 async function mutate(collection,body,id){const method=id?'PUT':'POST',rowId=id||body.id||uuid();if(!['records','withdrawals','liquidity','liquidity-settings'].includes(collection)){const row=await api('/'+collection+(id?'/'+id:''),{method,body:{...body,id:rowId}});saveData({...dataRef.current,[collection]:id?dataRef.current[collection].map(r=>r.id===id?row:r):[...dataRef.current[collection],row]});return row}
  const entry={op:uuid(),id:rowId,collection,method,body:{...body,id:rowId},at:Date.now()},next=enqueue(queueRef.current,entry);persistQueue(next);const row={...body,id:rowId,_pending:true};saveData({...dataRef.current,[collection]:dataRef.current[collection].some(r=>r.id===rowId)?dataRef.current[collection].map(r=>r.id===rowId?row:r):[...dataRef.current[collection],row]});if(navigator.onLine)queueMicrotask(()=>sync());return row
 }
 async function remove(collection,id){if(queueRef.current.some(q=>q.collection===collection&&q.id===id))throw new Error('هذا العنصر محفوظ على جهازك ولم يُرسل بعد — انتظر المزامنة');await api('/'+collection+'/'+id,{method:'DELETE'});await refresh()}
 async function auth(mode,body){const u=await api('/auth/'+mode,{method:'POST',body});setUser(u);setError('')}
 async function logout(){if(queueRef.current.length&&!confirm('توجد عمليات محفوظة على الجهاز لم تُرسل بعد. تسجيل الخروج؟'))return;await api('/auth/logout',{method:'POST'});localStorage.removeItem('daftari:identity');setUser(null)}
 async function saveSettings(settings){const saved=await api('/settings',{method:'PUT',body:settings});saveData({...dataRef.current,settings:saved});return saved}
 return <Context.Provider value={{...data,user,ready,online,queue,error,setError,notice,notify,auth,logout,setUser,mutate,remove,refresh,sync,lastSync,saveSettings,totals:aggregate(data.records)}}>{children}</Context.Provider>
}
export const useApp=()=>useContext(Context);
