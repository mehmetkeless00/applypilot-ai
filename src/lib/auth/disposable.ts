// Common disposable-email domains, blocked at signup to slow down
// free-tier farming. Not exhaustive — pair with Supabase's CAPTCHA and
// auth rate limits in production (see README).
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempmail.dev",
  "yopmail.com",
  "yopmail.fr",
  "getnada.com",
  "trashmail.com",
  "trash-mail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "throwawaymail.com",
  "mytemp.email",
  "burnermail.io",
  "mailnesia.com",
  "tempr.email",
  "discard.email",
  "mail-temp.com",
  "mohmal.com",
  "emailondeck.com",
  "spamgourmet.com",
  "mailcatch.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@").pop()?.trim().toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}
