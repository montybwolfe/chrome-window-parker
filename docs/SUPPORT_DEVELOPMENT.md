# Optional support — v1.5.1.1

Window Parker remains fully free and open source. A contribution unlocks nothing and creates no account, entitlement, supporter status or recurring prompt in the extension. Technical support remains GitHub Issues. The parked page has no funding content.

`support.js` owns the single constant URL `https://buymeacoffee.com/montybwolfe`. Only popup and Settings import it. A native button's trusted click (including keyboard activation) calls `chrome.tabs.create` once with that URL and `active: true`. Pending operations, double-click follow-ups and repeats within one second are ignored. No timer, storage, background hook, remote asset, network prefetch or arbitrary URL input is involved. Failed opens are reported locally and can be retried deliberately. The fixed URL carries no tracking parameters or browsing data. The external site operates under its own terms; the extension receives nothing back.

Permissions and CSP are unchanged, including `connect-src 'none'`. Chrome documents that [creating tabs requires no new permission](https://developer.chrome.com/docs/extensions/reference/api/tabs#permissions). The exact [four-component manifest version](https://developer.chrome.com/docs/extensions/reference/manifest/version) is supported.

## Store policy review — 29 September 2026

**In-app purchases: retain No.** The current [Chrome Web Store policy, Accepting Payment From Users](https://developer.chrome.com/docs/webstore/program-policies/policies#accepting-payment-from-users), addresses sales of products/services, sensitive payment information and payment required for functionality. This extension sells none of those and handles no payment information. Its voluntary external contribution offers no functionality, content, licence or entitlement. This is our application of the published policy to this implementation, not a claim of a donation-specific ruling: the official pages reviewed do not explicitly define this exact voluntary-contribution case or require a Yes declaration for it. Do not apply Google Play billing rules to a Chrome extension.

The [listing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) permits explanatory/promotional copy after the product overview; the [metadata rules](https://developer.chrome.com/docs/webstore/program-policies/policies#listing-requirements) require accurate, relevant, non-spammy information. No prohibition on this single relevant plain-text project-support URL was found. The description therefore includes it once in a short secondary section. It does not replace the homepage, technical-support or privacy URLs, nor change the extension's single purpose.

No new user-data category or permission justification is needed. The privacy policy and explanatory privacy text distinguish the deliberate third-party navigation from the extension's local processing. Remote code remains No; In-app purchases and mature content remain No.

## GitHub funding

[GitHub's official funding documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository) lists the native provider used in `.github/FUNDING.yml`:

```yaml
buy_me_a_coffee: montybwolfe
```

No custom redirect or tracking URL is used. The README places funding after the functional documentation; SUPPORT.md keeps bug reports/help at GitHub Issues.
