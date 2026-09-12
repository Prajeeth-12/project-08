// Implementation Plan â€” Project 08

#let accent = rgb("#334155")    // slate-700
#let subtle = rgb("#94a3b8")    // slate-400
#let rule-color = rgb("#cbd5e1") // slate-300
#let section-color = rgb("#1e293b") // slate-800

#set document(
  title: "Project 08: Master Architecture Specification",
  author: "Lead Architect & Engineering Lead",
)

#set page(
  paper: "a4",
  margin: (top: 2.6cm, bottom: 2.4cm, left: 2.4cm, right: 2.4cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(8pt, fill: subtle)
      Project 08 #h(1fr) Master Architecture Specification
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

#show heading.where(level: 3): it => {
  v(0.6em)
  block(breakable: false, below: 0.15em)[
    #text(10.5pt, weight: "bold")[#it]
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
#text(12pt, fill: accent)[Master Architecture Specification & 25-Day Production Roadmap]
#v(1.5cm)
#grid(
  columns: (auto, auto),
  column-gutter: 24pt,
  row-gutter: 6pt,
  text(9pt, fill: subtle)[Version], text(9pt)[1.0],
  text(9pt, fill: subtle)[Date], text(9pt)[September 2026],
  text(9pt, fill: subtle)[Team], text(9pt)[10 Engineers / 2 Squads],
  text(9pt, fill: subtle)[Sprint], text(9pt)[25 Days],
)

#pagebreak()
#outline(indent: 1.5em, depth: 2)
#pagebreak()

= Core Architectural Paradigm

The platform is structured into two distinct assessment tracks managed under a unified institutional platform layer.

*Track 1 (Real-Time AI)* conducts conversational, adaptive interviews driven by a stateful agent loop. The agent dynamically invokes sub-tools --- a coding workspace, system design canvas, or written notepad --- as the interview progresses.

*Track 2 (Formal Coding)* provides standalone, scheduled coding examinations with a secure exam browser, sandboxed code execution, and automated scoring.

Both tracks share authentication and RBAC, a rubric scoring engine, and an institutional admin platform for college placement drives.

#raw(block: true, lang: none,
"                        INSTITUTIONAL PLATFORM
               (College / Admin / Batch Allocation / RBAC)
                                   |
        +--------------------------+---------------------------+
        v                                                      v
 TRACK 1: REAL-TIME AI                           TRACK 2: FORMAL CODING
 (Conversational Interview)                      (Scheduled Examination)
        |                                                      |
 Resume / Role / JD                                Admin Exam Config
        |                                                      |
 Stateful Interview Agent                       Secure Exam Browser
(Observe -> Reason -> Decide -> Act)                           |
        |                                         Monaco Code Editor
 Dynamic Probing & Follow-ups                                  |
        |                                      Judge0 Runner & Tests
 +------+-------+-----------+                                  |
 v              v            v            Automated Scoring & Report
Coding     Design       Notepad
 Tool       Tool          Tool")

= Prioritized Product Scope

#{
  let label-style(priority) = {
    let c = if priority == "P0" { rgb("#991b1b") }
      else if priority == "P1" { rgb("#9a3412") }
      else if priority == "P2" { rgb("#854d0e") }
      else { rgb("#1e40af") }
    text(9pt, weight: "bold", fill: c)[#priority]
  }

  table(
    columns: (42pt, 1.2fr, 2.5fr, auto),
    align: (center, left, left, left),
    stroke: none,
    inset: (x: 6pt, y: 6pt),
    table.hline(stroke: 0.8pt + accent),
    table.header(
      text(9pt, weight: "bold", fill: accent)[Priority],
      text(9pt, weight: "bold", fill: accent)[Module],
      text(9pt, weight: "bold", fill: accent)[Core Functionality],
      text(9pt, weight: "bold", fill: accent)[Track],
    ),
    table.hline(stroke: 0.4pt + rule-color),
    label-style("P0"), [AI Real-Time Mock Interview], [Resume/role/JD-based interview, dynamic follow-ups, adaptive difficulty, state/context management, weak-area identification, session history.], [Track 1],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P0"), [Resume Intelligence], [PDF parsing, skill/project/experience extraction, verifiable claim generation feeding the interview agent context.], [Track 1],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P0"), [Interview Agent], [Stateful orchestration: Observe #sym.arrow.r Reason #sym.arrow.r Decide #sym.arrow.r Act #sym.arrow.r Verify.], [Track 1],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P0"), [Evaluation & Scoring Engine], [Multi-dimensional scoring with transparent rubrics and session audit trail.], [Shared],
    table.hline(stroke: 0.4pt + rule-color),
    label-style("P1"), [Interactive Coding], [1-on-1 coding tool invoked by the AI agent; candidate writes code, Judge0 executes, AI reviews logic & Big-O.], [Track 1 Tool],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P1"), [Standalone Coding Assessment], [Formal scheduled exams, problem pool selection, test duration, candidate allocation, multi-language support.], [Track 2],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P1"), [Secure Exam (SEB)], [Restricted/locked exam window, blur/tab-switch detection, unauthorized access limits.], [Track 2],
    table.hline(stroke: 0.4pt + rule-color),
    label-style("P2"), [System Design Assessment], [AI-led architecture discussion (APIs, DBs, caching, failure modes) via dedicated workspace.], [Track 1 Tool],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P2"), [Written / Notepad], [Free-form pseudocode, SQL queries, and architecture explanations without execution.], [Track 1 Tool],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P2"), [Voice Interview], [Real-time STT/TTS, company-specific culture & interview simulations.], [Track 1],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P2"), [Competency Intelligence], [Multi-session skill progression radar, skill-gap analysis, personalized 30-day plans.], [Analytics],
    table.hline(stroke: 0.4pt + rule-color),
    label-style("Inst"), [College / Admin Platform], [Placement drive management, student cohort allocation, question pool authoring, faculty dashboard.], [Admin Layer],
    table.hline(stroke: 0.8pt + accent),
  )
}

