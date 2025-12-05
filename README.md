# Wedding Invitation App

Full-stack web application for creating and managing digital wedding invitations. Built with Next.js 15, React 19, and TypeScript.

## ✨ Main Features

- **User authentication** with JWT (register, login, access and refresh tokens)
- **Event management** (create, edit, delete wedding events)
- **Guest management** (add, edit, delete and track RSVPs)
- **Digital invitations** with countdown timer and responsive design
- **Form validation** with Valibot
- **Modern interface** with Tailwind CSS and Three.js animations

## 🛠️ Tech Stack

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Three.js, React Hook Form  
**Backend:** Next.js API Routes, MySQL2, JWT, Bcrypt  
**Testing:** Jest, ts-jest

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/Camilo-tsx/wedding-invitation-app
cd wedding-invitation-project
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables

Create `.env.local` file in the project root:

```env
# Database
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
DB_PORT=3306

# JWT
JWT_SECRET=your_refresh_token_secret
JWT_SECRET_R=your_access_token_secret

NODE_ENV=development
```

4. Set up database

Create the necessary tables in MySQL. The project uses UUID in binary format:

```sql
CREATE TABLE users (
  id BINARY(16) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  roles ENUM('admin', 'user') DEFAULT 'user',
  is_allowed BOOLEAN DEFAULT FALSE // If you want to authorize the user to access all app features, leave this set to true
);

CREATE TABLE events (
  id BINARY(16) PRIMARY KEY,
  user_id BINARY(16) NOT NULL,
  event_date DATE NOT NULL,
  location VARCHAR(200) NOT NULL,
  itinerary VARCHAR(200) NOT NULL,
  dress_code VARCHAR(100) NOT NULL,
  husband_name VARCHAR(40) NOT NULL,
  wife_name VARCHAR(40) NOT NULL,
  special_menu BOOLEAN DEFAULT FALSE,
  kids_allowed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE guests (
  id BINARY(16) PRIMARY KEY,
  family_name VARCHAR(20) NOT NULL,
  event_id BINARY(16) NOT NULL,
  is_attending BOOLEAN DEFAULT FALSE,
  menu_option VARCHAR(255),
  attending_count INT DEFAULT 1,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

5. Run in development
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

- `npm run dev` - Development server
- `npm run build` - Build for production
- `npm run start` - Production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Jest

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/         # API endpoints (auth, event, guest, user)
│   ├── auth/        # Authentication pages
│   └── event/       # Event pages
├── core/            # Business logic
│   ├── database/    # DB connection and queries
│   └── services/    # Services (auth, event, guest, user)
├── features/        # Feature modules
├── schemas/         # Validation schemas (Valibot)
└── shared/          # Shared components
```

## 🔐 Authentication

- **Register/Login**: Email, username and password
- **JWT Tokens**: Access token (30 min) and refresh token (7 days)
- **HTTP-Only Cookies**: Tokens stored securely
- **Protected Routes**: Middleware verifies tokens on API endpoints

## 📡 Main API Endpoints

**Auth:** `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`  
**Events:** `/api/event` (GET, POST), `/api/event/[eventId]` (GET, PUT, DELETE)  
**Guests:** `/api/guest` (GET, POST), `/api/guest/[id]/[eventId]` (GET, PUT, DELETE)  
**Users:** `/api/user/update`, `/api/user/delete`

## 🔒 Security

- Passwords hashed with Bcrypt
- Secure JWT tokens
- HTTP-Only and Secure cookies
- Input validation with Valibot
- Parameterized queries (SQL injection prevention)

## 🌐 Deployment

```bash
npm run build
npm run start
```

Make sure to configure all environment variables in production.

## 📝 License

MIT License - See [LICENSE](LICENSE) for more details.

## 👤 Author

**Camilo-tsx**

---

**Note:** Keep environment variables secure and never commit them to the repository.
