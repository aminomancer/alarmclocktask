import SettingsScreen from "./lib/settings-screen.mjs";

const screen = new SettingsScreen();
const compatible = await screen.startup();
if (!compatible) process.exit(1);
await screen.showMenu();
