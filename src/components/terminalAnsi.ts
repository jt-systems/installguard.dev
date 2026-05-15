export type TerminalTone = "dim" | "mid" | "fg" | "ok" | "warn" | "err";

export const ansi = (tone: TerminalTone, text: string) =>
  `<span class="ig-ansi ig-ansi--${tone}">${text}</span>`;

export const dim = (text: string) => ansi("dim", text);
export const mid = (text: string) => ansi("mid", text);
export const fg = (text: string) => ansi("fg", text);
export const ok = (text: string) => ansi("ok", text);
export const warn = (text: string) => ansi("warn", text);
export const err = (text: string) => ansi("err", text);

export const prompt = (command: string) => `${dim("$")} ${fg(command)}`;
export const comment = (text: string) => dim(`# ${text}`);
export const joinTerminalLines = (lines: string[]) => lines.join("\n");
