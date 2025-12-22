# `@ubiquity-os/daemon-planner`

## Overview

Daemon Planner automates sprint planning for UbiquityOS teams. It listens for `issues.opened` events, evaluates contributor capacity across the configured organisations, and assigns issues to the best available contributor. A scheduled GitHub Action can invoke the plugin once per day to fill any unassigned backlog items across the configured organisations.

## Configuration

Add the plugin to your `.ubiquibot-config.yml` and customise as needed. Sensible defaults are provided for all fields, so you can start with the minimal example and iterate later.

```yml
plugins:
  https://your-worker-url:
    with:
      organizations:
        - ubiquity
        - ubiquity-os
        - ubiquity-os-marketplace
      assignedTaskLimit: 1
```

### Key Settings

- `organizations`: Organisations to inspect when evaluating contributor workload. Defaults to `ubiquity`, `ubiquity-os`, `ubiquity-os-marketplace`.
- `assignedTaskLimit`: A candidate is considered available while they have fewer assigned tasks than this limit.
- `defaultEstimateHours`: Fallback estimate when issue labels do not provide a duration.

Candidates are sourced automatically from each configured organisation's collaborators. Workload calculations aggregate a contributor's open issues across all configured organisations.

### Environment

Set these variables wherever the worker/action executes:

- `MATCHMAKING_ENDPOINT` _(optional)_: REST endpoint that ranks candidates for a task.
- `START_STOP_ENDPOINT` _(optional)_: Endpoint invoked after assignments to orchestrate auxiliary workflows.
  OpenAPI specs are read directly from each endpoint's `/openapi` path during the `prepare` step to generate types; no additional keys are required.

## Development

- Install dependencies with `bun install`.
- Run unit tests with `bun test`.
- Use `bun worker` to run the Cloudflare Worker locally during development.

Regenerate endpoint typings with `bun run generate:openapi-types` (automatically executed during `prepare`). Generated files live under `src/types/generated` and are gitignored.

Ensure the plugin has access to a GitHub token with `repo` scope so it can manage assignees and fetch issue backlogs across the configured organisations.
