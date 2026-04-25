import { NextResponse } from "next/server";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { readLifespanData } from "../../lib/runtimeState";

type ChatRequest = {
  message: string;
  systemPrompt?: string;
  agentId?: string;
  agentName?: string;
};

const execFileAsync = promisify(execFile);

type InferRunResult = {
  ok?: boolean;
  outputs?: Array<{ text?: string | null }>;
};

type AgentRunResult = {
  status?: string;
  result?: {
    payloads?: Array<{ text?: string | null }>;
    meta?: {
      agentMeta?: {
        sessionId?: string;
        usage?: {
          input?: number;
          output?: number;
          total?: number;
        };
      };
    };
  };
};

function parseJsonObjectFromOutput<T>(stdout: string): T {
  const start = stdout.indexOf("{");
  if (start < 0) {
    throw new Error("OpenClaw CLI output did not contain JSON.");
  }
  const jsonText = stdout.slice(start);
  return JSON.parse(jsonText) as T;
}

async function resolveOpenClawBin(): Promise<string> {
  const envBin = process.env.OPENCLAW_BIN?.trim();
  if (envBin) return envBin;

  const candidates = [
    "/Users/imamurakouma/.nvm/versions/node/v24.15.0/bin/openclaw",
    "/Users/imamurakouma/.nvm/versions/node/v24.12.0/bin/openclaw",
    "openclaw"
  ];

  for (const candidate of candidates) {
    try {
      if (candidate === "openclaw") return candidate;
      await access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }

  return "openclaw";
}

async function runOpenClawInfer(prompt: string, model?: string): Promise<string> {
  const openclawBin = await resolveOpenClawBin();
  const commandVariants: string[][] = [
    ["infer", "model", "run", "--gateway", "--json", "--prompt", prompt],
    ["capability", "model", "run", "--gateway", "--json", "--prompt", prompt]
  ];
  if (model && model !== "auto") {
    for (const variant of commandVariants) {
      variant.push("--model", model);
    }
  }

  let lastError: unknown = null;

  for (const args of commandVariants) {
    try {
      const { stdout, stderr } = await execFileAsync(openclawBin, args, {
        timeout: 120000,
        maxBuffer: 1024 * 1024
      });

      if (stderr && stderr.trim().length > 0) {
        // OpenClaw emits warnings to stderr even on success; do not fail here.
      }

      const parsed = parseJsonObjectFromOutput<InferRunResult>(stdout);
      const reply = parsed.outputs?.map((o) => o.text ?? "").join("\n").trim();
      if (!reply) {
        throw new Error("OpenClaw infer returned no text output.");
      }
      return reply;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("OpenClaw command execution failed.");
}

function toSessionId(agentId?: string): string {
  const raw = agentId?.trim() || "main";
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return `lifespan-${safe}`;
}

async function runOpenClawAgent(message: string, sessionId: string): Promise<{ reply: string; sessionId?: string; usage: unknown }> {
  const openclawBin = await resolveOpenClawBin();
  const { stdout } = await execFileAsync(
    openclawBin,
    ["agent", "--session-id", sessionId, "--message", message, "--json", "--timeout", "120"],
    {
      timeout: 130000,
      maxBuffer: 1024 * 1024 * 2
    }
  );

  const parsed = parseJsonObjectFromOutput<AgentRunResult>(stdout);
  const reply = parsed.result?.payloads?.map((payload) => payload.text ?? "").join("\n").trim();
  if (!reply) {
    throw new Error("OpenClaw agent returned no text output.");
  }

  return {
    reply,
    sessionId: parsed.result?.meta?.agentMeta?.sessionId,
    usage: parsed.result?.meta?.agentMeta?.usage ?? null
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequest;
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const sessionKey = toSessionId(body.agentId);
    const agentMessage = [
      body.agentName ? `あなたは「${body.agentName}」として返答してください。` : null,
      body.systemPrompt,
      message
    ]
      .filter(Boolean)
      .join("\n\n");
    const result = await runOpenClawAgent(agentMessage, sessionKey).catch(async (agentError) => {
      if (process.env.OPENCLAW_ALLOW_STATELESS_FALLBACK !== "1") {
        throw agentError;
      }
      const model = process.env.OPENCLAW_MODEL ?? "auto";
      const reply = await runOpenClawInfer(agentMessage, model);
      return { reply, sessionId: undefined, usage: null };
    });
    const lifespan = readLifespanData();

    return NextResponse.json({
      reply: result.reply,
      openclawSessionKey: sessionKey,
      openclawSessionId: result.sessionId,
      usage: result.usage,
      remainingTokens: lifespan.lifespan,
      agentStatus: lifespan.dead ? "deceased" : "alive"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "OpenClaw gateway request failed.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }
}
