# Status Code Normalization (FE -> BE)

This UI now uses English status codes in all payloads and filters, while displaying Chinese labels in the UI.

Status mapping:
- not_started — 未开始
- in_progress — 施工中
- completed — 完成

Impacts and API requirements:
- Project entity `status` field uses one of: `not_started | in_progress | completed`.
- List endpoint `/api/projects` should accept `status` query param with the same codes for filtering.
- Create endpoint `/api/projects` expects `status` in body as one of the codes above. If omitted, FE defaults to `not_started`.
- Update endpoint `/api/projects/:id` will send `status` with the codes above when user edits a project.
- Export endpoints are unaffected; FE converts codes to Chinese labels when generating local Excel/PDF. For backend exports, BE can choose to localize.

Backward compatibility notes:
- Previously, FE used Chinese strings in `status`. After this change, FE always sends English codes in backend modes as well.
- If current BE expects Chinese, please update to accept these codes or provide a translation layer server-side.

Validation suggestions (BE):
- Enforce an enum for `status` in DB and API schema: `not_started | in_progress | completed`.
- Return the same codes in responses. FE renders Chinese labels for display.


