// TODO - Redo this file

import inquirer from "inquirer";
import DatePrompt from "inquirer-date-prompt";
import { PowerShell } from "node-powershell";
import { writeJsonFile } from "write-json-file";
import { loadJsonFile } from "load-json-file";

if (process.platform !== "win32") {
  console.log("This program only works on Windows");
  process.exit(1);
}

let config;
try {
  config = await loadJsonFile("user-config.json");
} catch (error) {
  config = {};
}

inquirer.registerPrompt("date", DatePrompt);

const timePrompt = {
  type: "date",
  name: "time",
  prefix: "⏰",
  message: "At what time should the alarm clock go off?",
  format: {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  },
  // transformer: s => `\x1b[32m${s}`,
  filter: s =>
    s.toLocaleString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }),
  clearable: true,
};

const daysPrompt = {
  type: "checkbox",
  name: "days",
  prefix: "📆",
  message: "On which days should the alarm clock go off?",
  choices: [
    { name: "Sunday", value: "Sunday" },
    { name: "Monday", value: "Monday" },
    { name: "Tuesday", value: "Tuesday" },
    { name: "Wednesday", value: "Wednesday" },
    { name: "Thursday", value: "Thursday" },
    { name: "Friday", value: "Friday" },
    { name: "Saturday", value: "Saturday" },
  ],
  validate: s => s.length > 0 || "You must select at least one day",
};

const timePS = new PowerShell({
  debug: false,
  executableOptions: {
    "-ExecutionPolicy": "Bypass",
    "-NoProfile": true,
  },
});
try {
  const getTime = PowerShell.command`$Alarmp1 = Get-ScheduledTask -TaskName 'Alarm Clock p1';
$Date = Get-Date -UFormat '%Y-%m-%dT%H:%M' ([DateTime]::Parse($Alarmp1.Triggers.StartBoundary));
echo $Date;`;
  const out = await timePS.invoke(getTime);
  timePrompt.default = new Date(out.stdout.toString());
} catch (error) {
} finally {
  await timePS.dispose();
}

const answers = await inquirer.prompt([timePrompt, daysPrompt]);

Object.assign(config, answers);

await writeJsonFile("./user-config.json", config, {
  indent: 2,
  detectIndent: true,
});
console.log("Wrote settings to user-config.json");
