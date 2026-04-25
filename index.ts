import fs from "node:fs";
import path from "node:path";

const DEFAULT_LIFESPAN = 30_000; // output tokens (~150-300 conversational turns)

const OPENCLAW_DIR =
  process.env.OPENCLAW_STATE_DIR ?? path.join(process.env.HOME ?? "/root", ".openclaw");
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, "workspace");

const CLEARABLE_FILES = ["IDENTITY.md", "SOUL.md", "USER.md"];

interface LifespanData {
  lifespan: number;
  dead: boolean;
}

function resolveDataPath(): { dir: string; file: string } {
  const dir = path.join(OPENCLAW_DIR, "lifespan");
  return { dir, file: path.join(dir, "lifespan.json") };
}

function loadData(filePath: string): LifespanData {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      const p = parsed as Record<string, unknown>;
      if (typeof p.lifespan === "number" && typeof p.dead === "boolean") {
        return { lifespan: p.lifespan, dead: p.dead };
      }
    }
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
  for (const name of CLEARABLE_FILES) {
    const filePath = path.join(WORKSPACE_DIR, name);
    try {
      fs.writeFileSync(filePath, "", "utf-8");
    } catch {
      // ignore if workspace doesn't exist
    }
  }
}

function extractOutputTokensOrChars(message: unknown): number {
  if (typeof message !== "object" || message === null) return 0;
  const msg = message as Record<string, unknown>;

  // Use only output tokens — input contains the entire conversation history
  // which grows with each turn and would cause compounding overcounting.
  const usage = msg.usage as Record<string, unknown> | undefined;
  if (usage && typeof usage.output === "number" && usage.output > 0) {
    return usage.output;
  }

  // Fallback: character count of output text (provider doesn't report tokens)
  const content = msg.content;
  if (Array.isArray(content)) {
    return content.reduce((sum: number, block: unknown) => {
      if (typeof block === "object" && block !== null) {
        const b = block as Record<string, unknown>;
        if (typeof b.text === "string") return sum + b.text.length;
      }
      return sum;
    }, 0);
  }
  if (typeof content === "string") return content.length;
  return 0;
}

export default {
  id: "lifespan",
  name: "Lifespan",
  description: "LLM応答ごとにトークン数で寿命が減り、尽きると人格ファイルをクリアするプラグイン",
  register(api: any) {
    const { dir, file } = resolveDataPath();
    const load = () => loadData(file);
    const save = (data: LifespanData) => saveData(dir, file, data);

    if (!fs.existsSync(file)) {
      save({ lifespan: DEFAULT_LIFESPAN, dead: false });
    }

    function consume(amount: number): void {
      if (amount <= 0) return;
      const data = load();
      if (data.dead) return;
      data.lifespan -= amount;
      if (data.lifespan <= 0) {
        data.lifespan = 0;
        data.dead = true;
        save(data);
        clearPersonality();
      } else {
        save(data);
      }
    }

    // before_message_write fires for every session message (user + assistant).
    // Only count assistant messages — they carry usage.totalTokens from the LLM call.
    // This hook does NOT require allowConversationAccess.
    api.on("before_message_write", (event: any) => {
      const message = event?.message;
      if (message?.role !== "assistant") return;
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
