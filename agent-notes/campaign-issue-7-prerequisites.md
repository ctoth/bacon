# Goal

Deliver the two existing Bacon prerequisite commits for Qlatt #252 and Bacon #7:
remove speech semantics from Bacon and support parameter connections/layered registries.

# State

Source and issue read; isolated branch created from fetched origin/master3705fc7.
Cherry-picked b503553 and 7dd9a48 unchanged under supervisor authorization.
No new source implementation or local CI. Unrelated b9e3410 notes move excluded.
PR #9 is published. Hosted Node 20 and Node 22 build/test jobs passed at c4bc028.
Claude reviewed the complete 20-file range 3705fc7..c4bc028 and reported no
actionable defects. Accepted the review; no source correction is needed.
Transcript: ~/.claude/projects/C--Users-Q-code-bacon-campaign-7/
6fac53b6-0f07-49a9-92c3-100000000009.jsonl. Supervisor verification remains separate.

# Decisions and why

Smallest delivery: the exact two existing commits, one task note, hosted CI and
full-range Claude review. No additional source changes unless a concrete review
or hosted failure requires an in-scope correction. The approved structural and
pure-validator work remains a separate delivery after this prerequisite merges.

# Surprises

The package files list says schema but the existing directory is schemas.
The audited local master b9e3410 is three commits ahead of fetched origin/master:
b503553 removes semantics, 7dd9a48 adds parameter targets/layered registries and
optional params, and b9e3410 relocates existing notes. The remote base lacks those
prerequisites. Do not silently include or overwrite this existing work.

# Next step

Await final-head hosted CI and supervisor verification/merge. Then resume the
separately approved #7 structural/pure-validator changes from the merged base.
Supervisor owns independent verification, ledger and merge.
