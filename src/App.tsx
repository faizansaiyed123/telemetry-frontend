import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/common/ErrorBoundary.js";
import { AppShell } from "./components/layout/AppShell.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Home } from "./pages/Home.js";
import { Login } from "./pages/Login.js";
import { AlertsPage } from "./pages/AlertsPage.js";
import { Analytics } from "./pages/Analytics.js";
import { Hosts } from "./pages/Hosts.js";
import { Admin } from "./pages/Admin.js";
import { Settings } from "./pages/Settings.js";
import { api } from "./services/api.js";
import { clearSession, getStoredToken, getStoredUser } from "./lib/session.js";
import type { AuthUser } from "./types/app.js";

function ProtectedApp() {
 const path = window.location.pathname.replace(/\/$/, "") || "/app";
 const [user,setUser]=useState<AuthUser | null>(getStoredUser());
 const [checking,setChecking]=useState(true);
 useEffect(()=>{
   if(!getStoredToken()){window.location.replace("/login");return;}
   api.me().then((u)=>setUser(u)).catch(()=>{clearSession();window.location.replace("/login");}).finally(()=>setChecking(false));
 },[]);
 if(checking || !user) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">Checking workspace access…</div>;
 let content: React.ReactNode;
 if(path==="/app") content=<Dashboard/>;
 else if(path==="/app/alerts") content=<AlertsPage/>;
 else if(path==="/app/analytics") content=<Analytics/>;
 else if(path==="/app/hosts") content=<Hosts user={user}/>;
 else if(path==="/app/admin" && user.role==="admin") content=<Admin/>;
 else if(path==="/app/settings") content=<Settings user={user}/>;
 else content=<div className="mx-auto max-w-3xl p-8 text-center"><h1 className="text-3xl font-semibold text-white">Page not found</h1><p className="mt-3 text-sm text-slate-500">The requested workspace page does not exist or you do not have access.</p><a href="/app" className="mt-6 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950">Back to overview</a></div>;
 return <AppShell user={user} currentPath={path}>{content}</AppShell>;
}

export function App(){
 const path=window.location.pathname.replace(/\/$/,"") || "/";
 if(path==="/login") return <Login/>;
 if(path==="/app" || path.startsWith("/app/")) return <ErrorBoundary><ProtectedApp/></ErrorBoundary>;
 return <ErrorBoundary><Home/></ErrorBoundary>;
}

export default App;
