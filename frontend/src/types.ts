export type KnowledgeStatus = "未发布" | "已发布" | "跳过";
export type BlogFactoryStatus = "待处理" | "已处理" | "已发布" | "跳过";
export type TodoStatus = "待处理" | "处理中" | "已完成";
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

export interface TodoItem {
  id: number;
  title: string;
  content: string;
  source: string | null;
  topic_tag: string | null;
  todo_status: TodoStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface TodoDraft {
  title: string;
  content: string;
  source: string;
  topic_tag: string;
  todo_status: TodoStatus;
}

export interface PersonalSecretItem {
  id: number;
  system_name: string;
  login_url: string | null;
  username_preview: string | null;
  notes_preview: string | null;
  tags: string | null;
  has_username: boolean;
  has_password: boolean;
  has_notes: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface PersonalSecretDraft {
  system_name: string;
  login_url: string;
  username: string;
  password: string;
  notes: string;
  tags: string;
}

export type PersonalSecretRevealField = "system_name" | "login_url" | "username" | "password" | "notes" | "all";

export interface BlogFactoryItem {
  id: number;
  knowledge_id: number;
  task_content: string;
  question_snapshot: string;
  answer_snapshot: string;
  source_snapshot: string | null;
  topic_tag_snapshot: string | null;
  assist_summary: string | null;
  cover_image_markdown: string | null;
  cover_prompt_snapshot: string | null;
  blog_status_snapshot: KnowledgeStatus | null;
  copied_at: string | null;
  factory_status: BlogFactoryStatus;
  article_markdown: string | null;
  article_title: string | null;
  article_file_path: string | null;
  article_checksum: string | null;
  article_saved_at: string | null;
  remote_post_id: string | null;
  remote_publish_config_id: number | null;
  remote_publish_state: string | null;
  remote_submission_option: BlogPublishSubmissionOption | null;
  remote_categories_snapshot: string | null;
  remote_tags_snapshot: string | null;
  remote_published_at: string | null;
  remote_last_synced_at: string | null;
  has_article: boolean;
  v_needs_update: number | null;
  similarity: number | null;
}

export interface BlogFactoryReviewSuggestion {
  id: string;
  severity: "需要修改" | "建议优化";
  category: "结构" | "逻辑" | "表达" | "一致性" | "Markdown";
  quote: string;
  problem: string;
  suggestion: string;
  before: string;
  after: string;
}

export interface BlogFactoryReviewResult {
  status: "no_issues" | "issues_found";
  summary: string;
  suggestions: BlogFactoryReviewSuggestion[];
}

export interface BlogFactoryEnhancementJobSnapshot {
  job_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  execution_provider: "codex" | "history_ask_llm";
  model_name: string;
  result: { content: string } | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface BlogFactoryReviewJobSnapshot {
  job_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  execution_provider: "codex" | "history_ask_llm";
  model_name: string;
  result: BlogFactoryReviewResult | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export type BlogPublishType = "METAWEBLOG_API";
export type BlogPublishSubmissionOption = "CNBLOGS_HOME" | "PERSONAL_ONLY";

export interface BlogPublishConfig {
  id: number;
  blog_type: BlogPublishType;
  blog_url: string;
  username: string;
  api_url: string;
  blog_name: string | null;
  blog_id: string | null;
  is_default: boolean;
  has_password: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface BlogPublishValidationResult {
  blog_id: string;
  blog_name: string | null;
  blog_url: string | null;
  message: string;
}

export interface BlogPublishCategory {
  category_id: string | null;
  title: string;
  description: string | null;
}

export interface BlogFactoryPublishResult {
  item: BlogFactoryItem;
  config_id: number;
  post_id: string;
  blog_name: string | null;
  blog_url: string | null;
  published: boolean;
}

export interface BlogFactorySendToProcessingResult {
  item: BlogFactoryItem;
  knowledge: KnowledgeItem;
}

export type AppView =
  | "overview"
  | "workbench"
  | "factory"
  | "blogFactory"
  | "todos"
  | "personalSecrets"
  | "currentRecords"
  | "history"
  | "englishMaterials"
  | "aiGraph"
  | "users"
  | "skills"
  | "historyAsk"
  | "aiCoding"
  | "usage";

export type ManagedUserRole = "USER" | "PARENT";
export type ManagedUserStatus = "ACTIVE" | "DISABLED";
export type AdminModuleCode = "aiCoding" | "usage";
export type AdminModuleAccessLevel = "SUPER_ADMIN_ONLY" | "ADMIN_ROLE";

export interface ManagedUserItem {
  user_id: number;
  username: string;
  display_name: string | null;
  role_code: ManagedUserRole;
  is_admin_role: boolean;
  status: ManagedUserStatus;
  has_password: boolean;
  parent_count: number;
  child_count: number;
  created_at: string | null;
  updated_at: string | null;
  last_login_at: string | null;
}

export interface ManagedUserListResponse {
  items: ManagedUserItem[];
  total: number;
}

export interface ManagedUserCreateDraft {
  username: string;
  display_name: string;
  password: string;
  role_code: ManagedUserRole;
  is_admin_role: boolean;
}

export interface AdminModuleAccessItem {
  module_code: AdminModuleCode;
  label: string;
  description: string;
  access_level: AdminModuleAccessLevel;
}

export interface AdminModuleAccessListResponse {
  items: AdminModuleAccessItem[];
}

export interface UserRelationItem {
  relation_id: number;
  parent_user_id: number;
  parent_username: string;
  child_user_id: number;
  child_username: string;
  relation_type: string;
  status: ManagedUserStatus;
  created_at: string | null;
}

export interface UserRelationListResponse {
  items: UserRelationItem[];
  total: number;
}

export interface UserRelationGraphNode {
  user_id: number;
  username: string;
  display_name: string | null;
  role_code: ManagedUserRole;
  is_admin_role: boolean;
  status: ManagedUserStatus;
  parent_count: number;
  child_count: number;
  degree: number;
  is_isolated: boolean;
}

export interface UserRelationGraphEdge {
  relation_id: number;
  source_user_id: number;
  source_username: string;
  target_user_id: number;
  target_username: string;
  relation_type: string;
  status: ManagedUserStatus;
  created_at: string | null;
}

export interface UserRelationGraphSummary {
  total_users: number;
  active_users: number;
  parent_role_users: number;
  admin_role_users: number;
  isolated_users: number;
  total_relations: number;
  active_relations: number;
}

export interface UserRelationGraphRecommendation {
  graph_name: string;
  graph_type: string;
  implementation_status: string;
  vertex_tables: string[];
  edge_tables: string[];
  notes: string[];
}

export interface UserRelationGraphResponse {
  nodes: UserRelationGraphNode[];
  edges: UserRelationGraphEdge[];
  summary: UserRelationGraphSummary;
  recommendation: UserRelationGraphRecommendation;
}

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

export interface EnglishMaterialItem {
  id: number;
  sequence_no: number | null;
  category: string | null;
  base_expression: string | null;
  professional_sentence: string | null;
  chinese_translation: string | null;
  full_script: string | null;
  flag: number;
  title: string | null;
  v_needs_update: number | null;
  similarity: number | null;
  card_sections: EnglishMaterialCardSections | null;
}

export interface EnglishMaterialCardSection {
  key: string;
  label: string;
  value: string;
  visible: boolean;
  copyable: boolean;
  order: number;
}

export interface EnglishMaterialCardSections {
  schema_version: 1;
  template: { skill_id: string; revision: string } | null;
  sections: EnglishMaterialCardSection[];
}

export interface EnglishMaterialDraft {
  sequence_no: string;
  category: string;
  base_expression: string;
  professional_sentence: string;
  chinese_translation: string;
  full_script: string;
  title: string;
  flag: "0" | "1";
  card_sections: EnglishMaterialCardSections | null;
}

export interface EnglishMaterialGenerationResult {
  category: "AI生成";
  title: string;
  base_expression: string;
  professional_sentence: string;
  chinese_translation: string;
  full_script: string;
}

export interface EnglishMaterialCompletionResult {
  title: string;
  base_expression: string;
  professional_sentence: string;
  chinese_translation: string;
  card_sections: EnglishMaterialCardSections | null;
}

export interface EnglishMaterialCompletionJobSnapshot {
  job_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  execution_provider: "codex" | "history_ask_llm";
  model_name: string;
  result: EnglishMaterialCompletionResult | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface LlmUsageSample {
  sample_time: string;
  used_amount: number;
  total_budget: number;
  remaining_budget: number;
  budget_duration: string | null;
  next_reset_at: string | null;
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
  similarity: number | null;
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
  type?: string | null;
  week?: string | null;
  day?: string | null;
  learn_level?: number | null;
  vector_status?: number | null;
  date_from?: string | null;
  date_to?: string | null;
  semantic_terms?: string[];
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

export interface HistoryAskQueryDebug {
  sql: string;
  parameters: Record<string, string>;
  result_limit: number;
  result_truncated: boolean;
}

export interface HistoryAskPromptDebug {
  system: string;
  prompt: string;
  llm_requested: boolean;
}

export interface HistoryAskResponse {
  answer: string;
  filters: HistoryAskFilters;
  stats: HistoryAskStats;
  evidence: HistoryAskEvidence[];
  query_results: HistoryAskEvidence[];
  query_debug: HistoryAskQueryDebug;
  prompt_debug: HistoryAskPromptDebug;
  llm_used: boolean;
  warning: string | null;
  selected_skills: SkillPromptSummary[];
  domain: HistoryAskDomain;
}

export interface HistoryAskDomain {
  code: "history" | "todos" | "knowledge" | "english_materials";
  name: string;
  description: string;
  source_tables: string[];
}

export interface HistoryAskQuickQuestion {
  id: number;
  question: string;
  domain_code: "history" | "todos" | "knowledge" | "english_materials";
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  is_personal_binding?: boolean;
}

export interface HistoryOntologyTerm {
  id: number;
  name: string;
  aliases: string[];
  description: string;
  created_at: string;
  updated_at: string;
  domain_code: "history" | "todos" | "knowledge" | "english_materials";
  visibility: "PERSONAL" | "TEAM" | "SYSTEM";
  shared_with_usernames: string[];
  owner_username: string;
  can_edit: boolean;
}

export interface HistoryOntologyDraft {
  domain_code: "history" | "todos" | "knowledge" | "english_materials";
  name: string;
  aliases: string;
  description: string;
  visibility: "PERSONAL" | "TEAM" | "SYSTEM";
  shared_with_usernames: string;
}

export interface SkillPromptSummary {
  id: string;
  name: string;
  description: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  published: boolean;
  skill_type: string;
  owner_username: string | null;
  source: string;
  file_count: number;
  can_edit: boolean;
  can_delete: boolean;
  can_use: boolean;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  is_personal_binding?: boolean;
}

export interface SkillFile {
  path: string;
  size: number;
  readable: boolean;
  editable: boolean;
}

export interface SkillDetail extends SkillSummary {
  files: SkillFile[];
  skill_markdown: string;
}

export interface SkillDraft {
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  published: boolean;
}

export interface SkillListResponse {
  items: SkillSummary[];
  total: number;
}

export interface LlmConfig {
  provider_name: string;
  base_url: string;
  model_name: string;
  enabled: boolean;
  has_api_key: boolean;
}

export interface LlmConfigDraft {
  provider_name: string;
  base_url: string;
  model_name: string;
  enabled: boolean;
}

export interface CodexRunResponse {
  output: string;
  error_output: string;
  exit_code: number;
  duration_seconds: number;
  git_status: string;
  model_name: string | null;
}

export type CodexOutputMode = "full" | "final";

export type CodexJobStatus = "running" | "completed" | "failed" | "cancelled";

export interface CodexJobSnapshot {
  job_id: string;
  prompt: string;
  model_name: string | null;
  status: CodexJobStatus;
  output: string;
  error_output: string;
  response: CodexRunResponse | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string | null;
  last_event: string | null;
}

export interface CodexConfig {
  default_model_name: string | null;
  available_models: string[];
}

export interface ProjectChangelog {
  markdown: string;
  updated_at: string;
}

export type CodexStreamEvent =
  | { type: "status" | "stdout" | "stderr" | "heartbeat" | "error"; message: string }
  | { type: "complete"; response: CodexRunResponse };

export interface SystemRestartResponse {
  accepted: boolean;
  message: string;
  log_path: string;
}

export interface GithubSyncResponse {
  success: boolean;
  message: string;
  exit_code: number;
  output_tail: string;
  log_path: string;
  completed_at: string;
}
