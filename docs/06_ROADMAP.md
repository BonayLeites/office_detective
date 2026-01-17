# Development Roadmap

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  Phase 0        Phase 1        Phase 2        Phase 3        Phase 4        Phase 5    │
│  Setup          Foundation     Core Game      Generation     Launch         Growth     │
│  (1 week)       (3 weeks)      (3 weeks)      (4 weeks)      (2 weeks)      (∞)        │
│                                                                                         │
│  ████████       ████████████   ████████████   ████████████   ████████       ░░░░░░░░   │
│                                                                                         │
│  • Monorepo     • DB Schema    • Entity graph • Templates    • Production   • Mobile   │
│  • Docker       • Basic API    • Evidence     • Generator    • Auth         • Neo4j    │
│  • CI/CD        • Inbox UI     • Scoring      • Validation   • Landing      • B2B      │
│  • Tooling      • Doc Viewer   • Hints        • i18n         • Launch!      • UGC      │
│                 • RAG + Chat   • Tutorial     • Customization                          │
│                                                                                         │
│  Milestone:     Milestone:     Milestone:     Milestone:     Milestone:                │
│  "Dev env       "Can play      "Complete      "Infinite      "Public                   │
│  ready"         handcrafted"   game loop"     replayability" launch"                   │
│                                                                                         │
│  ───────────────────────────────────────────────────────────────────────────────────   │
│  Total: 13 weeks (~300 hours) to public launch                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Project Setup (Week 0)

**Goal**: Development environment ready for team/contributors

### Tasks

| Task                           | Priority | Effort | Dependencies |
| ------------------------------ | -------- | ------ | ------------ |
| Create GitHub repo             | High     | 1h     | -            |
| Monorepo structure             | High     | 2h     | Repo         |
| Docker Compose (dev)           | High     | 3h     | Monorepo     |
| CI pipeline (lint + test)      | High     | 3h     | Monorepo     |
| Pre-commit hooks               | Medium   | 1h     | Monorepo     |
| VS Code workspace config       | Low      | 1h     | Monorepo     |
| README with setup instructions | High     | 2h     | Docker       |
| Issue templates                | Low      | 1h     | Repo         |
| Branch protection rules        | Medium   | 0.5h   | Repo         |

### Deliverables

```
office-detective/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── ISSUE_TEMPLATE/
├── apps/
│   ├── web/              # Next.js (empty)
│   └── api/              # FastAPI (empty)
├── packages/
│   └── shared/           # Shared types
├── infra/
│   └── docker/
│       └── docker-compose.dev.yml
├── docs/
├── .pre-commit-config.yaml
├── docker-compose.yml
└── README.md
```

### Phase 0 Checklist

- [ ] `docker compose up` starts all services
- [ ] `npm run lint` / `ruff check` pass on empty projects
- [ ] CI runs on pull requests
- [ ] README explains how to start dev environment
- [ ] All team members can run locally

---

## Phase 1: Foundation (Weeks 1-3)

**Goal**: Playable handcrafted case with basic UI and ARIA chat

### Week 1: Infrastructure & Data

| Task                            | Priority | Effort | Dependencies |
| ------------------------------- | -------- | ------ | ------------ |
| PostgreSQL schema (core tables) | High     | 4h     | Docker       |
| pgvector extension setup        | High     | 1h     | PostgreSQL   |
| SQLAlchemy models               | High     | 4h     | Schema       |
| Alembic migrations setup        | High     | 2h     | Models       |
| Seed handcrafted case data      | High     | 8h     | Schema       |
| FastAPI project structure       | High     | 3h     | Monorepo     |
| Basic routers skeleton          | High     | 2h     | FastAPI      |
| Next.js project setup           | High     | 2h     | Monorepo     |
| Tailwind + shadcn setup         | High     | 2h     | Next.js      |
| TanStack Query setup            | Medium   | 1h     | Next.js      |

**Deliverable**: Database with one complete case, API skeleton, empty UI.

### Week 2: Core UI

