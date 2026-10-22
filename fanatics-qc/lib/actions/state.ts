export interface FormState {
  error: string | null;
  ok?: string | null;
  data?: Record<string, string>;
}

export const initialState: FormState = { error: null, ok: null };

export function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { path: (string | number)[]; message: string }[] }).issues;
    return issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
  }
  if (err instanceof Error) return err.name === "ForbiddenError" ? "You do not have permission for this action." : err.message;
  return "Unexpected error.";
}
