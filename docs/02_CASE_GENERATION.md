# Case Generation System

## 1. Philosophy

Cases are **not fully procedural** (too risky for fairness) but use a **template + variation** system:

```
Template defines the "shape" of the crime
     ↓
Variables fill in the details (names, amounts, dates)
     ↓
LLM naturalizes the text (makes it sound human)
     ↓
Validator ensures it's solvable
```

This gives us:

- **Consistency**: Templates guarantee solvable cases
- **Variety**: Variables create unique instances
- **Quality**: Human-designed crime logic, AI-polished prose

### 1.1. Key Principles

| Principle                  | Description                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| **Deterministic skeleton** | Core facts (who, what, when, how much) are generated without LLM |
| **LLM for prose only**     | AI makes text natural, never invents facts                       |
| **Validate everything**    | Every case must pass solvability checks                          |
| **Fail gracefully**        | If generation fails, retry with different seed                   |
| **Reproducible**           | Same seed + template = same case (for sharing)                   |

---

## 2. Template Structure

### 2.1. Template Definition

```yaml
template_id: phantom_vendor_001
version: "1.0"
name: "Phantom Vendor Fraud"
difficulty_base: 2
duration_target_minutes: 20
languages: [en, es]

# Metadata for UI
metadata:
  description: "An employee creates a shell company to receive fraudulent payments"
  crime_type: vendor_fraud
  complexity: single_culprit
  tags: [procurement, invoices, shell_company]

# Who's involved
roles:
  insider:
    type: employee
    departments: [procurement, operations]
    seniority: [mid, senior]
    required_access: [vendor_approval, purchase_orders]
    is_culprit: true
    personality_hints:
      - "Appears competent and trusted"
      - "Has been with company 2+ years"

  phantom_vendor:
    type: organization
    attributes:
      recently_registered: true
      single_service: true
      address_link: insider.personal_address  # KEY EVIDENCE
      vague_business: true

  contact_person:
    type: employee
    departments: [finance]
    relationship_to_insider: [reports_to, colleagues]
    is_culprit: false
    role_in_story: "The person who hired you (your client contact)"

  # Supporting cast (noise)
  supporting_employees:
    count: 3-5
    departments: [hr, it, marketing, sales]
    is_culprit: false

# The evidence chain that proves the crime
evidence_chain:
  - id: vendor_registration
    type: form
    contains: [phantom_vendor.address, insider.connection_hint]
    suspicion_level: high
    required_for_solution: true
    discovery_hint: "Compare addresses carefully"

  - id: fake_invoices
    type: invoice
    count: 3-6
    properties:
      amounts:
        min: 3000
        max: 14999  # Under approval threshold
        pattern: "varied but suspicious"
      descriptions: vague_consulting
      approved_by: insider
    required_for_solution: true
    discovery_hint: "Who approves these?"

  - id: approval_log
    type: spreadsheet
    contains: [approval_patterns]
    suspicion_level: high
    required_for_solution: true
    discovery_hint: "Look for patterns"

  - id: payment_records
    type: bank_statement
    contains: [phantom_vendor.account, payment_dates]
    required_for_solution: true

  - id: suspicious_communication
    type: email
    between: [insider, phantom_vendor.contact]
    tone: suspiciously_familiar
    count: 2-4
    required_for_solution: false  # Supporting, not required

# Background noise (realistic but irrelevant)
noise_documents:
  emails:
    topics: [meetings, projects, hr_announcements, casual_chat, complaints]
    count: 10-15

  invoices:
    vendors: legitimate_pool
    count: 5-8
    properties:
      detailed_line_items: true
      professional_tone: true

  chats:
    channels: [general, random, team]
    count: 3-5

  forms:
    types: [expense_report, time_off_request, it_ticket]
    count: 2-4

# Deliberate misdirection
red_herrings:
  - id: suspicious_expense
    type: expense_report
    owner: random_employee
    appearance:
      - "High amounts"
      - "Vague descriptions"
      - "Frequent submissions"
    reality: legitimate
    explanation_documents:
      - attached_receipts
      - calendar_entry_showing_conference
    why_innocent: "Conference travel is expensive but documented"
    count: 1-2

  - id: angry_employee
    type: email_thread
    tone: confrontational
    topic: budget_complaints
    participants: [random_employee, manager]
    reality: normal_corporate_politics
    why_innocent: "Disagreement about budget, no financial motive"
    count: 1

  - id: it_deletion_request
    type: it_ticket
    appearance: "Employee asking to delete files"
    reality: standard_offboarding
    why_innocent: "Employee leaving company, following procedure"
    count: 1

# Ground truth for scoring
ground_truth:
  culprits: [insider]
  accomplices: []
  mechanism: |
    {insider.name} created a shell company called "{phantom_vendor.name}"
    using {insider.personal_address_relation}'s address. As {insider.role},
    they had authority to both register new vendors and approve invoices
    up to ${approval_threshold}. They submitted fake invoices for vague
    "consulting services" and approved them personally.
  total_amount: sum(fake_invoices.amounts)
  timeline:
    - event: "Shell company registered"
      relative_date: "T-60 days"
      documents: [vendor_registration]
    - event: "First fake invoice submitted"
      relative_date: "T-45 days"
      documents: [fake_invoices[0]]
    - event: "Pattern continues monthly"
      relative_date: "T-45 to T-5 days"
      documents: [fake_invoices[1:], approval_log]
    - event: "Investigation begins"
      relative_date: "T-0"
      documents: [contact_briefing]
  key_evidence:
    primary:
      - id: address_match
        description: "Vendor address matches insider's personal connection"
        documents: [vendor_registration, hr_record]
      - id: approval_pattern
        description: "Insider approved 100% of this vendor's invoices"
        documents: [approval_log]
    supporting:
      - id: familiar_tone
        description: "Email communication is unusually informal"
        documents: [suspicious_communication]
      - id: vague_descriptions
        description: "Invoice descriptions lack specific deliverables"
        documents: [fake_invoices]

# Pre-written hints at each tier
hints:
  tier_0:
    - "Have you compared all vendor registration forms?"
    - "Pay attention to document dates and patterns"
    - "Some documents are more relevant than others"
  tier_1:
    - "One of the vendors seems to have appeared recently"
    - "Check who approves invoices from each vendor"
    - "Not all vendors have the same level of documentation"
  tier_2:
    - "Look closely at the {phantom_vendor.name} registration"
    - "Invoice #{evidence.fake_invoices[0].id} has an unusual approval pattern"
    - "Compare how different vendors describe their services"
  tier_3:
    - "Compare the address on {phantom_vendor.name}'s form with other records"
    - "Notice who exclusively handles {phantom_vendor.name} communications"
    - "The approval log shows an unusual pattern for one vendor"
  tier_4:
    - "The address {phantom_vendor.address} matches {insider.name}'s personal records"
    - "{insider.name} is the only person who ever communicated with {phantom_vendor.name}"
    - "{insider.name} approved all {count(fake_invoices)} invoices from {phantom_vendor.name}"

# Scoring rubric specific to this template
scoring:
  culprit:
    correct: 35
    with_wrong_accomplice: 25
    wrong: 0
  mechanism:
    all_elements: 25
    partial: 10-20
    vague: 5
  evidence:
    address_match: 10
    approval_pattern: 10
    supporting_evidence: 5
    irrelevant_cited: -2
```

