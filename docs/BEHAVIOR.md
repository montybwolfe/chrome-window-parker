# Behavior and recovery

## How it behaves

- A focused window is never parked. Sustained focus counts as use; leaving a window after that updates its inactivity clock. Brief visits below the dwell threshold do not postpone parking or wake parked real tabs.
- Selecting a real tab or navigating an active tab counts as meaningful activity. No mouse/keyboard monitoring or page-content inspection is used. A selected real tab reloads naturally under Chrome.
- Parking creates an unpinned, ungrouped tab at the end when needed. After restoration confirms a real tab is active, the extension removes its own inactive parking page. A later cycle creates a new one. Existing tabs keep their relative order, URLs, pinned state and groups. There are no calls to move, close, resize, focus, merge or recreate windows, nor to move or close real tabs.
- If the active real tab is protected, the entire window is skipped and retried after at least a minute. It is not hidden behind a parking page. Chrome Window Parker does not activate or discard protected background tabs. Chrome manages their memory independently.
- One scheduler alarm targets the next inactive window deadline. Chrome may run it late. Protected windows retry at most once per minute; there is no one-second polling and no keepalive loop.
- A two-second dwell uses a short worker timer plus a recovery alarm. The normal worker idle timeout exceeds the maximum configurable dwell (20 seconds). If the worker is interrupted, the next worker restarts a full dwell; it never assumes an old partial dwell proves focus. A timer delayed by over 1.5 seconds beyond its deadline also restarts the dwell, preventing sleep time from counting as attentive use. Restoration can therefore be later than the selected duration.
- If focus changes during a parking pass, remaining work is cancelled. Operations re-read the live window and each tab before mutation. Browser checks and mutations are not one atomic operation; another extension or a last-instant user action can race them. The code still never asks Chrome to focus a window.
- The parking page loads only packaged files. No site favicon is fetched. The page displays the saved previous title and current sleeping-tab count. Its document title is “Parked · previous tab title”, read from that parking cycle's saved record. Counts refresh on relevant tab events while the page is open, with short burst coalescing and no background polling.
- A window with one real tab works normally. Automatic restoration leaves a parking-only window open; the explicit Clear parked tabs action first creates a blank tab in that window. A missing previous tab falls back to a real tab near its saved index.
- Incognito is explicitly unsupported and disabled in the manifest. Popup/app/devtools windows are ignored. Split-view tabs are excluded where Chrome exposes their split-view ID.

## Safety and exclusions

The default checks protect audio-playing tabs, pinned tabs, tabs with `autoDiscardable` false or unknown, navigating/loading tabs, discarded tabs, individual exclusions, URL exclusions, and all non-HTTP(S) URLs. Built-in default exclusions cover `meet.google.com`, `zoom.us`, `teams.microsoft.com`, and `music.youtube.com`; this is not a comprehensive list of communication or media sites.

Domain rules match the exact domain plus subdomains (never lookalikes such as `mail.google.com.evil.example`). Full URL globs are anchored, case-sensitive, and support only `*` as a wildcard. Examples:

```text
mail.google.com
calendar.google.com
music.youtube.com
https://example.com/work/*
*://example.org/private/*
```

Use the popup to protect the current tab, or the settings page to select individual tabs. These exclusions follow that tab through navigation but last only for the current browser session. Chrome restart, extension update/reload, or disabling/re-enabling can clear session storage; use domains for persistent protection. The extension does not change Chrome's own Memory Saver exclusions or other extensions' behavior.

**Capture/video/devtools limitation:** The Tabs API does not provide reliable flags for microphone/camera/screen capture, silent video, Picture-in-Picture, attached developer tools, dirty forms or uploads. In Discard immediately mode, explicit `tabs.discard(tabId)` is not equivalent to asking Memory Saver to select a safe candidate; do not assume automatic browser heuristics protect these conditions. `autoDiscardable: true` is not proof of safety. Use explicit exclusion, pinning or pause for these activities. In Chrome-managed mode, use Chrome's always-active site list too when a site must stay loaded.

