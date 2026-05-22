# Upstream Patch Policy

`vendor/used-market-notifier/` is read-only by default.

Only apply vendor patches when they are unavoidable for v1 integration or upstream compatibility. Keep every patch minimal, justified, and easy to drop during a future upstream sync.

## Required Patch Metadata

Record each vendor patch with:

- date
- reason
- affected files
- local behavior impact
- expected upstream sync impact
- follow-up plan, including whether the patch should be proposed upstream

## Patch Log Template

| Date | Reason | Affected Files | Sync Impact | Follow-up |
| --- | --- | --- | --- | --- |
| _TBD_ | _Why the patch was required_ | `path/to/file` | _How subtree pulls are affected_ | _Upstream issue or removal plan_ |

If no patches have been applied yet, leave this file in place as the policy reference and keep the log empty.
