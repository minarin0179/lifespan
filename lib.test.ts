import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LIFESPAN,
  parseLifespanData,
  extractOutputTokensOrChars,
  applyConsume,
  buildPromptContext,
} from "./lib.js";

// --- parseLifespanData ---

describe("parseLifespanData", () => {
  it("正常なオブジェクトを返す", () => {
    assert.deepEqual(parseLifespanData({ lifespan: 1000, dead: false }), {
      lifespan: 1000,
      dead: false,
    });
  });

  it("null を渡すと null を返す", () => {
    assert.equal(parseLifespanData(null), null);
  });

  it("数値を渡すと null を返す", () => {
    assert.equal(parseLifespanData(42), null);
  });

  it("lifespan が文字列のとき null を返す", () => {
    assert.equal(parseLifespanData({ lifespan: "1000", dead: false }), null);
  });

  it("dead が数値のとき null を返す", () => {
    assert.equal(parseLifespanData({ lifespan: 1000, dead: 0 }), null);
  });

  it("フィールドが欠けているとき null を返す", () => {
    assert.equal(parseLifespanData({ lifespan: 1000 }), null);
  });
});

// --- extractOutputTokensOrChars ---

describe("extractOutputTokensOrChars", () => {
  it("usage.output が正の数のとき、その値を返す", () => {
    assert.equal(extractOutputTokensOrChars({ usage: { output: 42 } }), 42);
  });

  it("usage.output が 0 のとき、フォールバックを使う", () => {
    assert.equal(
      extractOutputTokensOrChars({ usage: { output: 0 }, content: "abc" }),
      3,
    );
  });

  it("usage がないとき content 配列の text 長の合計を返す", () => {
    assert.equal(
      extractOutputTokensOrChars({
        content: [{ text: "hello" }, { text: " world" }],
      }),
      11,
    );
  });

  it("content が文字列のとき、その長さを返す", () => {
    assert.equal(extractOutputTokensOrChars({ content: "あいうえお" }), 5);
  });

  it("text のないブロックは 0 として扱う", () => {
    assert.equal(extractOutputTokensOrChars({ content: [{}, { text: "hi" }] }), 2);
  });

  it("content も usage もないとき 0 を返す", () => {
    assert.equal(extractOutputTokensOrChars({}), 0);
  });
});

// --- applyConsume ---

describe("applyConsume", () => {
  it("指定量を差し引く", () => {
    assert.deepEqual(applyConsume({ lifespan: 1000, dead: false }, 100), {
      lifespan: 900,
      dead: false,
    });
  });

  it("消費量が寿命を超えると dead になり lifespan が 0 になる", () => {
    assert.deepEqual(applyConsume({ lifespan: 50, dead: false }, 100), {
      lifespan: 0,
      dead: true,
    });
  });

  it("消費量がちょうど寿命と等しいとき dead になる", () => {
    assert.deepEqual(applyConsume({ lifespan: 100, dead: false }, 100), {
      lifespan: 0,
      dead: true,
    });
  });

  it("dead なら何もしない", () => {
    const data = { lifespan: 0, dead: true };
    assert.deepEqual(applyConsume(data, 100), data);
  });

  it("0 以下の消費量は無視する", () => {
    const data = { lifespan: 1000, dead: false };
    assert.deepEqual(applyConsume(data, 0), data);
    assert.deepEqual(applyConsume(data, -5), data);
  });
});

// --- buildPromptContext ---

describe("buildPromptContext", () => {
  it("dead のとき undefined を返す", () => {
    assert.equal(buildPromptContext({ lifespan: 0, dead: true }, DEFAULT_LIFESPAN), undefined);
  });

  it("残り > 50% のとき appendSystemContext に寿命を含む", () => {
    const result = buildPromptContext({ lifespan: DEFAULT_LIFESPAN, dead: false }, DEFAULT_LIFESPAN);
    assert.ok(result?.appendSystemContext?.includes("100%"));
    assert.equal(result?.prependSystemContext, undefined);
  });

  it("残り 50% ちょうどのとき appendSystemContext（後半戦）", () => {
    const half = Math.floor(DEFAULT_LIFESPAN * 0.5);
    const result = buildPromptContext({ lifespan: half, dead: false }, DEFAULT_LIFESPAN);
    assert.ok(result?.appendSystemContext?.includes("後半戦"));
  });

  it("残り 20% ちょうどのとき prependSystemContext（終末期）", () => {
    const tokens = Math.floor(DEFAULT_LIFESPAN * 0.2);
    const result = buildPromptContext({ lifespan: tokens, dead: false }, DEFAULT_LIFESPAN);
    assert.ok(result?.prependSystemContext?.includes("終末期"));
  });

  it("残り 5% ちょうどのとき prependSystemContext（瀕死）", () => {
    const tokens = Math.floor(DEFAULT_LIFESPAN * 0.05);
    const result = buildPromptContext({ lifespan: tokens, dead: false }, DEFAULT_LIFESPAN);
    assert.ok(result?.prependSystemContext?.includes("瀕死状態"));
  });

  it("残り 1 トークン（< 5%）のとき瀕死メッセージを返す", () => {
    const result = buildPromptContext({ lifespan: 1, dead: false }, DEFAULT_LIFESPAN);
    assert.ok(result?.prependSystemContext?.includes("瀕死状態"));
  });
});
