/* ════════════════════════════════════════════════════════════════════════
   Flowtive One — Config & data tables (no functions, just constants)
   Loaded first; everything else assumes these globals exist.
   ════════════════════════════════════════════════════════════════════════ */

var TEAM_PASSWORD = '!FlowtiveOne2026#';

/* ── Version ────────────────────────────────────────────────────────
   Bump this on every push. Click the pill in the sidebar footer to see
   the changelog. Conventions:
     2.0.x — patch (bug fixes only)
     2.x.0 — minor (new features, no breaking changes)
     x.0.0 — major (significant redesign / breaking workflow changes)
   The changelog below renders in the "What's New" modal — newest first. */
var APP_VERSION = '2.24.1';
var APP_CHANGELOG = [
  {
    version: '2.24.1',
    date:    '2026-04-30',
    title:   'Tracker typewriter survives panel re-renders',
    notes:   'The "What are you working on?" placeholder typewriter used to restart from a fresh random phrase every time the Tracker panel rebuilt — filter chip clicks (Today / Yesterday / This Week / Last Week / All Time), scope toggle, or any teammate Firebase update. Now it picks up exactly where it left off, so navigation feels smooth instead of jumpy.',
    changes: [
      {type:'fix', text:'Typewriter state (current phrase, character position, mode) now lives at module scope instead of being closed over by each render. A re-render kills the DOM but preserves the state; the next start paints the current text immediately and resumes the chain. Visually seamless across filter clicks.'},
      {type:'improvement', text:'Reduced-motion fallback also caches its chosen phrase — was previously picking a fresh random phrase on each render, which is itself a kind of motion that defeats the OS preference.'},
      {type:'improvement', text:'Lead-in pause (320ms cursor-only beat before typing starts) only fires on the very first run now. Subsequent re-renders resume immediately so navigation feels instant.'}
    ]
  },
  {
    version: '2.24.0',
    date:    '2026-04-30',
    title:   'QA Round 3 — reliability + a11y fixes',
    notes:   'Eight bugs surfaced in the third deep QA pass on Logbook. The headline three were silent data loss in the description inputs (tracker bar + entry-log inline edit) and a missing keyboard activation on the inline-edit span. Plus a dead "Show all time" CTA, an Esc-key conflict between bulk bar + delete confirm modal, and a dead-code branch in the calendar Day/Week toggle.',
    changes: [
      {type:'fix', text:'No more silent data loss when editing an entry-log description inline. The 30-second tick re-render and Firebase listener-driven re-renders used to wipe the inline-edit input without firing blur — typed text vanished. Render now captures focus + caret + typed value before innerHTML, restores them after, and re-arms the inline edit on the matching row.'},
      {type:'fix', text:'Same fix for the tracker bar "What are you working on?" input. Typed-but-not-yet-saved text used to disappear when any teammate touched a session, project, or tag. Now preserved across re-renders, plus debounced auto-save commits each pause-in-typing to Firebase as a belt-and-suspenders.'},
      {type:'fix', text:'Click-to-edit description span (`role="button"`, `tabindex="0"`) now responds to Space/Enter for keyboard-only users. Previously tabbing to the span and pressing the keyboard activator did nothing — accessibility blocker on a feature whose whole point was "click to edit".'},
      {type:'fix', text:'Reports empty-state "Show all time" CTA actually works now. Was emitting `setRepRange(\'all\')` but the valid value is `\'all_time\'`; the click silently fell through to "this week" — confusing dead-end on the most obvious recovery path.'},
      {type:'fix', text:'Esc inside the bulk-delete confirm modal closes the modal on the first press. The bulk-bar Esc handler used to swallow the keystroke (capture-phase + stopPropagation), eating the modal\'s bubble-phase Esc. Now bails when any modal / drawer / picker is open.'},
      {type:'fix', text:'Calendar Week → Day toggle now lands on TODAY instead of stranding you on Monday. The "snap to today on first entry into Day mode" check tested the wrong variable (compared the just-assigned value to itself, always false), so the snap never fired.'},
      {type:'fix', text:'Project + tag pickers can no longer latch onto an unrelated chip in a different surface (e.g. tracker bar chip when picker was opened from the Manual Entry dialog). Re-anchor fallback is now scoped to the original anchor\'s containing modal/drawer/body.'},
      {type:'fix', text:'`createProject` rollback (when the Firebase write rejects) now clears `projectId` on any session that was optimistically tagged with the failed project. Prevents orphaned project references silently lingering in session records.'},
      {type:'fix', text:'Tag + project pickers now float ABOVE the Manual Entry / Edit Entry dialogs instead of getting hidden behind the modal\'s semi-transparent backdrop. Picker z-index lifted from 1900 to 2700 — clear of every modal, drawer, palette, and keyboard-shortcuts overlay, but still beneath transient toasts.'},
      {type:'fix', text:'Tag + project pickers are now mutually exclusive — opening one closes the other. Previously you could stack both open at once inside the Manual Entry dialog, which read as broken layout. They also now close together when the dialog closes, instead of one or both lingering on the page as orphan popovers.'}
    ]
  },
  {
    version: '2.23.1',
    date:    '2026-04-30',
    title:   'Typewriter placeholder on the Tracker description input',
    notes:   'The "What are you working on?" input now has a classic typewriter animation as its placeholder — types each phrase out one character at a time with a blinking cursor, holds for a beat, deletes it, picks a new phrase, repeats. Cycles through ~30 short work prompts. Plus the loud focus halo around the tracker bar is gone.',
    changes: [
      {type:'new',         text:'Typewriter placeholder. Phrases type out at ~75ms per character (with subtle ±18ms jitter so the rhythm reads as human, not metronomic), hold for 1.5s on the full phrase, backspace at ~35ms per character, then a brief gap with the cursor blinking on its own before the next phrase starts.'},
      {type:'new',         text:'Cycles through ~30 short work prompts at random — e.g. "Polishing the onboarding flow", "Reviewing this week\'s analytics", "Drafting cold-pitch templates", "Mapping Texas territory leads". Spans design, dev, copy, analytics, leads, admin.'},
      {type:'new',         text:'CSS-driven blinking caret sits at the end of the typed text — same look as a real terminal cursor. Independent of the text element so it never stutters when characters are added or removed.'},
      {type:'improvement', text:'Removed the accent-tinted focus ring that wrapped the entire tracker bar whenever the description input was focused. Felt loud during routine typing — bar stays quiet until you press Start.'},
      {type:'improvement', text:'Running-state ring (green, when a timer is active) is unchanged — that\'s a deliberate "I\'m tracking" cue, not a focus indicator.'},
      {type:'improvement', text:'Animation cancels the moment you start typing in the field, restarts on blur if you leave it empty, and self-stops when the tracker bar re-renders so nothing accumulates in the background.'},
      {type:'improvement', text:'Honors `prefers-reduced-motion: reduce` — users with that OS preference see a single static random phrase, no animation, no caret blink.'}
    ]
  },
  {
    version: '2.23.0',
    date:    '2026-04-30',
    title:   'Click-to-edit description on Tracker entry log rows',
    notes:   'Click any time entry\'s description text in the log to edit it inline — Enter saves, Esc reverts. Previously you had to open the edit dialog just to fix a typo or add a missing description.',
    changes: [
      {type:'new',         text:'Click any of your own entry\'s description (or "(no description)" placeholder) in the Tracker entry log → it becomes an editable input. Enter saves; Esc reverts; clicking elsewhere also saves.'},
      {type:'improvement', text:'Empty descriptions show a faded italic "(no description)" placeholder that invites a click — clearer signal than the old plain-text version.'},
      {type:'improvement', text:'Hovering an editable row underlines the description with a subtle dotted line (same pattern as task titles) so the click affordance is discoverable.'},
      {type:'improvement', text:'Descriptions on task-linked entries and other users\' entries stay non-clickable — those aren\'t yours to edit here.'}
    ]
  },
  {
    version: '2.22.0',
    date:    '2026-04-29',
    title:   'Tracker idle timer is now a click-to-add shortcut',
    notes:   'Click the "00:00:00" display on the Tracker bar to open the manual-entry dialog. Faster path than reaching for the small + button at the end of the row.',
    changes: [
      {type:'new',         text:'Idle timer (00:00:00 on the Tracker bar) is now clickable — opens the same Add Manual Entry dialog the + button opens. Subtle hover background + focus ring signal it\'s interactive. Tooltip reads "Click to add time manually".'},
      {type:'improvement', text:'The explicit + button at the end of the bar stays for discoverability and consistent placement; the clickable timer is a faster alternative for users who notice it.'}
    ]
  },
  {
    version: '2.21.1',
    date:    '2026-04-29',
    title:   'Manual Entry dialog spacing + field uniformity',
    notes:   'The Add/Edit Manual Entry dialog\'s Project + Tags chip-buttons were a different shape and height (rounded pill, 7px padding) than the Date / Start / End inputs above (rectangular, 8px padding). Same form, two field styles. Plus the section spacing was uneven.',
    changes: [
      {type:'fix',         text:'Project + Tags chip-buttons now match the Date/Time inputs exactly — same 36px height, same 6px corner radius, same padding and font size. Dialog reads as one cohesive form.'},
      {type:'improvement', text:'Consistent 14px gap above each labeled section (Description, Date row, Duration, Project/Tags row). Was 0 / 10 / 10 / 10 — now uniform.'},
      {type:'improvement', text:'Labels sit 6px above their fields (was 5px) — a touch more breathing room.'}
    ]
  },
  {
    version: '2.21.0',
    date:    '2026-04-29',
    title:   'Inline-create on the project picker',
    notes:   'The project chip on the Tracker bar now opens a search picker (same shape as the tag picker). Type to filter existing projects, or type a new name + Enter to create it inline — no separate prompt modal.',
    changes: [
      {type:'new',         text:'Project picker has a Filter / Add input at the top. Typing filters the list as you go; pressing Enter on a name that doesn\'t match an existing project creates it (with the next color in the palette) and selects it for the running session in one keystroke.'},
      {type:'improvement', text:'Removed the awkward "Create your first project…" placeholder + native prompt() flow that only appeared when the project list was empty. The new inline-create works regardless of how many projects already exist.'},
      {type:'improvement', text:'Project chip on the tracker bar now carries the same data-pt-pick-anchor attribute as the tag chip — picker stays anchored even if the tracker bar re-renders mid-pick.'},
      {type:'fix',         text:'Project picker reuses the tag picker\'s position-caching helper, so the same "snap to top-left" bug we fixed for tags can\'t happen here either.'}
    ]
  },
  {
    version: '2.20.1',
    date:    '2026-04-29',
    title:   'Tag picker no longer snaps to top-left',
    notes:   'Bug fix: clicking the Tags chip on the Tracker bar opened the picker correctly, but if anything caused the tracker bar to re-render (Firebase update, scope toggle, manual edit) while the picker was open, the picker would snap to the top-left corner of the page on the next interaction.',
    changes: [
      {type:'fix', text:'Tag picker on the Tracker bar now caches the chip\'s position when it opens AND re-queries via a stable data-pt-pick-anchor attribute on every reposition. If the original chip element gets replaced by a re-render mid-picker, the picker stays put instead of snapping to (0, 0).'}
    ]
  },
  {
    version: '2.20.0',
    date:    '2026-04-29',
    title:   'Polish round — Logbook + Workflow deferred items',
    notes:   'Eleven small fixes from the parked Round 1 deferred lists across both apps. Each is a self-contained polish item; together they tighten daily-use surfaces (calendars, time pills, project palette, etc.).',
    changes: [
      {type:'new',         text:'Project palette gained 3 neutral grays (#94A3B8 / #64748B / #475569) for "background" projects like Admin, Overhead, Internal.'},
      {type:'improvement', text:'Calendar block colors now adapt to dark mode — bumped from 0.18 alpha to 0.30 alpha when data-theme="dark" so blocks stay readable on dark backgrounds.'},
      {type:'improvement', text:'Timesheet empty cells show a faint "+" at 0.35 opacity by default (was hidden until hover) so cells look clickable on first scan.'},
      {type:'improvement', text:'Sidebar elapsed-time pill ticks every 60s instead of 30s — labels show "Xh Ym" so sub-minute updates are invisible anyway. Halves the reflow rate.'},
      {type:'improvement', text:'"Working Now" card on the Workspace Dashboard gained a small "longest first" sort label so users know what they\'re looking at.'},
      {type:'improvement', text:'Reports tag-grouped table shows a "ⓘ multi-tag" hint chip — explains that entries with N tags count toward each tag\'s total (sum across rows can exceed grand total).'},
      {type:'improvement', text:'Tasks comment delete button tooltip clarified to "Delete your comment" (only your own comments show the button).'},
      {type:'new',         text:'Tasks time pill distinguishes "never tracked" (em-dash, faintest) from "0m" (entries logged but sum to 0) — easier to spot truly unworked tasks.'},
      {type:'improvement', text:'Subtask order is now stable across renders — added id tiebreaker for subtasks created within the same millisecond (no more flicker on re-render).'},
      {type:'improvement', text:'Drag-card-on-board feedback is more tactile: the card scales 3% + tilts 1° + lifts via shadow while dragging (was opacity-only).'},
      {type:'fix',         text:'Logbook Calendar block hover Stop / Delete buttons sit on rgba(0,0,0,0.55) backdrop with backdrop-filter blur for legibility on any color block.'}
    ]
  },
  {
    version: '2.19.0',
    date:    '2026-04-29',
    title:   'Projects + Tags hardening',
    notes:   'Six concrete fixes from a deep code review of the Projects + Tags surface. The big ones: optimistic creates now roll back if Firebase rejects (no more "saved" UI lying about a failed save), the project list rejects duplicate names just like tags do, and tag delete + undo correctly restores BOTH the tag and every entry that referenced it.',
    changes: [
      {type:'fix',         text:'Optimistic project / tag creates now roll back on Firebase rejection. Previously the new entry would appear in the list even though the save failed — refresh would make it vanish. Now if Firebase says no, the row disappears and the error toast explains why.'},
      {type:'new',         text:'Project name duplicate check (parity with Tags). Trying to add a second "Marketing" shows "Project already exists" and refuses.'},
      {type:'fix',         text:'Delete-a-tag undo now restores BOTH the tag AND its references on every time entry. Previously undo brought the tag back but left entries un-tagged.'},
      {type:'fix',         text:'Removed a redundant "Tag deleted" toast that fought the undo toast on tag deletion.'},
      {type:'improvement', text:'Project-with-entries delete flow ("Move to No project" / "Delete entries too") now logs Firebase errors via the standard error path instead of silently swallowing them — same diagnostic format as the rest of the surface.'},
      {type:'improvement', text:'Tag picker (used by the tracker bar) re-renders immediately after creating a new tag inline — no more arbitrary 200ms wait, since createTag already does an optimistic write.'}
    ]
  },
  {
    version: '2.18.0',
    date:    '2026-04-29',
    title:   'Logbook QA Round 2 — keyboard a11y, multi-day clarity, offline feedback',
    notes:   'Five real-bug fixes from the second deep audit of Flowtive Logbook. The audit surfaced 18 candidates; most were false alarms (DST is already handled, the CSV filename is already YYYY-MM-DD, day grouping has an explicit numeric sort, etc.). Round 1 deferred polish remains parked.',
    changes: [
      {type:'fix',         text:'Space and Enter now toggle bulk-select checkboxes when keyboard-focused. Was a real a11y gap — keyboard-only users couldn\'t access bulk-select on Tasks or Tracker.'},
      {type:'improvement', text:'Calendar × delete on multi-day sessions now reads "Delete entire session (spans multiple days)" in the tooltip + confirm modal. Same single-click behavior, clearer warning so the user knows all days will be removed.'},
      {type:'fix',         text:'Reports → All Time on a flaky / offline connection now flips the "Loading older entries…" hint to "Couldn\'t load older entries — check your connection" after 10s instead of silently disappearing.'},
      {type:'improvement', text:'Bulk action bar z-index lifted from 1700 → 1850 so it stays above the mobile sidebar drawer + backdrop without being covered.'},
      {type:'improvement', text:'Timesheet free-hour finder ignores task entries that ended in the last 5 seconds — fixes the edge case where you click a cell at the same moment a teammate just stopped a task timer.'}
    ]
  },
  {
    version: '2.17.0',
    date:    '2026-04-29',
    title:   'Select-all on bulk select',
    notes:   'Tri-state master checkboxes plus "Select all (N)" / "Deselect all" links on every bulk action bar. Speeds up the common case of "I want to act on every visible row".',
    changes: [
      {type:'new', text:'Tasks list: master checkbox in the table header. Empty / mixed (horizontal bar) / checked (✓) — click to select or deselect every visible task at once.'},
      {type:'new', text:'Tracker entry log: per-day master checkbox in each day header. Selects only your own non-running entries for that day. Tri-state, same visual as the row checkbox.'},
      {type:'new', text:'Both bulk bars now show a "Select all (N)" link next to the count. Flips to "Deselect all" when everything is already selected.'},
      {type:'improvement', text:'All select-all helpers respect the active filter, scope, and ownership rules — they never accidentally select task entries, other users\' time, or rows outside your filter.'}
    ]
  },
  {
    version: '2.16.0',
    date:    '2026-04-29',
    title:   'Tracker — see the whole team',
    notes:   'A new "Only Me / All Team" toggle on the Tracker shows whose entries you\'re looking at. When set to All Team, every row shows an avatar + name so you can see who tracked what at a glance.',
    changes: [
      {type:'new',         text:'Scope toggle on the Tracker filter row — Only Me (default) or All Team. Persists per browser.'},
      {type:'new',         text:'In All Team scope, each entry shows the owner\'s avatar + name. Your own entries are tagged "(you)".'},
      {type:'improvement', text:'Today / This Week / Filtered totals follow the toggle — flip to All Team and the KPIs reflect the team\'s combined hours.'},
      {type:'improvement', text:'Day-grouped totals already follow scope (they sum whatever rows are visible). Day labels still group by the entry start date.'},
      {type:'improvement', text:'Other people\'s entries are read-only here — no edit / delete buttons, no bulk-select checkbox. Only your own rows can be modified, just like before.'}
    ]
  },
  {
    version: '2.15.1',
    date:    '2026-04-29',
    title:   'Inline delete on Calendar blocks',
    notes:   'Hover any tracked entry on the Logbook Calendar — a small × appears in the top-right corner. One click confirms + deletes with the standard undo toast.',
    changes: [
      {type:'new',         text:'× delete button on calendar blocks (hover for pointer / always-on for touch). Reuses the existing confirm + undo flow so you can always reverse a mistake.'},
      {type:'improvement', text:'Skipped on task-linked entries (managed via the task drawer) and currently-running entries (use Stop first). Stop and Delete corners don\'t collide — Stop sits bottom-right, Delete sits top-right.'}
    ]
  },
  {
    version: '2.15.0',
    date:    '2026-04-29',
    title:   'Bulk delete on Logbook Tracker',
    notes:   'Same multi-select pattern from Tasks v2.14, applied to the Time Tracker entry log. Tick one or more entries and a bottom action bar appears with a Delete button — all selected entries vanish at once, with a single undo toast that restores the lot.',
    changes: [
      {type:'new',         text:'Each editable entry row now has a checkbox on the left. Click to select, click again to deselect. Task-linked + currently-running rows aren\'t selectable (managed elsewhere).'},
      {type:'new',         text:'Bulk action bar slides up from the bottom with "{N} selected" + Delete + × clear. Esc clears too.'},
      {type:'new',         text:'Bulk delete uses one confirm + one undo toast — undo restores every deleted entry at once.'},
      {type:'improvement', text:'Selected rows tint with the accent color so you can scan your selection while scrolling.'},
      {type:'improvement', text:'Selection auto-clears when you switch off the Tracker panel (same MutationObserver pattern as Tasks).'}
    ]
  },
  {
    version: '2.14.0',
    date:    '2026-04-29',
    title:   'Bulk select on Tasks list',
    notes:   'The row checkbox now selects tasks for bulk editing. Tick one or more rows and a floating action bar slides up from the bottom with Status / Priority / Assignee / Due / Delete — apply the change to all selected at once.',
    changes: [
      {type:'new',         text:'Row checkbox now drives multi-select. Click to toggle a row, click again to deselect.'},
      {type:'new',         text:'Bulk action bar — fixed at the bottom, shows "{N} selected" + 5 action buttons (Status, Priority, Assignee, Due, Delete) + a × to clear. Esc also clears.'},
      {type:'new',         text:'Bulk delete uses a single undo toast — restore all the deleted tasks at once if you didn\'t mean it.'},
      {type:'improvement', text:'Selected rows get a subtle accent tint so they\'re easy to scan even when the checkbox is off-screen.'},
      {type:'improvement', text:'Selection auto-clears when you switch panels (Workflow → Logbook etc.). On phones the bar sits above the bottom nav and labels collapse to icons under 480px.'},
      {type:'change',      text:'Heads up — clicking the row checkbox no longer toggles "done". To mark a task done: open the row, click the status pill, pick Done. Or select the row and use Bulk → Status → Done.'}
    ]
  },
  {
    version: '2.13.0',
    date:    '2026-04-29',
    title:   'Workflow board upgrades — density, badges, per-column quick-add, completed section',
    notes:   'Four board / list improvements: fit more cards on screen, see card progress without opening, create cards directly into any column, and tuck completed tasks below open ones in the list.',
    changes: [
      {type:'new', text:'Card density toggle — Cozy / Compact / Roomy. Compact fits roughly 2× more cards on screen by tightening padding and hiding secondary card meta. Persists per browser.'},
      {type:'new', text:'Comment count badge on cards — paired with the existing subtask progress badge so you can see at a glance which tasks have discussion or remaining work without opening the drawer.'},
      {type:'new', text:'Per-column quick-add on the board — every column gets its own input at the bottom. Type a title + Enter and the card appears directly in that column\'s status. Removes the "create in Todo, drag to In Progress" friction.'},
      {type:'new', text:'List view splits into open + "Completed (N)" sections — done tasks tuck below open ones in the same table with strikethrough + faded styling. Click the header to collapse / expand; state persists.'}
    ]
  },
  {
    version: '2.12.0',
    date:    '2026-04-29',
    title:   'Workflow QA Round 1 — drawer, pickers, and editor fixes',
    notes:   'Eleven Tasks fixes: comment + subtask typing now survive teammate updates, drawer locks page scroll, browser back closes the drawer, due-picker arrow keys behave natively, rich-text toolbar reflects active formatting, search has a clear button, and more.',
    changes: [
      {type:'fix',         text:'Typing a comment with the @ autocomplete open no longer gets interrupted when a teammate updates the same task — the section refresh skips while the textarea is focused.'},
      {type:'fix',         text:'Same for the subtask add-input — keystrokes / inline renames are no longer clobbered by remote updates.'},
      {type:'improvement', text:'Task drawer locks page scroll while open — no more scrolling the page beneath the modal on long lists or mobile.'},
      {type:'new',         text:'Browser back button (or iOS swipe-back) closes the open task drawer — drawer is now part of the navigation stack.'},
      {type:'fix',         text:'Due-date picker — arrow keys on the date input now step the focused day/month/year segment natively instead of jumping focus to other picker buttons.'},
      {type:'improvement', text:'New-task drawer focuses the title field reliably even on slow devices (replaced a brittle 250ms timeout with double rAF).'},
      {type:'fix',         text:'Drag a card → press Esc mid-drag → no more stuck .drag-over highlights or invisible drag state. Next drag works cleanly.'},
      {type:'fix',         text:'Description blur no longer triggers a spurious Firebase write + flicker when nothing actually changed (both sides now sanitize before comparing).'},
      {type:'new',         text:'× clear button on the tasks search input + Esc-to-clear when the search is focused.'},
      {type:'new',         text:'Rich-text toolbar (Bold / Italic / Underline / lists) now shows an active state when the current selection has the format applied.'},
      {type:'improvement', text:'Task titles get a subtle dotted underline on hover so the double-click-to-rename affordance is discoverable.'}
    ]
  },
  {
    version: '2.11.0',
    date:    '2026-04-28',
    title:   'Logbook QA Round 1 — data integrity, totals, project cleanup',
    notes:   'Twelve fixes targeting Logbook\'s biggest pain points: silent session loss, mismatched totals, project-delete orphans, calendar Stop button, and more.',
    changes: [
      {type:'fix',         text:'Fixed silent data loss — sessions older than ~17 days were being dropped from views due to a 500-entry Firebase cap. Default load is now last 12 months, with on-demand fetch when you pick All Time / This Year in Reports or navigate Calendar/Timesheet further back.'},
      {type:'fix',         text:'Time Tracker "Today" and "This Week" totals now include task time entries — they were showing only global Start Work sessions before, so the KPI cards disagreed with the entry log below them.'},
      {type:'improvement', text:'Filter chips now drive a "Filtered total" card. Switching to Yesterday or Last Week or All Time updates the totals, not just the entry log.'},
      {type:'fix',         text:'Live duration math centralized into a single helper — Reports, Calendar, Tracker bar, and Dashboard now all tick in lockstep instead of drifting by a second.'},
      {type:'new',         text:'Project delete with entries now asks: "Move entries to No project" or "Delete entries too" or "Cancel". Both destructive paths show an undo toast that restores the project AND original entry assignments.'},
      {type:'fix',         text:'Manual edits no longer carry stale staged project/tags into your next Start Work — opening the edit dialog now clears any queued staging.'},
      {type:'improvement', text:'Newly-created projects + tags appear instantly in pickers (optimistic local write) — no more waiting for the Firebase round-trip.'},
      {type:'fix',         text:'Time-entry descriptions are capped at 500 characters with a soft-trim toast — prevents accidental 10MB pastes from stalling Firebase writes.'},
      {type:'improvement', text:'Time Tracker panel no longer re-renders every second when the active filter excludes the running session (e.g. filter = "Last Week"). Topbar pill keeps ticking either way.'},
      {type:'new',         text:'Stop button on running blocks in the Calendar — hover (or tap on touch) any running entry to halt the timer in place. No more bouncing back to the Tracker bar to stop.'},
      {type:'improvement', text:'Timesheet on mobile: scrollbar hidden, sticky project column gets a subtle pinned-edge shadow so it\'s clear what stays put while you scroll the days.'},
    ]
  },
  {
    version: '2.10.0',
    date:    '2026-04-26',
    title:   'Polish & accessibility sweep',
    notes:   'Big QA round: undo for destructive deletes, mobile sidebar drawer, keyboard shortcut overlay, accessibility upgrades, login branding moment, and dozens of smaller polish fixes.',
    changes: [
      {type:'new',         text:'Undo toast — deleting tasks, projects, tags, or time entries now shows a 5-second Undo. Hit Undo to restore.'},
      {type:'new',         text:'Mobile sidebar drawer — phones get a proper slide-out menu with backdrop instead of the cramped bottom-nav strip. Topbar gets a hamburger + dedicated search button.'},
      {type:'new',         text:'Keyboard shortcut overlay — press ? from anywhere to see all shortcuts (⌘K, Esc, N, navigation keys, etc.)'},
      {type:'new',         text:'"What\'s New" red dot — sidebar version pill pulses with an unread indicator until you open the changelog for the current version.'},
      {type:'new',         text:'Login screen branding moment — the four products are introduced in a side panel with colored dots, taglines, and version stamp.'},
      {type:'new',         text:'Onboarding overhaul — the welcome modal now introduces all four products (Workflow / Logbook / Cold Pitch / Territory) plus a ⌘K tip.'},
      {type:'new',         text:'Recurring task spawn banner — when a recurring task spawns its next instance, an in-modal banner with "Open" links to the new task.'},
      {type:'new',         text:'Skip-to-main-content link for keyboard users; activity feed exposes aria-live so screen readers announce new updates.'},
      {type:'improvement', text:'Inline pickers (status / priority / assignee / due / repeat) now trap keyboard focus — Tab/Arrow stays inside, Esc closes.'},
      {type:'improvement', text:'Activity feed timestamps gained absolute-time tooltips on hover — relative time at a glance, exact time on demand.'},
      {type:'improvement', text:'Workspace Dashboard "Top Overdue" rows now show priority pill + due date, not just the title.'},
      {type:'improvement', text:'Reports chart auto-buckets large date ranges (per-day → per-week → per-month) so 90+ day ranges stay readable.'},
      {type:'improvement', text:'Calendar tooltips on multi-day entries now show both the displayed slice and the full original time range.'},
      {type:'improvement', text:'Timesheet click pre-fills the first free 1-hour slot for the day instead of always 9 AM (avoids clobbering existing entries).'},
      {type:'improvement', text:'Cold Pitch palette hint specifies sequence length + owner so each industry feels distinct.'},
      {type:'improvement', text:'Toast colors standardized to a small palette (success / danger / warning / neutral / info) — no more seven shades of green.'},
      {type:'improvement', text:'Detailed Reports table converts to a card stack on phones — no more horizontal scroll on small screens.'},
      {type:'improvement', text:'Tasks modal rich-text toolbar scrolls horizontally on narrow screens instead of overflowing.'},
      {type:'improvement', text:'Empty states across the app got more specific call-to-action copy.'},
      {type:'improvement', text:'Priority pills gained a non-color glyph prefix so they\'re distinguishable in grayscale or for color-vision differences.'},
      {type:'improvement', text:'KPI numbers now wrap gracefully on narrow screens / large fonts (no more overflow).'},
      {type:'improvement', text:'Email modal cross-fade smoothed in dark mode (backdrop transitions instead of popping).'},
      {type:'improvement', text:'Inline picker placeholder reads "+ Add due date" instead of a terse "Set date".'},
      {type:'improvement', text:'Rapid Firebase updates now coalesce per-panel via rAF — multiple updates in the same frame share a single render.'},
      {type:'improvement', text:'Per-task timer ticks bail early when nothing is running (faster on busy boards).'},
      {type:'improvement', text:'Internal: js/dashboards.js renamed to js/sub-dashboards.js — no longer collides with js/dashboard.js.'},
      {type:'improvement', text:'Internal: manual-entry pre-fill API decoupled from the calendar (timesheet no longer pokes _calPendingManualEntry).'},
      {type:'improvement', text:'Icon buttons across the app gained aria-label parity with their title attribute (auto-applied via MutationObserver).'},
      {type:'improvement', text:'Modal × close buttons wrap the symbol in aria-hidden so screen readers say "Close" not "multiplication sign".'},
      {type:'fix',         text:'Removed a stray production console.log in firebase.js.'}
    ]
  },
  {
    version: '2.9.0',
    date:    '2026-04-28',
    title:   'Workspace Dashboard split out from Territory',
    notes:   'The main Dashboard is now a workspace overview pulling from all four apps. The state-tracker analytics that used to live there moved into Flowtive Territory · Dashboard — one click away in the sidebar.',
    changes: [
      {type:'new', text:'Workspace Dashboard — opens to a friendly "Welcome back, [name]" + four cross-product KPIs: Open Tasks (Workflow) · Hours This Week (Logbook) · Active Right Now · Territory Coverage %'},
      {type:'new', text:'Hours This Week chart, Weekly Activity chart (across all apps), and the Recent Activity feed live on the Workspace Dashboard'},
      {type:'new', text:'Working Now card stays on the Workspace Dashboard for quick visibility of who\'s tracking time'},
      {type:'new', text:'Flowtive Territory · Dashboard — dedicated sub-page for state-coverage analytics: leaderboard, donut, bar chart, industry progress grid, and the four state KPIs (Total Cities, States Covered, Hot Cities Done, Overall Completion)'},
      {type:'improvement', text:'Cmd+K palette adds "Flowtive Territory · Dashboard" so you can jump straight from anywhere'},
      {type:'improvement', text:'Sidebar layout reads cleaner — apps on top (Workflow, Logbook), reference tools under Resources (Cold Pitch, Territory)'}
    ]
  },
  {
    version: '2.8.0',
    date:    '2026-04-28',
    title:   'Product rebrand — Workflow · Logbook · Cold Pitch · Territory',
    notes:   'Flowtive One is the workspace; the apps inside it now have their own names. Tasks becomes Flowtive Workflow. Time Tracker becomes Flowtive Logbook. Email Templates becomes Flowtive Cold Pitch. The state-by-state lead pipeline becomes Flowtive Territory. No data changed — only labels.',
    changes: [
      {type:'new', text:'Flowtive Workflow — the team\'s task system (was Tasks)'},
      {type:'new', text:'Flowtive Logbook — record of work hours and project time (was Time Tracker)'},
      {type:'new', text:'Flowtive Cold Pitch — outreach email templates by industry (was Email Templates)'},
      {type:'new', text:'Flowtive Territory — state-by-state lead pipeline (was Team Members section)'},
      {type:'improvement', text:'Sub-items cleaned up — "Tasks Dashboard" → "Dashboard", "Tasks" → "Board" (inside Flowtive Workflow); "Time Tracker" → "Tracker" (inside Flowtive Logbook)'},
      {type:'improvement', text:'Panel titles follow the pattern Product · Sub-page (e.g. "Flowtive Logbook · Calendar")'},
      {type:'improvement', text:'Cmd+K actions are prefixed with the product name so it\'s clear which app you\'re jumping into'},
      {type:'improvement', text:'Workspace name stays Flowtive One — that\'s where you log in. The four products live inside it.'}
    ]
  },
  {
    version: '2.7.0',
    date:    '2026-04-28',
    title:   'Time Tracker · Timesheet',
    notes:   'A project × day grid for the week. Click any cell to log time on that project on that day — fastest way to fill out the week if you tracked some sessions live and need to log the rest after the fact.',
    changes: [
      {type:'new', text:'Timesheet sub-page in the Time Tracker sidebar group'},
      {type:'new', text:'Week grid — one row per project (with a "No project" row when applicable), 7 day columns + Total column'},
      {type:'new', text:'Click any cell to open the manual entry dialog pre-filled with that project + that date (default 9 AM, 1-hour block — adjust before saving)'},
      {type:'new', text:'"Add Project Row" button — pick a project to log time against without first having an entry that week'},
      {type:'new', text:'Today\'s column highlighted in mint green for quick orientation'},
      {type:'new', text:'Daily totals row + grand total cell update live as you add entries'},
      {type:'new', text:'Prev / Next / This Week navigation — flip through past weeks at a glance'},
      {type:'improvement', text:'First column is sticky on horizontal scroll so the project label stays visible on phones'}
    ]
  },
  {
    version: '2.6.0',
    date:    '2026-04-28',
    title:   'Time Tracker · Reports + CSV export',
    notes:   'Slice your tracked time across date ranges, members, projects, and tags. Three views (Summary / Detailed / Weekly), filters, a stacked bar chart, sortable tables, and one-click CSV export — ready for monthly reviews and share-outs.',
    changes: [
      {type:'new', text:'Reports page in the Time Tracker sidebar group (replaces the Coming Soon stub)'},
      {type:'new', text:'Summary view — Total / Avg per Day / Top Member / Top Project KPIs, stacked bar chart by day, grouped table with proportional bars'},
      {type:'new', text:'Detailed view — flat sortable table of every entry (description / member / project / tags / start / end / duration), sort by clicking any column header'},
      {type:'new', text:'Weekly view — group × day grid with row + column totals and prev / next / today week navigation'},
      {type:'new', text:'Filters: Member, Project, Tag, Description text search'},
      {type:'new', text:'Date range presets: Today / Yesterday / This Week / Last Week / This Month / Last Month / This Year / All Time / Custom'},
      {type:'new', text:'Group by: Project / Member / Tag / Day (Summary view)'},
      {type:'new', text:'CSV export — one click downloads the current view as a UTF-8 CSV with proper RFC 4180 escaping. Filename auto-named: flowtive-time-{view}-{from}-{to}.csv'},
      {type:'new', text:'Per-task time entries surface in Detailed view with a clickable "Task" badge that opens the parent task'},
      {type:'improvement', text:'Real-time refresh — Reports panel updates instantly when teammates log new time, edit entries, or change project / tag definitions'}
    ]
  },
  {
    version: '2.5.0',
    date:    '2026-04-28',
    title:   'Time Tracker · Projects + Tags',
    notes:   'Group time under named projects with custom colors, and tag entries with cross-project labels. Both panels are now real (Projects + Tags in the Time Tracker sidebar group). Calendar blocks borrow project colors. Tracker bar gets Project + Tags chips for quick assignment.',
    changes: [
      {type:'new', text:'Projects management page — add / rename / delete / pick color from a 12-color palette'},
      {type:'new', text:'Tags management page — add / rename / delete cross-project labels'},
      {type:'new', text:'Project chip on the Time Tracker bar — click to pick a project for the running session, or stage one for next start'},
      {type:'new', text:'Tags chip on the Time Tracker bar — multi-select picker with type-to-filter and Enter-to-create'},
      {type:'new', text:'Project + Tags fields in the manual / edit entry dialog'},
      {type:'new', text:'Project chip + tag pills appear on every entry row in the time log'},
      {type:'new', text:'Calendar blocks use the project color when one is set (member color stays as fallback)'},
      {type:'new', text:'Per-project total tracked time shown next to each project on the Projects page'},
      {type:'new', text:'Per-tag entry count shown next to each tag on the Tags page'},
      {type:'improvement', text:'Deleting a project or tag removes the reference from all sessions automatically — no orphan IDs left behind'}
    ]
  },
  {
    version: '2.4.0',
    date:    '2026-04-28',
    title:   'Time Tracker · Calendar (week + day view)',
    notes:   'Visual calendar grid for tracked time. See your week at a glance with colored blocks, click any empty slot to add an entry at that time, click a block to edit. Switch between week and day view, browse past weeks, filter by yourself or the whole team.',
    changes: [
      {type:'new', text:'Time Tracker → Calendar — Clockify-style week and day grid'},
      {type:'new', text:'Sessions render as colored blocks at their actual start/end positions, colored by member'},
      {type:'new', text:'Click an empty slot in any day column to add a manual entry at that exact time (15-minute snap)'},
      {type:'new', text:'Click a block to edit the session (or open the linked task)'},
      {type:'new', text:'Date navigation — prev / next / today, with the current day highlighted'},
      {type:'new', text:'View toggle — Week (7-day grid) or Day (single column, wider)'},
      {type:'new', text:'Filter — Only Me or All Team'},
      {type:'new', text:'Live "now" line shows the current time across the active day'},
      {type:'new', text:'Day totals shown in each column header'},
      {type:'new', text:'Running entries pulse with a green indicator'},
      {type:'improvement', text:'Manual entry dialog now respects calendar pre-fills — clicking an empty slot opens the dialog at that time'},
      {type:'improvement', text:'Mobile auto-switches to Day view (Week is too cramped on phones)'}
    ]
  },
  {
    version: '2.3.0',
    date:    '2026-04-28',
    title:   'Sidebar groups + Tasks Dashboard + Time Tracker Dashboard',
    notes:   'Sidebar restructured with collapsible Tasks and Time Tracker groups. Two new analytics pages — Tasks Dashboard (status breakdown, overdue, member workload) and Time Tracker Dashboard (weekly hours chart, top contributor, top tracked tasks). Calendar / Reports / Tags / Projects / Team are scaffolded with "Coming soon" placeholders so the navigation works while we build them out.',
    changes: [
      {type:'new', text:'Tasks group in sidebar — Tasks Dashboard + Tasks (collapsible, state remembered)'},
      {type:'new', text:'Time Tracker group in sidebar — Time Tracker / Calendar / Dashboard / Reports / Projects / Tags / Team'},
      {type:'new', text:'Tasks Dashboard sub-page: open / overdue / done-this-week KPIs, status breakdown bar, top overdue list, per-member workload table'},
      {type:'new', text:'Time Tracker Dashboard sub-page: weekly hours stacked bar chart, top contributor KPI, top tracked tasks, per-member time breakdown'},
      {type:'new', text:'"Coming soon" stub pages for Calendar, Reports, Projects, Tags, Team — each labeled with its target Phase'},
      {type:'improvement', text:'Cmd+K palette now includes the new sub-pages (Tasks Dashboard, Time Tracker Dashboard)'}
    ]
  },
  {
    version: '2.2.0',
    date:    '2026-04-28',
    title:   'Time Tracker panel — Clockify-style',
    notes:   'A dedicated Time Tracker page with a Start/Stop bar, daily and weekly totals, full session log grouped by day, plus manual entries you can edit and delete. Per-task time also shows up here so everything you tracked is in one view.',
    changes: [
      {type:'new', text:'Dedicated Time Tracker panel (sidebar → "Time Tracker")'},
      {type:'new', text:'Top tracker bar with description input + live counter + Start/Stop button'},
      {type:'new', text:'Today + This Week totals at the top of the page'},
      {type:'new', text:'Session log grouped by day with daily totals — combines global sessions and per-task time'},
      {type:'new', text:'Manual entry — add a session retroactively when you forgot to start the timer (date + start + end + description)'},
      {type:'new', text:'Edit any past session (description, start time, end time) — duration recalculates automatically'},
      {type:'new', text:'Delete past sessions with confirmation'},
      {type:'new', text:'Filter by Today / Yesterday / This Week / Last Week / All Time'},
      {type:'new', text:'Description on global Start Work sessions — type "what are you working on?" before clicking Start, or edit it while running'},
      {type:'new', text:'Badges on entries: Task (linked to a task), Manual (added retroactively), Auto (auto-closed after 16h)'},
      {type:'improvement', text:'Per-task time entries link directly to the task — click the link icon to open the task'}
    ]
  },
  {
    version: '2.1.2',
    date:    '2026-04-28',
    title:   'Dark-mode calendar icon fix',
    notes:   'The native date picker icon was rendering black in dark mode, making it invisible against dark inputs. Now inverts properly when the theme is dark.',
    changes: [
      {type:'fix', text:'Date picker calendar icon is now visible in dark mode (was rendering black against dark backgrounds)'},
      {type:'improvement', text:'Native form controls (scrollbars, autofill backgrounds, calendar pickers) globally honour the active theme via color-scheme'}
    ]
  },
  {
    version: '2.1.1',
    date:    '2026-04-28',
    title:   '@mention autocomplete',
    notes:   'Type @ in a comment and a picker now suggests team members — type a few letters to filter, ↑/↓ to navigate, Enter or Tab to insert.',
    changes: [
      {type:'new', text:'@-autocomplete in the comment box — picker shows team members as you type, filters live'},
      {type:'new', text:'Arrow keys to navigate the picker, Enter or Tab to insert, Esc to dismiss'},
      {type:'improvement', text:'Smart matching — exact match first, then "starts with", then "contains"'}
    ]
  },
  {
    version: '2.1.0',
    date:    '2026-04-28',
    title:   '@mentions + Tasks polish',
    notes:   'Mention teammates directly in task comments — they get a notification right away. Plus a focused round of polish: rich-text toolbar bug fixed, mobile-friendly buttons, smoother comment posting, and clearer feedback when switching active timers.',
    changes: [
      {type:'new', text:'@mentions in comments — type @Name to ping a teammate, they get a browser notification immediately'},
      {type:'new', text:'Mentions render as highlighted pills in the comment text'},
      {type:'fix', text:'Rich-text toolbar (B / I / U / list / link / clear) now works correctly — was silently no-op due to focus theft'},
      {type:'fix', text:'Comment delete + subtask delete buttons are always visible on mobile (no hover required)'},
      {type:'fix', text:'Comment list auto-scrolls to the latest post after submit'},
      {type:'improvement', text:'Switching active timer between tasks now shows a "Switched from X" toast so you know the previous one stopped'}
    ]
  },
  {
    version: '2.0.0',
    date:    '2026-04-27',
    title:   'Modern Flowtive One — Major Tasks Upgrade',
    notes:   'A categorical leap from v1.x. Tasks become a real workspace with rich editing, inline pickers, time tracking, recurring repeats, comments, subtasks, and a centered ClickUp-style modal. Plus Cmd+K palette and browser notifications across the app.',
    changes: [
      {type:'new', text:'Tasks panel rebuilt — list + kanban board, drag-drop between statuses'},
      {type:'new', text:'ClickUp-style centered task popup with blurred backdrop'},
      {type:'new', text:'Inline pickers on every row — click any chip (status / priority / assignee / due / repeat) to edit without opening the modal'},
      {type:'new', text:'Quick-add input — type title → Enter → task created'},
      {type:'new', text:'Filter chips with live counts (All / My Tasks / Open / Overdue / Done)'},
      {type:'new', text:'Smart sort dropdown — Smart, Newest, Oldest, Due Date, Priority, A→Z'},
      {type:'new', text:'Date grouping in list view — Overdue / Today / Tomorrow / This Week / Later / No Due / Done'},
      {type:'new', text:'Subtasks with progress badge (3/5 indicator on row + kanban card)'},
      {type:'new', text:'Comments on tasks with owner-only delete + Cmd/Ctrl+Enter to send'},
      {type:'new', text:'Rich-text descriptions — Bold, Italic, Underline, lists, links'},
      {type:'new', text:'Recurring tasks — Daily / Weekdays / Weekly / Monthly, auto-spawns next instance on completion'},
      {type:'new', text:'Per-task time tracking — Start/Stop pill on every row, modal section with per-user breakdown, 16h auto-close'},
      {type:'new', text:'Inline title edit — double-click any task title in list or kanban to rename in place'},
      {type:'new', text:'Custom delete confirmation modal (replaces native browser dialog)'},
      {type:'new', text:'Per-filter empty states with contextual messaging'},
      {type:'new', text:'Cmd+K (Ctrl+K) command palette — searches tasks, members, email industries, plus quick actions'},
      {type:'new', text:'Browser notifications — pings when assigned a task, commented on, or task you assigned was completed'},
      {type:'new', text:'Email Templates modal redesigned to match the task popup (centered, blurred, scale-in)'},
      {type:'new', text:'Email Templates per-industry header is now vertical (back button on top, title below)'},
      {type:'improvement', text:'Mint green design system inspired by Inboxkit (light + dark mode)'},
      {type:'improvement', text:'Dark mode polish — sharper contrast, cleaner translucent borders'},
      {type:'improvement', text:'Modular file structure — index.html shrunk from 6,146 lines to 264, split into 6 CSS + 18 JS files'},
      {type:'improvement', text:'Sync indicator is hidden by default — only shows during sync or errors'},
      {type:'improvement', text:'Activity feed limited to 10 most recent (no pagination clutter)'},
      {type:'improvement', text:'Start Work button moved to sidebar footer (always reachable)'},
      {type:'improvement', text:'Live OS-style date+time in topbar with seconds'},
      {type:'fix', text:'Modal close no longer blocks subsequent clicks on the page'},
      {type:'fix', text:'Esc on the modal saves in-progress title/description before closing'},
      {type:'fix', text:'Drawer auto-closes if a teammate deletes the task being viewed'},
      {type:'fix', text:'Inline picker dismisses cleanly when modal closes'},
      {type:'fix', text:'Rich-text placeholder reappears after type-then-delete'},
      {type:'fix', text:'Per-task timers auto-close after 16h (matches global Start Work safety net)'}
    ]
  },
  {
    version: '1.4.0',
    date:    '2026-04-25',
    title:   'Inboxkit Theme + Modular Split',
    notes:   'Replaced the Stripe-purple palette with Inboxkit-inspired mint green. Split the single-file app into a modular CSS + JS structure for maintainability.',
    changes: [
      {type:'new', text:'Mint green color theme (light + dark mode)'},
      {type:'improvement', text:'Code split into 6 CSS files (tokens, themes, base, layout, components, features) and 17 JS files'},
      {type:'fix', text:'Login page "Flowtive" logo visibility on dark mode'},
      {type:'fix', text:'Input focus halos removed (kept :focus-visible for keyboard accessibility)'},
      {type:'fix', text:'Topbar live clock removed (OS clock is enough)'}
    ]
  },
  {
    version: '1.3.0',
    date:    '2026-04-22',
    title:   'Design System + Dark Mode',
    notes:   'World-class app design with full dark/light mode support, smooth theme switching via the View Transitions API.',
    changes: [
      {type:'new', text:'Design tokens — light + dark theme variables'},
      {type:'new', text:'Dark / light mode toggle with smooth crossfade'},
      {type:'new', text:'Stripe-inspired gradient palette (later changed to mint)'},
      {type:'improvement', text:'Topbar redesigned with better contrast'},
      {type:'improvement', text:'Recent Activity feed bug fixes (status labels)'}
    ]
  },
  {
    version: '1.2.0',
    date:    '2026-04-18',
    title:   'Time Tracker',
    notes:   'Team time tracker so members can clock in / out and see hours logged this week.',
    changes: [
      {type:'new', text:'Start Work / Stop Work tracker per member'},
      {type:'new', text:'Hours-this-week chart on the Dashboard'},
      {type:'new', text:'On-the-Clock card showing live elapsed sessions'},
      {type:'new', text:'Sidebar live elapsed pills next to each member'}
    ]
  },
  {
    version: '1.1.0',
    date:    '2026-04-10',
    title:   'Email Templates',
    notes:   'Full email templates library — 18 industries × 4-email sequences, with copy/edit and activity logging.',
    changes: [
      {type:'new', text:'Email Templates modal with per-industry sequences'},
      {type:'new', text:'Library view with all 18 industries grouped by owner'},
      {type:'new', text:'Copy button per email (one-click to clipboard)'},
      {type:'new', text:'Edit emails inline (saved to Firebase, synced across team)'},
      {type:'new', text:'Golden Rules popup'},
      {type:'new', text:'Activity logs for email copy + edit events'}
    ]
  },
  {
    version: '1.0.0',
    date:    '2026-04-01',
    title:   'Flowtive One — Initial Release',
    notes:   'The original State Lead Tracker, renamed and rebuilt as Flowtive One. State-by-state lead progress, member assignments, notes, and a presence-aware sidebar.',
    changes: [
      {type:'new', text:'USA state lead tracker with progress per member'},
      {type:'new', text:'Status pills (To Do / In Progress / Done / Won / Closed)'},
      {type:'new', text:'Notes per state'},
      {type:'new', text:'Member sidebar with online indicator'},
      {type:'new', text:'Login screen + session persistence'},
      {type:'new', text:'Real-time Firebase sync across the team'},
      {type:'new', text:'Recent Activity feed on the Dashboard'}
    ]
  }
];

