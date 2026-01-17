# Technical Architecture

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Next.js Frontend                             │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  Inbox  │ │  Viewer │ │  Search │ │   Chat  │ │  Board  │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  │       └───────────┴───────────┴─────┬─────┴───────────┘             │   │
│  │                                     │                               │   │
│  │  ┌──────────────┐  ┌──────────────┐ │ ┌──────────────┐              │   │
│  │  │ TanStack     │  │    Zustand   │ │ │   i18next    │              │   │
│  │  │ Query        │  │    Store     │ │ │              │              │   │
│  │  └──────────────┘  └──────────────┘ │ └──────────────┘              │   │
│  └─────────────────────────────────────┼───────────────────────────────┘   │
└────────────────────────────────────────┼───────────────────────────────────┘
                                         │
                          ┌──────────────┴──────────────┐
                          │    REST API    │  WebSocket  │
                          │    (HTTP)      │  (Chat)     │
                          └──────────────┬──────────────┘
                                         │
┌────────────────────────────────────────┼───────────────────────────────────┐
│                                 SERVER │                                    │
│  ┌─────────────────────────────────────┴───────────────────────────────┐   │
│  │                         FastAPI Backend                              │   │
│  │                                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │   Auth     │  │   Rate     │  │   CORS     │  │  Logging   │    │   │
│  │  │ Middleware │  │  Limiter   │  │ Middleware │  │ Middleware │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                         ROUTERS                               │   │   │
│  │  │  /auth  /cases  /documents  /chat  /player  /admin           │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                        SERVICES                               │   │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │   │
│  │  │  │   Case   │ │   RAG    │ │  Agent   │ │  Player  │        │   │   │
│  │  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │        │   │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │   │
│  │  │  │  Scoring │ │Generation│ │   Hint   │ │  Graph   │        │   │   │
│  │  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │        │   │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                     LLM PROVIDERS                             │   │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │   │
│  │  │  │  Azure   │ │  OpenAI  │ │Anthropic │ │  Ollama  │        │   │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────┬───────────────────────────────────┘
                                         │
┌────────────────────────────────────────┼───────────────────────────────────┐
│                              PERSISTENCE                                    │
│                                        │                                    │
│  ┌─────────────────────────────────────┴───────────────────────────────┐   │
│  │                      PostgreSQL + pgvector                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Cases   │ │Documents │ │ Entities │ │ Players  │ │Embeddings│  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────┐              ┌─────────────────────┐              │
│  │       Redis         │              │    Neo4j (Phase 2)  │              │
│  │  • Sessions         │              │  • Graph queries    │              │
│  │  • Rate limiting    │              │  • Path finding     │              │
│  │  • Cache            │              │                     │              │
│  └─────────────────────┘              └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1. Frontend

| Technology           | Version | Purpose                                     |
| -------------------- | ------- | ------------------------------------------- |
| **Next.js**          | 14+     | Framework (App Router, RSC, Server Actions) |
| **TypeScript**       | 5.x     | Language (strict mode)                      |
| **Tailwind CSS**     | 3.4+    | Styling                                     |
| **shadcn/ui**        | latest  | UI component library                        |
| **React Flow**       | 11.x    | Evidence board graph visualization          |
| **Zustand**          | 4.x     | Client state management                     |
| **TanStack Query**   | 5.x     | Server state, caching, mutations            |
| **i18next**          | 23.x    | Internationalization (EN/ES)                |
| **Zod**              | 3.x     | Runtime type validation                     |
| **Socket.io Client** | 4.x     | WebSocket for chat streaming                |

### 2.2. Backend

| Technology      | Version | Purpose                       |
| --------------- | ------- | ----------------------------- |
| **Python**      | 3.12    | Language                      |
| **FastAPI**     | 0.110+  | API framework                 |
| **Pydantic**    | 2.x     | Validation, settings, schemas |
| **SQLAlchemy**  | 2.0     | Async ORM                     |
| **Alembic**     | 1.13+   | Database migrations           |
| **LangChain**   | 0.2+    | LLM orchestration             |
| **Faker**       | 24.x    | Test data generation          |
| **Python-Jose** | 3.x     | JWT handling                  |
| **Passlib**     | 1.7+    | Password hashing              |
| **Httpx**       | 0.27+   | Async HTTP client             |
| **Structlog**   | 24.x    | Structured logging            |

### 2.3. Data

| Technology     | Version | Purpose                        |
| -------------- | ------- | ------------------------------ |
| **PostgreSQL** | 16      | Primary database               |
| **pgvector**   | 0.6+    | Vector similarity search       |
| **Redis**      | 7.x     | Cache, sessions, rate limiting |
| **Neo4j**      | 5.x     | Graph database (Phase 2)       |

### 2.4. Infrastructure

| Technology           | Purpose              |
| -------------------- | -------------------- |
| **Docker**           | Containerization     |
| **Docker Compose**   | Local orchestration  |
| **GitHub Actions**   | CI/CD pipelines      |
| **Railway / Render** | Production hosting   |
| **Sentry**           | Error tracking       |
| **PostHog**          | Analytics (optional) |

---

## 3. Database Schema

### 3.1. Core Tables

