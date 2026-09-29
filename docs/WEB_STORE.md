# Chrome Web Store submission — v1.5.1.2

The dashboard baseline is **v1.5.0**. Follow the complete [v1.5.1.2 publishing sheet](../store-listing/PUBLISH-v1.5.1.2.md): exact upload files, copy-ready text, unchanged fields and ordered submission steps. It compares the actual v1.5.0 tag against this release, including the later PNG artwork improvements and multi-tab immediate-discard correction.

Upload the runtime ZIP from the [v1.5.1.2 GitHub Release](https://github.com/montybwolfe/chrome-window-parker/releases/tag/v1.5.1.2), not GitHub's automatic source archive. Chrome reads the version from `manifest.json` in that package; there is no separate version text field to edit. See [Chrome's update instructions](https://developer.chrome.com/docs/webstore/update).

Keep **In-app purchases: No**. The installed extension contains no purchase, payment or funding mechanism and sells no functionality. Repository-level project support does not create an in-app purchase. This is consistent with the [official payment policy](https://developer.chrome.com/docs/webstore/program-policies/policies#accepting-payment-from-users).

Permissions, CSP, data categories and local handling are unchanged. Review the existing limited-use certifications yourself. The homepage remains the repository, technical support remains GitHub Issues, and the privacy URL remains PRIVACY.md on main.

The repository's Store packet cannot confirm the state of your signed-in dashboard or developer account. Keep existing distribution choices, verify required declarations/contact details there, and complete the [installed-extension acceptance checklist](../TESTING.md) before submitting. GitHub publication does not submit anything to the Chrome Web Store.
