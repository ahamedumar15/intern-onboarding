# LearnLanka — Ambiguity Hunt Log
**Date:** Tuesday, July 17, 2026
## Brief Reference

Source Requirements (Ambiguous phrases highlighted):

- Students must be able to search for tutors by subject, **grade**, language, and **price band**.
- Students must be able to book a **1-hour session** with a tutor and pay via card or eZ Cash.
- Tutors must be able to publish availability slots, accept or decline bookings, and cancel with at least **12 hours notice**.
- The platform must charge a 15% commission on every **completed session** and pay tutors weekly via bank transfer.
- Both parties must be able to rate each other (1-5 stars) and leave a **one-line comment** after the session.
- Tutor search results returned in under 800 ms at the 95th percentile from a **Sri Lankan ISP**.
- Privacy: comply with Sri Lanka Personal Data Protection Act 2022.
- Mobile-first product.
- Video calling outsourced to Daily.co or 100ms.

---

## Findings

| # | Quote | Why ambiguous | Clarification question | Priority |
|---|-------|---------------|------------------------|----------|
| 1 | "qualified tutors" | No definition is provided for what qualifies a tutor. | What qualifications or experience must a tutor have to be listed? | H |
| 2 | "vetted tutors" | The vetting process is not described. | Who performs tutor verification and what checks are required? | H |
| 3 | "grade" | Could refer to O/L, A/L, or specific school grades. | What values should be available in the grade filter? | H |
| 4 | "price band" | No pricing ranges are defined. | What price ranges should the search filters provide? | M |
| 5 | "1-hour session" | It is unclear whether exactly 60 minutes is mandatory or whether future extensions are allowed. | Must every booking be exactly 60 minutes in Version 1? | M |
| 6 | "12 hours notice" | Only tutor cancellation rules are mentioned. Student cancellation rules are missing. | What cancellation policy applies to students? | H |
| 7 | "completed session" | The conditions that make a session completed are not defined. | How does the system determine that a session has been completed? | H |
| 8 | "weekly via bank transfer" | The payout schedule is unspecified. | On which day and time should weekly payouts be processed? | M |
| 9 | "one-line comment" | Character limits and validation rules are not provided. | What is the maximum length allowed for review comments? | L |
| 10 | "99.5% monthly uptime" | Planned maintenance handling is unclear. | Should scheduled maintenance count against uptime calculations? | M |
| 11 | "200 simultaneous video sessions" | Session quality expectations are not defined. | What video quality must be maintained during peak usage? | M |
| 12 | "deletion request flow" | Processing timelines and approval criteria are not defined. | What is the required timeframe for handling deletion requests? | H |
| 13 | "mobile-first product" | It does not explicitly state whether native apps are required. | Will Version 1 be a responsive web application only? | M |
| 14 | "Daily.co or 100ms" | The final provider has not been chosen. | Which video provider should be used for implementation? | M |
| 15 | "rate each other" | Visibility, moderation, and editing rules are not specified. | Can users edit ratings after submission and when do ratings become visible? | M |

---

## Results Summary

| Metric | Target | Achieved |
|----------|----------|----------|
| Items found | 10+ | 15 |
| High-priority items | 3+ | 7 |
| Items convertible to test cases | 5+ | 15 |

---

## Top 3 Questions to Ask the Founders

1. What qualifications and verification process are required before a tutor can appear in search results?
2. What exact conditions determine whether a tutoring session is considered completed?
3. What is the booking, payment, refund, and cancellation workflow for both students and tutors?

---

## Reflection

### What kind of ambiguity tripped you up most?

The most challenging ambiguities were business-rule ambiguities. Terms such as "qualified tutor," "completed session," and "price band" appear simple but can be interpreted differently by stakeholders, developers, and testers. Without clear definitions, different team members may make different assumptions.

### Which question is most likely to change the architecture if answered?

The question about how a session is considered "completed" is most likely to impact the architecture. The answer affects payment processing, commission calculations, tutor payouts, dispute handling, reporting, and integration with the video conferencing provider. A different definition could require additional tracking, monitoring, or verification mechanisms throughout the system.