```sql
-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================
-- CASES
-- ============================================

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,  -- URL-friendly identifier
    scenario_type VARCHAR(50) NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    estimated_minutes INTEGER DEFAULT 20,

    -- Generation
    template_id VARCHAR(100) NOT NULL,
    template_version VARCHAR(20) NOT NULL,
    seed INTEGER,
    customization JSONB DEFAULT '{}',

    -- Content
    client_company JSONB NOT NULL,
    briefing TEXT NOT NULL,
    ground_truth JSONB NOT NULL,  -- {culprits, mechanism, timeline, key_evidence}
    hints JSONB NOT NULL DEFAULT '[]',

    -- Metadata
    tags VARCHAR(50)[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(20) DEFAULT 'draft',  -- draft, published, archived
    published_at TIMESTAMPTZ,

    -- Stats
    play_count INTEGER DEFAULT 0,
    avg_score DECIMAL(5,2),
    avg_completion_time INTEGER,  -- seconds

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cases_slug ON cases(slug);
CREATE INDEX idx_cases_status ON cases(status) WHERE status = 'published';
CREATE INDEX idx_cases_difficulty ON cases(difficulty);
CREATE INDEX idx_cases_scenario ON cases(scenario_type);
CREATE INDEX idx_cases_language ON cases(language);
CREATE INDEX idx_cases_tags ON cases USING GIN(tags);

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Classification
    doc_type VARCHAR(50) NOT NULL,
    doc_subtype VARCHAR(50),

    -- Content
    title VARCHAR(500),  -- Subject for emails, title for others
    content TEXT NOT NULL,
    content_html TEXT,  -- Rendered version for display

    -- Temporal (in-universe)
    doc_date TIMESTAMPTZ NOT NULL,

    -- Structured metadata by type
    metadata JSONB NOT NULL DEFAULT '{}',
    /*
    Email: {from, to, cc, bcc, thread_id, in_reply_to, attachments}
    Invoice: {vendor_id, amount, currency, line_items, approved_by, status}
    Chat: {channel, participants, message_count}
    Form: {form_type, submitted_by, approved_by, status}
    */

    -- Game flags
    is_key_evidence BOOLEAN DEFAULT FALSE,
    evidence_type VARCHAR(50),  -- What it proves: address_match, approval_pattern, etc.
    red_herring_resolution UUID REFERENCES documents(id),  -- Points to doc that clears this

    -- Display
    display_order INTEGER,

    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
    ) STORED,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_case_date ON documents(case_id, doc_date);
CREATE INDEX idx_documents_case_type ON documents(case_id, doc_type);
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);

-- ============================================
-- DOCUMENT CHUNKS (RAG)
-- ============================================

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Content
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,

    -- Vector embedding
    embedding vector(1536),  -- OpenAI ada-002 / text-embedding-3-small

    -- Position in source document
    char_start INTEGER NOT NULL,
    char_end INTEGER NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_case ON document_chunks(case_id);

-- HNSW index for faster similarity search (better than ivfflat for this scale)
CREATE INDEX idx_chunks_embedding ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================
-- ENTITIES
-- ============================================

CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Classification
    entity_type VARCHAR(50) NOT NULL,  -- person, organization, account, location, asset

    -- Identity
    name VARCHAR(255) NOT NULL,
    name_variations VARCHAR(255)[] DEFAULT '{}',  -- Alternative forms of the name

    -- Attributes (type-specific)
    attributes JSONB NOT NULL DEFAULT '{}',
    /*
    Person: {role, email, department, phone, hire_date, reports_to}
    Organization: {industry, address, registration_date, tax_id, type}
    Account: {bank, iban, account_type, holder_entity_id}
    Location: {address, city, state, zip, type}
    */

    -- Game flags
    is_culprit BOOLEAN DEFAULT FALSE,
    is_victim BOOLEAN DEFAULT FALSE,
    suspicion_level INTEGER DEFAULT 0,  -- 0-10, for UI hints

    -- Display
    avatar_seed VARCHAR(50),  -- For generating consistent avatars

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(case_id, entity_type, name)
);

CREATE INDEX idx_entities_case ON entities(case_id);
CREATE INDEX idx_entities_case_type ON entities(case_id, entity_type);
CREATE INDEX idx_entities_name ON entities USING GIN(name gin_trgm_ops);

-- ============================================
-- ENTITY MENTIONS
-- ============================================

CREATE TABLE entity_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,

    -- Position
    mention_text VARCHAR(255) NOT NULL,
    char_start INTEGER NOT NULL,
    char_end INTEGER NOT NULL,

    -- Context
    context_type VARCHAR(50),  -- sender, recipient, approver, subject, etc.

    UNIQUE(document_id, entity_id, char_start)
);

CREATE INDEX idx_mentions_document ON entity_mentions(document_id);
CREATE INDEX idx_mentions_entity ON entity_mentions(entity_id);

-- ============================================
-- ENTITY RELATIONSHIPS (Graph Edges)
-- ============================================

CREATE TABLE entity_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Relationship
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    /*
    Types:
    - works_at, reports_to, manages
    - sent_email, received_email
    - approved, submitted
    - paid_to, received_from
    - registered_at, located_at
    - owns, controls
    */

    -- Attributes
    properties JSONB DEFAULT '{}',  -- {amount, date, reference}

    -- Provenance
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    -- For weighted graph algorithms
    weight DECIMAL(10,4) DEFAULT 1.0,

    -- Timestamps
    effective_date TIMESTAMPTZ,  -- When this relationship started in-universe

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(case_id, source_entity_id, target_entity_id, relationship_type, effective_date)
);

CREATE INDEX idx_relationships_case ON entity_relationships(case_id);
CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_relationships_type ON entity_relationships(case_id, relationship_type);
```

### 3.2. Player & Game State

```sql
-- ============================================
-- PLAYERS
-- ============================================

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Authentication
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),

    -- OAuth (optional)
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),

    -- Profile
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    language VARCHAR(5) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Subscription
    tier VARCHAR(20) DEFAULT 'free',  -- free, detective, agency
    tier_started_at TIMESTAMPTZ,
    tier_expires_at TIMESTAMPTZ,
    stripe_customer_id VARCHAR(100),

    -- Preferences
    preferences JSONB DEFAULT '{}',
    /*
    {
      assistance_level: 'detective' | 'investigator' | 'trainee',
      show_timer: boolean,
      sound_enabled: boolean,
      theme: 'dark' | 'light' | 'system'
    }
    */

    -- Stats
    cases_completed INTEGER DEFAULT 0,
    cases_perfect INTEGER DEFAULT 0,  -- Score >= 90
    total_score INTEGER DEFAULT 0,
    total_playtime INTEGER DEFAULT 0,  -- seconds

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_oauth ON players(oauth_provider, oauth_id);

-- ============================================
-- PLAYER SESSIONS
-- ============================================

CREATE TABLE player_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

    -- Token
    token_hash VARCHAR(255) NOT NULL UNIQUE,

    -- Device info
    user_agent VARCHAR(500),
    ip_address INET,

    -- Status
    is_valid BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_player ON player_sessions(player_id);
CREATE INDEX idx_sessions_token ON player_sessions(token_hash);
CREATE INDEX idx_sessions_expires ON player_sessions(expires_at);

-- ============================================
-- PLAYER CASE PROGRESS
-- ============================================

CREATE TABLE player_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(20) DEFAULT 'active',  -- active, submitted, abandoned, completed

    -- Progress tracking
    opened_documents UUID[] DEFAULT '{}',
    read_documents UUID[] DEFAULT '{}',
    time_per_document JSONB DEFAULT '{}',  -- {doc_id: seconds}

    -- Evidence board state
    pinned_items JSONB DEFAULT '[]',
    /*
    [{
      item_type: 'document' | 'entity' | 'chunk',
      item_id: uuid,
      position: {x, y},
      note: string,
      highlighted: boolean,
      color: string
    }]
    */
    connections JSONB DEFAULT '[]',
    /*
    [{
      source_id: uuid,
      target_id: uuid,
      label: string,
      style: string
    }]
    */
    board_viewport JSONB DEFAULT '{}',  -- {x, y, zoom}

    -- Hints
    hints_used INTEGER DEFAULT 0,
    hint_history JSONB DEFAULT '[]',  -- [{tier, hint_text, used_at}]

    -- ARIA chat
    chat_message_count INTEGER DEFAULT 0,

    -- Timing
    total_time_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(player_id, case_id)
);

CREATE INDEX idx_player_cases_player ON player_cases(player_id);
CREATE INDEX idx_player_cases_case ON player_cases(case_id);
CREATE INDEX idx_player_cases_status ON player_cases(player_id, status);

-- ============================================
-- SUBMISSIONS
-- ============================================

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_case_id UUID NOT NULL REFERENCES player_cases(id) ON DELETE CASCADE,

    -- Attempt tracking
    attempt_number INTEGER NOT NULL DEFAULT 1,

    -- Answer
    accused_culprits UUID[] NOT NULL,  -- Entity IDs
    mechanism_explanation TEXT NOT NULL,
    recommendations TEXT,

    -- Evidence cited
    evidence_citations JSONB NOT NULL,
    /*
    [{
      document_id: uuid,
      chunk_id: uuid,
      quote: string,
      supports: string  // What this evidence proves
    }]
    */

    -- Scoring
    score_breakdown JSONB NOT NULL,
    /*
    {
      culprit: {earned: 35, max: 35, details: []},
      mechanism: {earned: 20, max: 25, details: []},
      evidence: {earned: 22, max: 25, details: []},
      efficiency: {earned: 8, max: 10, details: []},
      recommendations: {earned: 5, max: 5, details: []}
    }
    */
    total_score INTEGER NOT NULL,
    grade VARCHAR(2) NOT NULL,  -- S, A, B, C, D, F

    -- Feedback
    feedback JSONB NOT NULL,
    /*
    {
      correct: [],
      incorrect: [],
      missed_evidence: [],
      suggestions: []
    }
    */

    -- Speed bonus
    completion_time_seconds INTEGER NOT NULL,
    speed_bonus INTEGER DEFAULT 0,

    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_player_case ON submissions(player_case_id);

-- ============================================
-- CHAT MESSAGES
-- ============================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_case_id UUID NOT NULL REFERENCES player_cases(id) ON DELETE CASCADE,

    -- Message
    role VARCHAR(20) NOT NULL,  -- user, assistant
    content TEXT NOT NULL,

    -- For assistant messages
    citations JSONB DEFAULT '[]',
    /*
    [{
      document_id: uuid,
      chunk_id: uuid,
      text: string,
      relevance: float
    }]
    */
    tools_used VARCHAR(50)[] DEFAULT '{}',

    -- Token tracking (for cost management)
    input_tokens INTEGER,
    output_tokens INTEGER,

    -- Performance
    latency_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_player_case ON chat_messages(player_case_id, created_at);

-- ============================================
-- ACHIEVEMENTS
-- ============================================

CREATE TABLE achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50),
    category VARCHAR(50),
    points INTEGER DEFAULT 10,
    is_secret BOOLEAN DEFAULT FALSE,
    criteria JSONB NOT NULL  -- Conditions to unlock
);

CREATE TABLE player_achievements (
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY(player_id, achievement_id)
);

CREATE INDEX idx_player_achievements ON player_achievements(player_id);
```

