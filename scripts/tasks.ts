import { fail, info, warn } from "./console";

export const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const step = ({ name, action }: { name: string; action: () => void }) => {
  info(name);
  try {
    action();
  } catch (error) {
    fail(`${name}: ${describe(error)}`);
    process.exit(1);
  }
};

export const run = async (command: string[]) => {
  const label = command.join(" ");
  try {
    const exitCode = await Bun.spawn(command, { stdout: "ignore", stderr: "inherit" }).exited;
    const succeeded = exitCode === 0;
    if (!succeeded) warn(`${label} exited with ${exitCode}`);

    return succeeded;
  } catch (error) {
    warn(`${label}: ${describe(error)}`);

    return false;
  }
};

export const capture = (command: string[]) => {
  const { exitCode, stdout } = Bun.spawnSync(command, { stderr: "ignore" });
  const output = exitCode === 0 ? stdout.toString().trim() : undefined;

  return output;
};
