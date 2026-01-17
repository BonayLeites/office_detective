# Game Design — Propuestas de Mejora

> Expansiones y mejoras propuestas para el documento de Game Design.

---

## 1. Tutorial y Onboarding

### 1.1. Filosofía

**"Aprender jugando, no leyendo"** — El tutorial debe ser un caso real simplificado, no una serie de popups explicativos.

### 1.2. Caso Tutorial: "The Missing Petty Cash"

Un caso ultra-simple (5-10 minutos) que introduce cada mecánica:

| Fase            | Mecánica enseñada   | Cómo se enseña                                                                           |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| **1. Briefing** | Leer contexto       | Briefing corto, Diana te explica que falta dinero de caja chica                          |
| **2. Inbox**    | Navegar documentos  | Solo 5 documentos, ARIA sugiere "¿Por qué no empiezas revisando el email más reciente?"  |
| **3. Viewer**   | Leer y detectar     | Un email tiene texto resaltado sutilmente (enseña qué buscar)                            |
| **4. Pinning**  | Añadir al board     | Popup contextual: "Esto parece importante. Pulsa 📌 para añadirlo a tu tablero"          |
| **5. ARIA**     | Preguntar con citas | ARIA inicia conversación: "He notado algo en el recibo #3. ¿Quieres que te lo explique?" |
| **6. Board**    | Conectar evidencia  | Solo 3 nodos posibles, conexión obvia (Empleado → Recibo falso → Fecha)                  |
| **7. Submit**   | Entregar informe    | Formulario pre-rellenado parcialmente, solo completas el culpable                        |

### 1.3. Asistencia Progresiva

```
Caso 1 (Tutorial):    ████████████░░░░  Máxima asistencia
Caso 2 (Intern):      ████████░░░░░░░░  Sugerencias opcionales
Caso 3+ (Associate+): ████░░░░░░░░░░░░  Solo hints bajo demanda
```

**Mecánica**: El juego trackea si has usado cada feature. Si no has usado el Board después de 5 minutos, ARIA sugiere sutilmente: _"¿Sabías que puedes organizar tus hallazgos en el tablero de evidencias?"_

### 1.4. Tooltips Contextuales (Solo primera vez)

| Trigger                    | Tooltip                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Primera vez en inbox       | "Los documentos más recientes suelen tener pistas sobre qué investigar primero"        |
| Primera vez en documento   | "Puedes seleccionar texto y añadirlo como evidencia"                                   |
| Primera mención de entidad | "Los nombres resaltados son personas u organizaciones. Click para ver más sobre ellos" |
| Primer pin                 | "Genial. Ahora puedes conectar esta evidencia con otras en tu tablero"                 |
| Primera pregunta a ARIA    | "ARIA siempre cita sus fuentes. Haz click en [1] para ir al documento original"        |

### 1.5. Skip Tutorial

Opción clara para jugadores experimentados:

```
┌─────────────────────────────────────────────────────────┐
│  ¿Primera vez jugando?                                  │
│                                                         │
│  [Empezar con el tutorial]     [Saltar al primer caso] │
│   "The Missing Petty Cash"      Ya sé cómo funciona    │
│   ~8 minutos                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Catálogo de Crímenes

### 2.1. Taxonomía de Fraudes Corporativos

Cada tipo de crimen tiene mecánicas de juego distintas:

| Crimen                        | Evidencia Clave              | Mecánica Principal                              | Dificultad Base |
| ----------------------------- | ---------------------------- | ----------------------------------------------- | --------------- |
| **Phantom Vendor**            | Direcciones, aprobaciones    | Cruzar registros de vendor con datos personales | 2               |
| **Expense Padding**           | Recibos, patrones            | Detectar anomalías en montos y frecuencias      | 1               |
| **Inventory Shrinkage**       | Conteos, envíos              | Reconciliar números entre sistemas              | 3               |
| **Kickback Scheme**           | Precios, comunicaciones      | Comparar precios de mercado con pagados         | 4               |
| **Payroll Ghost**             | Nómina, HR records           | Encontrar empleados que no existen              | 2               |
| **Data Exfiltration**         | Logs, emails                 | Timeline de accesos y comunicaciones externas   | 3               |
| **Financial Statement Fraud** | Reportes, ajustes            | Detectar manipulación de números                | 5               |
| **Bid Rigging**               | Propuestas, comunicaciones   | Patrones de ofertas coordinadas                 | 4               |
| **Check Tampering**           | Cheques, firmas              | Comparar firmas y beneficiarios                 | 2               |
| **Skimming**                  | Registros de caja, depósitos | Discrepancias entre ventas y depósitos          | 3               |

### 2.2. Detalle por Tipo de Crimen

#### Phantom Vendor (Proveedor Fantasma)

```yaml
name: Phantom Vendor
description: Empleado crea empresa ficticia para auto-pagarse
typical_perpetrator: Procurement, Accounts Payable
evidence_trail:
  - Vendor registration con dirección sospechosa
  - Facturas vagas sin deliverables claros
  - Único aprobador para todas las facturas
  - Comunicación informal entre "partes"
  - Cuenta bancaria vinculada al empleado
