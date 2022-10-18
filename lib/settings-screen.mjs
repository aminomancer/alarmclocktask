import * as util from "node:util";
import sudo from "sudo-prompt";
import isAdmin from "is-admin";
import appRoot from "app-root-path";
import which from "which";
import XRegExp from "xregexp";
import { waitUntil } from "async-wait-until/dist/commonjs.js";
import { Searcher } from "fast-fuzzy";
import inquirer from "inquirer";
import DatePrompt from "inquirer-date-prompt";
import { AutocompletePromptPrefixed as AutocompletePrompt } from "./autocomplete-prompt.mjs";
import { icons } from "./icons.mjs";
import emojiUnicode from "emoji-unicode";
import { PowerShell } from "node-powershell";
import { writeJsonFile } from "write-json-file";
import { loadJsonFile } from "load-json-file";

export function normalizeKeys(obj) {
  Object.keys(obj).map(key => {
    const value = obj[key];
    delete obj[key];
    if (value == null) return;
    obj[key.toLowerCase()] = value;
  });
  return obj;
}

export function getShell({ ...args } = {}) {
  return new PowerShell({
    debug: false,
    executableOptions: {
      "-ExecutionPolicy": "Bypass",
      "-NoProfile": true,
    },
    ...args,
  });
}

export async function getTask(taskName = "Alarm Clock Task 1") {
  const ps = getShell();
  try {
    const cmd = await ps.invoke(
      PowerShell.command`(Get-ScheduledTask -ErrorAction SilentlyContinue -TaskName '${taskName}').State;`
    );
    const task = cmd.stdout.toString();
    return task;
  } catch (error) {
    return false;
  } finally {
    await ps.dispose();
  }
}

export async function getUsername() {
  const ps = getShell();
  try {
    const cmd = await ps.invoke(
      PowerShell.command`[System.Security.Principal.WindowsIdentity]::GetCurrent().Name;`
    );
    const username = cmd.stdout.toString().trim();
    return username;
  } catch (error) {
    return false;
  } finally {
    await ps.dispose();
  }
}

export async function getSoundDevices() {
  const ps = getShell();
  let devices = false;
  try {
    const cmd = await ps.invoke(
      PowerShell.command`Get-AudioDevice -List | Where-Object { $_.Type -eq 'Playback' } | Select-Object Name,Default | ConvertTo-Json;`
    );
    devices = JSON.parse(cmd.stdout.toString());
    for (let i in devices) {
      normalizeKeys(devices[i]);
      if (!devices[i].name) {
        devices.splice(i, 1);
        continue;
      }
      let value = devices[i].name.replace(/(\r\n|\n|\r)/gm, "");
      const rgx = XRegExp(`\\s?\\((?:[^)(]|\\([^)(]*\\))*\\)$`, "g");
      devices[i].name = devices[i].value = XRegExp.replace(value, rgx, "");
    }
  } catch (error) {
  } finally {
    await ps.dispose();
  }
  return devices;
}

export default class SettingsScreen {
  constructor(choices) {
    this.menuChoices = choices || [
      {
        name: "Set username",
        prefix: icons.username,
        value: "username",
      },
      {
        name: "Set password",
        prefix: icons.password,
        value: "password",
      },
      { name: "Set URL", prefix: icons.url, value: "url" },
      { name: "Set command", prefix: icons.command, value: "command" },
      { name: "Set audio device", prefix: icons.device, value: "device" },
      { name: "Set volume", prefix: icons.volume, value: "volume" },
      { name: "Set time", prefix: icons.time, value: "time" },
      { name: "Set schedule", prefix: icons.days, value: "days" },
      { name: "Save settings", prefix: icons.save, value: "save" },
      {
        name: "Install tasks",
        prefix: icons.install,
        value: "install",
        requiresAdmin: true,
      },
      {
        name: "Delete tasks",
        prefix: icons.delete,
        value: "delete",
        requiresAdmin: true,
      },
      { name: "Exit", prefix: icons.exit, value: "exit" },
    ];
    this.menuChoices.disable = function (value, msg = true) {
      this.forEach(choice => {
        if (choice.value === value) choice.disabled = msg;
      });
    };
    this.menuChoices.enable = function (value) {
      this.forEach(choice => {
        if (choice.value === value) choice.disabled = false;
      });
    };
  }

  async startup() {
    this.ui = new inquirer.ui.BottomBar();
    if (process.platform !== "win32") {
      this.ui.updateBottomBar("🚫 This program only works on Windows\n");
      return false;
    }
    inquirer.registerPrompt("autocomplete", AutocompletePrompt);
    inquirer.registerPrompt("date", DatePrompt);

    this.config = await this.loadConfig();
    this.isAdmin = await isAdmin();
    return true;
  }

