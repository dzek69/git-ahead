import fs from "fs/promises";
import fsWithSync from "fs";
import path from "path";

import { rethrow, safe } from "@ezez/utils";
import { EVENTS, Queue } from "queue-system";

import type { ResultList } from "./types";

import { gitCheckDotGit, gitCheckUnpushed, gitFetch, gitCheckUntrackedUncommited } from "./git-utils.js";
import { dirname } from "./dirname/dirname.js";
import { printResults } from "./print.js";

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("--h")) {
    console.info("Usage: git-ahead [options] [path]");
    console.info("");
    console.info("Both options and path are optional (cwd will be used).");
    console.info("");
    console.info("Options:");
    console.info("      --skip-untracked    Skips checking for untracked files");
    console.info("  -d, --dev               Dev mode (loads and writes data into cache file for testing formatting)");
    console.info("  -h, --help              Prints this help");
    console.info("  -v, --version           Prints version info");
    console.info("  --                      Stops parsing options, put this before your path if it starts with `-`");
    process.exit(0); // eslint-disable-line no-process-exit
}

let usedDir = "";

const NOT_FOUND = -1;

const argsNoDash = args.filter(arg => !arg.startsWith("-"));
if (argsNoDash.length > 1) {
    console.error("Too many arguments");
    process.exit(1); // eslint-disable-line no-process-exit
}
const dashDashIndex = args.indexOf("--");
if (dashDashIndex !== NOT_FOUND) {
    usedDir = args[dashDashIndex + 1] ?? "";
    if (!usedDir) {
        console.error("No path after --");
        process.exit(1); // eslint-disable-line no-process-exit
    }
}
if (argsNoDash.length === 1) {
    usedDir = argsNoDash[0] ?? "";
}

if (args.includes("--version") || args.includes("-v")) {
    const packageJson = JSON.parse(
        // eslint-disable-next-line no-sync
        String(fsWithSync.readFileSync(path.join(dirname, "..", "package.json"))),
    ) as { version: string };
    console.info(packageJson.version);
    process.exit(0); // eslint-disable-line no-process-exit
}

const devMode = args.includes("--dev") || args.includes("-d");
const displayUntracked = !args.includes("--skip-untracked");
const MAX_FILES = 5;

(async () => {
    if (devMode) {
        const devData = await safe(() => fs.readFile("./git-ahead.cache", "utf-8"));
        if (devData) {
            printResults(JSON.parse(devData) as ResultList, {
                skipUntracked: !displayUntracked,
                maxFiles: MAX_FILES,
                groupByProject: true,
            });
            return;
        }
    }

    const cwd = usedDir || process.cwd();
    console.info("Using", cwd);
    const list = await fs.readdir(cwd);
    console.info("Found", list.length, "projects");

    const q = new Queue({ concurrency: 1 });

    const results: ResultList = {};

    // eslint-disable-next-line max-lines-per-function
    list.forEach((project) => {
        const projectPath = path.join(cwd, project);
        // eslint-disable-next-line max-statements,max-lines-per-function
        q.add(async () => {
            if (!results[project]) {
                results[project] = {};
            }

            const stat = await fs.lstat(projectPath);
            if (!stat.isDirectory()) {
                // eslint-disable-next-line require-atomic-updates
                results[project] = { errorCode: "not-a-dir" };
                return;
            }
            if (stat.isSymbolicLink()) {
                // eslint-disable-next-line require-atomic-updates
                results[project] = { errorCode: "is-symbolic-link" };
                return;
            }

            try {
                await gitCheckDotGit(projectPath);
            }
            catch {
                // eslint-disable-next-line require-atomic-updates
                results[project] = { errorCode: "no-git-root" };
                return;
            }

            try {
                await gitFetch(projectPath);
            }
            catch {
                // eslint-disable-next-line require-atomic-updates
                results[project] = { errorCode: "fetch-failed" };

                // no return here, we let this fail, because some projects may not be updatable anymore
            }

            try {
                const result = await gitCheckUnpushed(projectPath);
                if (result) {
                    // eslint-disable-next-line require-atomic-updates
                    results[project].unpushed = result;
                }
            }
            catch {
                // eslint-disable-next-line require-atomic-updates
                results[project] = { errorCode: "git-branch-failed" };
                // TODO maybe we should store multiple errors?

                return; // if this fail, we override any results (we have none at this step)
            }

            try {
                const result = await gitCheckUntrackedUncommited(projectPath);
                if (result) {
                    if (result.untracked) {
                        // eslint-disable-next-line require-atomic-updates
                        results[project].untracked = result.untracked;
                    }
                    if (result.uncommited) {
                        // eslint-disable-next-line require-atomic-updates
                        results[project].uncommited = result.uncommited;
                    }
                }
            }
            catch {
                // eslint-disable-next-line require-atomic-updates
                results[project] = { errorCode: "git-status-failed" };
                return; // if this fail, we override any results
            }

            return true;
        });
    });

    q.on(EVENTS.QUEUE_SIZE, (size) => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`${list.length - size}/${list.length} `); // keep the space, so password prompt is readable
    });

    q.on(EVENTS.QUEUE_SIZE, (size) => {
        if (size) {
            return;
        }

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.info("Done");
        console.info("");

        if (devMode) {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            fs.writeFile("./git-ahead.cache", JSON.stringify(results, null, 2)).catch(rethrow);
        }

        printResults(results, {
            skipUntracked: !displayUntracked,
            maxFiles: MAX_FILES,
            groupByProject: true,
        });
    });
})().catch(rethrow);