| Task                           | Priority | Effort | Dependencies |
| ------------------------------ | -------- | ------ | ------------ |
| API: GET /cases                | High     | 2h     | FastAPI      |
| API: GET /cases/{id}           | High     | 2h     | FastAPI      |
| API: GET /cases/{id}/documents | High     | 3h     | FastAPI      |
| API: GET /documents/{id}       | High     | 2h     | FastAPI      |
| Case selection screen          | High     | 4h     | Next.js, API |
| Inbox component                | High     | 6h     | Next.js, API |
| Document viewer component      | High     | 8h     | Next.js, API |
| Document type renderers        | High     | 4h     | Viewer       |
| Entity highlighting (basic)    | Medium   | 4h     | Viewer       |
| Navigation flow                | High     | 3h     | All UI       |
| Responsive layout (desktop)    | Medium   | 2h     | All UI       |

**Deliverable**: Can browse and read all documents in a case.

### Week 3: RAG & Chat

| Task                       | Priority | Effort | Dependencies |
| -------------------------- | -------- | ------ | ------------ |
| LLM provider abstraction   | High     | 4h     | FastAPI      |
| Chunking service           | High     | 3h     | Models       |
| Embedding generation       | High     | 3h     | LLM provider |
| Vector search function     | High     | 3h     | pgvector     |
| RAG service                | High     | 4h     | Search, LLM  |
| ARIA agent (basic)         | High     | 6h     | RAG          |
| ARIA tools: search_docs    | High     | 3h     | Agent        |
| ARIA tools: get_document   | High     | 2h     | Agent        |
| Guardrails v1              | High     | 4h     | Agent        |
| API: POST /cases/{id}/chat | High     | 3h     | Agent        |
| Chat UI component          | High     | 6h     | Next.js      |
| Citation rendering         | High     | 3h     | Chat UI      |
| Streaming responses        | Medium   | 4h     | Chat UI, API |

**Deliverable**: Can chat with ARIA and get cited responses.

### Phase 1 Milestone Checklist

- [ ] Can see list of available cases
- [ ] Can start a case and see briefing
- [ ] Can browse inbox with filtering
- [ ] Can open and read documents
- [ ] Documents render correctly by type (email, invoice, chat, form)
- [ ] Entity names are highlighted
- [ ] Can open chat panel
- [ ] Can send messages to ARIA
- [ ] ARIA responds with relevant information
- [ ] ARIA cites sources for claims
- [ ] Can click citations to jump to documents
- [ ] Chat supports streaming responses
- [ ] No critical console errors

### Phase 1 Technical Debt Allowance

- Basic auth can be simple token (no real login yet)
- Mobile layout can be broken
- Limited error handling (happy path focus)
- No tests yet (Phase 2)

---

## Phase 2: Core Gameplay (Weeks 4-6)

**Goal**: Complete investigation loop with scoring, hints, and tutorial

### Week 4: Entity Graph & Evidence Board

| Task                           | Priority | Effort | Dependencies  |
| ------------------------------ | -------- | ------ | ------------- |
| Entity extraction during seed  | High     | 4h     | Data          |
| Entity relationships table     | High     | 3h     | Schema        |
| API: GET /cases/{id}/entities  | High     | 2h     | FastAPI       |
| API: GET /cases/{id}/graph     | High     | 3h     | FastAPI       |
| Graph query functions          | High     | 4h     | PostgreSQL    |
| Evidence board UI (React Flow) | High     | 10h    | Next.js       |
| Board node components          | High     | 4h     | Board         |
| Pin from document              | High     | 4h     | Board, Viewer |
| Connect nodes interaction      | High     | 4h     | Board         |
| Board persistence (local)      | Medium   | 3h     | Board         |
| Entity detail popover          | Medium   | 3h     | Board         |

**Deliverable**: Interactive evidence board with connections.

### Week 5: Submission & Scoring

