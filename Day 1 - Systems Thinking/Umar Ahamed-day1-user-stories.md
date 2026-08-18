# LearnLanka — User Story Set v0.1
**Date:** Tuesday, July 17, 2026

## Story 1: Search for Tutors

**As a** Student  
**I want** to search and filter tutors by subject, grade, language, and price  
**So that** I can find tutors that match my learning needs and budget

### Acceptance Criteria
- **Given** a student is on the tutor search page **when** they select a subject and click search **then** matching tutors are displayed.
- **Given** search results are displayed **when** the student applies a grade filter **then** only tutors matching that grade are shown.
- **Given** search results are displayed **when** the student applies a language filter **then** only tutors teaching in that language are shown.
- **Given** search results are displayed **when** the student applies a price-band filter **then** only tutors within that price range are shown.

### INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

---

## Story 2: Book a Tutoring Session

**As a** Student  
**I want** to book an available one-hour tutoring session  
**So that** I can receive personalized learning support

### Acceptance Criteria
- **Given** a tutor has available time slots **when** the student selects a slot and requests a booking **then** a booking request is created.
- **Given** a booking request has been submitted **when** the tutor accepts it **then** the booking status changes to confirmed.
- **Given** a booking request has been submitted **when** the tutor declines it **then** the booking status changes to declined.
- **Given** a booking is confirmed **when** the student views the booking details **then** session access information is displayed.

### INVEST Self-Check
- [ ] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

**Note:** Depends on tutor availability and booking workflow.

---

## Story 3: Publish Availability

**As a** Tutor  
**I want** to publish available teaching slots  
**So that** students can request lessons at suitable times

### Acceptance Criteria
- **Given** a tutor is logged in **when** they create a future availability slot **then** the slot becomes visible to students.
- **Given** an availability slot exists **when** the tutor updates it **then** the updated slot is displayed.
- **Given** an unbooked availability slot exists **when** the tutor removes it **then** the slot is no longer available for booking.

### INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

---

## Story 4: Manage Booking Requests

**As a** Tutor  
**I want** to accept or decline booking requests  
**So that** I can manage my teaching schedule

### Acceptance Criteria
- **Given** a booking request is pending **when** the tutor accepts it **then** the booking status becomes confirmed.
- **Given** a booking request is pending **when** the tutor declines it **then** the booking status becomes declined.
- **Given** a booking is confirmed and starts in more than 12 hours **when** the tutor cancels it **then** the cancellation is successful.
- **Given** a booking is confirmed and starts within 12 hours **when** the tutor attempts to cancel it **then** the system prevents the cancellation.

### INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

---

## Story 5: Process Weekly Tutor Payouts

**As an** Operations Admin  
**I want** tutor earnings and commissions calculated automatically  
**So that** tutors are paid correctly each week

### Acceptance Criteria
- **Given** a tutoring session is marked as completed **when** the payout batch is generated **then** the platform deducts a 15% commission.
- **Given** completed sessions exist for a tutor **when** weekly payouts are calculated **then** the tutor's payable amount is generated.
- **Given** a payout request is sent to the banking service **when** processing succeeds **then** the payout status is recorded as completed.

### INVEST Self-Check
- [ ] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [ ] Small
- [x] Testable

**Note:** Depends on completed session data and external banking integration.

---

## Story 6: Fast Tutor Search Performance

**As a** Student  
**I want** search results to be returned quickly  
**So that** I can find tutors without unnecessary waiting

### Acceptance Criteria
- **Given** a student submits a tutor search request **when** the search is executed **then** results are returned within 800 milliseconds at the 95th percentile.
- **Given** a search request is successful **when** results are displayed **then** tutor name, rating, language, and hourly rate are shown.
- **Given** system monitoring is enabled **when** search performance is measured **then** latency metrics are recorded for reporting.

### INVEST Self-Check
- [x] Independent
- [x] Negotiable
- [x] Valuable
- [x] Estimable
- [x] Small
- [x] Testable

---