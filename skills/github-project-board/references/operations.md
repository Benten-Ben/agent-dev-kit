# Operations cookbook

Set once: `R=owner/repo; O=owner; N=<project number>`. Node ids come from `gh api graphql` (see "Node ids" below).

## Issues

```bash
gh issue create -R $R --title "…" --body-file body.md --label area:server --label size:S   # prints the URL
gh issue edit 123 -R $R --body-file body.md            # replace a body (read it first: `gh issue view 123 --json body -q .body`)
gh issue comment 123 -R $R --body "**Decided (who, date):** …"
gh issue close 123 -R $R --reason completed --comment "Done: … (PRs #…)"
gh issue list -R $R --state open --label blocked --json number,title -q '.[] | "#\(.number) \(.title)"'
```

## Board items and fields

```bash
gh project item-add $N --owner $O --url https://github.com/$R/issues/123 --format json -q .id    # → item id
gh project field-list $N --owner $O --format json        # field ids and single-select option ids
gh project view $N --owner $O --format json -q .id       # project id
gh project item-edit --id <item id> --project-id <project id> --field-id <field id> --single-select-option-id <option id>
gh project item-list $N --owner $O --format json --limit 1000    # all items with their field values
```

The item id of an issue on a given board:

```bash
gh api graphql -f query='query{repository(owner:"OWNER",name:"REPO"){issue(number:123){projectItems(first:20){nodes{id project{number}}}}}}'
```

## Node ids

```bash
gh api graphql -f query='query{repository(owner:"OWNER",name:"REPO"){issue(number:123){id}}}' -q .data.repository.issue.id
```

## Sub-issues (one parent per issue)

```bash
gh api graphql -f query='mutation{addSubIssue(input:{issueId:"<parent id>",subIssueId:"<child id>"}){issue{number}}}'
gh api graphql -f query='mutation{removeSubIssue(input:{issueId:"<parent id>",subIssueId:"<child id>"}){issue{number}}}'
gh api graphql -f query='query{repository(owner:"OWNER",name:"REPO"){issue(number:100){subIssuesSummary{total completed} subIssues(first:50){nodes{number state title}}}}}'
```

A child that serves two parents goes under one; link it to the other with "blocked by" (the second parent waits on it).

## Dependencies ("blocked by")

```bash
gh api graphql -f query='mutation{addBlockedBy(input:{issueId:"<blocked id>",blockingIssueId:"<blocker id>"}){issue{number}}}'
gh api graphql -f query='mutation{removeBlockedBy(input:{issueId:"<blocked id>",blockingIssueId:"<blocker id>"}){issue{number}}}'
gh api graphql -f query='query{repository(owner:"OWNER",name:"REPO"){issue(number:301){blockedBy(first:100){nodes{number state title}}}}}' \
  -q '.data.repository.issue.blockedBy.nodes[] | select(.state=="OPEN") | "#\(.number) \(.title)"'
```

`board block`, `board unblock`, `board blockers` and `board sync-blocked` wrap these.

## Rate limits

```bash
gh api rate_limit -q '"graphql \(.resources.graphql.remaining)/\(.resources.graphql.limit), core \(.resources.core.remaining)"'
```

GraphQL allows 5,000 points per hour per login. About 14 agents making board calls at once can exhaust it within the hour.

## Bulk edits

Loop with a short pause, write only what differs, and check results by re-reading rather than trusting exit codes:

```bash
for n in 101 102 103; do gh issue edit $n -R $R --add-label phase:4 >/dev/null; sleep 1; done
```
