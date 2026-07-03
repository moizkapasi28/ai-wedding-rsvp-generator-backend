# AI Wedding RSVP Generator Backend

This is the backend for the AI Wedding RSVP Generator, a robust web service built with Node.js, Express, and TypeScript. It utilizes Prisma for database ORM and Zod for robust data validation.

## Features

- **Authentication & Authorization**: Secure user authentication using JWT and bcrypt.
- **Wedding Management**: Full CRUD capabilities for weddings, tightly scoped to the authenticated user.
- **Validation**: Strict runtime validation of all incoming API requests using Zod, guaranteeing data integrity.
- **Logging**: Integrated `pino` logger for high-performance and readable logs.
- **Email Delivery**: Powered by AWS SES for reliable email delivery (e.g., verification, notifications).

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma Client
- **Validation**: Zod
- **Security**: JWT (jsonwebtoken), bcrypt, CORS, Cookie Parser
- **Email Services**: AWS SDK (`@aws-sdk/client-ses`) & Handlebars (for email templates)
- **Dev Tools**: `tsx` (TypeScript Execution)

## Prerequisites

- Node.js (v16+)
- PostgreSQL Database
- AWS SES Credentials (if using email features)

## Installation

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example` or required settings:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/wedding_db?schema=public"
   JWT_SECRET="your_jwt_secret"
   # Add AWS SES and other required environment variables here
   ```

3. **Database Setup**:
   Run Prisma migrations to sync your schema with the PostgreSQL database.
   ```bash
   npx prisma migrate dev
   ```

4. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

## Running the Application

To start the server in development mode (with hot-reloading via `tsx`):

```bash
npm run dev
```

The server will start listening for requests.

## Project Structure

- `src/controllers/` - Handles incoming HTTP requests and responses.
- `src/services/` - Contains core business logic (e.g., `wedding.service.ts`).
- `src/repositories/` - Data access layer wrapping Prisma DB operations.
- `src/routes/` - Express route definitions.
- `src/validations/` - Zod schema definitions for API payloads.
- `src/middlewares/` - Express middlewares (Auth, Error handling, Validation).
- `prisma/` - Prisma schema and database configuration.

## License

ISC License
