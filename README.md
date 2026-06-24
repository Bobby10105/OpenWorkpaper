# OpenWorkpaper: Open Source Audit Management System

OpenWorkpaper is a simple, modern, and open-source web application designed for auditors to document audit programs and procedures. It streamlines the audit lifecycle across Planning, Fieldwork, and Reporting phases with built-in sign-off tracking, reviewer collaboration, and professional document export.

Deploy OpenWorkpaper on your terms with complete infrastructure-agnostic flexibility. Our open-source architecture gives you the freedom to run the platform locally for private testing, self-host it within your own secure network for maximum data sovereignty, or scale easily in the cloud. By leveraging a fully containerized design, OpenWorkpaper ensures that you always retain full ownership of your sensitive audit data, regardless of where you choose to host it.

## 🌟 Background & Mission

The purpose of this project is to provide free, open-source audit software to audit offices. 

**Contributions are welcomed!** Whether you are an auditor with feature ideas or a developer looking to help, please feel free to open an issue or submit a pull request.

## 🚀 Key Features

*   **Unified Task Engine**: Personalized dashboard overview of active audits with high-impact analytics, including direct drill-downs into **"Assigned to You"** and **"Pending Review"** procedures.
*   **Management Insights**: Dedicated oversight suite for Business Operations, featuring real-time tracking of **Review Timeliness (Lag)**, **Aging Procedures (>30 days)**, and **Global Auditor Workload Analysis**.
*   **Three-Phase Workflow**: Standardized sections for Planning, Fieldwork, and Reporting with **instant, zero-latency tab switching** and cinematic transitions.
*   **Master-Detail Procedure Workspace**: Dedicated, high-performance workspace for documenting individual procedures, featuring a clean UI, rich text editing, and integrated discussion.
*   **Data Integrity (Locking)**: Procedures are **automatically locked as Read-Only** once they are reviewed to protect audit integrity. Authorized team members can explicitly "Unlock for Editing," which clears existing sign-offs for re-preparation.
*   **Procedure Assignments**: Professional ownership management with a "Take Ownership" quick-action and delegated assignment dropdowns.
*   **PBC Tracking**: Centralize client information requests. **Upload and download a master PBC spreadsheet** to track status and ownership in one place.
*   **Audit Program Templates**: Create and manage a library of standard audit programs. Instantly import sets of procedures and purposes into any phase to standardize documentation and save time.
*   **Hierarchical Organization**: Organize procedures into **Procedure Groups** (e.g., "Payroll", "Revenue") with stable, automatic nomenclature.
*   **Smart Numbering**: Automatic professional nomenclature (Groups: **1.1**, Procedures: **1.1.a**, Attachments: **1.1.a.1**).
*   **Comprehensive Documentation**: Each procedure tracks Purpose, Source, Scope, Methodology, Results, Conclusions, and **Reviewer Comments**.
*   **Audit Sign-offs**: "Prepared By" and "Reviewed By" tracking with dates and visual status badges.
*   **Attachment Support**: Attach PDF, Word, Excel, and PowerPoint documents directly to specific procedures. 
*   **Attachment Review**: Each individual attachment now supports its own "Prepared By" and "Reviewed By" sign-offs for granular quality control.
*   **Milestone Tracking**: Monitor key project dates and **attach a detailed milestones spreadsheet** for granular project management.
*   **Collaborative Team Management**: Authorized team members (Auditors and above) can manage personnel access, link system users to engagements, and assign functional responsibility levels.
*   **Professional Export**: Generate a complete "Audit Program" in Word (.docx) format with one click, perfectly synchronized with your UI nomenclature.
*   **Self-Healing API**: Intelligent database repair logic automatically detects and fixes schema mismatches (common in Docker volume migrations) to ensure high availability.
*   **Secure Access**: Built-in authentication with granular role-based access control and **Federal SSO (OIDC)** support.

## 🔐 Roles & Permissions (RBAC)

OpenWorkpaper uses a granular **Role-Based Access Control (RBAC)** model to ensure data integrity and proper audit oversight. Access is controlled at two levels: system-wide roles and audit-specific team assignments.

### System Roles

