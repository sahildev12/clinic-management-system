import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const adminUrl = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    ["clinic_management"]
  );

  if (exists.rowCount === 0) {
    await client.query("CREATE DATABASE clinic_management");
    console.log("Created database clinic_management");
  } else {
    console.log("Database clinic_management already exists");
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
