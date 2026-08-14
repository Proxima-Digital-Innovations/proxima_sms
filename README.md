# Proxima One - All-in-One School ERP

A premium, modern School Management System designed for robust administration, academics, HR, biometric integrations, and communication. 

Powered by **Proxima Digital Innovation**.

## 🌟 Overview
Proxima One is designed to be the central nervous system of any educational institution. It provides comprehensive tooling for School Leadership Teams (SLT), Administrators, Teachers, and Parents. 

### Deployment Strategy
Proxima One is built with a **Standalone (Single-Tenant)** deployment architecture in mind. This means the software is individually deployed and licensed for each purchasing school, providing them with:
- Their own dedicated database
- Their own domain/subdomain
- Total data privacy and ownership
- Highly customized environments

## ✨ Core Modules

### 🏫 Core Administration
- **Dashboard & Analytics:** Real-time metrics on attendance, revenue, and school population using modern glassmorphic UI.
- **License Management:** Built-in license verification (Trial, Active, Suspended, Expired) directly integrated into the software core to manage subscriptions.
- **Role-Based Access Control (RBAC):** Secure access tiers for `ADMIN`, `SLT`, `HOD`, `TEACHER`, `ACCOUNTANT`, and `PARENT`.

### 📚 Academics & SIS (Student Information System)
- **Student & Class Management:** Complete enrollment lifecycle, grading, and result generation.
- **LMS & E-Learning:** Lesson notes, assignments, and digital content distribution.
- **Behavioral & Health Tracking:** Log disciplinary incidents, clinic visits, and immunization records.
- **Tahfeez & Special Programs:** Dedicated tracking for specialized subjects.

### 💰 Finance & Payroll
- **Fee Management:** Automated invoicing, receipt generation, and payment tracking.
- **Payroll System:** Manage staff salaries, automated deductions, and digital pay slips.
- **Expense Tracking:** Granular logging of school expenditures against allocated budgets.

### ⏱️ HR & Biometrics
- **BAMS Kiosk Integration:** Direct sync with physical hardware (fingerprint/PIN kiosks) for real-time staff attendance.
- **Leave Management:** Staff leave requests and substitute teacher assignment workflows.

## 🛠️ Tech Stack
- **Frontend/Backend:** Next.js 15 (App Router, Server Actions)
- **Database ORM:** Prisma
- **Database:** PostgreSQL (Production) / SQLite (Local Dev)
- **Authentication:** NextAuth (auth.js v5) with Argon2 hashing
- **Styling:** Tailwind CSS + Framer Motion + Recharts (Custom Glassmorphism Design System)
- **Language:** TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL server (or use SQLite in `.env` for local testing)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/proxima_one"
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```
3. Push the database schema:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📄 License & Versioning
This software is strictly licensed to individual institutions via Proxima Digital Innovation. Unauthorized duplication, SaaS re-selling, or distribution is prohibited. 

---
*Powered by Proxima Digital Innovation*