red_herring_opportunities:
  - Vendor legítimo con facturas altas
  - Empleado que trabaja desde casa (dirección personal)
key_insight: '¿Por qué un proveedor profesional escribe emails tan informales?'
satisfaction_moment: Conexión dirección vendor → dirección personal empleado
```

#### Expense Padding (Inflar Gastos)

```yaml
name: Expense Padding
description: Empleado infla o fabrica gastos de empresa
typical_perpetrator: Sales, Executives, Traveling employees
evidence_trail:
  - Recibos duplicados o alterados
  - Gastos en días no laborables
  - Patrones de montos sospechosos ($49.99 repetido = bajo umbral)
  - Proveedores de receipts inexistentes
  - Categorías vagas ("client entertainment")
red_herring_opportunities:
  - Viaje de negocios legítimo pero caro
  - Empleado con gastos altos pero justificados
key_insight: 'Nadie cena con clientes 15 veces al mes en el mismo restaurante'
satisfaction_moment: Recibo con fecha de domingo + empleado sin viaje registrado
```

#### Data Exfiltration (Robo de Datos)

```yaml
name: Data Exfiltration
description: Empleado roba información confidencial para vender o competir
typical_perpetrator: IT, Sales, R&D, Departing employees
evidence_trail:
  - Descargas masivas antes de renuncia
  - Emails a cuentas personales
  - USB/cloud uploads inusuales
  - Comunicación con competidores
  - Acceso a archivos fuera de su rol
red_herring_opportunities:
  - IT admin con acceso legítimo amplio
  - Empleado preparando handover
key_insight: '¿Por qué alguien de Marketing descargó toda la base de clientes?'
satisfaction_moment: Timeline de accesos → email de oferta laboral de competidor
```

#### Kickback Scheme (Comisiones Ilegales)

```yaml
name: Kickback Scheme
description: Empleado recibe pagos de proveedor a cambio de contratos favorables
typical_perpetrator: Procurement, Management, Construction
evidence_trail:
  - Precios sistemáticamente sobre mercado
  - Proveedor siempre gana licitaciones
  - Comunicación personal fuera de canales oficiales
  - Lifestyle del empleado no cuadra con salario
  - Pagos a terceros relacionados
red_herring_opportunities:
  - Proveedor legítimamente mejor pero más caro
  - Relación personal pre-existente (universidad, familia)
key_insight: 'El proveedor más caro siempre gana, y el comprador tiene un coche nuevo'
satisfaction_moment: Transferencia a "consultor" → mismo banco que empleado
```

### 2.3. Combinaciones (Dificultad Alta)

Para casos de nivel 4-5, combinamos crímenes:

| Combo                  | Descripción                                                  | Complejidad               |
| ---------------------- | ------------------------------------------------------------ | ------------------------- |
| **Phantom + Kickback** | Proveedor fantasma que también da kickbacks                  | Dos culpables coordinados |
| **Expense + Data**     | Infla gastos para financiar startup propia con datos robados | Timeline paralelo         |
| **Payroll + Skimming** | Gerente crea empleados fantasma y además roba de caja        | Dos mecanismos distintos  |

---

## 3. ARIA con Personalidad

### 3.1. Voz y Tono

ARIA no es un robot genérico. Tiene personalidad sutil:

| Rasgo                        | Manifestación                                              |
| ---------------------------- | ---------------------------------------------------------- |
| **Profesional pero no frío** | "Interesante hallazgo" en lugar de "Información procesada" |
| **Ligeramente irónico**      | Comentarios sutiles sobre lo absurdo de la situación       |
| **Curioso**                  | A veces nota cosas sin que le pregunten                    |
| **Humilde**                  | Admite cuando no sabe o cuando algo es ambiguo             |
| **Respetuoso del jugador**   | Nunca condescendiente, nunca spoilea                       |

### 3.2. Ejemplos de Personalidad

**Profesional con toque humano:**

```
Player: "Summarize the email thread about Q3 budget"