### 2.2. Available Templates

| Template ID                  | Name                | Difficulty | Culprits | Description                    |
| ---------------------------- | ------------------- | ---------- | -------- | ------------------------------ |
| `phantom_vendor_001`         | Phantom Vendor      | 2          | 1        | Employee creates fake vendor   |
| `expense_fraud_001`          | Expense Padding     | 1          | 1        | Employee inflates expenses     |
| `expense_fraud_002`          | Expense Fabrication | 2          | 1        | Employee creates fake expenses |
| `inventory_shrink_001`       | Inventory Shrinkage | 3          | 1-2      | Warehouse theft with cover-up  |
| `data_leak_001`              | Data Exfiltration   | 3          | 1        | Employee selling data          |
| `kickback_001`               | Vendor Kickback     | 4          | 2        | Procurement + vendor collusion |
| `payroll_ghost_001`          | Ghost Employee      | 2          | 1        | Fake employee on payroll       |
| `financial_manipulation_001` | Books Cooking       | 5          | 2-3      | Financial statement fraud      |

---

## 3. Document Templates

### 3.1. Email Template

```yaml
document_type: email
template_id: email_standard

structure:
  headers:
    from: '{sender.email}'
    to: '{recipient.email}'
    cc: '{cc_list}' # optional
    date: '{date} {time}'
    subject: '{subject}'

  body:
    greeting: '{greeting}'
    content: '{main_content}'
    closing: '{closing}'
    signature: |
      {sender.name}
      {sender.role} | {company.name}

variants:
  formal:
    greeting_options:
      en: ['Dear {recipient.first_name},', 'Hello {recipient.first_name},']
      es: ['Estimado/a {recipient.first_name}:', 'Buenos días,']
    closing_options:
      en: ['Best regards,', 'Sincerely,', 'Thank you,']
      es: ['Un saludo,', 'Atentamente,', 'Gracias,']

  informal:
    greeting_options:
      en: ['Hey {recipient.first_name},', 'Hi!', '{recipient.first_name} -']
      es: ['Hola {recipient.first_name},', 'Buenas,', 'Ey,']
    closing_options:
      en: ['Thanks!', 'Cheers,', '- {sender.first_name}', 'Talk soon,']
      es: ['Gracias!', 'Saludos,', 'Hablamos,']

  suspicious_familiar: # For culprit communication
    greeting_options:
      en: ['Hi there,', 'Hey,', '']
      es: ['Hola,', 'Buenas,', '']
    closing_options:
      en: ['Talk soon,', '- {sender.first_initial}', 'Cheers', 'Let me know']
      es: ['Hablamos,', '- {sender.first_initial}', 'Ya me dices']
    red_flags:
      - 'First name only or initials in signature'
      - 'Missing formal company signature block'
      - 'Casual tone for vendor communication'

naturalization_prompt: |
  Write an email with the following characteristics:
  - From: {sender.name} ({sender.role}) to {recipient.name}
  - Tone: {tone}
  - Topic: {topic}
  - Key points to include: {key_points}
  - Language: {language}

  The email should sound natural and realistic for a {company.type} company.
  {additional_instructions}

  Required elements that MUST appear exactly as written:
  {required_elements}
```

### 3.2. Invoice Template

```yaml
document_type: invoice
template_id: invoice_standard

structure:
  header:
    vendor_info:
      name: '{vendor.name}'
      address: '{vendor.address}'
      tax_id: '{vendor.tax_id}'
    invoice_meta:
      number: 'INV-{year}-{sequential_id}'
      date: '{invoice_date}'
      due_date: '{due_date}'

  bill_to:
    company: '{client.name}'
    address: '{client.address}'
    attention: '{attention_person}' # optional

  line_items:
    - description: '{item_description}'
      quantity: '{quantity}'
      unit_price: '{unit_price}'
      amount: '{line_total}'

  totals:
    subtotal: '{subtotal}'
    tax: '{tax_amount}' # optional
    total: '{total_due}'

  payment_info:
    terms: '{payment_terms}'
    bank: '{bank_name}'
    account: '****{last_4_digits}'
    reference: '{payment_reference}'

variants:
  legitimate:
    line_items_style: 'detailed'
    examples:
      - 'Office supplies - 50x ballpoint pens, 20x notebooks, 10x staplers'
      - 'IT Support - March 2024 - 40 hours @ $75/hr - Ticket #INC-2024-0892'
      - 'Catering - Q1 All-Hands Meeting - 150 attendees - Menu: lunch buffet'
    characteristics:
      - 'Specific quantities and items'
      - 'Reference numbers when applicable'
      - 'Clear deliverables'

  suspicious:
    line_items_style: 'vague'
    examples:
      - 'Strategic Consulting Services'
      - 'Market Analysis Phase 1'
      - 'Process Optimization Review'
      - 'Advisory Services - Q1'
    characteristics:
      - 'No specific deliverables'
      - 'Round numbers or just under thresholds'
      - 'Generic business jargon'
    red_flags:
      - 'Amount just under approval threshold (e.g., $14,999)'
      - 'Vague descriptions without deliverables'
      - 'No reference to specific projects or outcomes'

amount_patterns:
  legitimate:
    - 'Exact amounts with cents ($4,521.37)'
    - 'Itemized totals that add up'
    - 'Consistent with market rates'
  suspicious:
    - 'Round numbers ($5,000, $10,000)'
    - 'Just under thresholds ($14,999, $4,999)'
    - 'Amounts that vary but follow pattern'
```

### 3.3. Chat/IM Template

```yaml
document_type: chat
template_id: slack_channel

structure:
  metadata:
    channel: '#{channel_name}'
    date: '{date}'
    participants: '{participant_list}'

  messages:
    - timestamp: '{time}'
      author: '{author.name}'
      content: '{message_content}'
      reactions: '{reactions}' # optional

style_guide:
  general:
    - 'Short messages, often fragments'
    - 'Emoji usage varies by culture and person'
    - 'Typos and autocorrect errors are realistic'
    - 'Multiple messages instead of one long one'

  channels:
    general:
      topics: ['announcements', 'casual', 'questions']
      tone: 'mixed, mostly professional'
    random:
      topics: ['jokes', 'off-topic', 'social']
      tone: 'casual, playful'
    team_specific:
      topics: ['work updates', 'blockers', 'coordination']
      tone: 'professional but direct'

example_realistic_thread:
  - 'hey has anyone seen the Q3 projections?'
  - 'Sarah had them last I think'
  - '@sarah ^^'
  - 'checking... one sec'
  - 'found it - in the Finance shared drive under /Reports/Q3'
  - '🙏'
  - 'np!'
```

### 3.4. Form/Record Template

