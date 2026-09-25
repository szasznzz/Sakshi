@echo off
REM Alternative startup that doesn't require PowerShell execution policy changes

echo ========================================
echo   Starting CoinDrop (No PowerShell)
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found!
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Starting Frontend Server...
start "CoinDrop Frontend" cmd /k "node server-simple.js"

timeout /t 2 /nobreak >nul

echo [2/3] Setting up Backend...
cd backend

if not exist .env copy .env.example .env >nul 2>nul
if not exist database mkdir database >nul 2>nul

echo [3/3] Installing Backend Dependencies...
echo (This may take a minute on first run...)

REM Use cmd to run npm (avoids PowerShell)
cmd /c npm install >nul 2>nul

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Starting Backend Server...
    start "CoinDrop Backend" cmd /k "node server.js"
    
    timeout /t 3 /nobreak >nul
    
    cd ..
    
    echo.
    echo ========================================
    echo   ✓ CoinDrop is Running!
    echo ========================================
    echo.
    echo Frontend: http://localhost:8080
    echo Backend:  http://localhost:3000
    echo.
    echo Opening game in browser...
    timeout /t 2 /nobreak >nul
    start http://localhost:8080
    echo.
    echo Close the server windows to stop.
    echo.
) else (
    echo.
    echo Backend setup incomplete.
    echo Frontend is running at http://localhost:8080
    echo.
    echo To fix backend, run: fix-powershell.bat
    echo.
    cd ..
    start http://localhost:8080
)

pause
