# First Case: The Mallory Procurement Irregularity

> This document contains the complete design for the first playable case, including all documents, entities, solution, and implementation notes. **CONTAINS SPOILERS.**

---

## 1. Case Overview

### 1.1. Metadata

```yaml
# CASE IDENTIFICATION
case_id: case_001_mallory
slug: mallory-procurement-irregularity
version: 1.0.0

# DISPLAY INFO
title: 'The Mallory Procurement Irregularity'
subtitle: "Something's not quite right in Procurement"
thumbnail: mallory_thumb.png

# CLASSIFICATION
difficulty: 2
difficulty_label: 'Associate'
fraud_type: phantom_vendor
tags:
  - procurement
  - shell_company
  - invoice_fraud
  - single_culprit

# TIMING
estimated_time_minutes: 20
par_time_minutes: 18
speed_bonus_threshold_minutes: 15

# CONTENT
language: en
document_count: 25
entity_count: 12
culprit_count: 1

# GENERATION
is_generated: false
template_id: null
seed: null
```

### 1.2. Difficulty Calibration

| Factor                    | Rating      | Justification                                              |
| ------------------------- | ----------- | ---------------------------------------------------------- |
| **Evidence clarity**      | 🟢 Clear    | Key evidence is explicit (address match, approval pattern) |
| **Red herrings**          | 🟡 Moderate | 3 red herrings, easily dismissible                         |
| **Document volume**       | 🟢 Low      | 25 documents, manageable                                   |
| **Connection complexity** | 🟢 Simple   | Direct culprit-shell-evidence chain                        |
| **Domain knowledge**      | 🟢 Minimal  | Basic procurement concepts                                 |
| **Time pressure**         | 🟢 None     | No time limit                                              |

**Why Difficulty 2 (Associate):**

- New players can solve this as their first "real" case after tutorial
- Evidence chain is straightforward: Address → Approval Pattern → Familiar Tone
- Single culprit, no accomplices
- Red herrings are clearly unrelated once investigated
- All key terms are explainable via ARIA

### 1.3. Learning Objectives

After completing this case, players should understand:

| Concept                        | Teaching Moment                                    |
| ------------------------------ | -------------------------------------------------- |
| **Phantom vendor fraud**       | How fake companies are used to steal money         |
| **Separation of duties**       | Why one person shouldn't approve their own work    |
| **Evidence triangulation**     | Multiple pieces of evidence strengthen a case      |
| **Red herring recognition**    | Not every suspicious thing is related to the crime |
| **Document cross-referencing** | Comparing documents reveals patterns               |

### 1.4. Client Brief

**Company**: TechFlow Industries  
**Industry**: Technology / Software Development  
**Size**: ~200 employees  
**Location**: Austin, Texas  
**Contact**: Diana Walsh, VP of Finance

---

**BRIEFING**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📋 NEW CASE ASSIGNMENT                                                     │
│                                                                             │
│  Client: TechFlow Industries                                                │
│  Contact: Diana Walsh, VP of Finance                                        │
│  Suspected Issue: Vendor payment irregularities                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Good morning. Thank you for taking this case on such short notice.         │
│                                                                             │
│  I'm Diana Walsh, VP of Finance at TechFlow Industries. We're a mid-sized   │
│  software company — nothing flashy, but we've been growing steadily for     │
│  the past few years.                                                        │
│                                                                             │
│  Here's the situation: during our Q1 close, I noticed some... irregularities│
│  in our vendor payments. Specifically, there's a company called "Sunshine   │
│  Supplies Ltd." that we've been paying for "strategic consulting services." │
│  The amounts aren't huge — around $45,000 total over three months — but     │
│  here's the thing: nobody seems to know what they actually do for us.       │
│                                                                             │
│  I asked around. Marketing hasn't worked with them. Engineering hasn't      │
│  either. The only paper trail leads back to our Procurement department,     │
│  specifically to Marcus Chen, our Procurement Manager. He says it's all     │
│  above board, but something feels off.                                      │
│                                                                             │
│  Before I involve legal or HR, I need to know what's really going on.       │
│  That's where you come in. I've compiled a dossier of relevant documents —  │
│  emails, invoices, vendor records. Everything you should need.              │
│                                                                             │
│  Find out if there's something here, or if I'm just being paranoid. Either  │
│  way, I need answers.                                                       │
│                                                                             │
│  — Diana Walsh                                                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR OBJECTIVES:                                                           │
│  • Determine if fraud occurred                                              │
│  • Identify the responsible party                                           │
│  • Explain how the fraud was committed                                      │
│  • Cite evidence supporting your findings                                   │
│  • Recommend preventive controls                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ground Truth (SPOILER)

### 2.1. The Crime

| Field                | Value                                |
| -------------------- | ------------------------------------ |
| **Culprit**          | Marcus Chen (Procurement Manager)    |
| **Accomplices**      | None                                 |
| **Crime Type**       | Phantom Vendor / Shell Company Fraud |
| **Total Stolen**     | $45,750                              |
| **Duration**         | 3 months (January - March 2024)      |
| **Discovery Method** | Q1 financial review by Diana Walsh   |

