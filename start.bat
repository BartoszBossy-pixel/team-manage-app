@echo off
echo 🚀 Starting KPI Dashboard...
echo 📊 This will start both the proxy server and React app
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Warning: .env file not found!
    echo 📝 Please copy .env.example to .env and fill in your Jira credentials
    echo.
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    echo.
)

echo 🔄 Starting servers...
echo    - Proxy server will run on http://localhost:3001
echo    - React app will run on http://localhost:3000
echo.
echo 💡 Press Ctrl+C to stop both servers
echo.

REM Start both servers using npm script
npm run start:dev