export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-xl border border-cyan-100 bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-bold text-slate-900">Kifo Phase 1 MVP</h1>
          <p className="mt-2 text-slate-600">
            AI-native Discord automation platform with shared bot mode, BYOB runtime, workflow execution, and realtime observability.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <a href="/dashboard" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-cyan-300">
            <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
            <p className="mt-2 text-sm text-slate-600">Live execution stream, platform metrics, and recent runs.</p>
          </a>

          <a href="/workflows" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-300">
            <h2 className="text-xl font-semibold text-slate-900">Workflow Builder</h2>
            <p className="mt-2 text-sm text-slate-600">Create, publish, and trigger visual workflows.</p>
          </a>

          <a href="/bots" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-amber-300">
            <h2 className="text-xl font-semibold text-slate-900">Bot Runtime</h2>
            <p className="mt-2 text-sm text-slate-600">Manage shared platform bot and BYOB identities.</p>
          </a>
        </section>
      </div>
    </main>
  );
}
