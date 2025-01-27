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
   yarn install --pure-lockfile
   ```

2. Build plugin in development mode or run in watch mode

   ```bash
   yarn dev
   ```

   or

   ```bash
   yarn watch
   ```

3. Build plugin in production mode

   ```bash
   yarn build
   ```

## Backend

1. Build the backend binaries

   ```bash
   mage -v
   ```

## Submitting PR

If you are creating a PR, ensure to run `yarn changeset` from your branch. Provide the details accordingly. It will create `*.md` file inside `./.changeset` folder. Later during the release, based on these changesets, package version will be bumped and changelog will be generated.

## Releasing & Bumping version

To create a new release, execute `yarn changeset version`. This will update the Changelog and bump the version in `package.json` file. Commit those changes. Run the `Plugins - CD` GitHub Action to publish the new release.


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
