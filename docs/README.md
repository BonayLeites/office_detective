# Office Detective

> "Every spreadsheet tells a story. Most are boring. Yours isn't."

---

## 🎯 Vision

**Office Detective** is a web-based investigation game where you play as a freelance forensic auditor hired by companies to solve corporate mysteries: fraud, embezzlement, data leaks, and sabotage. Dig through emails, invoices, chat logs, and financial records to connect the dots, identify the culprit, and deliver your report — all in 15-30 minute cases with a dark humor twist.

## 🎮 The Player Fantasy

You are **the person companies call when things don't add up**. Not the police — they're too slow and too public. You're the discreet professional who reads between the lines of expense reports and finds the skeleton in the supply chain.

## ✨ Unique Selling Points

1. **AI-powered assistant with mandatory citations** — The in-game AI helper can't lie or hallucinate; every claim links to a specific document
2. **Interactive evidence board** — Visualize connections between people, money, and documents
3. **Procedurally generated cases** — High replayability with template-based variation
4. **Personalized cases** — Customize company names, characters, and tone for shareable humor
5. **Bite-sized investigations** — Complete cases in 15-30 minutes
6. **Dark corporate humor** — Relatable absurdity of office life (Knives Out meets The Office)

## 🎯 Target Audience

| Segment               | Description                                             |
| --------------------- | ------------------------------------------------------- |
| **Primary**           | Puzzle/mystery game enthusiasts (25-45)                 |
| **Secondary**         | True crime / investigation fans                         |
| **Tertiary**          | Business/finance professionals who appreciate the humor |
| **Portfolio viewers** | Tech recruiters, AI/ML peers                            |

## 📚 Documentation

| Document                                                 | Description                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| [Game Design](./01_GAME_DESIGN.md)                       | Narrative, gameplay mechanics, difficulty, scoring            |
| [Case Generation](./02_CASE_GENERATION.md)               | Templates, procedural generation, customization               |
| [Technical Architecture](./03_TECHNICAL_ARCHITECTURE.md) | Stack, database, API, AI agents                               |
| [UI/UX Design](./04_UI_UX.md)                            | Visual identity, screens, interaction patterns                |
| [Business & Metrics](./05_BUSINESS.md)                   | Monetization, costs, success metrics, risks                   |
| [Roadmap](./06_ROADMAP.md)                               | Development phases and milestones                             |
| [First Case](./07_FIRST_CASE.md)                         | Complete example case: "The Mallory Procurement Irregularity" |

## 🛠 Tech Stack (Summary)

```
Frontend:  Next.js 14 + TypeScript + Tailwind + React Flow
Backend:   FastAPI + Python 3.12 + LangChain
Database:  PostgreSQL 16 + pgvector
Infra:     Docker + Docker Compose
LLM:       Provider-agnostic (Azure/OpenAI/Anthropic/Ollama)
```

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/youruser/office-detective
cd office-detective

# Start development environment
docker-compose -f infra/docker/docker-compose.dev.yml up -d

# Install dependencies
cd apps/web && npm install
cd ../api && pip install -e .

# Run
npm run dev      # Frontend on :3000
uvicorn main:app # Backend on :8000
```

## 📄 License

TBD

---

_Document version: 2.0 — January 2025_
