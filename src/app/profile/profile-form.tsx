"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { removePasskey, updateProfile, type FormState } from "@/app/actions";
import { passkeysSupported, registerPasskey } from "@/lib/passkeys-client";

type Passkey = { id: string; deviceName: string; createdAt: string; lastUsedAt: string | null };

const initial: FormState = {};
const subscribeNever = () => () => {};

export function ProfileForm({ name, phone, passkeys }: { name: string; phone: string | null; passkeys: Passkey[] }) {
  const [state, setState] = useState<FormState>(initial);
  const [pending, startTransition] = useTransition();
  const [passkeyError, setPasskeyError] = useState("");
  const [adding, setAdding] = useState(false);

  // Read browser support outside render so the server-rendered HTML and the
  // hydrated client agree (passkeys are unknown until hydration).
  const canPasskey = useSyncExternalStore(subscribeNever, passkeysSupported, () => false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setState(initial);
    startTransition(async () => setState(await updateProfile(initial, formData)));
  }

  async function addPasskey() {
    setPasskeyError("");
    setAdding(true);
    try {
      await registerPasskey();
      window.location.reload();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Passkey failed.");
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <h2 className="font-semibold">Delivery details</h2>
        <label className="block space-y-1 text-sm font-medium">
          Your name
          <input name="name" className="field" defaultValue={name} autoComplete="name" required />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Delivery phone
          <input name="phone" className="field" defaultValue={phone ?? ""} placeholder="0712 345 678" inputMode="tel" autoComplete="tel" required />
        </label>
        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.ok && <p className="text-sm text-teal-700">Saved.</p>}
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      <div className="card space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold">Passkeys</h2>
          <p className="text-sm text-stone-600">
            A passkey signs you in with your fingerprint, face or screen lock — no password to remember or type.
          </p>
        </div>

        {passkeys.length === 0 ? (
          <p className="text-sm text-stone-500">No passkeys yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{p.deviceName}</p>
                  <p className="text-xs text-stone-500">
                    Added {new Date(p.createdAt).toLocaleDateString()}
                    {p.lastUsedAt ? ` · last used ${new Date(p.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  </p>
                </div>
                <form action={removePasskey.bind(null, p.id)}>
                  <button className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {canPasskey ? (
          <div className="space-y-2">
            <button type="button" className="btn-secondary" onClick={addPasskey} disabled={adding}>
              {adding ? "Waiting for your device…" : "Add a passkey"}
            </button>
            {passkeyError && (
              <p role="alert" className="text-sm text-red-600">
                {passkeyError}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500">This browser does not support passkeys.</p>
        )}
      </div>
    </div>
  );
}
