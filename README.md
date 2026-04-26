# LabMind – AI-Assisted Experiment Planning for Scientists

LabMind is a web application that turns free‑text scientific ideas into **lab‑ready experiment plans** in minutes. It combines literature quality control, detailed protocol generation, materials and budget planning, and timeline visualization into a single end‑to‑end workflow for researchers and lab teams. [web:158][web:155]

> From hypothesis to protocol, suppliers, budget, timeline, and exportable documentation — all in one place.

---

## Table of Contents

1. [Overview](#overview)  
2. [Core Features](#core-features)  
3. [Architecture](#architecture)  
4. [Key Workflows](#key-workflows)  
5. [Self-Learning and Feedback Loop](#self-learning-and-feedback-loop)  
6. [Tech Stack](#tech-stack)  
7. [Local Development](#local-development)  
8. [Configuration](#configuration)  
9. [Limitations](#limitations)  
10. [Roadmap](#roadmap)  
11. [Contributing](#contributing)  
12. [License](#license)

---

## Overview

LabMind was built as a hackathon project to explore how **LLMs and retrieval** can support scientists in designing better experiments faster, while still aligning with good protocol-writing practice and research standards. [web:135][web:141]

The app:

- accepts a **natural-language hypothesis**,  
- parses it into a structured representation (intervention, model system, endpoints, assay, etc.),  
- runs a **literature and protocol quality check**,  
- generates a detailed, **“scientific cooking recipe”–style protocol**,  
- proposes materials, suppliers, and a Euro-based budget,  
- builds a timeline and **visual flowchart** of the experiment,  
- exports a complete **multi-page PDF report** and **XLSX supplier/budget sheet**,  
- and supports a **devil’s-advocate review and scientist review loop** that improves the plan and is stored as feedback for future runs. [web:135][web:141][web:158]

---

## Core Features

### 1. Hypothesis Parsing

- Free-text hypothesis input with example hypotheses for microbiology, oncology, neuroscience, and diagnostics.  
- Parsing into structured fields: intervention, model system, primary endpoint, mechanism, control condition, assay method, duration, and notes. [web:158]  
- All key text fields in the “Parsed Hypothesis” view are editable and use resizable textareas for comfortable editing.

### 2. Literature Quality Control (QC)

- Retrieval across scientific sources (e.g., PubMed, protocols.io, Semantic Scholar, supplier and protocol repositories) via a search/orchestration layer. [web:138][web:158]  
- Novelty signal: “Not found”, “Similar work exists”, or “Exact match found”.  
- For the top references, LabMind displays a short “Why this matches” explanation that ties back to the user’s hypothesis (intervention, model, assay, mechanism). [web:158]

### 3. Detailed Experiment Plan

The **Experiment Plan** view aggregates:

- a structured hypothesis summary and QC outcome  
- a detailed protocol, materials list, budget estimate, timeline, and validation strategy. [web:135][web:141]

The protocol can be shown in two modes:

- **Standard View** – concise step list  
- **Detailed Recipe View** – step-by-step “scientific cooking recipe” format with, per step:
  - Objective  
  - Step-specific materials  
  - Concrete actions  
  - Parameters (concentration, volume, temperature, duration, etc.)  
  - Checkpoints and expected observations  
  - Common failure modes and troubleshooting hints  
  - Safety notes when relevant  
  - Evidence/parameter confidence  

Enumeration is normalized so each major step has a single, clean step number (no double numbering).

### 4. Materials, Suppliers, and Budget (EUR)

- Materials list with item, supplier, catalog number, purpose, quantity estimate, and confidence (confirmed / estimated / inferred).  
- Budget breakdown per category (materials, consumables, kits, cell lines, equipment, labor), with totals in **EUR (€)**.  
- A “To order” checklist for items needing manual follow-up.

### 5. Timeline and Flowchart

- Timeline of phases (ordering, prep, treatment, incubation, readout, analysis, validation), including simple dependency logic.  
- **Flowchart tab** with a Mermaid-based visual workflow of the main protocol stages, including optional branches for treatment vs. control, QC checkpoints, and repeat-if-failed loops. [web:137][web:140][web:143]  
- Flowchart can be downloaded as SVG and is embedded as a dedicated page in the exported PDF.

### 6. Devil’s Advocate & Scientist Review

- A **Devil’s Advocate** panel that critiques the plan (risks, assumptions, missing controls, unrealistic budgets, weak validation, etc.) and proposes corrections. [web:158]  
- One-click option to **apply DA findings as corrections** and regenerate an improved plan.  
- A **Scientist Review** screen where human reviewers can add their own corrections and improvements.  
- Mixed mode: DA suggestions are pre-filled into the Scientist Review form and can be edited or rejected.

### 7. Self-Learning from Prior Plans

- LabMind stores high-quality, reviewed plans and their corrections (both DA-based and human-based) in a local memory bank. [web:131][web:130]  
- Before generating a new plan, the app retrieves:
  - similar prior plans,  
  - relevant corrections, and  
  - recurrent “patterns” (e.g., common missing controls, better parameterization).  
- These are injected into generation prompts as **few-shot examples / learned patterns**, so second and third runs for similar experiments become more realistic and standards-aligned. [web:131][web:130][web:158]

### 8. Export

- **Full report PDF**:
  - Cover, hypothesis, parsed fields, QC, detailed protocol, materials & supply chain, budget, timeline, flowchart, validation, standards compliance, DA summary, and references.  
  - Improved line spacing and section spacing for readability; URLs rendered on dedicated lines with clickable links. [web:121]  
- **XLSX**:
  - Materials & suppliers sheet  
  - Budget sheet with Euro formatting  
  - Procurement checklist for open items  
  - Sources sheet with structured references  
- Plain-text plan summary for quick sharing.

---

## Architecture

At a high level, LabMind consists of:

- **Frontend** – single-page app generated with Lovable (TypeScript/JavaScript + a component framework)  
- **AI / Orchestration**:
  - LLM calls for parsing hypotheses, summarizing QC, generating protocols, DA reviews, and improved plans  
  - Retrieval calls to literature and protocol/supplier sources via a search layer [web:138][web:158]  
  - Mermaid for flowcharts, jsPDF for report export, SheetJS for XLSX [web:137][web:140][web:143][web:121][web:104]  
- **Self-learning Memory**:
  - In-browser storage of prior plans, corrections, and patterns, used as few-shot context for future runs [web:131][web:130]

Check the `src/` directory for the current component and service layout.

---

## Key Workflows

### 1. From Idea to Plan

1. Enter a hypothesis or choose an example on the landing page.  
2. LabMind parses and displays the structured hypothesis; user can edit all parsed fields.  
3. Literature QC runs and returns novelty signal + key references + “Why this matches” explanations. [web:158]  
4. LabMind generates an initial plan: protocol, materials, budget, timeline, validation, and flowchart.

### 2. Review and Improvement

1. Devil’s Advocate analysis critiques the plan and suggests corrections.  
2. User can:
   - Apply DA corrections automatically, or  
   - Open Scientist Review and add their own corrections.  
3. The app regenerates an improved plan using:
   - the current plan,  
   - corrections, and  
   - relevant prior plans and patterns from memory. [web:131][web:130]  
4. The improved plan becomes the default view; earlier versions remain accessible via revision history.

### 3. Export and Handoff

1. Generate the **Full Report PDF** for documentation or review.  
2. Export **XLSX** for procurement and budget tracking.  
3. Download the **flowchart SVG** for presentations, slides, or lab wikis. [web:137][web:140][web:143]

---

## Tech Stack

Adjust if needed to reflect the actual code:

- **Language**: TypeScript / JavaScript  
- **Framework**: Lovable-generated SPA (likely React / Vite under the hood)  
- **Styling**: CSS with design tokens, light/dark mode  
- **Diagrams**: Mermaid (flowcharts) [web:137][web:140][web:143]  
- **PDF Export**: jsPDF + AutoTable [web:121]  
- **Spreadsheet Export**: SheetJS (XLSX) [web:104]  
- **AI / Retrieval**:
  - Large language model API for parsing, planning, review  
  - Retrieval/search for PubMed, Semantic Scholar, protocols.io, and supplier/protocol sources [web:138][web:158]

---

## Local Development

> Note: the exact commands may differ; adjust if your `package.json` uses different scripts.

```bash
# 1. Clone the repository
git clone https://github.com/MESSIAS96/LabMind.git
cd LabMind

# 2. Install dependencies
npm install   # or pnpm install / yarn

# 3. Configure environment
cp .env.example .env   # if present
# Fill in API keys (LLM, search, etc.) as described below

# 4. Run the dev server
npm run dev

# 5. Open in browser
# Vite default:
http://localhost:5173
```

---

## Configuration

Typical environment variables (adapt to your actual `.env`):

- `VITE_OPENAI_API_KEY` – LLM provider key  
- `VITE_SEARCH_API_KEY` – search / retrieval provider key  
- `VITE_APP_BASE_URL` – base URL for the frontend  

If the repo includes an `.env.example`, follow that as the authoritative reference.

---

## Limitations

- LabMind **does not replace** expert scientific judgment; plans should always be reviewed by qualified scientists before execution. [web:155][web:158]  
- Cost estimates are approximate and must be confirmed with suppliers.  
- Memory of prior plans is currently local to the running instance/browser and not shared globally unless explicitly configured.  
- Export layouts are optimized for typical experiment sizes; extremely large protocols or diagrams may require further tuning.

---

## Roadmap

Planned or potential future enhancements:

- Multi-user / team mode with shared memory and roles (PI, postdoc, PhD, technician).  
- Integration with electronic lab notebooks (ELN) or LIMS. [web:152]  
- Richer standards support (e.g., MIQE, ARRIVE, CONSORT extensions). [web:141][web:155]  
- More interactive editing of the flowchart and timeline.  
- Integration of real execution feedback (e.g., outcomes and troubleshooting logs) into the learning loop.

---

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repo  
2. Create a feature branch:  
   ```bash
   git checkout -b feature/my-improvement
   ```  
3. Make and commit your changes with clear messages  
4. Open a pull request with a description and, if possible, screenshots or GIFs  

For substantial changes, please open an issue first to discuss direction and scope.

---

## License

This project is licensed under the **MIT License** – see the [`LICENSE`](LICENSE) file for details.
