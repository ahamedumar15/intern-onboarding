# LearnLanka — Requirements Document
**Date:** Tuesday, July 14, 2026

## 1. Problem Statement

Students preparing for Sri Lanka's O/L and A/L examinations need a reliable and convenient way to find qualified tutors based on their subject, language, schedule, and budget preferences. LearnLanka aims to provide a mobile-first platform where students can easily search for tutors, book one-to-one online sessions, make secure payments, and attend classes, while tutors can manage their availability, accept bookings, receive payments, and build their reputation through ratings and reviews.

---

## 2. Personas

### Persona 1: Student (O/L or A/L Candidate)

**Profile**
- Age: 15–19
- Primarily uses an Android smartphone
- Studies for GCE O/L or GCE A/L examinations

**Goals**
- Find suitable tutors quickly
- Compare tutors by subject, language, ratings, and price
- Book lessons at convenient times
- Pay securely online
- Improve exam performance

**Frustrations**
- Difficulty finding trusted tutors
- Unclear tutor availability
- Lack of transparent pricing
- Slow responses from tutors

---

### Persona 2: Tutor

**Profile**
- Qualified teacher, lecturer, or private tutor
- Teaches one or more O/L or A/L subjects
- Conducts lessons online

**Goals**
- Attract students consistently
- Publish and manage availability easily
- Receive bookings efficiently
- Get paid accurately and on time
- Build a positive reputation

**Frustrations**
- Last-minute cancellations
- Unpredictable income
- Administrative work managing schedules
- Difficulty reaching new students

---

### Persona 3: Operations Admin

**Profile**
- LearnLanka staff member responsible for platform operations

**Goals**
- Monitor platform activity
- Handle user support issues
- Manage tutor verification status
- Monitor payments and payouts
- Support regulatory compliance

**Frustrations**
- Booking disputes
- Payment-related issues
- Incomplete user information
- Compliance risks

---

## 3. Functional Requirements

### Student Functional Requirements

**FR-S1**  
The system shall allow a student to create and maintain an account.

**FR-S2**  
The system shall allow a student to search for tutors by subject.

**FR-S3**  
The system shall allow a student to filter tutors by grade level (O/L or A/L).

**FR-S4**  
The system shall allow a student to filter tutors by teaching language (Sinhala, Tamil, English).

**FR-S5**  
The system shall allow a student to filter tutors by price band.

**FR-S6**  
The system shall display tutor profile information including subjects taught, teaching language, hourly rate, rating, and available time slots.

**FR-S7**  
The system shall allow a student to view tutor availability before requesting a booking.

**FR-S8**  
The system shall allow a student to request a one-hour tutoring session for an available time slot.

**FR-S9**  
The system shall allow a student to pay for a booking using a payment card.

**FR-S10**  
The system shall allow a student to pay for a booking using eZ Cash.

**FR-S11**  
The system shall inform a student when a booking request is accepted.

**FR-S12**  
The system shall inform a student when a booking request is declined.

**FR-S13**  
The system shall inform a student when a confirmed booking is cancelled.

**FR-S14**  
The system shall provide a student with access information for a booked online session.

**FR-S15**  
The system shall allow a student to rate a tutor from 1 to 5 stars after a completed session.

**FR-S16**  
The system shall allow a student to leave a single-line review comment after a completed session.

---

### Tutor Functional Requirements

**FR-T1**  
The system shall allow a tutor to create and maintain a tutor profile.

**FR-T2**  
The system shall allow a tutor to specify the subjects they teach.

**FR-T3**  
The system shall allow a tutor to specify the languages in which they provide lessons.

**FR-T4**  
The system shall allow a tutor to publish available teaching time slots.

**FR-T5**  
The system shall allow a tutor to update or remove future availability slots.

**FR-T6**  
The system shall notify a tutor when a booking request is received.

**FR-T7**  
The system shall allow a tutor to accept a booking request.

**FR-T8**  
The system shall allow a tutor to decline a booking request.

**FR-T9**  
The system shall allow a tutor to cancel a booking only when the scheduled start time is at least 12 hours away.

**FR-T10**  
The system shall prevent a tutor from cancelling a booking less than 12 hours before the scheduled start time.

**FR-T11**  
The system shall display completed sessions associated with a tutor.

**FR-T12**  
The system shall display earnings generated from completed sessions after platform commission deduction.

**FR-T13**  
The system shall allow a tutor to rate a student from 1 to 5 stars after a completed session.

**FR-T14**  
The system shall allow a tutor to leave a single-line review comment after a completed session.

---

### Operations Admin Functional Requirements

**FR-A1**  
The system shall allow an operations administrator to view user accounts.

