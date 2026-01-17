# Office Detective — Game Design & Technical Document v2

> "Every spreadsheet tells a story. Most are boring. Yours isn't."

---

## 1. Vision & Identity

### 1.1. Elevator Pitch

**Office Detective** is a web-based investigation game where you play as a freelance forensic auditor hired by companies to solve corporate mysteries: fraud, embezzlement, data leaks, and sabotage. You dig through emails, invoices, chat logs, and financial records to connect the dots, identify the culprit, and deliver your report — all in 15-30 minute cases with a dark humor twist.

### 1.2. The Player Fantasy

You are **the person companies call when things don't add up**. Not the police — they're too slow and too public. You're the discreet professional who reads between the lines of expense reports and finds the skeleton in the supply chain.

Each case starts the same way: a nervous executive slides a digital dossier across the table (metaphorically) and says something like _"We think someone in procurement is... creative with the numbers."_ Your job is to prove it — or discover something worse.

### 1.3. Tone & Atmosphere

Inspired by **Agatha Christie's wit** and **Knives Out's satirical edge**:

- Corporate jargon used unironically becomes comedy ("Let's circle back to the embezzlement")
- Employees have petty rivalries, passive-aggressive emails, and questionable LinkedIn posts
- The crimes are serious, but the people committing them are often absurdly human
- Dark humor, never cruel — we laugh at the system, not the victims

**Sample flavor text:**

- _"The CFO's email signature says 'Integrity First.' The offshore accounts suggest otherwise."_
- _"Someone expensed 47 'team building dinners' in March. The team has 3 people."_
- _"The IT ticket reads: 'Please delete my browsing history. It's for security reasons.'"_

### 1.4. Target Audience

| Segment               | Description                             | What they want                                |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| **Primary**           | Puzzle/mystery game enthusiasts (25-45) | Satisfying "aha" moments, fair challenges     |
| **Secondary**         | True crime / investigation fans         | Realistic scenarios, document-based gameplay  |
| **Tertiary**          | Business/finance professionals          | Relatable humor, "I've seen this IRL" moments |
| **Portfolio viewers** | Tech recruiters, AI/ML peers            | Clean architecture, modern AI implementation  |

### 1.5. Unique Selling Points

1. **AI-powered assistant with mandatory citations** — The in-game AI helper can't lie or hallucinate; every claim links to a specific document
2. **Interactive evidence board** — Visualize connections between people, money, and documents
3. **Procedurally generated cases** — High replayability with template-based variation
4. **Bite-sized investigations** — Complete cases in 15-30 minutes
5. **Dark corporate humor** — Relatable absurdity of office life

---

## 2. Narrative Framework

### 2.1. Setting

You are a **freelance forensic auditor** operating under the name of your small consultancy. Companies hire you for discretion — they want answers before involving lawyers, shareholders, or law enforcement.

Your "office" is a minimalist web interface: your inbox, your case files, and your investigation board. No fancy 3D environments — just you and the documents.

### 2.2. Client Structure

Each case comes from a different fictional company, providing variety:

| Company Archetype            | Typical Cases                     | Humor Angle                          |
| ---------------------------- | --------------------------------- | ------------------------------------ |
| **TechBro Startup**          | Expense fraud, fake metrics       | Ping-pong tables and burn rate jokes |
| **Old-school Manufacturing** | Inventory manipulation, kickbacks | "We've always done it this way"      |
| **Family Business**          | Embezzlement, nepotism covers     | Thanksgiving dinner tension          |
| **Corporate Giant**          | Data leaks, whistleblower hunts   | Bureaucratic absurdity               |
| **NGO / Non-profit**         | Donation skimming, fake programs  | "For the children" irony             |

### 2.3. Recurring Elements

- **Your Contact**: Each company has a nervous liaison who hired you. They provide context (and sometimes misdirection)
- **The Dossier**: Your starting package of documents, emails, and records
- **The Board**: Where you connect the dots visually
- **The Report**: Your final submission with accusations and evidence

### 2.4. Case Naming Convention

Cases have bureaucratic-sounding names with dark undertones:

- _"The Mallory Procurement Irregularity"_
- _"Q3 Inventory Reconciliation Discrepancy"_
- _"The Henderson Expense Account Matter"_
- _"Vendor Relationship Audit — Sunshine Supplies Ltd."_

---

## 3. Gameplay Design

### 3.1. Core Loop (15-30 minutes)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. RECEIVE CASE                                                │
│     → Read briefing from client contact                         │
│     → Understand what you're looking for                        │
│                                                                 │
│  2. EXPLORE DOSSIER                                             │
│     → Browse inbox (emails, chats, tickets)                     │
│     → Review documents (invoices, reports, CSVs)                │
│     → Note suspicious items                                     │
│                                                                 │
│  3. INVESTIGATE                                                 │
│     → Search documents (keyword + semantic)                     │
│     → Ask the AI assistant questions (with citations)           │
│     → Request hints if stuck                                    │
│                                                                 │
│  4. CONNECT                                                     │
│     → Pin evidence to your board                                │
│     → Draw connections between entities                         │
│     → Build your theory                                         │
│                                                                 │
│  5. SUBMIT REPORT                                               │
│     → Identify culprit(s)                                       │
│     → Explain the mechanism                                     │
│     → Cite your evidence                                        │
│     → Receive score and breakdown                               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Difficulty Progression

| Level | Name          | Documents | Culprits | Red Herrings | Complexity                      |
| ----- | ------------- | --------- | -------- | ------------ | ------------------------------- |
| 1     | **Intern**    | 15-20     | 1        | 0-1          | Linear trail, obvious evidence  |
| 2     | **Associate** | 25-30     | 1        | 2-3          | Some noise, need to filter      |
| 3     | **Senior**    | 35-45     | 1-2      | 3-5          | Accomplices, partial alibis     |
| 4     | **Manager**   | 45-55     | 2        | 5-7          | Timeline critical, misdirection |
| 5     | **Partner**   | 55-70     | 2-3      | 7+           | Conspiracy, ambiguous evidence  |

**What changes by level:**

- **Document volume**: More noise to filter
- **Evidence clarity**: From "smoking gun" to "circumstantial pattern"
- **Red herrings**: From none to deliberate misdirection
- **Required connections**: From direct (A→B) to indirect (A→B→C→D)
- **Timeline importance**: From irrelevant to critical

### 3.3. Document Types

