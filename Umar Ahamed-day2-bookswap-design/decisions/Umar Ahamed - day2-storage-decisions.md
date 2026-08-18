# BookSwap - Storage and Cache Decisions

## 1. Data Inventory

| Data Type | Example Record | Volume Estimate (1 Year) | Read/Write Ratio |
|------------|----------------|---------------------------|------------------|
| Book Listing | One record per listed book | ~50,000 books | Read-heavy |
| Member Profile | Member account information | ~10,000 members | Read-heavy |
| Borrow Request | Request to borrow a book | ~100,000 requests | Balanced |
| Loan Record | Active and completed loans | ~100,000 loans | Read-heavy |
| Borrower History | Historical loan records per book | ~100,000 records | Read-heavy |
| Notifications | In-app notification records | ~500,000 notifications | Read-heavy |
| Weekly Digest Jobs | Weekly email tasks | ~500 jobs | Write-heavy |
| Book Photos | JPEG/PNG images up to 5 MB | ~50,000 images | Read-heavy |
| Search Results | Frequently repeated catalogue queries | Dynamic | Read-heavy |

---

## 2. Storage Selection

| Data Type | Chosen Store | Why This Store | Why Not The Alternatives |
|------------|--------------|----------------|--------------------------|
| Book Listings | Azure SQL Database | Book records have structured fields and relationships to members, loans, and borrow requests. Foreign keys and relational queries are useful. | Cosmos DB adds flexibility that is not needed. Redis is not durable. Blob Storage is not suitable for structured data. |
| Member Profiles | Azure SQL Database | Relational data with strong consistency requirements and links to owned books and loans. | Document databases provide little benefit because member schema is stable. |
| Borrow Requests | Azure SQL Database | Transactional workflow requires consistency when requests are accepted or declined. | Cosmos DB could work, but relational joins simplify reporting and tracking. |
| Loan Records | Azure SQL Database | Loans need reliable status transitions (Out → Returned → Overdue). ACID transactions are important. | Redis is not a permanent store. Document DB offers no significant advantage. |
| Borrower History | Azure SQL Database | Historical reporting is relational and tied directly to loan records. | Keeping history in a separate document store would increase complexity. |
| In-App Notifications | Azure SQL Database | Notifications need persistence and user-specific retrieval. | Cache should not be the primary storage because data could be lost. |
| Book Photos | Azure Blob Storage | Designed for storing large binary files efficiently and cheaply. Supports scalable storage and direct file access. | Storing images in SQL would increase database size, backup costs, and query overhead. |
| Search Cache | Azure Cache for Redis | Provides very fast retrieval of repeated search results and popular listings. | SQL alone may struggle to consistently meet the 300 ms search target during peak usage. |
| Email Jobs | Azure Queue Storage / Service Bus | Supports asynchronous processing and retries. Keeps user actions independent from email delivery. | Processing email directly in API requests would violate the requirement that listing creation must succeed even if email is unavailable. |

### Source of Truth

| Data | Source of Truth |
|--------|----------------|
| Books | Azure SQL Database |
| Members | Azure SQL Database |
| Borrow Requests | Azure SQL Database |
| Loans | Azure SQL Database |
| Notification Records | Azure SQL Database |
| Photos | Azure Blob Storage |
| Cache Entries | Azure SQL Database (not Redis) |
| Email Digest Jobs | Azure SQL Database and Queue Messages |

**Important:** Redis is never the source of truth. If Redis becomes unavailable, the application should continue functioning by retrieving data from Azure SQL Database.

---

## 3. Cache Plan

### What is Hot Enough to Cache?

The catalogue search endpoint is the most read-heavy feature and has a response time requirement of under 300 ms.

The following data will be cached:

- Frequently searched book lists
- Recently added books
- Popular book detail pages
- Frequently accessed catalogue pages

### Example Cache Keys

```text
books:search:harrypotter
books:search:isbn:9781234567890
books:page:1:size:20
books:recent
```

### What Should Not Be Cached?

Borrow requests should not be cached because their status can change frequently and users expect real-time accuracy.

Active loan statuses should also be retrieved directly from Azure SQL Database to avoid displaying outdated information.

### Cache-Aside Pattern (Pseudocode)

```pseudo
function getBooks(searchQuery):

    cacheKey = "books:" + searchQuery

    result = Redis.get(cacheKey)

    if result exists:
        return result

    result = AzureSQL.query(searchQuery)

    Redis.set(
        cacheKey,
        result,
        TTL = 300 seconds
    )

    return result
```

### TTL Strategy

| Cached Item | TTL |
|-------------|------|
| Search Results | 5 minutes |
| Popular Book Details | 10 minutes |
| Recently Added Books | 2 minutes |

### TTL Rationale

- New books are not added every second.
- A small amount of staleness is acceptable for search results.
- Short TTL values reduce stale data while still improving performance.

### Cache Invalidation Strategy

Whenever a book is:

- Created
- Updated
- Marked unavailable
- Marked available again

The following steps occur:

```text
1. Update Azure SQL Database
2. Remove related Redis cache entries
3. Subsequent requests repopulate the cache
```

This ensures Azure SQL remains the source of truth.

---

## 4. Queue Plan

### Which Work Goes on a Queue and Why?

#### Borrow Request Notifications

When a member submits a borrow request:

```text
Borrow Request Created
        ↓
Queue Message
        ↓
Notification Worker
        ↓
Create In-App Notification
```

This allows notifications to be delivered asynchronously without slowing down user requests.

#### Weekly Digest Emails

Every week:

```text
Scheduler
      ↓
Queue Message
      ↓
Email Worker
      ↓
Azure Communication Services Email
```

This satisfies the requirement that email delivery is best-effort and does not block core application functionality.

### Why Use a Queue?

The requirements state:

> Listing creation must succeed even if the email service is down.

Using a queue ensures that:

- API requests remain fast
- External email failures do not impact users
- Failed operations can be retried
- Services remain loosely coupled

### What Happens if the Consumer is Down for 30 Minutes?

```text
Producer
    ↓
Queue
    ↓
Consumer Offline
```

Messages remain safely stored in the queue.

The API continues functioning normally because requests have already been accepted and persisted.

When the consumer becomes available:

```text
Consumer Restart
       ↓
Reads Pending Messages
       ↓
Processes Backlog
```

### Retry and Dead Letter Queue Strategy

```text
Attempt 1
Attempt 2
Attempt 3
Attempt 4
Attempt 5
```

If processing continues to fail:

```text
Move Message
      ↓
Dead Letter Queue (DLQ)
```

Operations staff can inspect, troubleshoot, and replay failed messages later.

---

## Final Design Summary

| Requirement | Design Choice |
|------------|--------------|
| Structured business data | Azure SQL Database |
| Book photos | Azure Blob Storage |
| Fast catalogue search | Azure Cache for Redis |
| Notifications | Queue + Worker |
| Weekly digest emails | Queue + Worker |
| Source of truth | Azure SQL Database and Azure Blob Storage |
| Performance target (<300 ms search) | Redis cache-aside pattern |
| Email service outage handling | Queue with retries and DLQ |
| Stateless backend design | State stored externally, not in application memory |

### Recommended Architecture

- Azure App Service
- Azure SQL Database
- Azure Cache for Redis
- Azure Blob Storage
- Azure Queue Storage / Azure Service Bus
- Azure Communication Services Email