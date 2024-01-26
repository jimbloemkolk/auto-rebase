# Auto Rebase

This action rebases all open PR's when the base branch in updated.

## Inputs

### `github_token`

**Required** Github token for the repository

### `filter`

`auto-merge` **default**  Only rebase PR's set automatically merge when all requirements are met

`always` Rebase all PR's to the current branch

## Example usage
```yaml
on:
  push:
    branches:
      - main

jobs:
  rebase:
    runs-on: ubuntu-latest
    steps:
      - uses: Piyushhbhutoria/auto-rebase@v1.0.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
