import * as util from "node:util";
import sudo from "sudo-prompt";
import appRoot from "app-root-path";

const sudoExec = util.promisify(sudo.exec);
await sudoExec(`${appRoot.path}\\bin\\bootstrap.bat`, {});
console.log("⏳ Shortcuts installed, loading settings...");
