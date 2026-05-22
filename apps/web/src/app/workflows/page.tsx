"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import { createWorkflow, executeWorkflow, fetchBots, fetchWorkflows, publishWorkflow } from "../../lib/api";

const starterNodes = [
  { id: "1", type: "input", data: { label: "trigger.messageCreate" }, position: { x: 50, y: 100 } },
  { id: "2", data: { label: "condition.contains" }, position: { x: 320, y: 100 } },
  { id: "3", data: { label: "action.sendMessage" }, position: { x: 620, y: 100 } },
];

const starterEdges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
];

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("Welcome Automation");
  const [botId, setBotId] = useState("");

  const botsQuery = useQuery({ queryKey: ["bots"], queryFn: fetchBots });
  const workflowsQuery = useQuery({ queryKey: ["workflows"], queryFn: fetchWorkflows });

  const createMutation = useMutation({
    mutationFn: createWorkflow,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishWorkflow,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const executeMutation = useMutation({ mutationFn: ({ workflowId }: { workflowId: string }) => executeWorkflow(workflowId, { source: "manual" }) });

  const selectedBotId = useMemo(() => botId || botsQuery.data?.[0]?.id || "", [botId, botsQuery.data]);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBotId) return;

    createMutation.mutate({
      name,
      botId: selectedBotId,
      nodes: starterNodes.map((node) => ({
        id: node.id,
        type: node.data.label,
        data: node.data,
        position: node.position,
      })),
      edges: starterEdges,
    });
  };

  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Workflow Builder</h1>

        <form onSubmit={onCreate} className="grid md:grid-cols-4 gap-3 rounded-lg bg-emerald-900/40 border border-emerald-800 p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 rounded bg-emerald-50 text-emerald-950" required />
          <select value={selectedBotId} onChange={(e) => setBotId(e.target.value)} className="px-3 py-2 rounded bg-emerald-50 text-emerald-950">
            {(botsQuery.data || []).map((bot) => (
              <option key={bot.id} value={bot.id}>{bot.name} ({bot.type})</option>
            ))}
          </select>
          <button className="rounded bg-cyan-300 text-emerald-950 px-4 py-2 font-semibold" disabled={createMutation.isPending}>Create Workflow</button>
        </form>

        <section className="rounded-lg border border-emerald-800 bg-emerald-900/40 p-4 h-[340px]">
          <ReactFlow nodes={starterNodes} edges={starterEdges} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </section>

        <section className="rounded-lg border border-emerald-800 bg-emerald-900/40 p-4">
          <h2 className="text-xl font-semibold mb-3">Saved Workflows</h2>
          <div className="space-y-2">
            {(workflowsQuery.data || []).map((workflow) => (
              <div key={workflow.id} className="border border-emerald-800 rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{workflow.name}</p>
                  <p className="text-sm text-emerald-300">{workflow.status}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-amber-300 text-emerald-950 text-sm font-semibold"
                    onClick={() => publishMutation.mutate(workflow.id)}
                  >
                    Publish
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-cyan-300 text-emerald-950 text-sm font-semibold"
                    onClick={() => executeMutation.mutate({ workflowId: workflow.id })}
                  >
                    Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
