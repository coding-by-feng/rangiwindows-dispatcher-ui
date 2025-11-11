# Status Code Normalization (FE -> BE)

This UI now uses English status codes in all payloads and filters, while displaying localized labels in the UI.

Status mapping:
- glass_ordered — 玻璃已下单
- doors_windows_produced — 门窗已生产
- doors_windows_delivered — 门窗已送货
- doors_windows_installed — 门窗已安装
- final_payment_received — 尾款已收到

Impacts and API requirements:
- Project entity `status` field uses one of the five codes above.
- List endpoint `/api/projects` should accept `status` query param with these codes for filtering.
- Create endpoint `/api/projects` expects `status` in body as one of the codes above. If omitted, FE defaults to `glass_ordered`.
- Update endpoint `/api/projects/:id` will send `status` with the codes above when user edits a project.
- Export endpoints are unaffected; FE converts codes to localized labels when generating local Excel/PDF. For backend exports, BE can choose to localize.

Backward compatibility notes:
- If current BE expects different labels, please update to accept these codes or provide a translation layer server-side.

Validation suggestions (BE):
- Enforce an enum for `status` in DB and API schema with the five codes listed above.
