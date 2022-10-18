$Location = Convert-Path .;
$Location = $Location.Trim();
while ($Location -and $Location -notmatch "alarmclocktask$") { $Location = Split-Path $Location };
if (-NOT $Location) { Write-Error "Could not find the alarmclocktask directory."; Exit 1 };

$Config = Get-Content -Path ($Location + "\user-config.json") -ErrorAction SilentlyContinue | ConvertFrom-Json;
if (-NOT $Config) { throw "Could not locate user-config.json. Please try running bootstrap first." }

$TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DontStopOnIdleEnd -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances "Parallel" -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -Compatibility Win8;
$Username = $Config.username;
$Password = $Config.password | ConvertTo-SecureString;
$Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password));
[dayofweek[]]$Days = $Config.days;

$Task1Trigger= New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $Config.time;
$Task1Trigger.StartBoundary = [DateTime]::Parse($Task1Trigger.StartBoundary).ToLocalTime().ToString("s");

$Volume = [int][Math]::Round(65535 * ([int]$Config.volume / 100));
$Task1Command = $(if ($Config.nircmd_path) { $Config.nircmd_path } else { (Get-Command -ErrorAction SilentlyContinue nircmd.exe).Path });
$Task1Args1 = "setdefaultsounddevice `"" + $Config.device + "`" 1";
$Task1Args2 = "setsysvolume " + $Volume;
$Task1Actions = (New-ScheduledTaskAction -Execute $Task1Command -Argument $Task1Args1),
                (New-ScheduledTaskAction -Execute $Task1Command -Argument $Task1Args2);

$Task1Params = @{
  "TaskName"    = "Alarm Clock Task 1"
  "Action"      = $Task1Actions
  "Trigger"     = $Task1Trigger
  "User"        = $Username
  "Password"    = $Password
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Wake and set volume"
  "TaskPath"    = "Alarm Clock Task"
}

$Task2Trigger= New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At ($Config.time + ":30");
$Task2Trigger.StartBoundary = [DateTime]::Parse($Task2Trigger.StartBoundary).ToLocalTime().ToString('s');

if ($Config.url) {
  $Task2Command = (Get-Command -ErrorAction SilentlyContinue rundll32.exe).Path;
  $Task2Args = "url.dll,FileProtocolHandler " + "`"" + $Config.url + "`"";
} else {
  $Task2Command = $Config.command;
  $Task2Args = $Config.args;
}
$Task2Actions = (New-ScheduledTaskAction -Execute $Task1Command -Argument $Task1Args1),
                (New-ScheduledTaskAction -Execute $Task1Command -Argument $Task1Args2),
                (New-ScheduledTaskAction -Execute $Task2Command -Argument $Task2Args);

$Task2Params = @{
  "TaskName"    = "Alarm Clock Task 2"
  "Action"      = $Task2Actions
  "Trigger"     = $Task2Trigger
  "User"        = $Username
  "Settings"    = $TaskSettings
  "RunLevel"    = "Highest"
  "Description" = "Start playlist"
  "TaskPath"    = "Alarm Clock Task"
}

foreach ($Task in ($Task1Params, $Task2Params)) {
  Unregister-ScheduledTask -TaskName $Task.TaskName -Confirm:$false -ErrorAction SilentlyContinue;
  Register-ScheduledTask @Task;
}
