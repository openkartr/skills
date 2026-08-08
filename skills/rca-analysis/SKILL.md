---
name: rca-analysis
description: Conduct evidence-based root cause analysis for production incidents, recurring defects, operational failures, customer-impacting problems, and process breakdowns. Use when an agent needs to reconstruct a timeline, distinguish facts from hypotheses, apply 5 Whys or cause-category analysis, identify systemic causes, or propose measurable corrective and preventive actions.
---

# Root Cause Analysis

Produce a blameless, evidence-based analysis that explains both what happened and why existing controls did not prevent or detect it.

## Establish the investigation

1. Restate the problem as an observable deviation with scope, timing, expected behavior, and actual behavior.
2. Record customer, operational, financial, security, or compliance impact without exaggeration.
3. Define the evidence window and list available artifacts such as logs, alerts, deploys, tickets, metrics, interviews, and configuration changes.
4. Label every material statement as a fact, inference, or unknown.

Do not assign individual blame. Analyze decisions in the context of the information, incentives, safeguards, and system conditions present at the time.

## Reconstruct the timeline

Create a chronological table with timestamps, events, evidence, and confidence. Include:

- The last known healthy state
- Relevant changes before the incident
- The initiating event
- Detection and escalation
- Containment and recovery
- Verification of restored service

Resolve conflicting timestamps explicitly. Do not fill gaps with invented events.

## Develop and test causal hypotheses

Select the lightest method that fits the evidence. Read [references/methods.md](references/methods.md) when choosing between 5 Whys, cause categories, change analysis, or fault-tree reasoning.

For each plausible cause:

1. State the proposed causal mechanism.
2. Link it to concrete evidence.
3. Check temporal order: the cause must precede the effect.
4. Test a counterfactual: if the cause were absent, would the failure probably still occur?
5. Look for disconfirming evidence and competing explanations.
6. Assign confidence as high, medium, or low and explain why.

Stop a 5 Whys chain when the answer identifies a controllable system condition and further questioning would become speculation. Five is a prompt, not a required count.

## Classify findings

Separate findings into:

- **Trigger:** The event that initiated the failure.
- **Root cause:** A supported, controllable condition whose removal materially reduces recurrence.
- **Contributing factors:** Conditions that increased likelihood, duration, or impact.
- **Detection gap:** Why monitoring or review did not surface the problem earlier.
- **Recovery gap:** Why containment or restoration took as long as it did.

Avoid labels such as “human error,” “bad deployment,” or “insufficient testing” unless the analysis explains the system conditions behind them.

## Define corrective actions

Create actions at three levels:

- **Containment:** Reduce immediate risk or impact.
- **Prevention:** Remove or control the causal mechanism.
- **Detection:** Shorten time to discovery and diagnosis.

Each action must include an owner role, due date, priority, measurable completion criterion, and effectiveness check. Prefer durable controls over reminders or retraining alone.

## Produce the report

Use this structure:

```markdown
# Root Cause Analysis: [incident or problem]

## Executive summary
## Impact
## Scope and evidence
## Timeline
## Causal analysis
## Root cause and contributing factors
## Corrective actions
## Verification plan
## Unknowns and follow-ups
```

In the executive summary, distinguish confirmed causes from remaining hypotheses. If evidence is insufficient, say so and define the next evidence needed rather than forcing a conclusion.
