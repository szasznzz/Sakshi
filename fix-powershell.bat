@echo off
echo ========================================
echo   Fixing PowerShell Execution Policy
echo ========================================
echo.
echo This will allow PowerShell scripts to run on your system.
echo This is safe and only affects your user account.
echo.
pause

powershell -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ PowerShell execution policy fixed!
    echo.
    echo You can now run:
    echo   - start-project.bat
    echo   - npm commands
    echo   - PowerShell scripts
    echo.
) else (
    echo.
    echo ✗ Failed to set execution policy.
    echo.
    echo Please run this as Administrator or manually execute:
    echo   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
    echo.
)

pause