**FR-A2**  
The system shall allow an operations administrator to view booking records and booking status.

**FR-A3**  
The system shall allow an operations administrator to view payment transaction records.

**FR-A4**  
The system shall calculate a platform commission equal to 15% of the value of every completed session.

**FR-A5**  
The system shall calculate tutor payout amounts for each weekly payout cycle.

**FR-A6**  
The system shall maintain a record of tutor payout status.

**FR-A7**  
The system shall record and manage user consent required for personal data processing.

**FR-A8**  
The system shall support processing user personal-data deletion requests.

**FR-A9**  
The system shall allow an operations administrator to view ratings and review comments submitted by students and tutors.

---

### Platform Functional Requirements

**FR-P1**  
The system shall support one-to-one online video sessions for confirmed bookings.

**FR-P2**  
The system shall support user interfaces in Sinhala, Tamil, and English.

**FR-P3**  
The system shall record all booking-related events.

**FR-P4**  
The system shall record payment-related events.

**FR-P5**  
The system shall record consent, deletion-request, and payout-related events for audit purposes.

---

## 4. Non-Functional Requirements

| Category | Metric | Target | How We'll Measure It |
|----------|----------|----------|----------|
| Performance | Tutor search response time (95th percentile) | Less than 800 ms | Azure Application Insights and load testing |
| Availability | Successful responses from booking endpoint | 99.5% monthly uptime | Azure Monitor and synthetic monitoring |
| Scalability | Concurrent online tutoring sessions | Minimum 200 simultaneous sessions | Monitoring dashboards and load testing |
| Localization | Availability of UI strings in supported languages | 100% of user-facing strings available in Sinhala, Tamil, and English | Localization testing and UI audit |
| Mobile Compatibility | Mobile usage support | Fully functional on modern Android browsers | Device compatibility testing |
| Privacy Compliance | Consent capture | 100% of users must provide recorded consent before personal data processing | Consent audit logs |
| Privacy Compliance | Data deletion request handling | 100% of valid deletion requests processed within legal timeframes | Compliance audits and service records |
| Payment Security | Storage of payment card data | No payment card data stored on LearnLanka systems | Security audits and architecture reviews |
| Payment Compliance | Payment processing method | 100% of payments processed through PCI-DSS-compliant gateway | Payment integration audit |
| Reliability | Booking integrity | No double booking of the same tutor time slot | Automated testing and production monitoring |
| Financial Accuracy | Commission calculation accuracy | 100% accurate 15% commission deduction | Financial reconciliation reports |
| Financial Accuracy | Tutor payout accuracy | 100% of completed-session earnings included in weekly payout calculations | Payout reconciliation reports |
| Auditability | Critical business events logged | 100% of bookings, payments, payouts, consent actions, and deletion requests logged | Audit log review |

---

## 5. Assumptions

1. Students must register and log in before booking a tutor.
2. Tutors must register and maintain a profile before publishing availability.
3. Tutors have already completed a separate vetting process before joining the platform.
4. Every booking represents exactly one tutoring session lasting one hour.
5. A tutor can teach multiple subjects.
6. A tutor can support one or more teaching languages.
7. Tutor pricing is expressed as an hourly rate.
8. Students may only book currently available, unreserved time slots.
9. Weekly tutor payouts are calculated using completed sessions only.
10. Tutors are responsible for providing valid bank account details for payouts.
11. All times are displayed in Sri Lanka Standard Time.
12. Ratings and comments can only be submitted after session completion.
13. A completed session is eligible for commission calculation and tutor payment.
14. No session recording functionality is required for the first release.
15. Users will access the service primarily through mobile web browsers rather than native mobile applications.
16. Notifications may be delivered through email, SMS, or in-app mechanisms as determined during solution design.
17. The founders' reported contradictory expectations are not available in the brief and must be clarified before implementation.
18. LearnLanka is intended primarily for users located in Sri Lanka during the initial release.

---

## 6. Out of Scope

The following capabilities are explicitly excluded from Version 1:

1. Group classes involving multiple students in a single session.
2. Native Android applications.
3. Native iOS applications.
4. Recording and playback of tutoring sessions.
5. AI-powered tutor recommendations.
6. In-platform chat or messaging between students and tutors.
7. Assignment management and homework tracking.
8. Quizzes, examinations, and learning analytics.
9. Student attendance analytics beyond booking records.
10. Subscription plans and membership packages.
11. Physical or in-person tutoring sessions.
12. Integration with payment providers other than PayHere.
13. Integration with banking providers other than Sampath Vishwa for tutor payouts.
14. Social networking features such as following, sharing, or public posting.
15. Automated dispute-resolution workflows.
16. Marketing campaign management tools.