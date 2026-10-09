import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import pg from "pg";

const { Pool } = pg;

const LOCAL_ONLY_FALLBACK_PASSWORD = "Admin@12345";

const isProduction = process.env.NODE_ENV === "production";
const forceReset = process.env.FORCE_ADMIN_RESET === "1";

const email = (process.env.ADMIN_EMAIL ?? "admin@clinic.local").trim().toLowerCase();
const name = process.env.ADMIN_NAME ?? "Clinic Admin";
const phone = process.env.ADMIN_PHONE ?? "9876543210";

function resolvePassword() {
  if (process.env.ADMIN_PASSWORD) {
    return { password: process.env.ADMIN_PASSWORD, isFallback: false };
  }

  if (isProduction) {
    throw new Error(
      "ADMIN_PASSWORD is required when NODE_ENV=production. Refusing to create/reset an admin " +
        "account with an insecure default password. Set ADMIN_PASSWORD and re-run this script."
    );
  }

  console.warn(
    `WARNING: ADMIN_PASSWORD is not set. Falling back to the local-only development password ` +
      `"${LOCAL_ONLY_FALLBACK_PASSWORD}". This is INSECURE and must never be used in production. ` +
      `Set ADMIN_PASSWORD in your environment to silence this warning.`
  );
  return { password: LOCAL_ONLY_FALLBACK_PASSWORD, isFallback: true };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const existing = await client.query(`SELECT id FROM "User" WHERE email = $1`, [email]);

    if (existing.rows.length > 0) {
      if (!forceReset) {
        console.log(
          `Admin user already exists: ${email}. Leaving password/role/name unchanged. ` +
            `Set FORCE_ADMIN_RESET=1 to overwrite this account.`
        );
      } else {
        const { password, isFallback } = resolvePassword();
        const hash = await bcrypt.hash(password, 12);
        await client.query(
          `UPDATE "User"
           SET "passwordHash" = $1, role = 'ADMIN', name = $2, phone = $3, "updatedAt" = NOW()
           WHERE email = $4`,
          [hash, name, phone, email]
        );
        console.log(`Reset admin user (FORCE_ADMIN_RESET=1): ${email}`);
        if (isFallback) {
          console.log(`Password: ${password} (local-only fallback — change this immediately)`);
        } else {
          console.log(`Password: ${password}`);
        }
      }
    } else {
      const { password, isFallback } = resolvePassword();
      const hash = await bcrypt.hash(password, 12);
      const id = randomUUID().replace(/-/g, "").slice(0, 25);
      await client.query(
        `INSERT INTO "User" (id, email, "passwordHash", name, phone, role, banned, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'ADMIN', false, NOW(), NOW())`,
        [id, email, hash, name, phone]
      );
      console.log(`Created admin user: ${email}`);
      if (isFallback) {
        console.log(`Password: ${password} (local-only fallback — change this immediately)`);
      } else {
        console.log(`Password: ${password}`);
      }
    }

    const settings = await client.query(`SELECT id FROM "ClinicSetting" LIMIT 1`);
    if (settings.rows.length === 0) {
      await client.query(
        `INSERT INTO "ClinicSetting" (id, key, "clinicName", phone, email, address, "createdAt", "updatedAt")
         VALUES ($1, 'default', $2, $3, $4, $5, NOW(), NOW())`,
        [
          randomUUID().replace(/-/g, "").slice(0, 25),
          "CarePlus Clinic",
          "9876543210",
          "hello@careplus.clinic",
          "123 Health Street, Your City",
        ]
      );
      console.log("Created default clinic settings");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
