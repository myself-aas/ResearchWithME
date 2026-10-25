@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\..\..\.."
if exist "%PROJECT_ROOT%\node_modules\.bin\impeccable.cmd" (
  call "%PROJECT_ROOT%\node_modules\.bin\impeccable.cmd" %*
) else (
  call npx --yes impeccable@4.7.0 %*
)
exit /b %ERRORLEVEL%
