# Goal

Deliver the two existing Bacon prerequisite commits for Qlatt #252 and Bacon #7:
remove speech semantics from Bacon and support parameter connections/layered registries.

# State

Source and issue read; isolated branch created from fetched origin/master3705fc7.
Cherry-picked b503553 and 7dd9a48 unchanged under supervisor authorization.
No new source implementation or local CI. Unrelated b9e3410 notes move excluded.

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

Publish this prerequisite for hosted CI and full-range Claude review, respond to findings.
Supervisor owns independent verification, ledger and merge.
