import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();

export const ICON_THEME = "Sweet-Candy-Icons";
export const GTK_THEME = "Sweet-Candy-Theme";
export const USER_THEME_EXTENSION = "user-theme@gnome-shell-extensions.gcampax.github.com";

export const paths = {
  icons: { source: ICON_THEME, target: join(HOME, ".icons", ICON_THEME) },
  theme: { source: GTK_THEME, target: join(HOME, ".themes", GTK_THEME) },
  gtk4UserCss: join(HOME, ".config", "gtk-4.0", "gtk.css"),
  settingsIni: ["gtk-3.0", "gtk-4.0"].map((dir) => join(HOME, ".config", dir, "settings.ini")),
};

// libadwaita apps ignore the gtk-theme setting and only read this file; importing the theme's
// stylesheet keeps its relative asset paths resolving inside ~/.themes.
export const gtk4UserCss = `@import url("../../.themes/${GTK_THEME}/gtk-4.0/gtk.css");\n`;

export type Setting = { schema: string; key: string; value: string };

// GNOME settings pointing at the theme; uninstall resets them only while they still do.
export const settings = {
  iconTheme: { schema: "org.gnome.desktop.interface", key: "icon-theme", value: ICON_THEME },
  gtkTheme: { schema: "org.gnome.desktop.interface", key: "gtk-theme", value: GTK_THEME },
  shellTheme: { schema: "org.gnome.shell.extensions.user-theme", key: "name", value: GTK_THEME },
} satisfies Record<string, Setting>;

export const backupPath = (path: string) => `${path}.bak`;