```yaml
document_type: form
template_id: vendor_registration

structure:
  header:
    form_id: 'VS-{year}-{sequential_id}'
    form_title: 'New Vendor Registration Form'
    company: '{company.name}'

  sections:
    vendor_info:
      company_name: '{vendor.name}'
      business_type: '{business_type}'
      tax_id: '{tax_id}'

    contact:
      primary_contact: '{contact.name}'
      email: '{contact.email}'
      phone: '{contact.phone}'

    address:
      street: '{address.street}'
      city: '{address.city}'
      state: '{address.state}'
      zip: '{address.zip}'

    banking:
      bank_name: '{bank.name}'
      account_number: '****{account.last_4}'
      routing: '{routing_number}'

    approvals:
      submitted_by: '{submitter.name}'
      submitted_date: '{submit_date}'
      procurement_review: '{procurement_reviewer.name} ({review_date})'
      finance_review: '{finance_reviewer.name} ({review_date})' # or "WAIVED"
      status: 'APPROVED'
      approval_date: '{approval_date}'

red_flags_to_generate:
  phantom_vendor:
    - 'Submitted by same person who does procurement review'
    - 'Finance review waived (under threshold)'
    - 'Address is residential'
    - 'Generic business type (Consulting Services)'
    - 'Recently formed (registration date close to first invoice)'
```

---

## 4. Timeline Generation

### 4.1. Timeline Architecture

```
CRIME TIMELINE (Required)          NOISE TIMELINE (Generated)
─────────────────────────          ────────────────────────────
T-60: Shell company formed         T-58: HR announcement
T-45: First fake invoice           T-52: Team meeting
T-30: Second fake invoice          T-40: IT ticket
T-15: Third fake invoice           T-35: Expense report (red herring)
T-5:  Fourth fake invoice          T-28: Slack discussion
T-0:  Investigation starts         T-20: Budget email thread
                                   T-10: Casual emails
                                   T-3:  Another IT ticket

        ↓ INTERLEAVE ↓

FINAL CHRONOLOGICAL TIMELINE
────────────────────────────
T-60: Shell company formed ⭐
T-58: HR announcement
T-52: Team meeting
T-45: First fake invoice ⭐
T-40: IT ticket
T-35: Expense report (red herring) 🔴
T-30: Second fake invoice ⭐
T-28: Slack discussion
T-20: Budget email thread
T-15: Third fake invoice ⭐
T-10: Casual emails
T-5:  Fourth fake invoice ⭐
T-3:  IT ticket (red herring) 🔴
T-0:  Investigation starts
```

### 4.2. Timeline Generation Algorithm

```python
class TimelineGenerator:
    def __init__(self, template: CaseTemplate, config: GenerationConfig):
        self.template = template
        self.config = config
        self.base_date = self.calculate_base_date()

    def generate(self) -> Timeline:
        # 1. Generate crime timeline (fixed structure from template)
        crime_events = self.generate_crime_events()

        # 2. Generate noise timeline (random but realistic)
        noise_events = self.generate_noise_events()

        # 3. Generate red herring timeline (positioned strategically)
        red_herring_events = self.generate_red_herring_events()

        # 4. Merge and sort
        all_events = crime_events + noise_events + red_herring_events
        all_events.sort(key=lambda e: e.date)

        # 5. Validate no conflicts
        self.validate_timeline(all_events)

        return Timeline(events=all_events)

    def generate_crime_events(self) -> list[TimelineEvent]:
        """Generate events from template's ground_truth.timeline"""
        events = []

        for template_event in self.template.ground_truth.timeline:
            # Convert relative date to absolute
            absolute_date = self.relative_to_absolute(template_event.relative_date)

            # Add some realistic variance (±1-2 days)
            if self.config.add_date_variance:
                absolute_date = self.add_variance(absolute_date, max_days=2)

            events.append(TimelineEvent(
                id=template_event.id,
                date=absolute_date,
                event_type="crime",
                description=template_event.event,
                documents=template_event.documents,
                is_key=True
            ))

        return events

    def generate_noise_events(self) -> list[TimelineEvent]:
        """Generate realistic business noise"""
        events = []
        noise_spec = self.template.noise_documents

        # Distribute noise events across the timeline
        timeline_span = self.get_timeline_span()

        for doc_type, spec in noise_spec.items():
            count = self.random_in_range(spec.count)

            for i in range(count):
                # Random date within span, avoiding crime event dates
                date = self.random_date_avoiding(
                    span=timeline_span,
                    avoid=self.crime_dates,
                    buffer_days=1
                )

                topic = random.choice(spec.topics)

                events.append(TimelineEvent(
                    id=f"noise_{doc_type}_{i}",
                    date=date,
                    event_type="noise",
                    description=f"{doc_type}: {topic}",
                    documents=[f"{doc_type}_{i}"],
                    is_key=False
                ))

        return events

    def generate_red_herring_events(self) -> list[TimelineEvent]:
        """Position red herrings strategically"""
        events = []

        for red_herring in self.template.red_herrings:
            # Red herrings should appear BEFORE or DURING the crime
            # to create suspicion, not after

            if red_herring.timing == "before_crime":
                date_range = (self.timeline_start, self.first_crime_event)
            elif red_herring.timing == "during_crime":
                date_range = (self.first_crime_event, self.last_crime_event)
            else:
                date_range = (self.timeline_start, self.investigation_start)

            date = self.random_date_in_range(date_range)

            events.append(TimelineEvent(
                id=red_herring.id,
                date=date,
                event_type="red_herring",
                description=red_herring.appearance,
                documents=red_herring.documents,
                is_key=False,
                red_herring_resolution=red_herring.explanation_documents
            ))

        return events
```

### 4.3. Date Consistency Rules

| Rule                            | Description                            | Example                               |
| ------------------------------- | -------------------------------------- | ------------------------------------- |
| **Invoice before payment**      | Invoice date must precede payment date | INV date: Mar 5 → Payment: Mar 22     |
| **Registration before invoice** | Vendor must exist before first invoice | Vendor reg: Jan 20 → First INV: Feb 5 |
| **Business days only**          | Invoices/approvals on weekdays         | Skip Sat/Sun                          |
| **Email threads chronological** | Replies after original                 | Original: 9am → Reply: 2pm            |
| **Realistic gaps**              | Processing takes time                  | Submit → Approve: 1-5 days            |

---

## 5. Consistency Management

### 5.1. Entity Registry