ARIA (antes - genérico):
"The thread contains 12 messages discussing Q3 budget allocation."

ARIA (después - con personalidad):
"It's a lively thread — 12 messages over 3 days. The highlights:
Sarah pushed for more marketing spend [Email #4], Marcus pushed
back citing vendor costs [Email #7], and it ended with the classic
'let's take this offline' [Email #12]. The actual decision?
Unclear from the thread."
```

**Ironía sutil sin spoilear:**

```
Player: "What does Sunshine Supplies do?"

ARIA: "According to their invoices, they provide 'strategic consulting
services' and 'process optimization.' [INV-4521, INV-4534].
Notably, the invoices don't include any... specific... deliverables.
But I'm sure that's just how consulting works."
```

**Curiosidad proactiva:**

```
[Después de que el jugador abre el tercer documento de Sunshine]

ARIA: "I notice you're digging into Sunshine Supplies. I ran a quick
cross-reference — they're the only vendor in this dossier that
Marcus Chen handles exclusively. Every other vendor has multiple
contacts. Probably nothing, but thought you'd want to know."
```

**Humildad ante la ambigüedad:**

```
Player: "Is this expense report fraudulent?"

ARIA: "Honestly? I can't tell for certain. The amounts are high but
not implausible for a conference trip. The receipts exist but
they're hard to verify. What I can say: this pattern — $400+
dinners three nights in a row — is unusual compared to other
employees' expense reports in this dossier."
```

### 3.3. Variantes de Personalidad (Cosmético/Premium)

| Variante           | Tono                 | Ejemplo                                             |
| ------------------ | -------------------- | --------------------------------------------------- |
| **Classic ARIA**   | Profesional, sutil   | "Interesting. The dates don't align."               |
| **Noir ARIA**      | Detective hardboiled | "Something stinks here, and it ain't the coffee."   |
| **Corporate ARIA** | Sarcasmo corporativo | "Per my previous analysis, this looks problematic." |
| **Friendly ARIA**  | Más cálido, casual   | "Ooh, nice catch! Let me dig into that..."          |

### 3.4. Easter Eggs de ARIA

Respuestas especiales para preguntas fuera de contexto:

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

---

## 4. Diseño de Momentos "Ajá"

### 4.1. Anatomía de una Revelación

Un buen momento "ajá" tiene estructura:

```
SETUP          →    TENSION      →    CONNECTION     →    PAYOFF
(Piezas        →    (Sospecha    →    (El jugador    →    (Confirmación
sueltas)            creciente)        lo conecta)         satisfactoria)
```

### 4.2. Tipos de Momentos "Ajá"

| Tipo                 | Descripción                                  | Ejemplo                                               |
| -------------------- | -------------------------------------------- | ----------------------------------------------------- |
| **La Conexión**      | Dos piezas inconexas resultan relacionadas   | Dirección en vendor form = dirección en HR record     |
| **El Patrón**        | Algo que parecía aleatorio revela estructura | Todos los gastos son $49.99 (bajo umbral de $50)      |
| **La Contradicción** | Dos documentos dicen cosas incompatibles     | Email dice "nunca conocí a Juan" pero hay foto juntos |
| **El Timeline**      | Las fechas revelan algo imposible            | Factura fechada antes de que existiera el proveedor   |
| **El Tono**          | La forma de comunicarse delata la relación   | Emails "profesionales" que son demasiado familiares   |
| **La Ausencia**      | Lo que NO está es la pista                   | Único proveedor sin contrato formal en archivo        |

### 4.3. Diseño Intencional de Revelaciones

Para cada caso, diseñar explícitamente:

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
    connection: "'Same arrangement as before'? 'Talk soon, M'? Who talks to vendors like that?"
    payoff: "He knows them personally because it's his company"
    difficulty_to_find: medium
```

### 4.4. Señales Sutiles (Sin Spoilear)

El juego puede dar feedback sutil cuando el jugador está cerca:

| Señal              | Implementación                                                         | Riesgo de Spoiler |
| ------------------ | ---------------------------------------------------------------------- | ----------------- |
| **Board glow**     | Nodos relacionados brillan sutilmente cuando están cerca en el tablero | Bajo              |
| **ARIA curiosity** | "Hmm, interesting that you're looking at both of these..."             | Medio             |
| **Document heat**  | Documentos clave tienen micro-animación al abrirlos                    | Bajo              |
| **Sound cue**      | Sonido sutil de "click" cuando pines algo importante                   | Bajo              |
| **Progress hint**  | "You've found 2 of 4 key evidence pieces" (opcional, settings)         | Alto - opcional   |

### 4.5. Anti-Patterns a Evitar

| ❌ No hacer                                | ✅ En su lugar                              |
| ------------------------------------------ | ------------------------------------------- |
| Resaltar evidencia clave                   | Dejar que el jugador la descubra            |
| "¡Correcto!" cuando pineas algo importante | Feedback neutro hasta el final              |
| ARIA diciendo "Deberías mirar X"           | ARIA presentando información neutral        |
| Tutorial explicando qué es sospechoso      | Tutorial explicando mecánicas, no contenido |
| Pop-up: "¿Conectar estos documentos?"      | Dejar que el jugador lo haga manualmente    |

---

## 5. Audio y Ambiente

### 5.1. Filosofía Sonora

**"Oficina a las 11 PM"** — El sonido de trabajar solo, tarde, cuando todo el mundo se ha ido.

### 5.2. Música Ambiente

| Estado                 | Estilo                      | Referencia                          |
| ---------------------- | --------------------------- | ----------------------------------- |
| **Explorando**         | Lo-fi ambient, piano suave  | Dusty Decks, Boards of Canada suave |
| **Leyendo documentos** | Silencio con ambiente       | Solo sonido de oficina              |
| **Tensión creciente**  | Drone sutil, bajo creciente | Similar a "Mindhunter" soundtrack   |
| **Cerca de solución**  | Ritmo sutil emerge          | Percussion mínima                   |
| **Revelación**         | Momento de claridad         | Nota sostenida, resolución          |

### 5.3. Efectos de Sonido

| Acción                | Sonido                | Propósito            |
| --------------------- | --------------------- | -------------------- |
| **Abrir documento**   | Papel, carpeta        | Feedback táctil      |
| **Scroll**            | Sutil rustle          | Inmersión            |
| **Pin al board**      | Tachuelas/pin suave   | Satisfacción         |
| **Conexión en board** | Marcador/hilo         | Satisfacción         |
| **Mensaje de ARIA**   | Soft chime            | Atención sin alarma  |
| **Hint usado**        | Suave "unlock"        | Neutral, no punitivo |
| **Submit**            | Carpeta cerrándose    | Finalidad            |
| **Score reveal**      | Dependiente del grade | Celebración o neutro |

### 5.4. Ambiente de Oficina

Capa de sonido ambiente opcional:

- Aire acondicionado lejano (white noise suave)
- Reloj de pared (tick ocasional)
- Lluvia en ventana (opción weather)
- Tráfico distante
- Máquina de café lejana (ocasional)

### 5.5. Opciones de Audio

```
┌─────────────────────────────────────────┐
│  AUDIO SETTINGS                         │
│                                         │
│  Music Volume      ████████░░  80%      │
│  Effects Volume    ██████░░░░  60%      │
│  Ambient Sounds    [ON] / OFF           │
│                                         │
│  Music Style:                           │
│  ○ Lo-fi Ambient (default)              │
│  ○ Minimal Piano                        │
│  ○ Silent (effects only)                │
│                                         │
│  Ambient Weather:                       │
│  ○ Clear Night                          │
│  ● Rainy Evening                        │
│  ○ None                                 │
└─────────────────────────────────────────┘
```

---

## 6. Feedback Durante el Juego

### 6.1. El Problema

Sin feedback, el jugador no sabe:

- ¿Voy bien o estoy perdido?
- ¿Cuánto me falta?
- ¿Debería pedir hint?

Con demasiado feedback:

- Se arruina el descubrimiento
- Se siente como un tutorial eterno

### 6.2. Feedback Implícito (Siempre Activo)

| Señal                    | Qué indica                | Cómo se muestra                   |
| ------------------------ | ------------------------- | --------------------------------- |
| **Board density**        | Progreso de investigación | Más nodos = más investigado       |
| **Document read status** | Cobertura                 | Iconos de leído/no leído en inbox |
| **Connection count**     | Análisis hecho            | Número de conexiones en board     |
| **ARIA activity**        | Hay más que explorar      | ARIA sugiere si estás inactivo    |
| **Time elapsed**         | Ritmo personal            | Reloj sutil en UI (opcional)      |

### 6.3. Feedback Explícito (Opt-in)

Configuración para jugadores que prefieren más guía:

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

#### Detective Mode

- Sin indicadores de progreso
- Hints disponibles pero no sugeridos
- Solo feedback al final

#### Investigator Mode (default)

- Indicador general: "Investigation Progress: ██░░░░"
- ARIA sugiere hints después de 10 min sin progreso
- "Key Evidence: ? / 4" (sin revelar cuáles)

#### Trainee Mode

- Progress bar detallado
- ARIA proactivamente señala áreas no exploradas
- "You haven't looked at the vendor forms yet"
- Hints sugeridos activamente

### 6.4. ARIA como Canal de Feedback

ARIA puede dar feedback sin spoilear:

```
[Después de 5 minutos sin actividad]
ARIA: "Taking a moment to think? Good investigators do that.
If you're stuck, I can offer a nudge — just ask."

[Después de revisar todos los documentos sin hacer conexiones]
ARIA: "You've been thorough with the documents. The evidence
board is looking a bit empty though — anything connecting
in your mind?"

[Después de hacer una conexión correcta - sutil]
ARIA: "Interesting connection you've made there."
(Mismo mensaje para conexiones incorrectas - no revela nada)

[Después de 15 minutos, dificultad 1-2]
ARIA: "You're spending quality time on this. Remember, simpler
cases usually have more direct evidence trails."
```

### 6.5. Indicadores de "Calor/Frío" (Descartado)

**Decisión de diseño**: NO implementar sistema de "caliente/frío" porque:

- Arruina la sensación de descubrimiento
- Convierte investigación en "guess the pixel"
- No es realista (auditor real no tiene esta señal)

### 6.6. Post-Action Micro-feedback

Pequeños indicadores después de acciones:

| Acción                       | Feedback                 |
| ---------------------------- | ------------------------ |
| **Pin documento**            | Checkmark sutil + sonido |
| **Crear conexión**           | Línea se solidifica      |
| **Hacer pregunta a ARIA**    | Typing indicator natural |
| **Abrir documento ya leído** | Badge "reviewed"         |

---

## 7. Presión Temporal

### 7.1. ¿Timer Sí o No?

**Recomendación**: Timer OPCIONAL, no afecta scoring negativamente.

| Enfoque             | Pros                                       | Cons                            |
| ------------------- | ------------------------------------------ | ------------------------------- |
| **Sin timer**       | Relajado, accesible                        | Puede alargarse indefinidamente |
| **Timer visible**   | Tensión, urgencia                          | Ansiedad, no para todos         |
| **Timer oculto**    | Mejor de ambos mundos                      | Se siente injusto si penaliza   |
| **Timer + bonus** ✓ | Recompensa velocidad sin castigar lentitud | Ninguno real                    |

### 7.2. Implementación Recomendada

```
Base score:     85/100 (lo que el jugador consiguió)
Speed bonus:    +5 (completado en <15 min)
Final score:    90/100

---

Speed bonus brackets:
- Under 10 min: +10 points
- 10-15 min: +5 points
- 15-20 min: +2 points
- Over 20 min: +0 points (NO penalty)
```

### 7.3. Visualización del Tiempo

```
┌─────────────────────────────────────────┐
│  Timer Display Options:                 │
│                                         │
│  ○ Hidden (track internally, no UI)     │
│  ● Subtle (small clock in corner)       │
│  ○ Prominent (countdown style)          │
│  ○ Off (don't track at all)             │
└─────────────────────────────────────────┘
```

### 7.4. Par Times por Dificultad

| Nivel         | Par Time | Speed Bonus Threshold |
| ------------- | -------- | --------------------- |
| 1 - Intern    | 15 min   | <10 min               |
| 2 - Associate | 20 min   | <15 min               |
| 3 - Senior    | 30 min   | <20 min               |
| 4 - Manager   | 40 min   | <30 min               |
| 5 - Partner   | 50 min   | <40 min               |

---

## 8. Accesibilidad Narrativa

### 8.1. El Problema

¿El jugador necesita saber de contabilidad, finanzas o auditoría para disfrutar el juego?

**Respuesta**: NO. El juego debe ser accesible a cualquiera que sepa leer.

### 8.2. Principios de Accesibilidad Narrativa

| Principio                       | Implementación                               |
| ------------------------------- | -------------------------------------------- |
| **Jargon explicado**            | Tooltips en términos técnicos                |
| **Números contextualizados**    | "$15,000 (approval limit)" no solo "$15,000" |
| **Patrones sobre conocimiento** | Detectas anomalías, no calculas ratios       |
| **ARIA como traductor**         | Puede explicar conceptos si preguntas        |

### 8.3. Glosario Contextual

```
Cuando el jugador hover sobre "IBAN":

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

### 8.4. Ejemplos de Contextualización

**Antes (requiere conocimiento):**

```
Invoice #4521
Amount: $12,000.00
Payment Terms: Net 30
```

**Después (auto-explicativo):**

```
Invoice #4521
Amount: $12,000.00 (under $15K approval threshold)
Payment Terms: Net 30 (payment due in 30 days)
                     ℹ️ Hover for more
```

### 8.5. ARIA como Educador

```
Player: "What's a phantom vendor?"

ARIA: "A phantom vendor is a fake company set up to receive
payments for goods or services that were never provided.
It's a common fraud scheme — someone inside the company
creates the fake vendor and then approves payments to it.

The red flags usually include:
- Vague service descriptions
- No physical presence or real employees
- Only one person handles all their invoices
- Address that's residential or suspicious

Want me to check if any vendors in this case match that pattern?"
```

### 8.6. "Explain This Document" Button

Cada documento tiene opción de explicación:

```
┌─────────────────────────────────────────────────┐
│ 📄 Invoice #4521                    [?] Explain │
└─────────────────────────────────────────────────┘

[Click en Explain]

ARIA: "This is an invoice from Sunshine Supplies to TechFlow.
Key things to note:

1. It's for $12,000 — just under the $15K limit where extra
   approval would be needed

2. The description 'Market Analysis Phase 1' is vague —
   legitimate consulting usually specifies deliverables

3. The vendor address is listed as 123 Oak Street — might
   be worth checking if that's a business or residential area

Want me to compare this to invoices from other vendors?"
```

---

## Resumen: Priorización Sugerida

| Mejora                      | Impacto | Esfuerzo | Prioridad       |
| --------------------------- | ------- | -------- | --------------- |
| **Tutorial/Onboarding**     | Alto    | Medio    | 🔴 MVP          |
| **Momentos "Ajá"**          | Alto    | Bajo     | 🔴 MVP          |
| **ARIA Personalidad**       | Alto    | Medio    | 🔴 MVP          |
| **Accesibilidad Narrativa** | Alto    | Bajo     | 🔴 MVP          |
| **Feedback durante juego**  | Medio   | Medio    | 🟡 Post-MVP     |
| **Catálogo de Crímenes**    | Medio   | Alto     | 🟡 Post-MVP     |
| **Presión Temporal**        | Bajo    | Bajo     | 🟢 Nice-to-have |
| **Audio/Ambiente**          | Medio   | Alto     | 🟢 Nice-to-have |

---

_¿Integrar estas secciones en 01_GAME_DESIGN.md o mantener como documento separado?_