| Task                        | Priority | Effort | Dependencies  |
| --------------------------- | -------- | ------ | ------------- |
| Player state model          | High     | 3h     | Schema        |
| API: Player progress CRUD   | High     | 4h     | FastAPI       |
| Progress persistence        | High     | 4h     | API, Frontend |
| Submit report UI            | High     | 6h     | Next.js       |
| Evidence citation in submit | High     | 3h     | Submit UI     |
| Scoring service             | High     | 8h     | FastAPI       |
| Score breakdown calculation | High     | 4h     | Scoring       |
| API: POST /submit           | High     | 3h     | Scoring       |
| Results screen              | High     | 6h     | Next.js       |
| Solution reveal             | High     | 3h     | Results       |
| Grade animation             | Medium   | 2h     | Results       |

**Deliverable**: Can submit report and see detailed score.

### Week 6: Hints, Tutorial & Polish

| Task                    | Priority | Effort | Dependencies |
| ----------------------- | -------- | ------ | ------------ |
| Hint data model         | High     | 2h     | Schema       |
| Hint tiers (5 levels)   | High     | 4h     | Data         |
| API: GET /hints         | High     | 2h     | FastAPI      |
| Hint request UI         | High     | 4h     | Next.js      |
| Hint display component  | High     | 3h     | Next.js      |
| Tutorial case data      | High     | 6h     | Data         |
| Tutorial flow (guided)  | High     | 8h     | Next.js      |
| Contextual tooltips     | Medium   | 4h     | Tutorial     |
| Second handcrafted case | High     | 6h     | Data         |
| Unit tests (services)   | High     | 6h     | All          |
| Integration tests       | Medium   | 4h     | All          |
| Bug fixes from testing  | High     | 4h     | -            |

**Deliverable**: Two playable cases with full game loop + tutorial.

### Phase 2 Milestone Checklist

- [ ] Tutorial case guides new players
- [ ] Contextual tips appear on first use
- [ ] Evidence board is draggable/zoomable
- [ ] Can pin evidence from documents
- [ ] Can draw connections between nodes
- [ ] Board state persists across sessions
- [ ] Can submit investigation report
- [ ] Must select culprit(s)
- [ ] Must explain mechanism
- [ ] Must cite evidence
- [ ] Scoring calculates correctly
- [ ] Results show detailed breakdown
- [ ] Grade is displayed with animation
- [ ] Hints work at all 5 tiers
- [ ] Hints reduce score appropriately
- [ ] Player progress saves
- [ ] Two full cases playable
- [ ] Core services have unit tests

---

## Phase 3: Generation & Localization (Weeks 7-10)

**Goal**: Procedural cases in two languages with customization

### Week 7: Generation Pipeline

| Task                          | Priority | Effort | Dependencies   |
| ----------------------------- | -------- | ------ | -------------- |
| Template schema design (YAML) | High     | 4h     | -              |
| Template: phantom_vendor      | High     | 6h     | Schema         |
| Entity generator              | High     | 6h     | Template       |
| Timeline generator            | High     | 6h     | Template       |
| Consistency tracker           | High     | 4h     | Generator      |
| Document materializer         | High     | 6h     | Generator      |
| Skeleton case assembly        | High     | 4h     | All generators |
| Generation service            | High     | 4h     | FastAPI        |

**Deliverable**: Can generate skeleton case from template.

### Week 8: Naturalization & Validation

| Task                        | Priority | Effort | Dependencies |
| --------------------------- | -------- | ------ | ------------ |
| Text naturalization prompts | High     | 4h     | -            |
| Naturalization service      | High     | 6h     | LLM          |
| Batch naturalization        | High     | 4h     | Service      |
| Solvability validator       | High     | 6h     | Generator    |
| Consistency validator       | High     | 4h     | Generator    |
| Evidence chain validator    | High     | 4h     | Generator    |
| Hint generator              | High     | 4h     | Validator    |
| Difficulty calculator       | Medium   | 4h     | Generator    |
| API: POST /cases/generate   | High     | 3h     | All          |
| Template: expense_fraud     | High     | 6h     | Pipeline     |

**Deliverable**: Generated cases pass all validators.

### Week 9: Customization & i18n

