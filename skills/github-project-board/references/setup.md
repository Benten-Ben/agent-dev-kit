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

**Built-in workflows** (project → ⋯ → Workflows). A set that has worked on two projects:

| Workflow | Setting |
|---|---|
| Item added to project | Status: Backlog |
| Item closed | Status: Done |
| Pull request merged | Status: Done |
| Pull request linked to issue | Status: In review |
| Item reopened | Status: Ready (issues) |
| Auto-close issue | when Status becomes Done, close the issue |
| Auto-archive items | `is:issue is:closed updated:<@today-14d` (runs every 12 hours) |
| Auto-add to project | this repo, `is:issue is:open`; the repository picker defaults to one of the owner's repos, not necessarily this one: check it |
| Auto-add sub-issues to project | on by default |

The workflows have no write API. Read which are on with GraphQL (`projectV2{workflows{nodes{name enabled}}}`: names and
on/off, not their settings). A session driving the owner's browser can set them: open the workflow, press Edit, set the
value in its dropdown (a button reading "A value is required"; click it, wait for the options, click one), then "Save and
turn on workflow". The first click often only closes the menu, so check the page says "On" and press it again if not.
React text boxes, such as Auto-add's filter, need the native setter and an `input` event, not a plain `value =`.

## 3. Labels

```bash
for l in area:client area:server area:docs phase:1 phase:2 size:S size:M size:L \
         review:light review:standard review:deep review:critical blocked decision-needed needs-design; do
  gh label create "$l" -R <owner>/<repo> --force >/dev/null; done
```

Adapt the `area:*` and `phase:*` sets to the project. Keep the state labels (`blocked`, `decision-needed`, `needs-design`):
`board next` skips them. Add any others it should skip to `BOARD_SKIP` in `.board.env`, such as `owner-action` (the owner
acts outside the code) or `waiting-<team>` (an answer from people outside the repo).

Process labels worth having from the start: `changes-requested` (a review asked for changes; fix on the same branch),
`needs-human-review` (a person looks before merge), `board-hold` (while an issue carries it, nothing is handed out: a
release freeze), `escaped-defect` (found after merge; feeds a post-merge audit), and one per alarm a scheduled job
raises (for example `ci-red`, `backup-failure`). A label's description is limited to 100 characters (`gh label create`
answers 422 past it).

A release or cutover can also be a **milestone** holding every issue that gates it (`gh api -X POST
repos/<owner>/<repo>/milestones -f title="…"`, then `gh issue edit <n> --milestone "…"`), beside the gate issue.

## 4. The issue template

Copy `templates/task.md` to `.github/ISSUE_TEMPLATE/task.md`. `board new` uses it as the body.

## 5. Views

**Name, layout, filter and visible fields have an API**:
`createProjectV2View(input:{projectId, name, layout: TABLE_LAYOUT|BOARD_LAYOUT|ROADMAP_LAYOUT})`, then
`updateProjectV2View(input:{viewId, name, layout, filter, configuration:{visibleFieldIds:[…]}})`. The field and view ids
come from `projectV2{views{nodes{id number name}} fields{nodes{... on ProjectV2FieldCommon{id name}}}}`.

**Grouping does not** (a table's "Group by", a board's "Column by"; a board's columns default to Status). In the browser:
load the view with `?groupedBy%5BcolumnId%5D=<the field's databaseId>` (from `field(name:"Area"){... on
ProjectV2SingleSelectField{databaseId}}`), or use the view's menu → Group by. Then the view's menu → **"Save view"**,
which opens a dialog, "Save display options for <view>?": **press its Save**, or nothing is kept. Check by reloading the
view without URL parameters; the API's `groupByFields` can still read empty after the grouping has saved.

Useful views:
- **Board**: board layout, columns by Status, **no filter** (`is:open` would leave Done empty);
- **Ready queue**: table, `status:Ready -label:blocked`;
- **In flight**: `status:"In progress","In review"`;
- **Stale**: `is:open updated:<@today-3d status:"In progress","In review"` (on a board whose backlog was just filed,
  `-status:Done` alone lists almost everything);
- **Who's waiting**: table grouped by a "Waiting on" field, so one conversation clears a group;
- **Needs <owner>**: `waiting-on:<owner> is:open`, and **Decisions**: `label:decision-needed is:open`;
- **Backlog by area**: `status:Backlog,Ready is:open`, grouped by Area;
- a view per phase or for the release gate, and **All**: a plain table;
- **Burn-up**: an Insights chart filtered to a phase label.

## 6. Repo docs

Add a short "The board" section to the contributor doc (e.g. `docs/TEAM.md` or `CONTRIBUTING.md`) and point to it from `CLAUDE.md`:

```
Outstanding work lives ONLY on the GitHub Project board. Claim an issue before working (`tools/board claim <n>`),
open PRs with `Closes #n`, and turn any outstanding work you find elsewhere into issues.
```

Also put `BOARD_OWNER` and `BOARD_NUMBER` in `.board.env` (it holds no secrets, so it can be committed).

## 7. Moving an existing to-do list onto the board

A project that kept its outstanding work in a doc can move it in one pass:

1. **Extract, then verify.** One agent turns the doc into candidate rows (source, title, type, who it waits on, what is
   left). Then several readers check each row against the code, git history and the docs written after it: keep, edit,
   merge or drop, with evidence. A doc that lists work drifts: rows say "not merged" of branches that merged, and some
   predate the work that answered them. One more reader looks in the places the doc never listed (recent build notes,
   the runbook, today's failures).
2. **Consolidate before filing.** Most rows are questions for people, not code. File one checklist issue per person who
   owes answers, and the owner's own decisions as a few checklists by area; an answer that needs code becomes its own
   work order, linked from its line. Keep everything that gates the release as an issue of its own, so the gate's
   "blocked by" list says exactly what blocks it. (241 checked rows became 88 issues.)
3. **File with a resumable script**: create the issue, find its board item, set every field, record the number in a
   state file, then add sub-issue and "blocked by" links in a second pass. Check each body against the private-text
   list before posting.
4. **Turn the doc into a pointer** to the board, with the commit that held its last full text, so old references to
   its sections still resolve. Each issue's body names the row it came from.
