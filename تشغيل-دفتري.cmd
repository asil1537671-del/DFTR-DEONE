@echo off
cd /d "%~dp0"
start "Daftari local server" /min cmd /c "node server.mjs"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8765/"
