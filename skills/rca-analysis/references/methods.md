# Root cause analysis methods

Choose one primary method and add another only when it resolves a real gap.

## 5 Whys

Use for a mostly linear causal chain with accessible evidence. Branch the chain when an answer has multiple independent causes. Stop at a supported, controllable system condition; do not force exactly five questions.

## Cause categories

Use for broad discovery when causes may span people, process, technology, environment, measurement, or dependencies. Treat the categories as prompts, then test each candidate against evidence.

Useful software and service categories include:

- Code and configuration
- Infrastructure and dependencies
- Process and change management
- Observability and detection
- Access, knowledge, and tooling
- Workload, capacity, and environment

## Change analysis

Use when the failure began after a known healthy period. Compare working and failing states across code, configuration, data, infrastructure, traffic, dependencies, permissions, and operating procedures.

Do not assume the most recent change caused the failure. Require a plausible mechanism and supporting evidence.

## Fault-tree reasoning

Use when the top-level failure can result from multiple combinations of events. Represent alternatives with OR relationships and jointly required events with AND relationships. Use quantitative probabilities only when the inputs are defensible.

## Confidence rubric

- **High:** Direct evidence supports the mechanism, temporal order is clear, and competing explanations were tested.
- **Medium:** Evidence is consistent and the mechanism is plausible, but an important verification is missing.
- **Low:** The explanation is primarily inferential or depends on unverified assumptions.

## Action quality checks

Reject an action when it lacks an owner, deadline, measurable completion state, or effectiveness test. Ask whether the action prevents recurrence, reduces impact, improves detection, or merely documents intent.