| Task                       | Priority | Effort | Dependencies |
| -------------------------- | -------- | ------ | ------------ |
| Customization input UI     | High     | 6h     | Next.js      |
| Blocked words filter       | High     | 3h     | Backend      |
| Custom values injection    | High     | 4h     | Generator    |
| Seed-based reproducibility | High     | 4h     | Generator    |
| i18next setup (frontend)   | High     | 3h     | Next.js      |
| EN string extraction       | High     | 4h     | i18next      |
| ES translations (UI)       | High     | 6h     | i18next      |
| Locale-aware generator     | High     | 4h     | Generator    |
| ES document templates      | High     | 6h     | Generator    |
| Currency/date formatting   | Medium   | 3h     | Generator    |

**Deliverable**: Custom cases in English and Spanish.

### Week 10: Testing & Refinement

| Task                       | Priority | Effort | Dependencies |
| -------------------------- | -------- | ------ | ------------ |
| Generator unit tests       | High     | 6h     | Generator    |
| Validator unit tests       | High     | 4h     | Validators   |
| E2E test: full game flow   | High     | 6h     | All          |
| Agent solvability test     | High     | 6h     | Validator    |
| Performance profiling      | Medium   | 4h     | All          |
| Generation optimization    | Medium   | 4h     | Profiling    |
| Template: inventory_shrink | Medium   | 6h     | Pipeline     |
| Red herring improvements   | Medium   | 4h     | Generator    |
| Error recovery             | High     | 4h     | Generator    |
| Loading states polish      | Medium   | 4h     | UI           |

**Deliverable**: Stable, tested generation pipeline.

### Phase 3 Milestone Checklist

- [ ] Can select case template
- [ ] Can customize company name
- [ ] Can customize character names
- [ ] Can select tone preset
- [ ] Blocked words are rejected
- [ ] Same seed produces same case structure
- [ ] Cases generate in <30 seconds
- [ ] Generated text sounds natural
- [ ] All cases pass solvability check
- [ ] Evidence chain is complete
- [ ] No consistency errors
- [ ] Hints are accurate
- [ ] Spanish UI is complete
- [ ] Spanish cases generate correctly
- [ ] 3+ case templates available
- [ ] 90%+ test coverage on generators
- [ ] E2E tests pass

---

## Phase 4: Launch Prep (Weeks 11-12)

**Goal**: Production deployment and soft launch

### Week 11: Production Infrastructure

| Task                        | Priority | Effort | Dependencies |
| --------------------------- | -------- | ------ | ------------ |
| Production hosting (API)    | High     | 4h     | -            |
| Production hosting (Web)    | High     | 3h     | -            |
| Managed PostgreSQL          | High     | 3h     | -            |
| Redis setup                 | High     | 2h     | -            |
| Environment config          | High     | 3h     | Hosting      |
| Secrets management          | High     | 2h     | Hosting      |
| SSL certificates            | High     | 1h     | Hosting      |
| Domain setup                | High     | 1h     | -            |
| CD pipeline                 | High     | 4h     | CI           |
| Auth system (Clerk/Auth.js) | High     | 8h     | -            |
| User model + migration      | High     | 3h     | Auth         |
| Monitoring (Sentry)         | High     | 2h     | Hosting      |
| Logging (structured)        | High     | 3h     | API          |
| Health checks               | High     | 2h     | API          |
| Database backups            | High     | 2h     | PostgreSQL   |

**Deliverable**: App running in production with auth.

### Week 12: Launch

| Task                    | Priority | Effort | Dependencies |
| ----------------------- | -------- | ------ | ------------ |
| Landing page            | High     | 8h     | Next.js      |
| Pricing page            | High     | 3h     | Landing      |
| Onboarding improvements | High     | 4h     | Tutorial     |
| First-time user flow    | High     | 4h     | Onboarding   |
| Settings page           | Medium   | 4h     | Next.js      |
| Profile page            | Medium   | 3h     | Next.js      |
| Analytics integration   | High     | 3h     | PostHog      |
| Event tracking          | High     | 4h     | Analytics    |
| Share functionality     | Medium   | 3h     | Results      |
| OG image generation     | Low      | 2h     | Share        |
| Product Hunt prep       | Medium   | 3h     | -            |
| Press kit               | Low      | 2h     | -            |
| Launch monitoring       | High     | 4h     | -            |
| Hotfix readiness        | High     | 2h     | -            |

