# Tinplate Computer Training Center - Accounting System

## 1. Project Overview
This project is a fully functional, Zoho Books–style accounting web application designed and built for the Tinplate Computer Training Center. It simplifies core financial operations, tracks sales and purchases, and calculates GST seamlessly.

## 2. Objective
To deliver a robust, internship-grade accounting application demonstrating modern web architecture, relational database management, and UI/UX best practices suitable for a real-world enterprise environment.

## 3. Tech Stack
- **Frontend**: React (Create React App), React Router, Context API, CSS.
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL with node-postgres (`pg`).
- **Authentication**: JSON Web Tokens (JWT) & HTTP-only cookies.

## 4. Implemented Modules
- **Authentication**: Register, Login, Role-Based Access Control.
- **Organization Settings**: GSTIN, Financial Year, Default Currency, State.
- **Sales**: Customers, Quotes (Estimates), Invoices, Payments Received, Customer Aging.
- **Purchases**: Vendors, Bills, Expenses, Payments Made, Vendor Aging.
- **Inventory**: Items (Products/Services), Stock Movements (In/Out/Adjustments).
- **Accounting**: Chart of Accounts, Manual Journals, Bank Accounts, Bank Reconciliation.
- **Taxes**: GST Engine (intra-state CGST/SGST vs inter-state IGST calculation).
- **Reports**: Trial Balance, Profit & Loss, Balance Sheet, Cash Flow, Tax Summary.
- **Documents**: Receipt & Attachment upload logic (Metadata-driven).

## 5. Folder Structure
```
Tinplate_Company_SDLC-pritisha/
├── frontend/             # React App (Port 3000)
│   ├── src/              # Components & Services
│   └── public/           # Static Assets
├── 04_Source_Code/
│   └── backend/          # Express API (Port 5000)
│       ├── src/          
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── config/
│       └── migrations/
└── docs/                 # Documentation (Manuals, API Docs, Demo Flow)
```

## 6. Setup & Execution

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### Database Setup
1. Create a PostgreSQL database (e.g., `tinplate_accounting`).
2. Update the credentials in `backend/.env`.
3. The backend runs auto-migrations on startup (or run `/migrations` scripts manually).

### Backend Setup
1. Navigate to `04_Source_Code/backend`.
2. Run `npm install`.
3. Create `.env` file:
   ```
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tinplate_accounting
   JWT_SECRET=your_jwt_secret
   ```
4. Run `npm run dev` (starts on port 5000).

### Frontend Setup
1. Navigate to `frontend`.
2. Run `npm install`.
3. Run `npm run dev` (starts on port 3000).

## 7. Known Limitations & Future Scope
- Multi-branch support is currently limited to single tenant per user.
- Bank statements cannot be dynamically imported from CSV yet.
- Recurring invoices module requires a cron job handler to be fully automated.
- See `docs/KNOWN_ISSUES.md` for more details.
