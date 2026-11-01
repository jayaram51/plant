@echo off
title SmartPlant IoT Monitoring — Local Static Server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
