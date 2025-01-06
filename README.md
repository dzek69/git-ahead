# git-ahead

CLI tool that will seek through your projects to find those that you have forgotten to push or even forgotten to commit.

## Usage

Either install globally or use with `npx`.

```bash
cd /Projects
git-ahead
```

- If some repo requires logging in - you will be asked for credentials (see example output). This cannot be skipped for
now. This feature will be adjusted in the future.
- If directory is not a git repository, a symlink or not readable - it will be skipped.
- Only first level directories are checked for now.

### Example output

```
Using /Projects
Found 87 projects
Done

ℹ️ Skipped non-git directories: .ark-.ECPMCM, @3d, @arduino

❎  Some projects needs attention

  - NitraWS
    - Uncommited changes
      - A  .babelrc.cjs
      - A  .editorconfig
      - A  .eslintrc.json
      - M  .gitignore
      - A  .npmignore
      - ... and 33 more
    - Untracked files
      - ?? a.mjs
      - ?? yarn.lock

  - api-reach
    - Unpushed changes
      - * ts-experiments 977f113 [origin/ts-experiments: ahead 1] ! browser support
    - Uncommited changes
      -  M src/index.ts
```

## TODO

- seek through sub-directories
- auto-skip projects requiring credentials
- allow to choose print mode (group by project or by issue)
- "multi-threading" when credentials are skipped

## Windows users

This currently requires UNIX-like systems to work. On Windows just use WSL.

## Requirements

- Node 16+
- git with english language

## License

MIT