**Downloads:** The downloads permission is used only to query whether *any* download is in progress. Chrome's DownloadItem has no reliable source tab ID, so all parking/discarding pauses while any download is active (including a paused but unfinished download). A failed query also pauses parking. File transfers implemented inside a page are not necessarily Chrome downloads; exclude their tabs. Finished/interrupted downloads no longer block the next pass. A download starting between the last check and the discard call remains an unavoidable API race.

Native discarding retains the tab, navigation history and Chrome-managed tab metadata, but unloads the page's JavaScript and may lose unsaved application state. Exclude important editing tabs.

## Chrome Memory Saver and statistics

Keep Memory Saver enabled at your preferred level. Chrome Window Parker does not read, change or override that setting, Chrome's Memory Saver allowlist, or any tab's `autoDiscardable` flag. **Let Chrome decide** is the default for new installs and upgrades: after selecting the parking page, the extension returns without calling `tabs.discard()`. The former selected tab becomes a background tab, and Chrome decides whether and when to unload it. Parking itself does not guarantee a memory reduction.

**Discard immediately** takes a snapshot of the real tab IDs once parking has completed, then requests discard of every currently loaded eligible candidate in that window. It checks each tab independently, including loaded background tabs and tabs reloaded since an earlier cycle. One protected tab does not block safe neighbors. An ineligible selected tab still prevents parking the whole window.

Before each request, the engine checks live tab/window membership, eligibility, active parking-page ownership and focus. Real-tab selections, focus changes, settings/protection/clear requests and new downloads invalidate pending work. Moving, closing or making a candidate ineligible skips that candidate; normal Chrome refusals do not block others. Newly created tabs are outside the snapshot. Unexpected API failures still surface.

A gap over five seconds between validation checkpoints, or a backwards clock jump, abandons the remaining batch. This includes sleep and unusually slow API responses. Batch IDs and continuations are never persisted or replayed on worker restart. An interrupted window can remain partly loaded until its next parking cycle. Chrome does not provide an atomic conditional-discard API; a last-instant browser change after validation can still race a request.

In immediate mode, before discarding, Chrome Window Parker re-reads the current tab and skips `discarded: true`. If the selected real tab is already sleeping before parking begins, the window is left untouched. If Chrome wins a concurrent discard race, Chrome Window Parker re-reads state and accepts the result without retrying, activating or reloading the tab. An independent `discarded` update never triggers restoration. Returning after dwell activates only the saved tab (or the documented missing-tab fallback); sleeping neighbors remain asleep.

The popup's **Clear parked tabs** action finds actual parking-page URLs, including inactive leftovers. It works while automation is paused, leaves the setting unchanged, restores at most one real tab in each affected window and starts a fresh inactivity interval. It never initiates discards: loaded neighbors stay loaded and discarded neighbors stay discarded. If a successfully activated target disappears before cleanup is confirmed, the operation leaves the parking page for a later attempt rather than waking a second target. It never requests window focus or relocation. If a window has no real tabs, it creates an inactive `about:blank` tab in that same window, confirms a real tab is active, then removes its own pages one at a time. A blank-tab creation event checks only its own window, so Clear cannot indirectly trigger a discard in another overdue window; ordinary inactivity alarms continue normally. A user-selected real tab takes priority over a remembered target. Unavailable or busy tabs do not prevent other windows from being processed; the popup reports any pages still open.

The popup reports **Parked windows** and **Sleeping tabs** across regular, non-incognito windows. Sleeping tabs are the current real tabs with Chrome's `discarded` flag, including tabs discarded by Chrome, Chrome Window Parker or another extension. Parking pages themselves are excluded. A window can have zero parking activity and several sleeping tabs: that is normal. No discard provenance or cumulative savings are claimed, tracked or persisted. A separate provenance marker would not improve eligibility or restoration: live Chrome state is authoritative, and a concurrent Chrome discard makes ownership uncertain. Debug logs already identify explicit requests without storing a second source of tab state. Statistics are computed on demand; event listeners exist only in open extension pages. The full tab-title list is requested only when the individual-exclusion section is opened.