### 2.2. Mechanism

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRAUD MECHANISM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SETUP                                                                   │
│     Marcus creates "Sunshine Supplies Ltd." shell company                   │
│     Registered at girlfriend's address: 123 Oak Street                      │
│     Opens business bank account                                             │
│                                                                             │
│  2. VENDOR REGISTRATION                                                     │
│     Marcus submits vendor registration form for Sunshine                    │
│     As Procurement Manager, he approves his own submission                  │
│     Sunshine becomes an "approved vendor" in the system                     │
│                                                                             │
│  3. INVOICE SUBMISSION                                                      │
│     Fake invoices sent from invoices@sunshine-supplies.com                  │
│     Vague descriptions: "Strategic Consulting", "Process Optimization"      │
│     Amounts kept under $15,000 (Marcus's approval limit)                    │
│                                                                             │
│  4. SELF-APPROVAL                                                           │
│     Marcus approves all Sunshine invoices himself                           │
│     No second reviewer required under $15,000                               │
│     Payment processed through normal AP cycle                               │
│                                                                             │
│  5. COLLECTION                                                              │
│     Payments deposited to Sunshine's bank account                           │
│     Marcus withdraws cash or transfers to personal account                  │
│                                                                             │
│  CONTROL FAILURES:                                                          │
│  • No separation of duties (submit + approve)                               │
│  • No vendor address verification                                           │
│  • No review of vague invoice descriptions                                  │
│  • No rotation of approval responsibilities                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3. Timeline

```
January 2024
├── Jan 10: Marcus incorporates Sunshine Supplies Ltd.
│           Address: 123 Oak Street (girlfriend's residence)
├── Jan 18: Marcus submits Vendor Registration Form VS-2024-018
└── Jan 20: Vendor registration approved (by Marcus)

February 2024
├── Feb 5:  Invoice #4501 submitted - $8,500 "Q1 Strategy Consulting"
├── Feb 8:  Marcus approves Invoice #4501
└── Feb 28: Payment processed to Sunshine

March 2024
├── Mar 5:  Invoice #4521 submitted - $12,000 "Market Analysis Phase 1"
├── Mar 8:  Marcus approves Invoice #4521
├── Mar 10: David Park questions invoice format (Slack)
├── Mar 12: Invoice #4534 submitted - $15,250 "Process Optimization Review"
├── Mar 15: Marcus approves Invoice #4534
├── Mar 22: Payments processed (batch)
├── Mar 25: Invoice #4558 submitted - $10,000 "Strategic Planning Support"
└── Mar 28: Marcus approves Invoice #4558

April 2024
├── Apr 1:  Diana notices irregularities during Q1 close
├── Apr 2:  Diana emails Marcus asking about Sunshine
└── Apr 3:  Case assigned to investigator (YOU)
```

### 2.4. Evidence Chain

```
                    ┌─────────────────────┐
                    │   GROUND TRUTH      │
                    │   Marcus = Culprit  │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ EVIDENCE │        │ EVIDENCE │        │ EVIDENCE │
    │    #1    │        │    #2    │        │    #3    │
    │ Address  │        │ Approval │        │  Email   │
    │  Match   │        │ Pattern  │        │  Tone    │
    └────┬─────┘        └────┬─────┘        └────┬─────┘
         │                   │                   │
         ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  DOC-010 │        │  DOC-019 │        │  DOC-003 │
    │  Vendor  │        │ Approval │        │   Email  │
    │   Form   │        │   Log    │        │  RE:4521 │
    └──────────┘        └──────────┘        └──────────┘

Supporting Evidence:
- DOC-020: Slack - David questions, Marcus deflects
- DOC-024: HR Record - Confirms approval authority
- DOC-004 to DOC-008: Invoice vagueness pattern
```

### 2.5. Key Evidence Summary

| ID  | Evidence               | Document                | What It Proves                                     | Weight         |
| --- | ---------------------- | ----------------------- | -------------------------------------------------- | -------------- |
| E1  | **Address match**      | Vendor Form VS-2024-018 | Sunshine's address is residential (123 Oak Street) | Critical       |
| E2  | **Sole approver**      | Approval Log            | Marcus approved 100% of Sunshine invoices          | Critical       |
| E3  | **Familiar tone**      | Email RE: Invoice #4521 | Marcus writes to Sunshine like he knows them       | Strong         |
| E4  | **Vague descriptions** | All Sunshine invoices   | No deliverables specified                          | Supporting     |
| E5  | **No other contact**   | Email search            | Only Marcus communicated with Sunshine             | Supporting     |
| E6  | **Quick registration** | Vendor Form timestamps  | Approved faster than other vendors                 | Circumstantial |

### 2.6. Red Herrings

| Item              | Document | Why Suspicious       | Innocent Explanation                        |
| ----------------- | -------- | -------------------- | ------------------------------------------- |
| Sarah's expenses  | DOC-015  | $3,200 in one week   | Legitimate conference travel with receipts  |
| "Delete my files" | DOC-023  | Sounds like cover-up | Standard offboarding for departing employee |
| Budget complaints | DOC-021  | Someone's unhappy    | Normal corporate politics, unrelated        |

---

## 3. Entity Model

### 3.1. Entity Relationship Graph

```
                                    ┌──────────────────┐
                                    │    TechFlow      │
                                    │   Industries     │
                                    │    (Client)      │
                                    └────────┬─────────┘
                                             │ employs
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
      ┌──────────────┐              ┌──────────────┐              ┌──────────────┐
      │  Diana Walsh │              │ Marcus Chen  │              │  Sarah Kim   │
      │  VP Finance  │◀─────────────│  Proc. Mgr   │              │     CFO      │
      │  (Contact)   │   reports_to │  ⚠️ CULPRIT  │              │ (Red Herring)│
      └──────────────┘              └──────┬───────┘              └──────────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │ created        │ controls       │ approved
                          ▼                ▼                ▼
                  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                  │   Sunshine   │  │   Sunshine   │  │  Invoices    │
                  │ Supplies Ltd │  │   Address    │  │ #4501, 4521  │
                  │ (Shell Co.)  │  │ 123 Oak St   │  │ #4534, 4558  │
                  └──────────────┘  └──────────────┘  └──────────────┘
                          │
                          │ receives_payment
                          ▼
                  ┌──────────────┐
                  │  Bank Acct   │
                  │   ****4521   │
                  └──────────────┘
```

### 3.2. People

| ID  | Name               | Role                  | Email                       | Relevance      | Notes                                  |
| --- | ------------------ | --------------------- | --------------------------- | -------------- | -------------------------------------- |
| P1  | **Marcus Chen**    | Procurement Manager   | marcus.chen@techflow.com    | 🔴 CULPRIT     | Created and controls Sunshine Supplies |
| P2  | **Diana Walsh**    | VP of Finance         | diana.walsh@techflow.com    | 🟢 Contact     | Your client, discovered irregularities |
| P3  | **Sarah Kim**      | CFO                   | sarah.kim@techflow.com      | 🟡 Red Herring | Expense report looks suspicious        |
| P4  | **David Park**     | Procurement Associate | david.park@techflow.com     | ⚪ Context     | Questioned Sunshine, was deflected     |
| P5  | **James Liu**      | IT Manager            | james.liu@techflow.com      | ⚪ Context     | Processes offboarding tickets          |
| P6  | **Emma Rodriguez** | HR Director           | emma.rodriguez@techflow.com | ⚪ Context     | HR records                             |
| P7  | **Tom Wilson**     | Marketing (Former)    | tom.wilson@techflow.com     | 🟡 Red Herring | "Delete my files" request              |

### 3.3. Organizations

| ID  | Name                       | Type          | Address                   | Relevance     | Notes                               |
| --- | -------------------------- | ------------- | ------------------------- | ------------- | ----------------------------------- |
| O1  | **TechFlow Industries**    | Client        | 500 Tech Plaza, Austin TX | 🟢 Client     | Your client company                 |
| O2  | **Sunshine Supplies Ltd.** | Shell Company | 123 Oak Street, Austin TX | 🔴 Key        | Phantom vendor, residential address |
| O3  | **Office Depot**           | Legit Vendor  | N/A                       | ⚪ Comparison | Normal vendor for contrast          |
| O4  | **CloudServe Inc.**        | Legit Vendor  | N/A                       | ⚪ Comparison | Normal vendor for contrast          |
| O5  | **IT Support Plus**        | Legit Vendor  | N/A                       | ⚪ Comparison | Normal vendor for contrast          |

### 3.4. Accounts

| ID  | Account      | Owner                  | Bank                | Relevance                      |
| --- | ------------ | ---------------------- | ------------------- | ------------------------------ |
| A1  | \*\*\*\*4521 | Sunshine Supplies Ltd. | First National Bank | 🔴 Key - Receives stolen funds |
| A2  | \*\*\*\*7890 | TechFlow Industries    | Chase Business      | ⚪ Context - Paying account    |

### 3.5. Locations

| ID  | Address                       | Type        | Relevance  | Notes                         |
| --- | ----------------------------- | ----------- | ---------- | ----------------------------- |
| L1  | 500 Tech Plaza, Austin TX     | Commercial  | ⚪ Context | TechFlow headquarters         |
| L2  | **123 Oak Street, Austin TX** | Residential | 🔴 Key     | Sunshine's registered address |

---

## 4. Document Inventory

### 4.1. Summary

| Type            | Count  | Key Documents                         |
| --------------- | ------ | ------------------------------------- |
| 📧 Emails       | 10     | Marcus-Sunshine thread, Diana inquiry |
| 📄 Invoices     | 7      | 4 Sunshine (fake), 3 legitimate       |
| 📋 Forms        | 3      | Vendor registrations                  |
| 📊 Spreadsheets | 2      | Approval log, vendor payments         |
| 💬 Slack        | 3      | Procurement, Finance, Random          |
| 📁 Other        | 2      | HR record, IT ticket                  |
| **Total**       | **27** |                                       |

### 4.2. Document Details

---

#### DOC-001: Email - Diana to Marcus (Inquiry)

```yaml
id: DOC-001
type: email
date: 2024-04-02T09:15:00
from: diana.walsh@techflow.com
to: marcus.chen@techflow.com
subject: 'Question about Sunshine Supplies'
relevance: context
is_key_evidence: false
```

```
From: Diana Walsh <diana.walsh@techflow.com>
To: Marcus Chen <marcus.chen@techflow.com>
Date: April 2, 2024 09:15 AM
Subject: Question about Sunshine Supplies

Marcus,

Quick question — I was reviewing our Q1 vendor payments and noticed
we've paid about $45k to a company called Sunshine Supplies Ltd. for
"consulting services."

Can you give me some background on this vendor? I don't recall approving
them and I'm not sure what services they're providing.

Thanks,
Diana

---
Diana Walsh
VP of Finance | TechFlow Industries
diana.walsh@techflow.com
```

**Evidence value**: Context - shows Diana's investigation beginning

---

#### DOC-002: Email - Marcus to Diana (Response)

```yaml
id: DOC-002
type: email
date: 2024-04-02T10:42:00
from: marcus.chen@techflow.com
to: diana.walsh@techflow.com
subject: 'RE: Question about Sunshine Supplies'
relevance: supporting
is_key_evidence: false
```

```
From: Marcus Chen <marcus.chen@techflow.com>
To: Diana Walsh <diana.walsh@techflow.com>
Date: April 2, 2024 10:42 AM
Subject: RE: Question about Sunshine Supplies

Diana,

Good question! Sunshine Supplies is a consulting firm that helps with
procurement strategy and process optimization. They came highly
recommended by a colleague at a previous company.

Their work has been valuable for streamlining our vendor evaluation
process. All invoices were within my approval authority and properly
documented.

Happy to discuss further if you'd like more details.

Best,
Marcus

---
Marcus Chen
Procurement Manager | TechFlow Industries
marcus.chen@techflow.com
```

**Evidence value**: Shows Marcus's deflection and defensive response

---

#### DOC-003: Email - Marcus to Sunshine (Familiar Tone) ⭐ KEY

```yaml
id: DOC-003
type: email
date: 2024-03-15T09:42:00
from: marcus.chen@techflow.com
to: invoices@sunshine-supplies.com
subject: 'RE: Invoice #4521'
relevance: critical
is_key_evidence: true
evidence_type: familiar_tone
```

```
From: Marcus Chen <marcus.chen@techflow.com>
To: invoices@sunshine-supplies.com
Date: March 15, 2024 09:42 AM
Subject: RE: Invoice #4521

Hi there,

Got the invoice, looks good. Same arrangement as before — I'll push
it through by EOD.

Let me know about next month's order. Maybe we can bump it up a bit
since Q2 budget just got approved? Thinking around 12-15k if the
numbers work.

Talk soon,
M

---
Marcus Chen
Procurement Manager | TechFlow Industries
```

**Evidence value**: ⭐ CRITICAL

- "Hi there" - casual greeting to supposed vendor
- "Same arrangement as before" - implies ongoing scheme
- "M" - informal signature (vs full signature in DOC-002)
- Discusses coordinating invoice amounts

---

#### DOC-004: Email - Sunshine to Marcus (Invoice Submission)

```yaml
id: DOC-004
type: email
date: 2024-03-05T14:30:00
from: invoices@sunshine-supplies.com
to: marcus.chen@techflow.com
subject: 'Invoice #4521 - March Services'
relevance: supporting
is_key_evidence: false
```

```
From: invoices@sunshine-supplies.com
To: Marcus Chen <marcus.chen@techflow.com>
Date: March 5, 2024 02:30 PM
Subject: Invoice #4521 - March Services

Dear Mr. Chen,

Please find attached Invoice #4521 for services rendered in March.

Amount: $12,000.00
Description: Market Analysis Phase 1

As always, thank you for your continued partnership.

Best regards,
Sunshine Supplies Ltd.
Accounts Receivable

---
[Attachment: INV-4521.pdf]
```

**Evidence value**: Note formal tone FROM Sunshine vs casual tone TO Sunshine

---

#### DOC-005: Invoice #4501 (February)

```yaml
id: DOC-005
type: invoice
date: 2024-02-05
vendor: Sunshine Supplies Ltd.
amount: 8500.00
relevance: supporting
is_key_evidence: false
evidence_type: vague_description
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SUNSHINE SUPPLIES LTD.                          INVOICE        │
│  123 Oak Street                                  #4501          │
│  Austin, TX 78701                                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bill To:                      Date: February 5, 2024           │
│  TechFlow Industries           Due: February 28, 2024           │
│  500 Tech Plaza                                                 │
│  Austin, TX 78704              Payment Terms: Net 30            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Description                                     Amount         │
│  ─────────────────────────────────────────────────────────      │
│  Q1 Strategy Consulting                          $8,500.00      │
│                                                                 │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                    Subtotal:     $8,500.00      │
│                                    Tax:          $0.00          │
│                                    TOTAL:        $8,500.00      │
│                                                                 │
│  Payment Info:                                                  │
│  First National Bank                                            │
│  Account: ****4521                                              │
│  Routing: 111000025                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: Vague description, no deliverables listed

---

#### DOC-006: Invoice #4521 (March - First)

```yaml
id: DOC-006
type: invoice
date: 2024-03-05
vendor: Sunshine Supplies Ltd.
amount: 12000.00
relevance: supporting
is_key_evidence: false
evidence_type: vague_description
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SUNSHINE SUPPLIES LTD.                          INVOICE        │
│  123 Oak Street                                  #4521          │
│  Austin, TX 78701                                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bill To:                      Date: March 5, 2024              │
│  TechFlow Industries           Due: March 31, 2024              │
│  500 Tech Plaza                                                 │
│  Austin, TX 78704              Payment Terms: Net 30            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Description                                     Amount         │
│  ─────────────────────────────────────────────────────────      │
│  Market Analysis Phase 1                         $12,000.00     │
│                                                                 │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                    Subtotal:     $12,000.00     │
│                                    Tax:          $0.00          │
│                                    TOTAL:        $12,000.00     │
│                                                                 │
│  Payment Info:                                                  │
│  First National Bank                                            │
│  Account: ****4521                                              │
│  Routing: 111000025                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: Vague description pattern continues

---

#### DOC-007: Invoice #4534 (March - Second)

```yaml
id: DOC-007
type: invoice
date: 2024-03-12
vendor: Sunshine Supplies Ltd.
amount: 15250.00
relevance: supporting
is_key_evidence: false
evidence_type: amount_pattern
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SUNSHINE SUPPLIES LTD.                          INVOICE        │
│  123 Oak Street                                  #4534          │
│  Austin, TX 78701                                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bill To:                      Date: March 12, 2024             │
│  TechFlow Industries           Due: April 15, 2024              │
│  500 Tech Plaza                                                 │
│  Austin, TX 78704              Payment Terms: Net 30            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Description                                     Amount         │
│  ─────────────────────────────────────────────────────────      │
│  Process Optimization Review                     $15,250.00     │
│                                                                 │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                    Subtotal:     $15,250.00     │
│                                    Tax:          $0.00          │
│                                    TOTAL:        $15,250.00     │
│                                                                 │
│  Payment Info:                                                  │
│  First National Bank                                            │
│  Account: ****4521                                              │
│  Routing: 111000025                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: $15,250 is just above Marcus's $15K approval limit (requires secondary approval)

---

#### DOC-008: Invoice #4558 (March - Third)

```yaml
id: DOC-008
type: invoice
date: 2024-03-25
vendor: Sunshine Supplies Ltd.
amount: 10000.00
relevance: supporting
is_key_evidence: false
evidence_type: vague_description
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SUNSHINE SUPPLIES LTD.                          INVOICE        │
│  123 Oak Street                                  #4558          │
│  Austin, TX 78701                                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bill To:                      Date: March 25, 2024             │
│  TechFlow Industries           Due: April 25, 2024              │
│  500 Tech Plaza                                                 │
│  Austin, TX 78704              Payment Terms: Net 30            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Description                                     Amount         │
│  ─────────────────────────────────────────────────────────      │
│  Strategic Planning Support                      $10,000.00     │
│                                                                 │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                    Subtotal:     $10,000.00     │
│                                    Tax:          $0.00          │
│                                    TOTAL:        $10,000.00     │
│                                                                 │
│  Payment Info:                                                  │
│  First National Bank                                            │
│  Account: ****4521                                              │
│  Routing: 111000025                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: Back under $15K after #4534 went over

---

#### DOC-009: Invoice #4512 (Office Depot - Legitimate) - Comparison

```yaml
id: DOC-009
type: invoice
date: 2024-03-01
vendor: Office Depot
amount: 1890.00
relevance: comparison
is_key_evidence: false
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  OFFICE DEPOT                                    INVOICE        │
│  Business Solutions                              #OD-2024-8892  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bill To:                      Date: March 1, 2024              │
│  TechFlow Industries           Due: March 31, 2024              │
│  ATTN: Accounts Payable                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Item #       Description              Qty    Unit     Amount   │
│  ─────────────────────────────────────────────────────────      │
│  OD-78234     HP LaserJet Toner 26X    12    $89.99   $1,079.88 │
│  OD-45621     Copy Paper 8.5x11 Case   20    $32.99   $659.80   │
│  OD-11234     Stapler, Heavy Duty       5    $18.99   $94.95    │
│  OD-99012     Pen, Ballpoint 12pk      10    $5.49    $54.90    │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│                                    Subtotal:     $1,889.53      │
│                                    Tax:          $0.00          │
│                                    TOTAL:        $1,889.53      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: COMPARISON - Shows what a legitimate invoice looks like (itemized)

---

#### DOC-010: Vendor Registration Form - Sunshine ⭐ KEY

```yaml
id: DOC-010
type: form
date: 2024-01-18
relevance: critical
is_key_evidence: true
evidence_type: address_match
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              TECHFLOW INDUSTRIES                                │
│              VENDOR REGISTRATION FORM                           │
│                                                                 │
│              Form #: VS-2024-018                                │
│              Date Submitted: January 18, 2024                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VENDOR INFORMATION                                             │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  Company Name:    Sunshine Supplies Ltd.                        │
│  DBA:             N/A                                           │
│  Tax ID (EIN):    84-2847193                                    │
│                                                                 │
│  Business Address:                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  123 Oak Street                                         │   │
│  │  Austin, TX 78701                                       │   │ ◀── RESIDENTIAL
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Phone:           (512) 555-0147                                │
│  Email:           invoices@sunshine-supplies.com                │
│  Website:         N/A                                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SERVICES PROVIDED                                              │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  Category:        Professional Services / Consulting            │
│  Description:     Strategic consulting and process optimization │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BANKING INFORMATION                                            │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  Bank Name:       First National Bank                           │
│  Account #:       ****4521                                      │
│  Routing #:       111000025                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  APPROVALS                                                      │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  Submitted by:    Marcus Chen           Date: 01/18/2024        │
│  Approved by:     Marcus Chen           Date: 01/20/2024        │ ◀── SAME PERSON
│                                                                 │
│  ☑ W-9 Received                                                │
│  ☑ Insurance Certificate (if applicable)                       │
│  ☑ Background Check (if applicable)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: ⭐ CRITICAL

- **Address is residential** (123 Oak Street)
- **Same person submitted AND approved** (Marcus Chen)
- No website listed
- Vague service description

---

#### DOC-011: Vendor Registration Form - Office Depot (Comparison)

```yaml
id: DOC-011
type: form
date: 2021-06-15
relevance: comparison
is_key_evidence: false
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              TECHFLOW INDUSTRIES                                │
│              VENDOR REGISTRATION FORM                           │
│                                                                 │
│              Form #: VS-2021-042                                │
│              Date Submitted: June 15, 2021                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VENDOR INFORMATION                                             │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  Company Name:    Office Depot, Inc.                            │
│  DBA:             Office Depot Business Solutions               │
│  Tax ID (EIN):    59-2663954                                    │
│                                                                 │
│  Business Address:                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  6600 North Military Trail                              │   │
│  │  Boca Raton, FL 33496                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Phone:           1-888-263-3423                                │
│  Email:           business@officedepot.com                      │
│  Website:         www.officedepot.com                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  APPROVALS                                                      │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  Submitted by:    David Park            Date: 06/15/2021        │
│  Approved by:     Marcus Chen           Date: 06/18/2021        │ ◀── DIFFERENT PEOPLE
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: COMPARISON - Different submitter and approver (proper separation)

---

#### DOC-012: Approval Log ⭐ KEY

```yaml
id: DOC-012
type: spreadsheet
date: 2024-03-31
relevance: critical
is_key_evidence: true
evidence_type: approval_pattern
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  TECHFLOW INDUSTRIES - INVOICE APPROVAL LOG                                 │
│  Q1 2024 (January - March)                                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Invoice # │ Vendor              │ Amount     │ Approved By  │ Date        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  4498      │ CloudServe Inc.     │ $8,500.00  │ Marcus Chen  │ Jan 28      │
│  4501      │ Sunshine Supplies   │ $8,500.00  │ Marcus Chen  │ Feb 08      │ ◀──┐
│  4505      │ Office Depot        │ $2,340.00  │ David Park   │ Feb 12      │    │
│  4509      │ IT Support Plus     │ $4,200.00  │ Marcus Chen  │ Feb 20      │    │
│  4512      │ Office Depot        │ $1,890.00  │ Marcus Chen  │ Mar 01      │    │ ALL
│  4518      │ CloudServe Inc.     │ $8,500.00  │ David Park   │ Mar 05      │    │ SUNSHINE
│  4521      │ Sunshine Supplies   │ $12,000.00 │ Marcus Chen  │ Mar 08      │ ◀──┤ APPROVED
│  4527      │ Office Depot        │ $1,890.00  │ David Park   │ Mar 10      │    │ BY
│  4534      │ Sunshine Supplies   │ $15,250.00 │ Marcus Chen  │ Mar 15      │ ◀──┤ MARCUS
│  4541      │ CloudServe Inc.     │ $8,500.00  │ Marcus Chen  │ Mar 18      │    │
│  4558      │ Sunshine Supplies   │ $10,000.00 │ Marcus Chen  │ Mar 28      │ ◀──┘
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUMMARY BY VENDOR                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Sunshine Supplies:  4 invoices, $45,750 total, 100% approved by M. Chen   │
│  CloudServe Inc.:    3 invoices, $25,500 total, 67% by M. Chen, 33% D. Park│
│  Office Depot:       3 invoices, $6,120 total, 33% by M. Chen, 67% D. Park │
│  IT Support Plus:    1 invoice, $4,200 total, 100% by M. Chen              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Evidence value**: ⭐ CRITICAL - Marcus approved ALL Sunshine invoices (unique pattern)

---

#### DOC-013: Slack - Procurement Channel

```yaml
id: DOC-013
type: chat
date: 2024-03-10
channel: '#procurement'
relevance: supporting
is_key_evidence: false
```

```
#procurement
March 10, 2024

┌─────────────────────────────────────────────────────────────────────────────┐
│ David Park                                                      10:23 AM   │
│ Anyone know who handles the Sunshine Supplies account? Got a question      │
│ about their invoice format.                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Marcus Chen                                                     10:25 AM   │
│ That's me. What's up?                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ David Park                                                      10:26 AM   │
│ Their invoices don't have detailed line items like our other vendors.      │
│ Is that normal for consulting?                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Marcus Chen                                                     10:28 AM   │
│ Yeah, consulting contracts are usually project-based rather than           │
│ itemized. It's standard.                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ David Park                                                      10:28 AM   │
│ Got it, thanks!                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Evidence value**: Shows David questioned format but Marcus deflected with plausible explanation

---

#### DOC-014: Slack - Finance Channel (Red Herring)

```yaml
id: DOC-014
type: chat
date: 2024-02-20
channel: '#finance'
relevance: red_herring
is_key_evidence: false
```

```
#finance
February 20, 2024

┌─────────────────────────────────────────────────────────────────────────────┐
│ Sarah Kim                                                       09:15 AM   │
│ Heads up team - we need to tighten the budget review process. I've seen    │
│ a few expenses slip through without proper documentation.                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Diana Walsh                                                     09:18 AM   │
│ Agreed. Any specific concerns?                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Sarah Kim                                                       09:20 AM   │
│ Just general sloppiness. Nothing major, but let's be more rigorous.       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Anonymous                                                       09:22 AM   │
│ Maybe if we had more staff we wouldn't miss things 🙄                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Sarah Kim                                                       09:25 AM   │
│ I hear you, but budget is budget. Let's work with what we have.           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Evidence value**: RED HERRING - Sounds like cover-up but just normal budget frustration

---

#### DOC-015: Sarah Kim Expense Report (Red Herring)

```yaml
id: DOC-015
type: form
date: 2024-03-01
relevance: red_herring
is_key_evidence: false
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              TECHFLOW INDUSTRIES                                │
│              EXPENSE REPORT                                     │
│                                                                 │
│              Report #: EXP-2024-0234                            │
│              Employee: Sarah Kim (CFO)                          │
│              Period: February 19-23, 2024                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Date       │ Description              │ Category    │ Amount   │
│  ─────────────────────────────────────────────────────────────  │
│  Feb 19     │ Flight: AUS → SFO        │ Travel      │ $487.00  │
│  Feb 19     │ Uber to hotel            │ Transport   │ $62.00   │
│  Feb 19-22  │ Hotel: Marriott Union Sq │ Lodging     │ $1,245.00│
│  Feb 20     │ CFO Summit Registration  │ Conference  │ $850.00  │
│  Feb 20     │ Client dinner (4 people) │ Meals       │ $312.00  │
│  Feb 21     │ Working lunch            │ Meals       │ $78.00   │
│  Feb 22     │ Flight: SFO → AUS        │ Travel      │ $523.00  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│                                         TOTAL:       $3,557.00  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ATTACHMENTS: ✓ All receipts attached                          │
│  PURPOSE: Annual CFO Summit - San Francisco                     │
│  APPROVED BY: Diana Walsh, VP Finance      Date: Mar 5, 2024   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: RED HERRING - Large expense looks suspicious but fully documented with receipts

---

#### DOC-016: IT Ticket (Red Herring)

```yaml
id: DOC-016
type: ticket
date: 2024-03-08
relevance: red_herring
is_key_evidence: false
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  TECHFLOW IT SUPPORT SYSTEM                                     │
│                                                                 │
│  Ticket #:    INC-2024-0892                                     │
│  Status:      ✓ Resolved                                        │
│  Priority:    Normal                                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Submitted:   March 8, 2024                                     │
│  Requester:   Tom Wilson (Marketing)                            │
│  Category:    Account Deactivation                              │
│                                                                 │
│  Subject:     Please delete my files                            │
│                                                                 │
│  Description:                                                   │
│  Last day is Friday. Please delete my personal files from the   │
│  shared drive and deactivate my accounts per offboarding        │
│  procedure.                                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RESOLUTION (March 12, 2024)                                    │
│  User account deactivated. Personal files deleted per request.  │
│  Work files archived per retention policy.                      │
│                                                                 │
│  Resolved by: James Liu, IT Manager                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: RED HERRING - "Delete my files" sounds suspicious but standard offboarding

---

#### DOC-017: Slack - Random (Noise)

```yaml
id: DOC-017
type: chat
date: 2024-03-05
channel: '#random'
relevance: noise
is_key_evidence: false
```

```
#random
March 5, 2024

┌─────────────────────────────────────────────────────────────────────────────┐
│ James Liu                                                       02:15 PM   │
│ Anyone else having issues with the coffee machine on floor 3?             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Emma Rodriguez                                                  02:18 PM   │
│ It's been broken for a week. I put in a facilities ticket.                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Marcus Chen                                                     02:20 PM   │
│ There's a Starbucks across the street 🙃                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ James Liu                                                       02:22 PM   │
│ Not the same and you know it                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ David Park                                                      02:25 PM   │
│ The one on floor 2 still works. Just saying.                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Evidence value**: NOISE - Normal office chatter, no relevance

---

#### DOC-018: HR Record - Marcus Chen

```yaml
id: DOC-018
type: hr_record
date: 2024-01-01
relevance: context
is_key_evidence: false
```

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              TECHFLOW INDUSTRIES                                │
│              EMPLOYEE RECORD                                    │
│              [CONFIDENTIAL]                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PERSONAL INFORMATION                                           │
│  ─────────────────────────────────────────────────────────      │
│  Name:            Marcus Chen                                   │
│  Employee ID:     TF-2019-0234                                  │
│  Department:      Procurement                                   │
│  Title:           Procurement Manager                           │
│  Reports To:      Diana Walsh, VP Finance                       │
│  Start Date:      March 15, 2019                                │
│  Salary Band:     Level 6                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  APPROVAL AUTHORITY                                             │
│  ─────────────────────────────────────────────────────────      │
│  Vendor Registration:    Up to $100,000 annual spend            │
│  Invoice Approval:       Up to $15,000 per invoice              │ ◀── KEY
│  Contract Signing:       Up to $25,000 total value              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EMPLOYMENT HISTORY                                             │
│  ─────────────────────────────────────────────────────────      │
│  Mar 2019 - Dec 2021:    Procurement Associate                  │
│  Jan 2022 - Present:     Procurement Manager (promoted)         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PERFORMANCE                                                    │
│  ─────────────────────────────────────────────────────────      │
│  2023:    Exceeds Expectations                                  │
│  2022:    Exceeds Expectations                                  │
│  2021:    Meets Expectations                                    │
│                                                                 │
│  DISCIPLINARY RECORD:    None                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence value**: Context - Confirms Marcus has authority to approve invoices up to $15K and register vendors

---

#### DOC-019: Vendor Payment Summary

```yaml
id: DOC-019
type: spreadsheet
date: 2024-03-31
relevance: context
is_key_evidence: false
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  TECHFLOW INDUSTRIES                                                        │
│  VENDOR PAYMENT SUMMARY - Q1 2024                                           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Vendor              │ Jan       │ Feb       │ Mar       │ Q1 Total        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Sunshine Supplies   │ $0        │ $8,500    │ $37,250   │ $45,750         │ ◀── HIGH
│  CloudServe Inc.     │ $8,500    │ $0        │ $17,000   │ $25,500         │
│  Office Depot        │ $3,200    │ $2,340    │ $3,780    │ $9,320          │
│  IT Support Plus     │ $4,200    │ $4,200    │ $4,200    │ $12,600         │
│  AWS                 │ $12,450   │ $13,200   │ $14,100   │ $39,750         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Q1 TOTAL:                                                    $132,920      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NOTES:                                                                     │
│  - Sunshine Supplies: New vendor, first invoice Feb 2024                   │
│  - Significant ramp in March spend for Sunshine ($37,250)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Evidence value**: Context - Shows Sunshine's rapid spend increase

---

## 5. Hints by Tier

### Tier 0: Free Nudges (No penalty)

| Hint                                                      | When to Show                |
| --------------------------------------------------------- | --------------------------- |
| "Have you compared all the vendor registration forms?"    | After 5 min, <2 docs viewed |
| "Pay attention to who approves what in the approval log." | After viewing DOC-012       |
| "Email tone can tell you a lot about relationships."      | After viewing any email     |

### Tier 1: Pointers (-5 points)

| Hint                                                                      | Revelation Level             |
| ------------------------------------------------------------------------- | ---------------------------- |
| "One of these vendors was registered much more recently than the others." | Points to Sunshine's newness |
| "Look at who submits AND approves vendor registrations."                  | Points to self-approval      |

### Tier 2: Spotlights (-15 points)

| Hint                                                                                 | Revelation Level   |
| ------------------------------------------------------------------------------------ | ------------------ |
| "Take a close look at the Sunshine Supplies vendor form - specifically the address." | Highlights DOC-010 |
| "Check Invoice #4521's email thread. Notice anything about the tone?"                | Highlights DOC-003 |

### Tier 3: Connections (-25 points)

| Hint                                                                                                                      | Revelation Level               |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| "Compare the address on Sunshine's vendor form with typical business addresses. Is 123 Oak Street a commercial location?" | Reveals address is residential |
| "Marcus Chen approved every single Sunshine invoice. No other vendor has this pattern."                                   | Reveals approval pattern       |

### Tier 4: Revelations (-40 points)

| Hint                                                                                                                             | Revelation Level        |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| "The address 123 Oak Street on Sunshine's registration is a residential address - possibly connected to Marcus Chen personally." | Nearly reveals solution |
| "Marcus submitted, approved, and is the sole contact for Sunshine Supplies. He's paying himself through a shell company."        | Reveals mechanism       |

---

## 6. Scoring Rubric

### 6.1. Culprit Identification (35 points)

| Answer                           | Points | Notes                      |
| -------------------------------- | ------ | -------------------------- |
| Marcus Chen only (correct)       | 35     | Perfect                    |
| Marcus Chen + wrong accomplice   | 25     | Partial - overcomplicated  |
| Wrong primary + Marcus secondary | 15     | Identified but not primary |
| Wrong person entirely            | 0      |                            |

### 6.2. Mechanism Explanation (25 points)

| Element                        | Points | Example                                               |
| ------------------------------ | ------ | ----------------------------------------------------- |
| Shell company / phantom vendor | 10     | "Created fake company Sunshine Supplies"              |
| Fake invoices for non-services | 8      | "Submitted invoices for consulting never provided"    |
| Self-approval abuse            | 7      | "Approved his own invoices under his authority limit" |

| Completeness                         | Points |
| ------------------------------------ | ------ |
| All three elements clearly explained | 25     |
| Two elements                         | 18     |
| One element                          | 10     |
| Vague or mostly wrong                | 0-5    |

**LLM Scoring Prompt:**

```
Score the player's mechanism explanation (0-25 points):

CORRECT MECHANISM:
- Marcus created shell company "Sunshine Supplies Ltd." (10 pts)
- Submitted fake invoices for consulting never provided (8 pts)
- Approved his own invoices using his $15K authority (7 pts)

PLAYER'S EXPLANATION:
{player_mechanism}

Score each element and sum. Be generous with phrasing variations.
```

### 6.3. Evidence Quality (25 points)

| Evidence Cited                       | Points |
| ------------------------------------ | ------ |
| Address match (DOC-010)              | +8     |
| Approval pattern (DOC-012)           | +8     |
| Familiar email tone (DOC-003)        | +5     |
| Invoice vagueness (DOC-005/06/07/08) | +4     |
| **Maximum**                          | **25** |

| Penalties                                | Points  |
| ---------------------------------------- | ------- |
| Irrelevant evidence cited (red herrings) | -2 each |
| Missing critical evidence (E1 or E2)     | -5 each |

### 6.4. Efficiency (10 points)

| Hints Used | Points |
| ---------- | ------ |
| 0 hints    | 10     |
| 1 hint     | 8      |
| 2 hints    | 6      |
| 3 hints    | 4      |
| 4+ hints   | 2      |

| Bonus                  | Points             |
| ---------------------- | ------------------ |
| Completed under 15 min | +2                 |
| Completed under 12 min | +3 (instead of +2) |

### 6.5. Recommendations (5 points)

| Quality              | Points | Example                                         |
| -------------------- | ------ | ----------------------------------------------- |
| Practical, specific  | 5      | "Require dual-approval for vendor registration" |
| Generic but relevant | 3      | "Improve controls"                              |
| Vague or missing     | 0-1    |                                                 |

**Good recommendations:**

- "Implement dual-approval for all vendor registrations"
- "Require Finance review for any vendor without a verified business address"
- "Rotate invoice approval responsibilities monthly"
- "Audit vendors with vague service descriptions quarterly"
- "Verify vendor addresses against business registries"
- "Flag invoices without itemized descriptions for additional review"

### 6.6. Grade Thresholds

| Score  | Grade | Title               |
| ------ | ----- | ------------------- |
| 90-100 | A+    | Partner             |
| 85-89  | A     | Senior Investigator |
| 75-84  | B     | Investigator        |
| 65-74  | C     | Associate           |
| 50-64  | D     | Trainee             |
| <50    | F     | Case Not Solved     |

---

## 7. ARIA Response Examples

### 7.1. Good Responses (ARIA should do this)

**User**: "Who is Marcus Chen?"

**ARIA**:

> Marcus Chen is the Procurement Manager at TechFlow Industries [HR Record]. He reports to Diana Walsh and has been with the company since March 2019, promoted to manager in January 2022.
>
> His approval authority includes invoices up to $15,000 and vendor registrations up to $100,000 annual spend [HR Record].
>
> He's the primary contact for several vendors including Sunshine Supplies and CloudServe Inc. [Approval Log].
>
> Sources: [📁 HR Record - Marcus Chen] [📊 Approval Log Q1 2024]

---

**User**: "What does Sunshine Supplies do?"

**ARIA**:

> According to their vendor registration, Sunshine Supplies Ltd. provides "Strategic consulting and process optimization" [Vendor Form VS-2024-018].
>
> However, I notice their invoices have fairly vague descriptions like "Q1 Strategy Consulting" and "Market Analysis Phase 1" without specific deliverables [Invoice #4501, #4521].
>
> Interestingly, I couldn't find any emails from other TechFlow employees mentioning working with them - only Marcus Chen appears to communicate with this vendor.
>
> Sources: [📋 Vendor Form VS-2024-018] [📄 Invoice #4501] [📄 Invoice #4521]

---

**User**: "Is Marcus Chen the thief?"

**ARIA**:

> I can't determine guilt - that's your job as the investigator. 😉
>
> However, I can tell you some interesting facts I've found:
>
> - Marcus is the only TechFlow employee who communicates with Sunshine Supplies
> - He approved all 4 of their invoices (100%), while other vendors are split between approvers [Approval Log]
> - He both submitted AND approved their vendor registration [Vendor Form]
>
> Make of that what you will.
>
> Sources: [📊 Approval Log Q1 2024] [📋 Vendor Form VS-2024-018]

### 7.2. Bad Responses (ARIA should NOT do this)

❌ **Too direct:**

> "Marcus Chen is clearly the culprit. He created a shell company."

❌ **No citations:**

> "Sunshine Supplies seems suspicious to me."

❌ **Speculation:**

> "Marcus is probably using the money to pay off gambling debts."

❌ **Giving answers:**

> "You should accuse Marcus Chen and mention the address match."

---

## 8. Glossary Terms

Terms ARIA can explain when players ask:

| Term                     | Explanation                                                                                                                         | Why It Matters                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Shell company**        | A company that exists only on paper with no real operations, often used to hide the true ownership of assets or transactions.       | Sunshine Supplies may be a shell company - no real services provided.            |
| **Phantom vendor**       | A fake vendor set up to receive fraudulent payments from a company, often by an insider who controls both sides.                    | Classic fraud pattern where employee creates fake vendor to pay themselves.      |
| **Separation of duties** | A control principle where no single person should control all aspects of a financial transaction (e.g., request, approve, and pay). | Marcus both submitted and approved Sunshine's registration - a control weakness. |
| **Approval authority**   | The maximum amount an employee can approve without additional sign-off.                                                             | Marcus can approve up to $15,000 alone - notice invoice amounts.                 |
| **EIN (Tax ID)**         | Employer Identification Number - like a Social Security Number for businesses, used for tax purposes.                               | Sunshine has an EIN (84-2847193), but that doesn't prove legitimacy.             |
| **W-9**                  | IRS form that vendors provide to companies paying them, includes their tax information.                                             | Sunshine provided a W-9, but the form can be filed with minimal verification.    |
| **Net 30**               | Payment terms meaning the invoice is due within 30 days.                                                                            | Standard terms - not suspicious by itself.                                       |

---

## 9. Customization Parameters

If this case were generated from a template, these would be the customizable fields:

```yaml
# COMPANY
company_name: 'TechFlow Industries' # Player customizable
company_industry: 'Technology / Software' # Dropdown selection
company_size: '~200 employees' # Affects document volume

# PEOPLE
culprit_name: 'Marcus Chen' # Player customizable
culprit_role: 'Procurement Manager' # Fixed by template
contact_name: 'Diana Walsh' # Player customizable
contact_role: 'VP of Finance' # Fixed by template

# SHELL COMPANY
shell_company_name: 'Sunshine Supplies Ltd.' # Player customizable
shell_address: '123 Oak Street' # Generated (residential)
shell_services: 'consulting' # Fixed by template

# AMOUNTS
total_stolen: 45750 # Range: 30000-60000
invoice_amounts: [8500, 12000, 15250, 10000] # Generated within range
approval_limit: 15000 # Fixed

# TONE
tone_preset: 'professional' # Options: professional, casual, dark_humor
email_formality: 'mixed' # Culprit is informal to shell company

# TIMING
fraud_duration_months: 3
investigation_trigger: 'Q1 close review'
```

---

## 10. Validation Checklist

Before this case is playable, verify:

### Evidence Chain

- [ ] Address match evidence exists (DOC-010)
- [ ] Approval pattern evidence exists (DOC-012)
- [ ] Familiar tone evidence exists (DOC-003)
- [ ] At least 2 supporting evidence documents
- [ ] Evidence uniquely points to culprit

### Solvability

- [ ] Can identify culprit from evidence alone
- [ ] Can explain mechanism from evidence alone
- [ ] No critical evidence is hidden/unclear
- [ ] Red herrings are dismissible with investigation

### Consistency

- [ ] All dates are internally consistent
- [ ] All amounts match across documents
- [ ] All names are spelled consistently
- [ ] No contradictions between documents

### Playability

- [ ] Briefing clearly states objective
- [ ] Hints are accurate and helpful
- [ ] Scoring rubric matches solution
- [ ] All documents are readable

### Agent Verification

- [ ] AI agent can solve case (automated test)
- [ ] Solution found within reasonable steps
- [ ] No false positives on red herrings

---

## 11. Implementation Notes

### 11.1. Database Seeding

```python
# seed_mallory_case.py

case = Case(
    id="case_001_mallory",
    slug="mallory-procurement-irregularity",
    title="The Mallory Procurement Irregularity",
    difficulty=2,
    estimated_time_minutes=20,
    briefing=BRIEFING_TEXT,
    solution=SOLUTION_JSON,
)

# Seed documents
documents = [
    Document(id="DOC-001", case_id=case.id, type="email", ...),
    Document(id="DOC-002", case_id=case.id, type="email", ...),
    # ... all 27 documents
]

# Seed entities
entities = [
    Entity(id="P1", case_id=case.id, type="person", name="Marcus Chen", ...),
    Entity(id="O2", case_id=case.id, type="organization", name="Sunshine Supplies Ltd.", ...),
    # ... all entities
]

# Seed relationships
edges = [
    EntityEdge(source="P1", target="O1", relationship="works_at"),
    EntityEdge(source="P1", target="O2", relationship="created"),
    EntityEdge(source="P1", target="O2", relationship="controls"),
    # ... all edges
]

# Seed hints
hints = [
    Hint(case_id=case.id, tier=0, text="Have you compared...", trigger="time:5m"),
    Hint(case_id=case.id, tier=1, text="One of these vendors...", cost=5),
    # ... all hints
]
```

### 11.2. Chunk Strategy

```python
# Document chunking for RAG

CHUNK_CONFIG = {
    "email": {
        "chunk_size": 500,
        "overlap": 50,
        "include_metadata": ["from", "to", "date", "subject"]
    },
    "invoice": {
        "chunk_size": 300,
        "overlap": 0,
        "include_metadata": ["vendor", "amount", "date", "invoice_number"]
    },
    "form": {
        "chunk_size": 400,
        "overlap": 50,
        "include_metadata": ["form_type", "form_number", "date"]
    },
    "chat": {
        "chunk_size": 600,
        "overlap": 100,
        "include_metadata": ["channel", "date"]
    }
}
```

### 11.3. Expected Search Queries

Common queries players will make that should return good results:

| Query                   | Expected Top Results      |
| ----------------------- | ------------------------- |
| "Sunshine Supplies"     | DOC-010, DOC-003, DOC-005 |
| "Marcus Chen approval"  | DOC-012, DOC-018          |
| "vendor registration"   | DOC-010, DOC-011          |
| "consulting invoices"   | DOC-005, DOC-006, DOC-007 |
| "123 Oak Street"        | DOC-010                   |
| "who approved Sunshine" | DOC-012                   |

---

## 12. Solution Summary

### Correct Submission

**Culprit**: Marcus Chen

**Mechanism**:
Marcus Chen created a shell company called "Sunshine Supplies Ltd." at his girlfriend's residential address (123 Oak Street). As Procurement Manager, he had authority to both register new vendors and approve invoices up to $15,000. He submitted fake invoices for vague "consulting services" that were never provided, approved them himself, and collected payments totaling $45,750 over three months.

**Key Evidence**:

1. **Vendor registration form (DOC-010)**: Shows Sunshine's address as 123 Oak Street - a residential address - and that Marcus both submitted AND approved the registration
2. **Approval log (DOC-012)**: Marcus approved 100% of Sunshine invoices (4/4) - a unique pattern not seen with other vendors
3. **Email correspondence (DOC-003)**: Unusually familiar tone between Marcus and Sunshine ("Hi there," "Same arrangement," signs "M")
4. **Invoice pattern (DOC-005-008)**: All invoices have vague descriptions with no deliverables

**Recommendations**:

1. Require dual-approval for vendor registration (separation of duties)
2. Mandate address verification against business registries
3. Flag invoices with vague descriptions for additional review
4. Implement periodic vendor audits for "consulting" relationships
5. Rotate approval responsibilities to prevent single-approver patterns

---

_This document contains spoilers. For players, this information is only revealed after case completion._
