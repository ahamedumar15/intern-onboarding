# ADR-0003: Use Azure SQL Database as the Primary Data Store

## Status

Accepted (Date: 2026-08-06)

## Context

- GreenChit manages structured business data including claims, approvals, users, managers, audit logs, and payroll exports.
- Data relationships are important and require referential integrity.
- Finance records require strong consistency and transactional behaviour.
- Audit records must be retained for seven years.
- The development team is familiar with relational database concepts and SQL.
- We do not yet know the exact long-term growth rate of claim submissions.

## Decision

- We will use Azure SQL Database as the primary persistence layer.
- Claims, approvals, audit records, and export metadata will be stored in relational tables.
- Receipt images will be stored separately in Azure Blob Storage.
- Database access will use transactional operations where data consistency is required.

## Consequences

### Easier

- Strong ACID transaction support.
- Relational modelling naturally fits claims and approval workflows.
- SQL querying simplifies reporting and payroll exports.
- Team members can leverage existing SQL knowledge.

### Harder

- Schema migrations must be managed carefully.
- Scaling extremely large workloads may require partitioning or optimization.
- Changes to the data model require more planning than schema-free solutions.

### Different

- The solution emphasizes consistency and data integrity rather than maximum flexibility.

## Alternatives Considered

- **Azure Cosmos DB** — Rejected because claim approvals, audit trails, and payroll exports are highly relational and benefit from transactional consistency.
- **MongoDB** — Rejected because the business workflow relies heavily on structured relationships and reporting queries that are easier to implement with a relational database.