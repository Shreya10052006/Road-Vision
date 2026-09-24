export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDelta(value: number, suffix: string = "") {
  const sign = value >= 0 ? "▲" : "▼";
  return `${sign} ${Math.abs(value)}${suffix}`;
}