| Type               | Description                     | Key Information                               |
| ------------------ | ------------------------------- | --------------------------------------------- |
| **Email**          | Corporate communication         | Sender, recipients, thread, tone, attachments |
| **Chat/IM**        | Informal messages (Slack-style) | Timestamps, casual admissions, emoji usage    |
| **Invoice**        | Billing documents               | Amounts, vendors, approval chain, line items  |
| **Expense Report** | Employee expenses               | Dates, categories, receipts, approver         |
| **Bank Statement** | Financial records               | Transactions, accounts, dates, references     |
| **HR Record**      | Personnel files                 | Roles, history, relationships, complaints     |
| **IT Ticket**      | Tech support requests           | Access requests, "deleted" items, timestamps  |
| **Meeting Notes**  | Summaries and minutes           | Decisions, attendees, action items            |
| **Contract**       | Legal agreements                | Terms, signatories, amendments                |
| **Spreadsheet**    | Data files                      | Formulas, hidden columns, discrepancies       |

### 3.4. AI Assistant ("ARIA" — Audit Research & Investigation Assistant)

The player has access to an AI assistant that can:

1. **Answer questions** about the case documents
2. **Search** across all documents semantically
3. **Summarize** complex documents or threads
4. **Highlight** connections between entities

**Critical constraint**: ARIA must cite sources for every claim. If asked something not in the documents, it says so. This is both a gameplay mechanic (teaches players to verify) and a technical showcase (RAG with grounding).

**Sample interactions:**

```
Player: "Who approved the Sunshine Supplies invoices?"

ARIA: "The invoices from Sunshine Supplies Ltd. were approved by
       Marcus Chen (Procurement Manager) according to the approval
       stamps on INV-2024-0892 [Invoice #0892, page 1] and
       INV-2024-0923 [Invoice #0923, page 1]. However, I note that
       both invoices were processed on the same day despite being
       dated three weeks apart [Invoice #0892, metadata]."
```

```
Player: "Is Marcus Chen the thief?"

ARIA: "I can't determine guilt — that's your job. However, I can
       tell you that Marcus Chen approved all 12 Sunshine Supplies
       invoices [Approval Log, rows 45-56], and the company's
       registered address matches his home address according to
       the vendor registration form [Vendor Form VS-2024-112]."
```

### 3.5. Hint System (Tiered)

To prevent frustration without removing challenge:

| Tier | Name           | Cost    | What it provides                                                             |
| ---- | -------------- | ------- | ---------------------------------------------------------------------------- |
| 0    | **Nudge**      | Free    | General direction ("Have you looked at all March documents?")                |
| 1    | **Pointer**    | -5 pts  | Category hint ("There's something interesting in the expense reports")       |
| 2    | **Spotlight**  | -15 pts | Specific document ("Check invoice #4521 carefully")                          |
| 3    | **Connection** | -25 pts | Relationship hint ("Compare the IBAN on that invoice with employee records") |
| 4    | **Revelation** | -40 pts | Direct evidence ("The IBAN matches Marcus Chen's personal account")          |

**Hint generation**: Hints are pre-generated during case creation based on the solution path, ensuring they're always accurate and helpful.

### 3.6. Evidence Board Mechanics

The board is the player's workspace for connecting dots:

**Node types:**

- 📄 Document (or document fragment)
- 👤 Person
- 🏢 Organization
- 💰 Account/Financial entity
- 📦 Asset (inventory, equipment)
- 📍 Location
- 🕐 Event (timestamped occurrence)

**Actions:**

- **Pin**: Add item to board from document viewer
- **Connect**: Draw relationship line between nodes
- **Label**: Add relationship type (paid, approved, sent, etc.)
- **Annotate**: Add personal notes to any node
- **Highlight**: Mark as "suspicious" or "key evidence"
- **Group**: Cluster related items visually

**Auto-suggestions**: When you pin an entity, the system can suggest related items from the documents (opt-in, to avoid spoilers).

### 3.7. Scoring System

Final score (0-100) based on:

| Component            | Weight | Criteria                                        |
| -------------------- | ------ | ----------------------------------------------- |
| **Culprit ID**       | 35%    | Correct identification of all guilty parties    |
| **Mechanism**        | 25%    | Accurate description of how the crime worked    |
| **Evidence Quality** | 25%    | Relevant citations, no weak/irrelevant evidence |
| **Efficiency**       | 10%    | Hints used, time taken (gentle curve)           |
| **Recommendations**  | 5%     | Sensible preventive measures suggested          |

**Scoring feedback**: After submission, players see what they got right/wrong and can review the full solution with all evidence highlighted.

### 3.8. Failure & Retry

- **Wrong culprit**: Major penalty, can retry with hint unlock
- **Partial solution**: Partial credit, feedback on what's missing
- **No submission**: Case stays open, can return anytime
- **Review mode**: After solving (or giving up), full solution revealed with walkthrough

---

## 4. Case Generation

### 4.1. Philosophy: Templates + Variation

Cases are **not fully procedural** (too risky for fairness) but use a template system:

```
Template: "Phantom Vendor Fraud"
├── Required roles: Procurement, Finance, Accomplice Vendor
├── Required evidence: Fake invoices, approval chain, payment proof
├── Required pattern: Money flows to entity connected to insider
├── Variables: Names, amounts, dates, company context
└── Expansion slots: Red herrings, additional suspects, complexity layers
```

### 4.2. Generation Pipeline

```
1. SELECT template based on case type
2. GENERATE entities (people, orgs, accounts) with consistent attributes
3. CREATE timeline of events (crime + normal activity)
4. MATERIALIZE documents from events (email for communication, invoice for transaction, etc.)
5. INJECT noise (unrelated but realistic documents)
6. INJECT red herrings (suspicious but innocent items)
7. VALIDATE solvability (all evidence accessible, no contradictions)
8. LOCALIZE text (Spanish/English based on player setting)
9. STORE case with ground truth for scoring
```

### 4.3. Template Structure (Example)

