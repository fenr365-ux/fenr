@echo off
echo Building FENR frontend for production...
cd /d "%~dp0frontend"
call npm install
call npm run build
echo.
echo Done! Drag the "frontend\dist" folder to Vercel.
pause