```python
class EntityRegistry:
    """Central registry ensuring consistency across all documents"""

    def __init__(self):
        self.entities: dict[str, Entity] = {}
        self.name_variations: dict[str, list[str]] = {}
        self.relationships: list[Relationship] = []

    def register(self, entity: Entity) -> str:
        """Register entity and generate consistent variations"""
        entity_id = str(uuid4())
        self.entities[entity_id] = entity

        # Generate name variations
        if entity.type == "person":
            self.name_variations[entity_id] = self.generate_person_variations(entity)
        elif entity.type == "organization":
            self.name_variations[entity_id] = self.generate_org_variations(entity)

        return entity_id

    def generate_person_variations(self, person: Person) -> list[str]:
        """Generate consistent name variations"""
        first = person.first_name
        last = person.last_name

        return [
            f"{first} {last}",           # Full name
            f"{first}",                   # First name only
            f"{last}",                    # Last name only
            f"{first[0]}. {last}",        # Initial + last
            f"{first.lower()}",           # Casual first name
            f"{first[0].lower()}",        # Just initial (for signatures)
        ]

    def get_variation(self, entity_id: str, context: str) -> str:
        """Get appropriate name variation for context"""
        variations = self.name_variations[entity_id]
        entity = self.entities[entity_id]

        if context == "formal_document":
            return variations[0]  # Full name
        elif context == "email_greeting":
            return variations[1]  # First name
        elif context == "casual_signature":
            return variations[5]  # Initial
        elif context == "email_from":
            return f"{variations[0]} <{entity.email}>"
        else:
            return variations[0]

    def validate_consistency(self, documents: list[Document]) -> list[str]:
        """Check all documents use consistent entity references"""
        errors = []

        for doc in documents:
            for mention in doc.entity_mentions:
                entity = self.entities.get(mention.entity_id)
                if not entity:
                    errors.append(f"Unknown entity {mention.entity_id} in {doc.id}")
                    continue

                valid_variations = self.name_variations[mention.entity_id]
                if mention.text not in valid_variations:
                    errors.append(
                        f"Invalid name variation '{mention.text}' for {entity.name} "
                        f"in {doc.id}. Valid: {valid_variations}"
                    )

        return errors
```

### 5.2. Amount Consistency

```python
class AmountTracker:
    """Track financial amounts for consistency"""

    def __init__(self):
        self.invoices: dict[str, Decimal] = {}
        self.payments: dict[str, Decimal] = {}
        self.totals_by_vendor: dict[str, Decimal] = {}

    def register_invoice(self, invoice_id: str, vendor_id: str, amount: Decimal):
        self.invoices[invoice_id] = amount
        self.totals_by_vendor[vendor_id] = (
            self.totals_by_vendor.get(vendor_id, Decimal(0)) + amount
        )

    def register_payment(self, payment_id: str, invoice_ids: list[str], amount: Decimal):
        expected = sum(self.invoices[inv_id] for inv_id in invoice_ids)
        if amount != expected:
            raise ConsistencyError(
                f"Payment {payment_id} amount {amount} doesn't match "
                f"invoice total {expected}"
            )
        self.payments[payment_id] = amount

    def get_vendor_total(self, vendor_id: str) -> Decimal:
        return self.totals_by_vendor.get(vendor_id, Decimal(0))

    def validate(self) -> list[str]:
        errors = []

        # All invoices should have payments
        paid_invoices = set()
        for payment_id, invoice_ids in self.payment_invoices.items():
            paid_invoices.update(invoice_ids)

        unpaid = set(self.invoices.keys()) - paid_invoices
        if unpaid:
            errors.append(f"Unpaid invoices: {unpaid}")

        return errors
```

### 5.3. Cross-Reference Validation

```python
class CrossReferenceValidator:
    """Ensure documents reference each other correctly"""

    def validate(self, case: GeneratedCase) -> list[str]:
        errors = []

        # Email replies reference correct original
        errors.extend(self.validate_email_threads(case))

        # Invoice numbers match across documents
        errors.extend(self.validate_invoice_references(case))

        # Dates are internally consistent
        errors.extend(self.validate_date_references(case))

        # Amounts match across documents
        errors.extend(self.validate_amount_references(case))

        return errors

    def validate_email_threads(self, case: GeneratedCase) -> list[str]:
        errors = []
        emails = [d for d in case.documents if d.type == "email"]

        for email in emails:
            if email.in_reply_to:
                original = self.find_email(emails, email.in_reply_to)
                if not original:
                    errors.append(f"Email {email.id} replies to non-existent {email.in_reply_to}")
                elif email.date <= original.date:
                    errors.append(f"Reply {email.id} dated before original {original.id}")

        return errors
```

---

## 6. Text Naturalization

### 6.1. Naturalization Strategy

```
SKELETON (Deterministic)              NATURALIZED (LLM)
────────────────────────              ─────────────────
{                                     "Hi there,
  type: "email",
  from: "marcus.chen@...",            Got the invoice, looks good.
  to: "invoices@sunshine...",         Same arrangement as before —
  tone: "suspicious_familiar",        I'll push it through by EOD.
  key_points: [
    "acknowledge invoice",            Let me know about next month.
    "mention 'arrangement'",          Maybe we can bump it up since
    "reference next month",           Q2 budget just got approved?
    "suggest increasing amount"
  ],                                  Talk soon,
  required_phrases: [                 M"
    "same arrangement"
  ]
}
```

### 6.2. Naturalization Prompts

```python
NATURALIZATION_PROMPTS = {
    "email_formal": """
Write a professional business email with these specifications:

CONTEXT:
- From: {from_name} ({from_role}) at {company}
- To: {to_name} ({to_role})
- Subject: {subject}
- Date context: {date_context}

CONTENT REQUIREMENTS:
- Main purpose: {purpose}
- Key points to convey: {key_points}
- Tone: {tone} (professional, formal)

MUST INCLUDE (exactly or paraphrased):
{required_elements}

MUST NOT INCLUDE:
- References to events not in the case
- Names of people not in the entity list
- Specific amounts unless specified

OUTPUT FORMAT:
Write only the email body (greeting through signature).
""",

    "email_suspicious": """
Write an email that appears professional but has subtle red flags.

CONTEXT:
- From: {from_name} to {to_name}
- These two have a secret relationship (the sender controls the recipient's company)
- The email should seem normal at first glance but have tells

SUBTLE RED FLAGS TO INCLUDE:
- Overly familiar tone for a vendor relationship
- Vague references to "arrangements" or "the usual"
- Casual sign-off (initial only, no title)
- Missing standard business formalities

CONTENT:
{content_requirements}

MUST INCLUDE (exactly):
{required_phrases}

The reader should feel "something's off" but not be certain why.
""",

    "invoice_legitimate": """
Generate line items for a legitimate business invoice.

VENDOR TYPE: {vendor_type}
TOTAL AMOUNT: {amount}
SERVICE PERIOD: {period}

Requirements:
- Specific, detailed descriptions
- Quantities and unit prices that add up correctly
- Reference numbers where appropriate
- Professional formatting

Example good descriptions:
- "IT Support - March 2024 - Ticket #INC-2024-0892 through #0901 - 32 hours @ $85/hr"
- "Office Supplies: 50x Pilot G2 pens, 20x Legal pads, 10x 3-ring binders"
""",

    "invoice_suspicious": """
Generate line items for an invoice that should raise red flags.

VENDOR: {vendor_name} (this is actually a shell company)
TOTAL AMOUNT: ${amount}
SERVICE PERIOD: {period}

Requirements:
- Vague, generic descriptions
- No specific deliverables
- Business jargon that sounds important but means nothing
- Amount should be just under ${threshold} (the approval limit)

Example suspicious descriptions:
- "Strategic Consulting Services"
- "Market Analysis Phase 1"
- "Process Optimization Advisory"
- "Business Development Support"

Do NOT include:
- Specific quantities
- Hourly rates
- Reference numbers
- Measurable deliverables
""",

    "chat_casual": """
Generate a realistic Slack/chat conversation.

CHANNEL: #{channel}
PARTICIPANTS: {participants}
TOPIC: {topic}
TONE: {tone}

STYLE REQUIREMENTS:
- Short messages (1-2 sentences each)
- Some use emoji sparingly
- Occasional typos are realistic
- People interrupt and go off-topic
- Use @mentions naturally

{additional_context}

FORMAT:
[HH:MM] username: message
"""
}
```