```yaml
template_id: phantom_vendor_001
name: 'Phantom Vendor Fraud'
difficulty_base: 2
duration_target: 20 # minutes

roles:
  insider:
    type: employee
    departments: [procurement, operations]
    required_access: [vendor_approval, purchase_orders]

  phantom_vendor:
    type: organization
    attributes:
      - recently_registered: true
      - single_service: true
      - address_link: insider.personal # key evidence

  approver:
    type: employee
    departments: [finance, management]
    relationship_to_insider: [reports_to, colleagues, none]

evidence_chain:
  - type: vendor_registration
    contains: [phantom_vendor.address, insider.connection]
    suspicion_level: high

  - type: invoices
    count: 3-6
    contains: [inflated_amounts, vague_descriptions]
    approved_by: insider

  - type: payment_records
    contains: [phantom_vendor.account, payment_dates]

  - type: communication
    subtype: email
    between: [insider, phantom_vendor]
    tone: suspiciously_familiar
    count: 2-4

noise_documents:
  - type: emails
    topic: [meetings, projects, hr_announcements]
    count: 10-15

  - type: invoices
    vendors: legitimate
    count: 5-8

red_herrings:
  - type: suspicious_expense
    owner: random_employee
    explanation: legitimate_but_unusual
    count: 1-2

ground_truth:
  culprits: [insider]
  mechanism: 'Created phantom vendor to submit fake invoices for personal gain'
  total_amount: variable # sum of fake invoices
  key_evidence:
    - vendor_registration.address_match
    - invoice.approval_pattern
    - communication.familiar_tone
```

### 4.4. Text Generation

**Two-phase approach:**

1. **Structural generation** (deterministic): Create document skeletons with all required data points
2. **Naturalization** (LLM): Make text sound human, add personality, maintain consistency

```python
# Phase 1: Deterministic skeleton
email_skeleton = {
    "from": "marcus.chen@acmecorp.com",
    "to": "invoices@sunshine-supplies.com",
    "subject": "RE: Invoice #4521",
    "key_points": [
        "confirms receipt of invoice",
        "mentions 'usual arrangement'",
        "asks about next shipment"
    ],
    "tone": "suspiciously_familiar",
    "must_include": ["invoice number", "payment timeline"]
}

# Phase 2: LLM naturalization
prompt = """
Convert this email skeleton into a natural corporate email.
Tone: The sender knows the recipient personally but is trying to sound professional.
Include subtle hints of familiarity without being obvious.
Keep it under 150 words.
"""
```

### 4.5. Localization Strategy

- **Code and schemas**: Always English
- **Document content**: Generated in target language
- **UI strings**: i18n with standard library (i18next or similar)
- **LLM prompts**: English (better performance), output in target language

```python
# Naturalization prompt includes language instruction
prompt = f"""
Generate the email in {target_language}.
Maintain the same level of formality typical in {target_language} business communication.
"""
```

### 4.6. Solvability Validation

Every generated case must pass automated checks:

```python
class CaseValidator:
    def validate(self, case: GeneratedCase) -> ValidationResult:
        checks = [
            self.check_evidence_chain_complete(),      # Can reach conclusion from docs
            self.check_no_contradictions(),            # Dates, amounts, names consistent
            self.check_evidence_accessible(),          # No circular dependencies
            self.check_red_herrings_distinguishable(), # False leads have tells
            self.check_difficulty_appropriate(),       # Doc count, complexity match level
            self.check_minimum_evidence_count(),       # At least N strong pieces
        ]
        return ValidationResult(checks)
```

**Optional**: LLM-based validation agent that attempts to solve the case using only the tools available to players.

---

## 5. Technical Architecture

### 5.1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                         Next.js + TypeScript                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Inbox  │ │  Viewer │ │  Search │ │   Chat  │ │  Board  │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
└───────┼───────────┼───────────┼───────────┼───────────┼─────────────────┘
        │           │           │           │           │
        └───────────┴───────────┴─────┬─────┴───────────┘
                                      │ REST/WebSocket
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                     │
│                         FastAPI + Python                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Case Service │ │  RAG Service │ │Agent Service │ │ Game Service │   │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            PERSISTENCE                                   │
│         ┌─────────────────────────────────────────┐                     │
│         │         PostgreSQL + pgvector           │                     │
│         │  • Cases, Documents, Entities           │                     │
│         │  • Embeddings (vector search)           │                     │
│         │  • Player state, Submissions            │                     │
│         │  • Entity graph (edge table)            │                     │
│         └─────────────────────────────────────────┘                     │
│                                                                          │
│         ┌─────────────────────────────────────────┐                     │
│         │         Neo4j (Phase 2)                 │                     │
│         │  • Complex graph queries                │                     │
│         │  • Path finding, pattern matching       │                     │
│         └─────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Technology Stack

#### Frontend

| Technology       | Purpose              | Notes                                       |
| ---------------- | -------------------- | ------------------------------------------- |
| **Next.js 14+**  | Framework            | App Router, Server Components               |
| **TypeScript**   | Language             | Strict mode                                 |
| **Tailwind CSS** | Styling              | With custom theme for "corporate noir" feel |
| **shadcn/ui**    | Components           | Customizable, accessible                    |
| **React Flow**   | Graph visualization  | For evidence board                          |
| **Zustand**      | State management     | Lightweight, sufficient for needs           |
| **i18next**      | Internationalization | ES/EN support                               |

#### Backend

| Technology         | Purpose         | Notes                        |
| ------------------ | --------------- | ---------------------------- |
| **Python 3.12**    | Language        | Type hints throughout        |
| **FastAPI**        | API framework   | Async, OpenAPI docs          |
| **Pydantic v2**    | Validation      | Schemas shared with frontend |
| **SQLAlchemy 2.0** | ORM             | Async support                |
| **LangChain**      | LLM abstraction | Provider-agnostic            |

#### Data

| Technology        | Purpose          | Notes                             |
| ----------------- | ---------------- | --------------------------------- |
| **PostgreSQL 16** | Primary database | All persistent data               |
| **pgvector**      | Vector search    | Embeddings for semantic search    |
| **Redis**         | Cache + sessions | Optional, for scaling             |
| **Neo4j**         | Graph queries    | Phase 2, complex pattern matching |

#### Infrastructure

| Technology         | Purpose             | Notes               |
| ------------------ | ------------------- | ------------------- |
| **Docker**         | Containerization    | Dev and prod parity |
| **Docker Compose** | Local orchestration | Dev environment     |

### 5.3. LLM Integration (Provider-Agnostic)

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator

class LLMProvider(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[Message],
        tools: list[Tool] | None = None
    ) -> CompletionResult:
        pass

    @abstractmethod
    async def stream(
        self,
        messages: list[Message]
    ) -> AsyncIterator[str]:
        pass

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        pass


