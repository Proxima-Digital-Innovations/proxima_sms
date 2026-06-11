# SCHOOL Portal - School Management System

This is a comprehensive, role-based school management portal built with a modern technology stack. It is designed to streamline administrative tasks, improve communication, and provide real-time insights for administrators, teachers, and parents at Proxima Hub (SCHOOL).

## ✨ Features

- **Role-Based Access Control**: Tailored dashboards and permissions for different user roles (Admin, Head of Department, Teacher, Parent).
- **Staff & Student Management**: Admins can manage staff and student profiles, roles, and permissions.
- **Lesson Plan & Exam Question Submission**: Teachers can upload lesson plans and exam questions for review and approval by HODs and Admins.
- **Automated Workflows**: A notification system keeps users informed about the status of their submissions.
- **Data Analytics**: Visual dashboards provide analytics on school performance, submissions, and user activity.
- **System Configuration**: Admins can manage system-wide settings for the academic year, grading, fees, and more.
- **AI-Powered Assistance**: Utilizes Genkit to provide AI-driven summaries, content drafting, and data analysis to speed up common tasks.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Authentication, Storage)
- **Generative AI**: [Firebase Genkit](https://firebase.google.com/docs/genkit) (with Google Gemini)
- **Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## 📦 Getting Started

### Prerequisites

- Node.js
- Firebase Account & Project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## 🗂️ Project Structure

- `src/app/`: Main application routes, including the dashboard and login pages.
- `src/components/`: Reusable UI components, organized by feature (auth, dashboard, ui).
- `src/context/`: React context providers for managing global state like user roles and themes.
- `src/lib/`: Utility functions, Firebase configuration, and data schemas.
- `src/ai/`: Contains all Genkit-related flows for AI functionality.

This project was bootstrapped with [Firebase Studio](https://firebase.google.com/docs/studio).
