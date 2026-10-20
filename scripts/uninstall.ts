import { existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { banner, fail, info, success, warn } from "./console";
import { capture, run, step } from "./tasks";
import {
  backupPath,
  GTK_THEME,
  gtk4UserCss,
  ICON_THEME,
  paths,
  type Setting,
  settings,
} from "./theme";

const removeTree = (target: string) => {
  if (existsSync(target)) {
    rmSync(target, { recursive: true });
    success(`removed ${target}`);
  } else {
    warn(`${target} not found, skipped`);
  }
};

// Removes the stylesheet only while it is still the installer's one-line import.
const removeUserCss = (file: string) => {
  if (!existsSync(file)) return true;
  const untouched = readFileSync(file, "utf8") === gtk4UserCss;
  if (untouched) {
    rmSync(file);
    success(`removed ${file}`);
  } else {
    warn(`${file} was edited after install, left as is`);
  }

  return untouched;
};

const restoreBackup = (file: string) => {
  const backup = backupPath(file);
  if (!existsSync(backup)) return;
  renameSync(backup, file);
  success(`restored ${file} from ${backup}`);
};

const restoreUserCss = () => {
  const { gtk4UserCss: userCssFile } = paths;
  if (removeUserCss(userCssFile)) restoreBackup(userCssFile);
};

const resetIfApplied = async ({ schema, key, value }: Setting) => {
  const label = `${schema} ${key}`;
  const current = capture(["gsettings", "get", schema, key]);
  if (current !== `'${value}'`) {
    info(`${label} is ${current ?? "unavailable"}, left as is`);

    return true;
  }
  const reset = await run(["gsettings", "reset", schema, key]);
  if (reset) success(`${label} reset`);

  return reset;
};

const { icons, theme } = paths;

banner({ subtitle: `uninstall ${ICON_THEME} icons and ${GTK_THEME} theme` });

info("resetting GNOME settings");
const results = await Promise.all(Object.values(settings).map(resetIfApplied));
const allReset = results.every(Boolean);

step({ name: "removing icon theme", action: () => removeTree(icons.target) });
step({ name: "removing GTK and shell theme", action: () => removeTree(theme.target) });
step({ name: "restoring libadwaita user stylesheet", action: restoreUserCss });

if (!allReset) {
  fail("files removed, but some GNOME settings were not reset (see warnings above)");
  process.exit(1);
}

success("uninstalled; prefer-dark and User Themes left as they were; restart running apps");
