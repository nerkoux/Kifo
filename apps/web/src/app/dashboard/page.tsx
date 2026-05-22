"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBots, fetchExecutions, fetchWorkflows } from "../../lib/api";
import { useExecutionStream } from "../../lib/use-execution-stream";

export default function DashboardPage() {
  const [events, setEvents] = useState<Array<{ type: string; payload: any }>>([]);
  const hasToken =
    typeof window !== "undefined" && Boolean(window.localStorage.getItem("kifo_access_token"));

  const botsQuery = useQuery({ queryKey: ["bots"], queryFn: fetchBots, enabled: hasToken });
  const workflowsQuery = useQuery({ queryKey: ["workflows"], queryFn: fetchWorkflows, enabled: hasToken });
  const executionsQuery = useQuery({ queryKey: ["executions"], queryFn: () => fetchExecutions(20), enabled: hasToken });

  useExecutionStream((type, payload) => {
    setEvents((prev) => [{ type, payload }, ...prev].slice(0, 25));
  });

  const stats = useMemo(() => {
    const executions = executionsQuery.data || [];
    return {
      bots: botsQuery.data?.length || 0,
      workflows: workflowsQuery.data?.length || 0,
      executions: executions.length,
      failures: executions.filter((x) => x.status === "FAILED").length,
    };
  }, [botsQuery.data, workflowsQuery.data, executionsQuery.data]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kifo Control Plane</h1>
            <p className="text-slate-400">Realtime Discord automation operations</p>
            {!hasToken && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || window.location.origin}/api/auth/discord`}
                className="inline-block mt-3 px-4 py-2 rounded bg-indigo-400 text-slate-950 font-semibold"
              >
                Sign in with Discord
              </a>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/bots" className="px-4 py-2 rounded bg-cyan-500 text-slate-950 font-semibold">Bots</Link>
            <Link href="/workflows" className="px-4 py-2 rounded bg-emerald-500 text-slate-950 font-semibold">Workflows</Link>
          </div>
        </header>

        <section className="grid md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-slate-400 text-sm uppercase">{key}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-xl font-semibold mb-4">Recent Executions</h2>
            <div className="space-y-2 max-h-80 overflow-auto">
              {(executionsQuery.data || []).map((execution) => (
                <div key={execution.id} className="flex justify-between border border-slate-800 rounded p-2">
                  <div>
                    <p className="font-medium">{execution.workflow?.name || execution.id}</p>
                    <p className="text-xs text-slate-400">{execution.triggerType}</p>
                  </div>
                  <span className="text-sm">{execution.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-xl font-semibold mb-4">Live Event Stream</h2>
            <div className="space-y-2 max-h-80 overflow-auto">
              {events.map((event, idx) => (
                <div key={`${event.type}-${idx}`} className="border border-slate-800 rounded p-2 text-xs">
                  <p className="text-cyan-300 font-semibold">{event.type}</p>
                  <pre className="text-slate-300 mt-1 whitespace-pre-wrap break-words">{JSON.stringify(event.payload, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
