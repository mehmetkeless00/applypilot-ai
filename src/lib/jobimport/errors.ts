/** Import failed for a reason the user can act on. */
export class JobImportError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "invalid_url"
      | "linkedin"
      | "unsupported"
      | "fetch_failed"
      | "not_found"
      | "blocked",
  ) {
    super(message);
    this.name = "JobImportError";
  }
}
