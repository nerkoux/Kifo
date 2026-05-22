import axios from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("kifo_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface BotRecord {
  id: string;
  name: string;
  type: "SHARED" | "CUSTOM";
  status: string;
  createdAt: string;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  botId: string;
}

export interface ExecutionRecord {
  id: string;
  status: string;
  triggerType: string;
  createdAt: string;
  durationMs?: number;
  workflow?: { id: string; name: string };
  bot?: { id: string; name: string };
}

export async function fetchBots() {
  const { data } = await api.get<BotRecord[]>("/bots");
  return data;
}

export async function fetchWorkflows() {
  const { data } = await api.get<WorkflowRecord[]>("/workflows");
  return data;
}

export async function fetchExecutions(limit = 20) {
  const { data } = await api.get<ExecutionRecord[]>(`/executions?limit=${limit}`);
  return data;
}

export async function createBot(payload: {
  type: "SHARED" | "CUSTOM";
  name: string;
  token?: string;
}) {
  const { data } = await api.post("/bots", payload);
  return data;
}

export async function createWorkflow(payload: {
  name: string;
  description?: string;
  botId: string;
  guildId?: string;
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
}) {
  const { data } = await api.post("/workflows", payload);
  return data;
}

export async function publishWorkflow(workflowId: string) {
  const { data } = await api.post(`/workflows/${workflowId}/publish`);
  return data;
}

export async function executeWorkflow(workflowId: string, triggerData: Record<string, unknown>) {
  const { data } = await api.post(`/workflows/${workflowId}/execute`, { triggerData });
  return data;
}
