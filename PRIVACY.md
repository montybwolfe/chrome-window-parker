# Privacy policy — Chrome Window Parker

Chrome Window Parker runs locally in your Chrome profile. It has no backend, makes no background network requests and sends no browsing information to the developer or third parties. It contains no accounts, analytics, advertising, tracking, telemetry or remote code.

## Information used on your device

The extension reads current tab URLs, titles, identifiers and state to apply exclusions, park idle windows and return to the right tab. Window focus, tab activation/navigation and timing determine inactivity and a deliberate return. It does not read website contents, keystrokes, mouse activity, cookies, credentials, Chrome's browsing-history database or downloaded files.

Local extension storage holds settings, including timing, tab sleeping mode, appearance, exclusions and debug preference. Recovery records contain a random parking token and the previous tab's URL, title, position, duplicate-URL occurrence and update time. Session storage holds temporary window/tab identifiers, activity times, parked state, pending restoration details and individual-tab protection.

The downloads API is queried only to check whether a Chrome download is in progress. Download metadata is not retained. The extension does not start, open, modify or delete downloads.

Debug logging is off by default. When enabled, operational logs stay in Chrome's extension console and use identifiers and reasons rather than page titles or full URLs. Unexpected API errors remain visible for diagnosis; review logs before sharing them.

## Retention and control

Settings and recovery records remain in the local Chrome profile; no Chrome sync storage or cloud database is used. Closing a window or parking page, including normal restoration and Clear parked tabs, removes its recovery record once no live page uses it. Up to 100 abandoned recovery records may remain after crashes, in addition to records for live parking pages.

Reset settings restores defaults, including Let Chrome decide and Auto appearance. It does not erase session tab protection or recovery records needed by open parking pages. Individual protection ends with the browser session and may also clear on extension reload/update. Removing the extension removes its extension storage.

## Chrome and websites

In the default mode, Chrome decides whether and when background tabs unload. Optional immediate discard makes an explicit request to Chrome. Neither mode sends browsing information to the developer. Chrome and websites have their own data practices; restoring an unloaded website can cause its normal network requests.

The extension does not sell or transfer user data, use it for advertising, or use it for creditworthiness or lending.

Effective date: 29 September 2026. Maintained by [montybwolfe](https://github.com/montybwolfe). For questions, use the [project issue tracker](https://github.com/montybwolfe/chrome-window-parker/issues), keeping private browsing details out of public posts.
