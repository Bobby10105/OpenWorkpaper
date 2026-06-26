## 2025-02-18 - [Mitigate user enumeration timing attack in login route]
**Vulnerability:** A timing attack in the login route allowed attackers to enumerate valid usernames. The application only executed the computationally expensive `bcrypt.compare` operation if the requested username was found in the database.
**Learning:** Always normalize computational time for sensitive operations like authentication. Even if early exits seem efficient, they can leak state information via response timing.
**Prevention:** Perform dummy operations (e.g., comparing the input password against a hardcoded valid hash) when the real operation cannot be performed (e.g., when a user is not found) to equalize response times across code paths.
