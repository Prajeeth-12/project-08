// GitHub Execution & Workflow Plan — Project 08

#let accent = rgb("#334155")
#let subtle = rgb("#94a3b8")
#let rule-color = rgb("#cbd5e1")
#let section-color = rgb("#1e293b")
#let primary = rgb("#2563eb")
#let dark = rgb("#0f172a")
#let light-bg = rgb("#f8fafc")
#let border-color = rgb("#e2e8f0")
#let squad-a-color = rgb("#0284c7")
#let squad-b-color = rgb("#7c3aed")
#let warn-bg = rgb("#fef2f2")
#let warn-border = rgb("#fca5a5")

#set document(
  title: "Project 08: GitHub Execution & Workflow Plan (v1.0)",
  author: "Lead Architect & Engineering Lead",
)

#set page(
  paper: "a4",
  margin: (top: 2.4cm, bottom: 2.2cm, left: 2cm, right: 2cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(8pt, fill: subtle)
      Project 08 #h(1fr) GitHub Workflow Plan v1.0
      #v(-4pt)
      #line(length: 100%, stroke: 0.3pt + rule-color)
    ]
  },
  footer: context {
    set text(8pt, fill: subtle)
    align(center)[#counter(page).display()]
  },
)

#set text(font: "Palatino Linotype", size: 10pt, fill: dark)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.")

#show heading.where(level: 1): it => {
  v(1.2em)
  block(breakable: false, below: 0.4em)[
    #text(14pt, weight: "bold", fill: section-color)[#it]
    #v(2pt)
    #line(length: 36pt, stroke: 1.2pt + accent)
  ]
}

#show heading.where(level: 2): it => {
  v(0.7em)
  text(11.5pt, weight: "bold", fill: section-color)[#it]
  v(0.25em)
}

#show heading.where(level: 3): it => {
  v(0.5em)
  text(10.5pt, weight: "bold", fill: accent)[#it]
  v(0.15em)
}

#show raw.where(block: true): it => {
  block(
    fill: rgb("#f8fafc"),
    stroke: 0.5pt + rule-color,
    inset: (x: 10pt, y: 8pt),
    radius: 3pt,
    width: 100%,
    text(8.5pt, font: "Consolas", it),
  )
}

#show raw.where(block: false): it => {
  box(
    fill: rgb("#f1f5f9"),
    inset: (x: 3pt, y: 1.5pt),
    radius: 2pt,
    text(9pt, font: "Consolas", it),
  )
}

#let warn-box(body) = block(
  fill: warn-bg,
  stroke: 0.5pt + warn-border,
  inset: 8pt,
  radius: 3pt,
  width: 100%,
  body,
)

#let tip-box(body) = block(
  fill: rgb("#f0fdf4"),
  stroke: 0.5pt + rgb("#86efac"),
  inset: 8pt,
  radius: 3pt,
  width: 100%,
  body,
)

// ─── Title Page ───

#v(4cm)
#align(center)[
  #text(26pt, weight: "bold", fill: section-color)[Project 08]
  #v(6pt)
  #text(13pt, fill: accent)[GitHub Execution & Workflow Plan (v1.0)]
  #v(18pt)
  #line(length: 60pt, stroke: 1.5pt + accent)
  #v(18pt)
  #text(10.5pt, fill: subtle)[Lead Architect & Engineering Lead]
  #v(4pt)
  #text(9.5pt, fill: subtle)[AI Mock Interview & Coding Platform — 10-Member Sprint]
  #v(2pt)
  #text(9pt, fill: subtle)[Daily Git Commands & Integration Protocol]
]

#pagebreak()

// ─── Content ───

= Our Goal & How We Use This Plan

*Our Project Goal:* Build and integrate Project 08 (AI Mock Interview & Coding Platform) with our 10-member team across a structured 25-day sprint.

*How We Work:* To eliminate merge conflicts and ensure everyone has demonstrable viva evidence, each member owns an isolated vertical slice. Members push code only to their assigned files, open PRs to their squad integration branch, and I handle the central integration into `develop`.

= Branching Hierarchy

```
                    main (Production Release)
                      ▲
                      │ (Milestone Release)
                    develop (My Central Integration)
                      ▲
        ┌─────────────┴─────────────┐
        │                           │
team-a/integration          team-b/integration
 (Squad A Staging)           (Squad B Staging)
        ▲                           ▲
 ├── feat/a1-editor-workspace   ├── feat/b1-auth-candidate-hub
 ├── feat/a2-sandbox-judge0     ├── feat/b2-resume-claim-parser
 ├── feat/a3-live-interview     ├── feat/b3-problem-blueprints
 ├── feat/a4-probing-agent      ├── feat/b4-exam-portal-seb
 └── feat/a5-code-review-ast    └── feat/b5-analytics-rubric-coach
```