  async loadConfig() {
    let config;
    try {
      config = await loadJsonFile("user-config.json");
    } catch (error) {
      config = {};
    }
    config.nircmd_path =
      which.sync("nircmd", { nothrow: true }) ||
      appRoot.resolve(
        `/bin/nircmd_${process.arch === "x64" ? "x64" : "x86"}/nircmd.exe`
      );
    return config;
  }

  get menuSearcher() {
    if (!this._menuSearcher) {
      this._menuSearcher = new Searcher(this.menuChoices, {
        keySelector: choice => choice.name,
        threshold: 0.8,
      });
    }
    return this._menuSearcher;
  }

  searchMenu(answers, input = "") {
    if (!input) {
      return this.menuChoices;
    }
    return this.menuSearcher.search(input);
  }

  async showMenu() {
    let choice = "";
    let selected;
    if (!this.isAdmin) {
      this.ui.log.write(
        `⚠️ Generating the tasks requires admin privileges so your alarm clock can
        run GUI apps in your user profile. After setup, "elevated" shortcuts are added
        to the Start Menu, which can be used to configure the alarm clock without a UAC
        prompt. Otherwise, the settings app will request elevation when necessary.`
      );
    }
    this.ui.log.write(
      `🔐 Your settings will be stored in a file called "user-config.json" in the same\ndirectory as this program, with your password encrypted.\n\n`
    );
    let task = await getTask();
    while (choice !== "exit") {
      if (!task) {
        this.menuChoices.enable("install");
        this.menuChoices.disable("delete", "No tasks found");
        this.menuChoices.disable("update", "No tasks found");
      } else {
        this.menuChoices.disable("install", "Tasks already exist");
        this.menuChoices.enable("delete");
        this.menuChoices.enable("update");
      }
      choice = await this.promptMenu({ default: selected });
      selected = choice;
      switch (choice) {
        case "username":
          await this.promptForUsername();
          break;
        case "password":
          await this.promptForPassword();
          break;
        case "url":
          await this.promptForUrl();
          break;
        case "command":
          await this.promptForCommand();
          break;
        case "device":
          await this.promptForDevice();
          break;
        case "volume":
          await this.promptForVolume();
          break;
        case "time":
          await this.promptForTime();
          break;
        case "days":
          await this.promptForDays();
          break;
        case "install":
          await this.installTasks();
          task = await getTask();
          break;
        case "delete":
          await this.deleteTasks();
          task = await getTask();
          break;
        case "save":
          {
            let saved = await this.promptForSave();
            if (saved) {
              selected = "exit";
            }
          }
          break;
        default:
          break;
      }
    }
  }

  async setFromPrompt(prompts) {
    try {
      const answer = await inquirer.prompt(prompts);
      Object.assign(this.config, answer);
      return answer;
    } catch (error) {
      return false;
    }
  }

  async promptMenu({ ...args } = {}) {
    const searchMenu = this.searchMenu.bind(this);
    const answer = await inquirer.prompt({
      type: "autocomplete",
      name: "menu",
      prefix: icons.settings,
      message: "What would you like to do?",
      pageSize: 20,
      source: searchMenu,
      ...args,
    });
    return answer.menu;
  }

  // TODO - Remove this
  async installTasks() {
    this.ui.updateBottomBar("⏳ Installing tasks...\n");
    try {
      const sudoExec = util.promisify(sudo.exec);
      await sudoExec(`${appRoot.path}\\bin\\install-tasks.bat`, {});
      this.ui.updateBottomBar("🎉 Tasks installed successfully!\n");
    } catch (error) {
      this.ui.updateBottomBar(
        `🤦‍♂️ Failed to install tasks (${error
          .toString()
          .replace(/^Error:\s/, "")
          .replace(/\.$/, "")})\n`
      );
    }
  }

  /**
   * Save tasks without a UAC prompt. Requires shortcut tasks from bootstrapper.
   * TODO - Only use elevated task if not admin and shortcut tasks exist.
   * TODO - Only allow saving tasks if config JSON is complete.
   * TODO - Use "install" or "update" or "save" depending on if tasks exist.
   */
  async saveTasks() {
    const ps = getShell();
    try {
      const taskName = "Save Alarm Clock Tasks";
      await ps.invoke(
        PowerShell.command`nircmd exec hide schtasks /run /tn "Alarm Clock Task\\${taskName}"`
      );
      this.ui.updateBottomBar("⏳ Saving tasks...\n");
      const saved = await waitUntil(
        async () => "Running" !== (await getTask(taskName)),
        {
          timeout: 7000,
          intervalBetweenAttempts: 300,
        }
      );
      if (saved) {
        this.ui.updateBottomBar("🎉 Updated scheduled tasks!\n");
      } else {
        this.ui.updateBottomBar("⌛ Timed out updating scheduled tasks\n");
      }
    } catch (error) {
      this.ui.updateBottomBar("⛔ " + error + "\n");
    } finally {
      await ps.dispose();
    }
  }

  async deleteTasks() {
    // TODO support deleting tasks
    return null;
  }

