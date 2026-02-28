// Auth Types
export interface User {
  user_id: string;
  email: string;
  name: string;
  preferred_language: 'en' | 'es';
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserRegister {
  email: string;
  password: string;
  name: string;
  preferred_language?: 'en' | 'es';
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserUpdate {
  name?: string;
  preferred_language?: 'en' | 'es';
}

// Case Types
export interface Case {
  case_id: string;
  title: string;
  scenario_type: string;
  difficulty: number;
  seed: number;
  created_at: string;
  updated_at: string;
  document_count: number;
  entity_count: number;
}

export type ScenarioType =
  | 'vendor_fraud'
  | 'data_leak'
  | 'inventory_manipulation'
  | 'internal_sabotage'
  | 'expense_fraud';

export interface CustomCaseCreateRequest {
  idea: string;
  scenario_type: ScenarioType;
  difficulty: number;
  language: 'en' | 'es';
  company_name?: string;
  culprit_name?: string;
  people_names: string[];
  generate_embeddings?: boolean;
  sync_graph?: boolean;
}

export interface CustomCaseCreateResponse {
  case: Case;
  entities_created: number;
  documents_created: number;
  chunks_created: number;
  embeddings_created: number;
  graph_relationships_created: number;
  warnings: string[];
}

export interface Document {
  doc_id: string;
  case_id: string;
  doc_type: 'email' | 'chat' | 'ticket' | 'invoice' | 'csv' | 'note' | 'report';
  ts: string;
  author_entity_id: string | null;
  subject: string | null;
  body: string;
  metadata_json: Record<string, unknown>;
}

export interface Entity {
  entity_id: string;
  case_id: string;
  entity_type: 'person' | 'org' | 'account' | 'sku' | 'ip' | 'location' | 'order' | 'ticket';
  name: string;
  attrs_json: Record<string, unknown>;
}

export interface DocChunk {
  chunk_id: string;
  doc_id: string;
  case_id: string;
  chunk_index: number;
  text: string;
  meta_json: Record<string, unknown>;
}

export interface Citation {
  doc_id: string;
  chunk_id: string;
  quote: string;
  relevance: string;
}

export interface AgentResponse {
  conclusion: string;
  citations: Citation[];
  suggested_next: string | null;
}

export interface PlayerState {
  user_id: string;
  case_id: string;
  opened_docs: string[];
  pinned_items: PinnedItem[];
  hints_used: number;
}

export interface PinnedItem {
  id: string;
  type: 'document' | 'entity' | 'chunk';
  caseId: string;
  label: string;
  data: Record<string, unknown>;
}

// API Response Types
export type DocType = Document['doc_type'];
export type EntityType = Entity['entity_type'];

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export interface EntityListResponse {
  entities: Entity[];
  total: number;
}

export interface DocumentWithChunks extends Document {
  chunks: DocChunk[];
}

// Search Types
export interface SearchRequest {
  query: string;
  k?: number;
  doc_types?: DocType[];
  min_score?: number;
}

export interface SearchResult {
  chunk_id: string;
  doc_id: string;
  text: string;
  score: number;
  chunk_index: number;
  doc_type: DocType;
  subject: string | null;
  ts: string;
  meta_json: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

// Chat Types
export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  conversation_id: string;
  suggested_actions: string[];
}

export interface HintRequest {
  context?: string;
}

export interface HintResponse {
  hint: string;
  hints_remaining: number;
  related_docs: string[];
}

export interface ScoreBreakdown {
  culprit_score: number;
  evidence_score: number;
  explanation_score: number;
  efficiency_score: number;
  board_reasoning_score: number;
}

export interface SubmissionResponse {
  submission_id: string | null;
  score: number;
  max_score: number;
  correct_culprits: string[];
  feedback: string;
  breakdown: ScoreBreakdown;
}

export interface ProgressResponse {
  hints_used: number;
  hints_remaining: number;
  has_submission: boolean;
  last_score: number | null;
}

export type EvidenceReliability = 'reliable' | 'uncertain' | 'false';

export interface BoardStatePayload {
  board_items: {
    id: string;
    type: 'entity' | 'document' | 'hypothesis';
    caseId: string;
    label: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    reliability: EvidenceReliability;
  }[];
  board_edges: {
    id: string;
    source: string;
    target: string;
    label: string;
    relationship_type: string;
  }[];
  updated_at: string | null;
}

// Graph Types
export interface GraphNode {
  entity_id: string;
  name: string;
  entity_type: EntityType;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source_id: string;
  target_id: string;
  relationship_type: string;
  properties: Record<string, unknown>;
}

export interface PathResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  length: number;
  found: boolean;
}

export interface NeighborsResponse {
  entity_id: string;
  neighbors: GraphNode[];
  edges: GraphEdge[];
  total: number;
}

export interface Hub {
  entity_id: string;
  name: string;
  entity_type: EntityType;
  degree: number;
}

export interface HubsResponse {
  hubs: Hub[];
  total: number;
}

export interface GraphStats {
  case_id: string;
  total_nodes: number;
  total_edges: number;
  node_types: Record<string, number>;
  relationship_types: Record<string, number>;
}

// Chat Message for UI state
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  timestamp: Date;
}
