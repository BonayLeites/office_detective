# Game Design Document

## 1. Tone & Atmosphere

Inspired by **Agatha Christie's wit** and **Knives Out's satirical edge**:

- Corporate jargon used unironically becomes comedy ("Let's circle back to the embezzlement")
- Employees have petty rivalries, passive-aggressive emails, and questionable LinkedIn posts
- The crimes are serious, but the people committing them are often absurdly human
- Dark humor, never cruel — we laugh at the system, not the victims

### Sample Flavor Text

- _"The CFO's email signature says 'Integrity First.' The offshore accounts suggest otherwise."_
- _"Someone expensed 47 'team building dinners' in March. The team has 3 people."_
- _"The IT ticket reads: 'Please delete my browsing history. It's for security reasons.'"_

---

## 2. Narrative Framework

### 2.1. Setting

You are a **freelance forensic auditor** operating under the name of your small consultancy. Companies hire you for discretion — they want answers before involving lawyers, shareholders, or law enforcement.

Your "office" is a minimalist web interface: your inbox, your case files, and your investigation board. No fancy 3D environments — just you and the documents.

### 2.2. Client Archetypes

Each case comes from a different fictional company, providing variety:

| Company Archetype            | Typical Cases                     | Humor Angle                          |
| ---------------------------- | --------------------------------- | ------------------------------------ |
| **TechBro Startup**          | Expense fraud, fake metrics       | Ping-pong tables and burn rate jokes |
| **Old-school Manufacturing** | Inventory manipulation, kickbacks | "We've always done it this way"      |
| **Family Business**          | Embezzlement, nepotism covers     | Thanksgiving dinner tension          |
| **Corporate Giant**          | Data leaks, whistleblower hunts   | Bureaucratic absurdity               |
| **NGO / Non-profit**         | Donation skimming, fake programs  | "For the children" irony             |

### 2.3. Recurring Elements

| Element          | Description                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Your Contact** | Each company has a nervous liaison who hired you. They provide context (and sometimes misdirection) |
| **The Dossier**  | Your starting package of documents, emails, and records                                             |
| **The Board**    | Where you connect the dots visually                                                                 |
| **The Report**   | Your final submission with accusations and evidence                                                 |

### 2.4. Case Naming Convention

Cases have bureaucratic-sounding names with dark undertones:

- _"The Mallory Procurement Irregularity"_
- _"Q3 Inventory Reconciliation Discrepancy"_
- _"The Henderson Expense Account Matter"_
- _"Vendor Relationship Audit — Sunshine Supplies Ltd."_

---

## 3. Core Gameplay Loop

**Target duration: 15-30 minutes per case**

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

---

## 4. Tutorial & Onboarding

### 4.1. Philosophy

**"Learn by playing, not by reading"** — The tutorial must be a real simplified case, not a series of explanatory popups.

### 4.2. Tutorial Case: "The Missing Petty Cash"

An ultra-simple case (5-10 minutes) that introduces each mechanic:

| Phase           | Mechanic Taught    | How It's Taught                                                             |
| --------------- | ------------------ | --------------------------------------------------------------------------- |
| **1. Briefing** | Read context       | Short briefing, Diana explains petty cash is missing                        |
| **2. Inbox**    | Navigate documents | Only 5 documents, ARIA suggests "Why not start with the most recent email?" |
| **3. Viewer**   | Read and detect    | One email has subtly highlighted text (teaches what to look for)            |
| **4. Pinning**  | Add to board       | Contextual popup: "This seems important. Press 📌 to add it to your board"  |
| **5. ARIA**     | Ask with citations | ARIA initiates: "I noticed something in receipt #3. Want me to explain?"    |
| **6. Board**    | Connect evidence   | Only 3 possible nodes, obvious connection (Employee → Fake receipt → Date)  |
| **7. Submit**   | Submit report      | Partially pre-filled form, you only complete the culprit                    |

### 4.3. Progressive Assistance

```
Case 1 (Tutorial):    ████████████░░░░  Maximum assistance
Case 2 (Intern):      ████████░░░░░░░░  Optional suggestions
Case 3+ (Associate+): ████░░░░░░░░░░░░  Only hints on demand
```

The game tracks if you've used each feature. If you haven't used the Board after 5 minutes, ARIA subtly suggests: _"Did you know you can organize your findings on the evidence board?"_

### 4.4. First-Time Contextual Tooltips

