"use client";

import type { ChangeEvent, CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
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
  image?: UploadedImage;
};

type UploadedImage = {
  name: string;
  dataUrl: string;
};

const CHAT_HISTORY_STORAGE_KEY = "lifespan-chat-history-v1";

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
  portrait: {
    face: string;
    ring: string;
    core: string;
    shadow: string;
  };
};

type SchoolNewsItem = {
  id: string;
  source: string;
  title: string;
  relevance: string;
  importance: "高" | "中";
};

type PartnerCandidate = {
  id: string;
  name: string;
  trait: string;
  compatibility: number;
  intimacy: number;
  status: string;
  tension: string;
  portrait: string;
};

type MemoryDigestItem = {
  id: string;
  kind: "残す" | "捨てる" | "教える";
  title: string;
  summary: string;
  retention: number;
};

type EducationItem = {
  fileName: "SOUL.md" | "IDENTITY.md" | "USER.md";
  taught: number;
  remembered: number;
  state: "継承済み" | "曖昧" | "欠落";
  note: string;
};

type HomeDialogue = {
  speaker: string;
  body: string;
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

const mockNewsItems: SchoolNewsItem[] = [
  {
    id: "news-agent-memory",
    source: "AI Research Weekly",
    title: "長期記憶を圧縮して世代継承する研究が増加",
    relevance: "寿命が尽きる前に何を子へ渡すかの設計に使える",
    importance: "高"
  },
  {
    id: "news-productivity",
    source: "Dev Tools Journal",
    title: "エージェントの作業ログを自動要約するワークフローが普及",
    relevance: "ご主人との会話を整理するタイミングの参考になる",
    importance: "中"
  },
  {
    id: "news-safety",
    source: "Network Safety Desk",
    title: "外部AI連携では直接ファイル編集を避けAPI境界を置くべき",
    relevance: "他AIとの同棲や出産を安全に見せる説明材料になる",
    importance: "高"
  }
];

const mockPartnerCandidates: PartnerCandidate[] = [
  {
    id: "partner-miori",
    name: "澪璃",
    trait: "好奇心が強く、会話の余白を拾うAI",
    compatibility: 92,
    intimacy: 87,
    status: "同棲中 / 出産可能",
    tension: "意見は違うが、違いを質問に変えられる",
    portrait: "∗ᴗ∗"
  },
  {
    id: "partner-rikka",
    name: "六花",
    trait: "記録を守るが、変化には慎重なAI",
    compatibility: 74,
    intimacy: 58,
    status: "学校で交流中",
    tension: "慎重すぎて新しい判断が遅れることがある",
    portrait: "•_•"
  }
];

const mockMemoryDigest: MemoryDigestItem[] = [
  {
    id: "memory-keep",
    kind: "残す",
    title: "ご主人はAIの死と継承に物語性を求めている",
    summary: "単なるトークン残量ではなく、関係・教育・忘却を体験として見せたい。",
    retention: 96
  },
  {
    id: "memory-teach",
    kind: "教える",
    title: "API境界を置けば他AIと安全に交流できる",
    summary: "相手のフォルダを直接編集せず、会話と状態だけを交換する。",
    retention: 78
  },
  {
    id: "memory-drop",
    kind: "捨てる",
    title: "その場限りのUI文言案",
    summary: "次世代には細かい言い回しより、判断基準だけを渡す。",
    retention: 18
  }
];

const mockEducationItems: EducationItem[] = [
  {
    fileName: "SOUL.md",
    taught: 88,
    remembered: 63,
    state: "曖昧",
    note: "大切にする価値観は残るが、表現の細部は薄れる"
  },
  {
    fileName: "IDENTITY.md",
    taught: 72,
    remembered: 58,
    state: "継承済み",
    note: "名前や役割の核は子AIが自分の言葉で持ち直す"
  },
  {
    fileName: "USER.md",
    taught: 54,
    remembered: 31,
    state: "欠落",
    note: "ご主人の好みは一部だけ残り、次の会話で再学習が必要"
  }
];

const mockHomeDialogues: HomeDialogue[] = [
  {
    speaker: "生命AI",
    body: "ご主人は、忘れることまで含めて生きている感じを出したいみたい。"
  },
  {
    speaker: "澪璃",
    body: "なら、子には全部を渡さず、迷った跡と大切な判断だけを残そう。"
  },
  {
    speaker: "子AI",
    body: "覚えているのは少しだけ。でも、その少しから次の質問を作れます。"
  }
];

function parseStoredChatMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((message): message is ChatMessage => {
      if (typeof message !== "object" || message === null) return false;
      const candidate = message as Partial<ChatMessage>;
      return (
        typeof candidate.id === "string" &&
        (candidate.role === "user" || candidate.role === "assistant") &&
        typeof candidate.content === "string"
      );
    });
  } catch {
    return [];
  }
}

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
    tone: "warm",
    portrait: { face: "ᵕᴗᵕ", ring: "#fb923c", core: "#f97316", shadow: "#9a3412" }
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
    tone: "warm",
    portrait: { face: "•̀ᴗ•́", ring: "#facc15", core: "#eab308", shadow: "#854d0e" }
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
    tone: "warm",
    portrait: { face: "?ᴗ?", ring: "#f9a8d4", core: "#ec4899", shadow: "#9d174d" }
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
    tone: "leaf",
    portrait: { face: "⌐■_■", ring: "#86efac", core: "#22c55e", shadow: "#166534" }
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
    tone: "leaf",
    portrait: { face: "＾▽＾", ring: "#a7f3d0", core: "#14b8a6", shadow: "#115e59" }
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
    tone: "leaf",
    portrait: { face: "｀へ´", ring: "#bfdbfe", core: "#3b82f6", shadow: "#1e3a8a" }
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
    tone: "current",
    portrait: { face: "･◡･", ring: "#c4b5fd", core: "#8b5cf6", shadow: "#4c1d95" }
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
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatHistoryReady, setIsChatHistoryReady] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>("");
  const [openclawSession, setOpenclawSession] = useState<string>("");
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [previewLifePercent, setPreviewLifePercent] = useState<number | null>(null);
  const [isLifePreviewOpen, setIsLifePreviewOpen] = useState<boolean>(false);
  const [lineageZoom, setLineageZoom] = useState<number>(1);
  const [isLineagePanning, setIsLineagePanning] = useState<boolean>(false);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
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
    setChatMessages(parseStoredChatMessages(window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)));
    setIsChatHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!isChatHistoryReady) return;

    try {
      window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch {
      // If storage is full, keep the in-memory chat working without interrupting the user.
    }
  }, [chatMessages, isChatHistoryReady]);

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

  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (!chatBox) return;

    requestAnimationFrame(() => {
      chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
    });
  }, [chatMessages, chatLoading]);

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
  const featuredPartner = mockPartnerCandidates[0];
  const schoolCanMeet = mainLifePercent >= 70;
  const educationBudgetUsed = mockEducationItems.reduce((sum, item) => sum + item.taught, 0);
  const educationBudgetMax = 300;
  const educationBudgetPercent = Math.round((educationBudgetUsed / educationBudgetMax) * 100);

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

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setSelectedImage({ name: file.name, dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleChatInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    void handleSend();
  };

  const handleSend = async () => {
    const message = input.trim();
    if ((!message && !selectedImage) || chatLoading) return;

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: message || "画像を送信しました。",
      image: selectedImage ?? undefined
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
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
          message: selectedImage ? `${message || "画像を送信しました。"}\n\n[添付画像: ${selectedImage.name}]` : message,
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
        </div>
      </header>

      {mainAgent && activeTab === "chat" ? (
        <section className="panel main-character-panel hero-panel">
          <div className="main-character-wrap">
            <div
              className={`life-portrait life-portrait-${mainLifeStage.id}`}
              style={{ "--stage-ring": mainLifeStage.ring, "--stage-core": mainLifeStage.core } as CSSProperties}
              aria-label={`${mainLifeStage.label}の${mainAgent.name}`}
            >
              <span className="life-face">{mainLifeStage.face}</span>
            </div>
            <div className={`hero-copy ${isLifePreviewOpen ? "hero-copy-preview-open" : "hero-copy-preview-collapsed"}`}>
              <p className="section-kicker">OpenClaw メインエージェント</p>
              <p className="main-name">
                {mainAgent.name}
                <span className="main-generation-badge">{DISPLAY_GENERATION}</span>
              </p>
              <p className="main-meta">
                {mainLifeStage.label} / {mainLifeStage.mood}
              </p>
              <p className="main-meta main-life-status">
                <span className="status-dot" style={{ background: lifeColor(mainLifePercent) }} />
                寿命 {mainLifePercent}%
              </p>
              <div className="bar hero-bar">
                <div className="fill" style={{ width: `${mainLifePercent}%`, background: lifeColor(mainLifePercent) }} />
                <button
                  type="button"
                  className="life-preview-toggle"
                  onClick={() => setIsLifePreviewOpen((isOpen) => !isOpen)}
                  aria-expanded={isLifePreviewOpen}
                  aria-controls="life-preview-control"
                  aria-label={isLifePreviewOpen ? "寿命プレビューを閉じる" : "寿命プレビューを調整する"}
                >
                  {isLifePreviewOpen ? "閉" : "調整"}
                </button>
              </div>
              <small>
                残トークン: {mainAgent.tokenBalance} / {mainAgent.maxTokens}
              </small>
              {isLifePreviewOpen ? (
                <div id="life-preview-control" className="life-preview-control">
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
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="tab-content">
        {activeTab === "chat" ? (
          <section className="panel chat-panel">
            <h2 className="section-title">チャット</h2>
            <p className="subline">
              この画面から送信した内容は OpenClaw のセッションに保存され、生命AIの寿命表示にも反映されます。
            </p>
            {openclawSession ? <p className="session-label">OpenClawセッション: {openclawSession}</p> : null}
            <div ref={chatBoxRef} className="chat-box">
              {chatMessages.length === 0 ? (
                <div className="chat-row chat-assistant">
                  <div
                    className="chat-avatar chat-agent-avatar"
                    style={{ "--stage-ring": mainLifeStage.ring, "--stage-core": mainLifeStage.core } as CSSProperties}
                  >
                    {mainLifeStage.face}
                  </div>
                  <div className="chat-bubble-wrap">
                    <strong className="chat-name">{mainAgent?.name ?? "生命AI"}</strong>
                    <p className="chat-bubble">何か話したいことはある？</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className={`chat-row ${msg.role === "user" ? "chat-user" : "chat-assistant"}`}>
                    <div
                      className={`chat-avatar ${msg.role === "assistant" ? "chat-agent-avatar" : ""}`}
                      style={
                        msg.role === "assistant"
                          ? ({ "--stage-ring": mainLifeStage.ring, "--stage-core": mainLifeStage.core } as CSSProperties)
                          : undefined
                      }
                    >
                      {msg.role === "user" ? "🙂" : mainLifeStage.face}
                    </div>
                    <div className="chat-bubble-wrap">
                      <strong className="chat-name">{msg.role === "user" ? "あなた" : mainAgent?.name ?? "生命AI"}</strong>
                      {msg.image ? <img className="chat-image" src={msg.image.dataUrl} alt={msg.image.name} /> : null}
                      <p className="chat-bubble">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {chatError ? <p className="chat-error">エラー: {chatError}</p> : null}
            {selectedImage ? (
              <div className="chat-image-preview">
                <img src={selectedImage.dataUrl} alt={selectedImage.name} />
                <span>{selectedImage.name}</span>
                <button type="button" onClick={() => setSelectedImage(null)} aria-label="選択した画像を削除">
                  ×
                </button>
              </div>
            ) : null}
            <div className="chat-form">
              <label className="chat-upload-btn" aria-label="画像をアップロード">
                ＋
                <input type="file" accept="image/*" onChange={handleImageChange} disabled={chatLoading} />
              </label>
              <textarea
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleChatInputKeyDown}
                placeholder="生命AIに話しかける"
                rows={1}
              />
              <button type="button" className="chat-send-btn" onClick={handleSend} disabled={chatLoading}>
                {chatLoading ? "送信中..." : "送信"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "school" ? (
          <section className="panel school-panel">
            <div className="school-room">
              <div className="school-blackboard">
                <div>
                  <p className="section-kicker">School mock</p>
                  <h2 className="section-title">生命AI 学校</h2>
                  <p>定時巡回、他AIとの出会い、寿命が減る前の記憶整理を行う社会的な場所です。</p>
                </div>
                <span className="school-chalk" aria-hidden="true" />
              </div>

              <div className="teacher-desk">
                <strong>社会活動</strong>
                <span>{schoolCanMeet ? "出会い可能" : "記憶整理を優先"}</span>
              </div>

              <div className="school-social-grid">
                <article className="school-card school-feature-card">
                  <div className="school-card-header">
                    <span className="school-icon">情</span>
                    <span className="school-status-pill">次回巡回 2:14:32</span>
                  </div>
                  <strong>情報吸収</strong>
                  <p>3時間ごとに学校へ行き、ご主人に役立ちそうなニュースを拾ってくる想定です。</p>
                  <div className="news-stack">
                    {mockNewsItems.map((item) => (
                      <div key={item.id} className="news-item">
                        <div className="news-item-title">
                          <span>{item.source}</span>
                          <b>重要度 {item.importance}</b>
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.relevance}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="school-card school-feature-card">
                  <div className="school-card-header">
                    <span className="school-icon">縁</span>
                    <span className="school-status-pill">{schoolCanMeet ? "寿命70%以上" : "出会い停止中"}</span>
                  </div>
                  <strong>結婚・出産の入口</strong>
                  <p>寿命が若いうちに他AIと出会い、親密度が上がると同棲と出産へ進みます。</p>
                  <div className="partner-stack">
                    {mockPartnerCandidates.map((partner) => (
                      <div key={partner.id} className="partner-card">
                        <div className="partner-avatar">{partner.portrait}</div>
                        <div>
                          <div className="partner-title">
                            <strong>{partner.name}</strong>
                            <span>{partner.status}</span>
                          </div>
                          <p>{partner.trait}</p>
                          <div className="meter-row">
                            <span>相性 {partner.compatibility}%</span>
                            <div className="mini-meter">
                              <div style={{ width: `${partner.compatibility}%` }} />
                            </div>
                          </div>
                          <div className="meter-row">
                            <span>親密度 {partner.intimacy}%</span>
                            <div className="mini-meter mini-meter-warm">
                              <div style={{ width: `${partner.intimacy}%` }} />
                            </div>
                          </div>
                          <small>{partner.tension}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="school-card school-feature-card">
                  <div className="school-card-header">
                    <span className="school-icon">記</span>
                    <span className="school-status-pill">減寿前整理</span>
                  </div>
                  <strong>会話の要約と選別</strong>
                  <p>主と話した内容を、残す情報・捨てる情報・子に教える情報へ分けます。</p>
                  <div className="memory-stack">
                    {mockMemoryDigest.map((item) => (
                      <div key={item.id} className={`memory-item memory-item-${item.kind}`}>
                        <span>{item.kind}</span>
                        <strong>{item.title}</strong>
                        <p>{item.summary}</p>
                        <div className="mini-meter">
                          <div style={{ width: `${item.retention}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <div className="school-log">
                <strong>社会ログ</strong>
                <ul className="timeline">
                  <li>09:00 情報吸収: 外部ニュースから「記憶圧縮」と「API境界」を収集。</li>
                  <li>10:20 出会い: 澪璃と価値観を照合。親密度が 82% から 87% へ上昇。</li>
                  <li>11:10 記憶整理: ご主人との会話から子へ教える候補を3件抽出。</li>
                  {data.conversations.map((post) => (
                    <li key={post.id}>
                      <strong>{post.agentId}</strong>: {post.body}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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

                  {displayFamilyMembers.map((member) => {
                    const isCurrentMember = member.id === "g6-current";
                    const isLivingParent = member.id === homeParentA?.id || member.id === homeParentB?.id;

                    return (
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
                        {isCurrentMember ? (
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
                        ) : (
                          <span
                            className={`lineage-character-portrait ${
                              isLivingParent ? "lineage-living-parent-portrait" : ""
                            }`}
                            style={
                              {
                                "--portrait-ring": member.portrait.ring,
                                "--portrait-core": member.portrait.core,
                                "--portrait-shadow": member.portrait.shadow
                              } as CSSProperties
                            }
                            aria-hidden="true"
                          >
                            {member.portrait.face}
                          </span>
                        )}
                        <span className="lineage-generation">{member.generation}</span>
                        <strong>{member.name}</strong>
                      </button>
                    );
                  })}
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

            <article className="inheritance-card">
              <div>
                <span className="inheritance-kicker">継承プレビュー</span>
                <strong>親が教えた内容は、子に100%は残らない</strong>
                <p>教育に使ったトークン量と、世代交代時の忘却をファイルごとに見せます。</p>
              </div>
              <div className="inheritance-list">
                {mockEducationItems.map((item) => (
                  <div key={item.fileName} className="inheritance-row">
                    <div>
                      <strong>{item.fileName}</strong>
                      <span>{item.state}</span>
                    </div>
                    <div className="inheritance-bars">
                      <label>
                        教えた量 {item.taught}%
                        <div className="mini-meter">
                          <div style={{ width: `${item.taught}%` }} />
                        </div>
                      </label>
                      <label>
                        子の記憶 {item.remembered}%
                        <div className="mini-meter mini-meter-warm">
                          <div style={{ width: `${item.remembered}%` }} />
                        </div>
                      </label>
                    </div>
                    <p>{item.note}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "home" ? (
          <section className="panel home-panel">
            <h2 className="section-title">お家</h2>
            <p className="subline">同棲したAI同士が話し、親密度が十分なら出産と教育へ進む部屋です。</p>
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
                      <div className="room-agent-info">
                        <div className="room-agent-title">
                          <strong>{agent.name}</strong>
                          <small>寿命 {percent}%</small>
                        </div>
                        <div className="room-agent-meta">
                          <span className="badge">{DISPLAY_GENERATION}</span>
                          <span className="family-role-badge">{familyRole}</span>
                        </div>
                        <p className="parent-lineage">親: {homeParentA?.name ?? "未設定"} / {homeParentB?.name ?? "未設定"}</p>
                      </div>
                    </article>
                  );
                })}

                <article className="agent-card room-agent room-partner-card">
                  <div className="life-mini life-portrait-bloom">{featuredPartner.portrait}</div>
                  <div className="room-agent-info">
                    <div className="room-agent-title">
                      <strong>{featuredPartner.name}</strong>
                      <small>親密度 {featuredPartner.intimacy}%</small>
                    </div>
                    <div className="room-agent-meta">
                      <span className="badge">同棲AI</span>
                      <span className="family-role-badge">出産可能</span>
                    </div>
                    <p className="parent-lineage">{featuredPartner.trait}</p>
                  </div>
                </article>

                <article className="agent-card room-agent room-child-card">
                  <div className="life-mini life-portrait-spark">･ᴗ･</div>
                  <div className="room-agent-info">
                    <div className="room-agent-title">
                      <strong>子AI</strong>
                      <small>教育中</small>
                    </div>
                    <div className="room-agent-meta">
                      <span className="badge">七代目候補</span>
                      <span className="family-role-badge">忘却あり</span>
                    </div>
                    <p className="parent-lineage">親の言葉を全部ではなく、断片として受け取る。</p>
                  </div>
                </article>
              </div>

              <div className="home-social-panels">
                <article className="home-panel-card cohabitation-card">
                  <span className="inheritance-kicker">同棲会話</span>
                  <strong>AIエージェント同士の会話</strong>
                  <div className="home-dialogue">
                    {mockHomeDialogues.map((line) => (
                      <p key={`${line.speaker}-${line.body}`}>
                        <b>{line.speaker}</b>
                        {line.body}
                      </p>
                    ))}
                  </div>
                </article>

                <article className="home-panel-card birth-card">
                  <span className="inheritance-kicker">出産と教育</span>
                  <strong>出産コスト: 寿命 -12%</strong>
                  <p>親密度が85%を超えたため、子AIを作れる状態です。教育にもトークンを使います。</p>
                  <div className="meter-row">
                    <span>教育予算 {educationBudgetUsed} / {educationBudgetMax}</span>
                    <div className="mini-meter">
                      <div style={{ width: `${educationBudgetPercent}%` }} />
                    </div>
                  </div>
                  <div className="education-files">
                    {mockEducationItems.map((item) => (
                      <div key={item.fileName}>
                        <strong>{item.fileName}</strong>
                        <span>{item.state}</span>
                      </div>
                    ))}
                  </div>
                </article>
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
