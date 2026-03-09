

# ChuteSide Solutions — Phase 1 Implementation Plan

## Overview
A mobile-first livestock management dashboard app for ranchers processing cattle at the chute. Speed and large tap targets are critical — ranchers process 50–300 animals per hour.

## Design System Setup
- Custom color tokens: Navy `#0E2646`, Teal `#55BAAA`, Gold `#F3D12A`, Cull Red `#9B2335`, Page BG `#F5F5F0`
- Inter font exclusively via Google Fonts import
- Gradient presets for stat cards and header/drawer
- Flag priority system: Cull > Production > Management
- All inputs 16px+ font size (prevents iOS zoom), all tap targets 44px+, primary buttons 56px+

## Core Components
1. **FlagIcon** — SVG pennant flag in teal/gold/red with sm/md/lg sizes
2. **PillButton** — Rounded pill button with primary (gold bg) and outline variants
3. **StatCard** — Gradient metric card showing label, value, subtitle
4. **DataCard** — Navy animal summary card with title, values, optional trailing element
5. **CollapsibleSection** — Expandable white card with animated open/close
6. **Toast System** — ToastProvider context + ToastContainer with success/error/info variants, auto-dismiss

## App Shell (AppLayout)
- **Sticky header** with gradient background, hamburger menu on `/`, back arrow on sub-routes
- Header title/subtitle changes per route (e.g., "Saddle Butte Ranch" on dashboard, "Animals" on `/animals`)
- **NavDrawer** — slides from left, gradient background, brand block with glowing "CHUTESIDE" text, 6 nav items with active gold indicator, sign out/switch operation at bottom, body scroll lock

## Routing
- `/` → Dashboard (main screen)
- `/animals`, `/calving`, `/cow-work`, `/red-book`, `/reference` → Placeholder screens
- `/animals/new`, `/animals/:id` → Placeholder screens
- No authentication — all routes accessible directly

## Dashboard Screen (6 sections)
1. **Search Bar** — filters recent animals list, magnifying glass icon, gold focus ring
2. **Stat Cards Grid** — 3 metric cards (Total Head, Active Calving, Open Projects) + Quick Add dashed card, each navigable
3. **Herd Status Bar** — Collapsible navy bar showing flag counts, expands to show Cull/Monitor/Management tiers with sample animal cards
4. **Action Items + Upcoming Work** — Two-column layout; action items with checkable circles (toast on complete), upcoming work rows linking to cow-work
5. **Today's Activity + Recent Animals** — Collapsible activity feed with timestamps and flags, recent animals list filtered by search
6. **Quick Actions** — Two gold pill buttons: "New Record" and "Start Session"

