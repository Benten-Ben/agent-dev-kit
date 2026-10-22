# Setting up a repo and its board

## 1. Auth

```bash
gh auth status                     # logged in?
gh auth refresh -s project         # Projects v2 needs the `project` scope (read:project for read-only)
```

A GitHub App token can't reach a Project owned by a *user* account. Run board commands on a user login, or put the
project under an organization.

## 2. The project

```bash
gh project create --owner <owner> --title "<Project name>"          # prints the URL; the number is at the end
gh project link <number> --owner <owner> --repo <owner>/<repo>       # show it on the repo's Projects tab
```

**Fields.** "Status" exists by default; give it these options, in this order (web UI → the field's settings):
`Backlog`, `Ready`, `In progress`, `In review`, `Done`.

Useful extra fields (single-select, set from labels by a sync script if you like): `Phase`, `Area`, `Size`, `Waiting on`.

```bash
gh project field-create <number> --owner <owner> --name "Size" --data-type SINGLE_SELECT --single-select-options "S,M,L"
```

**Setting the Status options from the command line** (the field's id comes from `gh project field-list`):

```bash
gh api graphql -f f=<status field id> -f query='mutation($f:ID!){updateProjectV2Field(input:{fieldId:$f,
  singleSelectOptions:[{name:"Backlog",color:GRAY,description:""},{name:"Ready",color:BLUE,description:""},
  {name:"In progress",color:YELLOW,description:""},{name:"In review",color:PURPLE,description:""},
  {name:"Done",color:GREEN,description:""}]}){projectV2Field{... on ProjectV2SingleSelectField{options{name}}}}}'
```

Replacing the options gives them new ids, so **every built-in workflow that set a Status loses its value and is left
off**. Set the options first, then the workflows.

**Built-in workflows** (project → ⋯ → Workflows): turn on "Item added → Backlog", "Item closed → Done", and
"Pull request merged → Done". Optionally turn on "Auto-add to project" with a filter such as `is:issue is:open`.
Its repository picker defaults to one of the owner's repositories, not necessarily this one: check it. The workflows
have no API; a session driving the owner's browser can set them (Edit → the value → "Save and turn on workflow").

## 3. Labels

```bash
for l in area:client area:server area:docs phase:1 phase:2 size:S size:M size:L \
         review:light review:standard review:deep review:critical blocked decision-needed needs-design; do
  gh label create "$l" -R <owner>/<repo> --force >/dev/null; done
```

Adapt the `area:*` and `phase:*` sets to the project. Keep the state labels (`blocked`, `decision-needed`, `needs-design`):
`board next` skips them.

## 4. The issue template

Copy `templates/task.md` to `.github/ISSUE_TEMPLATE/task.md`. `board new` uses it as the body.

## 5. Views (web UI)

Useful views:
- **Board** grouped by Status (the default);
- **Ready queue**: table, filter `status:Ready -label:blocked`, sorted by priority or issue number;
- **By phase**: board grouped by Phase, filtered `is:open`;
- **Blocked**: `label:blocked`;
- **Burn-up**: an Insights chart filtered to a phase label.

**A view's layout, filters and grouping persist only through the view's menu → "Save view"** (otherwise they reset when you leave).

## 6. Repo docs

Add a short "The board" section to the contributor doc (e.g. `docs/TEAM.md` or `CONTRIBUTING.md`) and point to it from `CLAUDE.md`:

```
Outstanding work lives ONLY on the GitHub Project board. Claim an issue before working (`tools/board claim <n>`),
open PRs with `Closes #n`, and turn any outstanding work you find elsewhere into issues.
```

Also put `BOARD_OWNER` and `BOARD_NUMBER` in `.board.env` (it holds no secrets, so it can be committed).