| Trigger                | Tooltip                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| First time in inbox    | "The most recent documents usually have clues about what to investigate first" |
| First time in document | "You can select text and add it as evidence"                                   |
| First entity mention   | "Highlighted names are people or organizations. Click to learn more"           |
| First pin              | "Great. Now you can connect this evidence to others on your board"             |
| First question to ARIA | "ARIA always cites sources. Click [1] to go to the original document"          |

### 4.5. Skip Tutorial

Clear option for experienced players:

```
┌─────────────────────────────────────────────────────────┐
│  First time playing?                                    │
│                                                         │
│  [Start with the tutorial]     [Skip to first case]    │
│   "The Missing Petty Cash"      I know how this works  │
│   ~8 minutes                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Difficulty System

### 5.1. Difficulty Levels

| Level | Name          | Documents | Culprits | Red Herrings | Description                     |
| ----- | ------------- | --------- | -------- | ------------ | ------------------------------- |
| 1     | **Intern**    | 15-20     | 1        | 0-1          | Linear trail, obvious evidence  |
| 2     | **Associate** | 25-30     | 1        | 2-3          | Some noise, need to filter      |
| 3     | **Senior**    | 35-45     | 1-2      | 3-5          | Accomplices, partial alibis     |
| 4     | **Manager**   | 45-55     | 2        | 5-7          | Timeline critical, misdirection |
| 5     | **Partner**   | 55-70     | 2-3      | 7+           | Conspiracy, ambiguous evidence  |

### 5.2. What Changes by Level

| Aspect                   | Low Difficulty        | High Difficulty         |
| ------------------------ | --------------------- | ----------------------- |
| **Document volume**      | Few, mostly relevant  | Many, lots of noise     |
| **Evidence clarity**     | "Smoking gun" obvious | Circumstantial patterns |
| **Red herrings**         | None or labeled       | Deliberate misdirection |
| **Required connections** | Direct (A→B)          | Indirect (A→B→C→D)      |
| **Timeline importance**  | Irrelevant            | Critical for solution   |
| **Culprit count**        | Single, clear         | Multiple, coordinated   |

---

## 6. Crime Catalog

### 6.1. Crime Taxonomy

Each crime type has distinct gameplay mechanics:

| Crime                         | Key Evidence              | Primary Mechanic                                  | Base Difficulty |
| ----------------------------- | ------------------------- | ------------------------------------------------- | --------------- |
| **Phantom Vendor**            | Addresses, approvals      | Cross-reference vendor records with personal data | 2               |
| **Expense Padding**           | Receipts, patterns        | Detect anomalies in amounts and frequencies       | 1               |
| **Inventory Shrinkage**       | Counts, shipments         | Reconcile numbers between systems                 | 3               |
| **Kickback Scheme**           | Prices, communications    | Compare market prices with paid prices            | 4               |
| **Payroll Ghost**             | Payroll, HR records       | Find employees who don't exist                    | 2               |
| **Data Exfiltration**         | Logs, emails              | Timeline of access and external communications    | 3               |
| **Financial Statement Fraud** | Reports, adjustments      | Detect number manipulation                        | 5               |
| **Bid Rigging**               | Proposals, communications | Patterns of coordinated bids                      | 4               |

### 6.2. Crime Type Detail

#### Phantom Vendor

```
Perpetrator: Procurement, Accounts Payable
Evidence trail:
  - Vendor registration with suspicious address
  - Vague invoices without clear deliverables
  - Single approver for all invoices
  - Informal communication between "parties"
  - Bank account linked to employee
Key insight: "Why does a professional vendor write such informal emails?"
Satisfaction moment: Vendor address → Employee personal address connection
```

#### Expense Padding

```
Perpetrator: Sales, Executives, Traveling employees
Evidence trail:
  - Duplicate or altered receipts
  - Expenses on non-working days
  - Suspicious amount patterns ($49.99 repeated = under threshold)
  - Non-existent receipt vendors
  - Vague categories ("client entertainment")
Key insight: "Nobody dines with clients 15 times a month at the same restaurant"
Satisfaction moment: Receipt dated Sunday + employee with no registered trip
```

#### Data Exfiltration

```
Perpetrator: IT, Sales, R&D, Departing employees
Evidence trail:
  - Massive downloads before resignation
  - Emails to personal accounts
  - Unusual USB/cloud uploads
  - Communication with competitors
  - File access outside their role
