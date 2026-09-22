import React, { useMemo, useState } from "react";
import { Activity, BarChart3, BellRing, Boxes, ChevronRight, Gauge, LogOut, Menu, Radio, Settings, ShieldAlert, ShieldCheck, Target, Users, X } from "lucide-react";
import type { AuthUser } from "../../types/app.js";
import { clearSession } from "../../lib/session.js";

type Props = { user: AuthUser; children: React.ReactNode; currentPath: string };

export const AppShell: React.FC<Props> = ({ user, children, currentPath }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = useMemo(() => [
    { href: "/app", label: "Overview", icon: Activity, roles: ["admin", "operator", "viewer"] },
    { href: "/app/alerts", label: "Alerts", icon: BellRing, roles: ["admin", "operator", "viewer"] },
    { href: "/app/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "operator", "viewer"] },
    { href: "/app/incidents", label: "Incidents", icon: ShieldAlert, roles: ["admin", "operator", "viewer"] },
    { href: "/app/slos", label: "SLOs", icon: Target, roles: ["admin", "operator", "viewer"] },
    { href: "/app/hosts", label: "Hosts", icon: Boxes, roles: ["admin", "operator", "viewer"] },
    { href: "/app/operations", label: "Operations", icon: Gauge, roles: ["admin"] },
    { href: "/app/admin", label: "Administration", icon: Users, roles: ["admin"] },
  ], []);
  const visible = items.filter((item) => item.roles.includes(user.role));
  const active = (href: string) => href === "/app" ? currentPath === "/app" : currentPath.startsWith(href);
  const signOut = () => { clearSession(); window.location.href = "/"; };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(99,102,241,0.08),transparent_26%)]" />
      <div className="flex min-h-screen">
        <aside className={"fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/6 bg-slate-950/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0 " + (mobileOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-20 items-center justify-between border-b border-white/6 px-5">
            <a href="/app" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/15"><Radio className="h-5 w-5 text-cyan-300" /></span><div><div className="text-sm font-semibold text-white">Telemetry</div><div className="text-[10px] uppercase tracking-[0.22em] text-slate-600">Control Center</div></div></a>
            <button className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="px-4 pt-5"><div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</div><nav className="space-y-1">
            {visible.map(({ href, label, icon: Icon }) => <a key={href} href={href} onClick={() => setMobileOpen(false)} className={"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition " + (active(href) ? "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/10" : "text-slate-400 hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4" /><span>{label}</span>{active(href) && <ChevronRight className="ml-auto h-3.5 w-3.5 text-cyan-400" />}</a>)}
          </nav></div>
          <div className="mt-auto p-4"><div className="rounded-2xl border border-white/7 bg-white/[0.025] p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-cyan-300">{user.email.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><div className="truncate text-sm font-medium text-white">{user.email}</div><div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-3 w-3" />{user.role}</div></div></div><div className="mt-4 flex gap-2"><a href="/app/settings" className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/7 bg-white/[0.02] px-3 py-2 text-xs text-slate-400 hover:text-white"><Settings className="h-3.5 w-3.5" />Settings</a><button onClick={signOut} className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/15 bg-rose-500/5 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10"><LogOut className="h-3.5 w-3.5" />Sign out</button></div></div></div>
        </aside>
        {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
        <div className="min-w-0 flex-1"><div className="flex h-16 items-center border-b border-white/6 bg-slate-950/70 px-4 backdrop-blur-xl lg:hidden"><button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button><div className="ml-3 text-sm font-semibold text-white">Telemetry Control Center</div></div>{children}</div>
      </div>
    </div>
  );
};
