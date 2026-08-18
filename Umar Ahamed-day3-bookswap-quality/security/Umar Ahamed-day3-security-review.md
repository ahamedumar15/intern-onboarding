# BookSwap — Security Review

## Security Findings

| Category | Question | Finding | Severity | Mitigation |
|----------|----------|----------|----------|------------|
| Authentication | Is every non-public endpoint protected by JWT? | Most API endpoints require JWT, but implementation must enforce authentication on all routes except `/health`. Missing middleware on any route would expose data. | High | Apply JWT authentication middleware to all protected routes. Validate signature, issuer, audience, and expiration. |
| Authorization | Does every `/{id}` endpoint verify ownership? | Potential Broken Object Level Authorization (BOLA) risk. A user could access another user's resources if ownership checks are missing. Example: `GET /loans/123`. | High | Verify `loan.memberId == authenticatedUser.id` before returning data. Return HTTP 403 when ownership validation fails. |
| Injection | Are all DB queries parameterised? | Search and filtering endpoints may be vulnerable if SQL is built through string concatenation. | High | Use parameterised queries, prepared statements, and input validation. |
| Secrets | Where are connection strings stored? | Risk exists if connection strings or JWT secrets are stored in `.env` files or source control. | Medium | Store secrets in Azure Key Vault and access them through Managed Identity. |
| Transport Security | Is TLS enforced at Front Door? | If HTTP traffic is accepted, credentials and JWT tokens could be exposed. | High | Enforce HTTPS-only access. Enable TLS 1.2+ on Azure Front Door and redirect HTTP to HTTPS. |
| Rate Limiting | Are authentication and write endpoints protected? | Login and listing creation endpoints currently have no documented rate limits. Vulnerable to brute-force and abuse attacks. | Medium | Configure Azure Front Door rate limiting. Example: 10 login attempts/minute per IP and 100 write requests/minute per user. |
| PII Protection | What PII appears in responses, logs, or queues? | Member addresses, email addresses, and phone numbers could accidentally appear in logs, traces, or monitoring telemetry. | Medium | Mask PII before logging. Restrict logging to Member ID and Request ID only. |

---

# Broken Object Level Authorization (BOLA) Scenario

## Scenario

User A is authenticated and owns loan record `123`.

Request:

```http
GET /api/loans/123
Authorization: Bearer <token-user-a>
```

Attacker changes the URL:

```http
GET /api/loans/124
Authorization: Bearer <token-user-a>
```

If record `124` belongs to User B and the API only checks authentication, User A can access another member's loan history.

### Impact

- Exposure of loan history
- Exposure of member information
- Violation of privacy requirements
- Direct breach of business requirement:

> A member must never see another member's loan history or address.

### Mitigation

For every resource request:

```text
resource.ownerId == authenticatedUser.id
```

If ownership validation fails:

```http
403 Forbidden
```

---

# PII Review

## Sensitive Data Identified

| Data Type | Risk |
|------------|------|
| Member Address | Personal location disclosure |
| Email Address | Privacy breach |
| Phone Number | Contact information exposure |
| Loan History | Reading habits and activity exposure |
| JWT Token | Account takeover risk if leaked |

## Logging Rules

Allowed:

```text
RequestId=abc123
MemberId=456
Operation=LoanCreated
```

Not Allowed:

```text
Address=123 Main Street
Email=user@email.com
JWT=eyJhbGci...
```

### Recommendation

- Log Request ID
- Log Member ID
- Never log addresses
- Never log JWT tokens
- Never log connection strings

---

# Rate Limiting Review

## Sensitive Endpoints

### Login

```http
POST /auth/login
```

Risk:

- Credential stuffing
- Password guessing

Mitigation:

```text
10 requests/minute/IP
```

---

### Registration

```http
POST /auth/register
```

Risk:

- Bot account creation

Mitigation:

```text
5 registrations/minute/IP
```

---

### Listing Creation

```http
POST /listings
```

Risk:

- Spam listings
- Resource exhaustion

Mitigation:

```text
100 requests/minute/user
```

via Azure Front Door WAF policy.

---

# OWASP ZAP Baseline Scan Review

## Scan Target

Prism Mock Server generated from BookSwap OpenAPI specification.

## Example Findings Typically Reported

| Finding | Severity | Discussion |
|----------|----------|------------|
| Missing Security Headers | Medium | Responses may not include headers such as `X-Content-Type-Options` or `Content-Security-Policy`. |
| Information Disclosure via Headers | Low | Server technology information may be exposed. |
| Missing Rate Limiting Indicators | Medium | Public APIs may not expose protections against abuse. |
| Missing Authentication Documentation | Medium | Some endpoints may not clearly specify authentication requirements. |

### Mitigation

- Add recommended security headers.
- Remove unnecessary server-identifying headers.
- Document authentication requirements in OpenAPI.
- Configure Azure Front Door rate limiting.

---

