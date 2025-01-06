type UnpushedResult = {
    aheadLines: string[];
};

type UntrackedResult = {
    lines?: string[];
};

type UncommitedResult = {
    lines?: string[];
};

type Result = {
    errorCode?: "not-a-dir" | "is-symbolic-link" | "no-git-root"
        | "fetch-failed" | "git-branch-failed" | "git-status-failed";
    unpushed?: UnpushedResult;
    untracked?: UntrackedResult;
    uncommited?: UncommitedResult;
};

type ResultList = Record<string, Result>;

export type {
    UnpushedResult,
    UntrackedResult,
    UncommitedResult,
    Result,
    ResultList,
};
