"use client";

import { useActionState } from "react";
import { requestOtp, verifyOtp, type FormState } from "@/app/actions";

const initial: FormState = {};

export function LoginForm() {
  const [otpState, request] = useActionState(requestOtp, initial);
  const [verifyState, verify] = useActionState(verifyOtp, initial);

  if (otpState.ok) {
    return (
      <form action={verify} className="card space-y-4">
        <p className="text-sm text-stone-600">
          Enter the 6-digit code sent to your phone.
          <span className="mt-1 block text-xs text-stone-400">Without SMS configured, the code is printed in the server log.</span>
        </p>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field text-center text-2xl tracking-[0.4em]" placeholder="000000" required />
        {verifyState.error && <p className="text-sm text-red-600">{verifyState.error}</p>}
        <button className="btn w-full">Verify and continue</button>
      </form>
    );
  }

  return (
    <form action={request} className="card space-y-4">
      <label className="block space-y-1 text-sm font-medium">
        Your name
        <input name="name" className="field" placeholder="Wanjiku" autoComplete="name" required />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Phone number
        <input name="phone" className="field" placeholder="0712 345 678" inputMode="tel" autoComplete="tel" required />
      </label>
      {otpState.error && <p className="text-sm text-red-600">{otpState.error}</p>}
      <button className="btn w-full">Send code</button>
    </form>
  );
}