var TEAM_ACCOUNTS = [
  {email:'theemon.me@gmail.com',    name:'Emran'},
  {email:'miltonsarkar333111@gmail.com',   name:'Milton'},
  {email:'deepeffect6@gmail.com',   name:'Mugdho'},
  {email:'gowithashik@gmail.com',    name:'Ashik'},
  {email:'sadmanhasan680@gmail.com',   name:'Sadman'},
  {email:'rafikriyan07@gmail.com',    name:'Rafik'},
];

var currentUser = null;

var US_STATES=["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

var STATE_ABBREV={
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO",
  "Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ",
  "New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH",
  "Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"
};

var STATE_CITIES={
  "Alabama":["Montgomery","Birmingham","Huntsville","Mobile","Tuscaloosa","Hoover","Dothan","Auburn","Decatur","Madison","Florence","Gadsden","Vestavia Hills","Prattville","Phenix City","Alabaster","Bessemer","Enterprise","Opelika","Homewood"],
  "Alaska":["Anchorage","Fairbanks","Juneau","Sitka","Ketchikan","Wasilla","Kenai","Kodiak","Bethel","Palmer","Homer","Unalaska","Barrow","Soldotna","Valdez","Nome","Kotzebue","Seward","Wrangell","Petersburg"],
  "Arizona":["Phoenix","Tucson","Mesa","Chandler","Scottsdale","Tempe","Gilbert","Glendale","Peoria","Surprise","Yuma","Avondale","Flagstaff","Goodyear","Lake Havasu City","Buckeye","Casa Grande","Sierra Vista","Maricopa","Oro Valley"],
  "Arkansas":["Little Rock","Fort Smith","Fayetteville","Springdale","Jonesboro","North Little Rock","Conway","Rogers","Pine Bluff","Bentonville","Hot Springs","Benton","Texarkana","Sherwood","Jacksonville","Russellville","Bella Vista","West Memphis","Paragould","Cabot"],
  "California":["Los Angeles","San Diego","San Jose","San Francisco","Fresno","Sacramento","Long Beach","Oakland","Bakersfield","Anaheim","Santa Ana","Riverside","Stockton","Irvine","Chula Vista","Fremont","San Bernardino","Modesto","Fontana","Moreno Valley","Glendale","Huntington Beach","Santa Clarita","Garden Grove","Oceanside","Rancho Cucamonga","Santa Rosa","Ontario","Elk Grove","Corona"],
  "Colorado":["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Thornton","Arvada","Westminster","Pueblo","Centennial","Boulder","Highlands Ranch","Greeley","Longmont","Loveland","Broomfield","Castle Rock","Commerce City","Parker","Northglenn"],
  "Connecticut":["Bridgeport","New Haven","Stamford","Hartford","Waterbury","Norwalk","Danbury","New Britain","West Hartford","Greenwich","Hamden","Bristol","Meriden","Manchester","West Haven","Milford","Stratford","East Hartford","Middletown","Shelton"],
  "Delaware":["Wilmington","Dover","Newark","Middletown","Smyrna","Milford","Seaford","Georgetown","Elsmere","New Castle","Millsboro","Laurel","Harrington","Camden","Clayton","Lewes","Milton","Selbyville","Bridgeville","Townsend"],
  "Florida":["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Tallahassee","Fort Lauderdale","Port St. Lucie","Cape Coral","Pembroke Pines","Hollywood","Miramar","Gainesville","Coral Springs","Clearwater","Miami Gardens","Pompano Beach","West Palm Beach","Lakeland","Davie","Boca Raton","Deltona","Plantation","Sunrise","Palm Bay","Largo","Melbourne","Deerfield Beach","Boynton Beach"],
  "Georgia":["Atlanta","Augusta","Columbus","Macon","Savannah","Athens","Sandy Springs","Roswell","Johns Creek","Albany","Warner Robins","Alpharetta","Marietta","Valdosta","Smyrna","Dunwoody","Rome","East Point","Peachtree City","Milton"],
  "Hawaii":["Honolulu","Pearl City","Hilo","Kailua","Waipahu","Kaneohe","Mililani Town","Kahului","Kihei","Kailua-Kona","Wailuku","Kapaa","Wahiawa","Waimalu","Nanakuli","Ewa Gentry","Halawa","Makakilo","Schofield Barracks","Lahaina"],
  "Idaho":["Boise","Nampa","Meridian","Idaho Falls","Pocatello","Caldwell","Coeur d'Alene","Twin Falls","Lewiston","Post Falls","Rexburg","Moscow","Eagle","Kuna","Ammon","Chubbuck","Hayden","Mountain Home","Blackfoot","Garden City"],
  "Illinois":["Chicago","Aurora","Joliet","Naperville","Rockford","Springfield","Elgin","Peoria","Champaign","Waukegan","Cicero","Bloomington","Arlington Heights","Evanston","Decatur","Schaumburg","Bolingbrook","Palatine","Skokie","Des Plaines","Orland Park","Tinley Park","Oak Lawn","Berwyn","Mount Prospect"],
  "Indiana":["Indianapolis","Fort Wayne","Evansville","South Bend","Carmel","Fishers","Bloomington","Hammond","Gary","Lafayette","Muncie","Terre Haute","Kokomo","Anderson","Noblesville","Greenwood","Elkhart","Mishawaka","Lawrence","Jeffersonville"],
  "Iowa":["Des Moines","Cedar Rapids","Davenport","Sioux City","Iowa City","Waterloo","Council Bluffs","Ames","West Des Moines","Dubuque","Ankeny","Urbandale","Cedar Falls","Marion","Bettendorf","Mason City","Marshalltown","Clinton","Burlington","Ottumwa"],
  "Kansas":["Wichita","Overland Park","Kansas City","Olathe","Topeka","Lawrence","Shawnee","Manhattan","Lenexa","Salina","Hutchinson","Leavenworth","Leawood","Dodge City","Garden City","Emporia","Derby","Prairie Village","Liberal","Junction City"],
  "Kentucky":["Louisville","Lexington","Bowling Green","Owensboro","Covington","Richmond","Georgetown","Florence","Elizabethtown","Henderson","Nicholasville","Jeffersontown","Frankfort","Paducah","Hopkinsville","Independence","Radcliff","Ashland","Madisonville","Murray"],
  "Louisiana":["New Orleans","Baton Rouge","Shreveport","Lafayette","Lake Charles","Kenner","Bossier City","Monroe","Alexandria","Metairie","New Iberia","Hammond","Slidell","Natchitoches","Houma","Central","Laplace","Ruston","Prairieville","Bayou Cane"],
  "Maine":["Portland","Lewiston","Bangor","South Portland","Auburn","Biddeford","Sanford","Augusta","Saco","Westbrook","Waterville","Brewer","Presque Isle","Bath","Caribou","Ellsworth","Old Town","Rockland","Belfast","Gardiner"],
  "Maryland":["Baltimore","Columbia","Germantown","Silver Spring","Waldorf","Glen Burnie","Ellicott City","Frederick","Dundalk","Rockville","Gaithersburg","Bethesda","Towson","Bowie","Aspen Hill","Wheaton","Bel Air","Annapolis","Hagerstown","College Park"],
  "Massachusetts":["Boston","Worcester","Springfield","Cambridge","Lowell","Brockton","New Bedford","Quincy","Lynn","Fall River","Newton","Somerville","Lawrence","Framingham","Haverhill","Waltham","Malden","Brookline","Plymouth","Taunton","Medford","Chicopee","Weymouth","Revere","Peabody"],
  "Michigan":["Detroit","Grand Rapids","Warren","Sterling Heights","Ann Arbor","Lansing","Flint","Dearborn","Livonia","Westland","Troy","Farmington Hills","Kalamazoo","Wyoming","Southfield","Rochester Hills","Taylor","Pontiac","St. Clair Shores","Royal Oak","Novi","Dearborn Heights","Battle Creek","Saginaw","Kentwood"],
  "Minnesota":["Minneapolis","Saint Paul","Rochester","Duluth","Bloomington","Brooklyn Park","Plymouth","Saint Cloud","Eagan","Woodbury","Coon Rapids","Eden Prairie","Burnsville","Blaine","Lakeville","Minnetonka","Apple Valley","Edina","St. Louis Park","Mankato","Moorhead","Shakopee","Maplewood","Cottage Grove","Richfield"],
  "Mississippi":["Jackson","Gulfport","Southaven","Hattiesburg","Biloxi","Meridian","Tupelo","Olive Branch","Greenville","Horn Lake","Pearl","Vicksburg","Brandon","Madison","Ridgeland","Clinton","Starkville","Columbus","Gautier","Laurel"],
  "Missouri":["Kansas City","St. Louis","Springfield","Columbia","Independence","Lee's Summit","O'Fallon","St. Joseph","St. Charles","Blue Springs","Joplin","Chesterfield","Jefferson City","Cape Girardeau","Florissant","St. Peters","Wentzville","University City","Ballwin","Kirkwood"],
  "Montana":["Billings","Missoula","Great Falls","Bozeman","Butte","Helena","Kalispell","Havre","Anaconda","Miles City","Belgrade","Livingston","Laurel","Whitefish","Lewistown","Sidney","Glendive","Hamilton","Polson","Cut Bank"],
  "Nebraska":["Omaha","Lincoln","Bellevue","Grand Island","Kearney","Fremont","Hastings","Norfolk","Columbus","North Platte","Papillion","La Vista","Scottsbluff","South Sioux City","Beatrice","Lexington","Gering","Alliance","York","Blair"],
  "Nevada":["Las Vegas","Henderson","Reno","North Las Vegas","Sparks","Carson City","Fernley","Elko","Mesquite","Boulder City","Fallon","Winnemucca","West Wendover","Ely","Yerington","Lovelock","Wells","Caliente","Carlin","Hawthorne"],
  "New Hampshire":["Manchester","Nashua","Concord","Derry","Dover","Rochester","Salem","Merrimack","Hudson","Londonderry","Keene","Bedford","Portsmouth","Goffstown","Laconia","Hampton","Milford","Durham","Exeter","Windham"],
  "New Jersey":["Newark","Jersey City","Paterson","Elizabeth","Edison","Woodbridge","Lakewood","Toms River","Hamilton","Trenton","Clifton","Camden","Brick","Cherry Hill","Passaic","Middletown","Union City","Old Bridge","East Orange","Bayonne","Franklin Township","North Bergen","Vineland","Union Township","Gloucester Township"],
  "New Mexico":["Albuquerque","Las Cruces","Rio Rancho","Santa Fe","Roswell","Farmington","Clovis","Hobbs","Alamogordo","Carlsbad","Gallup","Taos","Portales","Los Lunas","Artesia","Lovington","Silver City","Espanola","Anthony","Bernalillo"],
  "New York":["New York City","Buffalo","Rochester","Yonkers","Syracuse","Albany","New Rochelle","Mount Vernon","Schenectady","Utica","White Plains","Hempstead","Troy","Niagara Falls","Binghamton","Freeport","Valley Stream","Long Beach","Spring Valley","Rome","Ithaca","Poughkeepsie","Cheektowaga","Brookhaven","Amherst"],
  "North Carolina":["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem","Fayetteville","Cary","Wilmington","High Point","Concord","Asheville","Gastonia","Jacksonville","Chapel Hill","Rocky Mount","Huntersville","Apex","Burlington","Kannapolis","Wilson","Greenville","Hickory","Monroe","Mooresville","Salisbury"],
  "North Dakota":["Fargo","Bismarck","Grand Forks","Minot","West Fargo","Williston","Dickinson","Mandan","Jamestown","Wahpeton","Devils Lake","Valley City","Grafton","Lincoln","Beulah","Rugby","Watford City","Bottineau","Hazen","Lisbon"],
  "Ohio":["Columbus","Cleveland","Cincinnati","Toledo","Akron","Dayton","Parma","Canton","Youngstown","Lorain","Hamilton","Springfield","Kettering","Elyria","Lakewood","Cuyahoga Falls","Euclid","Middletown","Mansfield","Newark","Mentor","Cleveland Heights","Beavercreek","Strongsville","Dublin"],
  "Oklahoma":["Oklahoma City","Tulsa","Norman","Broken Arrow","Edmond","Lawton","Moore","Midwest City","Enid","Stillwater","Owasso","Bartlesville","Muskogee","Shawnee","Jenks","Bixby","Ardmore","Ponca City","Yukon","Duncan"],
  "Oregon":["Portland","Salem","Eugene","Gresham","Hillsboro","Beaverton","Bend","Medford","Springfield","Corvallis","Albany","Tigard","Lake Oswego","Keizer","Grants Pass","Oregon City","McMinnville","Redmond","Tualatin","West Linn"],
  "Pennsylvania":["Philadelphia","Pittsburgh","Allentown","Erie","Reading","Scranton","Bethlehem","Lancaster","Harrisburg","Altoona","York","State College","Wilkes-Barre","Chester","Easton","Hazleton","Lebanon","Norristown","Williamsport","McKeesport"],
  "Rhode Island":["Providence","Cranston","Warwick","Pawtucket","East Providence","Woonsocket","Coventry","North Providence","Cumberland","West Warwick","Johnston","North Kingstown","South Kingstown","Newport","Bristol","Westerly","Central Falls","Smithfield","Lincoln","Barrington"],
  "South Carolina":["Columbia","Charleston","North Charleston","Mount Pleasant","Rock Hill","Greenville","Summerville","Goose Creek","Hilton Head Island","Sumter","Florence","Spartanburg","Myrtle Beach","Aiken","Anderson","Greer","Mauldin","Simpsonville","Conway","Lexington"],
  "South Dakota":["Sioux Falls","Rapid City","Aberdeen","Brookings","Watertown","Mitchell","Yankton","Pierre","Huron","Spearfish","Vermillion","Brandon","Box Elder","Sturgis","Madison","Dell Rapids","Tea","Harrisburg","Hot Springs","Lead"],
  "Tennessee":["Nashville","Memphis","Knoxville","Chattanooga","Clarksville","Murfreesboro","Franklin","Jackson","Johnson City","Bartlett","Hendersonville","Kingsport","Collierville","Smyrna","Cleveland","Brentwood","Germantown","Columbia","Spring Hill","La Vergne"],
  "Texas":["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington","Corpus Christi","Plano","Laredo","Lubbock","Irving","Garland","Frisco","McKinney","Amarillo","Grand Prairie","Brownsville","Killeen","Pasadena","Mesquite","McAllen","Midland","Denton","Waco","Carrollton","Beaumont","Abilene","Odessa","Round Rock"],
  "Utah":["Salt Lake City","West Valley City","Provo","West Jordan","Orem","Sandy","Ogden","St. George","Layton","South Jordan","Lehi","Millcreek","Taylorsville","Logan","Murray","Draper","Bountiful","Riverton","Herriman","Spanish Fork"],
  "Vermont":["Burlington","South Burlington","Rutland","Barre","Montpelier","Winooski","St. Albans","Newport","Vergennes","Middlebury","Springfield","Brattleboro","Bennington","St. Johnsbury","Morrisville","Essex Junction","Swanton","Johnson","Lyndonville","White River Junction"],
  "Virginia":["Virginia Beach","Norfolk","Chesapeake","Richmond","Arlington","Newport News","Alexandria","Hampton","Roanoke","Portsmouth","Suffolk","Lynchburg","Harrisonburg","Charlottesville","Fredericksburg","Danville","Manassas","Petersburg","Leesburg","Blacksburg"],
  "Washington":["Seattle","Spokane","Tacoma","Vancouver","Bellevue","Kent","Everett","Renton","Kirkland","Spokane Valley","Bellingham","Kennewick","Federal Way","Yakima","Redmond","Marysville","Pasco","South Hill","Shoreline","Richland"],
  "West Virginia":["Charleston","Huntington","Morgantown","Parkersburg","Wheeling","Weirton","Fairmont","Martinsburg","Beckley","Clarksburg","South Charleston","St. Albans","Vienna","Bluefield","Moundsville","Bridgeport","Oak Hill","Dunbar","Elkins","Princeton"],
  "Wisconsin":["Milwaukee","Madison","Green Bay","Kenosha","Racine","Appleton","Waukesha","Oshkosh","Eau Claire","Janesville","West Allis","La Crosse","Sheboygan","Wauwatosa","Fond du Lac","New Berlin","Wausau","Brookfield","Greenfield","Beloit"],
  "Wyoming":["Cheyenne","Casper","Laramie","Gillette","Rock Springs","Sheridan","Green River","Evanston","Riverton","Jackson","Cody","Rawlins","Lander","Torrington","Powell","Douglas","Worland","Buffalo","Wheatland","Thermopolis"]
};

var IND_STATE_PRIORITY={
  "Agency":{P1:["New York","California","Illinois","Texas","Florida"],P2:["Washington","Georgia","Massachusetts","Colorado","North Carolina","Virginia","Arizona","Michigan","Minnesota","Oregon"]},
  "Law Firms":{P1:["New York","California","Texas","Illinois","Florida","Massachusetts","Virginia"],P2:["Georgia","Pennsylvania","Ohio","Michigan","New Jersey","North Carolina","Arizona","Colorado","Maryland","Washington"]},
  "Consulting":{P1:["New York","Illinois","California","Massachusetts","Virginia"],P2:["Texas","Georgia","Washington","Florida","Pennsylvania","New Jersey","Maryland","Colorado","North Carolina","Ohio"]},
  "SaaS":{P1:["California","New York","Texas","Washington","Massachusetts"],P2:["Colorado","Georgia","Illinois","Florida","Virginia","North Carolina","Michigan","Oregon","Utah","Arizona"]},
  "Startup":{P1:["California","New York","Texas","Florida","Massachusetts"],P2:["Colorado","Washington","Georgia","Illinois","Virginia","North Carolina","Arizona","Nevada","Oregon","Michigan"]},
  "Restaurant & Food":{P1:["New York","California","Illinois","Florida","Texas"],P2:["Georgia","Nevada","Tennessee","Louisiana","Massachusetts","Washington","Colorado","Pennsylvania","Virginia","North Carolina"]},
  "Real Estate":{P1:["New York","California","Florida","Texas","Georgia"],P2:["Arizona","Nevada","Colorado","Washington","North Carolina","Illinois","Virginia","Pennsylvania","Tennessee","Michigan"]},
  "Travel & Tourism":{P1:["Florida","Nevada","New York","California","Hawaii"],P2:["Colorado","Tennessee","Texas","Arizona","Louisiana","Illinois","Georgia","Washington","Massachusetts","Virginia"]},
  "Architecture & Interior":{P1:["New York","California","Florida","Illinois","Texas"],P2:["Washington","Massachusetts","Georgia","Colorado","Virginia","Arizona","Nevada","Pennsylvania","North Carolina","Michigan"]},
  "Tech & IT Services":{P1:["California","New York","Washington","Texas","Massachusetts"],P2:["Virginia","Colorado","Georgia","Illinois","Florida","North Carolina","Michigan","Arizona","Oregon","Pennsylvania"]},
  "Photography & Creative":{P1:["New York","California","Illinois","Texas","Florida"],P2:["Tennessee","Georgia","Colorado","Washington","Oregon","Massachusetts","Nevada","Virginia","North Carolina","Arizona"]},
  "Beauty & Wellness":{P1:["California","New York","Florida","Texas","Georgia"],P2:["Arizona","Nevada","Colorado","Tennessee","Illinois","Virginia","North Carolina","Washington","Massachusetts","Michigan"]},
  "Healthcare":{P1:["New York","California","Texas","Florida","Massachusetts"],P2:["Illinois","Pennsylvania","Georgia","Ohio","North Carolina","Michigan","Virginia","Washington","Minnesota","Maryland"]},
  "Dental & Cosmetic":{P1:["New York","California","Florida","Texas","Illinois"],P2:["Georgia","Arizona","Nevada","Colorado","Virginia","North Carolina","Tennessee","Washington","Massachusetts","Michigan"]},
  "Hospitality & Hotels":{P1:["Nevada","Florida","New York","California","Tennessee"],P2:["Texas","Illinois","Georgia","Louisiana","Colorado","Arizona","Virginia","Massachusetts","Washington","South Carolina"]},
  "Marketing & Advertising":{P1:["New York","California","Illinois","Texas","Georgia"],P2:["Florida","Washington","Massachusetts","Colorado","Virginia","North Carolina","Michigan","Pennsylvania","New Jersey","Arizona"]},
  "Finance & Accounting":{P1:["New York","Illinois","California","Massachusetts","North Carolina"],P2:["Texas","Florida","Connecticut","Virginia","Georgia","Pennsylvania","New Jersey","Ohio","Colorado","Maryland"]},
  "Fitness & Gym":{P1:["California","New York","Florida","Texas","Colorado"],P2:["Georgia","Illinois","Arizona","Nevada","Tennessee","Washington","North Carolina","Massachusetts","Virginia","Michigan"]},
};

var WHY={
  "Agency":{"California":"Silicon Valley and LA agencies","New York":"Madison Ave and NYC digital agencies","Illinois":"Chicago Fortune 500 market","Texas":"Austin and Dallas growing","Florida":"Miami creative agencies"},
  "Law Firms":{"New York":"BigLaw capital of the world","California":"Tech IP and entertainment law","Texas":"Energy and corporate law","Illinois":"Chicago commercial hub","Florida":"Miami international firms"},
  "Consulting":{"New York":"MBB and Big 4 HQs","Illinois":"McKinsey founding city","California":"Tech strategy consulting","Massachusetts":"Bain HQ","Virginia":"Government consulting"},
  "SaaS":{"California":"Global SaaS capital","New York":"Enterprise SaaS market","Texas":"Austin booming hub","Washington":"Amazon and Microsoft ecosystem","Massachusetts":"B2B SaaS and fintech"},
  "Startup":{"California":"Highest funded startup density","New York":"Second largest ecosystem","Texas":"Austin magnetic for founders","Florida":"Miami emerging hub","Massachusetts":"Boston deep tech"},
  "Restaurant & Food":{"New York":"World-class dining","California":"Celebrity chef culture","Illinois":"Chicago food scene","Florida":"Miami luxury dining","Texas":"Houston diverse culinary"},
  "Real Estate":{"New York":"Largest US market","California":"LA and SF luxury","Florida":"Miami booming luxury","Texas":"Dallas and Houston","Georgia":"Atlanta fastest growing"},
  "Travel & Tourism":{"Florida":"Top US destination","Nevada":"Las Vegas hospitality capital","New York":"Top city tourism","California":"LA, SF and wine country","Hawaii":"World-class island destination"},
  "Architecture & Interior":{"New York":"Design capital","California":"Hollywood luxury","Florida":"Miami luxury condo design","Illinois":"Chicago architectural heritage","Texas":"Dallas and Houston luxury"},
  "Tech & IT Services":{"California":"Silicon Valley epicenter","New York":"Enterprise IT","Washington":"Amazon and Microsoft HQ","Texas":"Austin fast-growing","Massachusetts":"Boston biotech and IT"},
  "Photography & Creative":{"New York":"Fashion and commercial capital","California":"Entertainment and film","Illinois":"Chicago commercial","Texas":"Dallas and Austin creative","Florida":"Miami luxury lifestyle"},
  "Beauty & Wellness":{"California":"LA wellness capital","New York":"Luxury beauty market","Florida":"Miami medical aesthetics","Texas":"Dallas med spa surge","Georgia":"Atlanta growing market"},
  "Healthcare":{"New York":"Largest US private market","California":"LA private clinics","Texas":"Houston Texas Medical Center","Florida":"Miami and Orlando clinics","Massachusetts":"Boston world-renowned hospitals"},
  "Dental & Cosmetic":{"New York":"Cosmetic dentistry capital","California":"Hollywood smile culture","Florida":"Miami dental tourism","Texas":"Dallas fast-growing","Illinois":"Chicago large market"},
  "Hospitality & Hotels":{"Nevada":"Las Vegas hospitality capital","Florida":"Miami and Orlando luxury","New York":"Boutique hotel boom","California":"LA luxury hotels","Tennessee":"Nashville fastest growing"},
  "Marketing & Advertising":{"New York":"Madison Avenue capital","California":"LA entertainment marketing","Illinois":"Chicago third largest ad market","Texas":"Dallas and Austin","Georgia":"Atlanta Coca-Cola culture"},
  "Finance & Accounting":{"New York":"Wall Street global capital","Illinois":"Chicago futures hub","California":"San Francisco fintech","Massachusetts":"Boston wealth management","North Carolina":"Charlotte Bank of America HQ"},
  "Fitness & Gym":{"California":"LA fitness and wellness capital","New York":"Boutique fitness boom","Florida":"Miami beach culture","Texas":"Dallas and Austin health culture","Colorado":"Denver outdoor fitness"},
};

var MEMBERS=[
  {name:"Emran",  color:"#10B981",inds:["Agency","Law Firms","Consulting"]},
  {name:"Milton", color:"#2980B9",inds:["SaaS","Startup","Restaurant & Food"]},
  {name:"Mugdho", color:"#8E44AD",inds:["Marketing & Advertising","Finance & Accounting","Fitness & Gym"]},
  {name:"Ashik",  color:"#E67E22",inds:["Tech & IT Services","Photography & Creative","Beauty & Wellness"]},
  {name:"Sadman", color:"#E74C3C",inds:["Healthcare","Dental & Cosmetic","Hospitality & Hotels"]},
  {name:"Rafik",  color:"#03A9F4",inds:["Real Estate","Travel & Tourism","Architecture & Interior"]},
];

var ALL_INDUSTRIES = MEMBERS.reduce(function(a,m){return a.concat(m.inds);},[]);
var doneData={};
var charts={};
var appInitialized = false;

/* ── Firebase config ─────────────────────────────────────────────
   SETUP INSTRUCTIONS (2 min):
   1. Go to https://console.firebase.google.com
   2. Create a new project (e.g. "flowtive-leads")
   3. Add a Web app, copy the firebaseConfig object
   4. Go to Build → Realtime Database → Create database → Start in test mode
   5. Replace the values below with your own config

   ⚠️  SECURITY — IMPORTANT (Fix 1):
   This file is shared with the team so the Firebase config is visible to
   anyone who opens it. The API key alone is NOT enough to lock down your
   database — you MUST replace the default "test mode" rules with these:

   Go to: Firebase Console → Realtime Database → Rules → paste this:

   {
     "rules": {
       ".read":  "auth == null",
       ".write": "auth == null",
       "flowtive_progress": { ".read": true, ".write": true },
       "flowtive_status":   { ".read": true, ".write": true },
       "flowtive_notes":    { ".read": true, ".write": true },
       "flowtive_activity": { ".read": true, ".write": true },
       "flowtive_avatars":  { ".read": true, ".write": true },
       "flowtive_presence": { ".read": true, ".write": true },
       "flowtive_email_templates": { ".read": true, ".write": true }
     }
   }

   This restricts access to only the paths this app actually uses.
   The default test-mode rule grants full read/write to the ENTIRE database
   to anyone on the internet until it expires.
   ─────────────────────────────────────────────────────────────── */
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCiNEOVvnGoU7c9UH57tog-VP8YgICLRpM",
  authDomain:        "flowtive-leads.firebaseapp.com",
  databaseURL:       "https://flowtive-leads-default-rtdb.firebaseio.com",
  projectId:         "flowtive-leads",
  storageBucket:     "flowtive-leads.firebasestorage.app",
  messagingSenderId: "883655434217",
  appId:             "1:883655434217:web:3f47c12f7414902d14f578",
  measurementId:     "G-D3Q55SQBPT"
};

var firebaseApp = null;
var firebaseDb  = null;
var firebaseReady = false;


/* ── Data stores ── */
var notesData = {};
var claimsData = {};
var statusData = {};
var activityLog = [];   // local cache, synced from Firebase
var _noteContext = null;
var _activityListener = null;

/* saveExtras() lives in firebase.js — this used to be a duplicate copy */

