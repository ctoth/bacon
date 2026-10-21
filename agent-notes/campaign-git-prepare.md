# Goal

Make the existing package exports available when Bacon is installed from a
pinned Git commit, as required by Qlatt #252 integration.

# State

Started from merged 64dfe5c. Published PR #11 at 0722d630; both hosted
Node 20/22 checks passed. The Node 20 job log shows prepare running the existing
TypeScript build during installation. No local CI ran.
Claude reviewed the full two-file PR and relevant package/npm source with no
actionable defects. Accepted that disposition; no production response needed.
Review session: 6fac53b6-0f07-49a9-92c3-100000000011.

# Decisions and why

Smallest change: add `prepare: npm run build` to existing package scripts.
The exports point to dist, which is ignored by Git. npm's Git fetcher installs
development dependencies and its directory packer runs prepare before collecting
package files. Reuse the existing TypeScript build; do not check in dist, publish
to a registry, change workflows or copy checker code into Qlatt.
Estimate one production line plus this task note. Qlatt dependency pinning and
checked backend preparation remain separate work.

# Surprises

None. Existing hosted CI installs dependencies and explicitly builds/tests on
Node 20 and 22. It will also run prepare during installation; that does not by
itself prove the future Qlatt Git installation or browser bundle.

# Next step

Push this response and await final-head CI. Supervisor owns independent review
gate and normal merge. Actual Qlatt Git installation/browser integration has not
been exercised by this prerequisite.
