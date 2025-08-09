# DocuBox Windows 11 Setup Guide

This guide will help you set up DocuBox on your Windows 11 PC.

## Prerequisites

### 1. Install Node.js
- Download from [nodejs.org](https://nodejs.org/)
- Install the LTS version (recommended)
- Verify installation:
  ```powershell
  node --version
  npm --version
  ```

### 2. Install PostgreSQL
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Install with default settings
- **Important**: Remember the password you set for the `postgres` user
- Add PostgreSQL to your PATH if not done automatically

### 3. Install Git (if not already installed)
- Download from [git-scm.com](https://git-scm.com/download/win)
- Install with default settings

## Quick Setup

### Option 1: Automated Setup (Recommended)
1. Double-click `setup-windows.bat` in the project directory
2. Follow the prompts
3. Edit the `.env` file with your actual database password

### Option 2: Manual Setup

#### Step 1: Install Dependencies
```powershell
npm install
```

#### Step 2: Create Environment File
Create a `.env` file in the root directory with the following content:
```
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/docubox

# Server Configuration
PORT=5000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=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

# Session Secret
SESSION_SECRET=docubox_session_secret_2024
```

**Important**: Replace `your_password` with the actual password you set for the PostgreSQL `postgres` user.

#### Step 3: Set Up Database
1. Open pgAdmin (comes with PostgreSQL)
2. Connect to your PostgreSQL server
3. Create a new database named `docubox`:
   ```sql
   CREATE DATABASE docubox;
   ```

#### Step 4: Initialize Database Schema
```powershell
npm run db:push
```

#### Step 5: Start the Application
```powershell
npm run dev
```

## Troubleshooting

### Common Issues

#### 1. PostgreSQL Connection Error
- Make sure PostgreSQL service is running
- Check that the password in `.env` matches your PostgreSQL password
- Verify the database `docubox` exists

#### 2. Port Already in Use
- Change the PORT in `.env` to another number (e.g., 3000, 8000)
- Or kill the process using the port:
  ```powershell
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

#### 3. Node.js Version Issues
- Ensure you have Node.js 18 or higher
- Update Node.js if needed

#### 4. Permission Errors
- Run PowerShell as Administrator
- Check Windows Defender Firewall settings

### Database Issues

#### Reset Database
```powershell
# Drop and recreate the database
psql -U postgres -c "DROP DATABASE IF EXISTS docubox;"
psql -U postgres -c "CREATE DATABASE docubox;"
npm run db:push
```

#### Check Database Connection
```powershell
psql -U postgres -d docubox -c "\dt"
```

## Development Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run check

# Database operations
npm run db:push
```

## Project Structure

- `client/` - React frontend
- `server/` - Express.js backend
- `shared/` - Shared TypeScript types and database schema
- `attached_assets/` - Project assets and images

## Accessing the Application

Once running, the application will be available at:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

## Features

- Document workspace with rich text editing
- Cheatsheet workspace with draggable boxes
- Template workspace for structured documents
- AI-powered features with ChatGPT integration
- Real-time collaboration
- Database persistence

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify all prerequisites are installed correctly
3. Ensure the database is properly configured
4. Check that all environment variables are set correctly 