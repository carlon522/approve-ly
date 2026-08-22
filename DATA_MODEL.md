# Data Model

This model is intentionally relational and explicit so permissions, audit trails, and future Codex work stay understandable.

## Core Tables

### users

- id
- email
- display_name
- avatar_url
- global_role: super_admin or user
- created_at
- last_login_at

### profiles onboarding fields

- role_confirmed: boolean; false until a newly authenticated user chooses their workspace role on first login.

### companies

- id
- name
- slug
- logo_url
- brand_color
- storage_limit_bytes
- storage_used_bytes
- created_by
- created_at
- archived_at

### company_members

- id
- company_id
- user_id
- role: creative, approver, assistant
- capabilities: jsonb
- invited_by
- invited_at
- accepted_at
- removed_at

### campaigns

- id
- company_id
- name
- description
- due_at: timestamptz; canonical calendar and sorting value.
- due_label: text; display fallback for legacy records.
- default_reminder_policy_id
- created_by
- created_at
- archived_at

### campaign_members

- id
- campaign_id
- user_id
- role: creative, approver, assistant
- capabilities: jsonb
- assigned_by
- assigned_at
- removed_at

### folders

- id
- company_id
- campaign_id
- parent_folder_id
- name
- created_by
- created_at
- archived_at

### tags

- id
- company_id
- name
- color
- created_by
- created_at

Talent and influencer labels are stored as namespaced content tags (`talent:<name>`). The upload UI searches existing names and commits a selected or newly typed name as a locked tag.

## Content Tables

### content_items

- id
- company_id
- campaign_id
- folder_id
- title
- content_type: video, image, carousel
- status: draft, submitted, in_review, changes_requested, approved, archive_scheduled, archived
- platform: instagram, tiktok, youtube_shorts
- caption
- hashtags
- due_at: timestamptz; canonical content approval deadline.
- due_label: text; display fallback for legacy records.
- current_version_id
- approved_by
- approved_at
- archive_scheduled_at
- archive_delete_after
- archived_at
- created_by
- created_at
- updated_at

### content_item_tags

- content_item_id
- tag_id

### content_versions

- id
- content_item_id
- version_number
- change_summary
- submitted_by
- submitted_at
- locked_at

### content_files

- id
- content_version_id
- file_role: original, preview, thumbnail, carousel_slide
- storage_provider: r2, cloudflare_stream
- storage_key
- playback_id
- filename
- mime_type
- size_bytes
- width
- height
- duration_ms
- sort_order
- checksum
- deleted_at
- created_at

## Review Tables

### comments

- id
- content_item_id
- content_version_id
- parent_comment_id
- author_id
- body
- status: open, resolved
- resolved_by
- resolved_at
- created_at
- updated_at

### comment_anchors

- id
- comment_id
- anchor_type: video_time, image_point, image_rect, carousel_slide, carousel_point, carousel_rect
- time_ms
- frame_number
- slide_index
- x
- y
- width
- height
- created_at

### approvals

- id
- content_item_id
- content_version_id
- campaign_id
- approver_id
- approved_at
- blocked_comment_count
- created_at

### activity_events

- id
- company_id
- campaign_id
- content_item_id
- actor_id
- event_type
- event_payload
- created_at

## Sharing And Jobs

### share_links

- id
- company_id
- campaign_id
- content_item_id
- created_by
- access_type: private, public
- token_hash
- can_download
- expires_at
- revoked_at
- created_at

### share_link_events

- id
- share_link_id
- viewer_user_id
- event_type: viewed, downloaded
- ip_hash
- user_agent
- created_at

### notification_preferences

- id
- user_id
- company_id
- immediate_approval
- immediate_changes_requested
- comment_bundle_minutes
- due_date_reminders
- created_at
- updated_at

### reminder_policies

- id
- company_id
- campaign_id
- name
- offsets
- overdue_frequency_hours
- created_by
- created_at

### background_jobs

- id
- job_type
- target_table
- target_id
- run_after
- status
- attempts
- last_error
- created_at
- completed_at