= Production Tech Stack

#table(
  columns: (auto, 1.2fr, 2.5fr),
  align: (left, left, left),
  stroke: none,
  inset: (x: 6pt, y: 6pt),
  table.hline(stroke: 0.8pt + accent),
  table.header(
    text(9pt, weight: "bold", fill: accent)[Layer],
    text(9pt, weight: "bold", fill: accent)[Technology],
    text(9pt, weight: "bold", fill: accent)[Responsibility],
  ),
  table.hline(stroke: 0.4pt + rule-color),
  [Backend API], [Python (FastAPI) + Pydantic], [Async REST, WebSocket pipelines, AI/ML integration.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Frontend], [Next.js 14 + Tailwind + Lucide], [SSR dashboards, client hydration for live cockpit & coding room.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Code Editor], [Monaco Editor], [VS Code engine in-browser: Python, Java, C++, JS; 300ms auto-save.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Code Execution], [Judge0 CE Worker API], [Isolated sandbox: 2.0s CPU timeout, 128MB RAM limit.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Database / ORM], [PostgreSQL + SQLAlchemy + Alembic], [ACID persistence for users, sessions, submissions, rubrics.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Real-Time Sync], [FastAPI WebSockets + Redis], [Bi-directional sync for interview state, timers, streaming probes.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [AI / LLM], [Gemini 1.5 Flash/Pro + OpenAI], [Flash for live probing (\<1s); Pro/GPT-4o for code review & coaching.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Exam Security], [SEB / Browser Lockdown API], [Fullscreen enforcement, tab-blur tracking, clipboard restriction.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Doc Processing], [pdfplumber / pypdf], [Deterministic resume parsing and claim extraction.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [Testing / CI], [Pytest, Playwright, GitHub Actions], [Unit, contract, sandbox, and E2E tests on all PRs.],
  table.hline(stroke: 0.8pt + accent),
)

= Team Structure & Task Mapping

#grid(
  columns: (1fr, 1fr),
  column-gutter: 16pt,
  [
    == Team A: Live Core Engine
    #set text(9.5pt)

    #let entry(id, title, items) = {
      v(0.4em)
      text(weight: "bold")[#id. #title]
      v(2pt)
      for item in items {
        let (label, desc) = item
        [- #text(fill: accent, weight: "medium")[#label] #desc]
      }
    }

    #entry("A1", "Monaco Editor & Workspace", (
      ("UI:", [Editor, language switcher, auto-save, stdin console.]),
      ("API:", [`POST /api/code/drafts`]),
      ("DB:", [`code_drafts` model.]),
    ))
    #entry("A2", "Sandbox & Test Runner", (
      ("UI:", [Execution console with test case results.]),
      ("API:", [`POST /api/code/execute` via Judge0.]),
      ("DB:", [`code_submissions` model.]),
    ))
    #entry("A3", "Live Cockpit & Session State", (
      ("UI:", [Cockpit with timer, round switcher, recorder.]),
      ("API:", [`/ws/session/{id}` WebSocket lifecycle.]),
      ("DB:", [`interview_sessions` model.]),
    ))
    #entry("A4", "AI Probing Agent", (
      ("UI:", [Thinking indicator, difficulty meter.]),
      ("API:", [`POST /api/ai/live-probe`]),
      ("DB:", [`agent_turns` model.]),
    ))
    #entry("A5", "Code Review & Big-O Engine", (
      ("UI:", [Big-O badges, code suggestions drawer.]),
      ("API:", [`POST /api/ai/code-review`]),
      ("DB:", [`code_reviews` model.]),
    ))
  ],
  [
    == Team B: Platform & Exam Suite
    #set text(9.5pt)

    #let entry(id, title, items) = {
      v(0.4em)
      text(weight: "bold")[#id. #title]
      v(2pt)
      for item in items {
        let (label, desc) = item
        [- #text(fill: accent, weight: "medium")[#label] #desc]
      }
    }

    #entry("B1", "Auth, RBAC & Portal", (
      ("UI:", [Login, role management, onboarding wizard.]),
      ("API:", [`POST /api/auth/*` JWT + RBAC.]),
      ("DB:", [`users`, `student_profiles` tables.]),
    ))
    #entry("B2", "Resume Parser & Claims", (
      ("UI:", [Parsed resume viewer with skill pills.]),
      ("API:", [`POST /api/resumes/parse`]),
      ("DB:", [`resume_claims` model.]),
    ))
    #entry("B3", "Question & Problem Pool", (
      ("UI:", [Question bank, company filter, pool manager.]),
      ("API:", [`POST /api/questions/blueprint`]),
      ("DB:", [`question_bank`, `coding_problem_pool` tables.]),
    ))
    #entry("B4", "Exam Suite & SEB", (
      ("UI:", [Exam portal, countdown, SEB lockdown.]),
      ("API:", [`POST /api/exams/create`, `submit`, `session`.]),
      ("DB:", [`formal_exams`, `exam_allocations` tables.]),
    ))
    #entry("B5", "Rubrics, Analytics & Coach", (
      ("UI:", [Faculty dashboard, radar charts, PDF export.]),
      ("API:", [`POST /api/evaluations/score`, `coach/plan`.]),
      ("DB:", [`rubric_scores`, `coach_roadmaps` models.]),
    ))
  ],
)

