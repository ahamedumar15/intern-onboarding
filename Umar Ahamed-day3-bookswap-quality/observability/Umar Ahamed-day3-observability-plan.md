# BookSwap — Observability Plan

## Setup

### Logs

**Platform:** Azure Monitor Logs

**Retention Period:** 90 Days

**Log Events Captured**

- Authentication failures
- Authentication successes
- Book listing creation
- Borrow request creation
- Loan creation
- Loan return
- Application errors
- Dependency failures
- Rate-limit violations

**Required Fields**

- Timestamp
- Request ID
- Member ID
- Endpoint
- HTTP Status Code
- Operation Name

**PII Redaction Rules**

Before data is written to logs:

✅ Log

- Request ID
- Member ID
- Endpoint
- Status Code

❌ Do Not Log

- Passwords
- JWT tokens
- Email addresses
- Physical addresses
- Phone numbers
- Connection strings

---

### Metrics

**Platform:** Azure Application Insights

**Standard Metrics**

- Request Count
- Request Duration
- Failed Requests
- Availability
- CPU Usage
- Memory Usage

**Custom Metrics**

- Search Latency P95
- Listing Creation Success Rate
- Authentication Failure Count
- Redis Cache Hit Ratio
- Service Bus Queue Depth

---

### Traces

**Platform:** Application Insights Distributed Tracing

**Sampling Rate**

- 100% Error Traces
- 20% Successful Request Traces

**Trace Coverage**

Request Flow:

```text
Client
   ↓
Azure Front Door
   ↓
App Service
   ↓
Azure SQL
   ↓
Redis
   ↓
Service Bus
```

Used for:

- Root cause analysis
- Performance bottleneck detection
- Dependency failure investigation

---

## Observability Signals

### Metrics

| Signal | Source | What It Answers | Sample Query / Metric |
|----------|----------|----------|----------|
| Search Latency P95 | Application Insights | Are searches meeting the SLO? | `requests \| summarize percentile(duration,95)` |
| Listing Creation Success Rate | Application Insights | Are listings being created successfully? | `requests \| where name contains "POST /books"` |
| Availability | Application Insights | Is the API available? | Availability Percentage |
| Error Rate | Application Insights | Are users experiencing failures? | Failed Requests % |
| Redis Cache Hit Ratio | Azure Cache for Redis | Is caching effective? | Cache Hit Ratio |
| Service Bus Queue Depth | Azure Service Bus | Is background processing keeping up? | Active Messages |

---

### Logs

| Signal | Source | What It Answers | Sample Query |
|----------|----------|----------|----------|
| Authentication Failures | Azure Monitor Logs | Who is failing authentication? | `traces \| where customDimensions.event == "auth.failed"` |
| Loan Creation Audit Logs | Azure Monitor Logs | Who created a loan? | `traces \| where customDimensions.event == "loan.created"` |
| Loan Return Audit Logs | Azure Monitor Logs | Who returned a loan? | `traces \| where customDimensions.event == "loan.returned"` |
| Rate Limit Violations | Azure Monitor Logs | Is abuse occurring? | `traces \| where customDimensions.event == "rate.limit"` |

---

### Traces

| Signal | Source | What It Answers |
|----------|----------|----------|
| Search Request Trace | Application Insights | Where is time spent during search? |
| Loan Creation Trace | Application Insights | Which dependency caused delays? |
| SQL Dependency Trace | Application Insights | Are database calls slowing requests? |
| Redis Dependency Trace | Application Insights | Is cache latency affecting performance? |

---

## Results Summary

| Metric | Target | Achieved |
|----------|----------|----------|
| SLOs covered by an alert | 100% | 100% |
| Alerts with a runbook link | 100% | 100% |
| Dashboards for operations | 1 Health Dashboard, 1 Business Dashboard | 2 Dashboards |
| Critical services monitored | 100% | 100% |
| PII redaction coverage | 100% | 100% |

---

## Alert Proposal

| Alert | Condition | Severity | Notification | Runbook |
|---------|-----------|----------|--------------|----------|
| Search SLO Burn | P95 Search Latency > 800ms for 5 min | Sev2 | PagerDuty/Teams | reliability-runbook.md#failure-3 |
| Listings Endpoint Outage | Availability < 95% for 3 min | Sev1 | Pager + Teams | reliability-runbook.md#failure-1 |
| Listing Creation Failure Rate | Success Rate < 99.9% | Sev2 | Teams | reliability-runbook.md#failure-1 |
| Authentication Failure Spike | >100 failures in 5 min | Sev3 | Teams | security-review.md |
| Redis Unavailable | Cache Availability < 95% | Sev2 | Teams | reliability-runbook.md#failure-2 |
| SQL Dependency Failure | Dependency Failures >10/min | Sev1 | Pager + Teams | reliability-runbook.md#failure-1 |
| Service Bus Queue Backlog | Queue Depth >1000 Messages | Sev2 | Teams | reliability-runbook.md#failure-3 |
| Error Rate Spike | HTTP 5xx >1% for 5 min | Sev2 | Teams | reliability-runbook.md |

---

## Dashboards

### Operations Health Dashboard

Displays:

- API Availability
- Error Rate
- Search Latency P95
- SQL Dependency Health
- Redis Health
- Service Bus Queue Depth
- Active Alerts

### Business Dashboard

Displays:

- Books Listed Per Day
- Borrow Requests Per Day
- Active Loans
- Loan Returns
- Authentication Failures
- User Activity Trends

---

## SLO Coverage Mapping

| SLO | Alert Protecting It |
|---------|---------|
| Search 99% < 800ms | Search SLO Burn |
| Listings 99.9% Success Rate | Listing Creation Failure Rate |
| JWT Authentication Enforcement | Authentication Failure Spike |
| Outage Detection Within 3 Minutes | Listings Endpoint Outage |
| Search Works During Redis Failure | Redis Unavailable |
| Background Processing Reliability | Service Bus Queue Backlog |

---

## What We Are Deliberately NOT Alerting On

### 1. Individual 404 Responses

Reason:

- Users may request invalid resources.
- High volume would create alert fatigue.
- Better monitored through dashboards.

### 2. Single Authentication Failure

Reason:

- Users mistype passwords.
- Not actionable.
- Alert only when failures spike significantly.

### 3. Temporary CPU Spikes Below 5 Minutes

Reason:

- Normal during autoscaling.
- Would generate noise.
- Sustained high CPU is already covered by latency and availability alerts.

### 4. Low-Severity ZAP Findings

Reason:

- Missing headers or informational findings do not require immediate paging.
- Tracked through backlog and security reviews.

---

## Operational Rule

**Alert on Metrics → Debug with Logs → Root Cause with Traces**

This ensures Operations can confirm system health within 5 minutes while avoiding alert fatigue and maintaining compliance with the BookSwap quality, reliability, and security requirements.