class AzureFoundryProvider(LLMProvider):
    """Azure AI Foundry implementation"""
    pass

class OpenAIProvider(LLMProvider):
    """OpenAI API implementation"""
    pass

class AnthropicProvider(LLMProvider):
    """Anthropic Claude implementation"""
    pass

class OllamaProvider(LLMProvider):
    """Local Ollama implementation for development"""
    pass


# Factory based on configuration
def get_llm_provider(config: LLMConfig) -> LLMProvider:
    providers = {
        "azure": AzureFoundryProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "ollama": OllamaProvider,
    }
    return providers[config.provider](config)
```

### 5.4. Database Schema (PostgreSQL)

```sql
-- Core case structure
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL,  -- phantom_vendor, data_leak, etc.
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    language VARCHAR(5) NOT NULL DEFAULT 'en',  -- en, es
    seed INTEGER,  -- for reproducible generation
    client_company JSONB NOT NULL,  -- {name, industry, contact_person, briefing}
    ground_truth JSONB NOT NULL,  -- {culprits, mechanism, timeline, evidence}
    hints JSONB NOT NULL DEFAULT '[]',  -- pre-generated hint tiers
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published BOOLEAN DEFAULT FALSE
);

-- Documents in the case dossier
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,  -- email, invoice, chat, etc.
    doc_date TIMESTAMPTZ NOT NULL,  -- document's internal date
    subject VARCHAR(500),
    body TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',  -- type-specific: sender, recipients, amount, etc.
    is_key_evidence BOOLEAN DEFAULT FALSE,  -- marked during generation
    display_order INTEGER,  -- for inbox sorting
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_case_date ON documents(case_id, doc_date);
CREATE INDEX idx_documents_case_type ON documents(case_id, doc_type);

-- Document chunks for RAG
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),  -- adjust dimension based on model
    token_count INTEGER,
    metadata JSONB DEFAULT '{}',  -- offsets, section markers

    UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_case ON document_chunks(case_id);
CREATE INDEX idx_chunks_embedding ON document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Entities mentioned in documents
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,  -- person, organization, account, etc.
    name VARCHAR(255) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',  -- role, email, iban, etc.
    is_culprit BOOLEAN DEFAULT FALSE,  -- for scoring
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(case_id, entity_type, name)
);

CREATE INDEX idx_entities_case ON entities(case_id);
CREATE INDEX idx_entities_case_type ON entities(case_id, entity_type);

-- Entity mentions in documents (for highlighting)
CREATE TABLE entity_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    mention_text VARCHAR(255),
    char_start INTEGER,
    char_end INTEGER
);

CREATE INDEX idx_mentions_document ON entity_mentions(document_id);
CREATE INDEX idx_mentions_entity ON entity_mentions(entity_id);

-- Entity relationships (graph in PostgreSQL)
CREATE TABLE entity_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    edge_type VARCHAR(50) NOT NULL,  -- sent, approved, paid_to, works_at, etc.
    properties JSONB DEFAULT '{}',  -- timestamp, amount, document reference
    source_document_id UUID REFERENCES documents(id),
    weight FLOAT DEFAULT 1.0,  -- for graph algorithms

    UNIQUE(case_id, source_entity_id, target_entity_id, edge_type)
);

CREATE INDEX idx_edges_case ON entity_edges(case_id);
CREATE INDEX idx_edges_source ON entity_edges(source_entity_id);
CREATE INDEX idx_edges_target ON entity_edges(target_entity_id);

-- Player state
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,  -- auth provider ID
    display_name VARCHAR(100),
    language VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player progress on cases
CREATE TABLE player_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',  -- active, submitted, abandoned
    opened_documents UUID[] DEFAULT '{}',
    pinned_items JSONB DEFAULT '[]',  -- board state
    board_layout JSONB DEFAULT '{}',  -- node positions
    hints_used INTEGER DEFAULT 0,
    hint_history JSONB DEFAULT '[]',  -- which hints, when
    started_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(player_id, case_id)
);

CREATE INDEX idx_player_cases_player ON player_cases(player_id);
CREATE INDEX idx_player_cases_status ON player_cases(player_id, status);

-- Case submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_case_id UUID NOT NULL REFERENCES player_cases(id) ON DELETE CASCADE,
    answer JSONB NOT NULL,  -- {culprits, mechanism, recommendations}
    evidence_refs JSONB NOT NULL,  -- [{document_id, chunk_id, quote}]
    score_breakdown JSONB,  -- {culprit: 35, mechanism: 20, evidence: 25, ...}
    total_score INTEGER,
    feedback JSONB,  -- {missed_evidence: [], wrong_assumptions: []}
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_player_case ON submissions(player_case_id);

