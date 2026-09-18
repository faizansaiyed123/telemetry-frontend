import React, { useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Radio, ShieldCheck } from "lucide-react";
import type { AuthUser } from "../types/app.js";
import { api } from "../services/api.js";

export const Settings: React.FC<{ user: AuthUser }> = ({ user }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setSaving(false);
    }
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Workspace</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your access context and account security.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/5">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Account</div>
              <div className="text-xs text-slate-600">Authenticated workspace identity</div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div><div className="text-xs text-slate-600">Email</div><div className="mt-1 text-sm text-slate-200">{user.email}</div></div>
            <div><div className="text-xs text-slate-600">Role</div><div className="mt-1 text-sm capitalize text-slate-200">{user.role}</div></div>
            <div><div className="text-xs text-slate-600">Status</div><div className="mt-1 text-sm text-emerald-300">{user.is_active ? "Active" : "Inactive"}</div></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/5">
              <KeyRound className="h-4 w-4 text-indigo-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Service connection</div>
              <div className="text-xs text-slate-600">Current frontend/backend integration</div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div><div className="text-xs text-slate-600">API endpoint</div><div className="mt-1 break-all text-sm text-slate-300">{apiBase}</div></div>
            <div><div className="text-xs text-slate-600">Live stream</div><div className="mt-1 flex items-center gap-2 text-sm text-slate-300"><Radio className="h-4 w-4 text-cyan-300" />Authenticated WebSocket telemetry</div></div>
            <a href={apiBase + "/docs"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
              Open API documentation <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <form onSubmit={changePassword} className="rounded-2xl border border-white/7 bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/5">
            <KeyRound className="h-4 w-4 text-indigo-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Change password</div>
            <div className="text-xs text-slate-600">Update your own account credentials.</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Current password" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" required />
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="New password" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" required minLength={8} />
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="Confirm new password" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" required minLength={8} />
        </div>

        {(error || message) && (
          <div className={"mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>
            {message && <CheckCircle2 className="h-4 w-4" />}
            {error || message}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button disabled={saving || !currentPassword || !newPassword || !confirmPassword} className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40">
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </main>
  );
};

export default Settings;
