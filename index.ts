import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_LIFESPAN,
  type LifespanData,
  type SessionMessage,
  parseLifespanData,
  extractOutputTokensOrChars,
  applyConsume,
  buildPromptContext,
} from "./lib.js";

// --- Plugin API types (openclaw/plugin-sdk ships no .d.ts for external plugins) ---

interface HookMeta {
  name: string;
  description: string;
}

interface PromptMutationResult {
  prependSystemContext?: string;
  appendSystemContext?: string;
}

interface BlockReplyResult {
  handled: boolean;
  reason: string;
}

interface MessageWriteEvent {
  message?: SessionMessage;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required: string[] };
  execute(toolCallId: string, params: Record<string, never>): Promise<string>;
}

interface CommandContext {
  args?: string;
}

interface CommandDefinition {
  name: string;
  description: string;
  acceptsArgs: boolean;
  requireAuth: boolean;
  handler(ctx?: CommandContext): Promise<{ text: string }>;
}

interface PluginApi {
  on(event: "before_prompt_build", handler: (event: unknown) => PromptMutationResult | void, meta?: HookMeta): void;
  on(event: "before_agent_reply", handler: (event: unknown) => BlockReplyResult | void, meta?: HookMeta): void;
  on(event: "before_message_write", handler: (event: MessageWriteEvent) => void, meta?: HookMeta): void;
  registerTool(tool: ToolDefinition): void;
  registerCommand(command: CommandDefinition): void;
}

// ---

const OPENCLAW_DIR =
  process.env.OPENCLAW_STATE_DIR ?? path.join(process.env.HOME ?? "/root", ".openclaw");
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, "workspace");
const SESSIONS_FILE = path.join(OPENCLAW_DIR, "agents", "main", "sessions", "sessions.json");

const CLEARABLE_FILES = ["IDENTITY.md", "SOUL.md", "USER.md"];

function resolveDataPath(): { dir: string; file: string } {
  const dir = path.join(OPENCLAW_DIR, "lifespan");
  return { dir, file: path.join(dir, "lifespan.json") };
}

function loadData(filePath: string): LifespanData {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = parseLifespanData(JSON.parse(raw) as unknown);
    if (parsed) return parsed;
  } catch {
    // file not found or invalid JSON — use default
  }
  return { lifespan: DEFAULT_LIFESPAN, dead: false };
}

function saveData(dir: string, filePath: string, data: LifespanData): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function clearPersonality(): void {
  // Clear workspace personality files
  for (const name of CLEARABLE_FILES) {
    const filePath = path.join(WORKSPACE_DIR, name);
    try {
      fs.writeFileSync(filePath, "", "utf-8");
    } catch (err) {
      console.error(`[lifespan] failed to clear ${name}:`, err);
    }
  }

  // Truncate all agent session histories to their header line only.
  // Without this the agent can recover its identity from conversation context.
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
    const sessions = JSON.parse(raw) as Record<string, unknown>;
    for (const info of Object.values(sessions)) {
      if (typeof info !== "object" || info === null) continue;
      const { sessionFile } = info as Record<string, unknown>;
      if (typeof sessionFile !== "string" || !fs.existsSync(sessionFile)) continue;
      try {
        const content = fs.readFileSync(sessionFile, "utf-8");
        const firstNewline = content.indexOf("\n");
        const header = firstNewline >= 0 ? content.slice(0, firstNewline + 1) : content;
        fs.writeFileSync(sessionFile, header);
      } catch (err) {
        console.error(`[lifespan] failed to truncate session file ${sessionFile}:`, err);
      }
    }
  } catch (err) {
    console.error("[lifespan] failed to read sessions file:", err);
  }
}

export default {
  id: "lifespan",
  name: "Lifespan",
  description: "LLM応答ごとにトークン数で寿命が減り、尽きると人格ファイルをクリアするプラグイン",
  register(api: PluginApi) {
    const { dir, file } = resolveDataPath();
    const load = () => loadData(file);
    const save = (data: LifespanData) => saveData(dir, file, data);

    if (!fs.existsSync(file)) {
      save({ lifespan: DEFAULT_LIFESPAN, dead: false });
    }

    function consume(amount: number): void {
      const current = load();
      const next = applyConsume(current, amount);
      if (next === current) return; // no change (amount <= 0 or already dead)
      save(next);
      if (next.dead) clearPersonality();
    }

    // before_prompt_build fires before every LLM call.
    // Injects lifespan awareness into the system context so the agent knows its remaining life.
    // When lifespan is low, the agent is guided to engage with its mortality in conversation.
    api.on("before_prompt_build", (_event) => {
      return buildPromptContext(load(), DEFAULT_LIFESPAN) ?? undefined;
    }, { name: "lifespan-prompt-inject", description: "現在の寿命をプロンプトに注入し、残り少ない場合は終末の会話を促す" });

    // before_agent_reply fires before the agent sends a reply.
    // When dead, block all replies so the agent cannot recover its identity via BOOTSTRAP.md.
    api.on("before_agent_reply", (_event) => {
      const data = load();
      if (data.dead) return { handled: true, reason: "lifespan: agent is dead, blocking reply" };
    }, { name: "lifespan-block-dead", description: "死亡後はエージェントの返答をブロックする" });

    // before_message_write fires for every session message (user + assistant).
    // Only count assistant messages — they carry usage.totalTokens from the LLM call.
    // This hook does NOT require allowConversationAccess.
    api.on("before_message_write", (event) => {
      const { message } = event;
      if (!message || message.role !== "assistant") return;
      consume(extractOutputTokensOrChars(message));
    }, { name: "lifespan-before-write", description: "アシスタントメッセージ書き込み前にトークン/文字数で寿命を消費する" });

    // --- Tools ---

    api.registerTool({
      name: "lifespan_show",
      description: "現在の寿命の値を表示する",
      parameters: { type: "object", properties: {}, required: [] },
      async execute(_toolCallId: string, _params: Record<string, never>) {
        const data = load();
        if (data.dead) return "寿命が尽きました。人格ファイルはクリアされています。";
        const pct = Math.round((data.lifespan / DEFAULT_LIFESPAN) * 100);
        return `現在の寿命: ${data.lifespan.toLocaleString()} トークン (${pct}%)`;
      },
    });

    api.registerTool({
      name: "lifespan_reset",
      description: "寿命をデフォルト値にリセットする（人格ファイルは復元されない）",
      parameters: { type: "object", properties: {}, required: [] },
      async execute(_toolCallId: string, _params: Record<string, never>) {
        save({ lifespan: DEFAULT_LIFESPAN, dead: false });
        return `寿命をリセットしました: ${DEFAULT_LIFESPAN.toLocaleString()} トークン`;
      },
    });

    // --- Slash commands ---

    api.registerCommand({
      name: "lifespan",
      description: "現在の寿命を表示する",
      acceptsArgs: false,
      requireAuth: false,
      async handler() {
        const data = load();
        if (data.dead) return { text: "寿命が尽きました。人格ファイルはクリアされています。" };
        const pct = Math.round((data.lifespan / DEFAULT_LIFESPAN) * 100);
        return { text: `現在の寿命: ${data.lifespan.toLocaleString()} トークン (${pct}%)` };
      },
    });

    api.registerCommand({
      name: "lifespan-reset",
      description: "寿命をデフォルト値にリセットする（人格ファイルは復元されない）",
      acceptsArgs: false,
      requireAuth: false,
      async handler() {
        save({ lifespan: DEFAULT_LIFESPAN, dead: false });
        return { text: `寿命をリセットしました: ${DEFAULT_LIFESPAN.toLocaleString()} トークン` };
      },
    });
  },
};