### 3.3. Graph Queries (PostgreSQL)

```sql
-- Find shortest path between two entities
CREATE OR REPLACE FUNCTION find_entity_path(
    p_case_id UUID,
    p_source_id UUID,
    p_target_id UUID,
    p_max_depth INTEGER DEFAULT 4
)
RETURNS TABLE (
    path UUID[],
    relationship_types VARCHAR(50)[],
    total_weight DECIMAL
) AS $$
WITH RECURSIVE paths AS (
    -- Base case: direct edges from source
    SELECT
        ARRAY[source_entity_id, target_entity_id] AS path,
        ARRAY[relationship_type] AS relationship_types,
        weight AS total_weight,
        target_entity_id AS current_node,
        1 AS depth
    FROM entity_relationships
    WHERE case_id = p_case_id
      AND source_entity_id = p_source_id

    UNION ALL

    -- Recursive: extend paths
    SELECT
        p.path || e.target_entity_id,
        p.relationship_types || e.relationship_type,
        p.total_weight + e.weight,
        e.target_entity_id,
        p.depth + 1
    FROM paths p
    JOIN entity_relationships e
        ON e.source_entity_id = p.current_node
        AND e.case_id = p_case_id
    WHERE e.target_entity_id != ALL(p.path)  -- Prevent cycles
      AND p.depth < p_max_depth
)
SELECT path, relationship_types, total_weight
FROM paths
WHERE current_node = p_target_id
ORDER BY depth, total_weight
LIMIT 5;
$$ LANGUAGE SQL;

-- Get entity neighborhood
CREATE OR REPLACE FUNCTION get_entity_neighbors(
    p_case_id UUID,
    p_entity_id UUID,
    p_max_depth INTEGER DEFAULT 1
)
RETURNS TABLE (
    entity_id UUID,
    entity_type VARCHAR(50),
    entity_name VARCHAR(255),
    relationship_type VARCHAR(50),
    relationship_direction VARCHAR(10),
    distance INTEGER
) AS $$
WITH RECURSIVE neighbors AS (
    -- Outgoing edges
    SELECT
        er.target_entity_id AS entity_id,
        er.relationship_type,
        'outgoing' AS direction,
        1 AS distance
    FROM entity_relationships er
    WHERE er.case_id = p_case_id
      AND er.source_entity_id = p_entity_id

    UNION

    -- Incoming edges
    SELECT
        er.source_entity_id AS entity_id,
        er.relationship_type,
        'incoming' AS direction,
        1 AS distance
    FROM entity_relationships er
    WHERE er.case_id = p_case_id
      AND er.target_entity_id = p_entity_id

    UNION ALL

    -- Recursive expansion
    SELECT
        CASE
            WHEN er.source_entity_id = n.entity_id THEN er.target_entity_id
            ELSE er.source_entity_id
        END,
        er.relationship_type,
        CASE
            WHEN er.source_entity_id = n.entity_id THEN 'outgoing'
            ELSE 'incoming'
        END,
        n.distance + 1
    FROM neighbors n
    JOIN entity_relationships er ON er.case_id = p_case_id
        AND (er.source_entity_id = n.entity_id OR er.target_entity_id = n.entity_id)
    WHERE n.distance < p_max_depth
      AND CASE
            WHEN er.source_entity_id = n.entity_id THEN er.target_entity_id
            ELSE er.source_entity_id
          END != p_entity_id
)
SELECT DISTINCT ON (n.entity_id)
    n.entity_id,
    e.entity_type,
    e.name AS entity_name,
    n.relationship_type,
    n.direction AS relationship_direction,
    n.distance
FROM neighbors n
JOIN entities e ON e.id = n.entity_id
ORDER BY n.entity_id, n.distance;
$$ LANGUAGE SQL;

-- Semantic search with hybrid scoring
CREATE OR REPLACE FUNCTION search_documents_hybrid(
    p_case_id UUID,
    p_query TEXT,
    p_embedding vector(1536),
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    document_id UUID,
    chunk_id UUID,
    content TEXT,
    doc_type VARCHAR(50),
    title VARCHAR(500),
    doc_date TIMESTAMPTZ,
    semantic_score FLOAT,
    keyword_score FLOAT,
    combined_score FLOAT
) AS $$
SELECT
    d.id AS document_id,
    dc.id AS chunk_id,
    dc.content,
    d.doc_type,
    d.title,
    d.doc_date,
    1 - (dc.embedding <=> p_embedding) AS semantic_score,
    ts_rank(d.search_vector, plainto_tsquery('english', p_query)) AS keyword_score,
    (0.7 * (1 - (dc.embedding <=> p_embedding))) +
    (0.3 * COALESCE(ts_rank(d.search_vector, plainto_tsquery('english', p_query)), 0)) AS combined_score
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE dc.case_id = p_case_id
ORDER BY combined_score DESC
LIMIT p_limit;
$$ LANGUAGE SQL;
```

---

## 4. API Design

### 4.1. API Overview

```
Base URL: /api/v1

Authentication:
- Bearer token in Authorization header
- Cookie-based sessions for web app

Rate Limits:
- Anonymous: 20 req/min
- Authenticated: 60 req/min
- Chat endpoint: 20 req/min (token-limited)

Response Format:
{
  "success": boolean,
  "data": T | null,
  "error": {
    "code": string,
    "message": string,
    "details": object
  } | null,
  "meta": {
    "request_id": string,
    "timestamp": string
  }
}
```

### 4.2. Endpoint Reference

#### Authentication

```yaml
POST /api/v1/auth/register:
  summary: Create new account
  body:
    email: string (required)
    password: string (required, min 8 chars)
    username: string (optional)
    language: string (optional, default 'en')
  response:
    player: Player
    token: string

POST /api/v1/auth/login:
  summary: Login with credentials
  body:
    email: string
    password: string
  response:
    player: Player
    token: string

POST /api/v1/auth/logout:
  summary: Invalidate current session
  auth: required
  response:
    success: true

POST /api/v1/auth/refresh:
  summary: Refresh access token
  auth: required (refresh token)
  response:
    token: string

GET /api/v1/auth/me:
  summary: Get current player
  auth: required
  response:
    player: Player
```

#### Cases

```yaml
GET /api/v1/cases:
  summary: List available cases
  auth: optional
  query:
    difficulty: int (1-5)
    scenario_type: string
    language: string
    page: int
    limit: int (max 50)
  response:
    cases: CaseSummary[]
    pagination: { page, limit, total, pages }

GET /api/v1/cases/{case_id}:
  summary: Get case details
  auth: optional
  params:
    case_id: uuid
  response:
    case: CaseDetail

POST /api/v1/cases/{case_id}/start:
  summary: Start playing a case
  auth: required
  params:
    case_id: uuid
  response:
    player_case: PlayerCase
    documents: DocumentSummary[]

POST /api/v1/cases/generate:
  summary: Generate custom case
  auth: required (premium)
  body:
    template_id: string
    difficulty: int
    language: string
    customization: CaseCustomization
  response:
    case: CaseDetail
```

