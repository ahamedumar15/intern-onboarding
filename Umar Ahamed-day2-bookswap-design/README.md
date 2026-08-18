# BookSwap Container Diagram Walkthrough

1. A member interacts with the React Native mobile application to browse, list, and borrow books.
   
2. The mobile app authenticates users through Microsoft Entra External ID and includes the JWT when calling the REST API over HTTPS.

3. The Node.js Express API on Azure App Service serves as the main backend and uses Azure SQL as the system of record for books, loans, borrow requests, and notifications.

4. Frequently accessed catalogue data is cached in Azure Cache for Redis to help achieve the search latency requirement, while book photos are stored in Azure Blob Storage instead of the database.

5. Notification and weekly digest email tasks are published asynchronously to Azure Service Bus, allowing the API to remain responsive even if Azure Communication Services Email is temporarily unavailable.