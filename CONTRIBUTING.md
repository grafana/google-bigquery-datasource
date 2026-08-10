# Building and releasing

## How to build the Google BigQuery data source plugin locally

## Dependencies

Make sure you have the following dependencies installed first:

- [Git](https://git-scm.com/)
- [Go](https://golang.org/dl/) (see [go.mod](../go.mod#L3) for minimum required version)
- [Mage](https://magefile.org/)
- [Node.js (Long Term Support)](https://nodejs.org)
- [Yarn](https://yarnpkg.com)

## Frontend

1. Install dependencies

   ```bash
   yarn install
   ```

2. Install playwright

   ```bash
      yarn playwright install
   ```

3. Build plugin in development mode

   ```bash
   yarn dev
   ```

4. Build plugin in production mode

   ```bash
   yarn build
   ```

## Backend

1. Build the backend binaries

   ```bash
   mage -v
   ```

2. Start Grafana in Docker

   ```bash
   yarn server
   ```

## Data Source Configuration Schema

`pkg/schema/dsconfig.json` is the **single source of truth** for the data source's
configuration surface — every field a user can set, where it is stored (`root`,
`jsonData`, `secureJsonData`), its type, validation rules and UI hints. It is consumed by
provisioning tooling, documentation and automation.

The schema format is defined and documented by [`grafana/dsconfig`](https://github.com/grafana/dsconfig/tree/main/dsconfig):

- [README](https://github.com/grafana/dsconfig/tree/main/dsconfig#readme) — concepts and a worked example for each field shape (root / jsonData / secret / array / virtual), plus current gaps and limitations.
- [`schema.md`](https://github.com/grafana/dsconfig/blob/main/dsconfig/schema.md) — full property reference.
- [`schema.json`](https://github.com/grafana/dsconfig/blob/main/dsconfig/schema.json) — the JSON Schema `dsconfig.json` validates against. It is pinned via the `$schema` key at the top of our file, so editors autocomplete from it; bump that URL when you bump `github.com/grafana/dsconfig/schema` in `go.mod`.

The rest of this section covers only what is specific to this repository.

### Layout

| File in `pkg/schema/` | Description |
| --------------------- | ----------- |
| `dsconfig.json` | Source of truth — **edit this** |
| `dsconfig_test.go` | Wires the schema into the shared conformance suite; also holds `SecureKeys` |
| `*.gen.json` | Generated artifacts — **never hand-edit**; `npm run build` copies them into `dist/schema/` via `webpack.config.ts` |

### Adding a new settings option

1. **Declare the field** in `pkg/schema/dsconfig.json` under `fields`, and add its `id` to
   the appropriate `groups[].fieldRefs` entry. Field ids follow the `<target>_<key>`
   convention, e.g. `jsonData_defaultProject`.
2. **Add the matching Go field** to `BigQuerySettings` in `pkg/bigquery/types/types.go` with a json tag equal
   to the schema `key`. This parity is enforced in both directions — a field in the schema
   but not the struct (or vice versa) fails the test suite. Secrets
   (`target: secureJsonData`) are the exception: they get no struct field, but their key
   must be added to `SecureKeys` in `pkg/schema/dsconfig_test.go`.
3. **Regenerate the artifacts** and commit them with your change:

   ```bash
   go generate ./pkg/schema/...
   ```

4. **Verify**:

   ```bash
   go test ./pkg/schema/...
   ```

This repo does not ship provisioning examples yet, so `settings.examples.gen.json` is
empty. To add them, set `SettingsExamples` on the `schema.PluginUnderTest` value in
`pkg/schema/dsconfig_test.go` — one worked configuration per auth type is the usual
shape. Use placeholders like `REPLACE_WITH_PASSWORD`, never real credentials.

### When the conformance suite fails

Most failures are self-explanatory from the assertion message. The three you are most
likely to hit:

- `SchemaArtifactInSync` — a `.gen.json` file has drifted. Run `go generate ./pkg/schema/...` and commit the result.
- `JSONDataMatchesStruct` / `JSONDataTypesMatchStruct` — the schema and `BigQuerySettings` disagree on keys or types. Update whichever side is behind.
- `SecureValuesMatchLoadSettings` — the schema's `secureJsonData` fields and `SecureKeys` disagree.

## Testing

1. Testing the frontend

   ```bash
   yarn test
   ```

2. Running e2e tests

   ```bash
   yarn e2e
   ```

## Submitting PR

If you are creating a PR, ensure to run `yarn changeset` from your branch. Provide the details accordingly. It will create `*.md` file inside `./.changeset` folder. Later during the release, based on these changesets, package version will be bumped and changelog will be generated.

## Releasing & Bumping version

To create a new release, execute `yarn changeset version`. This will update the Changelog and bump the version in `package.json` file. Commit those changes. Run the `Plugins - CD` GitHub Action to publish the new release.

## GitHub Actions list

The following workflows live under [.github/workflows](.github/workflows/).

- **Plugins - CI** ([`push.yaml`](.github/workflows/push.yaml)) — Runs on every pull request and on pushes to `main`. It calls Grafana’s shared plugin CI workflow to build and validate the plugin (including Playwright), with a version suffix on PR builds.

- **Plugins - CD** ([`publish.yaml`](.github/workflows/publish.yaml)) — Manual release/deploy workflow: pick a branch and target environment (`dev`, `ops`, or `prod`). It uses Grafana’s shared plugin CD pipeline; you can optionally publish docs only without shipping the plugin artifact.

- **Create Plugin Update** ([`update-create-plugin.yml`](.github/workflows/update-create-plugin.yml)) — Can be run manually or on a monthly schedule. It opens automated updates (via Grafana’s create-plugin tooling) so the repo stays aligned with the current plugin scaffold.

- **Add issues to OSS Big Tent team project** ([`add-to-project.yml`](.github/workflows/add-to-project.yml)) — When a new issue or pull request is opened, it adds the item to the Grafana org project board used by the OSS Big Tent team.

# Plugin Technical Documentation

## Authentication

The [grafana-google-sdk-go](https://github.com/grafana/grafana-google-sdk-go) package is currently used by Google BigQuery data source plugin to provide a unified authentication for Google data sources.

## Architecture

The idiomatic way to use a SQL, or SQL-like, database in Go is through the [database/sql package](https://golang.org/pkg/database/sql/). The sql package provides a generic interface around SQL databases. One main benefit of using this pattern for data fetching is that we are reusing building blocks from other SQL-like data source plugins in Grafana.

### grafana/sqlds and sqlutil

From the [sqlds](https://github.com/grafana/sqlds) readme:

_sqlds stands for SQL Datasource._

_Most SQL-driven datasources, like Postgres, MySQL, and MSSQL share extremely similar codebases._

_The sqlds package is intended to remove the repetition of these datasources and centralize the datasource logic. The only thing that the datasources themselves should have to define is connecting to the database, and what driver to use, and the plugin frontend._

Furthermore, sqlds allows each datasource to implement its own fillmode, macros and string converters.

Internally, sqlds is using [sqlutil](https://github.com/grafana/grafana-plugin-sdk-go/tree/master/data/sqlutil) which is a package in `grafana-plugin-sdk-go`. `sqlutil` exposes utility functions for converting database/sql rows into data frames.

### Google BigQuery driver

The database/sql package can only be used in conjunction with a database driver.

This plugin implements our own sql driver based on https://github.com/solcates/go-sql-bigquery driver.
