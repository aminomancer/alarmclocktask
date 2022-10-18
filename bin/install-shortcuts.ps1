$Location = Convert-Path .;
$Location = $Location.Trim();
while ($Location -and $Location -notmatch 'alarmclocktask$') { $Location = Split-Path $Location };
if (-NOT $Location) { Write-Error 'Could not find the alarmclocktask directory.'; Exit 1 };

$Config = Get-Content -Path ($Location + "\user-config.json") -ErrorAction SilentlyContinue | ConvertFrom-Json;

$TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances "Parallel";
$Username = $(if ($Config.username) { $Config.username } else { [System.Security.Principal.WindowsIdentity]::GetCurrent().Name });

$NircmdPath = $(if ($Config.nircmd_path) { $Config.nircmd_path } else { (Get-Command -ErrorAction SilentlyContinue nircmd.exe).Path });

if ((Get-Command 'wt' -ErrorAction SilentlyContinue).Path) {
  $ShellPath = "wt";
  $SettingsArgs = "nt -d . powershell -NoProfile -NoLogo -ExecutionPolicy Bypass `"npm run settings \; Exit`"";
  $SetClockArgs = "nt -d . powershell -NoProfile -NoLogo -ExecutionPolicy Bypass `"npm run set-clock \; Exit`"";
} else {
  $ShellPath = "powershell";
  $SettingsArgs = "-NoProfile -NoLogo -ExecutionPolicy Bypass `"npm run settings \; Exit`"";
  $SetClockArgs = "-NoProfile -NoLogo -ExecutionPolicy Bypass `"npm run set-clock \; Exit`"";
}

