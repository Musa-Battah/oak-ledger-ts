# 🌳 Oak Ledger

A professional double-entry accounting system built with Next.js, TypeScript, and PostgreSQL. Designed for Nigerian businesses with Naira (₦) support and IFRS-compliant financial reporting.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Reports & IFRS Compliance](#reports--ifrs-compliance)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Accounting
- ✅ Double-entry bookkeeping system
- ✅ Chart of Accounts management
- ✅ Journal entries with automatic debit/credit balancing
- ✅ Real-time account balance updates
- ✅ Audit trail for all transactions

### Sales Module
- ✅ Customer management (with inline creation)
- ✅ Product & Services catalog
- ✅ Invoice creation and management
- ✅ Automatic journal entries (AR + Revenue)
- ✅ VAT calculation (7.5% Nigerian rate)

### Purchases Module
- ✅ Supplier management (with inline creation)
- ✅ Bill creation and tracking
- ✅ Expense recording
- ✅ Automatic journal entries (Expense + AP)

### Financial Reports (IFRS Compliant)
- ✅ Statement of Profit or Loss (Income Statement)
- ✅ Statement of Financial Position (Balance Sheet)
- ✅ Trial Balance
- ✅ Period filtering (Today, Week, Month, Quarter, Year)
- ✅ Print-ready format
- ✅ Professional white background for printing

### Nigerian Context
- ✅ Naira (₦) currency support
- ✅ Nigerian date and number formatting
- ✅ VAT rate 7.5% pre-configured
- ✅ Local business terminology

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon) |
| ORM/Driver | node-postgres (pg) |
| Styling | CSS Modules + Global CSS |
| Form Validation | React Hook Form + Zod |
| Notifications | React Hot Toast |
| Date Handling | date-fns |
| UUID Generation | uuid |

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.17 or later
- **npm** 9.0 or later
- **PostgreSQL** database (Neon, Supabase, or local)
- **Git** (for version control)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/musa-battah/oak-ledger-ts.git
cd oak-ledger

Create a .env.local file in the root directory:
# PostgreSQL Database Configuration
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Connection String (alternative)
DATABASE_URL=postgresql://user:password@host:5432/database

# SSL Settings
DB_SSL=true

# Application Settings
NEXT_PUBLIC_APP_NAME=Oak Ledger
NEXT_PUBLIC_APP_VERSION=2.0.0

# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb oak_ledger

# Update .env.local with local credentials