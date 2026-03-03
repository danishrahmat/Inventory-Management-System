@echo off
title STOCKR Inventory Server
color 0B
echo.
echo  ==========================================
echo    STOCKR v2 - Factory Inventory System
echo  ==========================================
echo.
echo  Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js not found!
  echo  Download from: https://nodejs.org
  echo  Choose the LTS version.
  pause
  exit
)
echo  Node.js OK.
echo  Starting server...
echo.
node server.js
echo.
pause
