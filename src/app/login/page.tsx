import { redirect } from "next/navigation";
import { currentUser } from "@/app/actions";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(user.role === "runner" ? "/runner" : "/bookings");

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Sign in to Nitumee</h1>
        <p className="text-sm text-stone-600">We&apos;ll text you a one-time code. No password needed.</p>
      </div>
      <LoginForm />
    </div>
  );
}
