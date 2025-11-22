# `@ubiquity-os/daemon-planner`

## Overview

Daemon Planner automates sprint planning for UbiquityOS teams. It listens for `issues.opened` events, evaluates contributor capacity across the configured organisations, and assigns issues to the best available contributor. A scheduled GitHub Action can invoke the plugin once per day to fill any unassigned backlog items across the configured organisations.

## Configuration

Add the plugin to your `.ubiquibot-config.yml` and customise as needed. Sensible defaults are provided for all fields, so you can start with the minimal example and iterate later.

```yml
plugins:
  https://your-worker-url:
    with:
      candidateLogins:
        - shiv810
        - gentlementlegen
        - whilefoo
      organizations:
        - ubiquity
        - ubiquity-os
        - ubiquity-os-marketplace
      dailyCapacityHours: 6
      planningHorizonDays: 5
      reviewBufferHours: 2
      defaultEstimateHours: 4
```

### Key Settings

- `organizations`: Organisations to inspect when evaluating contributor workload. Defaults to `ubiquity`, `ubiquity-os`, `ubiquity-os-marketplace`.
- `candidateLogins`: Optional static shortlist of contributors. When omitted, the plugin queries the Supabase candidates table.
- `dailyCapacityHours`, `planningHorizonDays`, `reviewBufferHours`: Scheduling parameters that translate work queues into hours of focus time.
- `defaultEstimateHours`: Fallback estimate when issue labels do not provide a duration.

### Environment

Set these variables wherever the worker/action executes:

- `MATCHMAKING_ENDPOINT` *(optional)*: REST endpoint that ranks candidates for a task.
- `COMMAND_ENDPOINT` *(optional)*: Endpoint invoked after assignments to orchestrate auxiliary workflows.
- `SUPABASE_URL` *(optional)*: Supabase project URL. Required when relying on automatic candidate discovery.
- `SUPABASE_KEY` *(optional)*: Service role key used to query Supabase.
- `SUPABASE_CANDIDATES_TABLE` *(optional, default `candidates`)*: Table or view exposing a `login` column for contributor handles.

## Development

- Install dependencies with `bun install`.
- Run unit tests with `bun test`.
- Use `bun worker` to run the Cloudflare Worker locally during development.

Ensure the plugin has access to a GitHub token with `repo` scope so it can manage assignees and fetch issue backlogs across the configured organisations.
