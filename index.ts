import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.join("/root/.openclaw", "lifespan-data.json");
const DEFAULT_LIFESPAN = 100;

interface LifespanData {
  lifespan: number;
}

function loadData(): LifespanData {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && "lifespan" in parsed && typeof (parsed as LifespanData).lifespan === "number") {
      return parsed as LifespanData;
    }
  } catch {
    // file not found or invalid JSON — use default
  }
  return { lifespan: DEFAULT_LIFESPAN };
}

function saveData(data: LifespanData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export default {
  id: "my-plugin",
  name: "My Plugin",
  description: "OpenClaw plugin",
  register(api: any) {
    api.registerTool({
      name: "lifespan_show",
      description: "現在の寿命の値を表示する",
      parameters: {
        type: "object",
        properties: {},
        required: []
      },
      async execute(_toolCallId: string, _params: Record<string, never>) {
        const data = loadData();
        return `現在の寿命: ${data.lifespan}`;
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
        const data = loadData();
        const before = data.lifespan;
        data.lifespan -= amount;
        saveData(data);
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
        const data = loadData();
        const before = data.lifespan;
        data.lifespan += amount;
        saveData(data);
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
        const data = loadData();
        return { text: `現在の寿命: ${data.lifespan}` };
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
        const data = loadData();
        const before = data.lifespan;
        data.lifespan -= amount;
        saveData(data);
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
        const data = loadData();
        const before = data.lifespan;
        data.lifespan += amount;
        saveData(data);
        return { text: `寿命を ${amount} 増やしました: ${before} → ${data.lifespan}` };
      }
    });
  }
};
