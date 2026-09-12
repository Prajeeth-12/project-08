// Project Abstract â€” Project 08

#let accent = rgb("#334155")
#let subtle = rgb("#94a3b8")
#let rule-color = rgb("#cbd5e1")
#let section-color = rgb("#1e293b")

#set document(
  title: "Project 08: Executive Abstract & Priority Tiers",
  author: "Lead Architect & Engineering Lead",
)

#set page(
  paper: "a4",
  margin: (top: 2.6cm, bottom: 2.4cm, left: 2.4cm, right: 2.4cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(8pt, fill: subtle)
      Project 08 #h(1fr) Executive Abstract
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

#show heading.where(level: 1): it => {
  v(1.4em)
  block(breakable: false, below: 0.5em)[
    #text(15pt, weight: "bold", fill: section-color)[#it]
    #v(2pt)
    #line(length: 40pt, stroke: 1.2pt + accent)
  ]
}

// Cover
#v(5cm)
#text(10pt, fill: subtle, tracking: 1.5pt, weight: "medium")[PROJECT 08]
#v(8pt)
#text(26pt, weight: "bold", fill: section-color)[AI Mock Interview &\ Assessment Platform]
#v(6pt)
#line(length: 50pt, stroke: 1.2pt + accent)
#v(8pt)
#text(12pt, fill: accent)[Executive Abstract & Feature Priority Tiers]
#v(1.5cm)
#grid(
  columns: (auto, auto),
  column-gutter: 24pt,
  row-gutter: 6pt,
  text(9pt, fill: subtle)[Version], text(9pt)[1.0],
  text(9pt, fill: subtle)[Date], text(9pt)[September 2026],
)

#pagebreak()

// Priority tier helper â€” keeps header stuck to following content
#let tier(label, color, title, subtitle) = {
  v(1.2em)
  block(breakable: false, below: 0.4em)[
    #grid(
      columns: (40pt, 1fr),
      column-gutter: 10pt,
      align(right, text(13pt, weight: "bold", fill: color)[#label]),
      [
        #text(13pt, weight: "bold", fill: section-color)[#title]
        #v(2pt)
        #text(9.5pt, style: "italic", fill: subtle)[#subtitle]
      ],
    )
    #v(2pt)
    #line(length: 100%, stroke: 0.3pt + rule-color)
  ]
}

#tier("P0", rgb("#991b1b"), "Core Conversational Interview", "Mandatory baseline. The fundamental real-time AI interview experience.")

- *Resume Intelligence.* PDF parsing, extracting candidate skills, projects, and verifiable claims to ground the interview context.

- *Real-Time AI Interviewer.* Role, resume, and JD-based technical and HR/behavioral questioning.

- *Stateful Interview Agent.* Autonomous agent loop (Observe #sym.arrow.r Reason #sym.arrow.r Decide #sym.arrow.r Act #sym.arrow.r Verify) managing conversation state and context.

- *Dynamic Follow-ups & Adaptive Difficulty.* Real-time probing of candidate answers, challenging weak assertions, and scaling question difficulty.

- *Evaluation & Scoring.* Transparent rubric scoring, strengths/weaknesses identification, and full session transcript history.

#tier("P1", rgb("#9a3412"), "Assessment Platform & In-Interview Coding", "Formal examination infrastructure and agent-invoked live coding.")

- *Interactive Coding Tool.* 1-on-1 coding tool dynamically invoked by the AI agent mid-interview; candidate writes code, Judge0 executes against test cases, AI evaluates logic, edge cases, and Big-O complexity.

- *Standalone Coding Assessment.* Formal scheduled exams configured by administrators with custom problem pools, languages, test durations, and auto-scoring.

- *Secure Exam Environment (SEB).* Restricted/locked examination environment with fullscreen enforcement, tab-switch tracking, and unauthorized access limits.

- *Judge0 Sandbox Execution Engine.* Secure sandbox executing multi-language code (Python, Java, C++, JS) with 2.0s CPU timeout and 128MB memory limit.

#tier("P2", rgb("#854d0e"), "Advanced Assessment Modes & Intelligence", "Specialized technical evaluations, voice interfaces, and long-term analytics.")

- *System Design Assessment.* AI-led architecture round evaluating APIs, database trade-offs, scalability, caching, queues, and failure recovery.

- *Written / Notepad Round.* Free-form workspace for pseudocode, algorithm explanations, and SQL queries without execution.

- *Voice Interview.* Real-time speech-to-text and text-to-speech conversational voice agent.

- *Company-Specific Simulation.* Company-specific interview styles, cultural questions, and role-specific hiring rubrics (e.g., Amazon LP, Google DSA).

- *Competency Intelligence.* Granular sub-skill scoring (e.g., Java: 84%, SQL: 68%, Problem Solving: 81%, System Design: 52%).

- *Personalized Practice & Progress Tracking.* Automated 30-day remediation plans and longitudinal tracking of score improvements.

#tier("P3", rgb("#1e40af"), "Institutional & College Platform", "Administrative deployment, cohort management, and reporting.")

- *College Assessment Management.* Drive creation, target role configuration, interview conditions setup, and question pool governance.

- *Student Cohort Allocation.* Large-scale automated batching of students across tracks (e.g., 100 students #sym.arrow.r Coding Exam vs AI Interview vs HR).

- *Faculty & Admin Analytics Dashboard.* Aggregate placement readiness metrics, department-level comparisons, candidate score distribution, and audit logs.

#v(1.5em)

#{
  let label-style(priority) = {
    let c = if priority == "P0" { rgb("#991b1b") }
      else if priority == "P1" { rgb("#9a3412") }
      else if priority == "P2" { rgb("#854d0e") }
      else { rgb("#1e40af") }
    text(9pt, weight: "bold", fill: c)[#priority]
  }

  table(
    columns: (42pt, auto, 1fr),
    align: (center, left, left),
    stroke: none,
    inset: (x: 6pt, y: 6pt),
    table.hline(stroke: 0.8pt + accent),
    table.header(
      text(9pt, weight: "bold", fill: accent)[Tier],
      text(9pt, weight: "bold", fill: accent)[Focus Area],
      text(9pt, weight: "bold", fill: accent)[Key Deliverable],
    ),
    table.hline(stroke: 0.4pt + rule-color),
    label-style("P0"), [Core Product], [Real-time adaptive AI mock interview + Resume intelligence],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P1"), [Assessments], [Standalone SEB coding exams + In-interview interactive coding tool],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P2"), [Advanced AI], [System design, voice interviews, and multi-session skill tracking],
    table.hline(stroke: 0.2pt + rgb("#f1f5f9")),
    label-style("P3"), [Institutional], [College administration, student cohort allocation, faculty analytics],
    table.hline(stroke: 0.8pt + accent),
  )
}

