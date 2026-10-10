# Contributor instructions

- Keep this repository a standalone React frontend. ToolsAPI owns authentication, authorization, persistence, scoring and audit.
- Never store API credentials or private user data in source control.
- Use the existing unversioned ToolsAPI API convention; do not add version segments.
- Keep positive and negative transactions distinct and count completed activities independently of points.
- All mutations must be authorized by ToolsAPI; client-side checks are only presentation.
- Update README and CHANGELOG for material changes.
- Add focused tests for new behavior and check build before proposing a merge.
