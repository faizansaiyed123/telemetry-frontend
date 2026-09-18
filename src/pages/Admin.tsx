import React, { useEffect, useState } from "react";
import { Check, KeyRound, LockKeyhole, Plus, Shield, UserCheck, UserRoundCog, UserX, X } from "lucide-react";
import type { AuthUser, UserRecord } from "../types/app.js";
import { api } from "../services/api.js";

const roles = ["viewer", "operator", "admin"] as const;

export const Admin: React.FC<{ user: AuthUser }> = ({ user }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState("viewer");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setUsers(await api.getUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!email.trim() || password.length < 8) return;
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      const created = await api.createUser({ email: email.trim(), password, role });
      setUsers((current) => [...current, created].sort((a, b) => a.email.localeCompare(b.email)));
      setEmail("");
      setPassword("");
      setRole("viewer");
      setNotice("User created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create user");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(userRecord: UserRecord) {
    setBusy(userRecord.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateUser(userRecord.id, { is_active: !userRecord.is_active });
      setUsers((current) => current.map((item) => item.id === userRecord.id ? updated : item));
      setNotice(userRecord.is_active ? "User deactivated." : "User activated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user");
    } finally {
      setBusy(null);
    }
  }

  function startRoleEdit(userRecord: UserRecord) {
    setEditingId(userRecord.id);
    setEditingRole(userRecord.role);
    setResetId(null);
    setError(null);
    setNotice(null);
  }

  async function saveRole(userRecord: UserRecord) {
    setBusy(userRecord.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateUser(userRecord.id, { role: editingRole });
      setUsers((current) => current.map((item) => item.id === userRecord.id ? updated : item));
      setEditingId(null);
      setNotice("Role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role");
    } finally {
      setBusy(null);
    }
  }

  function startPasswordReset(userRecord: UserRecord) {
    setResetId(userRecord.id);
    setResetPassword("");
    setEditingId(null);
    setError(null);
    setNotice(null);
  }

  async function savePassword(userRecord: UserRecord) {
    if (resetPassword.length < 8) return;
    setBusy(userRecord.id + ":password");
    setError(null);
    setNotice(null);
    try {
      await api.updateUser(userRecord.id, { password: resetPassword });
      setResetId(null);
      setResetPassword("");
      setNotice("Password reset successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Administration</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Access management</h1>
        <p className="mt-2 text-sm text-slate-500">Create accounts and manage roles, status, and credentials.</p>
      </div>

      {(error || notice) && (
        <div className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>
          {error || notice}
        </div>
      )}

      <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-cyan-300" />Create user</div>
        <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_0.8fr_auto]">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="operator@company.com" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="Minimum 8 characters" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-white/8 bg-slate-900 px-4 py-3 text-sm text-white">
            {roles.map((value) => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
          </select>
          <button disabled={busy === "create" || !email || password.length < 8} onClick={() => void create()} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">
            {busy === "create" ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
        <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Users</div>
        <div className="divide-y divide-white/6">
          {users.map((userRecord) => (
            <div key={userRecord.id} className="px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/5"><Shield className="h-4 w-4 text-indigo-300" /></div>
                  <div>
                    <div className="text-sm font-medium text-white">{userRecord.email}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600"><KeyRound className="h-3 w-3" />{userRecord.role}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {userRecord.is_active
                    ? <span className="flex items-center gap-1.5 text-xs text-emerald-300"><UserCheck className="h-3.5 w-3.5" />Active</span>
                    : <span className="flex items-center gap-1.5 text-xs text-slate-600"><UserX className="h-3.5 w-3.5" />Inactive</span>}
                  <button disabled={busy === userRecord.id || userRecord.id === user.id} onClick={() => void toggle(userRecord)} className="rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400 disabled:opacity-40">
                    {userRecord.is_active ? "Deactivate" : "Activate"}{userRecord.id === user.id ? " (current)" : ""}
                  </button>
                  <button onClick={() => startRoleEdit(userRecord)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]">
                    <UserRoundCog className="h-3.5 w-3.5" />Role
                  </button>
                  <button onClick={() => startPasswordReset(userRecord)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]">
                    <LockKeyhole className="h-3.5 w-3.5" />Reset password
                  </button>
                </div>
              </div>

              {editingId === userRecord.id && (
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/7 bg-black/10 p-4 sm:flex-row sm:items-center">
                  <select value={editingRole} onChange={(e) => setEditingRole(e.target.value)} disabled={userRecord.id === user.id} className="rounded-xl border border-white/8 bg-slate-900 px-4 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {roles.map((value) => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
                  </select>
                  {userRecord.id === user.id && <span className="text-xs text-slate-500">Your own role cannot be changed here.</span>}
                  <div className="flex gap-2 sm:ml-auto">
                    <button disabled={busy === userRecord.id || userRecord.id === user.id} onClick={() => void saveRole(userRecord)} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-40"><Check className="h-3.5 w-3.5" />Save</button>
                    <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-4 py-2.5 text-xs text-slate-400"><X className="h-3.5 w-3.5" />Cancel</button>
                  </div>
                </div>
              )}

              {resetId === userRecord.id && (
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/7 bg-black/10 p-4 sm:flex-row sm:items-center">
                  <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="New password, minimum 8 characters" className="min-w-0 flex-1 rounded-xl border border-white/8 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
                  <div className="flex gap-2">
                    <button disabled={busy === userRecord.id + ":password" || resetPassword.length < 8} onClick={() => void savePassword(userRecord)} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-40"><Check className="h-3.5 w-3.5" />Reset</button>
                    <button onClick={() => setResetId(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-4 py-2.5 text-xs text-slate-400"><X className="h-3.5 w-3.5" />Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {users.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">No users available.</div>}
        </div>
      </div>
    </main>
  );
};

export default Admin;
