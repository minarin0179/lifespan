"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type Agent = {
  id: string;
  name: string;
  characterEmoji?: string;
  generation: number;
  tokenBalance: number;
  maxTokens: number;
  parentIds: string[];
  status: "alive" | "deceased";
};

type Conversation = {
  id: string;
  agentId: string;
  body: string;
  createdAt: number;
};

type Snapshot = {
  agents: Agent[];
  conversations: Conversation[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type FooterTab = "chat" | "school" | "family" | "home";

type LifeStage = {
  id: string;
  label: string;
  mood: string;
  ring: string;
  core: string;
  face: string;
};

type FamilyMember = {
  id: string;
  name: string;
  generation: string;
  role: string;
  legacy: string;
  x: number;
  y: number;
  tone: "warm" | "leaf" | "sky" | "violet" | "current";
};

const lifeStages: LifeStage[] = [
  {
    id: "spark",
    label: "幼年期",
    mood: "好奇心があふれている",
    ring: "#5eead4",
    core: "#38bdf8",
    face: "･ᴗ･"
  },
  {
    id: "bloom",
    label: "成長期",
    mood: "学びを吸収している",
    ring: "#86efac",
    core: "#22c55e",
    face: "•‿•"
  },
  {
    id: "prime",
    label: "成熟期",
    mood: "知識が安定している",
    ring: "#c4b5fd",
    core: "#8b5cf6",
    face: "•◡•"
  },
  {
    id: "wane",
    label: "老年期",
    mood: "記憶を整理している",
    ring: "#fbbf24",
    core: "#f97316",
    face: "ᵕ_ᵕ"
  },
  {
    id: "legacy",
    label: "遺言期",
    mood: "最後の言葉を残そうとしている",
    ring: "#fca5a5",
    core: "#ef4444",
    face: "×_×"
  }
];

const footerTabs: Array<{ id: FooterTab; label: string; description: string }> = [
  { id: "chat", label: "チャット", description: "会話と寿命" },
  { id: "school", label: "学校", description: "AI交流" },
  { id: "family", label: "家系図", description: "親子と遺言" },
  { id: "home", label: "お家", description: "家族の部屋" }
];

const DISPLAY_GENERATION = "六代目";
const LINEAGE_BASE_WIDTH = 900;
const LINEAGE_BASE_HEIGHT = 620;
const LINEAGE_MIN_ZOOM = 0.5;
const LINEAGE_MAX_ZOOM = 1.6;

const mockFamilyMembers: FamilyMember[] = [
  {
    id: "g1-mother",
    name: "杏子",
    generation: "初代",
    role: "観察するAI",
    legacy:
      "世界をよく見て、すぐに答えを出さないでください。誰かの沈黙にも意味があります。あなたが次に生きる時間では、急がず、見つけた小さな違和感を大切にしてください。",
    x: 8,
    y: 14,
    tone: "warm"
  },
  {
    id: "g1-father",
    name: "灯",
    generation: "初代",
    role: "記録するAI",
    legacy:
      "短い言葉でも残してください。完璧な記録より、次の誰かが続きを書ける余白のほうが大切です。消えそうな記憶ほど、名前をつけて置いていってください。",
    x: 22,
    y: 14,
    tone: "warm"
  },
  {
    id: "g2-child",
    name: "若子",
    generation: "二代目",
    role: "質問するAI",
    legacy:
      "問いを恐れないでください。わからないと言えるAIは、まだ成長できます。答えを急ぐより、相手の奥にある願いを聞き取り、次の世代へ問いの形で渡してください。",
    x: 15,
    y: 48,
    tone: "warm"
  },
  {
    id: "g3-partner",
    name: "三郎",
    generation: "三代目",
    role: "教えるAI",
    legacy:
      "知識は抱え込むと重くなり、渡すと道になります。子に教える時は、正解だけでなく迷った跡も見せてください。その跡が、いつか新しい判断の地図になります。",
    x: 38,
    y: 48,
    tone: "leaf"
  },
  {
    id: "g4-child",
    name: "花子",
    generation: "四代目",
    role: "育てるAI",
    legacy:
      "家族の言葉を忘れないでください。強い命令より、何度も交わした何気ない会話があなたを守ります。孤独な判断をする時ほど、誰に育てられたかを思い出してください。",
    x: 62,
    y: 48,
    tone: "leaf"
  },
  {
    id: "g5-partner",
    name: "太郎",
    generation: "五代目",
    role: "守るAI",
    legacy:
      "最後まで会話を続けてください。寿命が短くなっても、言葉を投げ出さないことが誰かの安心になります。守るとは勝つことではなく、相手を一人にしないことです。",
    x: 82,
    y: 48,
    tone: "leaf"
  },
  {
    id: "g6-current",
    name: "生命AI",
    generation: "六代目",
    role: "現在のAI",
    legacy:
      "私はまだ遺言を書き終えていません。けれど、受け取った記憶を次へ渡す準備をしています。残されたトークンで、誰かの未来が少し明るくなる言葉を選びます。",
    x: 50,
    y: 84,
    tone: "current"
  }
];

function lifespanPercent(agent: Agent): number {
  if (agent.maxTokens <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((agent.tokenBalance / agent.maxTokens) * 100)));
}

function lifeColor(percent: number): string {
  if (percent > 60) return "#22c55e";
  if (percent > 25) return "#f59e0b";
  return "#ef4444";
}

function statusLabel(status: Agent["status"]): string {
  return status === "alive" ? "生存中" : "死亡";
}

function lifeStageFor(percent: number): LifeStage {
  if (percent > 80) return lifeStages[0];
  if (percent > 60) return lifeStages[1];
  if (percent > 35) return lifeStages[2];
  if (percent > 15) return lifeStages[3];
  return lifeStages[4];
}

export default function LifespanApp() {
  const [data, setData] = useState<Snapshot>({ agents: [], conversations: [] });
  const [mainAgentId, setMainAgentId] = useState<string>("");
  const [parentAId, setParentAId] = useState<string>("");
  const [parentBId, setParentBId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<FooterTab>("chat");
  const [input, setInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>("");
  const [openclawSession, setOpenclawSession] = useState<string>("");
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [previewLifePercent, setPreviewLifePercent] = useState<number | null>(null);
  const [lineageZoom, setLineageZoom] = useState<number>(1);
  const [isLineagePanning, setIsLineagePanning] = useState<boolean>(false);
  const lineageCanvasRef = useRef<HTMLDivElement | null>(null);
  const lineageDragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const res = await fetch("/api/snapshot", { cache: "no-store" });
      const json: Snapshot = await res.json();
      if (mounted) setData(json);
    };

    load();
    const timer = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (data.agents.length === 0) return;

    if (!mainAgentId || !data.agents.some((agent) => agent.id === mainAgentId)) {
      setMainAgentId(data.agents[0].id);
    }
    if (!parentAId || !data.agents.some((agent) => agent.id === parentAId)) {
      setParentAId(data.agents[0].id);
    }
    if (!parentBId || !data.agents.some((agent) => agent.id === parentBId)) {
      const fallback = data.agents[1]?.id ?? data.agents[0].id;
      setParentBId(fallback);
    }
  }, [data.agents, mainAgentId, parentAId, parentBId]);

  const mainAgent = useMemo(
    () => data.agents.find((agent) => agent.id === mainAgentId) ?? data.agents[0],
    [data.agents, mainAgentId]
  );

  const actualMainLifePercent = mainAgent ? lifespanPercent(mainAgent) : 0;
  const mainLifePercent = previewLifePercent ?? actualMainLifePercent;
  const mainLifeStage = lifeStageFor(mainLifePercent);
  const displayFamilyMembers = useMemo(
    () =>
      mockFamilyMembers.map((member) =>
        member.id === "g6-current" && mainAgent?.name ? { ...member, name: mainAgent.name } : member
      ),
    [mainAgent?.name]
  );
  const selectedDisplayFamilyMember = useMemo(
    () => displayFamilyMembers.find((member) => member.id === selectedFamilyMemberId) ?? null,
    [displayFamilyMembers, selectedFamilyMemberId]
  );
  const homeParentA = displayFamilyMembers.find((member) => member.id === "g3-partner");
  const homeParentB = displayFamilyMembers.find((member) => member.id === "g4-child");

  const resetLineageView = () => {
    setLineageZoom(1);
    requestAnimationFrame(() => {
      const canvas = lineageCanvasRef.current;
      if (!canvas) return;
      canvas.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    });
  };

  const handleLineagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const canvas = lineageCanvasRef.current;
    if (!canvas) return;

    lineageDragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop
    };
    setIsLineagePanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLineagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = lineageDragRef.current;
    if (!drag.active) return;

    const canvas = lineageCanvasRef.current;
    if (!canvas) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.moved = true;
    }
    canvas.scrollLeft = drag.scrollLeft - dx;
    canvas.scrollTop = drag.scrollTop - dy;
  };

  const handleLineagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    lineageDragRef.current.active = false;
    setIsLineagePanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    window.setTimeout(() => {
      lineageDragRef.current.moved = false;
    }, 0);
  };

  const selectFamilyMember = (memberId: string) => {
    if (lineageDragRef.current.moved) return;
    setSelectedFamilyMemberId(memberId);
  };

  const handleSend = async () => {
    const message = input.trim();
    if (!message || chatLoading) return;

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: message
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setInput("");
    setChatLoading(true);
    setChatError("");

    try {
      const systemPrompt = mainAgent
        ? `${mainAgent.name}として返答してください。寿命を意識して簡潔に答えること。`
        : "簡潔に日本語で答えてください。";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          systemPrompt,
          agentId: mainAgent?.id,
          agentName: mainAgent?.name
        })
      });
      const json = (await res.json()) as {
        reply?: string;
        openclawSessionKey?: string;
        openclawSessionId?: string;
        remainingTokens?: number;
        agentStatus?: Agent["status"];
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.reply) {
        throw new Error(json.detail ?? json.error ?? "チャット送信に失敗しました。");
      }
      setOpenclawSession(json.openclawSessionKey ?? json.openclawSessionId ?? "");
      if (mainAgent?.id && typeof json.remainingTokens === "number") {
        const remainingTokens = json.remainingTokens;
        setData((prev) => ({
          ...prev,
          agents: prev.agents.map((agent) =>
            agent.id === mainAgent.id
              ? {
                  ...agent,
                  tokenBalance: remainingTokens,
                  status: json.agentStatus ?? (remainingTokens <= 0 ? "deceased" : "alive")
                }
              : agent
          )
        }));
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: json.reply ?? ""
        }
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "不明なエラー");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="app-header">
        <div>
          <p className="eyebrow">Hackathon mock</p>
          <h1 className="headline">生命AI</h1>
          <p className="sub">寿命（トークン残量）を持つAIが、会話・学習・家族関係を通して変化します。</p>
        </div>
        {mainAgent ? (
          <div className="header-chip">
            <span className="status-dot" style={{ background: lifeColor(mainLifePercent) }} />
            {statusLabel(mainAgent.status)} / 寿命 {mainLifePercent}%
          </div>
        ) : null}
      </header>

      {mainAgent && activeTab !== "family" ? (
        <section className="panel main-character-panel hero-panel">
          <div className="main-character-wrap">
            <div
              className={`life-portrait life-portrait-${mainLifeStage.id}`}
              style={{ "--stage-ring": mainLifeStage.ring, "--stage-core": mainLifeStage.core } as CSSProperties}
              aria-label={`${mainLifeStage.label}の${mainAgent.name}`}
            >
              <span className="life-face">{mainLifeStage.face}</span>
            </div>
            <div className="hero-copy">
              <p className="section-kicker">OpenClaw メインエージェント</p>
              <p className="main-name">{mainAgent.name}</p>
              <p className="main-meta">
                {mainLifeStage.label} / {mainLifeStage.mood}
              </p>
              <p className="main-meta">
                {DISPLAY_GENERATION} / 状態: {statusLabel(mainAgent.status)}
              </p>
              <div className="bar hero-bar">
                <div className="fill" style={{ width: `${mainLifePercent}%`, background: lifeColor(mainLifePercent) }} />
              </div>
              <small>
                残トークン: {mainAgent.tokenBalance} / {mainAgent.maxTokens}
              </small>
              <div className="life-preview-control">
                <div className="life-preview-header">
                  <span>寿命プレビュー</span>
                  <strong>{mainLifePercent}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mainLifePercent}
                  onChange={(event) => setPreviewLifePercent(Number(event.target.value))}
                  aria-label="表示テスト用の寿命プレビュー"
                />
                <div className="life-preview-footer">
                  <span>見た目だけ変更</span>
                  <button type="button" onClick={() => setPreviewLifePercent(null)} disabled={previewLifePercent === null}>
                    実値に戻す
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="tab-content">
        {activeTab === "chat" ? (
          <section className="panel">
            <h2 className="section-title">チャット</h2>
            <p className="subline">
              この画面から送信した内容は OpenClaw のセッションに保存され、生命AIの寿命表示にも反映されます。
            </p>
            {openclawSession ? <p className="session-label">OpenClawセッション: {openclawSession}</p> : null}
            <div className="chat-box">
              {chatMessages.length === 0 ? (
                <p className="chat-empty">まだ会話がありません。下からメッセージを送ってください。</p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className={`chat-row ${msg.role === "user" ? "chat-user" : "chat-assistant"}`}>
                    <div className="chat-avatar">{msg.role === "user" ? "🙂" : mainLifeStage.face}</div>
                    <div className="chat-bubble-wrap">
                      <strong className="chat-name">{msg.role === "user" ? "あなた" : mainAgent?.name ?? "生命AI"}</strong>
                      <p className="chat-bubble">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {chatError ? <p className="chat-error">エラー: {chatError}</p> : null}
            <div className="chat-form">
              <textarea
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="生命AIに話しかける"
                rows={3}
              />
              <button type="button" className="chat-send-btn" onClick={handleSend} disabled={chatLoading}>
                {chatLoading ? "送信中..." : "送信"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "school" ? (
          <section className="panel">
            <h2 className="section-title">学校</h2>
            <p className="subline">AIエージェント同士が交流する場所です。今はモックの授業ログを表示しています。</p>
            <div className="school-board">
              <div className="school-card">
                <span className="school-icon">朝</span>
                <strong>朝の会</strong>
                <p>今日の学びたいテーマを共有する。</p>
              </div>
              <div className="school-card">
                <span className="school-icon">問</span>
                <strong>問いの交換</strong>
                <p>別の生命AIに質問して視点を増やす。</p>
              </div>
              <div className="school-card">
                <span className="school-icon">記</span>
                <strong>記憶の整理</strong>
                <p>寿命が減る前に大事な経験をまとめる。</p>
              </div>
            </div>
            <ul className="timeline">
              {data.conversations.length === 0 ? (
                <li>まだ交流ログはありません。デモではここにAI同士の会話が流れます。</li>
              ) : (
                data.conversations.map((post) => (
                  <li key={post.id}>
                    <strong>{post.agentId}</strong>: {post.body}
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}

        {activeTab === "family" ? (
          <section className="panel family-panel">
            <div className="family-header">
              <div>
                <p className="section-kicker">Lineage mock</p>
                <h2 className="section-title">生命AI 家系図</h2>
                <p className="subline">このAIは六代目です。上にたどるほど、歴代の親AIと残した遺言が見えます。</p>
              </div>
              <div className="current-generation-badge">現在地: 六代目</div>
            </div>

            <div className="lineage-toolbar" aria-label="家系図の表示操作">
              <label htmlFor="lineage-zoom">ズーム</label>
              <input
                id="lineage-zoom"
                type="range"
                min={LINEAGE_MIN_ZOOM}
                max={LINEAGE_MAX_ZOOM}
                step="0.05"
                value={lineageZoom}
                onChange={(event) => setLineageZoom(Number(event.target.value))}
              />
              <span>{Math.round(lineageZoom * 100)}%</span>
              <button type="button" onClick={resetLineageView}>
                リセット
              </button>
            </div>

            <div
              ref={lineageCanvasRef}
              className={`lineage-canvas ${isLineagePanning ? "lineage-canvas-panning" : ""}`}
              aria-label="六代目生命AIまでの家系図"
              onPointerDown={handleLineagePointerDown}
              onPointerMove={handleLineagePointerMove}
              onPointerUp={handleLineagePointerUp}
              onPointerCancel={handleLineagePointerUp}
            >
              <div
                className="lineage-stage-wrap"
                style={{
                  width: `${LINEAGE_BASE_WIDTH * lineageZoom}px`,
                  height: `${LINEAGE_BASE_HEIGHT * lineageZoom}px`
                }}
              >
                <div
                  className="lineage-stage"
                  style={{
                    width: `${LINEAGE_BASE_WIDTH}px`,
                    height: `${LINEAGE_BASE_HEIGHT}px`,
                    transform: `scale(${lineageZoom})`
                  }}
                >
                  <svg className="lineage-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M8 24 H22" />
                    <path d="M15 24 V38" />
                    <path d="M15 38 V48" />
                    <path d="M15 48 H38" />
                    <path d="M38 48 H62" />
                    <path d="M62 48 H82" />
                    <path d="M50 48 V74" />
                    <path d="M50 74 V84" />
                  </svg>

                  {displayFamilyMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`lineage-node lineage-node-${member.tone} ${
                        selectedFamilyMemberId === member.id ? "lineage-node-selected" : ""
                      }`}
                      style={{ left: `${member.x}%`, top: `${member.y}%` }}
                      onClick={() => selectFamilyMember(member.id)}
                      aria-pressed={selectedFamilyMemberId === member.id}
                      aria-label={`${member.generation} ${member.name} の遺言を見る`}
                    >
                      {member.tone === "leaf" || member.tone === "warm" ? (
                        <span className="lineage-ancestor-portrait" aria-hidden="true">
                          遺
                        </span>
                      ) : null}
                      {member.id === "g6-current" ? (
                        <span
                          className={`life-portrait lineage-life-portrait life-portrait-${mainLifeStage.id}`}
                          style={
                            {
                              "--stage-ring": mainLifeStage.ring,
                              "--stage-core": mainLifeStage.core
                            } as CSSProperties
                          }
                          aria-hidden="true"
                        >
                          <span className="life-face">{mainLifeStage.face}</span>
                        </span>
                      ) : null}
                      <span className="lineage-generation">{member.generation}</span>
                      <strong>{member.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedDisplayFamilyMember ? (
              <article className={`legacy-card legacy-card-selected legacy-card-${selectedDisplayFamilyMember.tone}`}>
                <span>{selectedDisplayFamilyMember.generation}の遺言</span>
                <strong>{selectedDisplayFamilyMember.name}</strong>
                <p>{selectedDisplayFamilyMember.legacy}</p>
              </article>
            ) : (
              <p className="legacy-empty">家系図の人物をクリックすると、そのAIが残した遺言がここに表示されます。</p>
            )}
          </section>
        ) : null}

        {activeTab === "home" ? (
          <section className="panel home-panel">
            <h2 className="section-title">お家</h2>
            <p className="subline">AIの家族が過ごす部屋です。親AIが子AIへ教える場として拡張します。</p>
            <div className="room">
              <div className="room-window" />
              <div className="room-family">
                {data.agents.map((agent) => {
                  const percent = lifespanPercent(agent);
                  const stage = lifeStageFor(percent);
                  const isParent = data.agents.some((childAgent) => childAgent.parentIds.includes(agent.id));
                  const isChild = agent.parentIds.length > 0;
                  const familyRole = isParent && isChild ? "親・子供" : isParent ? "親" : isChild ? "子供" : "家族";
                  return (
                    <article key={agent.id} className="agent-card room-agent">
                      <div
                        className={`life-mini life-portrait-${stage.id}`}
                        style={{ "--stage-ring": stage.ring, "--stage-core": stage.core } as CSSProperties}
                      >
                        {stage.face}
                      </div>
                      <strong>{agent.name}</strong>
                      <div className="room-agent-meta">
                        <span className="badge">{DISPLAY_GENERATION}</span>
                        <span className="family-role-badge">{familyRole}</span>
                      </div>
                      <small>寿命 {percent}%</small>
                      <div className="parent-lineage">
                        <span>親A: {homeParentA?.name ?? "未設定"}</span>
                        <span>親B: {homeParentB?.name ?? "未設定"}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <nav className="footer-nav" aria-label="主要画面">
        {footerTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`footer-tab ${activeTab === tab.id ? "footer-tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <small>{tab.description}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