### 6.3. Naturalization Pipeline

```python
class TextNaturalizer:
    def __init__(self, llm: LLMProvider, config: NaturalizationConfig):
        self.llm = llm
        self.config = config
        self.entity_registry = None  # Set during generation

    async def naturalize_document(
        self,
        skeleton: DocumentSkeleton,
        context: CaseContext
    ) -> str:
        # 1. Select appropriate prompt template
        prompt_key = f"{skeleton.doc_type}_{skeleton.variant}"
        prompt_template = NATURALIZATION_PROMPTS.get(
            prompt_key,
            NATURALIZATION_PROMPTS["generic"]
        )

        # 2. Fill in prompt variables
        prompt = prompt_template.format(
            **skeleton.to_prompt_vars(),
            **context.to_prompt_vars()
        )

        # 3. Add consistency instructions
        prompt += self.get_consistency_instructions(skeleton)

        # 4. Generate
        response = await self.llm.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000
        )

        # 5. Validate output
        text = response.content
        validation = self.validate_output(text, skeleton)

        if not validation.valid:
            # Retry with more explicit instructions
            text = await self.retry_with_fixes(skeleton, text, validation.errors)

        # 6. Post-process
        text = self.post_process(text, skeleton)

        return text

    def get_consistency_instructions(self, skeleton: DocumentSkeleton) -> str:
        """Add instructions to maintain consistency"""
        instructions = [
            "\n\nCONSISTENCY REQUIREMENTS:",
            f"- Use exactly these names: {skeleton.entity_names}",
            f"- Reference date: {skeleton.date}",
        ]

        if skeleton.required_phrases:
            instructions.append(
                f"- MUST include these exact phrases: {skeleton.required_phrases}"
            )

        if skeleton.forbidden_phrases:
            instructions.append(
                f"- MUST NOT include: {skeleton.forbidden_phrases}"
            )

        return "\n".join(instructions)

    def validate_output(self, text: str, skeleton: DocumentSkeleton) -> ValidationResult:
        """Validate generated text meets requirements"""
        errors = []

        # Check required phrases
        for phrase in skeleton.required_phrases:
            if phrase.lower() not in text.lower():
                errors.append(f"Missing required phrase: '{phrase}'")

        # Check forbidden phrases
        for phrase in skeleton.forbidden_phrases:
            if phrase.lower() in text.lower():
                errors.append(f"Contains forbidden phrase: '{phrase}'")

        # Check entity names are valid
        for name in self.extract_names(text):
            if not self.entity_registry.is_valid_name(name):
                errors.append(f"Unknown entity name: '{name}'")

        # Check amounts if present
        for amount in self.extract_amounts(text):
            if amount not in skeleton.valid_amounts:
                errors.append(f"Unexpected amount: {amount}")

        return ValidationResult(valid=len(errors) == 0, errors=errors)
```

---

## 7. Red Herring Design

### 7.1. Red Herring Principles

| Principle               | Description                              | Example                             |
| ----------------------- | ---------------------------------------- | ----------------------------------- |
| **Plausible suspicion** | Must genuinely look suspicious           | High expenses, vague descriptions   |
| **Clear resolution**    | Innocent explanation exists in documents | Attached receipts, calendar entries |
| **Partial overlap**     | Shares characteristics with real crime   | Similar amounts, same time period   |
| **Different mechanism** | Doesn't fit the crime pattern            | Wrong department, wrong access      |
| **Fair to player**      | Resolution is findable, not hidden       | Explanation in accessible document  |

### 7.2. Red Herring Types

```yaml
red_herring_types:
  suspicious_expense:
    appearance:
      - 'High amounts in short period'
      - 'Vague descriptions'
      - 'Frequent submissions'
    resolution_type: 'legitimate_documentation'
    resolution_documents:
      - 'Itemized receipts'
      - 'Calendar showing conference dates'
      - 'Manager approval email'
    why_players_suspect: 'Looks like expense padding'
    why_innocent: 'Conference travel is expensive but documented'
    difficulty_to_resolve: 'easy' # Resolution is clear

  angry_employee:
    appearance:
      - 'Heated email thread about money'
      - 'Complaints about budget'
      - "Threats to 'do something about it'"
    resolution_type: 'context_explains'
    resolution_documents:
      - 'Earlier emails showing ongoing dispute'
      - 'Meeting notes showing resolution'
    why_players_suspect: 'Motive + opportunity'
    why_innocent: 'Disagreement resolved, no financial access'
    difficulty_to_resolve: 'medium'

  suspicious_access:
    appearance:
      - 'IT ticket asking for elevated permissions'
      - 'Access to financial systems'
      - 'Recent request'
    resolution_type: 'legitimate_business_need'
    resolution_documents:
      - 'Project documentation requiring access'
      - 'Manager approval in ticket'
    why_players_suspect: 'Gaining access before crime'
    why_innocent: 'New project legitimately requires access'
    difficulty_to_resolve: 'medium'

  departing_employee:
    appearance:
      - 'Request to delete files'
      - 'Downloading documents'
      - 'Timing suspicious'
    resolution_type: 'standard_procedure'
    resolution_documents:
      - 'HR offboarding checklist'
      - 'IT confirmation of standard process'
    why_players_suspect: 'Covering tracks'
    why_innocent: 'Standard offboarding procedure'
    difficulty_to_resolve: 'easy'

  external_relationship:
    appearance:
      - 'Personal connection to vendor'
      - 'Lunch meetings'
      - 'Friendly emails'
    resolution_type: 'disclosed_relationship'
    resolution_documents:
      - 'Conflict of interest disclosure form'
      - 'HR approval of relationship'
    why_players_suspect: 'Hidden conflict of interest'
    why_innocent: 'Relationship disclosed and approved'
    difficulty_to_resolve: 'hard' # Must find disclosure form
```

### 7.3. Red Herring Placement Strategy

