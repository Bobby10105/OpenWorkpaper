# Security & Compliance Policy

OpenWorkpaper is designed with federal security standards in mind, specifically targeting compliance with **NIST SP 800-53** and **FISMA** requirements.

## Security Controls

### Transport Layer Security (TLS)
In accordance with **OMB M-15-13**, OpenWorkpaper is configured to be HTTPS-only. 
- **HSTS:** Enabled with a 2-year `max-age`.
- **Encryption:** All data in transit must be encrypted using FIPS-validated cryptographic modules (e.g., TLS 1.2+).

### Identity & Access Management
- **MFA Requirement:** Production deployments should integrate with an agency Identity Provider (IdP) supporting PIV/CAC (MFA) via SAML 2.0 or OIDC.
- **Session Management:** Cookies are marked as `HttpOnly`, `Secure`, and `SameSite=Lax`.

### Input Validation & XSS Protection
- **Automatic Sanitization:** All user-provided rich text is sanitized server-side (and client-side before persistence) using **DOMPurify**. This protects against Cross-Site Scripting (XSS) by scrubbing malicious scripts, event handlers (`onerror`, `onload`), and unsupported HTML tags.
- **Strict Content Security Policy (CSP):** Recommended for production deployments to further restrict the execution of unauthorized scripts.

### Vulnerability Management
- **Scanning:** The codebase is subject to regular Static (SAST) and Dynamic (DAST) analysis.
- **Reporting:** See "Reporting a Vulnerability" below.

---

## Reporting a Vulnerability

We take the security of OpenWorkpaper seriously. If you discover a security vulnerability, please **do not open a public issue**. Instead, follow the process below to report it privately.

### Private Reporting Process

Please report all security vulnerabilities by emailing **robertsandidge10@gmail.com**.

When reporting a vulnerability, please include:

1.  **A descriptive title** of the vulnerability.
2.  **Steps to reproduce** the issue (including proof-of-concept code, if possible).
3.  **The potential impact** of the vulnerability.
4.  **The version** of OpenWorkpaper you are using.

### Our Commitment

We will acknowledge receipt of your report within **48 hours** and provide a timeline for addressing the issue. Once a fix is developed and tested, we will issue a new release.

---

## Technical Compliance Checklist for Federal POCs

- [ ] **Database SSL:** Ensure the database connection string uses `sslmode=verify-full`.
- [ ] **SSO Integration:** Configure `SAML_ENTRYPOINT` and `SAML_CERT` (or OIDC equivalents).
- [ ] **Input Validation (SI-10):** Verify that all application endpoints leverage the built-in sanitization logic.
- [ ] **Log Ingestion:** Verify that `stdout` logs are being captured by your agency's SIEM (Splunk, etc.).
- [ ] **Environment Secrets:** Do not use `.env` files in production; use a FIPS-compliant secret manager (AWS Secret Manager, HashiCorp Vault).