**Deliverable**: Public beta launch! 🚀

### Phase 4 Milestone Checklist

- [ ] Production URL accessible
- [ ] SSL working (https)
- [ ] Sign up / sign in works
- [ ] Email verification (if enabled)
- [ ] Password reset works
- [ ] User data persists across sessions
- [ ] Monitoring dashboard shows metrics
- [ ] Alerts configured for errors
- [ ] Database backups scheduled
- [ ] Landing page live
- [ ] Pricing clearly displayed
- [ ] Free tier accessible
- [ ] Payment flow works (if enabled)
- [ ] Analytics tracking events
- [ ] Share buttons work
- [ ] No critical bugs
- [ ] Launch post published
- [ ] Support channel ready (Discord/email)

### Launch Day Checklist

```
PRE-LAUNCH (Morning)
├── [ ] All tests passing
├── [ ] Production deploy complete
├── [ ] Health checks green
├── [ ] Monitoring active
├── [ ] Team available for support
└── [ ] Rollback plan ready

LAUNCH
├── [ ] Product Hunt post live
├── [ ] Twitter announcement
├── [ ] Reddit posts (r/gamedev, r/puzzles)
├── [ ] Hacker News (Show HN)
└── [ ] Email to waitlist

POST-LAUNCH (First 24h)
├── [ ] Monitor error rates
├── [ ] Respond to comments
├── [ ] Track signups
├── [ ] Fix critical issues immediately
├── [ ] Document non-critical issues
└── [ ] Celebrate! 🎉
```

---

## Phase 5: Post-Launch (Ongoing)

**Goal**: Growth, iteration, and platform expansion

### Sprint 1: Stabilization (Weeks 13-14)

| Task                     | Priority | Notes                   |
| ------------------------ | -------- | ----------------------- |
| Critical bug fixes       | P0       | As discovered           |
| Performance hotfixes     | P0       | Based on monitoring     |
| User feedback triage     | P1       | Categorize issues       |
| Quick wins from feedback | P1       | Low-effort, high-impact |
| Analytics review         | P1       | Understand behavior     |

### Sprint 2: Engagement (Weeks 15-16)

| Task                      | Priority | Notes              |
| ------------------------- | -------- | ------------------ |
| Achievement system        | P1       | Retention mechanic |
| 2 new case templates      | P1       | More content       |
| ARIA personality variants | P2       | Premium feature    |
| Leaderboards (basic)      | P2       | Competition        |
| Mobile responsiveness     | P1       | Basic support      |

### Quarter 2 (Months 4-6)

| Feature                  | Priority | Effort | Notes              |
| ------------------------ | -------- | ------ | ------------------ |
| 5 more templates         | P1       | 30h    | Target: 10 total   |
| Mobile-first redesign    | P1       | 40h    | Better mobile UX   |
| Subscription payments    | P1       | 20h    | Stripe integration |
| Email campaigns          | P2       | 10h    | Retention          |
| Referral system          | P2       | 15h    | Acquisition        |
| Advanced customization   | P2       | 20h    | Agency tier        |
| A/B testing framework    | P2       | 15h    | Optimization       |
| Performance optimization | P2       | 20h    | Speed improvements |

### Quarter 3-4 (Months 6-12)

| Feature            | Priority | Effort | Notes             |
| ------------------ | -------- | ------ | ----------------- |
| Native mobile apps | P1       | 80h    | iOS + Android     |
| Neo4j integration  | P2       | 40h    | Complex queries   |
| Steam release      | P2       | 30h    | Wider audience    |
| More languages     | P2       | 20h    | French, German    |
| B2B pilot          | P2       | 40h    | Training edition  |
| Case of the Week   | P2       | 20h    | Community feature |
| User reviews       | P3       | 15h    | Social proof      |