```python
class RedHerringPlacer:
    """Strategically place red herrings for maximum effect"""

    def place_red_herrings(
        self,
        crime_timeline: Timeline,
        red_herrings: list[RedHerring]
    ) -> list[PlacedRedHerring]:

        placed = []

        for rh in red_herrings:
            # Strategy: Place red herrings where they create most suspicion

            if rh.type == "suspicious_expense":
                # Place during or slightly before crime period
                # So player might think this IS the crime
                date = self.random_date_during_crime(crime_timeline)

            elif rh.type == "angry_employee":
                # Place before crime, so player thinks it's motive
                date = self.random_date_before_crime(crime_timeline)

            elif rh.type == "suspicious_access":
                # Place just before first crime event
                date = crime_timeline.first_crime_event - timedelta(days=random.randint(5, 15))

            elif rh.type == "departing_employee":
                # Place near end, when player is looking for cover-up
                date = self.random_date_near_investigation(crime_timeline)

            # Ensure resolution documents are dated appropriately
            resolution_date = self.calculate_resolution_date(rh, date)

            placed.append(PlacedRedHerring(
                red_herring=rh,
                suspicious_document_date=date,
                resolution_document_date=resolution_date
            ))

        return placed

    def validate_red_herring_fairness(self, placed: list[PlacedRedHerring]) -> list[str]:
        """Ensure red herrings are fair to players"""
        errors = []

        for prh in placed:
            # Resolution must be accessible
            if not prh.resolution_is_accessible:
                errors.append(f"Red herring {prh.id} resolution not accessible")

            # Resolution must come before or with suspicious content
            # (can't expect player to find resolution first)
            if prh.resolution_date > prh.suspicious_date + timedelta(days=30):
                errors.append(f"Red herring {prh.id} resolution too late")

            # Must be distinguishable from real crime
            if prh.overlap_with_crime > 0.8:
                errors.append(f"Red herring {prh.id} too similar to actual crime")

        return errors
```

---

## 8. Difficulty Calibration

### 8.1. Difficulty Factors

```python
@dataclass
class DifficultyFactors:
    """Factors that affect case difficulty"""

    # Document volume
    total_documents: int              # More docs = harder to find evidence
    noise_ratio: float                # % of irrelevant documents

    # Evidence clarity
    evidence_explicitness: float      # 1.0 = obvious, 0.0 = subtle
    required_connections: int         # How many dots to connect
    connection_directness: float      # 1.0 = A→B, 0.0 = A→B→C→D

    # Misdirection
    red_herring_count: int
    red_herring_quality: float        # How convincing they are

    # Complexity
    culprit_count: int
    timeline_importance: float        # How much dates matter
    cross_reference_required: bool    # Must compare multiple docs

    def calculate_score(self) -> float:
        """Calculate overall difficulty score (1-5)"""
        score = 1.0

        # Document volume contribution
        score += min(1.0, (self.total_documents - 15) / 40) * 0.5
        score += self.noise_ratio * 0.5

        # Evidence clarity (inverse)
        score += (1 - self.evidence_explicitness) * 1.0
        score += min(1.0, self.required_connections / 5) * 0.5
        score += (1 - self.connection_directness) * 0.5

        # Misdirection
        score += min(0.5, self.red_herring_count / 10)
        score += self.red_herring_quality * 0.5

        # Complexity
        score += (self.culprit_count - 1) * 0.5
        score += self.timeline_importance * 0.3
        score += 0.3 if self.cross_reference_required else 0

        return min(5.0, max(1.0, score))
```

### 8.2. Difficulty Presets

```yaml
difficulty_presets:
  level_1_intern:
    total_documents: [15, 20]
    noise_ratio: [0.2, 0.3]
    evidence_explicitness: [0.8, 1.0]
    required_connections: [2, 3]
    connection_directness: [0.9, 1.0]
    red_herring_count: [0, 1]
    red_herring_quality: [0.3, 0.5]
    culprit_count: 1
    timeline_importance: [0.0, 0.2]
    cross_reference_required: false

  level_2_associate:
    total_documents: [25, 30]
    noise_ratio: [0.3, 0.4]
    evidence_explicitness: [0.6, 0.8]
    required_connections: [3, 4]
    connection_directness: [0.7, 0.9]
    red_herring_count: [2, 3]
    red_herring_quality: [0.4, 0.6]
    culprit_count: 1
    timeline_importance: [0.2, 0.4]
    cross_reference_required: false

  level_3_senior:
    total_documents: [35, 45]
    noise_ratio: [0.4, 0.5]
    evidence_explicitness: [0.4, 0.6]
    required_connections: [4, 5]
    connection_directness: [0.5, 0.7]
    red_herring_count: [3, 5]
    red_herring_quality: [0.5, 0.7]
    culprit_count: [1, 2]
    timeline_importance: [0.4, 0.6]
    cross_reference_required: true

  level_4_manager:
    total_documents: [45, 55]
    noise_ratio: [0.5, 0.6]
    evidence_explicitness: [0.3, 0.5]
    required_connections: [5, 7]
    connection_directness: [0.3, 0.5]
    red_herring_count: [5, 7]
    red_herring_quality: [0.6, 0.8]
    culprit_count: 2
    timeline_importance: [0.6, 0.8]
    cross_reference_required: true

  level_5_partner:
    total_documents: [55, 70]
    noise_ratio: [0.6, 0.7]
    evidence_explicitness: [0.2, 0.4]
    required_connections: [7, 10]
    connection_directness: [0.2, 0.4]
    red_herring_count: [7, 10]
    red_herring_quality: [0.7, 0.9]
    culprit_count: [2, 3]
    timeline_importance: [0.8, 1.0]
    cross_reference_required: true
```

### 8.3. Dynamic Difficulty Adjustment

```python
class DifficultyCalibrator:
    """Adjust generated case to match target difficulty"""

    def calibrate(
        self,
        case: GeneratedCase,
        target_difficulty: int
    ) -> GeneratedCase:

        current = self.calculate_difficulty(case)
        target = float(target_difficulty)

        if abs(current - target) < 0.3:
            return case  # Close enough

        if current < target:
            # Make harder
            case = self.add_noise_documents(case)
            case = self.make_evidence_subtler(case)
            case = self.add_red_herrings(case)
        else:
            # Make easier
            case = self.remove_noise_documents(case)
            case = self.make_evidence_clearer(case)
            case = self.simplify_red_herrings(case)

        # Recurse until calibrated
        return self.calibrate(case, target_difficulty)

    def add_noise_documents(self, case: GeneratedCase) -> GeneratedCase:
        """Add more irrelevant but realistic documents"""
        noise_count = random.randint(3, 5)

        for _ in range(noise_count):
            doc_type = random.choice(["email", "chat", "form"])
            doc = self.noise_generator.generate(doc_type, case.context)
            case.documents.append(doc)

        return case

    def make_evidence_subtler(self, case: GeneratedCase) -> GeneratedCase:
        """Make key evidence less obvious"""
        for doc in case.key_evidence_documents:
            # Remove highlighting hints
            doc.evidence_hints = []

            # Add surrounding noise text
            doc.content = self.add_surrounding_noise(doc.content)

            # Make suspicious elements less explicit
            doc.content = self.soften_language(doc.content)

        return case
```

---

## 9. Error Handling & Regeneration

### 9.1. Error Types

```python
class GenerationError(Exception):
    """Base class for generation errors"""
    pass

class TemplateError(GenerationError):
    """Template is invalid or incomplete"""
    pass

class ConsistencyError(GenerationError):
    """Generated content has internal contradictions"""
    pass

class SolvabilityError(GenerationError):
    """Generated case cannot be solved"""
    pass

class NaturalizationError(GenerationError):
    """LLM failed to generate acceptable text"""
    pass

class ValidationError(GenerationError):
    """Case failed validation checks"""
    pass
```

