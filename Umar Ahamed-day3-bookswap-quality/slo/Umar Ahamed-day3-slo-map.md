# BookSwap — SLI/SLO Map

## 1. NFR Inventory

| # | NFR | User-visible Behaviour |
|---|-----|------------------------|
| 1 | Catalogue search performance | Users can search books and receive results quickly, even during traffic spikes |
| 2 | Listing creation reliability | Users can successfully create listings without duplicates, even if retries occur |
| 3 | Authentication security | Only authenticated users can access protected resources |
| 4 | Outage detection | Operations team can detect and respond quickly to service outages |
| 5 | Audit logging | Important user actions and authentication failures are traceable for investigation |
| 6 | Availability during traffic spikes | System remains usable during the Sunday 10× traffic increase |
| 7 | Search resiliency | Search remains functional even when Redis cache is unavailable |
| 8 | Data privacy and access control | Members can only access their own personal and loan information |

---

## 2. SLI / SLO Table

| # | SLI Definition | Measurement Source | SLO Target | Window | Error Budget |
|---|----------------|-------------------|------------|---------|--------------|
| 1 | Percentage of catalogue search requests completed within 800 ms | Application Insights Request Duration Metric | 99% of search requests under 800 ms | Rolling 28 days | 1% |
| 2 | Percentage of successful listing creation requests | Application Insights Success Rate Metric | 99.9% successful listing creations | Rolling 28 days | 0.1% |
| 3 | Percentage of duplicate listing creation attempts prevented when using the same Idempotency Key | Application Insights + Audit Logs | 100% duplicate prevention | Rolling 28 days | 0% |
| 4 | Percentage of authenticated requests containing valid JWT tokens | Authentication Logs | 100% of protected endpoints require valid JWT | Rolling 28 days | 0% |
| 5 | JWT token expiry compliance | Authentication Service Logs | 100% of issued tokens expire within 1 hour | Rolling 28 days | 0% |
| 6 | Listings API availability | Application Insights Availability Tests | 99.95% availability | Rolling 28 days | 0.05% |
| 7 | Time taken to detect a complete listings endpoint outage | Azure Monitor Alert Timestamp | Alert generated within 3 minutes | Per Incident | 0 minutes beyond threshold |
| 8 | Percentage of search requests successfully served when Redis is unavailable | Application Insights Metrics | 95% successful search requests during cache outage | Rolling 28 days | 5% |
| 9 | Percentage of loan creation and return events logged with request ID and member ID | Azure Monitor Logs | 100% audit coverage | Rolling 28 days | 0% |
| 10 | Percentage of authorization checks correctly enforced for member-owned resources | Security Audit Reviews and Access Logs | 100% authorization enforcement | Rolling 28 days | 0% |

---

## 3. Error Budget Policy

- If the Catalogue Search SLO exceeds its 1% error budget, all non-critical feature development pauses until search performance is restored.

- If the Listing Creation Reliability SLO exceeds its 0.1% error budget, new releases affecting listing workflows are frozen and reliability improvements become the team's highest priority.

- Production deployments require approval from the Engineering Lead until the affected SLO is back within budget.

- The Engineering Lead and Product Owner jointly own the decision to pause feature work and prioritize reliability improvements.

---

## 4. Out of Budget Right Now

- The SLO I would be least confident about meeting today is the requirement that 99% of catalogue searches remain under 800 ms during a sustained 10× traffic spike. The current BookSwap design has not yet been load tested at that scale, so performance under peak traffic remains unverified.