#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";

function loadEnvFiles() {
  for (const filename of [".env.local", ".env"]) {
    const fullPath = path.join(process.cwd(), filename);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    loadEnv({
      path: fullPath,
      override: false,
      quiet: true,
    });
  }
}

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  npm run bug-reports -- list",
      "  npm run bug-reports -- get <public-id>",
      "",
    ].join("\n"),
  );
}

function readDatabaseUrl() {
  loadEnvFiles();

  return process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? null;
}

async function listReports(sql) {
  const rows = await sql`
    select public_id, summary, created_at
    from bug_reports
    order by created_at desc
    limit 25
  `;

  if (rows.length === 0) {
    process.stdout.write("No bug reports found.\n");
    return;
  }

  for (const row of rows) {
    const createdAt =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString();
    process.stdout.write(`${row.public_id}\t${createdAt}\t${row.summary}\n`);
  }
}

async function getReport(sql, publicId) {
  const rows = await sql`
    select markdown
    from bug_reports
    where public_id = ${publicId}
    limit 1
  `;

  if (rows.length === 0) {
    process.stderr.write(`Bug report ${publicId} not found.\n`);
    process.exitCode = 1;
    return;
  }

  const markdown = rows[0].markdown.endsWith("\n")
    ? rows[0].markdown
    : `${rows[0].markdown}\n`;

  process.stdout.write(markdown);
}

async function main() {
  const [command, reportId] = process.argv.slice(2);

  if (!command || (command !== "list" && command !== "get")) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (command === "get" && !reportId) {
    usage();
    process.exitCode = 1;
    return;
  }

  const databaseUrl = readDatabaseUrl();

  if (!databaseUrl) {
    process.stderr.write(
      "Missing DATABASE_URL or DATABASE_URL_UNPOOLED for bug-report CLI access.\n",
    );
    process.exitCode = 1;
    return;
  }

  const sql = neon(databaseUrl);

  if (command === "list") {
    await listReports(sql);
    return;
  }

  await getReport(sql, reportId);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Bug-report CLI failed."}\n`,
  );
  process.exitCode = 1;
});
