@echo off
echo ========================================
echo   CoinDrop Backend Setup
echo ========================================
echo.

cd backend

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Creating .env file...
if not exist .env (
    copy .env.example .env
    echo Created .env file from template
    echo IMPORTANT: Edit .env and set your CONTRACT_ADDRESS
) else (
    echo .env file already exists
)

echo.
echo [3/3] Creating database directory...
if not exist database mkdir database

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Edit backend\.env and set CONTRACT_ADDRESS
echo   2. Run: cd backend
echo   3. Run: npm start
echo.
pause