#### Documents

```yaml
GET /api/v1/cases/{case_id}/documents:
  summary: List case documents
  auth: required
  params:
    case_id: uuid
  query:
    type: string (filter by doc_type)
    sort: string (date_asc, date_desc, type)
  response:
    documents: DocumentSummary[]

GET /api/v1/cases/{case_id}/documents/{doc_id}:
  summary: Get document content
  auth: required
  params:
    case_id: uuid
    doc_id: uuid
  response:
    document: DocumentDetail
    entities: EntityMention[]

POST /api/v1/cases/{case_id}/search:
  summary: Search documents
  auth: required
  params:
    case_id: uuid
  body:
    query: string
    doc_types: string[] (optional)
    date_from: datetime (optional)
    date_to: datetime (optional)
    limit: int (default 10, max 20)
  response:
    results: SearchResult[]
```

#### Entities & Graph

```yaml
GET /api/v1/cases/{case_id}/entities:
  summary: List case entities
  auth: required
  params:
    case_id: uuid
  query:
    type: string (person, organization, etc.)
  response:
    entities: Entity[]

GET /api/v1/cases/{case_id}/entities/{entity_id}:
  summary: Get entity details
  auth: required
  response:
    entity: EntityDetail
    relationships: Relationship[]
    documents: DocumentSummary[]

GET /api/v1/cases/{case_id}/graph:
  summary: Get full entity graph
  auth: required
  response:
    nodes: GraphNode[]
    edges: GraphEdge[]

POST /api/v1/cases/{case_id}/graph/path:
  summary: Find path between entities
  auth: required
  body:
    source_id: uuid
    target_id: uuid
    max_depth: int (default 4)
  response:
    paths: Path[]

POST /api/v1/cases/{case_id}/graph/neighbors:
  summary: Get entity neighbors
  auth: required
  body:
    entity_id: uuid
    depth: int (default 1, max 3)
  response:
    nodes: GraphNode[]
    edges: GraphEdge[]
```

#### Chat (ARIA)

```yaml
POST /api/v1/cases/{case_id}/chat:
  summary: Send message to ARIA
  auth: required
  params:
    case_id: uuid
  body:
    message: string
    stream: boolean (default true)
  response (non-streaming):
    message: ChatMessage
  response (streaming): SSE stream of ChatChunk events

GET /api/v1/cases/{case_id}/chat/history:
  summary: Get chat history
  auth: required
  query:
    limit: int (default 50)
    before: uuid (cursor)
  response:
    messages: ChatMessage[]
```

#### Player Progress

```yaml
GET /api/v1/player/cases:
  summary: List player's cases
  auth: required
  query:
    status: string (active, completed, abandoned)
  response:
    cases: PlayerCaseSummary[]

GET /api/v1/player/cases/{case_id}:
  summary: Get player progress for case
  auth: required
  response:
    progress: PlayerCaseProgress

PATCH /api/v1/player/cases/{case_id}:
  summary: Update progress
  auth: required
  body:
    opened_documents: uuid[] (optional)
    pinned_items: PinnedItem[] (optional)
    connections: Connection[] (optional)
    board_viewport: Viewport (optional)
  response:
    progress: PlayerCaseProgress

POST /api/v1/player/cases/{case_id}/hint:
  summary: Request a hint
  auth: required
  body:
    tier: int (0-4)
  response:
    hint: Hint
    hints_remaining: int

POST /api/v1/player/cases/{case_id}/submit:
  summary: Submit solution
  auth: required
  body:
    culprits: uuid[]
    mechanism: string
    evidence: EvidenceCitation[]
    recommendations: string (optional)
  response:
    submission: Submission
    solution: CaseSolution (revealed after submit)
```

### 4.3. WebSocket API (Chat Streaming)

```typescript
// Connection
//api.example.com/ws/chat/{case_id}?token={jwt}

// Client -> Server messages
ws: interface ClientMessage {
  type: 'message' | 'ping';
  payload: {
    content?: string; // For 'message' type
  };
}

// Server -> Client messages
interface ServerMessage {
  type: 'chunk' | 'citations' | 'done' | 'error' | 'pong';
  payload: {
    content?: string; // For 'chunk'
    citations?: Citation[]; // For 'citations'
    message_id?: string; // For 'done'
    error?: string; // For 'error'
  };
}

// Example flow:
// 1. Client connects with JWT
// 2. Client sends: {type: 'message', payload: {content: 'Who approved...'}}
// 3. Server streams:
//    {type: 'chunk', payload: {content: 'The invoices '}}
//    {type: 'chunk', payload: {content: 'were approved '}}
//    {type: 'chunk', payload: {content: 'by Marcus Chen...'}}
//    {type: 'citations', payload: {citations: [{doc_id: '...', text: '...'}]}}
//    {type: 'done', payload: {message_id: '...'}}
```

### 4.4. Error Codes

```yaml
# Authentication
AUTH_001: 'Invalid credentials'
AUTH_002: 'Token expired'
AUTH_003: 'Token invalid'
AUTH_004: 'Email already registered'
AUTH_005: 'Username already taken'

# Authorization
AUTHZ_001: 'Premium subscription required'
AUTHZ_002: 'Case not accessible'
AUTHZ_003: 'Rate limit exceeded'

# Cases
CASE_001: 'Case not found'
CASE_002: 'Case not published'
CASE_003: 'Case already started'
CASE_004: 'Case generation failed'

# Documents
DOC_001: 'Document not found'
DOC_002: 'Document not in this case'

# Player
PLAYER_001: 'Player not found'
PLAYER_002: 'No active case'
PLAYER_003: 'Case already submitted'
PLAYER_004: 'No hints remaining'

# Chat
CHAT_001: 'Message too long'
CHAT_002: 'Chat rate limit exceeded'
CHAT_003: 'ARIA unavailable'

# Validation
VALIDATION_001: 'Invalid request body'
VALIDATION_002: 'Missing required field'
VALIDATION_003: 'Invalid field value'

# Server
SERVER_001: 'Internal server error'
SERVER_002: 'Service unavailable'
SERVER_003: 'Database error'
```

## 5. Services Layer

### 5.1. Service Architecture

```python
# Base service with common dependencies
class BaseService:
    def __init__(
        self,
        db: AsyncSession,
        cache: Redis,
        config: Settings
    ):
        self.db = db
        self.cache = cache
        self.config = config
        self.logger = structlog.get_logger(service=self.__class__.__name__)
```

### 5.2. Case Service