$SettingsAction = New-ScheduledTaskAction -Execute $ShellPath -Argument $SettingsArgs -WorkingDirectory $Location;
$SetClockAction = New-ScheduledTaskAction -Execute $ShellPath -Argument $SetClockArgs -WorkingDirectory $Location;
$SaveTasksAction = New-ScheduledTaskAction -Execute $NircmdPath -Argument "elevatecmd exec hide powershell -NoProfile -NoLogo -ExecutionPolicy Bypass `"bin\install-tasks.ps1`"" -WorkingDirectory $Location;
$DisableTask1Action = New-ScheduledTaskAction -Execute $NircmdPath -Argument "elevatecmd exec hide schtasks /change /tn `"Alarm Clock Task 1`" /disable";
$DisableTask2Action = New-ScheduledTaskAction -Execute $NircmdPath -Argument "elevatecmd exec hide schtasks /change /tn `"Alarm Clock Task 2`" /disable";
$EnableTask1Action = New-ScheduledTaskAction -Execute $NircmdPath -Argument "elevatecmd exec hide schtasks /change /tn `"Alarm Clock Task 1`" /enable";
$EnableTask2Action = New-ScheduledTaskAction -Execute $NircmdPath -Argument "elevatecmd exec hide schtasks /change /tn `"Alarm Clock Task 2`" /enable";

$SettingsParams = @{
  "TaskName"    = "Alarm Clock Settings"
  "Action"      = $SettingsAction
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Update settings for Alarm Clock Task"
  "TaskPath"    = "Alarm Clock Task"
}
$SetClockParams = @{
  "TaskName"    = "Set Alarm Clock"
  "Action"      = $SetClockAction
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Set the time for Alarm Clock Task"
  "TaskPath"    = "Alarm Clock Task"
}
$SaveTasksParams = @{
  "TaskName"    = "Save Alarm Clock Tasks"
  "Action"      = $SaveTasksAction
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Update the alarm clock tasks with the current settings"
  "TaskPath"    = "Alarm Clock Task"
}
$DisableTask1Params = @{
  "TaskName"    = "Disable Alarm Clock Task 1"
  "Action"      = $DisableTask1Action
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Disable the first part of Alarm Clock Task"
  "TaskPath"    = "Alarm Clock Task"
}
$DisableTask2Params = @{
  "TaskName"    = "Disable Alarm Clock Task 2"
  "Action"      = $DisableTask2Action
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Disable the second part of Alarm Clock Task"
  "TaskPath"    = "Alarm Clock Task"
}
$EnableTask1Params = @{
  "TaskName"    = "Enable Alarm Clock Task 1"
  "Action"      = $EnableTask1Action
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Enable the first part of Alarm Clock Task"
  "TaskPath"    = "Alarm Clock Task"
}
$EnableTask2Params = @{
  "TaskName"    = "Enable Alarm Clock Task 2"
  "Action"      = $EnableTask2Action
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Enable the second part of Alarm Clock Task"
  "TaskPath"    = "Alarm Clock Task"
}


foreach ($Task in ($SettingsParams, $SetClockParams, $SaveTasksParams, $DisableTask1Params, $DisableTask2Params, $EnableTask1Params, $EnableTask2Params)) {
  Unregister-ScheduledTask -TaskName $Task.TaskName -Confirm:$false -ErrorAction SilentlyContinue;
  Register-ScheduledTask @Task;
}

$WScriptShell = New-Object -ComObject WScript.Shell;

$ShortcutsPath = $WScriptShell.SpecialFolders("Programs") + "\Alarm Clock Task";
[System.IO.Directory]::CreateDirectory($ShortcutsPath);
$SettingsShortcutPath = $ShortcutsPath + "\Alarm Clock Settings.lnk";
$SetClockShortcutPath = $ShortcutsPath + "\Set Alarm Clock.lnk";
$DisableShortcutPath = $ShortcutsPath + "\Disable Alarm Clock.lnk";
$EnableShortcutPath = $ShortcutsPath + "\Enable Alarm Clock.lnk";
$TriggerShortcutPath = $ShortcutsPath + "\Trigger Alarm Clock.lnk";

foreach ($ShortcutPath in ($SettingsShortcutPath, $SetClockShortcutPath, $DisableShortcutPath, $EnableShortcutPath, $TriggerShortcutPath)) {
  if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force -ErrorAction SilentlyContinue };
}

$SettingsShortcut = $WScriptShell.CreateShortcut($SettingsShortcutPath);
$SetClockShortcut = $WScriptShell.CreateShortcut($SetClockShortcutPath);
$DisableShortcut = $WScriptShell.CreateShortcut($DisableShortcutPath);
$EnableShortcut = $WScriptShell.CreateShortcut($EnableShortcutPath);
$TriggerShortcut = $WScriptShell.CreateShortcut($TriggerShortcutPath);

$SettingsShortcut.Arguments = "exec hide schtasks /run /tn `"Alarm Clock Settings`"";
$SetClockShortcut.Arguments = "exec hide schtasks /run /tn `"Set Alarm Clock`"";
$DisableShortcut.Arguments = "exec hide schtasks /run /tn `"Disable Alarm Clock Task 1`" & schtasks /run /tn `"Disable Alarm Clock Task 2`"";
$EnableShortcut.Arguments = "exec hide schtasks /run /tn `"Enable Alarm Clock Task 1`" & schtasks /run /tn `"Enable Alarm Clock Task 2`"";
$TriggerShortcut.Arguments = "exec hide schtasks /run /tn `"Alarm Clock Task 1`" & TIMEOUT /T 2 /NOBREAK & schtasks /run /tn `"Alarm Clock Task 1`"";

$SettingsShortcut.Description = "Alarm Clock Settings";
$SetClockShortcut.Description = "Set Alarm Clock";
$DisableShortcut.Description = "Disable Alarm Clock";
$EnableShortcut.Description = "Enable Alarm Clock";
$TriggerShortcut.Description = "Trigger Alarm Clock";

$IconLocation = $Location + "\res\clock.ico";
foreach ($Shortcut in ($SettingsShortcut, $SetClockShortcut, $DisableShortcut, $EnableShortcut, $TriggerShortcut)) {
  $Shortcut.TargetPath = $NircmdPath;
  $Shortcut.WorkingDirectory = $Location;
  $Shortcut.IconLocation = $IconLocation;
  $Shortcut.Save();
}

echo $SettingsShortcutPath;
