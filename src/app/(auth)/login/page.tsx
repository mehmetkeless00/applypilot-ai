import { signIn } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in — ApplyPilot AI" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const { next, message } = await searchParams;
  return <AuthForm mode="login" action={signIn} next={next} message={message} />;
}
