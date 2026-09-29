# Chrome Web Store submission — v1.5.1.3

The dashboard baseline is **v1.5.0**. Follow the complete [v1.5.1.3 publishing sheet](../store-listing/PUBLISH-v1.5.1.3.md): exact upload files, copy-ready text, unchanged fields and ordered submission steps. It compares the preserved v1.5.0 commit against this release, including the later PNG artwork improvements and multi-tab immediate-discard correction.

Upload the runtime ZIP from the [v1.5.1.3 GitHub Release](https://github.com/montybwolfe/chrome-window-parker/releases/tag/v1.5.1.3), not GitHub's automatic source archive. Chrome reads the version from `manifest.json` in that package; there is no separate version text field to edit. See [Chrome's update instructions](https://developer.chrome.com/docs/webstore/update).

Keep **In-app purchases: No**. All functionality is free and voluntary support unlocks no functionality, content, licence, subscription or entitlement. The [official payment policy](https://developer.chrome.com/docs/webstore/program-policies/policies#accepting-payment-from-users) discusses paid products/services and functionality but does not explicitly define this precise voluntary-contribution case. Retaining No is our application to this implementation, not a claimed donation-specific ruling. The relevant support URL appears once near the end of the plain-text description. It does not replace the homepage, technical-support or privacy URLs.

Permissions, CSP, data categories and local handling are unchanged. Review the existing limited-use certifications yourself. The homepage remains the repository, technical support remains GitHub Issues, and the privacy URL remains PRIVACY.md on main.

The repository's Store packet cannot confirm the state of your signed-in dashboard or developer account. Keep existing distribution choices, verify required declarations/contact details there, and complete the [installed-extension acceptance checklist](../TESTING.md) before submitting. GitHub publication does not submit anything to the Chrome Web Store.
