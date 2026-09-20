import React, { useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { api } from "../services/api.js";
import { saveSession } from "../lib/session.js";

const benefits = [
  "Read live infrastructure telemetry",
  "Investigate anomalies and alert history",
  "Explore historical analytics",
];

export const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const session = await api.signup(normalizedEmail, password);
      saveSession(session);
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account");
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
            <a href="/" className="inline-flex items-center gap-3" aria-label="Telemetry home">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                <Radio className="h-5 w-5 text-cyan-300" />
              </span>
              <span className="text-sm font-semibold text-white">Telemetry</span>
            </a>

            <div className="mt-20 max-w-lg">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Create your workspace access</div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white">
                Start seeing your infrastructure clearly.
              </h1>
              <p className="mt-5 text-sm leading-7 text-slate-500">
                Create a viewer account and step straight into the monitoring workspace. Operator and administrator privileges remain managed by administrators.
              </p>
              <div className="mt-8 space-y-3 text-sm text-slate-400">
                {benefits.map((item) => (
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
              <a href="/" className="inline-flex items-center gap-3" aria-label="Telemetry home">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
                  <Radio className="h-5 w-5 text-cyan-300" />
                </span>
                <span className="text-sm font-semibold text-white">Telemetry</span>
              </a>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Get started</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Create your account</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Your account starts with viewer access so you can explore the platform immediately.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={submit}>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/30"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">Password</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-white/8 bg-black/10 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/30"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">Confirm password</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-white/8 bg-black/10 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/30"
                  />
                </div>
              </label>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                New accounts receive viewer access by default.
              </div>

              <button
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Create account"}
                {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <a href="/login" className="hover:text-white">Already have an account? Sign in</a>
              <a href="/" className="hover:text-white">← Back to homepage</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
