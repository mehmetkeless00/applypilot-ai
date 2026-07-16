"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDisposableEmail } from "@/lib/auth/disposable";
import { getMessages, type Messages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

// Validation messages come from the request's locale catalog.
const credentialsSchema = (t: Messages["auth"]["errors"]) =>
  z.object({
    email: z.email(t.invalidEmail),
    password: z.string().min(8, t.passwordMin),
  });

const signupSchema = (t: Messages["auth"]["errors"]) =>
  credentialsSchema(t).extend({
    fullName: z.string().trim().min(1, t.enterName).max(120),
  });

export type AuthState = { error: string } | null;

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = getMessages(await getLocale()).auth.errors;
  const parsed = credentialsSchema(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: t.invalidCredentials };
  }

  revalidatePath("/", "layout");
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = getMessages(await getLocale()).auth.errors;
  const parsed = signupSchema(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (isDisposableEmail(parsed.data.email)) {
    return { error: t.disposableEmail };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    return { error: error.message };
  }

  // With email confirmation enabled, no session is returned yet.
  if (!data.session) {
    redirect("/login?message=check-email");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export type ResetState = { error?: string; sent?: boolean } | null;

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const t = getMessages(await getLocale()).auth.errors;
  const parsed = z.email(t.invalidEmail).safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success — never reveal whether an account exists.
  return { sent: true };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = getMessages(await getLocale()).auth.errors;
  const parsed = z
    .string()
    .min(8, t.passwordMin)
    .safeParse(formData.get("password"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t.resetExpired };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
