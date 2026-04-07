' This VBScript elevates PowerShell to run the setup script
' Save as: setup-autostart-elevated.vbs
' Run by double-clicking this file

Dim objShell
Set objShell = CreateObject("Shell.Application")

' Get the path to PowerShell and the setup script
Dim psPath, scriptPath
psPath = "powershell.exe"
scriptPath = "c:\laragon\www\Luxo-Account-Management\setup-autostart.ps1"

' Build command line
Dim cmdLine
cmdLine = "-ExecutionPolicy Bypass -File """ & scriptPath & """"

' Run PowerShell as administrator
objShell.ShellExecute psPath, cmdLine, "", "runas", 1

Set objShell = Nothing
