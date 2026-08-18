# Receipt Categoriser — Feature Spec v0.1

## 1. Why

### Business Problem

GreenChit users currently select expense categories manually when submitting expense claims. This process is time-consuming, can lead to inconsistent categorisation, and increases review effort for approvers.

The Receipt Categoriser feature will automatically analyse an uploaded receipt and suggest the most appropriate expense category. This helps users complete claims more quickly while improving categorisation consistency across the platform.

### Business Outcome

- Reduce manual effort during claim submission.
- Improve consistency and accuracy of expense categorisation.
- Reduce approver review effort caused by incorrect categorisation.
- Capture categorisation data for future model evaluation and improvement.

### Success Metrics

- At least 80% of category suggestions are accepted without changes.
- Average claim submission time decreases by 20%.
- Suggestion latency remains below 4 seconds (p95).
- 100% of suggestions and overrides are logged for analysis.

---

## 2. Scope

### In Scope

- Accept a single uploaded receipt image and analyse its contents.
- Suggest one expense category from the approved category list.
- Display a confidence score and indicate when review is needed.
- Allow claimants to accept or override the suggested category.
- Log all suggestions and final user selections.
- Fall back to rule-based categorisation when the LLM service is unavailable.
- Enable or disable the feature using a feature flag.

### Affected Containers / Services

- GreenChit Claims API
- Claims Web Application
- Azure AI Document Intelligence
- Azure OpenAI Service (GPT-4.1 family)
- Azure App Configuration
- Azure Application Insights

---

## 3. Contract

### Inputs

- Claim ID
- Receipt image file

#### Validation Rules

- Supported formats: JPEG, PNG
- Maximum file size: 10 MB
- Claim ID must reference an existing claim

### Outputs

```json
{
  "category": "Meals",
  "confidence": 0.87,
  "source": "llm"
}
```

#### Category Enum

```text
Meals
Travel
Lodging
Office Supplies
Other
```

#### Output Rules

- Confidence must be between 0.0 and 1.0.
- Confidence below 0.60 must be displayed as "Needs review".
- Source must be either:
  - "llm"
  - "rule-based"

### Errors

#### 400 Bad Request

Returned when:
- Claim ID is missing.
- Receipt image is missing.
- Unsupported file type is uploaded.

Example:

```json
{
  "error": "Invalid receipt image"
}
```

#### 413 Payload Too Large

Returned when:
- Receipt image exceeds 10 MB.

Example:

```json
{
  "error": "Receipt image exceeds maximum file size"
}
```

#### 502 Bad Gateway

Returned when:
- OCR service is unavailable.
- LLM service is unavailable and fallback processing cannot complete.

Example:

```json
{
  "error": "Receipt processing service unavailable"
}
```

### Side Effects

- Emit Application Insights custom event:

```text
categoriser.suggested
```

- Log:
  - Claim ID
  - Suggested category
  - Confidence score
  - Suggestion source
  - Final category selected by claimant
  - Timestamp

---

## 4. Acceptance Criteria

### AC1: Successful Categorisation

**Given** a valid receipt containing meal-related purchases

**When** the claimant uploads the receipt

**Then** the system suggests the category "Meals"

**And** returns a confidence score between 0.0 and 1.0

**And** displays the suggestion within 4 seconds (p95)

---

### AC2: Low Confidence Review

**Given** a valid receipt

**When** the categoriser returns a confidence score below 0.60

**Then** the suggested category is displayed

**And** the UI displays "Needs review"

---

### AC3: User Override

**Given** a category suggestion has been generated

**When** the claimant selects a different category

**Then** the claimant's selected category is saved

**And** the original suggestion is logged

**And** the override is logged for evaluation purposes

---

### AC4: OCR Failure

**Given** an unreadable or corrupted receipt image

**When** OCR processing fails

**Then** the claimant sees a clear error message

**And** the suggested category defaults to "Other"

---

### AC5: LLM Fallback

**Given** Azure OpenAI experiences a transient outage

**When** a categorisation request is received

**Then** the system falls back to rule-based categorisation

**And** returns a category suggestion

**And** the response source is "rule-based"

---

### AC6: Suggestion Logging

**Given** a category suggestion is generated

**When** the response is returned

**Then** a `categoriser.suggested` event is recorded in Application Insights

**And** the category, confidence score, source, and claim ID are included

---

### AC7: Feature Flag Disabled

**Given** the Receipt Categoriser feature flag is disabled

**When** a claimant uploads a receipt

**Then** categorisation is skipped

**And** no category suggestion is shown

**And** claim submission continues normally

---

## 5. Examples

### Example 1 – Happy Path

#### OCR Output

```text
McDonald's
Big Mac Meal
French Fries
Coca-Cola
```

#### Response

```json
{
  "category": "Meals",
  "confidence": 0.94,
  "source": "llm"
}
```

---

### Example 2 – Travel Receipt

#### OCR Output

```text
Sri Lanka Railways
Colombo Fort
Kandy
Train Ticket
```

#### Response

```json
{
  "category": "Travel",
  "confidence": 0.91,
  "source": "llm"
}
```

---

### Example 3 – Ambiguous Receipt

#### OCR Output

```text
ABC Store
Coffee
Paper
Notebook
```

#### Response

```json
{
  "category": "Office Supplies",
  "confidence": 0.54,
  "source": "llm"
}
```

#### UI Behaviour

```text
Needs review
```

---

### Example 4 – Error Scenario

#### Input

```text
Corrupted image file
```

#### Response

```json
{
  "category": "Other",
  "confidence": 0.0,
  "source": "rule-based"
}
```

#### User Message

```text
Unable to read receipt. Please upload a valid image.
```

---

## 6. Out of Scope

The following capabilities are explicitly excluded from v0.1:

- Multi-receipt batch uploads
- Automatic claim submission without claimant confirmation
- Learning from claimant overrides (active learning)
- Multi-language receipt categorisation
- Receipt fraud detection
- Duplicate receipt detection
- Manual editing of OCR-extracted text
- Mobile offline categorisation

---

## 7. Open Questions

- Should future releases allow administrators to configure the confidence threshold used for review decisions?
- Do we want to use claimant overrides for model retraining in a future version?
- How long should categorisation logs be retained?
- Should confidence scores be visible to claim approvers as well as claimants?
- What rule-based logic should be prioritised when OCR quality is poor and confidence is low?6