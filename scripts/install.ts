import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { banner, fail, info, success, warn } from "./console";
import { run, step } from "./tasks";
import {
  backupPath,
  GTK_THEME,
  gtk4UserCss,
  ICON_THEME,
  paths,
  type Setting,
  settings,
  USER_THEME_EXTENSION,
} from "./theme";

const copyTree = ({
  source,
  target,
  exclude = [],
}: {
  source: string;
  target: string;
  exclude?: string[];
}) => {
  if (!existsSync(source)) throw new Error(`${source} not found; run from the repository root`);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(target, ".."), { recursive: true });
  // cp -P copies the themes' relative symlinks as they are, so the installed copy does not point
  // back into the repository.
  const { exitCode, stderr } = Bun.spawnSync(["cp", "-RP", source, target]);
  if (exitCode !== 0) throw new Error(stderr.toString().trim());
  for (const name of exclude) rmSync(join(target, name), { recursive: true, force: true });
  success(`${source} → ${target}`);
};

const backupOnce = (path: string) => {
  if (!existsSync(path)) return;
  const backup = backupPath(path);
  if (existsSync(backup)) return;
  renameSync(path, backup);
  warn(`existing ${path} moved to ${backup}`);
};

const ensureSetting = ({ file, key, value }: { file: string; key: string; value: string }) => {
  const current = existsSync(file) ? readFileSync(file, "utf8") : "[Settings]\n";
  const line = `${key}=${value}`;
  const hasKey = new RegExp(`^${key}=.*$`, "m");
  const updated = hasKey.test(current)
    ? current.replace(hasKey, line)
    : `${current.trimEnd()}\n${line}\n`;
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, updated);
};

const writeUserCss = () => {
  const { gtk4UserCss: userCssFile } = paths;
  backupOnce(userCssFile);
  mkdirSync(join(userCssFile, ".."), { recursive: true });
  writeFileSync(userCssFile, gtk4UserCss);
  success(userCssFile);
};

const preferDark = () => {
  const { settingsIni } = paths;
  for (const file of settingsIni)
    ensureSetting({ file, key: "gtk-application-prefer-dark-theme", value: "1" });
  success(settingsIni.join(", "));
};

const setCommand = ({ schema, key, value }: Setting) => ["gsettings", "set", schema, key, value];

const applyDesktopSettings = async () => {
  const { icons } = paths;
  const commands = [
    ["gtk-update-icon-cache", "-f", "-t", icons.target],
    setCommand(settings.iconTheme),
    setCommand(settings.gtkTheme),
    ["gsettings", "set", "org.gnome.desktop.interface", "color-scheme", "prefer-dark"],
  ];
  const results = await Promise.all(commands.map(run));
  const allApplied = results.every(Boolean);

  return allApplied;
};

const applyShellTheme = async () => {
  const enabled = await run(["gnome-extensions", "enable", USER_THEME_EXTENSION]);
  if (!enabled) return false;
  const applied = await run(setCommand(settings.shellTheme));

  return applied;
};

const { icons, theme } = paths;

banner({ subtitle: `install ${ICON_THEME} icons and ${GTK_THEME} theme` });

step({ name: "copying icon theme", action: () => copyTree(icons) });
step({
  name: "copying GTK and shell theme",
  action: () => copyTree({ ...theme, exclude: ["src"] }),
});
step({ name: "wiring libadwaita user stylesheet", action: writeUserCss });
step({ name: "preferring dark in settings.ini", action: preferDark });

info("applying GNOME settings");
const desktopApplied = await applyDesktopSettings();
const shellThemed = await applyShellTheme();

if (!shellThemed)
  fail("shell theme not applied: install gnome-shell-extensions and enable User Themes");
if (!desktopApplied) {
  fail("files installed, but some GNOME settings were not applied (see warnings above)");
  process.exit(1);
}

success("installed; restart running apps to pick up the theme");
