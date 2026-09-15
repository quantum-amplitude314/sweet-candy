import { compile, type DeprecationOrId } from "sass";
import { banner, fail, info, success } from "./console";

const THEME = "Sweet-Candy-Theme";
const SOURCE = `${THEME}/src`;

// Upstream Sweet SCSS predates these Dart Sass deprecations; the output is unaffected.
const SILENCED_DEPRECATIONS: DeprecationOrId[] = [
  "import",
  "if-function",
  "color-functions",
  "global-builtin",
  "slash-div",
  "strict-unary",
];

const TARGETS = [
  { entry: `${SOURCE}/gtk-3.0/gtk.scss`, output: `${THEME}/gtk-3.0/gtk.css` },
  { entry: `${SOURCE}/gtk-4.0/gtk.scss`, output: `${THEME}/gtk-4.0/gtk.css` },
  { entry: `${SOURCE}/gnome-shell/gnome-shell.scss`, output: `${THEME}/gnome-shell/gnome-shell.css` },
];

const build = async ({ entry, output }: { entry: string; output: string }) => {
  try {
    const { css } = compile(entry, { silenceDeprecations: SILENCED_DEPRECATIONS });
    await Bun.write(output, `${css}\n`);
    success(`${entry} → ${output}`);

    return true;
  } catch (error) {
    fail(`${entry}\n${error instanceof Error ? error.message : String(error)}`);

    return false;
  }
};

banner({ subtitle: `build ${THEME} stylesheets` });
info(`compiling ${TARGETS.length} targets`);

const results = await Promise.all(TARGETS.map(build));
const failed = results.filter((ok) => !ok).length;

if (failed > 0) {
  fail(`${failed} target(s) failed`);
  process.exit(1);
}

success("done");
