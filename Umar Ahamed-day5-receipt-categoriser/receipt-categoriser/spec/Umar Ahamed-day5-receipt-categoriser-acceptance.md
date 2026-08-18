# Receipt Categoriser — Acceptance Criteria

## AC-01 Happy Path: Clear Meal Receipt

**Given** a receipt image of a restaurant bill totalling LKR 2,400

**When** the claimant uploads it via `POST /claims/{id}/receipts/categorise`

**Then** the response is `200 OK`

**And** the response body contains:

```json
{
  "category": "Meals",
  "confidence": 0.70,
  "source": "llm"
}
```

**And** the confidence score is greater than or equal to `0.70`

**And** a `categoriser.suggested` Application Insights custom event is emitted within 5 seconds

---

## AC-02 Ambiguous Receipt

**Given** a receipt containing both food and stationery items

```text
Coffee
Notebook
Printer Paper
Sandwich
```

**When** the claimant uploads the receipt

**Then** the response is `200 OK`

**And** the response includes a valid category

**And** the response includes a confidence value between `0.0` and `1.0`

**And** if the confidence score is below `0.60`, the UI displays `Needs review`

---

## AC-03 LLM Unavailable — Fallback Mode

**Given** Azure OpenAI is returning `503 Service Unavailable`

**When** the claimant uploads a valid receipt

**Then** the response is `200 OK`

**And** the response contains:

```json
{
  "source": "rule-based"
}
```

**And** the confidence score is less than or equal to `0.50`

**And** the claimant still receives a category suggestion

**And** the response is returned within the 4-second p95 latency target

---

## AC-04 OCR Failure

**Given** a receipt image that Azure AI Document Intelligence cannot parse

**When** the claimant uploads the receipt

**Then** the response is `200 OK`

**And** the response contains:

```json
{
  "category": "Other"
}
```

**And** the claimant sees the message:

```text
Unable to read receipt. Please upload a valid receipt image.
```

**And** a `categoriser.suggested` event is recorded with category `Other`

---

## AC-05 Oversized Payload

**Given** a receipt image larger than 10 MB

**When** the claimant uploads the file

**Then** the response is `413 Payload Too Large`

**And** no category suggestion is returned

**And** the response contains:

```json
{
  "error": "Receipt image exceeds maximum file size"
}
```

---

## AC-06 PII Boundary

**Given** a receipt containing:

- Customer name
- Email address
- Credit card last four digits

**When** the receipt is processed

**Then** receipt processing remains within approved BISTEC Azure services

**And** the `categoriser.suggested` Application Insights event contains no customer name

**And** the event contains no email address

**And** the event contains no full card number

**And** only operational categorisation data is logged

---

## AC-07 User Override

**Given** the system suggests:

```json
{
  "category": "Travel",
  "confidence": 0.82
}
```

**When** the claimant changes the category to `Lodging`

**Then** the claim is saved with category `Lodging`

**And** the original suggestion is retained in evaluation logs

**And** the override action is recorded for future analysis

---

## AC-08 Feature Flag Disabled

**Given** the Receipt Categoriser feature flag is disabled in Azure App Configuration

**When** a claimant uploads a receipt

**Then** no categorisation request is performed

**And** no category suggestion is displayed

**And** normal claim submission continues successfully

---

## AC-09 Invalid File Type

**Given** a claimant uploads a PDF file

**When** the request is submitted

**Then** the response is `400 Bad Request`

**And** the response contains:

```json
{
  "error": "Invalid receipt image"
}
```

**And** no categorisation attempt is performed

---

## AC-10 Logging of Successful Suggestion

**Given** a category suggestion is successfully generated

**When** the response is returned to the claimant

**Then** an Application Insights custom event named `categoriser.suggested` is emitted

**And** the event contains:

- Claim ID
- Suggested category
- Confidence score
- Suggestion source
- Timestamp

**And** the event excludes all personally identifiable information