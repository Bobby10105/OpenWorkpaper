## 2024-06-25 - Extracted DB Queries from Route Handlers
**Learning:** Large route handler functions (`GET`, `POST`, etc.) can become unwieldy when mixing authorization, validation, database fetching, data mapping, and response formatting.
**Action:** Extract database query logic (especially complex raw SQL queries and mapping/joining logic) into dedicated helper functions placed above the route handlers or in a separate file if reused. This simplifies the handler to focus on the HTTP lifecycle.