  async promptForUsername() {
    return this.setFromPrompt([
      {
        type: "input",
        name: "username",
        prefix: icons.username,
        message: `${this.config.username ? "Update" : "Enter"} your username:`,
        default: this.config.username || (await getUsername()),
      },
    ]);
  }

  async promptForUrl() {
    // TODO merge url and command into autocomplete prompt that asks if you want
    //      to use a url or a command.
    // TODO automatically turn youtube playlist links into shuffler links
    //      (for use with my youtube shuffler greasemonkey script)
    // TODO url validation.
    return this.setFromPrompt([
      {
        type: "input",
        name: "url",
        prefix: icons.url,
        message: `${
          this.config.url ? "Update" : "Enter"
        } the URL of the media/playlist:`,
        default: this.config.url,
      },
    ]);
  }

  async promptForCommand() {
    return this.setFromPrompt([
      {
        type: "input",
        name: "command",
        prefix: icons.command,
        message: "Enter the command to run when the alarm clock goes off:",
      },
      {
        type: "input",
        name: "args",
        prefix: icons.args,
        message: "Enter the arguments to pass to the command:",
      },
    ]);
  }

  async promptForDevice() {
    const devices = await getSoundDevices();
    if (devices) {
      let menuSearcher = new Searcher(devices, {
        keySelector: choice => choice.name,
        threshold: 0.8,
      });
      return this.setFromPrompt([
        {
          type: "autocomplete",
          name: "device",
          prefix: icons.device,
          message: "Choose an audio device to play the media on:",
          pageSize: 20,
          source: (answers, input = "") =>
            input ? menuSearcher.search(input) : devices,
          default: this.config.device || devices.find(d => d.default)?.value,
        },
      ]);
    } else {
      return this.setFromPrompt({
        type: "input",
        name: "device",
        prefix: icons.device,
        message: "Enter the name of the device to play the media on:",
        default: this.config.device,
      });
    }
  }

  async promptForVolume() {
    return this.setFromPrompt([
      {
        type: "number",
        name: "volume",
        prefix: icons.volume,
        message: "Enter your preferred volume (0-100):",
        default: this.config.volume || 50,
        validate: s =>
          (s >= 0 && s <= 100) || "Volume must be between 0 and 100",
      },
    ]);
  }

  async promptForTime() {
    const prompt = {
      type: "date",
      name: "time",
      prefix: icons.time,
      message: "At what time should the alarm clock go off?",
      format: {
        year: undefined,
        month: undefined,
        day: undefined,
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      },
      filter: s =>
        s.toLocaleString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
      clearable: true,
    };
    if (this.config.time) {
      prompt.default = new Date(`1970-01-01 ${this.config.time}`);
    }
    return this.setFromPrompt([prompt]);
  }

  async promptForDays() {
    return this.setFromPrompt([
      {
        type: "checkbox",
        name: "days",
        prefix: icons.days,
        message: "On which days should the alarm clock go off?",
        choices: [
          { name: "Sunday" },
          { name: "Monday" },
          { name: "Tuesday" },
          { name: "Wednesday" },
          { name: "Thursday" },
          { name: "Friday" },
          { name: "Saturday" },
        ],
        default: this.config.days || [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        validate: s => s.length > 0 || "You must select at least one day",
      },
    ]);
  }

  async promptForPassword() {
    const ps = getShell();
    try {
      const msg = `${this.config.password ? "Update" : "Enter"} your password`;
      let prompt;
      if (icons.password) {
        const code = emojiUnicode(icons.password).toUpperCase();
        prompt = PowerShell.command`$EmojiIcon = [System.Char]::ConvertFromUtf32([System.Convert]::toInt32(${code},16)); Read-Host "$EmojiIcon${msg}" -AsSecureString |  ConvertFrom-SecureString -ErrorAction SilentlyContinue`;
      } else {
        prompt = PowerShell.command`Read-Host "${msg}" -AsSecureString |  ConvertFrom-SecureString -ErrorAction SilentlyContinue`;
      }
      const answer = await ps.invoke(prompt);
      const encrypted = answer.stdout.toString();
      this.config.password = encrypted;
    } catch (error) {
      return false;
    } finally {
      await ps.dispose();
    }
  }

  async promptForSave() {
    let unanswered = [];
    if (!this.config.username) {
      unanswered.push("username");
    }
    if (!this.config.password) {
      unanswered.push("password");
    }
    const save = await inquirer.prompt({
      type: "confirm",
      name: "confirmed",
      prefix: "💾",
      message: "Save these settings?",
      default: true,
    });
    if (save.confirmed) {
      this.ui.updateBottomBar("✍ Writing settings to user-config.json\n");
      await writeJsonFile("./user-config.json", this.config, {
        indent: 2,
        detectIndent: true,
      });
      this.ui.updateBottomBar("📝 Wrote settings to user-config.json\n");
      await this.saveTasks();
      return true;
    } else {
      return false;
    }
  }
}
