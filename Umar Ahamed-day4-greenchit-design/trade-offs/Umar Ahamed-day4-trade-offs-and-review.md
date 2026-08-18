# GreenChit — Trade-offs and Design Review

## Setup

- Two architectural options were evaluated:
  - **Option A:** Azure App Service Monolith
  - **Option B:** Azure Container Apps Split Services
- The evaluation focused on the quality attributes most important to GreenChit:
  - Fast delivery
  - Low operational cost
  - Maintainability
  - Scalability
  - Operational simplicity
  - Security consistency

---

## Trade-off Analysis

| Quality Attribute | Option A: App Service Monolith | Option B: Container Apps Split Services | Why |
|------------------|-------------------------------|-----------------------------------------|-----|
| Time-to-first-deploy | 5 | 2 | App Service requires minimal infrastructure setup, while Container Apps require containerization, networking, and additional deployment configuration. |
| Cost (low spend) | 5 | 2 | App Service has lower hosting and operational costs. Container Apps introduce multiple services and potentially higher consumption costs. |
| Operability for 10-person team | 4 | 3 | A monolith is easier to monitor, troubleshoot, and maintain with limited engineering resources. |
| Independent deploy | 1 | 5 | Container Apps allow each service to be deployed independently. A monolith requires redeploying the entire application. |
| Future scaling | 2 | 5 | Container Apps can scale specific services independently. Monolith scaling affects the whole application. |
| Authn/Authz consistency | 4 | 3 | A centralized monolith makes security implementation and authorization rules easier to manage consistently. |
| Availability management | 4 | 3 | Fewer moving parts reduce failure points and operational complexity. |
| Audit and compliance simplicity | 5 | 3 | Centralized logging and audit trail management are easier within a monolithic architecture. |

### Total Score

| Option | Score |
|----------|----------|
| Azure App Service Monolith | **30** |
| Azure Container Apps Split Services | **26** |

---

## Results Summary

| Metric | Target | Achieved |
|----------|----------|----------|
| Quality Attributes Scored | 6+ | 8 |
| Cells with Written Justification | 12 | 16 |
| Decision-Affecting Attributes Identified | 2-3 | 3 |
| Architecture Options Evaluated | 2 | 2 |
| Final Decision Produced | Yes | Yes |

---

## Decision and Rationale

### Selected Option

**Option A: Azure App Service Monolith**

### Key Decision Drivers

#### 1. Time-to-first-deploy

GreenChit is a relatively small internal business application. Delivery speed is more valuable than early optimization for large-scale distributed deployments.

#### 2. Cost

The application serves internal company users with predictable workloads. Running multiple independently deployed services would increase infrastructure and operational costs without delivering proportional business value.

#### 3. Operability

A small engineering team can manage a monolithic deployment more effectively. Troubleshooting, monitoring, deployment, and incident response are significantly simpler.

### Why Option B Lost

Although Container Apps provide superior scalability and independent deployments, the additional complexity is difficult to justify given the expected workload and team size.


---

## Final Recommendation

Based on the trade-off analysis, **Azure App Service Monolith** is the recommended architecture for GreenChit. The deciding factors were:

- Faster delivery
- Lower operational cost
- Simpler operations for a small team

The design should be revisited if future business growth requires independent service deployment or fine-grained scaling capabilities.
