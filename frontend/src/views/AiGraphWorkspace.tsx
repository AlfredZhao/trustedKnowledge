import { useMemo, useState, type CSSProperties } from "react";
import {
  BookOpenCheck,
  Bot,
  ChartLine,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Database,
  FilePlus2,
  FlaskConical,
  History,
  KeyRound,
  Layers3,
  Network,
  ShieldCheck,
  Sparkles,
  UserCog,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import type { AppView } from "../types";

type GraphGroup = "hub" | "content" | "ai" | "records" | "governance";

interface GraphNode {
  id: AppView;
  label: string;
  subtitle: string;
  description: string;
  group: GraphGroup;
  x: number;
  y: number;
  icon: LucideIcon;
}

interface GraphEdge {
  from: AppView;
  to: AppView;
  label: string;
  tone: "primary" | "content" | "ai" | "records" | "governance";
}

const graphNodes: GraphNode[] = [
  {
    id: "overview",
    label: "总览",
    subtitle: "Command Center",
    description: "聚合可信知识、Todo、英语素材和 AI 用量，作为日常入口和状态雷达。",
    group: "hub",
    x: 500,
    y: 305,
    icon: ChartLine,
  },
  {
    id: "workbench",
    label: "信息录入",
    subtitle: "Knowledge Capture",
    description: "沉淀可信知识，也可以直接创建 Todo，是内容进入系统的主入口。",
    group: "content",
    x: 180,
    y: 170,
    icon: BookOpenCheck,
  },
  {
    id: "factory",
    label: "知识加工",
    subtitle: "AI Processing",
    description: "选择未发布知识和 Skill，生成可复用的加工结果或博客素材。",
    group: "ai",
    x: 330,
    y: 100,
    icon: FlaskConical,
  },
  {
    id: "blogFactory",
    label: "博客工厂",
    subtitle: "Publishing Flow",
    description: "承接知识加工结果，维护文章、封面提示词、博客发布配置与发布状态。",
    group: "content",
    x: 520,
    y: 95,
    icon: ClipboardList,
  },
  {
    id: "todos",
    label: "待办事项",
    subtitle: "Action Items",
    description: "管理待办任务，支持和可信知识互转，并能把完成项追加到当前记录。",
    group: "records",
    x: 195,
    y: 435,
    icon: ClipboardCheck,
  },
  {
    id: "currentRecords",
    label: "当前记录",
    subtitle: "Learning Log",
    description: "维护当前 week/day 学习记录，是历史数据形成前的工作区。",
    group: "records",
    x: 390,
    y: 525,
    icon: FilePlus2,
  },
  {
    id: "history",
    label: "历史查询",
    subtitle: "History Explorer",
    description: "按时间、类型、用户和向量状态检索历史记录，是 AI 问数的数据底座。",
    group: "records",
    x: 615,
    y: 520,
    icon: History,
  },
  {
    id: "historyAsk",
    label: "AI 问数",
    subtitle: "Ask Data",
    description: "基于受控业务域进行自然语言问答，并展示筛选条件、统计和证据。",
    group: "ai",
    x: 805,
    y: 425,
    icon: Bot,
  },
  {
    id: "skills",
    label: "Skill 管理",
    subtitle: "Prompt Registry",
    description: "管理可调用 Skill，向知识加工和 AI 问数提供领域提示词能力。",
    group: "ai",
    x: 770,
    y: 165,
    icon: Layers3,
  },
  {
    id: "englishMaterials",
    label: "英语素材",
    subtitle: "Practice Assets",
    description: "维护英语学习素材，并在总览中展示最近内容和素材状态。",
    group: "content",
    x: 115,
    y: 300,
    icon: BookOpenCheck,
  },
  {
    id: "personalSecrets",
    label: "个人机密",
    subtitle: "Private Vault",
    description: "保存个人登录信息和备注，作为工作台里的安全资料仓库。",
    group: "governance",
    x: 500,
    y: 600,
    icon: KeyRound,
  },
  {
    id: "aiCoding",
    label: "AI 编程",
    subtitle: "Codex Workspace",
    description: "执行 Codex 编程任务，结果可归档为可信知识，形成工程经验沉淀。",
    group: "ai",
    x: 665,
    y: 255,
    icon: WandSparkles,
  },
  {
    id: "usage",
    label: "AI 用量",
    subtitle: "Usage Monitor",
    description: "跟踪 LLM 用量、预算和重置状态，为总览提供资源指标。",
    group: "governance",
    x: 855,
    y: 300,
    icon: Bot,
  },
  {
    id: "users",
    label: "用户管理",
    subtitle: "Access Control",
    description: "管理用户、可见关系和 AI 模块授权，控制高权限能力的访问边界。",
    group: "governance",
    x: 850,
    y: 535,
    icon: UserCog,
  },
  {
    id: "aiGraph",
    label: "AI图谱",
    subtitle: "Module Graph",
    description: "以图谱方式呈现当前系统功能模块、数据流和权限关系。",
    group: "hub",
    x: 500,
    y: 410,
    icon: Network,
  },
];

const graphEdges: GraphEdge[] = [
  { from: "workbench", to: "factory", label: "未发布知识", tone: "content" },
  { from: "factory", to: "blogFactory", label: "生成稿件", tone: "ai" },
  { from: "workbench", to: "todos", label: "知识 / 待办互转", tone: "records" },
  { from: "todos", to: "currentRecords", label: "完成追加", tone: "records" },
  { from: "currentRecords", to: "history", label: "沉淀历史", tone: "records" },
  { from: "history", to: "historyAsk", label: "证据检索", tone: "ai" },
  { from: "skills", to: "factory", label: "加工 Skill", tone: "ai" },
  { from: "skills", to: "historyAsk", label: "问数 Skill", tone: "ai" },
  { from: "aiCoding", to: "workbench", label: "归档经验", tone: "ai" },
  { from: "blogFactory", to: "overview", label: "发布状态", tone: "content" },
  { from: "todos", to: "overview", label: "处理中", tone: "records" },
  { from: "englishMaterials", to: "overview", label: "最近素材", tone: "content" },
  { from: "usage", to: "overview", label: "预算指标", tone: "governance" },
  { from: "users", to: "aiCoding", label: "模块授权", tone: "governance" },
  { from: "users", to: "usage", label: "查看权限", tone: "governance" },
  { from: "personalSecrets", to: "overview", label: "安全资产", tone: "governance" },
  { from: "aiGraph", to: "overview", label: "架构导航", tone: "primary" },
];

const groupStyles: Record<GraphGroup, { label: string; chip: string; ring: string; glow: string; text: string }> = {
  hub: {
    label: "中枢",
    chip: "border-mint-300/30 bg-mint-300/10 text-mint-100",
    ring: "border-mint-300/35 bg-mint-300/15",
    glow: "shadow-[0_0_48px_rgba(125,211,199,0.28)]",
    text: "text-mint-100",
  },
  content: {
    label: "内容生产",
    chip: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    ring: "border-sky-300/30 bg-sky-300/10",
    glow: "shadow-[0_0_42px_rgba(125,211,252,0.22)]",
    text: "text-sky-100",
  },
  ai: {
    label: "AI 能力",
    chip: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
    ring: "border-fuchsia-300/30 bg-fuchsia-300/10",
    glow: "shadow-[0_0_42px_rgba(240,171,252,0.2)]",
    text: "text-fuchsia-100",
  },
  records: {
    label: "记录沉淀",
    chip: "border-amberline/30 bg-amberline/10 text-amberline",
    ring: "border-amberline/30 bg-amberline/10",
    glow: "shadow-[0_0_42px_rgba(251,191,36,0.18)]",
    text: "text-amberline",
  },
  governance: {
    label: "安全治理",
    chip: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    ring: "border-emerald-300/30 bg-emerald-300/10",
    glow: "shadow-[0_0_42px_rgba(110,231,183,0.18)]",
    text: "text-emerald-100",
  },
};

const edgeStyles: Record<GraphEdge["tone"], string> = {
  primary: "#7dd3c7",
  content: "#7dd3fc",
  ai: "#f0abfc",
  records: "#fbbf24",
  governance: "#6ee7b7",
};

export default function AiGraphWorkspace({ onOpenView }: { onOpenView: (view: AppView) => void }) {
  const [selectedNodeId, setSelectedNodeId] = useState<AppView>("overview");
  const selectedNode = graphNodes.find((node) => node.id === selectedNodeId) ?? graphNodes[0];
  const nodeById = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), []);
  const connectedEdges = graphEdges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id);
  const connectedNodeIds = new Set<AppView>([selectedNode.id]);

  connectedEdges.forEach((edge) => {
    connectedNodeIds.add(edge.from);
    connectedNodeIds.add(edge.to);
  });

  const groupedCounts = graphNodes.reduce(
    (counts, node) => {
      counts[node.group] += 1;
      return counts;
    },
    { ai: 0, content: 0, governance: 0, hub: 0, records: 0 } as Record<GraphGroup, number>,
  );

  return (
    <div className="flex-1 space-y-4 px-4 pb-4 pt-2">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-ink-900/72 shadow-soft-glow backdrop-blur-xl">
        <div className="border-b border-white/10 bg-white/[0.025] px-4 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 flex items-center gap-2 text-sm text-mint-300">
                <Network size={17} />
                Graph Intelligence
              </div>
              <h2 className="text-xl font-semibold tracking-normal text-slate-50">AI图谱：功能模块关系网络</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                将当前项目的核心功能模块作为实体，按内容生产、AI 能力、记录沉淀和治理边界连接，形成可点击的系统地图。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[560px]">
              <MetricPill icon={Database} label="实体" value={graphNodes.length.toString()} />
              <MetricPill icon={Network} label="关系" value={graphEdges.length.toString()} />
              <MetricPill icon={Sparkles} label="AI 节点" value={groupedCounts.ai.toString()} />
              <MetricPill icon={ShieldCheck} label="治理节点" value={groupedCounts.governance.toString()} />
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 overflow-x-auto">
            <div className="relative h-[680px] min-w-[980px] bg-[radial-gradient(circle_at_50%_45%,rgba(125,211,199,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_38%,rgba(125,211,199,0.045))]">
              <div className="absolute inset-6 rounded-lg border border-white/10 bg-black/15" />
              <div className="absolute left-10 top-8 flex flex-wrap gap-2">
                {(Object.keys(groupStyles) as GraphGroup[]).map((group) => (
                  <span
                    key={group}
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${groupStyles[group].chip}`}
                  >
                    {groupStyles[group].label} · {groupedCounts[group]}
                  </span>
                ))}
              </div>

              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 680" role="img" aria-label="AI图谱模块关系连线">
                <defs>
                  <filter id="ai-graph-glow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <marker id="ai-graph-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#7dd3c7" opacity="0.82" />
                  </marker>
                </defs>
                {graphEdges.map((edge) => {
                  const from = nodeById.get(edge.from);
                  const to = nodeById.get(edge.to);
                  if (!from || !to) return null;
                  const isActive = edge.from === selectedNode.id || edge.to === selectedNode.id;
                  const color = edgeStyles[edge.tone];
                  const midX = (from.x + to.x) / 2;
                  const midY = (from.y + to.y) / 2;

                  return (
                    <g key={`${edge.from}-${edge.to}`}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={color}
                        strokeDasharray={isActive ? undefined : "5 8"}
                        strokeLinecap="round"
                        strokeWidth={isActive ? 2.6 : 1.2}
                        opacity={isActive ? 0.9 : 0.28}
                        markerEnd="url(#ai-graph-arrow)"
                        filter={isActive ? "url(#ai-graph-glow)" : undefined}
                      />
                      <text
                        x={midX}
                        y={midY - 7}
                        fill={color}
                        fontSize="11"
                        opacity={isActive ? 0.95 : 0.42}
                        textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {graphNodes.map((node) => {
                const Icon = node.icon;
                const selected = node.id === selectedNode.id;
                const connected = connectedNodeIds.has(node.id);
                const style = {
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                } satisfies CSSProperties;

                return (
                  <button
                    key={node.id}
                    className={`absolute flex h-[86px] w-[150px] -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-lg border p-3 text-left transition duration-300 ${
                      selected
                        ? `${groupStyles[node.group].ring} ${groupStyles[node.group].glow} scale-[1.04] text-slate-50`
                        : connected
                          ? "border-white/10 bg-ink-900/78 text-slate-100 shadow-[0_16px_38px_rgba(0,0,0,0.2)]"
                          : "border-white/10 bg-ink-900/64 text-slate-400 opacity-70 hover:opacity-100"
                    }`}
                    style={style}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${
                        selected ? groupStyles[node.group].ring : "border-white/10 bg-white/[0.035]"
                      }`}
                    >
                      <Icon size={20} className={selected ? groupStyles[node.group].text : "text-slate-300"} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{node.label}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{node.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="border-t border-white/10 bg-white/[0.025] p-4 xl:border-l xl:border-t-0">
            <div className="rounded-lg border border-white/10 bg-white/[0.028] p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className={`mb-2 inline-flex rounded-md border px-2 py-1 text-xs ${groupStyles[selectedNode.group].chip}`}>
                    {groupStyles[selectedNode.group].label}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50">{selectedNode.label}</h3>
                  <p className="text-sm text-slate-500">{selectedNode.subtitle}</p>
                </div>
                <selectedNode.icon className={groupStyles[selectedNode.group].text} size={24} />
              </div>
              <p className="text-sm leading-6 text-slate-400">{selectedNode.description}</p>
              <button
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 text-sm font-medium text-mint-200 transition hover:border-mint-300/40 hover:bg-mint-300/15"
                type="button"
                onClick={() => onOpenView(selectedNode.id)}
              >
                <Code2 size={16} />
                打开模块
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.028] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Network size={16} />
                关联关系
              </div>
              <div className="space-y-2">
                {connectedEdges.length > 0 ? (
                  connectedEdges.map((edge) => {
                    const source = nodeById.get(edge.from);
                    const target = nodeById.get(edge.to);
                    return (
                      <button
                        key={`${edge.from}-${edge.to}`}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-mint-300/25 hover:bg-mint-300/10"
                        type="button"
                        onClick={() => setSelectedNodeId(edge.from === selectedNode.id ? edge.to : edge.from)}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>{source?.label}</span>
                          <span className="text-mint-300">{edge.label}</span>
                          <span>{target?.label}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-2/3 rounded-full bg-mint-300/70" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm text-slate-500">
                    暂无直接关系。
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.028] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Sparkles size={16} />
                推荐阅读路径
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <PathStep index="01" text="信息录入 -> 知识加工 -> 博客工厂，观察内容生产链路。" />
                <PathStep index="02" text="当前记录 -> 历史查询 -> AI 问数，观察记录到问答的链路。" />
                <PathStep index="03" text="用户管理 -> AI 编程 / AI 用量，观察权限治理边界。" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <div className="text-xl font-semibold text-slate-50">{value}</div>
    </div>
  );
}

function PathStep({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <span className="text-xs font-semibold text-mint-300">{index}</span>
      <span className="leading-6">{text}</span>
    </div>
  );
}
