import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { banner, fail, info, success, warn } from "./console";

const HOME = homedir();
const ICON_THEME = "Sweet-Candy-Icons";
const GTK_THEME = "Sweet-Candy-Theme";

const paths = {
  icons: { source: ICON_THEME, target: join(HOME, ".icons", ICON_THEME) },
  theme: { source: GTK_THEME, target: join(HOME, ".themes", GTK_THEME) },
  gtk4UserCss: join(HOME, ".config", "gtk-4.0", "gtk.css"),
  settingsIni: ["gtk-3.0", "gtk-4.0"].map((dir) => join(HOME, ".config", dir, "settings.ini")),
};

// libadwaita apps ignore the gtk-theme setting and only read this file; importing the theme's
// stylesheet keeps its relative asset paths resolving inside ~/.themes.
const gtk4UserCss = `@import url("../../.themes/${GTK_THEME}/gtk-4.0/gtk.css");\n`;

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

const step = ({ name, action }: { name: string; action: () => void }) => {
  info(name);
  try {
    action();
  } catch (error) {
    fail(`${name}: ${describe(error)}`);
    process.exit(1);
  }
};

const copyTree = ({ source, target, exclude = [] }: { source: string; target: string; exclude?: string[] }) => {
  if (!existsSync(source)) throw new Error(`${source} not found; run from the repository root`);
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, filter: (path) => !exclude.some((name) => path.endsWith(`/${name}`)) });
  success(`${source} → ${target}`);
};

const backupOnce = (path: string) => {
  if (!existsSync(path)) return;
  const backup = `${path}.bak`;
  if (existsSync(backup)) return;
  renameSync(path, backup);
  warn(`existing ${path} moved to ${backup}`);
};

const ensureSetting = ({ file, key, value }: { file: string; key: string; value: string }) => {
  const current = existsSync(file) ? readFileSync(file, "utf8") : "[Settings]\n";
  const line = `${key}=${value}`;
  const hasKey = new RegExp(`^${key}=.*$`, "m");
  const updated = hasKey.test(current) ? current.replace(hasKey, line) : `${current.trimEnd()}\n${line}\n`;
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, updated);
};

const run = async (command: string[]) => {
  const label = command.join(" ");
  try {
    const exitCode = await Bun.spawn(command, { stdout: "ignore", stderr: "inherit" }).exited;
    if (exitCode !== 0) warn(`${label} exited with ${exitCode}`);

    return exitCode === 0;
  } catch (error) {
    warn(`${label}: ${describe(error)}`);

    return false;
  }
};

banner({ subtitle: `install ${ICON_THEME} icons and ${GTK_THEME} theme` });

step({
  name: "copying icon theme",
  action: () => copyTree({ source: paths.icons.source, target: paths.icons.target }),
});
step({
  name: "copying GTK and shell theme",
  action: () => copyTree({ source: paths.theme.source, target: paths.theme.target, exclude: ["src"] }),
});
step({
  name: "wiring libadwaita user stylesheet",
  action: () => {
    backupOnce(paths.gtk4UserCss);
    mkdirSync(join(paths.gtk4UserCss, ".."), { recursive: true });
    writeFileSync(paths.gtk4UserCss, gtk4UserCss);
    success(paths.gtk4UserCss);
  },
});
step({
  name: "preferring dark in settings.ini",
  action: () => {
    for (const file of paths.settingsIni) ensureSetting({ file, key: "gtk-application-prefer-dark-theme", value: "1" });
    success(paths.settingsIni.join(", "));
  },
});

info("applying GNOME settings");
const applied = [
  await run(["gtk-update-icon-cache", "-f", "-t", paths.icons.target]),
  await run(["gsettings", "set", "org.gnome.desktop.interface", "icon-theme", ICON_THEME]),
  await run(["gsettings", "set", "org.gnome.desktop.interface", "gtk-theme", GTK_THEME]),
  await run(["gsettings", "set", "org.gnome.desktop.interface", "color-scheme", "prefer-dark"]),
];
const shellThemed =
  (await run(["gnome-extensions", "enable", "user-theme@gnome-shell-extensions.gcampax.github.com"])) &&
  (await run(["gsettings", "set", "org.gnome.shell.extensions.user-theme", "name", GTK_THEME]));

if (!shellThemed) fail("shell theme not applied: install gnome-shell-extensions and enable User Themes");
if (applied.includes(false)) {
  fail("files installed, but some GNOME settings were not applied (see warnings above)");
  process.exit(1);
}

success("installed; restart running apps to pick up the theme");
