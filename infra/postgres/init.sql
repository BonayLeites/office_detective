-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enum types
CREATE TYPE scenario_type AS ENUM (
    'vendor_fraud',
    'data_leak',
    'inventory_manipulation',
    'internal_sabotage',
    'expense_fraud'
);

CREATE TYPE doc_type AS ENUM (
    'email',
    'chat',
    'ticket',
    'invoice',
    'csv',
    'note',
    'report'
);

CREATE TYPE entity_type AS ENUM (
    'person',
    'org',
    'account',
    'sku',
    'ip',
    'location',
    'order',
    'ticket'
);

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
    case_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    scenario_type scenario_type NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    seed INTEGER NOT NULL,
    ground_truth_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entities table
CREATE TABLE IF NOT EXISTS entities (
    entity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    attrs_json JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    doc_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    doc_type doc_type NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    author_entity_id UUID REFERENCES entities(entity_id) ON DELETE SET NULL,
    subject TEXT,
    body TEXT NOT NULL,
    metadata_json JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document chunks for RAG
CREATE TABLE IF NOT EXISTS doc_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id UUID NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding vector(1536),
    meta_json JSONB DEFAULT '{}'::JSONB,
    UNIQUE(doc_id, chunk_index)
);

-- Mentions table (entity occurrences in documents)
CREATE TABLE IF NOT EXISTS mentions (
    mention_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    span_start INTEGER NOT NULL,
    span_end INTEGER NOT NULL,
    mention_text TEXT NOT NULL
);

-- Player state table
CREATE TABLE IF NOT EXISTS player_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    case_id UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    opened_docs JSONB DEFAULT '[]'::JSONB,
    pinned_items JSONB DEFAULT '[]'::JSONB,
    hypotheses_json JSONB DEFAULT '{}'::JSONB,
    hints_used INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, case_id)
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
    submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    case_id UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    answer_json JSONB NOT NULL,
    evidence_refs JSONB NOT NULL,
    score_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_case_ts ON documents(case_id, ts);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(case_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_entities_case_type ON entities(case_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_mentions_doc ON mentions(doc_id);
CREATE INDEX IF NOT EXISTS idx_mentions_entity ON mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_player_state_user ON player_state(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_case ON submissions(user_id, case_id);

-- Vector index for semantic search (IVFFlat for smaller datasets)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON doc_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_state_updated_at
    BEFORE UPDATE ON player_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
