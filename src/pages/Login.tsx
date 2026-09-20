import React, { useState } from "react";
import { ArrowRight, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { api } from "../services/api.js";
import { saveSession } from "../lib/session.js";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api.login(email.trim(), password);
      saveSession(session);
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.12),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 sm:px-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/8 bg-slate-900/70 shadow-2xl shadow-black/40 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden border-r border-white/6 p-12 lg:block">
            <a href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                <Radio className="h-5 w-5 text-cyan-300" />
              </span>
              <span className="text-sm font-semibold text-white">Telemetry</span>
            </a>
            <div className="mt-20 max-w-lg">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Secure operations access</div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white">Operate from one clear view.</h1>
              <p className="mt-5 text-sm leading-7 text-slate-500">Monitor live signals, investigate anomalies, review alert history and control the telemetry engine from one authenticated workspace.</p>
              <div className="mt-8 space-y-3 text-sm text-slate-400">
                {["Live telemetry streaming", "Persistent alert history", "Role-aware operator controls"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-10">
            <div className="lg:hidden">
              <a href="/" className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
                  <Radio className="h-5 w-5 text-cyan-300" />
                </span>
                <span className="text-sm font-semibold text-white">Telemetry</span>
              </a>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Welcome back</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Sign in to your workspace</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Use your Telemetry operator account to continue.</p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={submit}>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required placeholder="you@company.com" className="w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/30" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">Password</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required className="w-full rounded-xl border border-white/8 bg-black/10 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400/30" />
                </div>
              </label>
              {error && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}
              <button disabled={loading} className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">
                {loading ? "Signing in…" : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <a href="/signup" className="text-cyan-300 hover:text-cyan-200">Create a new account</a>
              <a href="/" className="hover:text-white">← Back to homepage</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
