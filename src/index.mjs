#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import { spawn } from "child_process";

import __dirname from "./dirname.mjs"; // eslint-disable-line no-shadow

const args = process.argv.slice(2); // eslint-disable-line no-magic-numbers

if (args.includes("--help") || args.includes("--h")) {
    console.info("Usage: git-ahead [--version | -v] [--help | -h] [--skip-untracked]");
    console.info("");
    console.info("Options:");
    console.info("      --skip-untracked    Skips checking for untracked files");
    console.info("  -h, --help              Prints this help");
    console.info("  -v, --version           Prints version info");
    process.exit(0); // eslint-disable-line no-process-exit
}
if (args.includes("--version") || args.includes("-v")) {
    // eslint-disable-next-line no-sync
    const packageJson = JSON.parse(String(fs.readFileSync(path.join(__dirname, "..", "package.json"))));
    console.info(packageJson.version);
    process.exit(0); // eslint-disable-line no-process-exit
}

const displayUntracked = !args.includes("--skip-untracked");

const MAX_FILES_COUNT = 5;

(async () => { // eslint-disable-line max-lines-per-function, max-statements
    const cwd = process.cwd();
    console.info("Using", cwd);
    const list = await fs.readdir(cwd);
    console.info("Found", list.length, "projects");
    console.info("Checking statuses");

    const noGitRoot = [];
    const failedFetch = [];
    const failedBranch = [];
    const failedCommit = [];
    const unpushed = [];
    const uncommited = [];
    const untracked = [];

    for (let i = 0; i < list.length; i++) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);

        const project = list[i];
        process.stdout.write(`${i + 1}/${list.length} ${project} `); // keep the space, so password prompt is readable

        const stat = await fs.lstat(project);
        if (!stat.isDirectory()) {
            continue;
        }
        if (stat.isSymbolicLink()) {
            continue;
        }

        const gitFolder = path.join(project, ".git");
        try {
            const gitStat = await fs.stat(gitFolder);
            if (!gitStat.isDirectory()) {
                noGitRoot.push(project);
                continue;
            }
        }
        catch (e) { // eslint-disable-line no-unused-vars
            noGitRoot.push(project);
            continue;
        }

        let stop = false;
        await new Promise((resolve, reject) => {
            const ff = spawn("git", ["fetch", "--all"], {
                cwd: project,
                // stdio: ["ignore", "pipe", "pipe"],
            });
            ff.on("close", (code) => {
                if (!code) {
                    resolve();
                    return;
                }
                reject(new Error("git fetch exited with code: " + code));
            });
        }).catch(() => {
            failedFetch.push(project);
            stop = true;
        });

        if (!stop) {
            await new Promise((resolve, reject) => {
                let res = "";
                const ff = spawn("git", ["branch", "-vv"], {
                    cwd: project,
                });
                ff.stdout.on("data", data => {
                    res += data;
                });
                ff.on("close", (code) => {
                    if (!code) {
                        const lines = res.split("\n");
                        const aheadLines = lines.filter(line => {
                            return Boolean(line.match(/\[[^\]]*ahead[^\]]*]/i));
                        });
                        if (aheadLines.length) {
                            unpushed.push({
                                project,
                                aheadLines,
                            });
                        }
                        resolve();
                        return;
                    }
                    reject(new Error("git branch exited with code: " + code));
                });
            }).catch(() => {
                failedBranch.push(project);
                stop = true;
            });
        }

        if (!stop) {
            await new Promise((resolve, reject) => {
                let res = "";
                const ff = spawn("git", ["status", "--porcelain=1"], {
                    cwd: project,
                });
                ff.stdout.on("data", data => {
                    res += data;
                });
                ff.on("close", (code) => {
                    if (!code) {
                        let lines = res.split("\n").filter(Boolean);
                        if (!displayUntracked) {
                            lines = lines.filter(line => !line.startsWith("??"));
                        }

                        const untrackedLines = lines.filter(line => line.startsWith("??"));
                        const uncommitedLines = lines.filter(line => !line.startsWith("??"));

                        if (untrackedLines.length) {
                            untracked.push({
                                project,
                                untrackedLines,
                            });
                        }

                        if (uncommitedLines.length) {
                            uncommited.push({
                                project,
                                uncommitedLines,
                            });
                        }

                        resolve();
                        return;
                    }
                    reject(new Error("git status exited with code: " + code));
                });
            }).catch(() => {
                failedBranch.push(project);
                stop = true;
            });
        }
    }
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.info("Done");
    console.info("");

    noGitRoot.length && console.info("ℹ Skipped non-git projects:", ...noGitRoot);
    failedFetch.length && console.info("❎ Failed git fetching projects:", ...failedFetch);
    failedBranch.length && console.info("❎ Failed git branch status checking projects:", ...failedBranch);
    failedCommit.length && console.info("❎ Failed git commit status checking projects:", ...failedCommit);

    if (!unpushed.length && !uncommited.length && !untracked.length) {
        console.info("✔ All of your projects are up-to-date");
    }

    if (unpushed.length) {
        console.info("Unpushed projects:");
        console.info(unpushed.map(p => "\n  - " + p.project + "\n     - " + p.aheadLines.join("\n   - ")).join("\n"));
    }

    if (uncommited.length) {
        console.info("");
        console.info("Uncommited changes projects:");
        console.info(uncommited.map(p => {
            let more = "";
            if (p.uncommitedLines.length > MAX_FILES_COUNT) {
                const diff = p.uncommitedLines.length - MAX_FILES_COUNT;
                p.uncommitedLines.length = MAX_FILES_COUNT; // eslint-disable-line no-param-reassign
                more = "\n     - ... and " + diff + " more";
            }
            return "\n  - " + p.project + "\n     - " + p.uncommitedLines.join("\n     - ") + more;
        }).join("\n"));
    }

    if (untracked.length) {
        console.info("");
        console.info("Untracked files projects:");
        console.info(untracked.map(p => {
            let more = "";
            if (p.untrackedLines.length > MAX_FILES_COUNT) {
                const diff = p.untrackedLines.length - MAX_FILES_COUNT;
                p.untrackedLines.length = MAX_FILES_COUNT; // eslint-disable-line no-param-reassign
                more = "\n     - ... and " + diff + " more";
            }
            return "\n  - " + p.project + "\n     - " + p.untrackedLines.join("\n     - ") + more;
        }).join("\n"));
    }
})();
