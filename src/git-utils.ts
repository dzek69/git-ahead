import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

import { noop } from "@ezez/utils";

import type { UnpushedResult, UntrackedResult, UncommitedResult } from "./types";

const gitCheckDotGit = async (projectPath: string) => {
    const gitFolder = path.join(projectPath, ".git");
    const gitStat = await fs.stat(gitFolder);
    if (!gitStat.isDirectory()) {
        throw new Error(".git is not a directory");
    }
};

const gitFetch = (projectPath: string) => {
    return new Promise<void>((resolve, reject) => {
        const ff = spawn("git", ["fetch", "--all"], {
            cwd: projectPath,
        });
        ff.on("error", noop); // only to not let the app crash
        ff.on("close", (code) => {
            if (!code) {
                resolve();
                return;
            }
            reject(new Error(`git fetch exited with code: ${code}`));
        });
    });
};

const gitCheckUnpushed = (projectPath: string) => {
    return new Promise<UnpushedResult | null>((resolve, reject) => {
        let res = "";
        const ff = spawn("git", ["branch", "-vv"], {
            cwd: projectPath,
        });
        ff.stdout.on("data", data => {
            res += String(data);
        });
        ff.on("error", noop); // only to not let the app crash
        ff.on("close", (code) => {
            if (!code) {
                const lines = res.split("\n");
                const aheadLines = lines.filter(line => {
                    return Boolean(/\[[^\]]*ahead[^\]]*\]/iu.exec(line));
                });
                if (aheadLines.length) {
                    resolve({
                        aheadLines,
                    });
                    return;
                }
                resolve(null);
                return;
            }
            reject(new Error(`git branch exited with code: ${code}`));
        });
    });
};

type UntrackedUncommitedResult = {
    untracked?: UntrackedResult;
    uncommited?: UncommitedResult;
};

const gitCheckUntrackedUncommited = (project: string) => {
    return new Promise<UntrackedUncommitedResult | null>((resolve, reject) => {
        let res = "";
        const ff = spawn("git", ["status", "--porcelain=1"], {
            cwd: project,
        });
        ff.on("error", noop); // only to not let the app crash
        ff.stdout.on("data", data => {
            res += String(data);
        });
        ff.on("close", (code) => {
            if (code) {
                reject(new Error(`git status exited with code: ${code}`));
                return;
            }
            const lines = res.split("\n").filter(Boolean);

            const untrackedLines = lines.filter(line => line.startsWith("??"));
            const uncommitedLines = lines.filter(line => !line.startsWith("??"));

            if (!untrackedLines.length && !uncommitedLines.length) {
                resolve(null);
                return;
            }

            const result: UntrackedUncommitedResult = {};
            if (untrackedLines.length) {
                result.untracked = {
                    lines: untrackedLines,
                };
            }

            if (uncommitedLines.length) {
                result.uncommited = {
                    lines: uncommitedLines,
                };
            }

            resolve(result);
        });
    });
};

export {
    gitCheckDotGit,
    gitFetch,
    gitCheckUnpushed,
    gitCheckUntrackedUncommited,
};
