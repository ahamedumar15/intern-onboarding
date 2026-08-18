# ADR-0002: Host GreenChit on Azure App Service

## Status

Accepted (Date: 2026-08-06)

## Context

- GreenChit is an internal business application with a limited user base.
- The solution must achieve 99.9% availability during business hours.
- The system consists of a React frontend and a single API service.
- Time-to-market and operational simplicity are important.
- Hosting must integrate easily with Azure services and Microsoft Entra ID.
- We do not yet know whether future growth will require independent service scaling.

## Decision

- We will deploy the React application and GreenChit API using Azure App Service.
- The application will initially follow a modular monolithic architecture.
- Separate App Service instances will host the frontend and backend.
- Scaling will be handled using App Service scaling capabilities when necessary.

## Consequences

### Easier

- Faster deployment and operational setup.
- Lower infrastructure cost.
- Simpler monitoring, networking, and troubleshooting.
- Reduced DevOps complexity for a small team.

### Harder

- Independent scaling of specific business capabilities is limited.
- Large future feature growth may eventually require architectural refactoring.
- All application components are deployed together.

### Different

- The architecture prioritizes simplicity and delivery speed over maximum scalability.

## Alternatives Considered

- **Azure Container Apps** — Rejected because it introduces additional operational complexity, container management, networking configuration, and higher deployment overhead for the current project size.
- **Azure Kubernetes Service (AKS)** — Rejected because it is unnecessarily complex and costly for the expected workload and team experience level.