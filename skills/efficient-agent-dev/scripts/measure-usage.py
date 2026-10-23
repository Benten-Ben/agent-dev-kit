#!/usr/bin/env python3
"""measure-usage: what each workflow's agents cost, read from their transcripts.

Usage: measure-usage.py [<project transcripts dir>] [--since YYYY-MM-DD]
The directory defaults to ~/.claude/projects/<the current directory, with / and . turned into ->. It reads every
<session>/subagents/workflows/<run>/agent-*.jsonl below it and prints, per workflow run: agents, their models and effort,
model calls, cache-read and cache-write tokens, output tokens, and the median first-call context. Then the totals.

A transcript records a request's usage more than once while it streams; this keeps, per request id, the entry with the
most output tokens (the final one). Cache reads usually dominate: every call re-reads the whole context, so an agent's
cost grows with (calls x context), and a large instructions file (CLAUDE.md) is paid on every call of every agent.
"""
import collections, glob, json, os, statistics, sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
since = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--since" and i + 1 < len(sys.argv)), "")
root = args[0] if args else os.path.expanduser("~/.claude/projects/" + os.getcwd().replace("/", "-").replace(".", "-"))
rows, total = [], collections.Counter()
for run in sorted(glob.glob(os.path.join(root, "*", "subagents", "workflows", "wf_*"))):
    agents = glob.glob(os.path.join(run, "agent-*.jsonl"))
    s, models, efforts, firsts, first_ts, n = collections.Counter(), collections.Counter(), collections.Counter(), [], None, 0
    for path in agents:
        req, model, effort, first = {}, None, None, None
        for line in open(path, encoding="utf-8", errors="replace"):
            try:
                d = json.loads(line)
            except ValueError:
                continue
            ts = d.get("timestamp")
            if ts and (first_ts is None or ts < first_ts):
                first_ts = ts
            effort = effort or d.get("effort")
            m = d.get("message")
            if not isinstance(m, dict) or not m.get("usage") or str(m.get("model", "")).startswith("<"):
                continue
            u, rid = m["usage"], d.get("requestId") or d.get("uuid")
            model = model or m.get("model")
            if first is None:
                first = u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0)
            if rid not in req or u.get("output_tokens", 0) >= req[rid].get("output_tokens", 0):
                req[rid] = u
        if not req:
            continue
        n += 1
        models[str(model).replace("claude-", "")] += 1
        efforts[str(effort)] += 1
        firsts.append(first or 0)
        for u in req.values():
            s["calls"] += 1
            s["cache_read"] += u.get("cache_read_input_tokens", 0)
            s["cache_write"] += u.get("cache_creation_input_tokens", 0)
            s["output"] += u.get("output_tokens", 0)
    if not n or (since and (first_ts or "") < since):
        continue
    s["agents"] = n
    total.update(s)
    rows.append((first_ts[:10] if first_ts else "?", os.path.basename(run), n, dict(models), dict(efforts), s,
                 int(statistics.median(firsts)) if firsts else 0))
for day, run, n, models, efforts, s, ctx in rows:
    print(f"{day} {run} agents={n} calls={s['calls']} cache_read={s['cache_read']/1e6:.1f}M "
          f"cache_write={s['cache_write']/1e6:.2f}M output={s['output']/1e3:.0f}k first_ctx~{ctx//1000}k {models} {efforts}")
a = max(total["agents"], 1)
print(f"TOTAL runs={len(rows)} agents={total['agents']} calls={total['calls']} cache_read={total['cache_read']/1e6:.0f}M "
      f"cache_write={total['cache_write']/1e6:.0f}M output={total['output']/1e6:.1f}M | per agent: "
      f"{total['calls']/a:.0f} calls, {total['cache_read']/a/1e6:.1f}M cache-read")
