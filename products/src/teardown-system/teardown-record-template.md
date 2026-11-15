# Teardown: [repository name]

Status: draft / sent to authors on [date] / published [date] / corrected [date]

## Summary

[Three or four sentences, written last. What was examined, what reproduced, what did not, and the most important finding. Give negative results the same weight as positive ones.]

## What was examined

| Item | Value |
| --- | --- |
| Question | [one sentence] |
| Repository | [URL] |
| Commit | [full hash], committed [date], cloned [date] |
| Why this commit | [tag named in the paper / latest on default branch because the paper names none] |
| Paper or documentation | [title, authors, version, DOI or identifier] |
| Time budget | [hours planned] / [hours spent] |
| Out of scope | [what, and why] |
| Reviewer's connections | [to authors, competing work, funders; or "none"] |

## Environment

| Item | Value |
| --- | --- |
| Operating system | |
| CPU / memory | |
| GPU | |
| Language version | |
| Dependencies | [lock file used / container used / resolved versions attached as file] |
| Deviations from the documented setup | [each one, with the reason] |

## Claim ledger

| ID | Claim (quoted) | Source | Kind | Test | Attempted | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | | | | | | | |
| C2 | | | | | | | |

Outcome words: Reproduced / Partly reproduced / Not reproduced / Could not run / Not attempted.

Tolerance, stated before running: [for example, within 0.5 points of the reported value]

## What we ran

1. `[command]`  
   Outcome: [what happened]. Time: [duration]. Log: [file].

## What we found in the code

### F1. [short title]

- Where: `[path]`, lines [n to m], at the pinned commit
- What the code does: [observed]
- What the paper or README says: [reported, with locator]
- Why it matters for claim [ID]: [one or two sentences, no speculation about intent]

## What we looked for and did not find

- [check], at `[path]`, lines [n to m]

## What we did not test, and why

- [item]: [reason]

## Limits of this teardown

[What a reader should not conclude. One commit, one machine, one time budget.]

## How to check us

1. [exact step]

## Contact with the authors

Sent on [date] to [whom]. Reply received on [date]: [summary, or "none by publication"].

## Corrections

[date]: [what changed and why]