= 10-Member File Allocation Matrix

#let matrix-table(squad-title, squad-color, data) = {
  text(9pt, weight: "bold", fill: squad-color)[#squad-title]
  v(3pt)
  table(
    columns: (28pt, auto, auto, 72pt, 76pt, 76pt),
    inset: 5pt,
    stroke: 0.3pt + border-color,
    fill: (x, y) => if y == 0 { rgb("#f1f5f9") } else { none },
    [#text(8pt, weight: "bold")[ID]],
    [#text(8pt, weight: "bold")[Branch]],
    [#text(8pt, weight: "bold")[UI Component]],
    [#text(8pt, weight: "bold")[Backend API]],
    [#text(8pt, weight: "bold")[DB Model]],
    [#text(8pt, weight: "bold")[Test File]],
    ..data.map(row => row.map(c => text(7.5pt, font: "Consolas")[#c])).flatten()
  )
}

#matrix-table(
  "Squad A — Live Engine & Real-Time Coding",
  squad-a-color,
  (
    ("A1", "feat/a1-editor-workspace", "MonacoEditor.tsx", "api/drafts.py", "models/draft.py", "test_drafts.py"),
    ("A2", "feat/a2-sandbox-judge0", "TestConsole.tsx", "api/execution.py", "models/submission.py", "test_execution.py"),
    ("A3", "feat/a3-live-interview", "LiveCockpit.tsx", "api/sessions.py", "models/session.py", "test_sessions.py"),
    ("A4", "feat/a4-probing-agent", "ProbingStatus.tsx", "api/probing.py", "models/agent_turn.py", "test_probing.py"),
    ("A5", "feat/a5-code-review-ast", "CodeReviewCard.tsx", "api/code_review.py", "models/review.py", "test_code_review.py"),
  )
)

#v(4pt)

#matrix-table(
  "Squad B — Platform, Knowledge & Formal Exams",
  squad-b-color,
  (
    ("B1", "feat/b1-auth-candidate-hub", "AuthModal.tsx", "api/auth.py", "models/user.py", "test_auth.py"),
    ("B2", "feat/b2-resume-claim-parser", "ResumeViewer.tsx", "api/resumes.py", "models/resume_claim.py", "test_resumes.py"),
    ("B3", "feat/b3-problem-blueprints", "QuestionBank.tsx", "api/questions.py", "models/blueprint.py", "test_questions.py"),
    ("B4", "feat/b4-exam-portal-seb", "ExamPortal.tsx", "api/exams.py", "models/formal_exam.py", "test_exams.py"),
    ("B5", "feat/b5-analytics-rubric-coach", "ScorecardView.tsx", "api/evaluations.py", "models/rubric.py", "test_evaluations.py"),
  )
)

#pagebreak()

= One-Time Setup (Day 1 Only)

Every member runs this once after I share the repo link:

```bash
# 1. Clone the repository
git clone https://github.com/<org>/project-08.git
cd project-08

# 2. Check out YOUR assigned feature branch (example: member A1)
git checkout feat/a1-editor-workspace

# 3. Verify you're on the correct branch
git branch
# * feat/a1-editor-workspace

# 4. Install dependencies
pip install -r requirements.txt    # backend
npm install                        # frontend (from frontend/ folder)
```

#warn-box[
  *Rule:* You only ever work on YOUR branch. Never check out someone else's branch or push to `develop` / `main` directly.
]

= Daily Git Workflow — Full Command Reference

Follow this exact sequence every working day. I'm sharing this so there's zero confusion.

== Step 1: Start of Day — Sync Your Branch

Before writing any code, pull the latest changes so you're not working on stale code:

```bash
# Make sure you're on YOUR branch
git checkout feat/<your-branch>

# Pull any changes I may have pushed to your branch (review feedback, fixes)
git pull origin feat/<your-branch>

# Sync with the latest squad integration branch to stay current
# Squad A members:
git pull origin team-a/integration --no-rebase

# Squad B members:
git pull origin team-b/integration --no-rebase
```

#warn-box[
  If you see a merge conflict at this step — *STOP*. Message me on the group. Do not try to resolve it yourself.
]

== Step 2: Work on Your Assigned Files Only

Code your slice. You should only be editing YOUR assigned files:

```
Example for A1:
  frontend/components/team_a/MonacoEditor.tsx
  backend/api/drafts.py
  backend/models/draft.py
  backend/tests/test_drafts.py
```

Run your tests locally before committing:

```bash
# Run your specific test file
pytest backend/tests/test_drafts.py -v

# Or run all tests to make sure nothing else broke
pytest backend/tests/ -v
```

== Step 3: Stage ONLY Your Files — Never Use `git add .`

```bash
# Check what you changed
git status

# Stage your specific files one by one
git add frontend/components/team_a/MonacoEditor.tsx
git add backend/api/drafts.py
git add backend/models/draft.py
git add backend/tests/test_drafts.py
```

#warn-box[
  *NEVER run:* `git add .` or `git add -A` — these will pick up files outside your slice and cause merge conflicts across the entire team.
]

== Step 4: Commit with a Proper Message

Use this format — `feat(<module>): <what you did>`:

```bash
git commit -m "feat(drafts): add auto-save endpoint with 5s debounce"
git commit -m "feat(drafts): create Draft SQLAlchemy model with timestamps"
git commit -m "fix(drafts): handle empty code body in save request"
git commit -m "test(drafts): add unit tests for POST /api/code/drafts"
```

#tip-box[
  *Tip:* Commit often. Small commits are better than one giant commit at the end of the day.
]

== Step 5: Push to Your Remote Branch

```bash
git push origin feat/<your-branch>
```

If this is your first push, use:
```bash
git push -u origin feat/<your-branch>
```

#pagebreak()

== Step 6: Open a Pull Request (When Your Slice is Ready)

Go to GitHub and create a PR:

#table(
  columns: (auto, 1fr),
  stroke: 0.4pt + rule-color,
  inset: 7pt,
  fill: (col, row) => if col == 0 { rgb("#f1f5f9") } else { none },
  [*PR Title*], [`feat(a1): Monaco Editor workspace with auto-save`],
  [*PR Target*], [Squad A: `team-a/integration` #h(8pt) | #h(8pt) Squad B: `team-b/integration`],
  [*PR Body*], [What you built (1--2 lines) + screenshot if UI + test output],
)

#v(4pt)

Or from terminal using GitHub CLI:

```bash
# Squad A example:
gh pr create --base team-a/integration \
  --title "feat(a1): Monaco Editor workspace with auto-save" \
  --body "Implements MonacoEditor.tsx + POST /api/code/drafts + Draft model.
          All tests passing."

# Squad B example:
gh pr create --base team-b/integration \
  --title "feat(b1): Auth system with JWT and RBAC" \
  --body "Implements AuthModal.tsx + POST /api/auth/login + User model.
          All tests passing."
```

*After PR is open:* I review the code, leave comments if needed, and merge it into the squad integration branch. You do NOT merge your own PR.

= If I Ask for Changes on Your PR

```bash
# 1. Make sure you're on your branch
git checkout feat/<your-branch>

# 2. Pull latest (in case I pushed a fix)
git pull origin feat/<your-branch>

# 3. Make the requested changes in your files

# 4. Stage, commit, push — same process
git add <your-changed-files>
git commit -m "fix(<module>): address review — <what you fixed>"
git push origin feat/<your-branch>

# The PR updates automatically. No need to open a new one.
```

= Rules — Read This Twice

#table(
  columns: (1fr, 1.4fr),
  stroke: 0.4pt + rule-color,
  inset: 7pt,
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  [*Rule*], [*Why*],
  [Never push to `develop` or `main`], [Only I merge into these branches],
  [Never use `git add .` or `git add -A`], [Picks up files outside your slice and causes conflicts],
  [Never check out someone else's feature branch], [Your work stays isolated on your branch],
  [Never force push (`git push --force`)], [Destroys history; message me if you're stuck],
  [Never resolve merge conflicts alone], [Tell me on the group — I'll handle it],
  [Commit messages follow `feat/fix/test(<module>):` format], [Keeps our git log clean and traceable],
  [Open PR to squad integration branch, not `develop`], [`team-a/integration` or `team-b/integration` only],
)

= My Integration Flow (Lead Only)

This is how I merge everything upward — team members don't need to do any of this:

```
feat/a1..a5 → PR → team-a/integration    (I review & merge)
feat/b1..b5 → PR → team-b/integration    (I review & merge)

team-a/integration ─┐
                     ├→ develop           (I merge both squads after testing)
team-b/integration ─┘

develop → main                            (Milestone releases only)
```

= Quick Troubleshooting

#table(
  columns: (1fr, 1.5fr),
  stroke: 0.4pt + rule-color,
  inset: 7pt,
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  [*Problem*], [*What to Do*],
  [I committed to the wrong branch], [Don't panic. Message me with the branch name and commit hash. I'll cherry-pick it.],
  [`git push` says rejected], [Run `git pull origin feat/<your-branch>` first, then push again.],
  [I see merge conflicts], [Do NOT resolve them. Run `git merge --abort` and message me.],
  [I don't see my branch], [Run `git fetch --all` then `git checkout feat/<your-branch>`.],
)
