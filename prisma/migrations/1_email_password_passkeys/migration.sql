-- Sign-in moves from phone OTP to email + password, with passkeys as an
-- optional second factor-free login. Existing rows get a placeholder email
-- derived from their id and an unusable password, so they can claim the
-- account via "Forgot password" once email delivery is configured.
ALTER TABLE "User" RENAME COLUMN "phone" TO "legacyPhone";
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
UPDATE "User" SET "email" = lower(id) || '@accounts.nitumee.local';
UPDATE "User" SET "passwordHash" = 'disabled$' || id;
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "User" RENAME COLUMN "legacyPhone" TO "phone";
DROP INDEX IF EXISTS "User_phone_key";
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "deviceName" TEXT NOT NULL DEFAULT 'Passkey',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");

ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
