# AMSOS: Software & Security Compliance (Dependencies)

This document provides a comprehensive list of all software dependencies, libraries, and infrastructure requirements for AMSOS. This is intended for use by IT Administrators, Security Officers, and Compliance departments during the software approval process.

## 🏗 System-Level Prerequisites

| Component | Minimum Version | Purpose |
| :--- | :--- | :--- |
| **Git** | latest | Source code management and updates. |
| **Docker Engine** | 20.10+ | Container runtime environment. |
| **Docker Compose** | 2.0+ | Multi-container orchestration (included with Docker Desktop). |
| **Node.js** | 18.17+ / 20.x | Runtime (Required only for non-Docker "Manual" installations). |
| **Nginx** | latest | (Optional) Reverse proxy for HTTPS/SSL termination. |

## 📦 Runtime Environment (Container)

AMSOS is built on a minimal, security-hardened Linux base.
- **Base OS**: [Alpine Linux](https://alpinelinux.org/) (via `node:20-alpine`)
- **System Packages**: `libc6-compat` (Standard C library compatibility).

## 🛠 Application Stack

### Core Frameworks
| Dependency | Version | Description |
| :--- | :--- | :--- |
| **Next.js** | 16.2.0 | React-based web framework for SSR and API routes. |
| **React** | 19.2.4 | UI library for building interactive components. |
| **Prisma** | 6.19.2 | Next-generation ORM for database access. |
| **TypeScript** | 5.x | Static typing for JavaScript. |

### Data & Storage
| Dependency | Version | Description |
| :--- | :--- | :--- |
| **SQLite** | 3.x | Embedded database engine (requires no external server). |
| **sqlite3** | 6.0.1 | Node.js driver for SQLite. |

### Security & Authentication
| Dependency | Version | Description |
| :--- | :--- | :--- |
| **bcryptjs** | 3.0.3 | Secure password hashing (Cost factor 10). |
| **jose** | 6.2.2 | JWT and OpenID Connect (OIDC) implementation. |

### Functional Libraries
| Dependency | Version | Description |
| :--- | :--- | :--- |
| **docx** | 9.6.1 | Professional Word (.docx) document generation. |
| **xlsx** | 0.18.5 | Excel spreadsheet processing (PBC & Milestones). |
| **jszip** | 3.10.1 | Archive management for full-audit backups. |
| **react-quill-new** | 3.8.3 | Rich text editor for procedure documentation. |
| **lucide-react** | 0.577.0 | SVG icon set. |
| **date-fns** | 4.1.0 | Modern date utility library. |

## 🌐 External Connectivity & Infrastructure

| Requirement | Description |
| :--- | :--- |
| **HTTPS (SSL/TLS)** | Required for secure production access. AMSOS supports standard `.pem` certificates. |
| **OIDC Provider** | (Optional) Integration with Microsoft Entra ID (Azure AD), Okta, Keycloak, etc. |
| **Network Access** | Outbound HTTPS (Port 443) is required ONLY if using SSO for OIDC callbacks. |

## 🛡 Security Hardening
- **No External Database Required**: All data stays within the container/volume via SQLite.
- **Rootless Operation**: The production container runs as a non-privileged `nextjs` user.
- **Telemetry Disabled**: Next.js telemetry is explicitly disabled in the Docker build.
