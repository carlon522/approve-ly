# Permissions

Implement permissions as capabilities. Roles should assign default capabilities, but UI and backend checks should ask what a user can do.

## Capabilities

- can_create_company
- can_edit_company
- can_manage_company_branding
- can_invite_users
- can_remove_users
- can_create_campaign
- can_edit_campaign
- can_archive_campaign
- can_create_folder
- can_edit_folder
- can_upload_content
- can_edit_content
- can_download_content
- can_comment
- can_resolve_comments
- can_approve
- can_unapprove
- can_create_private_links
- can_create_public_links
- can_mark_to_archive
- can_cancel_archive
- can_view_audit_log
- can_manage_storage
- can_super_admin

## Role Defaults

| Capability | Creative | Approver | Assistant | Super Admin |
| --- | --- | --- | --- | --- |
| Create/edit company | Yes | No | No | Yes |
| Manage branding | Yes | No | No | Yes |
| Invite/remove users | Yes | No | No | Yes |
| Create/edit campaign | Yes | No | No | Yes |
| Create/edit folders | Yes | No | No | Yes |
| Upload/edit content | Yes | No | No | Yes |
| View assigned content | Yes | Yes | Yes | Yes |
| Download content | Yes | Yes | Yes | Yes |
| Comment | Yes | Yes | No | Yes |
| Resolve comments | Yes | Yes | No | Yes |
| Approve | No | Yes | No | Yes |
| Unapprove | Yes | Yes | No | Yes |
| Create private links | Yes | Yes | No | Yes |
| Create public links | Yes | Yes | No | Yes |
| Mark to archive | Yes | No | No | Yes |
| Cancel archive | Yes | No | No | Yes |
| View audit log | Yes | Limited | No | Yes |
| Manage global storage | No | No | No | Yes |

## Access Rules

- Users see companies where they have company membership or campaign membership.
- Campaign access can be narrower than company access.
- Approvers only see campaigns assigned to them.
- Assistants only see assigned companies or campaigns.
- Public links bypass login only when explicitly public, unexpired, and not revoked.
- Private links require login and normal permission checks.
- Download requires content access plus can_download_content or a valid public link with download enabled.
- Approval requires can_approve, assigned campaign access, no unresolved comments, and a non-archived current version.
- Unapproval requires can_unapprove and assigned campaign access; it clears approval and cancels any pending archive hold.
- Content deletion requires Creative or Super Admin access and removes stored media, comments, and the content record.
- Archive scheduling requires approved status and can_mark_to_archive.
