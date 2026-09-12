#!/usr/bin/env node
// Test runner. No test framework: esbuild already ships with Vite, so each test
// file is bundled and handed to node with nothing extra installed.
//
//   npm test              run everything
//   npm test serial       run files whose name matches "serial"
//
// A test file prints "PASS <name>" / "FAIL <name>" lines and exits non-zero on
// failure (see test/helpers/harness.js). Bundling is what lets test files use
// the same extensionless imports as the app.

import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2];

function hasPython3() {
    try {
        execFileSync("python3", ["--version"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

const python3 = hasPython3();
const outDir = mkdtempSync(join(tmpdir(), "cpy-ide-testrun-"));

const files = readdirSync(HERE)
    .filter((f) => f.endsWith(".test.js"))
    .filter((f) => !filter || f.includes(filter))
    .sort();

if (!files.length) {
    console.error(filter ? `No test files match "${filter}".` : "No test files found.");
    process.exit(1);
}

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

for (const file of files) {
    const source = readFileSync(join(HERE, file), "utf8");
    const name = file.replace(/\.test\.js$/, "");

    // Tests that drive the fake board need python3; skip rather than fail so the
    // rest of the suite still runs on a machine without it.
    if (source.includes("@requires python3") && !python3) {
        console.log(`  ${name.padEnd(24)} SKIPPED (python3 not found)`);
        skipped += 1;
        continue;
    }

    const bundle = join(outDir, `${name}.mjs`);
    const build = spawnSync(
        "npx",
        [
            "esbuild",
            join(HERE, file),
            "--bundle",
            "--platform=node",
            "--format=esm",
            `--outfile=${bundle}`,
            "--log-level=error",
            // vite.config.js serves .md and .py as raw strings (assetsInclude), so
            // esbuild needs the same treatment for any test that reaches a module
            // importing them.
            "--loader:.md=text",
            "--loader:.py=text",
        ],
        { encoding: "utf8" }
    );
    if (build.status !== 0) {
        console.log(`  ${name.padEnd(24)} BUILD FAILED`);
        console.log((build.stderr || "").trim().split("\n").map((l) => "     " + l).join("\n"));
        failed += 1;
        failures.push(`${name}: bundle failed`);
        continue;
    }

    const run = spawnSync("node", [bundle], {
        encoding: "utf8",
        // The bundle lives in a temp dir, so hand it the real path of the
        // fake-device script rather than letting it resolve one.
        env: { ...process.env, FAKE_DEVICE_SCRIPT: join(HERE, "helpers", "fakeDevice.py") },
    });
    const output = (run.stdout || "") + (run.stderr || "");
    const filePassed = (output.match(/^PASS /gm) || []).length;
    const fileFailed = (output.match(/^FAIL /gm) || []).length;
    passed += filePassed;
    failed += fileFailed;

    const status = fileFailed || run.status !== 0 ? "FAIL" : "ok";
    console.log(`  ${name.padEnd(24)} ${String(filePassed).padStart(3)} passed  ${fileFailed} failed  ${status}`);

    for (const line of output.split("\n")) {
        if (line.startsWith("FAIL ")) {
            console.log("     " + line);
            failures.push(`${name}: ${line.slice(5)}`);
        }
    }
    // A non-zero exit with no FAIL line means the file crashed before reporting.
    if (run.status !== 0 && !fileFailed) {
        console.log("     (exited " + run.status + " without reporting; output below)");
        console.log(output.trim().split("\n").map((l) => "     " + l).join("\n"));
        failed += 1;
        failures.push(`${name}: crashed`);
    }
}

rmSync(outDir, { recursive: true, force: true });

console.log("  " + "-".repeat(52));
console.log(`  ${passed} passed, ${failed} failed${skipped ? `, ${skipped} file(s) skipped` : ""}`);
process.exit(failed ? 1 : 0);
