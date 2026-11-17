import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {LogOut,ShieldCheck} from 'lucide-react';
import {Provider,useApp} from './store';
import {Landing} from './auth';
import {AdminPage} from './admin';
import {Busy,Button} from './ui';
import './style.css';

function AccessDenied(){
 const {logout}=useApp();
 return <main className="control-denied" dir="rtl"><ShieldCheck size={28}/><h1>لوحة المالك</h1><p>هذا الحساب غير مخوّل لفتح لوحة الإدارة.</p><Button kind="ghost" icon={LogOut} onClick={logout}>تسجيل الخروج</Button></main>;
}

function ControlApp(){
 const {ready,user,logout}=useApp();
 useEffect(()=>{document.documentElement.dataset.theme=localStorage.getItem('daftari:theme')==='dark'?'dark':'light'},[]);
 if(!ready)return <Busy/>;
 if(!user)return <Landing/>;
 if(!user.isAdmin)return <AccessDenied/>;
 return <div className="control-shell" dir="rtl"><header className="control-header"><div className="control-brand"><span className="brand-mark">د</span><div><b>لوحة إدارة دفتري</b><small>رابط مستقل لإدارة حسابات التطبيق</small></div></div><Button kind="ghost" icon={LogOut} onClick={logout}>تسجيل الخروج</Button></header><main className="control-content"><AdminPage/></main></div>;
}

createRoot(document.getElementById('root')).render(<Provider><BrowserRouter><ControlApp/></BrowserRouter></Provider>);
