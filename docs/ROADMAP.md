# Roadmap to a real-world release

The current build is a complete, tested front end and analytics engine running on a synthetic subject. To ship it to real users, Soma needs the following work, in this order.

## 1. Real data ingestion
- [ ] Mobile companion app (React Native or Swift/Kotlin) reading **Apple HealthKit** and **Android Health Connect**
- [ ] CGM integrations (vendor APIs) and wearable OAuth integrations
- [ ] **FHIR R4/R5** import for health records, initially patient-mediated
- [ ] Replace `generateHistory()` with a repository layer that returns the same `Day[]` shape

## 2. Backend and accounts
- [ ] Authentication (passkeys and email), with per-user encrypted storage
- [ ] Sync service: an event log plus daily aggregates; offline-first on device
- [ ] Encrypt health data at rest and in transit; scope keys per user

## 3. Models
- [ ] Train the risk models on consented, labelled cohorts and replace the hand-set logistic weights
- [ ] Validate calibration (Brier, reliability curves) per demographic; publish model cards
- [ ] Personal baselines that adapt per user (Bayesian updating), with population priors for cold start
- [ ] Ask Soma: an LLM with tool calls into `engine/twin.ts`, with answers grounded in the twin and guardrails for medical questions

## 4. Privacy, safety and compliance
- [ ] Privacy policy and consent flows; data export and deletion
- [ ] **GDPR**, **India DPDP Act 2023** and **HIPAA** (if handling US clinical data)
- [ ] Clinical safety review of all copy; escalation paths for red-flag readings
- [ ] Regulatory position: keep claims to "wellness". Any diagnostic claim makes the product Software as a Medical Device.

## 5. Product quality
- [ ] Accessibility audit (VoiceOver, keyboard, contrast) and localisation
- [ ] End-to-end tests (Playwright) and visual regression
- [ ] Performance budgets in CI; error and usage telemetry, opt-in only
- [ ] Notifications and widgets for daily directives
