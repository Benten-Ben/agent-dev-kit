# Gotchas

- **The REST Issues API also returns pull requests.** Never take "the newest issue" from `GET /repos/…/issues`: it can
  be a PR. One script overwrote a PR's body that way. Filter out items with a `pull_request` key, or use `gh issue list`
  (issues only).
- **A sub-issue has one parent.** Adding a second parent fails. Use "blocked by" for the second relationship.
- **`Part of #n` closes nothing.** Parents and tracking issues stay open until you close them, with a summary of what
  closed them.
- **The `blocked` label goes stale** when blockers close. Run `board sync-blocked` (or a scheduled job), and remove the
  label when you start a unit whose blockers just merged.
- **View settings vanish unless saved.** Use the view's menu → "Save view".
- **A Project owned by a user account can't be reached by a GitHub App token.** Run board commands on a user login.
- **GraphQL rate limits.** 5,000 points an hour per login. Many parallel agents doing board calls exhaust it; give REST-only
  tasks an App token, and cap board-heavy agents near a dozen.
- **macOS lacks GNU tools.** No `timeout`; BSD `sed -i ''`; bash 3.2 (no associative arrays). `gh … -q` (built-in jq) avoids
  needing `jq`.
- **zsh doesn't split unquoted variables.** `cmd $labels` passes one argument in zsh. Use arrays, or run scripts with bash.
- **Issue bodies are public text** if the repo is public (and may become public later). Don't paste private hosts,
  addresses, account names or credentials into issues, PR bodies or review comments.
- **Concurrent claims.** Two sessions can claim the same issue at once. Re-read the assignees after claiming and back off if
  someone else got it first.
- **Closing via a PR only happens on the default branch.** `Closes #n` in a PR into an integration branch doesn't close the
  issue when it merges there. Close it yourself, or let the release PR to the default branch close it.
