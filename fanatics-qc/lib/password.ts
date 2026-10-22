// Password policy (NIST 800-63B aligned + complexity requested by Fanatics IT).
const COMMON = ["password", "123456", "qwerty", "fanatics", "welcome", "letmein", "admin"];

export function passwordIssues(pw: string, email = ""): string[] {
  const issues: string[] = [];
  if (pw.length < 12) issues.push("min 12 characters");
  if (pw.length > 128) issues.push("max 128 characters");
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) issues.push("upper and lower case");
  if (!/[0-9]/.test(pw)) issues.push("a number");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("a symbol");
  const lower = pw.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) issues.push("no common words");
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length > 3 && lower.includes(local)) issues.push("must not contain your e-mail");
  return issues;
}

export function generateTempPassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_+"];
  const all = sets.join("");
  const rand = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < 16) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