-- Chat history (for context, debugging, and potential fine-tuning data)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_case_id UUID NOT NULL REFERENCES player_cases(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- user, assistant
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',  -- assistant messages include doc refs
    tools_used JSONB DEFAULT '[]',  -- which tools were called
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_player_case ON chat_messages(player_case_id, created_at);
```

### 5.5. API Design

#### Core Endpoints

```yaml
# Cases
GET    /api/cases                     # List available cases
GET    /api/cases/{id}                # Get case details (metadata, not solution)
POST   /api/cases/{id}/start          # Start playing a case

# Documents
GET    /api/cases/{id}/documents      # List documents in case
GET    /api/documents/{id}            # Get full document content
POST   /api/cases/{id}/search         # Semantic search across documents

# Game State
GET    /api/player/cases              # List player's cases with progress
GET    /api/player/cases/{id}         # Get player's state for a case
PATCH  /api/player/cases/{id}         # Update state (pins, board, etc.)
POST   /api/player/cases/{id}/hint    # Request a hint
POST   /api/player/cases/{id}/submit  # Submit final answer

# AI Assistant
POST   /api/cases/{id}/chat           # Chat with ARIA (streaming response)

# Graph
GET    /api/cases/{id}/entities       # List entities in case
GET    /api/cases/{id}/graph          # Get full graph data
POST   /api/cases/{id}/graph/path     # Find path between entities
POST   /api/cases/{id}/graph/expand   # Get neighbors of entity
```

#### Request/Response Examples

```typescript
// POST /api/cases/{id}/chat
interface ChatRequest {
  message: string;
  conversation_id?: string; // for context continuity
}

interface ChatResponse {
  message: string;
  citations: Citation[];
  suggested_actions?: SuggestedAction[];
  tools_used: string[];
}

interface Citation {
  document_id: string;
  chunk_id: string;
  text: string;
  relevance: number;
}

// POST /api/player/cases/{id}/submit
interface SubmissionRequest {
  culprits: string[]; // entity IDs
  mechanism: string; // free text explanation
  evidence: EvidenceRef[];
  recommendations?: string;
}

interface EvidenceRef {
  document_id: string;
  chunk_id?: string;
  quote: string;
  supports: string; // what this evidence proves
}

interface SubmissionResponse {
  total_score: number;
  breakdown: ScoreBreakdown;
  feedback: SubmissionFeedback;
  solution?: CaseSolution; // revealed after submission
}
```

### 5.6. AI Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARIA (AI Assistant)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Router    │───▶│   Planner   │───▶│  Executor   │        │
│  │             │    │             │    │             │        │
│  │ Classifies  │    │ Decides     │    │ Runs tools  │        │
│  │ user intent │    │ tool usage  │    │ in sequence │        │
│  └─────────────┘    └─────────────┘    └──────┬──────┘        │
│                                               │                │
│                                               ▼                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                    TOOLS                                │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │ search_docs  │  │   get_doc    │  │ graph_query  │ │   │
│  │  │              │  │              │  │              │ │   │
│  │  │ Semantic     │  │ Full doc     │  │ Entity       │ │   │
│  │  │ search       │  │ retrieval    │  │ connections  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐                    │   │
│  │  │ list_entities│  │get_player_ctx│                    │   │
│  │  │              │  │              │                    │   │
│  │  │ Known people │  │ What player  │                    │   │
│  │  │ orgs, etc.   │  │ has seen     │                    │   │
│  │  └──────────────┘  └──────────────┘                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │ Synthesizer │───▶│  Guardrails │───▶ Response               │
│  │             │    │             │                            │
│  │ Combines    │    │ Validates   │                            │
│  │ tool output │    │ citations   │                            │
│  └─────────────┘    └─────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Tool Definitions

```python
from pydantic import BaseModel, Field

class SearchDocsInput(BaseModel):
    """Search case documents semantically"""
    query: str = Field(description="Natural language search query")
    doc_types: list[str] | None = Field(
        default=None,
        description="Filter by document types: email, invoice, chat, etc."
    )
    date_range: tuple[str, str] | None = Field(
        default=None,
        description="Filter by date range (ISO format)"
    )
    limit: int = Field(default=5, ge=1, le=10)


class SearchDocsOutput(BaseModel):
    results: list[SearchResult]
    total_found: int


class SearchResult(BaseModel):
    document_id: str
    chunk_id: str
    doc_type: str
    doc_date: str
    subject: str | None
    snippet: str
    relevance_score: float


class GraphQueryInput(BaseModel):
    """Query entity relationships"""
    query_type: str = Field(
        description="Type: neighbors, path, connected_component"
    )
    entity_ids: list[str] = Field(description="Starting entity IDs")
    edge_types: list[str] | None = Field(
        default=None,
        description="Filter by edge types: sent, approved, paid_to, etc."
    )
    max_depth: int = Field(default=2, ge=1, le=4)


class GraphQueryOutput(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
```

#### Guardrails Implementation

```python
class ResponseGuardrails:
    """Ensures ARIA responses meet quality standards"""

    def validate(self, response: AgentResponse) -> ValidationResult:
        errors = []
        warnings = []

        # Must have at least one citation for factual claims
        if response.has_factual_claims and not response.citations:
            errors.append("Response makes claims without citations")

        # Citations must reference actual documents
        for citation in response.citations:
            if not self.document_exists(citation.document_id):
                errors.append(f"Citation references non-existent document")
            if not self.text_in_document(citation.text, citation.document_id):
                errors.append(f"Citation text not found in document")

        # Don't reveal solution
        if self.mentions_culprit_directly(response.content):
            errors.append("Response reveals culprit directly")

        # Warn about speculation
        if self.contains_speculation(response.content):
            warnings.append("Response contains speculative statements")

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
```

### 5.7. Graph Queries (PostgreSQL Implementation)

For Phase 1, graph queries use PostgreSQL with recursive CTEs:

```sql
-- Find shortest path between two entities
WITH RECURSIVE paths AS (
    -- Base case: direct edges from source
    SELECT
        source_entity_id,
        target_entity_id,
        ARRAY[source_entity_id, target_entity_id] AS path,
        1 AS depth,
        ARRAY[id] AS edge_ids
    FROM entity_edges
    WHERE case_id = $1 AND source_entity_id = $2

    UNION ALL

    -- Recursive case: extend paths
    SELECT
        p.source_entity_id,
        e.target_entity_id,
        p.path || e.target_entity_id,
        p.depth + 1,
        p.edge_ids || e.id
    FROM paths p
    JOIN entity_edges e ON e.source_entity_id = p.target_entity_id
    WHERE e.case_id = $1
      AND e.target_entity_id != ALL(p.path)  -- avoid cycles
      AND p.depth < $4  -- max depth
)
SELECT * FROM paths
WHERE target_entity_id = $3
ORDER BY depth
LIMIT 1;

-- Get entity neighbors with relationship details
SELECT
    e.id,
    e.entity_type,
    e.name,
    e.attributes,
    ee.edge_type,
    ee.properties,
    d.subject AS source_document
FROM entity_edges ee
JOIN entities e ON e.id = ee.target_entity_id
LEFT JOIN documents d ON d.id = ee.source_document_id
WHERE ee.case_id = $1
  AND ee.source_entity_id = $2;
```

### 5.8. Project Structure

```
office-detective/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                  # App router pages
│   │   │   │   ├── (auth)/           # Auth routes
│   │   │   │   ├── (game)/           # Game routes
│   │   │   │   │   ├── cases/
│   │   │   │   │   ├── play/[id]/
│   │   │   │   │   └── results/[id]/
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   │   ├── inbox/
│   │   │   │   ├── document-viewer/
│   │   │   │   ├── search/
│   │   │   │   ├── chat/
│   │   │   │   ├── board/
│   │   │   │   └── ui/               # shadcn components
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── stores/               # Zustand stores
│   │   │   └── styles/
│   │   ├── public/
│   │   │   └── locales/              # i18n files
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── api/                          # FastAPI backend
│       ├── src/
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── routers/
│       │   │   ├── cases.py
│       │   │   ├── documents.py
│       │   │   ├── chat.py
│       │   │   ├── player.py
│       │   │   └── graph.py
│       │   ├── services/
│       │   │   ├── case_service.py
│       │   │   ├── rag_service.py
│       │   │   ├── agent_service.py
│       │   │   ├── graph_service.py
│       │   │   └── scoring_service.py
│       │   ├── agents/
│       │   │   ├── aria.py           # Main assistant agent
│       │   │   ├── tools.py
│       │   │   └── guardrails.py
│       │   ├── generation/
│       │   │   ├── generator.py
│       │   │   ├── templates/
│       │   │   ├── naturalizer.py
│       │   │   └── validator.py
│       │   ├── models/               # SQLAlchemy models
│       │   ├── schemas/              # Pydantic schemas
│       │   ├── db/
│       │   │   ├── database.py
│       │   │   └── migrations/
│       │   └── llm/
│       │       ├── provider.py
│       │       ├── azure.py
│       │       ├── openai.py
│       │       └── ollama.py
│       ├── tests/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   └── shared/                       # Shared types/schemas
│       ├── src/
│       │   ├── types/
│       │   └── schemas/
│       └── package.json
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   ├── postgres/
│   │   └── init.sql
│   └── scripts/
│       ├── seed-dev.sh
│       └── migrate.sh
│
├── data/
│   ├── templates/                    # Case templates
│   │   ├── phantom_vendor.yaml
│   │   └── data_leak.yaml
│   ├── seeds/                        # Sample data
│   └── handcrafted/                  # Manual test cases
│       └── case_001/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── case-design.md
│   └── deployment.md
│
├── .github/
│   └── workflows/
│
├── README.md
├── LICENSE
└── .env.example
```

---

## 6. UI/UX Design

### 6.1. Visual Identity

**Theme: "Corporate Noir"**

- Muted color palette: dark grays, off-whites, muted blues
- Typography: Clean sans-serif (Inter, IBM Plex Sans)
- Accent color: Amber/gold for highlights and key evidence
- Paper textures and folder aesthetics for documents
- Subtle shadows and depth for layered interface

**Mood**: Professional with a hint of tension. Think late nights in the office, coffee-stained reports, the glow of a monitor in a dim room.

### 6.2. Core Screens

#### 6.2.1. Case Selection

```
┌─────────────────────────────────────────────────────────────┐
│  OFFICE DETECTIVE                           [Settings] [EN] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  YOUR CASES                                                 │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ★★☆☆☆  The Mallory Procurement Irregularity        │   │
│  │         TechFlow Industries • Vendor Fraud          │   │
│  │         [Continue] ████████░░ 73%                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ★★★☆☆  Q3 Inventory Reconciliation Discrepancy     │   │
│  │         Global Logistics Co. • Inventory Fraud      │   │
│  │         [Start]                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ★☆☆☆☆  The Henderson Expense Account Matter        │   │
│  │         Bright Future NGO • Expense Fraud           │   │
│  │         [Completed] Score: 87/100                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 6.2.2. Main Investigation Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Case: The Mallory Procurement Irregularity    [Hints: 2/5] [Submit Report] │
├───────────────────────────────┬─────────────────────────────────────────────┤
│                               │                                             │
│  INBOX                        │  DOCUMENT VIEWER                            │
│  ────────────────────         │  ──────────────────────────────────────     │
│  🔍 Search...                 │                                             │
│                               │  📧 RE: Sunshine Supplies Invoice #4521    │
│  ┌─────────────────────────┐  │  ────────────────────────────────────────   │
│  │ 📧 RE: Q3 Budget       │  │  From: marcus.chen@techflow.com             │
│  │    Sarah → Team  •  2d │  │  To: invoices@sunshine-supplies.com         │
│  └─────────────────────────┘  │  Date: March 15, 2024                       │
│  ┌─────────────────────────┐  │                                             │
│  │ 📧 Sunshine Invoice    │  │  Hi there,                                  │
│  │    Marcus → Ext  • 5d  │◀─│                                             │
│  └─────────────────────────┘  │  Got the invoice, looks good. Same         │
│  ┌─────────────────────────┐  │  arrangement as before - I'll push it      │
│  │ 📄 Invoice #4521       │  │  through by EOD.                            │
│  │    Sunshine Supplies   │  │                                             │
│  └─────────────────────────┘  │  Let me know about [next month's order].   │
│  ┌─────────────────────────┐  │                                             │
│  │ 💬 #procurement chat   │  │  Best,                                      │
│  │    3 participants      │  │  Marcus                                     │
│  └─────────────────────────┘  │                                             │
│                               │  ─────────────────────────────────────────  │
│  [Emails] [Invoices] [Chats]  │  [📌 Pin Selection] [👤 Add to Board]      │
│  [All Types ▼]                │                                             │
│                               │                                             │
├───────────────────────────────┴─────────────────────────────────────────────┤
│  EVIDENCE BOARD                                              [Expand ↗]     │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│     ┌─────────┐         ┌─────────────┐         ┌─────────┐               │
│     │ Marcus  │─────────│ Invoice     │─────────│Sunshine │               │
│     │ Chen    │ approved│ #4521       │ from    │Supplies │               │
│     └─────────┘         └─────────────┘         └─────────┘               │
│          │                                            │                     │
│          │ works_at                                   │ registered_at       │
│          ▼                                            ▼                     │
│     ┌─────────┐                                 ┌─────────┐               │
│     │TechFlow │                                 │123 Oak  │◀── same!      │
│     │ Inc.    │                                 │ Street  │               │
│     └─────────┘                                 └─────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.3. Chat with ARIA

```
┌─────────────────────────────────────────────────────────┐
│  ARIA - Audit Research & Investigation Assistant        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ You: Who approved the Sunshine Supplies invoices? │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ARIA:                                             │ │
│  │                                                   │ │
│  │ The invoices from Sunshine Supplies Ltd. were    │ │
│  │ approved by Marcus Chen (Procurement Manager).   │ │
│  │                                                   │ │
│  │ I found approval stamps on:                      │ │
│  │ • Invoice #4521 [1]                              │ │
│  │ • Invoice #4523 [2]                              │ │
│  │ • Invoice #4558 [3]                              │ │
│  │                                                   │ │
│  │ Notably, all three were processed on the same    │ │
│  │ day (March 22) despite having dates spanning     │ │
│  │ six weeks [1][2][3].                             │ │
│  │                                                   │ │
│  │ ┌─────────────────────────────────────────────┐  │ │
│  │ │ 📎 Sources:                                 │  │ │
│  │ │ [1] Invoice #4521 - Sunshine Supplies       │  │ │
│  │ │ [2] Invoice #4523 - Sunshine Supplies       │  │ │
│  │ │ [3] Invoice #4558 - Sunshine Supplies       │  │ │
│  │ └─────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Ask ARIA a question...                      [↵] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  💡 Suggestions:                                        │
│  • "What's the total amount paid to Sunshine Supplies?" │
│  • "Show me Marcus Chen's communication patterns"       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3. Key UX Principles

1. **Everything is clickable and connected**
   - Click a name → see all documents mentioning them
   - Click a citation → jump to source document
   - Click an entity on board → expand connections

2. **Never lose context**
   - Split view: inbox + viewer always visible
   - Board persists across sessions
   - Chat history preserved

3. **Progressive disclosure**
   - Start with briefing, unlock documents as you explore
   - Advanced features (graph queries) revealed as needed
   - Hints escalate gradually

4. **Clear affordances**
   - Obvious "pin" and "connect" actions
   - Visual distinction between read/unread, key/normal evidence
   - Clear submission flow with validation

### 6.4. Mobile Considerations

For mobile (Phase 2):

- Tab-based navigation instead of split view
- Swipe gestures for document navigation
- Simplified board with focus mode
- Voice input for ARIA queries

---

## 7. Monetization & Business Model

### 7.1. Pricing Strategy

**Freemium model:**

| Tier          | Price     | Includes                                       |
| ------------- | --------- | ---------------------------------------------- |
| **Free**      | $0        | 2 tutorial cases, 1 rotating free case/month   |
| **Detective** | $9.99/mo  | All cases, unlimited hints, progress sync      |
| **Agency**    | $19.99/mo | Everything + early access, case creation tools |

**Alternative: Pay-per-case**

- Free tier: 2 cases
- Case packs: 5 cases for $4.99, 15 cases for $9.99

### 7.2. Cost Structure

**Per-user costs (estimated):**

- LLM tokens: ~$0.02-0.05 per case (with caching)
- Hosting: ~$0.001 per case
- Storage: negligible

**Fixed costs:**

- Infrastructure: ~$50-100/month (small scale)
- Domain, services: ~$20/month

**Break-even**: ~500 paying users at $10/month covers modest scale.

### 7.3. Growth Strategy

**Phase 1: Soft launch**

- Product Hunt launch
- Reddit (r/gamedev, r/puzzles, r/truecrime)
- Twitter/X AI and indie dev communities
- Portfolio showcases

**Phase 2: Content marketing**

- Dev blog about AI implementation
- Case design tutorials
- "Behind the scenes" of case generation

**Phase 3: Community**

- User-submitted case templates
- Leaderboards
- Case rating system

---

## 8. Development Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Goal**: Playable handcrafted case end-to-end

| Week | Focus          | Deliverables                                      |
| ---- | -------------- | ------------------------------------------------- |
| 1    | Infrastructure | Docker setup, DB schema, basic API structure      |
| 1    | Data           | Handcrafted Case #1 fully written (all docs)      |
| 2    | Backend        | Document CRUD, chunking, embeddings, basic search |
| 2    | Frontend       | Inbox + Document viewer (read-only)               |
| 3    | Backend        | Basic chat endpoint with RAG                      |
| 3    | Frontend       | Chat UI with citations, search                    |
| 3    | Integration    | Full case playable without board                  |

**Milestone**: Can read documents, search, and chat with citations.

### Phase 2: Core Gameplay (Weeks 4-6)

**Goal**: Complete investigation loop

| Week | Focus    | Deliverables                                  |
| ---- | -------- | --------------------------------------------- |
| 4    | Backend  | Entity extraction, graph storage (PostgreSQL) |
| 4    | Frontend | Evidence board (pin, connect, annotate)       |
| 5    | Backend  | Submission endpoint, scoring logic            |
| 5    | Frontend | Submit report flow, results screen            |
| 6    | Backend  | Hint system (pre-generated hints)             |
| 6    | Frontend | Hint UI, case briefing screen                 |
| 6    | Polish   | Second handcrafted case, bug fixes            |

**Milestone**: Complete game loop with scoring.

### Phase 3: Generation & Polish (Weeks 7-10)

**Goal**: Procedural cases, production quality

| Week | Focus    | Deliverables                                   |
| ---- | -------- | ---------------------------------------------- |
| 7    | Backend  | Case generation pipeline v1 (1 template)       |
| 7    | Backend  | Solvability validator                          |
| 8    | Backend  | Text naturalization with LLM                   |
| 8    | Backend  | Second template (different crime type)         |
| 9    | Frontend | i18n (Spanish support)                         |
| 9    | Backend  | Case generation for Spanish                    |
| 10   | Polish   | UI refinements, loading states, error handling |
| 10   | Testing  | End-to-end tests, case solvability tests       |

**Milestone**: 2 case types generating procedurally in 2 languages.

### Phase 4: Launch Prep (Weeks 11-12)

**Goal**: Production deployment, soft launch

| Week | Focus  | Deliverables                            |
| ---- | ------ | --------------------------------------- |
| 11   | Infra  | Production deployment, monitoring       |
| 11   | Auth   | User accounts, progress persistence     |
| 12   | Launch | Landing page, Product Hunt prep         |
| 12   | Docs   | README, architecture docs for portfolio |

**Milestone**: Public beta launch.

### Phase 5: Post-Launch (Ongoing)

- More case templates
- Mobile optimization
- Neo4j integration for complex queries
- Community features
- Monetization implementation

---

## 9. First Case: "The Mallory Procurement Irregularity"

### 9.1. Case Brief

**Client**: TechFlow Industries (mid-size tech company, 200 employees)

**Contact**: Diana Walsh, VP of Finance

**Briefing**:

> "We've noticed some... inconsistencies in our procurement department. Our new vendor, Sunshine Supplies, has been billing us for 'consulting services' but no one seems to know what they actually do. The invoices are all approved by the same person, and frankly, the amounts are suspicious. We need you to look into this quietly before we involve legal."

### 9.2. Ground Truth

**Culprit**: Marcus Chen (Procurement Manager)

**Mechanism**: Marcus created a shell company (Sunshine Supplies Ltd.) using a nominee and his girlfriend's address. He submits fake invoices for vague "consulting services" which he approves himself, routing company funds to an account he controls.

**Timeline**:

1. Jan 15: Sunshine Supplies registered (address: 123 Oak Street)
2. Feb 1: Vendor approved by Marcus (sole approver)
3. Feb 15: First invoice ($4,500) approved
4. Mar 1-15: Three more invoices ($12,000 total)
5. Mar 20: Wire transfers to Sunshine account
6. Current: Total extracted: ~$45,000 over 3 months

### 9.3. Key Evidence

| Evidence         | Document                 | What it proves                                   |
| ---------------- | ------------------------ | ------------------------------------------------ |
| Address match    | Vendor registration form | Sunshine's address matches Marcus's girlfriend's |
| Sole approver    | Invoice approval log     | Marcus approved all Sunshine invoices            |
| Vague services   | Invoices                 | "Strategic consulting" with no deliverables      |
| Familiar tone    | Email thread             | Marcus and "Sunshine" communicate informally     |
| Timing pattern   | Bank statements          | Payments cluster at month-end (budget timing)    |
| No other contact | Vendor communications    | Only Marcus has communicated with Sunshine       |

### 9.4. Red Herrings

| Suspicious item                  | Explanation                                       |
| -------------------------------- | ------------------------------------------------- |
| Sarah (CFO) large expense report | Legitimate conference travel, properly documented |
| IT ticket: "delete my files"     | Employee leaving, standard offboarding            |
| Angry Slack thread about budgets | Normal corporate politics, unrelated              |

### 9.5. Document List (25 documents)

**Emails (10)**

1. Diana → Marcus: "New vendor process reminder" (context)
2. Marcus → Sunshine: "RE: Invoice #4521" (key - familiar tone)
3. Marcus → Sunshine: "Thanks for quick turnaround" (key)
4. Sarah → Team: "Q1 Budget review" (noise)
5. HR → All: "New expense policy" (noise)
6. Diana → Marcus: "Unusual vendor spending?" (context - she's suspicious)
7. Marcus → Diana: "All above board" (context - his defense)
8. IT → Marcus: "Access request approved" (noise)
9. Vendor team → Distribution: "Approved vendors Q1" (context)
10. Marcus → Personal email: Forwarded invoice (key - if recoverable)

**Invoices (6)** 11. Invoice #4521 - Sunshine Supplies (key) 12. Invoice #4523 - Sunshine Supplies (key) 13. Invoice #4558 - Sunshine Supplies (key) 14. Invoice #4401 - Legitimate Office Supplies Co. 15. Invoice #4415 - Legitimate IT Services Inc. 16. Invoice #4430 - Legitimate Catering Co.

**Forms/Records (5)** 17. Vendor registration: Sunshine Supplies Ltd. (key - address) 18. Vendor registration: Office Supplies Co. (comparison) 19. Approval log spreadsheet (key - pattern) 20. Employee directory (context - roles) 21. Marcus Chen HR file (context - hire date, role)

**Chat/Messages (3)** 22. #procurement Slack: Routine discussion (noise) 23. #finance Slack: Budget complaints (red herring) 24. Marcus DM to colleague: "Busy with vendor stuff" (minor context)

**Financial (1)** 25. Bank transfer summary March (key - payment dates)

---

## 10. Success Metrics

### 10.1. Portfolio Success

- Clean, documented codebase on GitHub
- Live demo that works reliably
- Architecture document showcasing AI patterns
- 2-3 minute video walkthrough

### 10.2. Product Success

- **Engagement**: Average session length > 15 minutes
- **Completion**: > 60% of started cases completed
- **Retention**: > 30% return within 7 days
- **NPS**: > 40 (would recommend)

### 10.3. Technical Success

- **RAG accuracy**: > 90% of citations are relevant
- **Case solvability**: 100% of generated cases pass validator
- **Latency**: Chat response < 3 seconds
- **Cost**: < $0.05 per case played

---

## 11. Risk Mitigation

| Risk                                | Likelihood | Impact | Mitigation                                         |
| ----------------------------------- | ---------- | ------ | -------------------------------------------------- |
| Cases too easy/hard                 | Medium     | High   | Extensive playtesting, difficulty calibration      |
| LLM costs spike                     | Medium     | Medium | Aggressive caching, token budgets, model fallbacks |
| Generation creates unsolvable cases | Medium     | High   | Strict validators, human review for templates      |
| UI too complex                      | Medium     | Medium | User testing, progressive disclosure               |
| Legal concerns (fake company names) | Low        | Medium | Clear "fictional" disclaimers, avoid real brands   |

---

## 12. Open Questions

1. **Tutorial design**: How much handholding for first case?
2. **Difficulty perception**: Should difficulty be shown before or after playing?
3. **Hint economy**: Should hints be limited per case or per account?
4. **Competitive element**: Leaderboards? Time-based scoring?
5. **Accessibility**: Screen reader support for document-heavy UI?
6. **Offline mode**: Cache cases for offline play (mobile)?

---

## Appendix A: Tech Stack Quick Reference

```yaml
Frontend:
  framework: Next.js 14+ (App Router)
  language: TypeScript (strict)
  styling: Tailwind CSS + shadcn/ui
  state: Zustand
  graph: React Flow
  i18n: i18next

Backend:
  framework: FastAPI
  language: Python 3.12
  orm: SQLAlchemy 2.0
  validation: Pydantic v2
  llm: LangChain (provider-agnostic)

Data:
  primary: PostgreSQL 16 + pgvector
  cache: Redis (optional)
  graph: PostgreSQL (Phase 1) → Neo4j (Phase 2)

Infrastructure:
  containers: Docker + Docker Compose
  hosting: TBD (Railway/Render/Fly.io candidates)
```

---

## Appendix B: Naming Alternatives

If "Office Detective" doesn't stick:

- **Audit Trail** — plays on the forensic term
- **Paper Chase** — the hunt through documents
- **The Compliance Files** — bureaucratic noir
- **Ledger & Lies** — financial focus
- **Internal Affairs** — corporate investigation vibe
- **Due Diligence** — ironic, given the crimes
- **Red Flags** — warning signs theme
- **The Reconciliation** — accounting term, double meaning

---

_Document version: 2.0_
_Last updated: January 2025_
