# BookQuotr

BookQuotr is a modern, self-hosted web application for managing your favorite books and their quotes. Built with a focus on clean design, data ownership, and high performance.

## 🚀 Features

- **Book Management**: Add, edit, and organize the books you've read.
- **Quote Extraction**: Save memorable quotes from your books.
- **Markdown Support**: Quotes are rendered using Markdown, allowing you to format text easily.
- **Self-Hosted & Local First**: All your data is saved in a local SQLite file (`bookquotr.db`), ensuring you never lose your notes.
- **Beautiful UI**: Built with Shadcn Base UI components and Tailwind CSS for a premium, minimalist aesthetic.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: SQLite
- **ORM**: [Prisma 7](https://www.prisma.io/) (with `@libsql/client` driver adapter)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Base UI)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 💻 Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- pnpm (recommended)

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/bookquotr.git
cd bookquotr
pnpm install
```

### 2. Environment Variables

Copy the example environment file to `.env` and fill in your details:

```bash
cp .env.example .env
```
*(By default, this sets up your local SQLite database inside the `/data` folder).*

### 3. Database Migration

Run the Prisma migration command to create the database tables:

```bash
pnpm prisma migrate dev
```

### 4. Run the Development Server

```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## 🐳 Running with Docker

BookQuotr comes with a production-ready Docker configuration that uses persistent volumes so your data is never lost.

```bash
# Build and start the container in detached mode
docker-compose up -d --build
```
Your application will be available at `http://localhost:3000`. The database file will be safely persisted in the `./data` directory on your host machine.

---

## ▲ Deploying to Vercel (Important!)

BookQuotr is perfectly compatible with Vercel and can be deployed with one click. However, **Vercel's Serverless environment does not have a persistent file system**. If you use a local SQLite file (`file:./data/bookquotr.db`) on Vercel, your data will be erased every time the serverless function spins down.

To fix this, BookQuotr is pre-configured with the **Turso (LibSQL)** adapter, making it trivial to use a hosted SQLite database.

### Steps to Deploy on Vercel:

1. **Create a Turso Database:**
   - Go to [Turso](https://turso.tech/) and create a free account.
   - Create a new database and copy the database URL (it will look like `libsql://your-db-name.turso.io`) and your Auth Token.

2. **Deploy to Vercel:**
   - Push your code to a GitHub repository.
   - Import the project into Vercel.

3. **Set Environment Variables in Vercel:**
   Go to your project's settings in Vercel and add the following Environment Variable:
   - `DATABASE_URL="libsql://your-db-name.turso.io?authToken=YOUR_AUTH_TOKEN"`

4. **Migrate the Database (Once):**
   You need to push your Prisma schema to your new Turso database. On your local machine, run:
   ```bash
   DATABASE_URL="libsql://your-db-name.turso.io?authToken=YOUR_AUTH_TOKEN" pnpm prisma db push
   ```

That's it! Your BookQuotr application will now run globally on Vercel while safely persisting all your books and quotes on Turso.

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
