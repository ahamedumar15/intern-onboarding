# ADR-0004: Receipt Storage and Virus Scanning Strategy

## Status

Accepted (Date: 2026-08-06)

## Context

- GreenChit allows staff members to upload receipt images as evidence for reimbursement claims.
- Receipt files may contain malicious content, corrupted files, or unsupported formats.
- The system must support uploads of up to 10 MB per file and up to 5 files per claim.
- Receipt files must be stored reliably and remain accessible for audit and finance purposes.
- Privacy requirements restrict access to claim attachments to authorized users only.
- We do not yet know the future volume of receipt uploads or whether additional file formats will be required.

## Decision

- We will store all receipt files in Azure Blob Storage.
- The application will generate short-lived SAS (Shared Access Signature) URLs for secure upload and retrieval operations.
- Every uploaded receipt will undergo an antivirus scan before being marked as available to users.
- Files that fail virus scanning will be quarantined and excluded from the claim workflow.
- Only successfully scanned files will be associated with submitted claims.
- Receipt metadata will be stored in Azure SQL, while the file content remains in Blob Storage.

## Consequences

### Easier

- Azure Blob Storage provides scalable and cost-effective storage for receipt files.
- SAS URLs reduce the need for exposing storage credentials to users.
- Virus scanning reduces the risk of malicious files entering the system.
- Separation of metadata and file content keeps the database smaller and more efficient.

### Harder

- The upload workflow becomes more complex because files must be scanned before approval.
- Virus scanning introduces additional infrastructure, operational overhead, and potential processing delays.
- Failed scans require quarantine handling and user-facing error messages.

### Different

- Receipt uploads become a multi-step process instead of a direct file save.
- Claims may remain in a temporary state until all attached receipts pass validation.
- Storage and security concerns are handled separately from claim business logic.

## Alternatives Considered

- **Store Receipts Directly in Azure SQL** — Rejected because large binary files increase database size, backup costs, and query performance overhead.

- **Store Files in Blob Storage Without Virus Scanning** — Rejected because it introduces an unnecessary security and compliance risk by allowing potentially malicious files into the platform.

- **Store Files on Application Server Disk** — Rejected because it does not scale well, complicates backups, and creates availability concerns during application redeployments.