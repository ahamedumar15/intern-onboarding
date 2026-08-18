# BookSwap — Reliability Runbook v0.1

## Failure 1: Azure SQL Primary Unavailable for 5 Minutes

### What the User Sees

- Search requests may be slow or fail.
- Users may be unable to create new listings.
- Loan creation and return operations may fail.
- Existing static content and cached data may still be accessible.

### Detection

**Azure Monitor Alerts**

- Azure SQL Database Availability < 99%
- SQL Connection Failure Count > 10 per minute
- HTTP 5xx Error Rate > 5% for 3 consecutive minutes
- Application Insights Dependency Failure Rate > 10%

### Mitigation in Design

#### Timeout

- Database connection timeout: **5 seconds**
- Query execution timeout: **10 seconds**

#### Retry with Exponential Backoff

For transient database failures:

- Retry 1: 1 second
- Retry 2: 2 seconds
- Retry 3: 4 seconds

Maximum retries: **3**

#### Circuit Breaker

Open circuit when:

- 5 consecutive SQL failures occur within 30 seconds

Circuit remains open:

- 60 seconds

Half-open state:

- Allow 1 test request before fully closing

#### Fallback

- Read-only search requests served from Redis cache if available.
- Listing creation temporarily unavailable until SQL recovers.
- Service Bus messages retained and processed after recovery.

### Manual Response (Who is Paged, What They Do)

**Who is Paged**

- On-call Software Engineer
- Team Lead

**Actions**

1. Confirm Azure SQL outage in Azure Portal.
2. Check Azure Service Health notifications.
3. Verify application retry and circuit breaker status.
4. Monitor dependency failures in Application Insights.
5. Confirm successful reconnection after recovery.
6. Verify no unprocessed Service Bus messages remain.

### Post-Incident Actions

- Review outage timeline.
- Update runbook if detection was delayed.
- Analyze affected requests and failed transactions.
- Validate database failover procedures.
- Schedule resilience testing for SQL outages.

---

## Failure 2: Azure Cache for Redis is Down

### What the User Sees

- Search results still work but may be slower.
- Increased response times during high traffic periods.
- Listing creation and authentication continue working normally.

### Detection

**Azure Monitor Alerts**

- Redis Cache Availability < 99%
- Cache Connection Failures > 20 per minute
- Cache Hit Ratio < 50%
- Search Latency > 800 ms for 5 minutes

### Mitigation in Design

#### Timeout

- Redis request timeout: **500 ms**

#### Retry with Exponential Backoff

- Retry 1: 250 ms
- Retry 2: 500 ms
- Retry 3: 1000 ms

Maximum retries: **3**

#### Circuit Breaker

Open circuit when:

- 10 cache failures occur in 1 minute

Open duration:

- 30 seconds

#### Fallback

- Bypass Redis completely.
- Serve search requests directly from Azure SQL.
- Continue application operation without cache dependency.

#### Bulkhead

Search operations use isolated connection pools so cache latency does not affect authentication or listing creation.

### Manual Response

**Who is Paged**

- On-call Software Engineer

**Actions**

1. Confirm Redis availability in Azure Portal.
2. Check cache connection metrics.
3. Verify application fallback to database.
4. Monitor database CPU and query response times.
5. Restore cache service.
6. Monitor cache repopulation after recovery.

### Post-Incident Actions

- Review cache sizing.
- Analyze cache hit ratio trends.
- Identify expensive search queries.
- Improve cache warm-up strategy.
- Conduct Redis failure simulation exercise.

---

## Failure 3: Sunday Tabloid Spike — 10× Sustained Traffic

### What the User Sees

- Slightly slower response times.
- Search and listing functions remain available.
- Some non-critical operations may be throttled.
- Users should still be able to create listings and perform loans.

### Detection

**Azure Monitor Alerts**

- Requests Per Second > 10× Baseline
- App Service CPU > 75% for 5 minutes
- Memory Usage > 80%
- Service Bus Queue Depth > 1,000 messages
- P95 Response Time > 800 ms
- HTTP 429 Rate Increasing

### Mitigation in Design

#### Autoscaling

Azure App Service Autoscale Rules:

- Scale out when CPU > 70% for 5 minutes
- Scale out when Memory > 75%
- Maximum instances: 10
- Minimum instances: 2

#### Queue-Based Load Leveling

Background operations use Azure Service Bus.

Examples:

- Notification sending
- Audit processing
- Image processing

If traffic spikes:

- Requests are queued and processed asynchronously.

#### Throttling

Azure Front Door Rate Limiting:

- 100 requests per minute per IP
- Return HTTP 429 when exceeded

#### Retry Configuration

For transient service failures:

- 1 second
- 2 seconds
- 4 seconds

Maximum retries: 3

#### Idempotency Keys

Listing creation requests require:

```http
POST /listings
Idempotency-Key: 7f82c1e4-91a2
```

If a user retries due to timeout:

- Only one listing is created.
- Duplicate requests return the original result.

### Manual Response

**Who is Paged**

- On-call Software Engineer
- Team Lead
- Operations Engineer

**Actions**

1. Confirm traffic spike through Application Insights.
2. Verify autoscaling is functioning correctly.
3. Monitor App Service CPU and memory.
4. Check Azure SQL resource utilization.
5. Monitor Redis performance.
6. Monitor Service Bus queue depth.
7. Increase instance limits if required.
8. Temporarily reduce non-essential background jobs if resources become constrained.

### Post-Incident Actions

- Review traffic patterns.
- Compare actual performance against SLO targets.
- Update autoscaling thresholds if required.
- Review rate-limiting effectiveness.
- Perform load testing using observed peak traffic.
- Document lessons learned and capacity planning changes.