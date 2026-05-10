# OpenWorkpaper: Software & Security Compliance (Dependencies)

This document provides a comprehensive list of all software dependencies, libraries, and infrastructure requirements for OpenWorkpaper. This is intended for use by IT Administrators, Security Officers, and Compliance departments during the software approval process.

## 1. Core Platform Architecture
OpenWorkpaper is built on a minimal, security-hardened Linux base.

*   **Operating System**: Debian (via Docker `bookworm-slim`)
*   **Runtime**: Node.js 22 (LTS)
*   **Web Framework**: Next.js 16 (React 19)
*   **Database**: SQLite 3 (Default) or PostgreSQL
*   **ORM**: Prisma 7

## 2. Infrastructure Requirements
| Component | Requirement | Notes |
| :--- | :--- | :--- |
| **CPU** | 2 Cores (Minimum) | Optimized for containerized environments. |
| **RAM** | 4 GB (Recommended) | Supports concurrent audit sign-offs and document generation. |
| **Storage** | 20 GB+ | Dependent on volume of attachments and evidence files. |
| **Network** | Port 80/443 | Standard web traffic. |

## 3. Production Dependencies (Runtime)
The following libraries are included in the production build:

| Library | Purpose | License |
| :--- | :--- | :--- |
| `next` | Core Application Framework | MIT |
| `react` | UI Library | MIT |
| `@prisma/client` | Database ORM | Apache-2.0 |
| `isomorphic-dompurify` | XSS Protection & Input Sanitization | MIT |
| `@tiptap/core`, `@tiptap/react` | Modern Rich Text Editor (Modular) | MIT |
| `@tiptap/starter-kit` | Tiptap Essential Extensions | MIT |
| `xlsx` (SheetJS) | Excel report generation | Pro (Community Edition) |
| `docx` | Word document export | MIT |
| `jszip` | Audit backup & archival compression | MIT / GPLv3 |
| `lucide-react` | Icon Set | ISC |
| `date-fns` | Date manipulation | MIT |
| `bcryptjs` | Password hashing | MIT |
| `file-saver` | Client-side file saving | MIT |

## 4. Security & Authentication
| Feature | Implementation | Notes |
| :--- | :--- | :--- |
| **SSO / OIDC** | NextAuth.js / Auth.js | Supports SAML, OAuth2, and Entra ID (Azure AD). |
| **Input Validation** | DOMPurify | Automatic scrubbing of rich text input to prevent XSS. |
| **Database Encryption** | Volume Encryption | Recommended at the infrastructure/cloud level. |
| **HTTPS (SSL/TLS)** | Required for secure production access. OpenWorkpaper supports standard `.pem` certificates. |
| **RBAC** | Built-in | Role-based access control for Admins, Managers, and Auditors. |

## 5. Development & Build Tools
These tools are used during development and the build process but are not included in the runtime environment:
*   `typescript`: Static type checking.
*   `eslint`: Static code analysis and security linting.
*   `postcss` / `tailwindcss`: CSS processing and styling.
*   `prisma`: Database schema management and migrations.

## 6. Compliance Mapping 
*   **AC-2 (Account Management)**: Handled via SSO integration.
*   **AC-3 (Access Enforcement)**: Enforced through internal RBAC middleware.
*   **AU-2 (Audit Events)**: Application-level logging for all sign-offs and status changes.
*   **SC-18 (Mobile Code)**: Implementation of robust input sanitization via DOMPurify.
*   **SC-8 (Transmission Confidentiality)**: Enforced TLS 1.2+ via Nginx configuration.
