---
trigger: always_on
---

# Visual Implementation Plan & Progress Tracking Protocol

## Core Requirement
For any new feature, bug fix, refactor, or multi-step task:
1. **Mandatory Visual Artifact**:
   - You MUST generate a visual markdown artifact (e.g. `implementation_plan.md`) targeting the main center editor viewer (`UserFacing: true`, `RequestFeedback: true`).
   - Do NOT just dump code changes or plans solely in the chat stream.

2. **Structure of the Plan**:
   - **Reasoning & Logic**: Explain *why* this approach was selected, the root cause (if debugging), and the architectural thought process.
   - **Easy-to-Understand Examples**: Explain technical concepts in plain language using simple, real-world analogies and concrete examples.
   - **Visual Diagrams**: Include Mermaid flowcharts or sequence diagrams to clearly visualize data flow and component interactions.
   - **Traceable Checklist**: Provide a granular, phased checklist (Phase 1: Backend/Schema, Phase 2: Frontend/UI, Phase 3: Verification).
   - **Live Progress Tracking**: Update the plan as milestones are completed (`[ ]` -> `[x]`) so the user can follow along effortlessly.
