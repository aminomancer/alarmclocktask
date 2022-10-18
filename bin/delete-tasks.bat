@ECHO OFF
SET Location=%~dp0
SET ScriptPath=%Location%delete-tasks.ps1
IF EXIST "%ScriptPath%" (
  PowerShell -NoProfile -NoLogo -ExecutionPolicy Bypass -Command "& '%ScriptPath%'"
) ELSE (
  ECHO Cannot find %ScriptPath%
  ECHO Please run this script from the root of the distribution.
  EXIT /B 1
)