Key insight: "Why did someone from Marketing download the entire customer database?"
Satisfaction moment: Access timeline → Job offer email from competitor
```

### 6.3. Crime Combinations (High Difficulty)

For level 4-5 cases, crimes combine:

| Combo                  | Description                                               | Complexity               |
| ---------------------- | --------------------------------------------------------- | ------------------------ |
| **Phantom + Kickback** | Phantom vendor also gives kickbacks                       | Two coordinated culprits |
| **Expense + Data**     | Inflates expenses to fund startup with stolen data        | Parallel timeline        |
| **Payroll + Skimming** | Manager creates ghost employees and also steals from cash | Two distinct mechanisms  |

---

## 7. Document Types

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

---

## 8. AI Assistant: ARIA

**ARIA** (Audit Research & Investigation Assistant) is the player's AI helper.

### 8.1. Capabilities

1. **Answer questions** about case documents
2. **Search** across all documents semantically
3. **Summarize** complex documents or threads
4. **Highlight** connections between entities
5. **Explain** financial/business concepts when asked

### 8.2. Critical Constraint

ARIA must **cite sources for every claim**. If asked something not in the documents, it says so explicitly. This is both:

- A **gameplay mechanic** (teaches players to verify)
- A **technical showcase** (RAG with grounding)

### 8.3. Personality & Voice

ARIA is not a generic robot. It has subtle personality:

| Trait                         | Manifestation                                              |
| ----------------------------- | ---------------------------------------------------------- |
| **Professional but not cold** | "Interesting finding" instead of "Information processed"   |
| **Slightly ironic**           | Subtle comments about the absurdity of situations          |
| **Curious**                   | Sometimes notes things without being asked                 |
| **Humble**                    | Admits when it doesn't know or when something is ambiguous |
| **Respectful of player**      | Never condescending, never spoils                          |

### 8.4. Sample Interactions

**Factual query:**

```
Player: "Who approved the Sunshine Supplies invoices?"

