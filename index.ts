import fs from "node:fs";
import path from "node:path";

const DEFAULT_LIFESPAN = 100;

interface LifespanData {
  lifespan: number;
}

function resolveDataPath(pluginId: string): { dir: string; file: string } {
  const stateDir = process.env.OPENCLAW_STATE_DIR ?? path.join(process.env.HOME ?? "/root", ".openclaw");
  const dir = path.join(stateDir, pluginId);
  return { dir, file: path.join(dir, "lifespan.json") };
}

function loadData(filePath: string): LifespanData {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && "lifespan" in parsed && typeof (parsed as LifespanData).lifespan === "number") {
      return parsed as LifespanData;
    }
  } catch {
    // file not found or invalid JSON — use default
  }
  return { lifespan: DEFAULT_LIFESPAN };
}

function saveData(dir: string, filePath: string, data: LifespanData): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export default {
  id: "lifespan",
  name: "Lifespan",
  description: "エージェントの寿命を JSON ファイルで管理するプラグイン",
  register(api: any) {
    const { dir, file } = resolveDataPath(api.id);
    const load = () => loadData(file);
    const save = (data: LifespanData) => saveData(dir, file, data);

    api.registerTool({
      name: "lifespan_show",
      description: "現在の寿命の値を表示する",
      parameters: {
        type: "object",
        properties: {},
        required: []
      },
      async execute(_toolCallId: string, _params: Record<string, never>) {
        return `現在の寿命: ${load().lifespan}`;
      }
    });

    api.registerTool({
      name: "lifespan_decrease",
      description: "寿命を指定した値だけ減らす",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "減らす量（正の数）" }
        },
        required: ["amount"]
      },
      async execute(_toolCallId: string, { amount }: { amount: number }) {
        const data = load();
        const before = data.lifespan;
        data.lifespan -= amount;
        save(data);
        return `寿命を ${amount} 減らしました: ${before} → ${data.lifespan}`;
      }
    });

    api.registerTool({
      name: "lifespan_increase",
      description: "寿命を指定した値だけ増やす",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "増やす量（正の数）" }
        },
        required: ["amount"]
      },
      async execute(_toolCallId: string, { amount }: { amount: number }) {
        const data = load();
        const before = data.lifespan;
        data.lifespan += amount;
        save(data);
        return `寿命を ${amount} 増やしました: ${before} → ${data.lifespan}`;
      }
    });

    // --- スラッシュコマンド ---

    api.registerCommand({
      name: "lifespan",
      description: "現在の寿命を表示する",
      acceptsArgs: false,
      requireAuth: false,
      async handler() {
        return { text: `現在の寿命: ${load().lifespan}` };
      }
    });

    api.registerCommand({
      name: "lifespan-decrease",
      description: "寿命を減らす。例: /lifespan-decrease 30",
      acceptsArgs: true,
      requireAuth: false,
      async handler(ctx: { args?: string }) {
        const amount = Number(ctx.args?.trim());
        if (!Number.isFinite(amount) || amount <= 0) {
          return { text: "使い方: /lifespan-decrease <正の数>" };
        }
        const data = load();
        const before = data.lifespan;
        data.lifespan -= amount;
        save(data);
        return { text: `寿命を ${amount} 減らしました: ${before} → ${data.lifespan}` };
      }
    });

    api.registerCommand({
      name: "lifespan-increase",
      description: "寿命を増やす。例: /lifespan-increase 15",
      acceptsArgs: true,
      requireAuth: false,
      async handler(ctx: { args?: string }) {
        const amount = Number(ctx.args?.trim());
        if (!Number.isFinite(amount) || amount <= 0) {
          return { text: "使い方: /lifespan-increase <正の数>" };
        }
        const data = load();
        const before = data.lifespan;
        data.lifespan += amount;
        save(data);
        return { text: `寿命を ${amount} 増やしました: ${before} → ${data.lifespan}` };
      }
    });
  }
};
