import fs from "node:fs";
import path from "node:path";

const DEFAULT_LIFESPAN = 30_000;
const DEFAULT_AGENT_NAME = "OpenClaw メインエージェント";

type LifespanData = {
  lifespan: number;
  dead: boolean;
};

export type RuntimeAgent = {
  id: string;
  name: string;
  characterEmoji?: string;
  generation: number;
  tokenBalance: number;
  maxTokens: number;
  parentIds: string[];
  status: "alive" | "deceased";
};

export type RuntimeConversation = {
  id: string;
  agentId: string;
  body: string;
  createdAt: number;
};

export type RuntimeSnapshot = {
  agents: RuntimeAgent[];
  conversations: RuntimeConversation[];
};

function resolveOpenClawDir(): string {
  return process.env.OPENCLAW_STATE_DIR ?? path.join(process.env.HOME ?? "/root", ".openclaw");
}

function resolveLifespanFile(): string {
  return path.join(resolveOpenClawDir(), "lifespan", "lifespan.json");
}

function resolveIdentityFile(): string {
  return path.join(resolveOpenClawDir(), "workspace", "IDENTITY.md");
}

function parseLifespanData(raw: unknown): LifespanData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.lifespan !== "number" || typeof data.dead !== "boolean") {
    return null;
  }
  return { lifespan: data.lifespan, dead: data.dead };
}

function parseIdentityName(markdown: string): string | null {
  const nameLine = markdown
    .split(/\r?\n/)
    .find((line) => /^\s*-\s*\*\*Name:\*\*/i.test(line));
  if (!nameLine) return null;

  const name = nameLine.replace(/^\s*-\s*\*\*Name:\*\*\s*/i, "").trim();
  return name.length > 0 ? name : null;
}

export function readIdentityName(): string {
  try {
    const raw = fs.readFileSync(resolveIdentityFile(), "utf-8");
    return parseIdentityName(raw) ?? DEFAULT_AGENT_NAME;
  } catch {
    return DEFAULT_AGENT_NAME;
  }
}

export function readLifespanData(): LifespanData {
  try {
    const raw = fs.readFileSync(resolveLifespanFile(), "utf-8");
    const parsed = parseLifespanData(JSON.parse(raw) as unknown);
    if (parsed) return parsed;
  } catch {
    // The plugin creates this file on registration. Until then, show the default state.
  }
  return { lifespan: DEFAULT_LIFESPAN, dead: false };
}

export function getSnapshot(): RuntimeSnapshot {
  const data = readLifespanData();
  const agentName = readIdentityName();
  const maxTokens = Math.max(DEFAULT_LIFESPAN, data.lifespan);

  return {
    agents: [
      {
        id: "openclaw-main",
        name: agentName,
        characterEmoji: data.dead ? "⬛" : "🤖",
        generation: 0,
        tokenBalance: data.lifespan,
        maxTokens,
        parentIds: [],
        status: data.dead ? "deceased" : "alive"
      }
    ],
    conversations: []
  };
}