| Role | Capabilities |
| :--- | :--- |
| **IT Administrator** | Identity Management. Can manage the user directory (add/import/delete users). Restricted from managing audit data. |
| **Business Operations** | Data Management. Can create/delete audits and manage the Audit Program Template Library. |
| **Audit Partner** | Senior management role. Can manage teams, sign off on procedures, and unlock reviewed workpapers. |
| **Audit Director** | Senior management role. Can manage teams, sign off on procedures, and unlock reviewed workpapers. |
| **Audit Manager** | Management role. Can manage teams, sign off on procedures, and unlock reviewed workpapers. |
| **Auditor** | Standard role. Can document procedures, **manage engagement teams**, sign off as a preparer, and unlock workpapers for editing. |
| **Specialist** | Contributor role. Can document procedures but is **restricted from deleting procedures or managing teams** to protect engagement integrity. |

### Audit Team Roles

While System Roles control application-wide permissions, the **Audit Team** assignment allows you to define specific functional roles within an individual project. These roles are for documentation and identification purposes and do not override system-level RBAC.

Key team roles include:
*   **Lead Auditor**: Primary contact and coordinator for the audit engagement.
*   **Quality Reviewer**: An independent reviewer (often from outside the immediate engagement team) who performs a final objective evaluation of the audit's significant judgments and conclusions.
*   **Staff/Senior Auditor**: Core team members responsible for fieldwork and procedure documentation.
*   **Specialist**: Subject matter experts (e.g., IT, Statistician) providing focused support to the audit.

### Access Control Rules
*   **Audit Visibility**: Users (except Business Operations) can **only** see and access audits to which they have been explicitly added as a **Team Member**.
*   **Audit Deletion**: A safety-first approach restricts audit deletion strictly to the **Business Operations** role.
*   **Locking Protocol**: Once a procedure is signed off as "Reviewed," it is frozen. Only authorized staff (Auditor and above) can unlock it, which automatically clears sign-offs to ensure a full re-review.
*   **Audit Logs**: All sensitive actions (logins, deletions, procedure unlocking, user changes) are tracked in the system-wide Audit Logs for compliance.

