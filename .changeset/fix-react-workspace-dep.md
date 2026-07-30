---
"@timelinx/react": patch
---

fix(react): replace workspace:* with real version range in dependencies

The published @timelinx/react@1.0.0-beta.5 tarball contained "workspace:*" as the dependency specifier for @timelinx/core — an npm-unresolvable pnpm-only protocol. This made the package uninstallable via npm (EUNSUPPORTEDPROTOCOL).

Root cause: commit 2842b42 changed the dependency back to workspace:* during local development, and the subsequent manual publish (CI was broken at the time) shipped it verbatim without pnpm's automatic rewrite.

This patch replaces workspace:* with the real semver range ^1.0.0-beta.3, matching what the automated pipeline would have produced.
