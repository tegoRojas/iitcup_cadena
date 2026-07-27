import React, { useState } from 'react';
import { Monitor, Download, Check, X, Shield, Terminal, Chrome, ExternalLink, HardDrive } from 'lucide-react';

interface WindowsInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WindowsInstallerModal({ isOpen, onClose }: WindowsInstallerModalProps) {
  const [customUrl, setCustomUrl] = useState(window.location.origin);
  const [appMode, setAppMode] = useState(true);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const generateBatContent = () => {
    const targetUrl = customUrl.trim() || window.location.origin;
    
    // PowerShell script to be executed via Base64 (-EncodedCommand) to avoid CMD escaping issues
    const psScript = `
$u = '${targetUrl}'
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path $desktop)) {
    $desktop = "$env:USERPROFILE\\Desktop"
}

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut("$desktop\\IITCUP - Cadena de Custodia.lnk")

$c1 = "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe"
$c2 = "$env:ProgramFilesX86\\Google\\Chrome\\Application\\chrome.exe"
$c3 = "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe"
$e1 = "$env:ProgramFilesX86\\Microsoft\\Edge\\Application\\msedge.exe"
$e2 = "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe"

if (Test-Path $c1) {
    $s.TargetPath = $c1
    $s.Arguments = "--app=$u"
} elseIf (Test-Path $c2) {
    $s.TargetPath = $c2
    $s.Arguments = "--app=$u"
} elseIf (Test-Path $c3) {
    $s.TargetPath = $c3
    $s.Arguments = "--app=$u"
} elseIf (Test-Path $e1) {
    $s.TargetPath = $e1
    $s.Arguments = "--app=$u"
} elseIf (Test-Path $e2) {
    $s.TargetPath = $e2
    $s.Arguments = "--app=$u"
} else {
    $s.TargetPath = $u
}

$s.Description = 'Sistema de Cadena de Custodia - IITCUP Policia Boliviana'
$s.WorkingDirectory = "$env:USERPROFILE"
$s.Save()

# Crear tambien el acceso directo Web (.url)
$urlFile = "$desktop\\IITCUP - Web Cadena de Custodia.url"
'[InternetShortcut]' | Out-File -FilePath $urlFile -Encoding ascii
"URL=$u" | Out-File -FilePath $urlFile -Encoding ascii -Append
`;

    // Convert script to UTF-16LE Base64 string for PowerShell -EncodedCommand
    const codeUnits = new Uint16Array(psScript.length);
    for (let i = 0; i < psScript.length; i++) {
      codeUnits[i] = psScript.charCodeAt(i);
    }
    const charCodes = new Uint8Array(codeUnits.buffer);
    let binary = '';
    for (let i = 0; i < charCodes.byteLength; i++) {
      binary += String.fromCharCode(charCodes[i]);
    }
    const encodedPs = btoa(binary);

    return `@echo off
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
echo  URL del Servidor: ${targetUrl}
echo.

:: 1. Respaldo directo en CMD (Funciona en todos los escritorios de Windows/OneDrive/Espanol)
if exist "%USERPROFILE%\\Desktop" (
    echo [InternetShortcut] > "%USERPROFILE%\\Desktop\\IITCUP Cadena de Custodia.url"
    echo URL=${targetUrl} >> "%USERPROFILE%\\Desktop\\IITCUP Cadena de Custodia.url"
)
if exist "%USERPROFILE%\\OneDrive\\Escritorio" (
    echo [InternetShortcut] > "%USERPROFILE%\\OneDrive\\Escritorio\\IITCUP Cadena de Custodia.url"
    echo URL=${targetUrl} >> "%USERPROFILE%\\OneDrive\\Escritorio\\IITCUP Cadena de Custodia.url"
)
if exist "%USERPROFILE%\\Escritorio" (
    echo [InternetShortcut] > "%USERPROFILE%\\Escritorio\\IITCUP Cadena de Custodia.url"
    echo URL=${targetUrl} >> "%USERPROFILE%\\Escritorio\\IITCUP Cadena de Custodia.url"
)
if exist "%USERPROFILE%\\OneDrive\\Desktop" (
    echo [InternetShortcut] > "%USERPROFILE%\\OneDrive\\Desktop\\IITCUP Cadena de Custodia.url"
    echo URL=${targetUrl} >> "%USERPROFILE%\\OneDrive\\Desktop\\IITCUP Cadena de Custodia.url"
)

:: 2. Generar Acceso Directo (.lnk) en Modo Aplicacion de Escritorio via PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedPs}

echo.
echo =======================================================================
echo   [OK] !ACCESO DIRECTO CREADO CON EXITO EN EL ESCRITORIO!
echo.
echo   Revisa tu Escritorio de Windows, encontraras los accesos creados:
echo   - "IITCUP - Cadena de Custodia" (Abre en ventana independiente)
echo   - "IITCUP Cadena de Custodia" (Acceso directo Web)
echo =======================================================================
echo.
echo Presiona cualquier tecla para cerrar este instalador...
pause >nul
`;
  };

  const handleDownload = () => {
    const content = generateBatContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Instalar_IITCUP_Escritorio.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-olivo-900 text-white px-6 py-4 flex items-center justify-between border-b border-olivo-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-oro-600/20 border border-oro-500/30 flex items-center justify-center text-oro-400 shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white leading-tight">Instalador para Windows</h3>
              <p className="text-[10px] text-oro-400 font-extrabold uppercase tracking-wider mt-0.5">Acceso Directo al Escritorio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-slate-50">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-olivo-800 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Este instalador genera un <strong className="text-slate-800">Acceso Directo en tu Escritorio de Windows</strong> para ingresar al <strong className="text-olivo-900">Sistema IITCUP Cadena de Custodia</strong> con un solo doble clic.
              </p>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-olivo-800" />
              Configuración del Acceso Directo
            </h4>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">
                URL del Servidor del Sistema:
              </label>
              <input 
                type="text" 
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-olivo-800/20 focus:border-olivo-800"
                placeholder="https://tu-servidor-iitcup.com"
              />
              <span className="text-[9px] text-slate-400 block font-medium">
                Detectado automáticamente desde tu navegador actual.
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={appMode}
                  onChange={(e) => setAppMode(e.target.checked)}
                  className="w-4 h-4 text-olivo-800 rounded border-slate-300 focus:ring-olivo-800"
                />
                <div className="overflow-hidden">
                  <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                    <Chrome className="w-3.5 h-3.5 text-blue-600" />
                    Modo Aplicación de Escritorio (Sin barras del navegador)
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Abre el sistema como una ventana independiente sin barras de direcciones.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-[11px] text-amber-900 space-y-1.5">
            <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
              <HardDrive className="w-4 h-4 text-amber-700" />
              Instrucciones de Instalación en Windows:
            </div>
            <ol className="list-decimal list-inside space-y-1 font-medium text-amber-800/90 pl-1">
              <li>Haz clic en <strong>"Descargar Instalador (.bat)"</strong> abajo.</li>
              <li>Abre tu carpeta de <em>Descargas</em> en Windows.</li>
              <li>Haz doble clic en <strong>Instalar_IITCUP_Escritorio.bat</strong>.</li>
              <li>¡Listo! Verás el icono <strong>"IITCUP - Cadena de Custodia"</strong> en tu Escritorio.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 ${
              downloaded
                ? 'bg-emerald-600 text-white'
                : 'bg-olivo-900 hover:bg-olivo-800 text-white hover:shadow-lg'
            }`}
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                ¡Instalador Descargado!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar Instalador (.bat)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
