// Version Roadmap â€” Project 08

#let accent = rgb("#334155")
#let subtle = rgb("#94a3b8")
#let rule-color = rgb("#cbd5e1")
#let section-color = rgb("#1e293b")

#set document(
  title: "Project 08: Version Roadmap v1.0--v4.0",
  author: "Lead Architect & Engineering Lead",
)

#set page(
  paper: "a4",
  margin: (top: 2.6cm, bottom: 2.4cm, left: 2.4cm, right: 2.4cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(8pt, fill: subtle)
      Project 08 #h(1fr) Version Roadmap
      #v(-4pt)
      #line(length: 100%, stroke: 0.3pt + rule-color)
    ]
  },
  footer: context {
    set text(8pt, fill: subtle)
    align(center)[#counter(page).display()]
  },
)

#set text(font: "Palatino Linotype", size: 10.5pt, fill: rgb("#1e293b"))
#set par(justify: true, leading: 0.68em)
#set heading(numbering: "1.")

#show heading.where(level: 1): it => {
  v(1.4em)
  block(breakable: false, below: 0.5em)[
    #text(15pt, weight: "bold", fill: section-color)[#it]
    #v(2pt)
    #line(length: 40pt, stroke: 1.2pt + accent)
  ]
}

#show heading.where(level: 2): it => {
  v(1em)
  block(breakable: false, below: 0.3em)[
    #text(12pt, weight: "bold", fill: accent)[#it]
  ]
}

#show raw.where(block: true): it => {
  set text(8pt, font: "Cascadia Mono")
  block(width: 100%, fill: rgb("#f8fafc"), stroke: (left: 2pt + rule-color), inset: (left: 12pt, y: 8pt, right: 8pt), it)
}

// Cover
#v(5cm)
#text(10pt, fill: subtle, tracking: 1.5pt, weight: "medium")[PROJECT 08]
#v(8pt)
#text(26pt, weight: "bold", fill: section-color)[AI Mock Interview &\ Assessment Platform]
#v(6pt)
#line(length: 50pt, stroke: 1.2pt + accent)
#v(8pt)
#text(12pt, fill: accent)[Product Roadmap: v1.0 --- v4.0]
#v(1.5cm)
#grid(
  columns: (auto, auto),
  column-gutter: 24pt,
  row-gutter: 6pt,
  text(9pt, fill: subtle)[Version], text(9pt)[1.0],
  text(9pt, fill: subtle)[Date], text(9pt)[September 2026],
  text(9pt, fill: subtle)[Scope], text(9pt)[v1.0 through v4.0],
)
#v(1cm)
#text(10pt, style: "italic", fill: subtle)[A high-level roadmap for squad brainstorming, feature ideation, user journey mapping, and architecture planning.]

#pagebreak()

= Product Evolution

#raw(block: true, lang: none,
"  v1.0 ----------> v2.0 ----------> v3.0 ----------> v4.0
  Core AI Interview  Dual-Track Coding Advanced Modes   Institutional OS
   Resume Ingestion   Agent Coding     System Design    Drive Management
   Real-time Agent    Standalone Exam  Written/Notepad  Cohort Allocation
   Dynamic Probing    SEB / Lockdown   Voice Agent      Faculty Analytics
   Rubric Scoring     Judge0 Sandbox   Skill Radars     Longitudinal OS")

