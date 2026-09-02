import {
  BookOpenCheck,
  Bot,
  ChartLine,
  ClipboardCheck,
  ClipboardList,
  KeyRound,
  FilePlus2,
  FlaskConical,
  History,
  Layers3,
  Network,
  UserCog,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import type { AppView, BlogFactoryStatus, KnowledgeStatus, TodoStatus } from "./types";

export const PAGE_SIZE = 5;
export const FACTORY_PAGE_SIZE = 6;
export const BLOG_FACTORY_PAGE_SIZE = 8;
export const TODO_PAGE_SIZE = 8;
export const PERSONAL_SECRETS_PAGE_SIZE = 8;
export const CURRENT_RECORDS_PAGE_SIZE = 10;
export const ENGLISH_MATERIALS_PAGE_SIZE = 10;
export const HISTORY_PAGE_SIZE = 10;
export const USAGE_SAMPLE_LIMIT = 72;
export const OVERVIEW_TODO_LIMIT = 5;
export const OVERVIEW_KNOWLEDGE_LIMIT = 5;

export const APP_VIEWS: AppView[] = [
  "overview",
  "workbench",
  "factory",
  "blogFactory",
  "todos",
  "personalSecrets",
  "currentRecords",
  "history",
  "englishMaterials",
  "aiGraph",
  "skills",
  "historyAsk",
  "aiCoding",
  "usage",
];

export type FunctionNavItem = {
  icon: LucideIcon;
  label: string;
  view: AppView;
};

export const FUNCTION_NAV_ITEMS: FunctionNavItem[] = [
  { icon: ChartLine, label: "总览", view: "overview" },
  { icon: BookOpenCheck, label: "信息录入", view: "workbench" },
  { icon: FlaskConical, label: "知识加工", view: "factory" },
  { icon: ClipboardList, label: "博客工厂", view: "blogFactory" },
  { icon: ClipboardCheck, label: "待办事项", view: "todos" },
  { icon: KeyRound, label: "个人机密", view: "personalSecrets" },
  { icon: FilePlus2, label: "当前记录", view: "currentRecords" },
  { icon: History, label: "历史查询", view: "history" },
  { icon: BookOpenCheck, label: "英语素材", view: "englishMaterials" },
  { icon: Network, label: "AI 图谱", view: "aiGraph" },
  { icon: UserCog, label: "用户管理", view: "users" },
  { icon: Layers3, label: "智能编排", view: "skills" },
  { icon: Bot, label: "AI 问数", view: "historyAsk" },
  { icon: WandSparkles, label: "AI 编程", view: "aiCoding" },
  { icon: Bot, label: "AI 用量", view: "usage" },
];

export const KNOWLEDGE_STATUS_OPTIONS: KnowledgeStatus[] = ["未发布", "已发布", "跳过"];
export const BLOG_FACTORY_STATUS_OPTIONS: BlogFactoryStatus[] = ["待处理", "已处理", "已发布", "跳过"];
export const TODO_STATUS_OPTIONS: TodoStatus[] = ["待处理", "处理中", "已完成"];

export const BLOG_FACTORY_SORT_FIELDS = ["copied_at", "id", "knowledge_id", "factory_status"] as const;
export const CURRENT_RECORD_SORT_FIELDS = ["id", "type", "week", "day", "username", "learn_level"] as const;
export const HISTORY_SORT_FIELDS = ["history_date", "id", "type", "username", "learn_level"] as const;
export const ENGLISH_MATERIAL_SORT_FIELDS = ["id", "sequence_no", "category", "base_expression", "title", "flag"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type BlogFactorySortBy = (typeof BLOG_FACTORY_SORT_FIELDS)[number];
export type CurrentRecordSortBy = (typeof CURRENT_RECORD_SORT_FIELDS)[number];
export type HistorySortBy = (typeof HISTORY_SORT_FIELDS)[number];
export type EnglishMaterialSortBy = (typeof ENGLISH_MATERIAL_SORT_FIELDS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
export type HistoryVectorStatus = "all" | "0" | "1";