### 9.2. Retry Strategy

```python
class GenerationRetryStrategy:
    """Handle failures gracefully"""

    MAX_RETRIES = 3

    async def generate_with_retry(
        self,
        template: CaseTemplate,
        config: GenerationConfig
    ) -> GeneratedCase:

        errors = []

        for attempt in range(self.MAX_RETRIES):
            try:
                # Vary the seed on retry
                if attempt > 0:
                    config.seed = self.new_seed()

                case = await self.generator.generate(template, config)

                # Validate
                validation = self.validator.validate(case)
                if not validation.valid:
                    raise ValidationError(validation.errors)

                return case

            except NaturalizationError as e:
                # LLM failed - retry with different prompt strategy
                errors.append(f"Attempt {attempt + 1}: Naturalization failed - {e}")
                self.adjust_naturalization_strategy()

            except ConsistencyError as e:
                # Consistency issue - regenerate with stricter checks
                errors.append(f"Attempt {attempt + 1}: Consistency error - {e}")
                config.strict_consistency = True

            except SolvabilityError as e:
                # Not solvable - adjust difficulty or add evidence
                errors.append(f"Attempt {attempt + 1}: Solvability error - {e}")
                self.adjust_for_solvability(template, e)

        # All retries failed
        raise GenerationError(
            f"Failed to generate case after {self.MAX_RETRIES} attempts. "
            f"Errors: {errors}"
        )

    def adjust_naturalization_strategy(self):
        """Change LLM settings for retry"""
        self.naturalizer.temperature *= 0.8  # More deterministic
        self.naturalizer.add_examples = True  # Add few-shot examples

    def adjust_for_solvability(self, template: CaseTemplate, error: SolvabilityError):
        """Modify template to improve solvability"""
        if "missing_evidence" in str(error):
            # Add more explicit evidence documents
            template.add_backup_evidence()
        elif "contradictions" in str(error):
            # Simplify timeline
            template.simplify_timeline()
```

### 9.3. Partial Regeneration

```python
class PartialRegenerator:
    """Regenerate only problematic parts of a case"""

    async def fix_document(
        self,
        case: GeneratedCase,
        doc_id: str,
        issue: str
    ) -> GeneratedCase:
        """Regenerate a single document"""

        doc = case.get_document(doc_id)
        skeleton = self.extract_skeleton(doc)

        # Add fix instructions
        skeleton.fix_instructions = issue

        # Regenerate just this document
        new_content = await self.naturalizer.naturalize_document(
            skeleton,
            case.context
        )

        # Replace in case
        doc.content = new_content

        # Re-validate case
        return case

    async def fix_consistency(
        self,
        case: GeneratedCase,
        errors: list[ConsistencyError]
    ) -> GeneratedCase:
        """Fix consistency issues without full regeneration"""

        for error in errors:
            if error.type == "name_mismatch":
                # Find and replace incorrect name
                case = self.fix_name_reference(case, error)

            elif error.type == "date_contradiction":
                # Adjust dates to be consistent
                case = self.fix_date_reference(case, error)

            elif error.type == "amount_mismatch":
                # Recalculate amounts
                case = self.fix_amount_reference(case, error)

        return case
```

---

## 10. Testing Templates

### 10.1. Template Test Suite

```python
class TemplateTestSuite:
    """Comprehensive tests for case templates"""

    async def test_template(self, template: CaseTemplate) -> TestResults:
        results = TestResults()

        # 1. Schema validation
        results.add(self.test_schema_valid(template))

        # 2. Generate multiple instances
        for i in range(5):
            seed = 1000 + i
            case = await self.generate_test_case(template, seed)

            # 3. Test each instance
            results.add(self.test_solvability(case))
            results.add(self.test_consistency(case))
            results.add(self.test_difficulty(case, template.difficulty_base))
            results.add(self.test_evidence_chain(case))
            results.add(self.test_red_herrings(case))
            results.add(self.test_hints_accuracy(case))

        # 4. Test reproducibility
        results.add(await self.test_reproducibility(template))

        # 5. Test both languages
        for lang in template.languages:
            results.add(await self.test_language(template, lang))

        return results

    def test_evidence_chain(self, case: GeneratedCase) -> TestResult:
        """Verify complete evidence chain exists"""

        # Get ground truth evidence requirements
        required = case.ground_truth.key_evidence.primary

        # Check each piece exists and is findable
        for evidence in required:
            # Evidence exists in documents
            found_in_docs = self.find_evidence_in_docs(evidence, case.documents)
            if not found_in_docs:
                return TestResult(
                    passed=False,
                    message=f"Evidence '{evidence.id}' not found in documents"
                )

            # Evidence is searchable
            search_results = self.simulate_search(evidence.description, case)
            if not search_results:
                return TestResult(
                    passed=False,
                    message=f"Evidence '{evidence.id}' not findable via search"
                )

        return TestResult(passed=True, message="Evidence chain complete")

    async def test_reproducibility(self, template: CaseTemplate) -> TestResult:
        """Same seed should produce same case"""

        seed = 12345

        case1 = await self.generate_test_case(template, seed)
        case2 = await self.generate_test_case(template, seed)

        # Compare key elements (not exact text due to LLM variance)
        if case1.entities != case2.entities:
            return TestResult(passed=False, message="Entities differ")

        if case1.timeline != case2.timeline:
            return TestResult(passed=False, message="Timeline differs")

        if len(case1.documents) != len(case2.documents):
            return TestResult(passed=False, message="Document count differs")

        return TestResult(passed=True, message="Reproducible")
```

### 10.2. Agent-Based Solvability Test

```python
class SolvabilityTester:
    """Use AI agent to verify case is solvable"""

    async def test_solvability(
        self,
        case: GeneratedCase,
        max_steps: int = 50
    ) -> SolvabilityResult:

        # Create agent with same tools as player
        agent = TestSolverAgent(
            tools=[
                SearchDocsTool(case.documents),
                GetDocTool(case.documents),
                ListEntitiesTool(case.entities),
            ],
            llm=self.llm
        )

        # Agent attempts to solve
        solution = await agent.solve(
            briefing=case.briefing,
            max_steps=max_steps
        )

        # Compare with ground truth
        correct_culprits = set(case.ground_truth.culprits)
        found_culprits = set(solution.culprits)

        culprit_match = correct_culprits == found_culprits
        mechanism_match = self.mechanism_similarity(
            solution.mechanism,
            case.ground_truth.mechanism
        ) > 0.7

        evidence_quality = self.evaluate_evidence(
            solution.evidence,
            case.ground_truth.key_evidence
        )

        return SolvabilityResult(
            solvable=culprit_match and mechanism_match,
            steps_taken=solution.steps,
            culprit_found=culprit_match,
            mechanism_found=mechanism_match,
            evidence_quality=evidence_quality,
            agent_reasoning=solution.reasoning
        )
```

---

## 11. Case Customization

_(This section remains largely the same as before, with the addition of:)_

### 11.1. Customization Validation