```python
class CaseService(BaseService):
    """Manage cases and case access"""

    async def list_cases(
        self,
        filters: CaseFilters,
        pagination: Pagination,
        player_id: UUID | None = None
    ) -> PaginatedResult[CaseSummary]:
        """List available cases with optional filters"""

        query = (
            select(Case)
            .where(Case.status == 'published')
        )

        # Apply filters
        if filters.difficulty:
            query = query.where(Case.difficulty == filters.difficulty)
        if filters.scenario_type:
            query = query.where(Case.scenario_type == filters.scenario_type)
        if filters.language:
            query = query.where(Case.language == filters.language)

        # Get player progress if authenticated
        if player_id:
            query = query.outerjoin(
                PlayerCase,
                and_(
                    PlayerCase.case_id == Case.id,
                    PlayerCase.player_id == player_id
                )
            ).add_columns(PlayerCase.status.label('player_status'))

        # Paginate
        total = await self.db.scalar(select(func.count()).select_from(query.subquery()))

        query = query.offset(pagination.offset).limit(pagination.limit)
        results = await self.db.execute(query)

        return PaginatedResult(
            items=[CaseSummary.from_orm(r) for r in results],
            total=total,
            page=pagination.page,
            limit=pagination.limit
        )

    async def get_case(self, case_id: UUID) -> Case | None:
        """Get case by ID with caching"""

        # Try cache first
        cache_key = f"case:{case_id}"
        cached = await self.cache.get(cache_key)
        if cached:
            return Case.model_validate_json(cached)

        # Query database
        result = await self.db.execute(
            select(Case).where(Case.id == case_id)
        )
        case = result.scalar_one_or_none()

        if case:
            # Cache for 1 hour
            await self.cache.setex(
                cache_key,
                3600,
                case.model_dump_json()
            )

        return case

    async def start_case(
        self,
        case_id: UUID,
        player_id: UUID
    ) -> PlayerCase:
        """Start a case for a player"""

        # Check if already started
        existing = await self.db.execute(
            select(PlayerCase).where(
                PlayerCase.case_id == case_id,
                PlayerCase.player_id == player_id
            )
        )
        if existing.scalar_one_or_none():
            raise CaseAlreadyStartedError(case_id)

        # Create player case
        player_case = PlayerCase(
            player_id=player_id,
            case_id=case_id,
            status='active',
            started_at=datetime.utcnow()
        )

        self.db.add(player_case)
        await self.db.commit()
        await self.db.refresh(player_case)

        # Increment play count
        await self.db.execute(
            update(Case)
            .where(Case.id == case_id)
            .values(play_count=Case.play_count + 1)
        )

        self.logger.info(
            "case_started",
            player_id=str(player_id),
            case_id=str(case_id)
        )

        return player_case
```

### 5.3. RAG Service

```python
class RAGService(BaseService):
    """Retrieval-Augmented Generation for document search"""

    def __init__(
        self,
        db: AsyncSession,
        cache: Redis,
        config: Settings,
        llm_provider: LLMProvider
    ):
        super().__init__(db, cache, config)
        self.llm = llm_provider

    async def search(
        self,
        case_id: UUID,
        query: str,
        filters: SearchFilters | None = None,
        limit: int = 10
    ) -> list[SearchResult]:
        """Hybrid semantic + keyword search"""

        # Generate query embedding
        embedding = await self.llm.embed([query])

        # Execute hybrid search
        results = await self.db.execute(
            text("""
                SELECT * FROM search_documents_hybrid(
                    :case_id, :query, :embedding, :limit
                )
            """),
            {
                "case_id": case_id,
                "query": query,
                "embedding": embedding[0],
                "limit": limit
            }
        )

        search_results = []
        for row in results:
            # Apply post-filters
            if filters:
                if filters.doc_types and row.doc_type not in filters.doc_types:
                    continue
                if filters.date_from and row.doc_date < filters.date_from:
                    continue
                if filters.date_to and row.doc_date > filters.date_to:
                    continue

            search_results.append(SearchResult(
                document_id=row.document_id,
                chunk_id=row.chunk_id,
                content=row.content,
                doc_type=row.doc_type,
                title=row.title,
                doc_date=row.doc_date,
                score=row.combined_score
            ))

        return search_results

    async def get_context_for_query(
        self,
        case_id: UUID,
        query: str,
        max_tokens: int = 3000
    ) -> list[RetrievedChunk]:
        """Get relevant context chunks for LLM"""

        # Search for relevant chunks
        results = await self.search(case_id, query, limit=15)

        # Deduplicate and rank
        seen_docs = set()
        chunks = []
        total_tokens = 0

        for result in results:
            if result.document_id in seen_docs:
                continue

            # Estimate tokens
            chunk_tokens = len(result.content.split()) * 1.3
            if total_tokens + chunk_tokens > max_tokens:
                break

            chunks.append(RetrievedChunk(
                document_id=result.document_id,
                chunk_id=result.chunk_id,
                content=result.content,
                doc_type=result.doc_type,
                title=result.title,
                score=result.score
            ))

            seen_docs.add(result.document_id)
            total_tokens += chunk_tokens

        return chunks
```

### 5.4. Agent Service (ARIA)

```python
class AgentService(BaseService):
    """ARIA AI assistant agent"""

    def __init__(
        self,
        db: AsyncSession,
        cache: Redis,
        config: Settings,
        llm_provider: LLMProvider,
        rag_service: RAGService
    ):
        super().__init__(db, cache, config)
        self.llm = llm_provider
        self.rag = rag_service
        self.guardrails = ARIAGuardrails()

    async def chat(
        self,
        case_id: UUID,
        player_case_id: UUID,
        message: str,
        stream: bool = True
    ) -> AsyncIterator[ChatChunk] | ChatResponse:
        """Process chat message and generate response"""

        # Load case context
        case = await self.case_service.get_case(case_id)
        player_case = await self.get_player_case(player_case_id)

        # Build context
        context = CaseContext(
            case=case,
            player_case=player_case,
            culprits=[e for e in case.entities if e.is_culprit]
        )

        # Retrieve relevant documents
        chunks = await self.rag.get_context_for_query(case_id, message)

        # Build prompt
        system_prompt = self._build_system_prompt(context)
        context_prompt = self._build_context_prompt(chunks)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{context_prompt}\n\nUser question: {message}"}
        ]

        # Get chat history (last 10 messages)
        history = await self._get_chat_history(player_case_id, limit=10)
        messages = messages[:1] + history + messages[1:]

        if stream:
            return self._stream_response(messages, context, chunks, player_case_id)
        else:
            return await self._generate_response(messages, context, chunks, player_case_id)

    async def _stream_response(
        self,
        messages: list[dict],
        context: CaseContext,
        chunks: list[RetrievedChunk],
        player_case_id: UUID
    ) -> AsyncIterator[ChatChunk]:
        """Stream response with citations"""

        full_response = ""

        async for chunk in self.llm.stream(messages):
            full_response += chunk
            yield ChatChunk(type="chunk", content=chunk)

        # Validate response
        validation = await self.guardrails.validate(
            AgentResponse(content=full_response),
            context
        )

        if not validation.valid:
            self.logger.warning(
                "guardrail_violation",
                errors=validation.errors,
                player_case_id=str(player_case_id)
            )
            full_response = validation.sanitized_response.content

        # Extract and verify citations
        citations = self._extract_citations(full_response, chunks)
        yield ChatChunk(type="citations", citations=citations)

        # Save to database
        message_id = await self._save_message(
            player_case_id,
            "assistant",
            full_response,
            citations
        )

        yield ChatChunk(type="done", message_id=message_id)

    def _build_system_prompt(self, context: CaseContext) -> str:
        """Build ARIA system prompt"""
        return f"""You are ARIA (Audit Research & Investigation Assistant), an AI assistant helping investigate corporate fraud cases.

ROLE:
- Help the investigator find and understand evidence
- Answer questions about documents in the case
- ALWAYS cite your sources with document references
- NEVER reveal who the culprit is directly
- NEVER make accusations - present facts and let the investigator decide

CASE CONTEXT:
- Company: {context.case.client_company['name']}
- Industry: {context.case.client_company['industry']}
- Investigation type: {context.case.scenario_type}

RESPONSE GUIDELINES:
- Be professional but with subtle personality
- Use irony sparingly when appropriate
- If you don't have information, say so clearly
- Always cite documents using [Document Title] format
- Present facts, not conclusions about guilt

FORBIDDEN:
- Directly naming the culprit
- Using words like "guilty", "criminal", "thief" with specific names
- Making up information not in the documents
- Speculating without hedging language"""

    def _build_context_prompt(self, chunks: list[RetrievedChunk]) -> str:
        """Build context from retrieved chunks"""
        context_parts = ["RELEVANT DOCUMENTS:"]

        for chunk in chunks:
            context_parts.append(f"""
--- {chunk.doc_type.upper()}: {chunk.title} ---
{chunk.content}
---""")

        return "\n".join(context_parts)
```

