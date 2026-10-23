@echo off
title SmartPlant Cloud — Local Server
cd /d "%~dp0smartplant-cloud"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0smartplant-cloud\server.ps1"
pause