// Version entry helper â€” header stays with content
#let version(num, color, title, theme, experience, capabilities, brainstorming) = {
  v(1em)
  block(breakable: false, below: 0.5em)[
    #grid(
      columns: (46pt, 1fr),
      column-gutter: 10pt,
      align(right, text(13pt, weight: "bold", fill: color)[#num]),
      text(13pt, weight: "bold", fill: section-color)[#title],
    )
    #v(2pt)
    #line(length: 100%, stroke: 0.3pt + rule-color)
    #v(0.3em)
    #text(9.5pt, style: "italic", fill: subtle)[Theme: #theme]
  ]
  [*The Experience.* #experience]
  v(0.3em)
  [*Core Capabilities:*]
  capabilities
  v(0.2em)
  block(
    width: 100%,
    fill: rgb("#fffbeb"),
    stroke: (left: 2pt + rgb("#fde68a")),
    inset: (left: 12pt, y: 8pt, right: 8pt),
  )[
    #set text(9.5pt)
    #text(weight: "bold", fill: rgb("#92400e"))[Brainstorming focus]
    #brainstorming
  ]
}

#version("v1.0", rgb("#16a34a"),
  "The Intelligent Conversational Core",
  "Can the AI conduct a realistic, context-aware, stateful technical & behavioral interview?",
  [A candidate uploads their resume, selects a target role, and enters a live interview cockpit.],
  [
    - *Resume Intelligence.* Parsing PDFs, identifying key projects, technologies, and verifiable assertions.
    - *Stateful Interview Agent.* An autonomous loop (Observe #sym.arrow.r Reason #sym.arrow.r Decide #sym.arrow.r Act) that tracks conversation state and context.
    - *Dynamic Probing & Adaptive Difficulty.* The AI challenges vague answers, asks targeted follow-ups on resume claims, and scales question depth dynamically.
    - *Evaluation & Session Archive.* Multi-dimensional score breakdown, identified weak areas, and a full transcript history.
  ],
  [
    - _UI Flow:_ What does the live cockpit look like? How are AI thinking states visualised?
    - _AI Prompts:_ How does the agent decide when an answer is sufficient vs when to probe deeper?
  ],
)

#version("v2.0", rgb("#ca8a04"),
  "The Dual-Track Coding Platform",
  "Bridging conversational evaluation with executable, multi-language coding infrastructure.",
  [Two distinct coding experiences: (1) live coding inside the interview, and (2) standalone formal exams.],
  [
    - *Interactive In-Interview Coding Tool.* The AI agent pauses conversation to launch a live coding workspace, runs tests, and reviews Big-O complexity before resuming dialogue.
    - *Standalone Coding Assessment Engine.* Scheduled, formal coding examinations with custom problem pools, test duration, and automated test runners.
    - *Secure Exam Environment (SEB).* Anti-cheat controls, tab-blur tracking, fullscreen enforcement, and locked-down test windows.
    - *Judge0 Sandbox Execution.* Multi-language isolated code runner (Python, Java, C++, JS) with CPU/memory resource limits.
  ],
  [
    - _Tool Triggering:_ When and how does the AI decide to invoke the interactive coding workspace?
    - _Execution Safety:_ How do we handle infinite loops, compile errors, and runtime limits gracefully?
  ],
)

#version("v3.0", rgb("#7c3aed"),
  "Multimodal Assessments & Competency Intelligence",
  "Broadening technical evaluation modalities and tracking granular skill progress.",
  [Beyond standard Q&A and coding: evaluating system architecture, verbal communication, and sub-skill mastery.],
  [
    - *System Design Assessment Tool.* Interactive architecture round: API design, caching, database trade-offs, failure recovery.
    - *Written / Notepad Round.* Free-form scratchpad for algorithmic pseudocode, math reasoning, SQL queries.
    - *Voice Interview Engine.* Real-time conversational STT and TTS interviewer.
    - *Competency Radar & Skill Gaps.* Granular score breakdown (e.g., Java: 84%, System Design: 52%, Problem Solving: 81%).
    - *Personalized 30-Day Remediation.* Automated practice problem sets targeting detected weak areas.
  ],
  [
    - _Architecture UI:_ What kind of scratchpad or diagramming tool works best for system design?
    - _Voice UX:_ How to minimize latency and handle speech interruptions naturally?
  ],
)

#version("v4.0", rgb("#2563eb"),
  "The Institutional Career Operating System",
  "Scaling the platform for colleges, placement coordinators, batch drives, and longitudinal analytics.",
  [College administrators and faculty manage massive recruitment preparation drives and monitor student readiness across semesters.],
  [
    - *Placement Drive & Program Management.* Defining drive conditions, uploading JDs, configuring round rules, curating question pools.
    - *Student Cohort Allocation.* Automated routing of batches across tracks (e.g., 100 Candidates #sym.arrow.r Coding #sym.arrow.r AI Tech #sym.arrow.r HR).
    - *Faculty & Placement Analytics Dashboard.* Department-wise readiness comparisons, score distributions, audit reports.
    - *Longitudinal Progress Tracking.* Score improvements, recurring failure points, trajectory across semesters.
  ],
  [
    - _Admin Portal:_ How should faculty filter, export, and inspect transcripts and code submissions?
    - _Batch Automation:_ How are cohort rules and drive schedules configured intuitively?
  ],
)

#v(1.5em)

#table(
  columns: (auto, auto, 1fr),
  align: (left, left, left),
  stroke: none,
  inset: (x: 6pt, y: 6pt),
  table.hline(stroke: 0.8pt + accent),
  table.header(
    text(9pt, weight: "bold", fill: accent)[Version],
    text(9pt, weight: "bold", fill: accent)[Focus],
    text(9pt, weight: "bold", fill: accent)[Target Output],
  ),
  table.hline(stroke: 0.4pt + rule-color),
  [v1.0], [Core Conversational AI], [Live AI Mock Interview Cockpit + Resume Claim Intelligence],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [v2.0], [Dual-Track Coding], [In-Interview Coding Workspace + Standalone SEB Exam Platform],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [v3.0], [Multimodal & Intelligence], [System Design Tool + Voice Agent + Competency Radars + 30-Day Coach],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [v4.0], [Institutional Platform], [College Drive Manager + Cohort Allocation + Faculty Analytics Hub],
  table.hline(stroke: 0.8pt + accent),
)

