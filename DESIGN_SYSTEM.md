# Design System

Approve.ly is an operational SaaS tool, not a marketing site. The interface should be calm, dense enough for work, and polished on mobile.

## Visual Direction

- Neutral foundation with crisp white surfaces, ink text, soft gray borders, and restrained accent colors.
- Avoid one-hue palettes and large decorative gradients.
- Cards are for repeated items, modals, and framed tools only.
- Keep border radius at 8px or less for cards and controls unless a specific component needs round media.
- Use stable dimensions for thumbnails, platform previews, toolbar buttons, status chips, and counters.

## Primary Colors

- Background: #f7f7f4
- Surface: #ffffff
- Text: #18181b
- Muted text: #66645f
- Border: #dedbd2
- Accent green: #0f8a5f
- Accent blue: #2563eb
- Warning amber: #b7791f
- Danger red: #c2410c
- Platform dark: #111111

## Typography

- Use the configured Geist font.
- Do not scale font size with viewport width.
- Letter spacing should be 0 unless matching small uppercase labels.
- Dashboard headings should be compact.
- Approval page controls should stay readable with one thumb on mobile.

## Components

- Status chips: draft, submitted, in review, changes requested, approved, archive scheduled, archived.
- Platform chips: Instagram, TikTok, YouTube Shorts.
- Content cards: thumbnail, title, status, platform, due date, version, comment count, storage size.
- Review toolbar: approve, comment, download, share, version compare, archive.
- Comment list: unresolved first, anchor metadata visible, threaded replies.
- Platform preview: phone-like preview with safe areas, caption, avatar, username, icons, and platform chrome.

## Responsive Rules

- Mobile first.
- Bottom sticky action bar on content approval.
- Dashboard stats should stack into two columns on small screens and four columns on desktop.
- Campaign content list should support compact cards on mobile and table-like density on desktop.
- Approval page should be one column on mobile and preview plus side panel on desktop.

## Accessibility

- All interactive icons need labels or accessible names.
- Do not rely on color alone for status.
- Use clear focus states.
- Hit targets should be at least 44px on mobile.
