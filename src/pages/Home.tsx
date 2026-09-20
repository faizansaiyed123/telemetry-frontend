import React from "react";
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Gauge,
  LineChart,
  Radio,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Live infrastructure telemetry",
    text: "Watch CPU, memory, temperature, network and service signals update continuously from one operational view.",
  },
  {
    icon: BellRing,
    title: "Anomaly & alert lifecycle",
    text: "Surface unusual behavior, track active alerts and see when an incident returns to a healthy state.",
  },
  {
    icon: LineChart,
    title: "Historical visibility",
    text: "Move from a live signal to historical context with trends, statistics and event history in seconds.",
  },
  {
    icon: ShieldCheck,
    title: "Operational control",
    text: "Keep telemetry, system health and simulation controls together so teams can understand what is happening fast.",
  },
];

const steps = [
  ["01", "Connect", "Bring a monitored machine or telemetry source into the platform."],
  ["02", "Observe", "See live signals, system status and operational trends in one place."],
  ["03", "Investigate", "Use anomalies, alerts and history to understand unusual behavior."],
  ["04", "Act", "Move from signal to response with clear, focused operational context."],
];

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-cyan-400/20 selection:text-cyan-200">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(6,182,212,0.14),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(99,102,241,0.13),transparent_30%)]" />
      <header className="relative z-10 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="Telemetry home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
              <Radio className="h-5 w-5 text-cyan-300" />
            </span>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">Telemetry</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Infrastructure observability</div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-white">Platform</a>
            <a href="#workflow" className="transition hover:text-white">How it works</a>
            <a href="#preview" className="transition hover:text-white">Live view</a>
          </nav>

          <div className="flex items-center gap-2">
            <a href="/login" className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10">
              Sign in
            </a>
            <a href="/signup" className="group inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
              Create account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1.5 text-xs font-medium text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
              Real-time infrastructure visibility
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Know what your infrastructure is doing <span className="text-cyan-300">right now.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              Telemetry turns raw infrastructure signals into a focused operational view — live metrics, anomalies, alerts and history without the noise.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="/signup" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_40px_rgba(34,211,238,0.16)] transition hover:bg-cyan-200">
                Create your account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]">
                Sign in
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-500">
              {["Live telemetry", "Anomaly detection", "Historical analytics", "Operational alerts"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div id="preview" className="relative">
            <div className="absolute -inset-8 rounded-[2rem] bg-cyan-400/5 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10"><Gauge className="h-4 w-4 text-cyan-300" /></div>
                  <div><div className="text-xs font-semibold text-white">Operations overview</div><div className="text-[10px] text-slate-500">LIVE · 10 events/sec</div></div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Healthy</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                {[
                  ["CPU", "42.8", "%", "text-cyan-300"],
                  ["Memory", "61.4", "%", "text-indigo-300"],
                  ["Latency", "38", "ms", "text-amber-300"],
                  ["Network", "184", "Mbps", "text-emerald-300"],
                  ["Req / sec", "1,248", "", "text-sky-300"],
                  ["Errors", "0.18", "%", "text-rose-300"],
                ].map(([label, value, unit, tone]) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-white/[0.025] p-3.5">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
                    <div className="mt-2 flex items-baseline gap-1"><span className={`text-xl font-semibold ${tone}`}>{value}</span><span className="text-[10px] text-slate-500">{unit}</span></div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-[68%] rounded-full bg-current opacity-70" /></div>
                  </div>
                ))}
              </div>
              <div className="mx-4 mb-4 rounded-xl border border-white/5 bg-black/10 p-4">
                <div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-slate-300">Telemetry stream</span><span className="text-[10px] text-slate-600">last 60s</span></div>
                <div className="flex h-24 items-end gap-1 overflow-hidden">
                  {[34,42,38,48,45,52,47,59,54,62,57,64,60,70,63,68,72,65,76,69,78,72,81,74,79,71,83,77,85,80,88,78,82,76,86,81,90,84,87,80].map((height, index) => (
                    <div key={index} className="min-w-[5px] flex-1 rounded-t-sm bg-cyan-400/40" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-white/5 bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="max-w-2xl"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Built for signal, not noise</div><h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Everything you need to understand an active system.</h2><p className="mt-4 text-slate-400">A monitoring experience designed to take you from “something changed” to useful context without jumping between disconnected screens.</p></div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <article key={title} className="group rounded-2xl border border-white/7 bg-slate-950/60 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-slate-900/70">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/5"><Icon className="h-5 w-5 text-cyan-300" /></div>
                  <h3 className="mt-5 text-sm font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Simple operational flow</div><h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">From machine signal to actionable context.</h2><p className="mt-4 text-sm leading-6 text-slate-500">The product is structured around the questions an operator needs answered: Is it healthy? What changed? How serious is it? What happened before it?</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map(([number, title, text]) => <div key={number} className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center justify-between"><span className="text-xs font-mono text-cyan-400">{number}</span><Server className="h-4 w-4 text-slate-700" /></div><h3 className="mt-8 text-sm font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.04] px-6 py-12 text-center sm:px-12">
            <div className="absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
            <Zap className="relative mx-auto h-6 w-6 text-cyan-300" />
            <h2 className="relative mt-5 text-3xl font-semibold tracking-tight text-white">Ready to explore the system?</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Create a viewer account and open the monitoring workspace to explore live telemetry, alerts and historical data.</p>
            <a href="/signup" className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">Create account <ArrowRight className="h-4 w-4" /></a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-5 py-7 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-slate-600 sm:flex-row"><span>Telemetry · Infrastructure observability platform</span><span>Real-time visibility for modern systems</span></div></footer>
    </div>
  );
};

export default Home;
