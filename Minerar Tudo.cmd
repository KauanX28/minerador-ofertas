@echo off
cd /d "%~dp0"
node --no-warnings src	arefa.js minerar %*
pause
