# git-ahead

CLI tool that will seek through your projects to find those that you have forgotten to push or even forgotten to commit.

## Usage

Either install globally or use with `npx`.

```bash
cd /mnt/d/Projects
git-ahead
```

- If some repo requires logging in - you will be asked for credentials (see example output). This cannot be skipped for
now.
- If directory is not a git repository it will be skipped.
- Only first level directories are checked for now.

### Example output

```
Using /mnt/d/Projects
Found 76 projects
Checking statuses
37/76 ngon-reactnative Password for 'https://dzek@bitbucket.org':
46/76 world-takeover Password for 'https://dzek@bitbucket.org':
Done

ℹ Skipped non-git projects: @assets elektro2 en-backend en-front git-ahead gb-wp rss-split smartdzek untitled untitled1 untitled3
❎ Failed git fetching projects: ngon-reactnative world-takeover

Unpushed projects:

  - elektro
     - * master 0a02d9f [origin/master: ahead 3] - change seller translations added

  - onvif
     - * master 2ccbd70 [origin/master: ahead 1] Fix for cameras without UTCDateTime

  - oop-timers
     - * master a438708 [origin/master: ahead 1] ! CommonJS compatibility = better native ESM support

Uncommited changes projects:

  - NitraWS
     - A  .babelrc.cjs
     - A  .editorconfig
     - A  .eslintrc.json
     - M  .gitignore
     - A  .npmignore
     - ... and 33 more

Untracked files projects:

  - NitraWS
     - ?? yarn.lock

  - commit-message-guidelines
     - ?? .idea/
```

## TODO

- seek through sub-directories
- auto-skip projects requiring credentials

## Windows users

This currently requires UNIX-like systems to work. On Windows just use WSL.

## Requirements

- Node 13
- git with english language

## License

MIT