```python
class CustomizationValidator:
    """Validate user customization input"""

    BLOCKED_PATTERNS = [
        r'\b(fuck|shit|ass|damn|bitch)\b',
        r'\b(kill|murder|death|die)\b',
        r'\b(nazi|hitler|terrorist)\b',
        # ... more patterns
    ]

    BLOCKED_COMPANIES = [
        'google', 'apple', 'microsoft', 'amazon', 'meta', 'facebook',
        'openai', 'anthropic', 'tesla', 'nvidia',
        # ... more
    ]

    def validate(self, custom: CaseCustomization) -> ValidationResult:
        errors = []
        warnings = []

        # Check company name
        if custom.company_name:
            if self.matches_blocked(custom.company_name):
                errors.append("Company name contains inappropriate content")
            if self.matches_real_company(custom.company_name):
                warnings.append("Name similar to real company - disclaimer will be added")
            if len(custom.company_name) > 50:
                errors.append("Company name too long (max 50 characters)")

        # Check character names
        for role, name in (custom.character_names or {}).items():
            if self.matches_blocked(name):
                errors.append(f"Character name '{name}' contains inappropriate content")
            if len(name) > 50:
                errors.append(f"Character name '{name}' too long")
            if self.is_famous_person(name):
                warnings.append(f"'{name}' may be a real person - disclaimer added")

        # Check tone prompt
        if custom.tone_prompt:
            if len(custom.tone_prompt) > 500:
                errors.append("Tone prompt too long (max 500 characters)")
            if self.matches_blocked(custom.tone_prompt):
                errors.append("Tone prompt contains inappropriate content")
            if self.requests_harmful_content(custom.tone_prompt):
                errors.append("Tone prompt requests inappropriate content")

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
```

---

## 12. Localization

### 12.1. Language-Specific Generation

```python
class LocalizedGenerator:
    """Generate content in target language"""

    CULTURAL_SETTINGS = {
        "en": {
            "currency": "USD",
            "currency_symbol": "$",
            "date_format": "%m/%d/%Y",
            "name_generator": "en_US",
            "company_suffixes": ["Inc.", "LLC", "Corp.", "Co."],
            "formality": "first_name_common",
            "business_hours": "9-5",
        },
        "es": {
            "currency": "EUR",
            "currency_symbol": "€",
            "date_format": "%d/%m/%Y",
            "name_generator": "es_ES",
            "company_suffixes": ["S.A.", "S.L.", "S.L.U.", "S.A.U."],
            "formality": "usted_in_formal",
            "business_hours": "9-14, 17-20",
        }
    }

    def generate_for_language(
        self,
        template: CaseTemplate,
        language: str
    ) -> GeneratedCase:

        settings = self.CULTURAL_SETTINGS[language]

        # Configure Faker for language
        self.faker = Faker(settings["name_generator"])

        # Generate entities with appropriate names
        entities = self.generate_entities(template, settings)

        # Generate documents
        documents = self.generate_documents(template, entities, settings)

        # Naturalize in target language
        for doc in documents:
            doc.content = await self.naturalize(doc, language, settings)

        return GeneratedCase(entities=entities, documents=documents, language=language)

    def format_amount(self, amount: Decimal, settings: dict) -> str:
        """Format currency for locale"""
        symbol = settings["currency_symbol"]

        if settings["currency"] == "EUR":
            # European format: 1.234,56 €
            return f"{amount:,.2f} {symbol}".replace(",", "X").replace(".", ",").replace("X", ".")
        else:
            # US format: $1,234.56
            return f"{symbol}{amount:,.2f}"

    def format_date(self, date: datetime, settings: dict) -> str:
        """Format date for locale"""
        return date.strftime(settings["date_format"])
```

### 12.2. Translation Consistency

```python
class TranslationConsistency:
    """Ensure consistent terminology across languages"""

    TERM_TRANSLATIONS = {
        "invoice": {"en": "Invoice", "es": "Factura"},
        "expense_report": {"en": "Expense Report", "es": "Informe de Gastos"},
        "vendor": {"en": "Vendor", "es": "Proveedor"},
        "approval": {"en": "Approval", "es": "Aprobación"},
        "procurement": {"en": "Procurement", "es": "Compras"},
        "accounts_payable": {"en": "Accounts Payable", "es": "Cuentas por Pagar"},
        # ... more terms
    }

    def translate_term(self, term: str, target_language: str) -> str:
        """Get consistent translation for business term"""
        if term in self.TERM_TRANSLATIONS:
            return self.TERM_TRANSLATIONS[term][target_language]
        return term
```

---

## 13. Performance & Caching

### 13.1. Generation Performance

```python
class GenerationPerformance:
    """Optimize generation performance"""

    # Target times
    TARGETS = {
        "entity_generation": 0.5,      # seconds
        "timeline_generation": 0.3,
        "document_generation": 1.0,
        "naturalization_per_doc": 2.0,
        "validation": 0.5,
        "total_case": 30.0,            # 30 seconds max
    }

    async def generate_optimized(
        self,
        template: CaseTemplate,
        config: GenerationConfig
    ) -> GeneratedCase:

        # 1. Parallel entity generation
        entities = await self.generate_entities_parallel(template)

        # 2. Timeline (fast, deterministic)
        timeline = self.generate_timeline(template, entities)

        # 3. Document skeletons (fast, deterministic)
        skeletons = self.generate_skeletons(template, timeline, entities)

        # 4. Naturalization (slow, parallel)
        documents = await self.naturalize_parallel(skeletons)

        # 5. Validation (fast)
        self.validate(documents, template)

        return GeneratedCase(entities, documents, timeline)

    async def naturalize_parallel(
        self,
        skeletons: list[DocumentSkeleton]
    ) -> list[Document]:
        """Naturalize documents in parallel batches"""

        BATCH_SIZE = 5  # Limit concurrent LLM calls

        documents = []
        for batch in chunks(skeletons, BATCH_SIZE):
            batch_results = await asyncio.gather(*[
                self.naturalizer.naturalize(skeleton)
                for skeleton in batch
            ])
            documents.extend(batch_results)

        return documents
```

### 13.2. Caching Strategy

```python
class GenerationCache:
    """Cache generated content for reuse"""

    def __init__(self, redis: Redis):
        self.redis = redis
        self.ttl = 3600 * 24  # 24 hours

    async def get_or_generate(
        self,
        template_id: str,
        seed: int,
        language: str
    ) -> GeneratedCase:
        """Get from cache or generate"""

        cache_key = f"case:{template_id}:{seed}:{language}"

        # Check cache
        cached = await self.redis.get(cache_key)
        if cached:
            return GeneratedCase.from_json(cached)

        # Generate
        case = await self.generator.generate(template_id, seed, language)

        # Cache
        await self.redis.setex(
            cache_key,
            self.ttl,
            case.to_json()
        )

        return case

    async def warm_cache(self, template_id: str, count: int = 10):
        """Pre-generate cases for a template"""

        for seed in range(count):
            for language in ["en", "es"]:
                await self.get_or_generate(template_id, seed, language)
```

---

_Next: [Technical Architecture](./03_TECHNICAL_ARCHITECTURE.md)_
