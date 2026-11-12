---
name: deploy
description: Publish this repository's changes: run the tests, open a PR from the working branch and merge it into main on GitHub.
---

# Deploy agent-d6592fb1

There is no hosting or CI in this repository; publication is the verified merge into GitHub
`main` (https://github.com/andyprevalsky/agent-d6592fb1).

1. Validate: `npm install && npm test` (unit tests plus headless-Chromium tests of
   demo/index.html; Chromium is found in $PLAYWRIGHT_BROWSERS_PATH, /ms-playwright or
   ~/.cache/ms-playwright). All tests must pass.
2. Commit on the working branch and `git push -u origin <branch>`.
3. `gh pr create --base main --head <branch>`, then `gh pr merge <n> --merge`
   (never force-push main).
4. Verify: `git fetch origin && git merge-base --is-ancestor <branch-commit> origin/main`, and
   `gh pr view <n> --json state,mergeCommit` reports MERGED.

Recovery: revert the merge commit on a new branch and merge that PR through the same steps.