## Restart and recovery

`chrome.storage.session` stores window/tab IDs, last meaningful activity, parked state, previous tab ID, parking tab ID, and diagnostic pending dwell information. It survives worker termination, but is intentionally not used across browser sessions or extension reloads.

Each parking page URL has a random token; `chrome.storage.local` stores that token's previous URL, title, position and duplicate-URL occurrence. No raw tab/window IDs are trusted across a browser restart. Restored windows are rediscovered from their actual parking-page URLs. The prior tab is resolved only within that same window; ambiguous/missing targets use a sensible fallback. If duplicate URLs were reordered between sessions, the exact original duplicate cannot always be identified.

The recovery journal is written before activating the parking tab. A crash during parking can leave some tabs loaded, but does not justify closing, moving or mass-reloading them. New/unrecognized windows receive a fresh parking grace period. Partial dwell is always restarted. Alarms are rebuilt on worker startup, even if Chrome cleared them.

While the extension is disabled, it cannot restore or clean up its pages; real tabs remain manually selectable. Re-enabling rebuilds state from live pages and valid recovery records without resuming old batches. Old extension pages may need refreshing after a reload or update.

Chrome owns session restoration. It may reload selected real tabs before the extension can act, and it may choose not to restore your windows at all depending on your startup settings. The extension neither creates replacement windows nor forces Chrome's session restore. It only preserves/reconstructs parking for windows Chrome actually restores. It cannot guarantee a zero-reload Chrome startup or restore macOS Space assignments that Chrome itself changes.

Closed windows and removed parking tabs have their records removed once no live page uses that token, including normal removal after restoration. Bulk close also prunes abandoned recovery records. Abandoned crash records are bounded to the latest 100 in addition to live records. Settings and restart metadata stay only in the local Chrome profile; uninstalling removes extension storage. No `storage.sync` is used.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `tabs` | Read URLs/titles for exclusions and recovery; select tabs and optionally request immediate discard. It does not provide page-content access. |
| `storage` | Local settings/recovery and per-session state. |
| `alarms` | Persistent inactivity scheduling and dwell recovery. |
| `downloads` | Conservative global pause while any download is in progress. No downloads are initiated, modified, opened or deleted. |

No host permissions, `<all_urls>`, content scripts, scripting, debugger, tabCapture, offscreen document, native host, backend service, analytics, telemetry, external dependencies, remote fonts, remote images or remote code. The CSP prohibits network connections from extension pages. The extension performs no background network requests; Chrome naturally requests the original website when you restore a discarded real tab. The small Support actions open a fixed external project-support URL only after deliberate user action, with no browsing information attached. No payment or supporter information returns to Chrome Window Parker.

## Verify memory reduction

1. Start with disposable tabs and save work. Use comparable heavy pages across a few windows, and leave your usual Chrome Memory Saver setting unchanged for both measurements.
2. In Chrome's Task Manager (Window → Task Manager, or More tools → Task Manager if available in your version), enable the memory footprint column. Record memory for the relevant page processes and extension worker/page. Also record total Chrome memory in macOS Activity Monitor. Process sharing means tab sums and total process memory need not match.
3. Open `chrome://discards` to inspect loaded/discarded tab states. Its layout is version-dependent. Do not use the manual discard buttons during the comparison.
4. Temporarily set **Custom → 1 minute**, dwell **2 seconds**. Focus another window or another app and wait roughly 90 seconds; alarms can be delayed further under load.
5. Inspect the target window: its parking page should be selected, the formerly selected real tab still present. In Let Chrome decide, it may remain loaded until Chrome chooses to unload it. In Discard immediately, every eligible loaded real tab present at the start of the batch should be discarded unless Chrome refuses or the operation is interrupted. Protected and already-discarded tabs are left alone. Record memory again after it settles. Avoid selecting real tabs while recording the parked baseline.
6. Rapidly traverse four Spaces, staying below two seconds on intermediate Spaces. Stop on the fourth for over two seconds. Only that window's saved tab should become selected; it reloads only if Chrome had unloaded it. Check that other windows still show their parking pages.
7. Compare several runs. Savings depend on actual tab contents, shared renderer processes, protected tabs, Chrome's own reclamation, and extension-page overhead. No fixed memory reduction is promised.
8. Restore the production delay to 15 minutes when finished. Repeat with ten windows after the small test passes.

