# Issue dependency convention

This repository tracks implementation dependencies in each Issue body using a `## Blocked by` section.

Example:

```md
## Blocked by
- #2
- #4
```

The currently connected GitHub integration does not expose GitHub's native issue-dependency write API, so these references are the project convention for dependency visibility.

When a prerequisite is completed, verify all referenced `Blocked by` issues before starting dependent work.
