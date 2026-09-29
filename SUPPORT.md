# Compatibility and support

Chrome Window Parker is designed for people who keep several Chrome windows open, especially across macOS Spaces. It requires Chrome 120 or later and uses standard extension APIs without native software or macOS-specific code.

Chrome Window Parker is currently tested on macOS. Windows, Linux and ChromeOS have not yet been formally verified, nor have other Chromium browsers or mobile browsers. For testing changes, see [Testing](TESTING.md).

## If a window does not park

Check that automation is enabled, the window has been unfocused for the selected delay, and its selected tab is eligible. Pinned, audible, excluded, loading and internal tabs can prevent parking. An active Chrome download pauses parking across all windows. Chrome may deliver alarms late.

In **Let Chrome decide**, seeing a parking page does not mean Chrome has unloaded the previous tab. Memory Saver makes that decision. **Discard immediately** requests unloading of every currently loaded eligible real tab in a newly parked window. Protected tabs are skipped independently, and Chrome can refuse a request. Changing modes takes effect on the next parking cycle.

## If a window does not return

Remain focused for the configured return delay, or press **Restore tab**. Automatic return is paused when automation is off. You can always select a real tab yourself. **Clear parked tabs** returns affected windows to real tabs without changing your pause setting.

After an extension reload or update, refresh old extension pages if their context has become invalid. Chrome controls browser session restoration and Space placement; Chrome Window Parker cannot reconstruct windows that Chrome did not restore.

## Reporting a problem

Open a [GitHub Issue](https://github.com/montybwolfe/chrome-window-parker/issues) with extension, Chrome and OS versions; sleeping mode and Memory Saver setting; reproduction steps; and expected versus observed behavior. Remove private URLs, titles and personal data from screenshots or logs.

For diagnostics, enable debug logging in Settings, save, then inspect the service worker from `chrome://extensions`. Enable verbose console output. Close worker DevTools before testing suspension or sleep/wake, because an attached inspector changes worker lifetime. Unexpected errors remain visible even with debug logging off.

Optional [support for development](https://buymeacoffee.com/montybwolfe) is separate from technical support. All features remain free; please continue to report bugs and request help through GitHub Issues.
