# Help

**Found a bug?** Please [open an issue on GitHub](https://github.com/montybwolfe/chrome-window-parker/issues). Include your Chrome version, operating system and sleeping mode, what you expected and what happened. Leave out private addresses, titles and personal details.

## Common questions

**A window doesn't park.** It has to stay unfocused for the whole parking delay, and its selected tab can't be pinned, playing audio, on an excluded site, still loading, or a Chrome page. Any download in progress pauses parking in every window. Chrome can also run the check a little late.

**The parked tab is still loaded.** In Let Chrome decide mode, Chrome's Memory Saver decides when to unload background tabs; parking only makes that possible. Discard immediately unloads them straight away.

**A window didn't come back.** Stay in it for the restore delay (2 seconds by default), or click Restore tab. If automatic parking is paused, windows don't restore by themselves, but you can always click a tab.

**What does Clear parked tabs do?** It returns every parked window to a normal tab and removes the parking pages. It doesn't unload or reload anything else.

**Chrome warns about browsing history and downloads.** Those are Chrome's standard descriptions of the permissions. See [the README](README.md#privacy) for what they're used for.

**Chrome says it's "not trusted by Enhanced Safe Browsing".** Chrome shows this for extensions from newer developers when Enhanced protection is on. Google says new developers usually take a few months to become trusted.

## Debug logs

Turn on debug logging in Settings, save, then open `chrome://extensions`, find Chrome Window Parker and click **service worker** to see its console. Close that console before testing sleep or restarts, because keeping it open changes how Chrome runs the extension.

## Compatibility

Chrome 120 or newer. Tested on macOS; Windows, Linux and ChromeOS should work but haven't been tested properly yet.

Support for development is optional and separate from help: everything is free, and bug reports are always welcome.
