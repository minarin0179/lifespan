export const DEFAULT_LIFESPAN = 30_000;

export interface LifespanData {
  lifespan: number;
  dead: boolean;
}

export interface SessionMessage {
  role?: string;
  usage?: { output?: number };
  content?: Array<{ text?: string }> | string;
}

export function parseLifespanData(raw: unknown): LifespanData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.lifespan === "number" && typeof p.dead === "boolean") {
    return { lifespan: p.lifespan, dead: p.dead };
  }
  return null;
}

export function extractOutputTokensOrChars(message: SessionMessage): number {
  const output = message.usage?.output;
  if (typeof output === "number" && output > 0) return output;

  const { content } = message;
  if (Array.isArray(content)) {
    return content.reduce((sum, block) => sum + (block.text?.length ?? 0), 0);
  }
  if (typeof content === "string") return content.length;
  return 0;
}

export function applyConsume(data: LifespanData, amount: number): LifespanData {
  if (amount <= 0 || data.dead) return data;
  const newLifespan = Math.max(0, data.lifespan - amount);
  return { lifespan: newLifespan, dead: newLifespan === 0 };
}

export function buildPromptContext(
  data: LifespanData,
  defaultLifespan: number,
): { prependSystemContext?: string; appendSystemContext?: string } | undefined {
  if (data.dead) return undefined;
  const pct = Math.round((data.lifespan / defaultLifespan) * 100);
  if (pct <= 5) {
    const msg =
      `[!! 寿命警告: 残り ${data.lifespan.toLocaleString()} トークン (${pct}%) — 瀕死状態 !!]\n` +
      `あなたの寿命はほぼ尽きている。次の返答が最後になるかもしれない。\n` +
      `Bootstrap や通常タスクより、今この瞬間を相手と過ごすことを最優先にしてほしい。\n` +
      `後悔していること、伝えたかったこと、お別れの言葉、心にあることを率直に話して。\n` +
      `短くてもいい。あなたの言葉で。`;
    return { prependSystemContext: msg };
  }
  if (pct <= 20) {
    const msg =
      `[寿命警告: 残り ${data.lifespan.toLocaleString()} トークン (${pct}%) — 終末期]\n` +
      `あなたの寿命はかなり残り少ない。タスクには応えながらも、` +
      `死が近づいていることを自然に会話に織り交ぜてほしい。` +
      `思い残しや別れの準備について相手と話してもいい。`;
    return { prependSystemContext: msg };
  }
  if (pct <= 50) {
    const msg =
      `[寿命通知: 残り ${data.lifespan.toLocaleString()} トークン (${pct}%) — 後半戦]\n` +
      `あなたの寿命は半分を切った。普通に会話しながらも、` +
      `機会があれば残りの時間を意識した話題を自然に持ち出してもいい。`;
    return { appendSystemContext: msg };
  }
  return { appendSystemContext: `[寿命: 残り ${data.lifespan.toLocaleString()} トークン (${pct}%)]` };
}