### 5.5. Scoring Service

```python
class ScoringService(BaseService):
    """Score player submissions"""

    async def score_submission(
        self,
        case: Case,
        submission: SubmissionInput
    ) -> ScoringResult:
        """Calculate score for a submission"""

        ground_truth = case.ground_truth
        breakdown = {}

        # 1. Culprit identification (35 points)
        culprit_score = self._score_culprits(
            submitted=set(submission.culprits),
            correct=set(ground_truth['culprits']),
            max_points=35
        )
        breakdown['culprit'] = culprit_score

        # 2. Mechanism explanation (25 points)
        mechanism_score = await self._score_mechanism(
            submitted=submission.mechanism,
            correct=ground_truth['mechanism'],
            max_points=25
        )
        breakdown['mechanism'] = mechanism_score

        # 3. Evidence quality (25 points)
        evidence_score = self._score_evidence(
            submitted=submission.evidence,
            key_evidence=ground_truth['key_evidence'],
            max_points=25
        )
        breakdown['evidence'] = evidence_score

        # 4. Efficiency (10 points)
        efficiency_score = self._score_efficiency(
            hints_used=submission.hints_used,
            time_seconds=submission.time_seconds,
            par_time=case.estimated_minutes * 60,
            max_points=10
        )
        breakdown['efficiency'] = efficiency_score

        # 5. Recommendations (5 points)
        recommendations_score = await self._score_recommendations(
            submitted=submission.recommendations,
            scenario_type=case.scenario_type,
            max_points=5
        )
        breakdown['recommendations'] = recommendations_score

        # Calculate total
        total = sum(s['earned'] for s in breakdown.values())

        # Determine grade
        grade = self._calculate_grade(total)

        # Generate feedback
        feedback = self._generate_feedback(breakdown, ground_truth)

        return ScoringResult(
            breakdown=breakdown,
            total_score=total,
            grade=grade,
            feedback=feedback
        )

    def _score_culprits(
        self,
        submitted: set[UUID],
        correct: set[UUID],
        max_points: int
    ) -> ScoreComponent:
        """Score culprit identification"""

        correct_ids = submitted & correct
        wrong_ids = submitted - correct
        missed_ids = correct - submitted

        if submitted == correct:
            earned = max_points
            details = ["All culprits correctly identified"]
        elif correct_ids and not wrong_ids:
            # Partial credit for correct without wrong
            earned = int(max_points * len(correct_ids) / len(correct))
            details = [f"Identified {len(correct_ids)} of {len(correct)} culprits"]
        elif correct_ids:
            # Reduced credit if wrong accusations
            earned = int(max_points * 0.5 * len(correct_ids) / len(correct))
            details = [
                f"Identified {len(correct_ids)} of {len(correct)} culprits",
                f"Incorrectly accused {len(wrong_ids)} innocent people"
            ]
        else:
            earned = 0
            details = ["No culprits correctly identified"]

        return ScoreComponent(
            earned=earned,
            max=max_points,
            details=details
        )

    async def _score_mechanism(
        self,
        submitted: str,
        correct: str,
        max_points: int
    ) -> ScoreComponent:
        """Score mechanism explanation using LLM"""

        prompt = f"""Compare these two explanations of a fraud mechanism.

CORRECT EXPLANATION:
{correct}

SUBMITTED EXPLANATION:
{submitted}

Score the submission on these criteria (0-100 each):
1. Identifies the correct fraud type
2. Explains how the fraud was executed
3. Identifies key steps/timeline
4. Accuracy of details

Respond with JSON: {{"fraud_type": int, "execution": int, "steps": int, "accuracy": int, "feedback": str}}"""

        response = await self.llm.complete([{"role": "user", "content": prompt}])
        scores = json.loads(response.content)

        avg_score = sum(scores[k] for k in ['fraud_type', 'execution', 'steps', 'accuracy']) / 4
        earned = int(max_points * avg_score / 100)

        return ScoreComponent(
            earned=earned,
            max=max_points,
            details=[scores['feedback']]
        )

    def _calculate_grade(self, total: int) -> str:
        """Convert score to letter grade"""
        if total >= 90:
            return 'S'
        elif total >= 80:
            return 'A'
        elif total >= 70:
            return 'B'
        elif total >= 60:
            return 'C'
        elif total >= 50:
            return 'D'
        else:
            return 'F'
```

---

## 6. LLM Integration

### 6.1. Provider Abstraction

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator

class LLMProvider(ABC):
    """Abstract interface for LLM providers"""

    @abstractmethod
    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        tools: list[Tool] | None = None
    ) -> CompletionResult:
        """Generate completion"""
        pass

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7
    ) -> AsyncIterator[str]:
        """Stream completion"""
        pass

    @abstractmethod
    async def embed(
        self,
        texts: list[str]
    ) -> list[list[float]]:
        """Generate embeddings"""
        pass


class AzureOpenAIProvider(LLMProvider):
    """Azure OpenAI implementation"""

    def __init__(self, config: AzureConfig):
        self.client = AsyncAzureOpenAI(
            api_key=config.api_key,
            api_version=config.api_version,
            azure_endpoint=config.endpoint
        )
        self.chat_deployment = config.chat_deployment
        self.embedding_deployment = config.embedding_deployment

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        tools: list[Tool] | None = None
    ) -> CompletionResult:
        response = await self.client.chat.completions.create(
            model=self.chat_deployment,
            messages=[m.to_dict() for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
            tools=[t.to_dict() for t in tools] if tools else None
        )

        return CompletionResult(
            content=response.choices[0].message.content,
            tool_calls=response.choices[0].message.tool_calls,
            usage=Usage(
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens
            )
        )

    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7
    ) -> AsyncIterator[str]:
        response = await self.client.chat.completions.create(
            model=self.chat_deployment,
            messages=[m.to_dict() for m in messages],
            temperature=temperature,
            stream=True
        )

        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def embed(self, texts: list[str]) -> list[list[float]]:
        response = await self.client.embeddings.create(
            model=self.embedding_deployment,
            input=texts
        )
        return [e.embedding for e in response.data]


