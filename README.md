# LMS MERN

A full-stack Learning Management System built with MongoDB, Express, React, and Node.js.

## Project structure

- `backend/` - Express API server, MongoDB models, authentication, Razorpay payments, Zoom integrations, live class sockets, cron jobs, and LMS business logic.
- `frontend/` - Vite + React application with Bootstrap, charts, routing, and real-time socket support.

## Features

- User registration, login, and profile management
- Course browsing, enrollment, lessons, and exams
- Instructor dashboard and admin controls
- Payment processing with Razorpay
- Live classes, chat, and Zoom integration
- Gamification, analytics, notifications, and reporting

## Prerequisites

- Node.js 18+ (or a compatible LTS version)
- npm
- MongoDB instance or MongoDB Atlas URL

## Setup

### 1. Backend

1. Open a terminal in `backend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `backend/` with the required variables.

Example `.env` values:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
BASE_URL=http://localhost:3000
PORT=3000
CLIENT_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
MAIL_FROM="Your LMS <your_email@example.com>"

SPAM_WARN_AT=5
SPAM_BLOCK_AT=10

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_SECRET=your_razorpay_secret
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_USER_ID=me
ZOOM_WEBHOOK_SECRET_TOKEN=your_zoom_webhook_secret

VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

4. Start the backend in development mode:
   ```bash
   npm run dev
   ```

### 2. Frontend

1. Open a terminal in `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```
4. Open the local Vite URL shown in the terminal, usually `http://localhost:5173`

## Running both

- Start backend first.
- Start frontend second.
- Ensure `CLIENT_URL` in the backend `.env` matches the frontend URL.

## Backend scripts

- `npm run dev` - Start backend with `nodemon`
- `npm start` - Start backend with Node

## Frontend scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build production assets
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Notes

- The backend uses Socket.IO for live classes and notification events.
- Razorpay webhook route is exposed at `/webhooks/razorpay` and Zoom webhook route at `/webhooks/zoom`.
- Uploaded files are served statically from `backend/uploads/`.

## Recommended improvements

- Add root-level environment documentation or `.env.example`
- Add frontend/backend test coverage
- Secure secrets before sharing or deploying

---

Built for a learning management system with real-time classes, payments, and admin workflows.