### Year 2+ Exploration

| Concept                   | Effort    | Risk   | Potential      |
| ------------------------- | --------- | ------ | -------------- |
| User-generated cases      | Very High | High   | Game-changing  |
| Multiplayer investigation | High      | Medium | Unique feature |
| Voice-enabled ARIA        | Medium    | Low    | Accessibility  |
| Case editor tool          | Very High | Medium | UGC platform   |
| VR investigation room     | Very High | High   | Novelty        |

---

## Dependency Graph

```
Phase 0: Setup
    │
    ▼
Phase 1: Foundation
    │
    ├── Week 1: Data ──────────────────────────┐
    │       │                                   │
    │       ▼                                   │
    ├── Week 2: UI ◀───────────────────────────┤
    │       │                                   │
    │       ▼                                   │
    └── Week 3: RAG/Chat ◀─────────────────────┘
            │
            ▼
Phase 2: Gameplay
    │
    ├── Week 4: Board ◀── (needs entities from data)
    │       │
    │       ▼
    ├── Week 5: Scoring ◀── (needs board, progress)
    │       │
    │       ▼
    └── Week 6: Hints/Tutorial ◀── (needs full loop)
            │
            ▼
Phase 3: Generation
    │
    ├── Week 7: Pipeline ◀── (needs working game)
    │       │
    │       ▼
    ├── Week 8: Validation ◀── (needs pipeline)
    │       │
    │       ▼
    ├── Week 9: i18n ◀── (needs validation)
    │       │
    │       ▼
    └── Week 10: Testing ◀── (needs all above)
            │
            ▼
Phase 4: Launch
    │
    ├── Week 11: Infrastructure ◀── (parallel with Phase 3)
    │       │
    │       ▼
    └── Week 12: Launch ◀── (needs everything)
            │
            ▼
Phase 5: Growth (ongoing)
```

---

## Resource Estimates

### Time Investment

| Phase               | Duration     | Hours/Week | Total Hours |
| ------------------- | ------------ | ---------- | ----------- |
| Phase 0             | 1 week       | 15h        | 15h         |
| Phase 1             | 3 weeks      | 25h        | 75h         |
| Phase 2             | 3 weeks      | 25h        | 75h         |
| Phase 3             | 4 weeks      | 25h        | 100h        |
| Phase 4             | 2 weeks      | 25h        | 50h         |
| **Total to Launch** | **13 weeks** | -          | **~315h**   |

### Buffer Allocation

| Phase     | Planned  | Buffer (20%) | Total    |
| --------- | -------- | ------------ | -------- |
| Phase 1   | 75h      | 15h          | 90h      |
| Phase 2   | 75h      | 15h          | 90h      |
| Phase 3   | 100h     | 20h          | 120h     |
| Phase 4   | 50h      | 10h          | 60h      |
| **Total** | **315h** | **60h**      | **375h** |

### Critical Path

```
Minimum viable path to launch (no buffer):

Week 1-2:   Schema + Basic UI                    (40h)
Week 3:     RAG + Chat                           (25h)
Week 4-5:   Board + Scoring                      (40h)
Week 6:     Hints + 1 template                   (25h)
Week 7-8:   Generation + Validation              (40h)
Week 9:     Customization (no i18n)              (20h)
Week 10-11: Production + Auth                    (35h)
Week 12:    Launch                               (25h)
─────────────────────────────────────────────────────
Total:                                          ~250h

Savings: Skip i18n (Phase 5), minimal tutorial, 2 templates only
```

---

## Risk Mitigation Buffers

### Technical Risks

| Risk                   | Likelihood | Impact | Buffer Action            |
| ---------------------- | ---------- | ------ | ------------------------ |
| LLM integration issues | Medium     | High   | Extra week in Phase 1    |
| Generation complexity  | High       | High   | Extra week in Phase 3    |
| Auth integration       | Medium     | Medium | 2 days buffer in Phase 4 |
| Performance issues     | Medium     | Medium | Monitoring in Week 11    |

