import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import path from "path";

import {
  getDestinyManifest,
  getDestinyManifestSlice,
  HttpClientConfig,
} from "bungie-api-ts/destiny2";

import { inventoryItems } from "../src/lib/database/schemas/schema";

const MANIFEST_SLICES = [
  "DestinyInventoryItemDefinition",
  "DestinyPlugSetDefinition",
  "DestinyStatDefinition",
  "DestinyPowerCapDefinition",
  "DestinyCollectibleDefinition",
  "DestinyStatGroupDefinition",
  "DestinyDamageTypeDefinition",
  "DestinySocketTypeDefinition",
  "DestinySandboxPerkDefinition",
] as const;

async function $http<T>(config: HttpClientConfig): Promise<T> {
  const res = await fetch(config.url, {
    method: config.method,
    headers: {
      "X-API-KEY": process.env.BUNGIE_API_KEY ?? "",
    },
  });
  if (!res.ok) {
    throw new Error(
      `Bungie API request failed: ${res.status} ${res.statusText} (${config.url})`
    );
  }
  return (await res.json()) as T;
}

async function main() {
  if (!process.env.BUNGIE_API_KEY) {
    console.error(
      "Missing BUNGIE_API_KEY environment variable. Get a free key at https://www.bungie.net/en/Application and set it before running this script."
    );
    process.exit(1);
  }

  const dbPath = path.join(__dirname, "..", "src", "lib", "database", "sqlite.db");
  console.log(`Writing database to ${dbPath}`);

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  console.log("Fetching Destiny 2 manifest metadata...");
  const manifestResponse = await getDestinyManifest($http);
  const manifest = manifestResponse.Response;

  console.log("Downloading manifest table slice (this can take a minute)...");
  const slice = await getDestinyManifestSlice($http, {
    destinyManifest: manifest,
    tableNames: MANIFEST_SLICES as unknown as (keyof typeof manifest.jsonWorldComponentContentPaths.en extends never
      ? never
      : any)[],
    language: "en",
  });

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS DestinyInventoryItemDefinition (
      id INTEGER PRIMARY KEY,
      json TEXT NOT NULL
    );
  `);
  sqlite.exec(`DELETE FROM DestinyInventoryItemDefinition;`);

  const items = slice.DestinyInventoryItemDefinition ?? {};
  const rows = Object.values(items);
  console.log(`Inserting ${rows.length} inventory item definitions...`);

  const insertItem = sqlite.prepare(
    "INSERT INTO DestinyInventoryItemDefinition (id, json) VALUES (?, ?)"
  );
  const insertItems = sqlite.transaction((defs: any[]) => {
    for (const def of defs) {
      insertItem.run(def.hash, JSON.stringify(def));
    }
  });
  insertItems(rows);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ManifestDefinition (
      "table" TEXT NOT NULL,
      hash INTEGER NOT NULL,
      json TEXT NOT NULL,
      PRIMARY KEY ("table", hash)
    );
  `);
  sqlite.exec(`DELETE FROM ManifestDefinition;`);

  const insertDef = sqlite.prepare(
    'INSERT INTO ManifestDefinition ("table", hash, json) VALUES (?, ?, ?)'
  );
  const insertDefs = sqlite.transaction((defs: [string, number, string][]) => {
    for (const [table, hash, json] of defs) {
      insertDef.run(table, hash, json);
    }
  });

  for (const tableName of MANIFEST_SLICES) {
    if (tableName === "DestinyInventoryItemDefinition") continue;
    const table = (slice as any)[tableName] ?? {};
    const defs = Object.values(table) as any[];
    console.log(`Inserting ${defs.length} ${tableName} definitions...`);
    insertDefs(defs.map((def) => [tableName, def.hash, JSON.stringify(def)]));
  }

  console.log("Done. Database seeded successfully.");
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
