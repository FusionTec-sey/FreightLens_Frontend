# Frontend Ergonomics Plan

## Evidence boundary

This guidance draws on Mataftsi et al., *Digital eye strain in young screen users: A systematic review* (Preventive Medicine, 2023; PMID 36977430):

- screen use beyond roughly four to five hours per day was associated with higher digital eye-strain symptom scores in the included evidence;
- poor ergonomic parameters during screen use were also associated with higher symptom scores;
- blue-blocking filters did not show evidence of preventing digital eye strain;
- the review judged the relevant evidence low to moderate quality and noted heterogeneous diagnostic criteria.

Source: https://pubmed.ncbi.nlm.nih.gov/36977430/

These findings inform product ergonomics; they do not establish that a particular FreightLens color, font, or component prevents a medical condition.

## FreightLens design guidance

1. **Optimize sustained-use workflows.** Reduce avoidable navigation, repeated data entry, and modal hopping in operational tasks. Preserve filters and drafts where practical so users can leave and resume work.
2. **Keep information readable.** Dense tables remain appropriate, but body text, controls, focus indicators, and row actions must remain legible at 100% and 125% browser zoom on the primary laptop viewport.
3. **Keep primary actions stable.** Headers, filters, table headers, and save/pagination actions should remain predictably positioned to reduce visual searching during repeated work.
4. **Avoid competing visual signals.** Reserve high-saturation colors and animation for status, warning, or action feedback. Do not add decorative motion to operational screens.
5. **Support user display preferences.** Light and dark modes must both meet the same readability and contrast expectations. Dark mode is a preference feature, not an eye-strain treatment.
6. **Do not market blue-light styling as protection.** Do not add a blue-blocking theme or claim that a color filter prevents digital eye strain.
7. **Do not force health interruptions.** Any future break reminder must be optional, non-blocking, and evaluated with actual FreightLens users before becoming a default.

## Verification checklist

- [ ] Complete the main workflow at 1280x720 and 1024x768 without body-level horizontal scrolling.
- [ ] Repeat at 125% browser zoom; labels, inputs, row actions, sticky headers, and pagination remain readable and reachable.
- [ ] Keyboard focus is visible and follows workflow order.
- [ ] Loading and background refresh do not cause layout shifts that make users visually reacquire controls.
- [ ] Repeated-entry screens preserve context after validation errors and recoverable API failures.
- [ ] Dark and light modes are checked independently; neither is described as providing a medical benefit.

## Implementation order

Apply this checklist whenever a frontend screen is already being changed. Do not launch a broad visual rewrite solely from this paper; validate improvements screen by screen with build checks and the approved browser walkthrough.
