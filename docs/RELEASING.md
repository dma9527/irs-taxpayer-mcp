# Releasing irs-taxpayer-mcp

Releases are driven by signed version tags and `.github/workflows/publish.yml`. The workflow builds and tests the package, checks production dependencies, packs and smoke-tests the exact tarball, publishes npm through OIDC, publishes MCP Registry metadata through GitHub OIDC, and creates the GitHub Release.

## One-time npm setup

Configure a Trusted Publisher in the npm package settings for `irs-taxpayer-mcp`:

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `dma9527` |
| Repository | `irs-taxpayer-mcp` |
| Workflow filename | `publish.yml` |
| Environment | Leave empty |
| Allowed action | `npm publish` |

After one OIDC release succeeds, change npm Publishing access to require two-factor authentication and disallow traditional tokens. The release workflow does not use `NPM_TOKEN` or another long-lived publish credential.

## Release preparation

Update these versions together:

- `package.json` version.
- `server.json` version and npm package version.
- `src/tax-server.ts` `SERVER_VERSION`.
- `CHANGELOG.md` release heading.
- `ROADMAP.md` release history.

Then run:

```bash
npm ci
npm run build
npm test
npm audit --omit=dev --audit-level=high
mcp-publisher validate
```

The release metadata test fails when package, runtime, and MCP Registry versions differ.

## Publish

Commit and push the release metadata before creating the tag. Do not move or recreate a published tag.

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

The workflow rejects prerelease tags until an explicit npm dist-tag policy is added. A retry is safe after a partial failure:

- An existing npm version is accepted only when its published shasum matches the newly packed tarball.
- Existing MCP Registry metadata for the same name and version is not republished.
- An existing GitHub Release is not recreated.

## Post-release verification

Verify the workflow run and public package metadata:

```bash
gh run list --workflow publish.yml --limit 1
npm view irs-taxpayer-mcp@X.Y.Z version dist.shasum dist.integrity dist-tags --json
curl --fail --silent --get \
  --data-urlencode "search=io.github.dma9527/irs-taxpayer" \
  "https://registry.modelcontextprotocol.io/v0.1/servers"
```

The workflow pins GitHub-maintained actions by commit SHA and verifies the SHA-256 digest of the pinned MCP Publisher binary before execution.