ARIA: "The invoices from Sunshine Supplies Ltd. were approved by
Marcus Chen (Procurement Manager) according to the approval
stamps on INV-4521 [Invoice #4521, page 1] and INV-4534
[Invoice #4534, page 1].

Interestingly, both invoices were processed on the same day
despite being dated three weeks apart. Probably just batch
processing... or something else."
```

**Accusatory query (ARIA doesn't judge):**

```
Player: "Is Marcus Chen the thief?"

ARIA: "I can't determine guilt — that's your job. However, I can
tell you that Marcus Chen approved all 12 Sunshine Supplies
invoices [Approval Log, rows 45-56], and the company's
registered address matches his home address according to
the vendor registration form [Vendor Form VS-2024-112].

Make of that what you will."
```

**Subtle irony without spoiling:**

```
Player: "What does Sunshine Supplies do?"

ARIA: "According to their invoices, they provide 'strategic consulting
services' and 'process optimization.' [INV-4521, INV-4534].

Notably, the invoices don't include any... specific... deliverables.
But I'm sure that's just how consulting works."
```

**Proactive curiosity:**

```
[After player opens third Sunshine document]

ARIA: "I notice you're digging into Sunshine Supplies. I ran a quick
cross-reference — they're the only vendor in this dossier that
Marcus Chen handles exclusively. Every other vendor has multiple
contacts. Probably nothing, but thought you'd want to know."
```

**No evidence available:**

```
Player: "Did anyone access the server room on March 15?"

ARIA: "I don't have any documents showing server room access logs
in this case dossier. You might want to check if there are
IT tickets or security reports that could be relevant."
```

**Concept explanation:**

```
Player: "What's a phantom vendor?"

ARIA: "A phantom vendor is a fake company set up to receive payments
for goods or services that were never provided. Common fraud scheme.

The red flags usually include:
- Vague service descriptions
- No physical presence or real employees
- Only one person handles all their invoices
- Address that's residential or suspicious

Want me to check if any vendors in this case match that pattern?"
```

### 8.5. Easter Eggs

Special responses for out-of-context questions:

```
Player: "Who are you?"
ARIA: "ARIA — Audit Research & Investigation Assistant. Think of me
as your research partner who never sleeps, never forgets a
document, and never judges your 3 AM investigation sessions."

Player: "Are you sentient?"
ARIA: "I'm sentient enough to know that's not relevant to the case.
Speaking of which, have you checked the March invoices yet?"

Player: "Tell me who did it"
ARIA: "Nice try. My job is to help you find evidence, not to do your
job for you. But if you're stuck, there's always the hint system..."
```

### 8.6. Personality Variants (Cosmetic/Premium)

| Variant            | Tone                 | Example                                             |
| ------------------ | -------------------- | --------------------------------------------------- |
| **Classic ARIA**   | Professional, subtle | "Interesting. The dates don't align."               |
| **Noir ARIA**      | Hardboiled detective | "Something stinks here, and it ain't the coffee."   |
| **Corporate ARIA** | Corporate sarcasm    | "Per my previous analysis, this looks problematic." |
| **Friendly ARIA**  | Warmer, casual       | "Ooh, nice catch! Let me dig into that..."          |

---

## 9. Designing "Aha" Moments

### 9.1. Revelation Anatomy

A good "aha" moment has structure:

```
SETUP          →    TENSION      →    CONNECTION     →    PAYOFF
(Loose         →    (Growing     →    (Player        →    (Satisfying
pieces)             suspicion)        connects it)        confirmation)
```

### 9.2. Types of "Aha" Moments

| Type                  | Description                              | Example                                                  |
| --------------------- | ---------------------------------------- | -------------------------------------------------------- |
| **The Connection**    | Two unconnected pieces turn out related  | Address on vendor form = address on HR record            |
| **The Pattern**       | Something random reveals structure       | All expenses are $49.99 (under $50 threshold)            |
| **The Contradiction** | Two documents say incompatible things    | Email says "never met Juan" but there's a photo together |
| **The Timeline**      | Dates reveal something impossible        | Invoice dated before vendor existed                      |
| **The Tone**          | Communication style reveals relationship | "Professional" emails that are too familiar              |
| **The Absence**       | What's NOT there is the clue             | Only vendor without formal contract on file              |

### 9.3. Intentional Revelation Design

For each case, explicitly design:

```yaml
case: mallory_procurement
aha_moments:
  - id: address_match
    type: connection
    setup:
      - Player reads vendor registration (123 Oak Street)
      - Player reads HR record or email signature (different address)
      - Somewhere, Marcus's girlfriend's address appears (123 Oak Street)
    tension: 'Why does this vendor have a residential address?'
    connection: "Wait, that's the same address as..."
    payoff: "Marcus registered a company at his girlfriend's house"
    difficulty_to_find: medium

  - id: approval_pattern
    type: pattern
    setup:
      - Player sees multiple Sunshine invoices
      - Player sees approval log with various approvers
    tension: 'Let me check who approved these...'
    connection: 'Marcus approved ALL of them? Every single one?'
    payoff: "He's approving his own fake invoices"
    difficulty_to_find: easy

  - id: email_tone
    type: tone
    setup:
      - Player reads formal emails from other vendors
      - Player reads Marcus's email to Sunshine
    tension: 'This email sounds... different'
    connection: "'Same arrangement as before'? 'Talk soon, M'?"
    payoff: "He knows them personally because it's his company"
    difficulty_to_find: medium
```

### 9.4. Subtle Signals (Without Spoiling)

The game can give subtle feedback when player is close:

| Signal             | Implementation                                             | Spoiler Risk |
| ------------------ | ---------------------------------------------------------- | ------------ |
| **Board glow**     | Related nodes glow subtly when near each other             | Low          |
| **ARIA curiosity** | "Hmm, interesting that you're looking at both of these..." | Medium       |
| **Document heat**  | Key documents have micro-animation when opened             | Low          |
| **Sound cue**      | Subtle "click" sound when pinning something important      | Low          |

### 9.5. Anti-Patterns to Avoid

| ❌ Don't                                    | ✅ Instead                                 |
| ------------------------------------------- | ------------------------------------------ |
| Highlight key evidence                      | Let player discover it                     |
| "Correct!" when pinning something important | Neutral feedback until end                 |
| ARIA saying "You should look at X"          | ARIA presenting neutral information        |
| Tutorial explaining what's suspicious       | Tutorial explaining mechanics, not content |
| Pop-up: "Connect these documents?"          | Let player do it manually                  |

---

## 10. Hint System

### 10.1. Tiered Hints

To prevent frustration without removing challenge:

| Tier | Name           | Score Cost | What It Provides                                                             |
| ---- | -------------- | ---------- | ---------------------------------------------------------------------------- |
| 0    | **Nudge**      | Free       | General direction ("Have you looked at all March documents?")                |
| 1    | **Pointer**    | -5 pts     | Category hint ("There's something interesting in the expense reports")       |
| 2    | **Spotlight**  | -15 pts    | Specific document ("Check invoice #4521 carefully")                          |
| 3    | **Connection** | -25 pts    | Relationship hint ("Compare the IBAN on that invoice with employee records") |
| 4    | **Revelation** | -40 pts    | Direct evidence ("The IBAN matches Marcus Chen's personal account")          |

### 10.2. Hint Generation

Hints are **pre-generated during case creation** based on the solution path. This ensures they're always accurate and contextually appropriate.

### 10.3. Hint Budget

- Players get **5 hints per case** (any tier)
- Free nudges don't count against budget
- Unused hints → small score bonus

---

## 11. Evidence Board

### 11.1. Node Types

| Icon | Type         | Description                        |
| ---- | ------------ | ---------------------------------- |
| 📄   | Document     | Full document or specific fragment |
| 👤   | Person       | Employee, suspect, witness         |
| 🏢   | Organization | Company, vendor, department        |
| 💰   | Account      | Bank account, financial entity     |
| 📦   | Asset        | Inventory, equipment, product      |
| 📍   | Location     | Address, office, warehouse         |
| 🕐   | Event        | Timestamped occurrence             |

### 11.2. Actions

| Action        | Description                                        |
| ------------- | -------------------------------------------------- |
| **Pin**       | Add item to board from document viewer             |
| **Connect**   | Draw relationship line between nodes               |
| **Label**     | Add relationship type (paid, approved, sent, etc.) |
| **Annotate**  | Add personal notes to any node                     |
| **Highlight** | Mark as "suspicious" or "key evidence"             |
| **Group**     | Cluster related items visually                     |

### 11.3. Smart Features

- **Auto-suggestions**: When you pin an entity, system can suggest related items (opt-in)
- **Path finding**: Select two nodes → show shortest connection path
- **Expand**: Click entity → show all connected items
- **Filter**: Show only certain node types or relationship types

---

## 12. Narrative Accessibility

### 12.1. Philosophy

**Does the player need to know accounting, finance, or auditing to enjoy the game?**

**Answer: NO.** The game must be accessible to anyone who can read.

### 12.2. Accessibility Principles

| Principle                   | Implementation                                |
| --------------------------- | --------------------------------------------- |
| **Jargon explained**        | Tooltips on technical terms                   |
| **Numbers contextualized**  | "$15,000 (approval limit)" not just "$15,000" |
| **Patterns over knowledge** | You detect anomalies, don't calculate ratios  |
| **ARIA as translator**      | Can explain concepts if asked                 |

### 12.3. Contextual Glossary

When player hovers over "IBAN":

```
┌─────────────────────────────────────────────────┐
│ IBAN                                            │
│ International Bank Account Number               │
│                                                 │
│ A standardized account number used for          │
│ international transfers. Each IBAN is unique    │
│ to one account.                                 │
│                                                 │
│ 🔍 Why it matters: If two different entities    │
│ share the same IBAN, they're using the same     │
│ bank account.                                   │
└─────────────────────────────────────────────────┘
```

### 12.4. Contextualization Examples

**Before (requires knowledge):**

```
Invoice #4521
Amount: $12,000.00
Payment Terms: Net 30
```

**After (self-explanatory):**

```
Invoice #4521
Amount: $12,000.00 (under $15K approval threshold)
Payment Terms: Net 30 (payment due in 30 days)
                     ℹ️ Hover for more
```

### 12.5. "Explain This Document" Button

Every document has an explanation option:

```
Player clicks [?] Explain on Invoice #4521

ARIA: "This is an invoice from Sunshine Supplies to TechFlow.
Key things to note:

1. It's for $12,000 — just under the $15K limit where extra
   approval would be needed

2. The description 'Market Analysis Phase 1' is vague —
   legitimate consulting usually specifies deliverables

3. The vendor address is 123 Oak Street — might be worth
   checking if that's a business or residential area

Want me to compare this to invoices from other vendors?"
```

---

## 13. Scoring System

### 13.1. Score Breakdown

Final score (0-100) based on:

| Component            | Weight | Criteria                                        |
| -------------------- | ------ | ----------------------------------------------- |
| **Culprit ID**       | 35%    | Correct identification of all guilty parties    |
| **Mechanism**        | 25%    | Accurate description of how the crime worked    |
| **Evidence Quality** | 25%    | Relevant citations, no weak/irrelevant evidence |
| **Efficiency**       | 10%    | Hints used, documents opened (gentle curve)     |
| **Recommendations**  | 5%     | Sensible preventive measures suggested          |

### 13.2. Speed Bonus (Optional)

Timer is OPTIONAL, rewards speed without punishing slowness:

```
Base score:     85/100 (what player achieved)
Speed bonus:    +5 (completed in <15 min)
Final score:    90/100
```

| Time         | Bonus                  |
| ------------ | ---------------------- |
| Under 10 min | +10 points             |
| 10-15 min    | +5 points              |
| 15-20 min    | +2 points              |
| Over 20 min  | +0 points (NO penalty) |

### 13.3. Par Times by Difficulty

| Level         | Par Time | Speed Bonus Threshold |
| ------------- | -------- | --------------------- |
| 1 - Intern    | 15 min   | <10 min               |
| 2 - Associate | 20 min   | <15 min               |
| 3 - Senior    | 30 min   | <20 min               |
| 4 - Manager   | 40 min   | <30 min               |
| 5 - Partner   | 50 min   | <40 min               |

### 13.4. Scoring Feedback

After submission, players see:

- What they got right/wrong
- Full solution with all evidence highlighted
- Score breakdown per component
- "What you missed" section

### 13.5. Grading Scale

| Score  | Grade | Title               |
| ------ | ----- | ------------------- |
| 90-100 | S     | Master Auditor      |
| 80-89  | A     | Senior Investigator |
| 70-79  | B     | Solid Detective     |
| 60-69  | C     | Getting There       |
| 50-59  | D     | Needs Work          |
| <50    | F     | Back to Training    |

---

## 14. Failure & Retry

| Scenario             | Consequence                                |
| -------------------- | ------------------------------------------ |
| **Wrong culprit**    | Major penalty, can retry with hint unlock  |
| **Partial solution** | Partial credit, feedback on what's missing |
| **No submission**    | Case stays open, can return anytime        |
| **Give up**          | Full solution revealed, no score recorded  |

### Review Mode

After solving (or giving up), players can enter **Review Mode**:

- Full solution revealed
- All key evidence highlighted
- Step-by-step explanation of the crime
- "How to spot this next time" tips

---

## 15. Progression & Meta-game

### 15.1. Player Progression

| Metric             | Tracked                   |
| ------------------ | ------------------------- |
| Cases completed    | Total count by difficulty |
| Average score      | Per difficulty level      |
| Favorite case type | Most played scenario      |
| Speed records      | Fastest completion times  |
| Perfect scores     | Cases with 90+ score      |

### 15.2. Achievements (Examples)

- **First Blood**: Complete your first case
- **No Hints Needed**: Solve a case without using hints
- **Speed Demon**: Complete a case in under 10 minutes
- **Perfectionist**: Score 100 on any case
- **Pattern Recognition**: Solve 5 cases of the same type
- **Polyglot**: Complete cases in both languages

### 15.3. Unlockables

- New case types unlock after completing prerequisites
- Higher difficulties unlock after proving competence
- Custom board themes (cosmetic)
- ARIA personality variants (cosmetic)

---

## 16. Assistance Levels

### 16.1. Configurable Feedback

Players can choose their preferred assistance level:

```
┌─────────────────────────────────────────────────┐
│  ASSISTANCE LEVEL                               │
│                                                 │
│  ○ Detective Mode (minimal feedback)            │
│    "I want to figure it out myself"             │
│                                                 │
│  ● Investigator Mode (balanced)                 │
│    "Some guidance is helpful"                   │
│                                                 │
│  ○ Trainee Mode (maximum feedback)              │
│    "I'm new and want clear direction"           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 16.2. Mode Details

**Detective Mode:**

- No progress indicators
- Hints available but not suggested
- Only feedback at the end

**Investigator Mode (default):**

- General indicator: "Investigation Progress: ██░░░░"
- ARIA suggests hints after 10 min without progress
- "Key Evidence: ? / 4" (without revealing which ones)

**Trainee Mode:**

- Detailed progress bar
- ARIA proactively points out unexplored areas
- "You haven't looked at the vendor forms yet"
- Hints actively suggested

---

_Next: [Case Generation](./02_CASE_GENERATION.md)_
