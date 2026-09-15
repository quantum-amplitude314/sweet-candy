const BANNER = [
  "█████ █   █ █████ █████ █████   █████  ███  █   █ ████  █   █",
  "█     █   █ █     █       █     █     █   █ ██  █ █   █  █ █ ",
  "█████ █ █ █ ████  ████    █     █     █████ █ █ █ █   █   █  ",
  "    █ ██ ██ █     █       █     █     █   █ █  ██ █   █   █  ",
  "█████ █   █ █████ █████   █     █████ █   █ █   █ ████    █  ",
] as const;

const RESET = "\x1b[0m";

enum Colour {
  Cyan = 45,
  Green = 42,
  Red = 196,
  Amber = 214,
  Grey = 245,
}

const paint =
  (colour: Colour) =>
  (text: string): string =>
    `\x1b[38;5;${colour}m${text}${RESET}`;

export const tint = {
  cyan: paint(Colour.Cyan),
  green: paint(Colour.Green),
  red: paint(Colour.Red),
  amber: paint(Colour.Amber),
  grey: paint(Colour.Grey),
};

export const banner = ({ subtitle }: { subtitle: string }) => {
  console.log(tint.cyan(BANNER.join("\n")));
  console.log(tint.grey(subtitle));
  console.log();
};

export const info = (text: string) => console.log(tint.cyan("›"), text);
export const success = (text: string) => console.log(tint.green("✓"), text);
export const warn = (text: string) => console.log(tint.amber("!"), text);
export const fail = (text: string) => console.error(tint.red("✗"), text);