For rigorous comparison, capture both **Memory Saver alone** and **Memory Saver + Chrome Window Parker** after the same inactivity period and with the same pages. Restarting into different tabs or mixing unrelated workloads invalidates the comparison.

## Debug logs and troubleshooting

Enable **Debug logging** in Settings and save. Open `chrome://extensions`, find this extension, and click its **service worker** inspection link. In DevTools Console, enable the Verbose level to see `[Chrome Window Parker]` entries: focus changes, dwell start/cancel, alarms, parking, restoration, skips and Chrome refusals. Logs intentionally contain IDs/reasons, not full URLs or titles. Routine logging is off by default; unexpected errors still appear.

**Close worker DevTools during lifetime/suspension tests.** An attached inspector changes worker lifetime and can conceal lifecycle bugs.

If a window does not park, check that it is unfocused, the active tab is eligible, no downloads remain in progress, and no relevant exclusion applies. Protected windows retry later. If it remains on the parking page, select a real tab or press Restore tab; verify the extension is enabled for automatic dwell restoration. Extension changes require Reload in `chrome://extensions`; refresh an old parking page if its extension context was invalidated. Real tabs always remain selectable.


## Safe parking-page cleanup

Restoration selects the remembered real tab, or the existing same-window fallback if it was closed. It verifies activation before cleanup. Cleanup re-reads the window, checks that the parking page is still an inactive page owned by this extension, and requires another, active real tab in the same window. Navigation, tab detach/removal and focus signals invalidate an in-flight snapshot. Real tabs are never intentionally removed.

Manual real-tab selection also cleans up the parking page. A worker starting after an interrupted restoration removes an inactive leftover when those checks pass. Automatic restoration keeps a parking-only window open. Explicit bulk close creates a blank tab first. A temporary Chrome refusal leaves the page for a later activity/sweep/startup retry; there is no fast polling loop. Automatic restoration gets one fresh fallback attempt when its target disappears during activation. Clear never activates a second target after an activation has succeeded.

Chrome does not offer an atomic “remove this tab only if another tab still exists” call. The final checks minimize races, but cannot guarantee against an unrelated last-instant closure or navigation between that check and Chrome processing removal.

## Settings and page lifecycle

The `sleepingMode` setting stores `chrome` or `immediate`; `appearance` stores `auto`, `light` or `dark`. Missing or unrecognized stored enum values fall back to Chrome-managed sleeping and Auto. New malformed settings sent from a page are rejected. Reset persists the defaults. A queued configure/reset signal invalidates in-flight parking before the queue processes the new settings. Changing mode does not retroactively discard or wake tabs in already-parked windows. Updated policy and protection rules apply to future parking cycles; active batches are cancelled before a queued settings change. A focus signal immediately resets the inactivity clock of a window that was genuinely in use, so an older queued sweep cannot park it just after the user leaves.

All three pages load `theme.js` in the head and share CSS color tokens. Auto follows `prefers-color-scheme`; explicit themes override it. Local storage changes update open pages. A revision guard prevents a late initial read from overwriting a newer setting. Content waits for that first read to avoid showing the wrong theme; a read failure falls back to Auto.

A parking page can queue a status request just before restoration removes it. The worker validates the sender, then checks the live tab and token. If that page has gone or navigated away, parked-info/restore returns `{gone: true}` without mutation or error logging. Unexpected API failures still reject and reach the worker console. Parking pages stop coalesced refresh timers and tab listeners on teardown and while restoration is in progress; no background polling is used.
