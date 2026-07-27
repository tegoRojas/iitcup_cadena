@echo off
chcp 65001 >nul
title IITCUP - Instalador de Acceso Directo
color 0A
cls

echo =======================================================================
echo     POLICIA BOLIVIANA - IITCUP SANTA CRUZ
echo     INSTALADOR DE ACCESO DIRECTO EN ESCRITORIO
echo =======================================================================
echo.
echo  Configurando acceso directo en tu Escritorio de Windows...
echo.

set "URL=https://ais-dev-t6zv4giuriwdtnp3vyxcz4-568647444940.us-east1.run.app"

:: 1. Respaldo directo en CMD
if exist "%USERPROFILE%\Desktop" (
    echo [InternetShortcut] > "%USERPROFILE%\Desktop\IITCUP Cadena de Custodia.url"
    echo URL=%URL% >> "%USERPROFILE%\Desktop\IITCUP Cadena de Custodia.url"
)
if exist "%USERPROFILE%\OneDrive\Escritorio" (
    echo [InternetShortcut] > "%USERPROFILE%\OneDrive\Escritorio\IITCUP Cadena de Custodia.url"
    echo URL=%URL% >> "%USERPROFILE%\OneDrive\Escritorio\IITCUP Cadena de Custodia.url"
)
if exist "%USERPROFILE%\Escritorio" (
    echo [InternetShortcut] > "%USERPROFILE%\Escritorio\IITCUP Cadena de Custodia.url"
    echo URL=%URL% >> "%USERPROFILE%\Escritorio\IITCUP Cadena de Custodia.url"
)
if exist "%USERPROFILE%\OneDrive\Desktop" (
    echo [InternetShortcut] > "%USERPROFILE%\OneDrive\Desktop\IITCUP Cadena de Custodia.url"
    echo URL=%URL% >> "%USERPROFILE%\OneDrive\Desktop\IITCUP Cadena de Custodia.url"
)

:: 2. Crear Acceso Directo (.lnk) via PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='%URL%'; $desktop = [Environment]::GetFolderPath('Desktop'); if (-not (Test-Path $desktop)) { $desktop = \"$env:USERPROFILE\Desktop\" }; $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(\"$desktop\IITCUP - Cadena de Custodia.lnk\"); $c1 = \"$env:ProgramFiles\Google\Chrome\Application\chrome.exe\"; $c2 = \"$env:ProgramFilesX86\Google\Chrome\Application\chrome.exe\"; $c3 = \"$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe\"; $e1 = \"$env:ProgramFilesX86\Microsoft\Edge\Application\msedge.exe\"; $e2 = \"$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe\"; if (Test-Path $c1) { $s.TargetPath = $c1; $s.Arguments = \"--app=$u\" } elseIf (Test-Path $c2) { $s.TargetPath = $c2; $s.Arguments = \"--app=$u\" } elseIf (Test-Path $c3) { $s.TargetPath = $c3; $s.Arguments = \"--app=$u\" } elseIf (Test-Path $e1) { $s.TargetPath = $e1; $s.Arguments = \"--app=$u\" } elseIf (Test-Path $e2) { $s.TargetPath = $e2; $s.Arguments = \"--app=$u\" } else { $s.TargetPath = $u }; $s.Description = 'Sistema de Cadena de Custodia - IITCUP Policia Boliviana'; $s.WorkingDirectory = \"$env:USERPROFILE\"; $s.Save()"

echo.
echo =======================================================================
echo   [OK] !ACCESO DIRECTO CREADO CON EXITO EN EL ESCRITORIO!
echo.
echo   Revisa tu Escritorio de Windows, encontraras los accesos creados.
echo =======================================================================
echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
