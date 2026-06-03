export type KnowledgeStatus = "未发布" | "已发布" | "跳过";
export type BlogFactoryStatus = "待处理" | "已处理" | "已发布" | "跳过";
export type CurrentWeek = `W${number}`;
export type CurrentDay = `D${number}`;

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

export interface BlogFactoryItem {
  id: number;
  knowledge_id: number;
  task_content: string;
  question_snapshot: string;
  answer_snapshot: string;
  source_snapshot: string | null;
  topic_tag_snapshot: string | null;
  blog_status_snapshot: KnowledgeStatus | null;
  copied_at: string | null;
  factory_status: BlogFactoryStatus;
  article_markdown: string | null;
  article_title: string | null;
  article_file_path: string | null;
  article_checksum: string | null;
  article_saved_at: string | null;
  has_article: boolean;
}

export type AppView = "workbench" | "factory" | "blogFactory" | "currentRecords" | "history" | "historyAsk" | "usage";

export interface CurrentRecordItem {
  id: number;
  type: string;
  week: CurrentWeek;
  day: CurrentDay;
  content: string | null;
  username: string;
  learn_level: number | null;
}

export interface CurrentRecordOptions {
  users: string[];
  types: string[];
  user_types: Record<string, string[]>;
  weeks: CurrentWeek[];
  days: CurrentDay[];
  learn_levels: number[];
}

export interface LlmUsageSample {
  sample_time: string;
  used_amount: number;
  total_budget: number;
  remaining_budget: number;
  budget_duration: string | null;
  next_reset_at: string;
}

export interface HistoryItem {
  id: number;
  type: string | null;
  week: string | null;
  day: string | null;
  history_date: string | null;
  content: string | null;
  username: string | null;
  v_needs_update: number | null;
  learn_level: number | null;
}

export interface HistorySummary {
  total: number;
  types: string[];
  users: string[];
  user_types: Record<string, string[]>;
  min_date: string | null;
  max_date: string | null;
}

export interface HistoryAskFilters {
  keyword: string | null;
  username: string | null;
}

export interface HistoryAskStats {
  matched_count: number;
  active_days: number;
  min_date: string | null;
  max_date: string | null;
  type_counts: Record<string, number>;
  week_counts: Record<string, number>;
  learn_level_counts: Record<string, number>;
}

export interface HistoryAskEvidence {
  id: number;
  history_date: string | null;
  type: string | null;
  week: string | null;
  day: string | null;
  username: string | null;
  content: string | null;
}

export interface HistoryAskResponse {
  answer: string;
  filters: HistoryAskFilters;
  stats: HistoryAskStats;
  evidence: HistoryAskEvidence[];
  llm_used: boolean;
  warning: string | null;
}
