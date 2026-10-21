# Goal

Complete Bacon #7 structural checking and expose pure schema validation for
Qlatt #252 without changing the Node Validator or CLI loading interface.

# State

Started from merged prerequisite 61bce06. Source and issue read; no local CI.
Implemented structural changes and regression fixtures first, then the pure
schema validator/Node adapter split and package exports. Preparing publication.

# Decisions and why

Strengthen existing checks for parameters, literal values and endpoint ports.
Reuse the endpoint validator for graph interfaces and check declared port indices.
Move the existing AJV validator into a pure class receiving the same three schema
objects; the Node Validator loads those files and delegates. Export a pure entry
and correct the package's schemas directory spelling. Estimate 130–190 changed
production lines, 160–230 existing test lines, and 20 documentation lines.
No CEL, speech rules, macro expansion, graph cycle ban, new cache or workflow.

# Surprises

Existing schema validation already rejects malformed port counts and numeric
indices in CLI inputs; the typed checker now also enforces those constraints.
Named ports lacking direction/index cannot resolve to a concrete endpoint and
are reported by the registry checker. Default counts remain one.
Most validator lines move unchanged; no validation algorithm is duplicated.

# Next step

Implement and publish for hosted Node 20/22 build/tests, full Claude review and
implementer response. Supervisor owns independent review gate and merge.
