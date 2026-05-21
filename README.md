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



This project is open-source and available under the [MIT License](LICENSE).
