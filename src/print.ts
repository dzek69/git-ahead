import type { ResultList } from "./types";

type Options = {
    skipUntracked: boolean;
    maxFiles: number;
    groupByProject: boolean;
};

// TODO smartly truncate/format the lines
// eslint-disable-next-line @typescript-eslint/no-shadow
const truncate = (string: string, length: number) => {
    if (string.length <= length) {
        return string;
    }
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return string.slice(0, length - 3) + "...";
};

const TRUNCATE_LENGTH = 200;

// eslint-disable-next-line max-statements,max-lines-per-function
const printResults = (results: ResultList, options: Options) => {
    const symLinks = Object.entries(results).filter(([_, r]) => r.errorCode === "is-symbolic-link");
    const nonGit = Object.entries(results).filter(([_, r]) => r.errorCode === "no-git-root");
    const failedFetch = Object.entries(results).filter(([_, r]) => r.errorCode === "fetch-failed");
    const failedBranch = Object.entries(results).filter(([_, r]) => r.errorCode === "git-branch-failed");
    const failedCommit = Object.entries(results).filter(([_, r]) => r.errorCode === "git-status-failed");

    const unpushed = Object.entries(results).filter(([_, r]) => r.unpushed);
    const untracked = Object.entries(results).filter(([_, r]) => r.untracked);
    const uncommited = Object.entries(results).filter(([_, r]) => r.uncommited);

    const needsAttention = Object.entries(results).filter(([_, r]) => (
        r.unpushed || r.uncommited || (r.untracked && !options.skipUntracked)
    )).map(([p]) => p);

    if (symLinks.length) {
        console.info("");
        console.info("ℹ️ Skipped symbolic links:", symLinks.map(([p]) => p).join(", "));
    }

    if (nonGit.length) {
        console.info("");
        console.info("ℹ️ Skipped non-git directories:", nonGit.map(([p]) => p).join(", "));
    }

    if (failedFetch.length) {
        console.info("");
        console.info("❎  Failed git fetching projects:", failedFetch.map(([p]) => p).join(", "));
    }

    if (failedBranch.length) {
        console.info("");
        console.info("❎  Failed git branch status checking:", failedBranch.map(([p]) => p).join(", "));
    }

    if (failedCommit.length) {
        console.info("");
        console.info("❎  Failed git commit status checking:", failedCommit.map(([p]) => p).join(", "));
    }

    if (!unpushed.length && (!untracked.length || options.skipUntracked) && !uncommited.length) {
        console.info("");
        console.info("✅  All projects are up to date");
        return;
    }

    if (options.groupByProject) {
        console.info("");
        console.info("❎  Some projects needs attention");
        // eslint-disable-next-line max-statements
        needsAttention.forEach(p => {
            console.info("");
            console.info("  -", p);
            const result = results[p]!;
            if (result.unpushed) {
                console.info("    - Unpushed changes");
                result.unpushed.aheadLines.forEach(line => {
                    console.info("      -", truncate(line, TRUNCATE_LENGTH));
                });
            }
            if (result.uncommited) {
                console.info("    - Uncommited changes");
                const uncommitedLines = result.uncommited.lines!.map(line => truncate(line, TRUNCATE_LENGTH));
                const diff = uncommitedLines.length - options.maxFiles;
                if (diff > 0) {
                    uncommitedLines.splice(options.maxFiles, diff, `... and ${diff} more`);
                }
                uncommitedLines.forEach(line => { console.info("      -", line); });
            }
            if (result.untracked && !options.skipUntracked) {
                console.info("    - Untracked files");
                const untrackedLines = result.untracked.lines!.map(line => truncate(line, TRUNCATE_LENGTH));
                const diff = untrackedLines.length - options.maxFiles;
                if (diff > 0) {
                    untrackedLines.splice(options.maxFiles, diff, `... and ${diff} more`);
                }
                untrackedLines.forEach(line => { console.info("      -", line); });
            }
        });
        return;
    }

    if (unpushed.length) {
        console.info("");
        console.info(
            "❎  Unpushed changes in projects:",
            unpushed.map(
                ([p, r]) => "\n  - " + p + "\n     - " + r.unpushed!.aheadLines.map(
                    line => truncate(line, TRUNCATE_LENGTH)).join("\n   - "),
            ).join(", "),
        );
    }

    if (uncommited.length) {
        console.info("");
        console.info(
            "❎  Uncommited changes in projects:",
            uncommited.map(
                ([p, r]) => {
                    const uncommitedLines = r.uncommited!.lines!.map(
                        line => truncate(line, TRUNCATE_LENGTH));
                    const diff = uncommitedLines.length - options.maxFiles;
                    if (diff > 0) {
                        uncommitedLines.splice(options.maxFiles, diff, `... and ${diff} more`);
                    }
                    return "\n  - " + p + "\n     - " + uncommitedLines.join("\n     - ");
                },
            ).join(", "),
        );
    }

    if (untracked.length && !options.skipUntracked) {
        console.info("");
        console.info(
            "❎  Untracked files in projects:",
            untracked.map(
                ([p, r]) => {
                    const untrackedLines = r.untracked!.lines!.map(
                        line => truncate(line, TRUNCATE_LENGTH));
                    const diff = untrackedLines.length - options.maxFiles;
                    if (diff > 0) {
                        untrackedLines.splice(options.maxFiles, diff, `... and ${diff} more`);
                    }
                    return "\n  - " + p + "\n     - " + untrackedLines.join("\n     - ");
                },
            ).join(", "),
        );
    }
};

export {
    printResults,
};