= 25-Day Sprint Timeline

#table(
  columns: (60pt, auto, 1fr),
  align: (left, left, left),
  stroke: none,
  inset: (x: 6pt, y: 7pt),
  table.hline(stroke: 0.8pt + accent),
  table.header(
    text(9pt, weight: "bold", fill: accent)[Days],
    text(9pt, weight: "bold", fill: accent)[Phase],
    text(9pt, weight: "bold", fill: accent)[Milestones],
  ),
  table.hline(stroke: 0.4pt + rule-color),
  [*1--3*], [Architecture], [Monorepo initialized. PostgreSQL + Judge0 operational. Shared types frozen, schema models applied, mock APIs live.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [*4--10*], [P0 Verticals], [All 10 members complete vertical slices with local tests. Resume Parser, Live Room, Monaco, Sandbox, and Auth functional.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [*11--15*], [Integration V1], [Resume Upload #sym.arrow.r Blueprint #sym.arrow.r Cockpit #sym.arrow.r AI Probing end-to-end. Exam Portal connected to Judge0.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [*16--20*], [Integration V2], [AI Agent invokes Coding Tool mid-interview #sym.arrow.r session #sym.arrow.r Rubric Scorer #sym.arrow.r Coach Plan export.],
  table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
  [*21--25*], [Hardening], [Feature freeze Day 25. E2E tests, SEB validation, cloud deploy (Vercel + Render/AWS), viva prep.],
  table.hline(stroke: 0.8pt + accent),
)

