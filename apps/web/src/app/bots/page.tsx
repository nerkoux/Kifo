"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBot, fetchBots } from "../../lib/api";

export default function BotsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"SHARED" | "CUSTOM">("CUSTOM");
  const [token, setToken] = useState("");
  const hasToken =
    typeof window !== "undefined" && Boolean(window.localStorage.getItem("kifo_access_token"));

  const botsQuery = useQuery({ queryKey: ["bots"], queryFn: fetchBots, enabled: hasToken });

  const createMutation = useMutation({
    mutationFn: createBot,
    onSuccess: async () => {
      setName("");
      setToken("");
      await queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!hasToken) return;
    createMutation.mutate({
      name,
      type,
      token: type === "CUSTOM" ? token : undefined,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Bot Runtime Management</h1>
        {!hasToken && (
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || window.location.origin}/api/auth/discord`}
            className="inline-block px-4 py-2 rounded bg-indigo-600 text-white font-semibold"
          >
            Sign in with Discord
          </a>
        )}

        <form onSubmit={onSubmit} className="grid md:grid-cols-4 gap-3 rounded-lg border bg-white p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bot display name"
            className="border rounded px-3 py-2"
            required
            disabled={!hasToken}
          />
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="border rounded px-3 py-2" disabled={!hasToken}>
            <option value="CUSTOM">BYOB (CUSTOM)</option>
            <option value="SHARED">Shared</option>
          </select>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Discord bot token"
            className="border rounded px-3 py-2"
            disabled={!hasToken || type !== "CUSTOM"}
          />
          <button className="rounded bg-slate-900 text-white px-4 py-2 font-semibold" disabled={!hasToken || createMutation.isPending}>
            Add Bot
          </button>
        </form>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-xl font-semibold mb-3">Registered Bots</h2>
          <div className="space-y-2">
            {(botsQuery.data || []).map((bot) => (
              <div key={bot.id} className="border rounded p-3 flex justify-between">
                <div>
                  <p className="font-semibold">{bot.name}</p>
                  <p className="text-sm text-slate-500">{bot.type}</p>
                </div>
                <span className="text-sm">{bot.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
