@echo off
title Thrones of Myth - Private Creator Preview
"%~dp0Runtime\node.exe" "%~dp0CreatorLauncher.cjs" %*
if errorlevel 1 (
  echo.
  echo Please read the message above and START_HERE.txt.
  pause
  exit /b 1
)
