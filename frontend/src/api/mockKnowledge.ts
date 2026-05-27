import type { KnowledgeDraft, KnowledgeItem } from "../types";

let nextId = 42;

const initialItems: KnowledgeItem[] = [
  {
    id: 41,
    question: "文件下载服务",
    answer: "内部文件分发服务。敏感字段已在前端遮罩，详情页需要二次确认后展示。",
    source: "internal",
    topic_tag: "media",
    blog_status: "跳过",
    created_date: null,
  },
  {
    id: 24,
    question: "win7 的 hosts 文件在哪里？",
    answer: "路径位于 C:\\Windows\\System32\\drivers\\etc\\hosts。",
    source: "豆包",
    topic_tag: "hosts",
    blog_status: "已发布",
    created_date: null,
  },
  {
    id: 23,
    question: "Win7 没有 Telnet 命令？",
    answer: "通过控制面板启用 Telnet 客户端功能，再回到 CMD 使用 telnet 命令验证端口连通性。",
    source: "豆包",
    topic_tag: "telnet,win7",
    blog_status: "已发布",
    created_date: null,
  },
  {
    id: 22,
    question: "Medium Article",
    answer: "Connecting Oracle Agent Factory to APEX 的操作步骤参考。",
    source: "oracle",
    topic_tag: "PAF,APEX",
    blog_status: "已发布",
    created_date: null,
  },
  {
    id: 2,
    question: "Linux 时区修改为 CST",
    answer: "sudo timedatectl set-timezone Asia/Shanghai",
    source: "Gemini",
    topic_tag: "Linux",
    blog_status: "已发布",
    created_date: null,
  },
];

let items = [...initialItems];

const wait = (duration = 720) => new Promise((resolve) => window.setTimeout(resolve, duration));

export async function fetchKnowledge(): Promise<KnowledgeItem[]> {
  await wait(860);
  return [...items].sort((a, b) => b.id - a.id);
}

export async function createKnowledge(draft: KnowledgeDraft): Promise<KnowledgeItem> {
  await wait(980);

  const item: KnowledgeItem = {
    id: nextId++,
    question: draft.question.trim(),
    answer: draft.answer.trim(),
    source: draft.source.trim() || null,
    topic_tag: draft.topic_tag.trim() || null,
    blog_status: draft.blog_status,
    created_date: new Date().toISOString(),
  };

  items = [item, ...items];
  return item;
}