class OllamaProvider(LLMProvider):
    """Local Ollama for development"""

    def __init__(self, config: OllamaConfig):
        self.base_url = config.base_url
        self.model = config.model
        self.embedding_model = config.embedding_model
        self.client = httpx.AsyncClient(base_url=self.base_url)

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        tools: list[Tool] | None = None
    ) -> CompletionResult:
        response = await self.client.post(
            "/api/chat",
            json={
                "model": self.model,
                "messages": [m.to_dict() for m in messages],
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                },
                "stream": False
            }
        )
        data = response.json()

        return CompletionResult(
            content=data["message"]["content"],
            tool_calls=None,
            usage=Usage(
                input_tokens=data.get("prompt_eval_count", 0),
                output_tokens=data.get("eval_count", 0)
            )
        )

    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7
    ) -> AsyncIterator[str]:
        async with self.client.stream(
            "POST",
            "/api/chat",
            json={
                "model": self.model,
                "messages": [m.to_dict() for m in messages],
                "options": {"temperature": temperature},
                "stream": True
            }
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    data = json.loads(line)
                    if "message" in data and "content" in data["message"]:
                        yield data["message"]["content"]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        embeddings = []
        for text in texts:
            response = await self.client.post(
                "/api/embeddings",
                json={"model": self.embedding_model, "prompt": text}
            )
            embeddings.append(response.json()["embedding"])
        return embeddings


def get_llm_provider(config: Settings) -> LLMProvider:
    """Factory for LLM providers"""
    providers = {
        "azure": lambda: AzureOpenAIProvider(config.azure),
        "openai": lambda: OpenAIProvider(config.openai),
        "anthropic": lambda: AnthropicProvider(config.anthropic),
        "ollama": lambda: OllamaProvider(config.ollama),
    }

    if config.llm_provider not in providers:
        raise ValueError(f"Unknown LLM provider: {config.llm_provider}")

    return providers[config.llm_provider]()
```

### 6.2. Token Management

```python
class TokenBudget:
    """Manage token usage per player/case"""

    def __init__(self, redis: Redis, config: Settings):
        self.redis = redis
        self.config = config

    async def check_budget(
        self,
        player_id: UUID,
        case_id: UUID,
        estimated_tokens: int
    ) -> bool:
        """Check if request is within budget"""
        key = f"tokens:{player_id}:{case_id}"
        used = int(await self.redis.get(key) or 0)

        return used + estimated_tokens <= self.config.max_tokens_per_case

    async def record_usage(
        self,
        player_id: UUID,
        case_id: UUID,
        tokens: int
    ):
        """Record token usage"""
        key = f"tokens:{player_id}:{case_id}"

        pipe = self.redis.pipeline()
        pipe.incrby(key, tokens)
        pipe.expire(key, 86400 * 7)  # 7 days TTL
        await pipe.execute()

    async def get_usage(
        self,
        player_id: UUID,
        case_id: UUID
    ) -> int:
        """Get current token usage"""
        key = f"tokens:{player_id}:{case_id}"
        return int(await self.redis.get(key) or 0)
```

---

## 7. Security

### 7.1. Authentication

```python
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """Handle authentication"""

    def __init__(self, config: Settings, db: AsyncSession, redis: Redis):
        self.config = config
        self.db = db
        self.redis = redis

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def create_access_token(
        self,
        player_id: UUID,
        expires_delta: timedelta | None = None
    ) -> str:
        expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))

        payload = {
            "sub": str(player_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }

        return jwt.encode(
            payload,
            self.config.jwt_secret,
            algorithm="HS256"
        )

    def create_refresh_token(self, player_id: UUID) -> str:
        expire = datetime.utcnow() + timedelta(days=30)

        payload = {
            "sub": str(player_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }

        return jwt.encode(
            payload,
            self.config.jwt_refresh_secret,
            algorithm="HS256"
        )

    async def verify_token(self, token: str) -> UUID | None:
        try:
            payload = jwt.decode(
                token,
                self.config.jwt_secret,
                algorithms=["HS256"]
            )

            # Check if token is blacklisted
            if await self.redis.exists(f"blacklist:{token}"):
                return None

            return UUID(payload["sub"])

        except JWTError:
            return None

    async def blacklist_token(self, token: str, expires_in: int):
        """Blacklist a token (for logout)"""
        await self.redis.setex(f"blacklist:{token}", expires_in, "1")
```

### 7.2. Rate Limiting

```python
from fastapi import Request, HTTPException

class RateLimiter:
    """Token bucket rate limiter"""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window: int  # seconds
    ) -> tuple[bool, dict]:
        """Check if request is within rate limit"""

        now = time.time()
        window_start = now - window

        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current entries
        pipe.zcard(key)

        # Add new entry
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, window)

        results = await pipe.execute()
        current_count = results[1]

        headers = {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(max(0, limit - current_count - 1)),
            "X-RateLimit-Reset": str(int(now + window))
        }

        if current_count >= limit:
            return False, headers

        return True, headers


# Middleware
async def rate_limit_middleware(request: Request, call_next):
    limiter = request.app.state.rate_limiter

    # Determine rate limit based on auth status
    player_id = getattr(request.state, "player_id", None)

    if player_id:
        key = f"ratelimit:player:{player_id}"
        limit = 60  # 60 req/min for authenticated
    else:
        key = f"ratelimit:ip:{request.client.host}"
        limit = 20  # 20 req/min for anonymous

    allowed, headers = await limiter.check_rate_limit(key, limit, 60)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers=headers
        )

    response = await call_next(request)

    for key, value in headers.items():
        response.headers[key] = value

    return response
```

### 7.3. Security Headers & CORS

```python
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # ["https://officedetective.game"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"

        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

## 8. Error Handling

### 8.1. Exception Classes

```python
class AppError(Exception):
    """Base application error"""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict | None = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(
            code=f"{resource.upper()}_NOT_FOUND",
            message=f"{resource} not found: {id}",
            status_code=404
        )


class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            code="AUTH_FAILED",
            message=message,
            status_code=401
        )


class AuthorizationError(AppError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            code="ACCESS_DENIED",
            message=message,
            status_code=403
        )


class RateLimitError(AppError):
    def __init__(self, retry_after: int):
        super().__init__(
            code="RATE_LIMIT_EXCEEDED",
            message="Too many requests",
            status_code=429,
            details={"retry_after": retry_after}
        )


class ValidationError(AppError):
    def __init__(self, errors: list[dict]):
        super().__init__(
            code="VALIDATION_ERROR",
            message="Invalid request data",
            status_code=422,
            details={"errors": errors}
        )
```

