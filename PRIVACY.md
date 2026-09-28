# Privacy policy — Chrome Window Parker

Chrome Window Parker runs entirely within your Chrome profile. It sends no data to its developer or any other server, and includes no analytics, advertising, telemetry or remote code.

The extension reads tab URLs, titles and browser window/tab state to apply exclusions and restore the correct tab. It stores settings locally, per-session activity and individual tab exclusions in session storage, and the previous tab's URL/title/position with a random parking identifier in local storage for restart recovery. It does not read page contents, cookies, credentials, browsing-history databases, or files downloaded to your computer.

It queries Chrome's download metadata solely to determine whether downloads are in progress, conservatively pausing parking while any are active. It does not retain download metadata or initiate, modify, open or delete downloads. Optional debug logs stay in Chrome's extension console and contain tab/window identifiers and operational reasons, not complete URLs or titles.

Data is not synchronized to a cloud service. Closing windows/parking tabs, including automatic parking-page removal after restoration, removes associated recovery records when observed; bounded abandoned records may remain after crashes. Reset settings resets settings, while individual session exclusions remain. Removing the extension removes its extension storage. Chrome and websites have their own privacy behavior, including normal network requests when a discarded website reloads.

Maintained by the GitHub account [montybwolfe](https://github.com/montybwolfe). Effective date: 28 September 2026. For privacy questions, use the [project issue tracker](https://github.com/montybwolfe/chrome-window-parker/issues). Do not include private browsing data in a public issue.