### Schedule Risks

| Risk                 | Mitigation                     |
| -------------------- | ------------------------------ |
| Feature creep        | Strict scope, defer to Phase 5 |
| Underestimated tasks | 20% buffer per phase           |
| Dependencies blocked | Parallel work where possible   |
| Burnout              | Sustainable 25h/week max       |

### Scope Cuts (If Behind Schedule)

| Priority | Can Cut                    | Impact                |
| -------- | -------------------------- | --------------------- |
| P0       | Nothing                    | -                     |
| P1       | Spanish (defer to Phase 5) | Launch in EN only     |
| P2       | Third template             | Launch with 2         |
| P3       | Achievement system         | Add in Phase 5        |
| P4       | ARIA personalities         | Premium feature later |
| P5       | OG images, press kit       | Marketing can wait    |

---

## Quality Gates

### Per-Feature Definition of Done

- [ ] Code follows style guide
- [ ] Code reviewed (if team)
- [ ] Unit tests written (>80% coverage for services)
- [ ] No TypeScript/Pydantic errors
- [ ] Works on Chrome (desktop)
- [ ] Handles errors gracefully
- [ ] Loading states implemented
- [ ] Accessibility basics (keyboard nav, contrast)

### Per-Phase Definition of Done

- [ ] All milestone checklist items complete
- [ ] No P0/P1 bugs open
- [ ] Performance within targets
- [ ] Documentation updated
- [ ] Demo recording made

### Pre-Launch Definition of Done

- [ ] Phases 1-4 complete
- [ ] Playtested by 5+ external testers
- [ ] All P0/P1/P2 bugs fixed
- [ ] Security review (auth, input validation)
- [ ] Load testing passed (100 concurrent users)
- [ ] Monitoring and alerts configured
- [ ] Backup and recovery tested
- [ ] Support process documented
- [ ] Legal pages live (ToS, Privacy)

---

## Technical Debt Tracking

### Acceptable Debt (Pre-Launch)

| Item                     | Phase Incurred | Plan to Address |
| ------------------------ | -------------- | --------------- |
| Basic auth (no OAuth)    | 1              | Phase 4         |
| No mobile layout         | 1-3            | Phase 5         |
| Limited error messages   | 1-2            | Phase 5         |
| Hardcoded strings (some) | 1-2            | Phase 3 (i18n)  |
| No rate limiting         | 1-3            | Phase 4         |
| No caching layer         | 1-3            | Phase 5         |

### Must Address Before Launch

| Item                     | Phase | Priority |
| ------------------------ | ----- | -------- |
| SQL injection prevention | All   | P0       |
| XSS prevention           | All   | P0       |
| Auth security            | 4     | P0       |
| Input validation         | All   | P0       |
| Error logging            | 4     | P1       |

### Tech Debt Sprints (Phase 5)

- Sprint 3: Error handling improvements
- Sprint 5: Performance optimization
- Sprint 7: Mobile responsiveness
- Quarterly: Dependency updates

---

## Monitoring & Success Criteria

### Phase 1 Success

- [ ] Can complete handcrafted case start-to-finish
- [ ] ARIA provides useful, cited responses
- [ ] Page load <3s
- [ ] No crashes during playthrough

### Phase 2 Success

- [ ] Tutorial completion rate >70%
- [ ] Game loop feels satisfying
- [ ] Scoring feels fair
- [ ] 2 testers complete both cases

### Phase 3 Success

- [ ] Generated cases are solvable
- [ ] Generation time <30s
- [ ] No consistency errors in 10 test generations
- [ ] Spanish version is playable

### Phase 4 Success

- [ ] Production uptime >99%
- [ ] Auth works reliably
- [ ] First 10 real users complete a case
- [ ] No data loss incidents

### Phase 5 Success (Month 1)

- [ ] 100+ registered users
- [ ] 20+ completed cases
- [ ] NPS >30
- [ ] <5% error rate

---

_Next: [First Case](./07_FIRST_CASE.md)_
