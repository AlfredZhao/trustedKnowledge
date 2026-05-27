export type KnowledgeStatus = "未发布" | "已发布" | "跳过";

export interface KnowledgeItem {
  id: number;
  question: string;
  answer: string;
  source: string | null;
  topic_tag: string | null;
  blog_status: KnowledgeStatus;
  created_date: string | null;
}

export interface KnowledgeDraft {
  question: string;
  answer: string;
  source: string;
  topic_tag: string;
  blog_status: KnowledgeStatus;
}

