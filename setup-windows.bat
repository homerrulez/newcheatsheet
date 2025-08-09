@echo off
echo Setting up DocuBox for Windows 11...
echo.

echo Creating .env file...
(
echo # Database Configuration
echo DATABASE_URL=postgresql://postgres:your_password@localhost:5432/docubox
echo.
echo # Server Configuration
echo PORT=5000
echo NODE_ENV=development
echo.
echo # OpenAI Configuration ^(if using AI features^)
echo OPENAI_API_KEY=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
echo.
echo # Session Secret ^(generate a random string^)
echo SESSION_SECRET=docubox_session_secret_2024

echo .env file created! Please edit it with your actual database password and API keys.
echo.

echo Installing dependencies...
npm install

echo.
echo Setup complete! Next steps:
echo 1. Edit the .env file with your actual database password
echo 2. Set up your PostgreSQL database
echo 3. Run: npm run db:push
echo 4. Run: npm run dev
echo.
pause 