## 🛠 Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (React)
*   **Database**: SQLite (via [Prisma ORM](https://www.prisma.io/))
*   **Styling**: Tailwind CSS
*   **Auth**: JWT-based session management + OpenID Connect (OIDC)
*   **Password Hashing**: [bcryptjs](https://www.npmjs.com/package/bcryptjs) (Cost Factor: 10)
*   **Export**: docx.js

## 👔 Business Readiness

OpenWorkpaper was built with the specific needs of **CPA Firms** and **Internal Audit Departments** in mind:

*   **Private Cloud Deployment**: Unlike standard SaaS, you can deploy OpenWorkpaper within your own Virtual Private Cloud (VPC), ensuring your sensitive client data never leaves your control.
*   **SQLite Portability**: Your entire database is a single file. This makes off-site backups, disaster recovery, and data archiving as simple as copying a folder.
*   **Self-Healing Reliability**: Built-in logic repairs database schema drifts automatically, ensuring the system stays online during infrastructure updates.
*   **Audit Logging**: Every login and major record change is tracked to ensure accountability.
*   **No Vendor Lock-in**: As an open-source tool, you have full access to your data and the source code, protecting you from future fee increases or platform shutdowns.

## 🔒 Production Configuration

For production deployments, it is critical to secure the application with HTTPS and properly configure Single Sign-On (SSO) if required.

### 🖥️ Recommended System Specifications
OpenWorkpaper is highly efficient and designed to scale vertically. For an organization with up to **200 concurrent auditors**, we recommend the following minimum server specifications to ensure a fast, responsive user experience:
*   **CPU:** 2 to 4 vCPUs
*   **Memory:** 4GB to 8GB RAM
*   **Storage:** 20GB+ SSD (Storage needs will scale depending on the size and volume of uploaded attachments)

*Note: Because OpenWorkpaper utilizes a highly optimized SQLite Write-Ahead Log (WAL) architecture, the database natively supports high-concurrency read/write operations without locking. The recommended specifications primarily ensure the Node.js frontend and API can seamlessly handle the concurrent traffic volume.*

### 🌐 HTTPS & Reverse Proxy (Recommended)
OpenWorkpaper provides a streamlined way to deploy with HTTPS using a built-in Nginx reverse proxy configuration. This method handles SSL/TLS termination and automatically redirects insecure HTTP traffic to HTTPS.

#### Prerequisites
Before deploying with HTTPS, you must:
*   Have a domain name pointing to your server.
*   Obtain SSL certificates (e.g., via Let's Encrypt).
*   Create a `certs/` directory in the project root and place your certificate files there:
    *   `certs/fullchain.pem`
    *   `certs/privkey.pem`
    *   **Note**: Ensure the files are readable by the Docker container (e.g., `chmod 644 certs/*.pem`).

#### Deploy with HTTPS
Use the secure Docker Compose configuration:
```bash
docker compose -f docker-compose.secure.yml up -d --build
```
This command starts both the OpenWorkpaper application and an Nginx container. The application will be accessible only via HTTPS on port 443.

---

### 📝 Environment Variables Reference

| Variable | Requirement | Description |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | **Required** | Path to the SQLite database. <br>• **Docker (All Modes)**: `file:/app/prisma/data/dev.db`<br>• **Manual/Host**: `file:./prisma/data/dev.db` |
| **`JWT_SECRET`** | **Required** | A secure random string used to sign session tokens. **Must be changed for production** to prevent session hijacking. |
| **`SESSION_DURATION_SECONDS`** | Optional | How long a user remains logged in (default `3600` or 1 hour). |
| **`NODE_ENV`** | **Required** | Set to `production` for live deployments to enable optimizations and strict security checks. Use `development` for local coding. |
| **`PORT`** | Optional | The internal port the app listens on (default `3000`). Even with HTTPS, this internal port usually stays as `3000`. |

---

### 🔑 SSO (OIDC) Configuration
OpenWorkpaper supports any OpenID Connect (OIDC) compliant Identity Provider (IDP) such as Microsoft Entra ID (Azure AD), Okta, or Keycloak.

To enable SSO, configure the following environment variables in your `.env` file:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | The external URL of your OpenWorkpaper instance (used for redirect URIs). | `https://openworkpaper.your-agency.gov` |
| `SSO_ISSUER_URL` | The base URL of your OIDC Identity Provider. | `https://login.microsoftonline.com/tenant-id/v2.0` |
| `SSO_CLIENT_ID` | The Client ID assigned to OpenWorkpaper by your IDP. | `00000000-0000-0000-0000-000000000000` |
| `SSO_CLIENT_SECRET` | The Client Secret assigned to OpenWorkpaper by your IDP. | `your-secure-client-secret` |

> **Note**: The current implementation assumes standard OIDC paths (`/auth` for authorization and `/token` for token exchange) relative to the `SSO_ISSUER_URL`. If your provider uses different paths (e.g., `/authorize`), you may need to adjust the endpoints in `src/app/api/auth/sso/login/route.ts`.

**Redirect URI**: In your IDP configuration, you must register the following callback URL:
`https://openworkpaper.your-agency.gov/api/auth/sso/callback`

---

## 💾 Backup & Disaster Recovery

OpenWorkpaper provides robust data portability and recovery options:

1.  **Word Export**: For professional reporting and off-system review, click the **Export Word** button in any audit. This generates a grouped, professional document of all procedures.
2.  **Full System Backup**: To save the entire state of an audit (including all metadata and attachment files), use the **Backup Audit** button on the audit detail page. This generates a `.zip` file containing:
    *   `audit_data.json`: The complete structured data of the audit.
    *   `attachments/`: A folder containing the actual files (PDFs, Excel, etc.) associated with procedures.
3.  **Restore**: To restore an audit from a previous backup:
    *   Go to the **Main Dashboard**.
    *   Click the **Restore Backup** button (available to Business Operations users).
    *   Select the backup `.zip` file.
    *   A new audit will be created with the prefix `RESTORED:`, containing all original data and functional attachments.

## 💻 Installation & Deployment

OpenWorkpaper is designed for complete infrastructure-agnostic flexibility. Whether you are a solo practitioner or a large firm, choose the method that fits your IT environment.

### ✅ Prerequisites (Docker Methods)
To use the container deployment methods below, you must have Docker or Podman (with compose support) installed on your server or local machine. 

> **Note**: For a complete list of all internal libraries, security dependencies, and infrastructure requirements for IT approval, please see **[DEPENDENCIES.md](DEPENDENCIES.md)**.

### 🫙 Method 1: Docker or Podman Deployment (Recommended)
This is the professional standard for deploying OpenWorkpaper. We recommend Option A for all production environments. (Note for Podman users: The commands below use ⁠docker compose⁠, but you can seamlessly substitute ⁠podman compose⁠ or rely on your Docker alias.)


1.  **Clone & Prepare**:
    ```bash
    git clone https://github.com/Bobby10105/OpenWorkpaper.git
    cd OpenWorkpaper
    ```
2.  **Configure Environment**: Set up your local `.env` file by copying the template:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file and configure your settings. At a minimum, you **must** update **`JWT_SECRET`**. The other defaults are already pre-configured for a standard production Docker deployment. If you are using SSO, configure those variables as described in the [Environment Variables Reference](#-environment-variables-reference) above.
3.  **Launch**:

    *   **Option A: Secure Production (HTTPS - Port 443)**
        *Best for direct production exposure. Handles SSL/TLS termination automatically. Requires SSL certificates in the `certs/` folder (see [Production Configuration](#-production-configuration)).*
        ```bash
        docker compose -f docker-compose.secure.yml up -d --build
        ```
Note for rootless Podman users: Binding to port 443 requires elevated privileges.

    *   **Option B: Standard Production (HTTP - Port 3000)**
        *Best for local testing or if you already have an external load balancer/reverse proxy.*
        ```bash
        docker compose -f docker-compose.prod.yml up -d --build
        ```

    *   **Option C: Quickstart (Development & Evaluation)**
        *Best for rapid evaluation or developers. Includes debug logging. **Note**: If you want hot-reloading for code changes, edit your `.env` and set `NODE_ENV=development` and `DATABASE_URL="file:/app/prisma/data/dev.db"`.*
        ```bash
        docker compose up --build
        ```

---

### 🛠 Method 2: Manual Installation (Node.js)
If you prefer to run OpenWorkpaper directly on your host machine or have a custom Windows Server environment without Docker.

#### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or later)
*   npm (installed with Node.js)

#### 2. Setup
```bash
git clone https://github.com/Bobby10105/OpenWorkpaper.git
cd OpenWorkpaper
npm install
```

#### 3. Environment Configuration
Set up your local `.env` file by copying the template:
```bash
cp .env.example .env
```
Open the `.env` file and **update** the **`DATABASE_URL`** to `file:./dev.db` and set a secure **`JWT_SECRET`**.

#### 4. Database & Launch
```bash
npx prisma db push
npx prisma db seed
npm run build
npm run start
```

---

### 🔑 Initial Login
Once running, sign in with:
*   **IT Administrator**: `it.admin` / `admin` (Password change required)
*   **Business Operations**: `biz.ops` / `admin` (Password change required)

## 🛠 Maintenance & Updates

### Data Persistence
OpenWorkpaper is designed to be updated without data loss. Permanent data is stored using two methods:

#### Named Docker Volumes (Application Data)
These volumes are managed by Docker and persist across container restarts and updates.
*   **`openworkpaper-db`**: Contains the SQLite database file (audits, users, settings, and logs).
*   **`openworkpaper-uploads`**: Contains all documents (PDF, Excel, Word) attached to procedures.

#### Host Bind-Mounts (Infrastructure & Security)
These directories are located in the project folder on your host machine.
*   **`./certs`**: (Required for HTTPS) Stores your SSL `fullchain.pem` and `privkey.pem`.
*   **`nginx.conf`**: Your web server configuration.

When the application is updated, the temporary containers are replaced, but these volumes and files remain untouched and are automatically re-attached to the new version.

### Applying Updates
To apply a new version or your own custom code tweaks:

1.  **Pull the latest changes**:
    ```bash
    git pull
    ```
2.  **Clean and Rebuild**:
    It is recommended to stop the current containers before rebuilding to ensure a clean state and prevent port conflicts.

    **Secure HTTPS Deployment**:
    ```bash
    docker compose -f docker-compose.secure.yml down
    docker compose -f docker-compose.secure.yml up -d --build
    ```

    **Standard Deployment**:
    ```bash
    docker compose -f docker-compose.prod.yml down
    docker compose -f docker-compose.prod.yml up -d --build
    ```

    **Development/Quickstart**:
    ```bash
    docker compose down
    docker compose up -d --build
    ```

    *This process will rebuild the application image, synchronize any database schema changes, and restart the service. Your audits and files will remain exactly as they were thanks to the named volumes.*

### Database Schema Changes
If an update introduces new features that require database changes (like a new column), the system handles this automatically. The startup script runs a synchronization task that aligns your existing data file with the new code structure without requiring manual SQL commands.

---
[License](LICENSE) | [Security Policy](SECURITY.md) | [Disclaimer](DISCLAIMER.md)
