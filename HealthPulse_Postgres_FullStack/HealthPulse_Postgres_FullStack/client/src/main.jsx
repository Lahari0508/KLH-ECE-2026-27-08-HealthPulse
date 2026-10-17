import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Activity, HeartPulse, Droplets, Thermometer, Wind, Bell, LayoutDashboard,
  Users, Radio, Clock3, ShieldCheck, LogOut, Menu, X, RefreshCw, Database,
  Wifi, WifiOff, ChevronRight, CircleAlert, CheckCircle2, Heart, Plus, Server
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area
} from "recharts";
import { API_BASE, api } from "./api";
import "./style.css";

const socket = io(API_BASE, { autoConnect: true, reconnectionAttempts: 10 });
const navItems = [
  {id:"overview",label:"Overview",icon:LayoutDashboard},
  {id:"patients",label:"Patients",icon:Users},
  {id:"sensors",label:"Sensors",icon:Radio},
  {id:"alerts",label:"Alerts",icon:Bell},
  {id:"history",label:"History",icon:Clock3}
];

function fmtTime(value) {
  if (!value) return "--:--:--";
  return new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
function vitalStatus(key,value) {
  if (key==="heart_rate") return value>100 || value<55 ? "Attention" : "Normal";
  if (key==="spo2") return value<94 ? "Attention" : "Normal";
  if (key==="temperature") return value>38 ? "Attention" : "Normal";
  if (key==="respiratory_rate") return value>24 || value<10 ? "Attention" : "Normal";
  return "Normal";
}
function AuthScreen({onAuth}) {
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const result=await api(`/api/auth/${mode}`,{
        method:"POST",body:JSON.stringify({fullName:name,email,password})
      });
      onAuth(result.user,result.token);
    } catch(err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-shell">
    <div className="auth-visual">
      <div className="brand"><span className="brand-mark"><HeartPulse size={24}/></span><span>Health<span className="accent">Pulse</span></span></div>
      <div className="visual-copy">
        <div className="eyebrow"><span className="pulse-dot"/> REMOTE PATIENT MONITORING</div>
        <h1>Care that keeps<br/><span>moving forward.</span></h1>
        <p>A clear, real-time view of patient telemetry, sensor status and vital trends in one connected workspace.</p>
        <div className="mini-ecg"><Activity size={18}/><div className="ecg-line"/></div>
        <div className="auth-stats"><div><strong>24/7</strong><small>Visibility</small></div><div><strong>Live</strong><small>Telemetry</small></div><div><strong>Secure</strong><small>Demo access</small></div></div>
      </div>
      <div className="visual-foot">HEALTHPULSE · FULL-STACK PROJECT</div>
    </div>
    <div className="auth-form-side">
      <div className="auth-top"><span>Welcome to HealthPulse</span><span className="secure"><ShieldCheck size={15}/> Demo portal</span></div>
      <form className="auth-form" onSubmit={submit}>
        <div className="form-symbol"><HeartPulse size={24}/></div>
        <h2>{mode==="login"?"Welcome back":"Create your account"}</h2>
        <p>{mode==="login"?"Sign in to view your telemetry dashboard.":"Register to access the project dashboard."}</p>
        {mode==="register" && <label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required/></label>}
        <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required/></label>
        {error && <div className="error-msg"><CircleAlert size={16}/>{error}</div>}
        <button className="primary-btn full" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in to dashboard":"Create account"}<ChevronRight size={17}/></button>
        <div className="switch-auth">{mode==="login"?"New to HealthPulse?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setError("")}}>{mode==="login"?"Create account":"Sign in"}</button></div>
      </form>
      <div className="auth-disclaimer">Academic prototype · Simulated readings are for demonstration only.</div>
    </div>
  </div>;
}

function App() {
  const [user,setUser]=useState(null);
  const [token,setToken]=useState("");
  const [section,setSection]=useState("overview");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [patients,setPatients]=useState([]);
  const [sensors,setSensors]=useState([]);
  const [history,setHistory]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [latest,setLatest]=useState(null);
  const [dbStatus,setDbStatus]=useState("checking");
  const [lastUpdated,setLastUpdated]=useState(new Date());
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState("");
  const [sensorModal,setSensorModal]=useState(false);
  const [sensorForm,setSensorForm]=useState({sensor_code:"",sensor_type:"",unit:"",status:"Online"});
  const [apiError,setApiError]=useState("");

  async function refreshAll() {
    try {
      const [p,s,h,a,health]=await Promise.all([
        api("/api/patients"),api("/api/sensors"),api("/api/history?limit=60"),api("/api/alerts"),api("/api/health")
      ]);
      setPatients(p);setSensors(s);setHistory(h.map((r,i)=>({...r,heart_rate:Number(r.heart_rate),spo2:Number(r.spo2),temperature:Number(r.temperature),respiratory_rate:Number(r.respiratory_rate),time:fmtTime(r.created_at)})));
      setAlerts(a);setDbStatus(health.database==="connected"?"connected":"error");setApiError("");
      if(h.length) setLatest(h[h.length-1]);
    } catch(err) {setDbStatus("error");setApiError(err.message);}
    finally {setLoading(false);setLastUpdated(new Date());}
  }
  useEffect(()=>{refreshAll();const t=setInterval(refreshAll,15000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    const handler=(reading)=>{
      const normalized={...reading,heart_rate:Number(reading.heart_rate),spo2:Number(reading.spo2),temperature:Number(reading.temperature),respiratory_rate:Number(reading.respiratory_rate),time:fmtTime(reading.created_at)};
      setLatest(normalized);
      setHistory(prev=>[...prev,normalized].slice(-60));
      setLastUpdated(new Date());
      if(normalized.heart_rate>100||normalized.spo2<94||normalized.temperature>38||normalized.fall_detected) {
        setToast("A telemetry reading needs attention.");
        setTimeout(()=>setToast(""),4000);
      }
    };
    socket.on("telemetry",handler);
    return()=>socket.off("telemetry",handler);
  },[]);
  const chartData=useMemo(()=>history.slice(-30).map((r,i)=>({index:i+1,time:r.time,heart_rate:r.heart_rate,spo2:r.spo2,temperature:r.temperature})),[history]);
  function handleAuth(u,t){setUser(u);setToken(t);}
  function logout(){setUser(null);setToken("");}
  async function addSensor(e) {
    e.preventDefault();
    try {await api("/api/sensors",{method:"POST",body:JSON.stringify(sensorForm)});setSensorModal(false);setSensorForm({sensor_code:"",sensor_type:"",unit:"",status:"Online"});await refreshAll();setToast("Sensor added successfully.");setTimeout(()=>setToast(""),2500);}
    catch(err){setToast(err.message);setTimeout(()=>setToast(""),3500);}
  }
  async function deleteSensor(id) {
    if(!window.confirm("Delete this sensor?"))return;
    try{await api(`/api/sensors/${id}`,{method:"DELETE"});await refreshAll();}
    catch(err){setToast(err.message);setTimeout(()=>setToast(""),3000);}
  }

  if(!user) return <AuthScreen onAuth={handleAuth}/>;
  const metricCards=[
    {label:"Heart rate",value:latest?`${Number(latest.heart_rate).toFixed(0)}`:"--",unit:"bpm",icon:HeartPulse,color:"coral",status:latest?vitalStatus("heart_rate",Number(latest.heart_rate)):"Waiting"},
    {label:"Blood oxygen",value:latest?`${Number(latest.spo2).toFixed(0)}`:"--",unit:"%",icon:Droplets,color:"blue",status:latest?vitalStatus("spo2",Number(latest.spo2)):"Waiting"},
    {label:"Body temperature",value:latest?`${Number(latest.temperature).toFixed(1)}`:"--",unit:"°C",icon:Thermometer,color:"amber",status:latest?vitalStatus("temperature",Number(latest.temperature)):"Waiting"},
    {label:"Respiratory rate",value:latest?`${Number(latest.respiratory_rate).toFixed(0)}`:"--",unit:"/min",icon:Wind,color:"violet",status:latest?vitalStatus("respiratory_rate",Number(latest.respiratory_rate)):"Waiting"}
  ];
  const attention=latest&&(latest.heart_rate>100||latest.spo2<94||latest.temperature>38||latest.fall_detected);
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?"sidebar-open":""}`}>
      <div className="brand sidebar-brand"><span className="brand-mark"><HeartPulse size={23}/></span><span>Health<span className="accent">Pulse</span></span><button className="icon-btn close-sidebar" onClick={()=>setSidebarOpen(false)}><X size={18}/></button></div>
      <div className="unit-card"><div className="unit-avatar"><Activity size={20}/></div><div><strong>ICU Monitor</strong><small>Remote care workspace</small></div><span className="live-dot"/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{navItems.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${section===item.id?"active":""}`} onClick={()=>{setSection(item.id);setSidebarOpen(false)}}><Icon size={18}/><span>{item.label}</span>{item.id==="alerts"&&alerts.length>0&&<em>{alerts.length}</em>}</button>})}</nav>
      <div className="sidebar-bottom"><div className={`db-chip ${dbStatus==="connected"?"ok":"bad"}`}><Database size={15}/><span>PostgreSQL</span><i/></div><div className="profile-mini"><div className="avatar">{(user.full_name||user.fullName||"U").slice(0,1).toUpperCase()}</div><div className="profile-copy"><strong>{user.full_name||user.fullName}</strong><small>{user.email}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={16}/></button></div></div>
    </aside>
    {sidebarOpen&&<div className="scrim" onClick={()=>setSidebarOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>HealthPulse</span><ChevronRight size={15}/><strong>{navItems.find(n=>n.id===section)?.label||"Overview"}</strong></div><div className="top-actions"><div className={`connection ${dbStatus==="connected"?"connected":"disconnected"}`}><span/>{dbStatus==="connected"?"Database connected":"Database offline"}</div><button className="icon-btn refresh" title="Refresh data" onClick={refreshAll}><RefreshCw size={17}/></button><div className="avatar top-avatar">{(user.full_name||"U").slice(0,1).toUpperCase()}</div></div></header>
      <div className="page-content">
        {apiError&&<div className="banner-error"><CircleAlert size={18}/><div><strong>Backend connection issue</strong><span>{apiError}. Check that PostgreSQL and the backend server are running.</span></div></div>}
        {section==="overview"&&<>
          <div className="welcome-row"><div><div className="eyebrow dark"><span className="pulse-dot"/> LIVE TELEMETRY CENTER</div><h1>Patient overview<span className="period">.</span></h1><p>Monitor current vitals, recent trends and sensor activity.</p></div><div className="updated-label"><span className="live-dot"/><div><small>Last refreshed</small><strong>{lastUpdated.toLocaleTimeString()}</strong></div></div></div>
          <div className="stat-grid">{metricCards.map(m=>{const Icon=m.icon;return <div className={`metric-card ${m.color}`} key={m.label}><div className="metric-top"><span>{m.label}</span><span className="metric-icon"><Icon size={19}/></span></div><div className="metric-value">{m.value}<small>{m.unit}</small></div><div className="metric-foot"><span className={`status-pill ${m.status==="Attention"?"warning":"normal"}`}><span/>{m.status}</span><span className="metric-caption">Current reading</span></div></div>})}</div>
          <div className="chart-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>Heart-rate trend</h3><p>Recent telemetry readings</p></div><span className="panel-badge"><Activity size={14}/> LIVE</span></div><div className="chart-wrap">{chartData.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e87968" stopOpacity={0.28}/><stop offset="100%" stopColor="#e87968" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3"/><XAxis dataKey="time" tick={{fontSize:10,fill:"#8793a4"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#8793a4"}} axisLine={false} tickLine={false} width={32}/><Tooltip/><Area type="monotone" dataKey="heart_rate" stroke="#e87968" fill="url(#hrGradient)" strokeWidth={2.5} name="Heart rate"/></AreaChart></ResponsiveContainer>:<div className="empty-chart">Waiting for readings…</div>}</div></section>
          <section className="panel chart-panel"><div className="panel-heading"><div><h3>Blood oxygen trend</h3><p>SpO₂ percentage over time</p></div><span className="panel-badge blue-badge"><Droplets size={14}/> SpO₂</span></div><div className="chart-wrap">{chartData.length?<ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3"/><XAxis dataKey="time" tick={{fontSize:10,fill:"#8793a4"}} axisLine={false} tickLine={false}/><YAxis domain={[85,100]} tick={{fontSize:10,fill:"#8793a4"}} axisLine={false} tickLine={false} width={32}/><Tooltip/><Line type="monotone" dataKey="spo2" stroke="#438ee8" strokeWidth={2.5} dot={false} name="SpO₂"/></LineChart></ResponsiveContainer>:<div className="empty-chart">Waiting for readings…</div>}</div></section></div>
          <div className="bottom-grid"><section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent telemetry</h3><p>Latest records from PostgreSQL</p></div><button className="text-btn" onClick={()=>setSection("history")}>View history <ChevronRight size={15}/></button></div><div className="table-scroll"><table><thead><tr><th>Time</th><th>Heart rate</th><th>SpO₂</th><th>Temp.</th><th>Resp.</th><th>State</th></tr></thead><tbody>{history.slice(-6).reverse().map((r,i)=><tr key={r.id||i}><td>{r.time}</td><td>{r.heart_rate} bpm</td><td>{r.spo2}%</td><td>{r.temperature}°C</td><td>{r.respiratory_rate}</td><td><span className={`state-dot ${vitalStatus("heart_rate",r.heart_rate)==="Attention"?"state-warn":"state-ok"}`}>{vitalStatus("heart_rate",r.heart_rate)==="Attention"?"Review":"Normal"}</span></td></tr>)}</tbody></table></div></section>
          <section className="panel system-panel"><div className="panel-heading"><div><h3>System status</h3><p>Service health</p></div><Server size={18} color="#78889b"/></div><div className="system-row"><span><Database size={17}/> PostgreSQL</span><b className={dbStatus==="connected"?"text-green":"text-red"}>{dbStatus==="connected"?"Connected":"Offline"}</b></div><div className="system-row"><span><Wifi size={17}/> Socket.IO</span><b className={socket.connected?"text-green":"text-red"}>{socket.connected?"Connected":"Reconnecting"}</b></div><div className="system-row"><span><Activity size={17}/> Telemetry simulator</span><b className="text-green">Active</b></div><div className="system-note"><CheckCircle2 size={15}/> Readings are stored in PostgreSQL every 3 seconds.</div></section></div>
        </>}
        {section==="patients"&&<><div className="section-head"><div><h1>Patients<span className="period">.</span></h1><p>Registered patients and ICU bed status.</p></div><span className="count-pill">{patients.length} patients</span></div><section className="panel"><div className="table-scroll"><table><thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Bed</th><th>Status</th></tr></thead><tbody>{patients.map(p=><tr key={p.id}><td>{p.patient_code}</td><td><strong>{p.full_name}</strong></td><td>{p.age}</td><td>{p.gender}</td><td>{p.bed_number}</td><td><span className={`status-pill ${p.status==="Stable"?"normal":"warning"}`}>{p.status}</span></td></tr>)}</tbody></table></div></section></>}
        {section==="sensors"&&<><div className="section-head"><div><h1>Sensors<span className="period">.</span></h1><p>Manage registered telemetry sources.</p></div><button className="primary-btn" onClick={()=>setSensorModal(true)}><Plus size={17}/> Add sensor</button></div><section className="panel"><div className="table-scroll"><table><thead><tr><th>Code</th><th>Sensor type</th><th>Patient</th><th>Unit</th><th>Status</th><th>Action</th></tr></thead><tbody>{sensors.map(s=><tr key={s.id}><td>{s.sensor_code}</td><td>{s.sensor_type}</td><td>{s.patient_name||s.patient_id||"—"}</td><td>{s.unit}</td><td><span className="status-pill normal">{s.status}</span></td><td><button className="danger-btn" onClick={()=>deleteSensor(s.id)}>Delete</button></td></tr>)}</tbody></table></div></section></>}
        {section==="alerts"&&<><div className="section-head"><div><h1>Alerts<span className="period">.</span></h1><p>Recent readings outside configured demo thresholds.</p></div><span className="count-pill alert-count">{alerts.length} events</span></div><section className="panel"><div className="table-scroll"><table><thead><tr><th>Time</th><th>Patient</th><th>Heart rate</th><th>SpO₂</th><th>Temp.</th><th>Fall</th><th>Reason</th></tr></thead><tbody>{alerts.map(a=><tr key={a.id}><td>{fmtTime(a.created_at)}</td><td>{a.patient_code||"—"}</td><td>{a.heart_rate}</td><td>{a.spo2}%</td><td>{a.temperature}°C</td><td>{a.fall_detected?"Detected":"No"}</td><td><span className="status-pill warning">{a.fall_detected?"Fall event":a.heart_rate>100?"High heart rate":a.spo2<94?"Low SpO₂":"High temperature"}</span></td></tr>)}</tbody></table></div></section></>}
        {section==="history"&&<><div className="section-head"><div><h1>Telemetry history<span className="period">.</span></h1><p>Recent records persisted in PostgreSQL.</p></div><button className="secondary-btn" onClick={refreshAll}><RefreshCw size={16}/> Refresh history</button></div><section className="panel"><div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Heart rate</th><th>SpO₂</th><th>Temperature</th><th>Respiratory rate</th><th>Fall</th></tr></thead><tbody>{history.slice().reverse().map((r,i)=><tr key={r.id||i}><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.heart_rate} bpm</td><td>{r.spo2}%</td><td>{r.temperature}°C</td><td>{r.respiratory_rate}</td><td>{r.fall_detected?"Detected":"No"}</td></tr>)}</tbody></table></div></section></>}
        <footer className="page-footer"><span>© 2026 HealthPulse · Full Stack Web Development Project</span><span><span className="pulse-dot"/> Demo telemetry · Not for clinical decisions</span></footer>
      </div>
    </main>
    {sensorModal&&<div className="modal-backdrop" onClick={()=>setSensorModal(false)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={addSensor}><div className="modal-head"><h3>Add sensor</h3><button type="button" className="icon-btn" onClick={()=>setSensorModal(false)}><X size={18}/></button></div>{[["sensor_code","Sensor code"],["sensor_type","Sensor type"],["unit","Unit"]].map(([key,label])=><label key={key}>{label}<input value={sensorForm[key]} onChange={e=>setSensorForm({...sensorForm,[key]:e.target.value})} required/></label>)}<label>Status<select value={sensorForm.status} onChange={e=>setSensorForm({...sensorForm,status:e.target.value})}><option>Online</option><option>Offline</option><option>Maintenance</option></select></label><button className="primary-btn full">Save sensor</button></form></div>}
    {toast&&<div className="toast"><CircleAlert size={17}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
