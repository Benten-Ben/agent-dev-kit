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
- **Auto-add races a script's `item-add`.** With "Auto-add to project" on, a filer that creates an issue and then calls
  `gh project item-add` can lose to the workflow and get "Content already exists in this project". Look the item up
  instead (`repository{issue(number:N){projectItems{nodes{id project{number}}}}}`), and retry for a few seconds: for a
  moment after creation the same query can answer "Could not resolve to an Issue".
- **During a GitHub incident a project's item list can read 0** (`projectV2{items{totalCount}}`, `gh project
  item-list`, and the board in the browser) while every issue still lists its project item. Check githubstatus.com
  before concluding the items were lost; the issue's own `projectItems` is the truth.
- **A view's grouping is kept only after a confirmation.** "Save view" opens "Save display options for <view>?"; until
  its Save is pressed, nothing is stored, and a reload shows the view ungrouped. See setup.md §5.
- **Don't filter the Board view with `is:open`**: its Done column would always be empty.
- **`GITHUB_TOKEN` cannot edit a Project owned by a personal account**, just as an App token cannot. A scheduled job can
  maintain labels and issues (dropping a stale `blocked`, a digest issue); field edits stay with a person's login.
- **A label description over 100 characters** makes `gh label create` fail with 422.
- **Driving the owner's own browser**: the owner may be using it at the same moment. Open your own tab and pass its id
  to every script call (without one, a call runs in whatever tab is in front). A tab list holds the owner's private
  pages: read only the id you need and repeat nothing else. Some browser tools don't return a promise's value: store
  results on `window` and read them in a second call.