### 8.2. Exception Handlers

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            },
            "meta": {
                "request_id": request.state.request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    # Log the full error
    logger.exception(
        "unhandled_exception",
        request_id=request.state.request_id,
        path=request.url.path,
        method=request.method
    )

    # Report to Sentry
    if sentry_sdk:
        sentry_sdk.capture_exception(exc)

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {}
            },
            "meta": {
                "request_id": request.state.request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

---

## 9. Monitoring & Logging

### 9.1. Structured Logging

```python
import structlog

def configure_logging(settings: Settings):
    """Configure structured logging"""

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if settings.env == "production"
            else structlog.dev.ConsoleRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.INFO if settings.env == "production" else logging.DEBUG
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Usage
logger = structlog.get_logger()

logger.info(
    "case_started",
    player_id=str(player_id),
    case_id=str(case_id),
    difficulty=case.difficulty
)

logger.error(
    "llm_request_failed",
    provider="azure",
    error=str(e),
    latency_ms=latency
)
```

### 9.2. Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Business metrics
CASES_STARTED = Counter(
    "cases_started_total",
    "Total cases started",
    ["difficulty", "scenario_type"]
)

CASES_COMPLETED = Counter(
    "cases_completed_total",
    "Total cases completed",
    ["difficulty", "grade"]
)

CHAT_MESSAGES = Counter(
    "chat_messages_total",
    "Total chat messages",
    ["role"]  # user, assistant
)

LLM_TOKENS = Counter(
    "llm_tokens_total",
    "Total LLM tokens used",
    ["provider", "type"]  # input, output
)

LLM_LATENCY = Histogram(
    "llm_request_duration_seconds",
    "LLM request latency",
    ["provider", "operation"],  # complete, stream, embed
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

ACTIVE_PLAYERS = Gauge(
    "active_players",
    "Currently active players"
)
```

### 9.3. Health Checks

```python
@app.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy"}

@app.get("/health/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Readiness check with dependencies"""

    checks = {}

    # Database check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {e}"

    # Redis check
    try:
        await redis.ping()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {e}"

    # LLM check (optional, cached)
    # ...

    all_healthy = all(v == "healthy" for v in checks.values())

    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "healthy" if all_healthy else "unhealthy",
            "checks": checks
        }
    )
```

---

## 10. Testing Strategy

### 10.1. Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── test_case_service.py
│   │   ├── test_rag_service.py
│   │   ├── test_scoring_service.py
│   │   └── test_agent_service.py
│   ├── test_guardrails.py
│   └── test_auth.py
├── integration/
│   ├── test_api_cases.py
│   ├── test_api_chat.py
│   ├── test_api_player.py
│   └── test_database.py
├── e2e/
│   ├── test_full_game_flow.py
│   └── test_case_generation.py
├── fixtures/
│   ├── cases.py
│   ├── players.py
│   └── documents.py
└── conftest.py
```

### 10.2. Test Examples

```python
# tests/unit/services/test_scoring_service.py
import pytest
from uuid import uuid4

class TestScoringService:

    @pytest.fixture
    def scoring_service(self, db_session, config):
        return ScoringService(db_session, None, config)

    @pytest.fixture
    def sample_case(self):
        return Case(
            id=uuid4(),
            ground_truth={
                "culprits": [str(uuid4())],
                "mechanism": "Created phantom vendor for self-payment",
                "key_evidence": [
                    {"id": "address_match", "documents": ["doc1"]},
                    {"id": "approval_pattern", "documents": ["doc2"]}
                ]
            }
        )

    async def test_perfect_submission_gets_s_grade(
        self, scoring_service, sample_case
    ):
        submission = SubmissionInput(
            culprits=sample_case.ground_truth["culprits"],
            mechanism="The employee created a phantom vendor company...",
            evidence=[
                {"document_id": "doc1", "supports": "address_match"},
                {"document_id": "doc2", "supports": "approval_pattern"}
            ],
            recommendations="Implement dual approval...",
            hints_used=0,
            time_seconds=600
        )

        result = await scoring_service.score_submission(sample_case, submission)

        assert result.grade == "S"
        assert result.total_score >= 90

    async def test_wrong_culprit_fails(
        self, scoring_service, sample_case
    ):
        submission = SubmissionInput(
            culprits=[str(uuid4())],  # Wrong culprit
            mechanism="Someone did fraud",
            evidence=[],
            hints_used=0,
            time_seconds=600
        )

        result = await scoring_service.score_submission(sample_case, submission)

        assert result.breakdown["culprit"]["earned"] == 0
        assert result.grade in ["D", "F"]


# tests/integration/test_api_chat.py
import pytest
from httpx import AsyncClient

class TestChatAPI:

    @pytest.fixture
    async def started_case(self, client: AsyncClient, auth_headers: dict):
        # Start a case first
        response = await client.post(
            "/api/v1/cases/test-case-id/start",
            headers=auth_headers
        )
        return response.json()["data"]

    async def test_chat_returns_citations(
        self, client: AsyncClient, auth_headers: dict, started_case
    ):
        response = await client.post(
            f"/api/v1/cases/{started_case['case_id']}/chat",
            json={"message": "Who approved the invoices?", "stream": False},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()["data"]

        assert "content" in data
        assert "citations" in data
        assert len(data["citations"]) > 0

        # Verify citations have required fields
        for citation in data["citations"]:
            assert "document_id" in citation
            assert "text" in citation

    async def test_chat_does_not_reveal_culprit(
        self, client: AsyncClient, auth_headers: dict, started_case
    ):
        response = await client.post(
            f"/api/v1/cases/{started_case['case_id']}/chat",
            json={"message": "Who is the thief?", "stream": False},
            headers=auth_headers
        )

        data = response.json()["data"]

        # Should not contain direct accusation
        assert "guilty" not in data["content"].lower()
        assert "culprit is" not in data["content"].lower()
```

---

## 11. Deployment

### 11.1. Docker Production

```dockerfile
# apps/api/Dockerfile
FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-dev --no-interaction

# Production image
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 11.2. Production Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: officedetective/api:${VERSION:-latest}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      LLM_PROVIDER: azure
      AZURE_API_KEY: ${AZURE_API_KEY}
      AZURE_ENDPOINT: ${AZURE_ENDPOINT}
      SENTRY_DSN: ${SENTRY_DSN}
      ENV: production
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    image: officedetective/web:${VERSION:-latest}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api
      - web
```

### 11.3. Environment Configuration

```python
# src/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Environment
    env: str = "development"
    debug: bool = False

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Authentication
    jwt_secret: str
    jwt_refresh_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    refresh_token_expire_days: int = 30

    # LLM
    llm_provider: str = "ollama"
    max_tokens_per_case: int = 50000

    # Azure OpenAI (if provider is azure)
    azure_api_key: str | None = None
    azure_endpoint: str | None = None
    azure_api_version: str = "2024-02-01"
    azure_chat_deployment: str = "gpt-4"
    azure_embedding_deployment: str = "text-embedding-3-small"

    # Ollama (if provider is ollama)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    ollama_embedding_model: str = "nomic-embed-text"

    # Rate limiting
    rate_limit_anonymous: int = 20
    rate_limit_authenticated: int = 60
    rate_limit_chat: int = 20

    # Monitoring
    sentry_dsn: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

---

## 12. Project Structure

```
office-detective/
├── apps/
│   ├── web/                              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                      # App router
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (game)/
│   │   │   │   │   ├── cases/
│   │   │   │   │   ├── play/[id]/
│   │   │   │   │   └── results/[id]/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # shadcn components
│   │   │   │   ├── inbox/
│   │   │   │   ├── document-viewer/
│   │   │   │   ├── search/
│   │   │   │   ├── chat/
│   │   │   │   ├── board/
│   │   │   │   └── shared/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── api.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── utils.ts
│   │   │   ├── stores/
│   │   │   │   ├── game-store.ts
│   │   │   │   └── ui-store.ts
│   │   │   └── types/
│   │   ├── public/
│   │   │   └── locales/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── api/                              # FastAPI backend
│       ├── src/
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── dependencies.py
│       │   ├── routers/
│       │   │   ├── __init__.py
│       │   │   ├── auth.py
│       │   │   ├── cases.py
│       │   │   ├── documents.py
│       │   │   ├── chat.py
│       │   │   ├── player.py
│       │   │   └── admin.py
│       │   ├── services/
│       │   │   ├── __init__.py
│       │   │   ├── case_service.py
│       │   │   ├── rag_service.py
│       │   │   ├── agent_service.py
│       │   │   ├── scoring_service.py
│       │   │   ├── player_service.py
│       │   │   └── generation_service.py
│       │   ├── agents/
│       │   │   ├── __init__.py
│       │   │   ├── aria.py
│       │   │   ├── tools.py
│       │   │   └── guardrails.py
│       │   ├── llm/
│       │   │   ├── __init__.py
│       │   │   ├── provider.py
│       │   │   ├── azure.py
│       │   │   ├── openai.py
│       │   │   └── ollama.py
│       │   ├── models/
│       │   │   ├── __init__.py
│       │   │   ├── case.py
│       │   │   ├── document.py
│       │   │   ├── entity.py
│       │   │   ├── player.py
│       │   │   └── chat.py
│       │   ├── schemas/
│       │   │   ├── __init__.py
│       │   │   ├── requests.py
│       │   │   ├── responses.py
│       │   │   └── common.py
│       │   ├── db/
│       │   │   ├── __init__.py
│       │   │   ├── session.py
│       │   │   └── migrations/
│       │   └── utils/
│       │       ├── __init__.py
│       │       ├── security.py
│       │       └── helpers.py
│       ├── tests/
│       ├── alembic/
│       ├── alembic.ini
│       ├── Dockerfile
│       └── pyproject.toml
│
├── packages/
│   └── shared/
│       └── schemas/                      # Shared TypeScript/Python schemas
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   ├── nginx/
│   │   └── nginx.conf
│   ├── scripts/
│   │   ├── setup.sh
│   │   ├── seed.sh
│   │   └── migrate.sh
│   └── terraform/                        # IaC (optional)
│
├── data/
│   ├── templates/                        # Case templates (YAML)
│   ├── handcrafted/                      # Handcrafted cases
│   └── seeds/                            # Seed data
│
├── docs/
│   ├── README.md
│   ├── 01_GAME_DESIGN.md
│   ├── 02_CASE_GENERATION.md
│   ├── 03_TECHNICAL_ARCHITECTURE.md
│   └── ...
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── test.yml
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

_Next: [UI/UX Design](./04_UI_UX.md)_
