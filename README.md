# Duo Widget

A home screen / lock screen widget that counts how many times you open the wide
(inner) screen of a folding iPhone. A Shortcuts automation does the counting;
the widget shows the number.

It is built with [Scriptable](https://scriptable.app) (free), because the
Shortcuts app cannot make custom widgets on its own. Shortcuts runs the script,
and Scriptable draws the widget.

Your count stays on your phone. The script does not use the internet or send
data anywhere.

## What the widget shows

- Total number of times the wide screen was opened
- How many times today
- When it was last opened

## Setup

### 1. Add the script

1. Install **Scriptable** from the App Store.
2. In Scriptable, tap **+** to make a new script.
3. Paste in everything from [`duo-counter.js`](duo-counter.js).
4. Tap the title at the top and name it **Duo Counter**.
5. Tap ▶︎ once. It shows a preview and prints the measured screen ratio in
   the log. Run it once folded and once opened to check that "Wide screen now"
   says `false` and `true` correctly.

### 2. Make the Shortcut

1. Open **Shortcuts** → **+**.
2. Add the action **Scriptable → Run Script**.
3. Choose **Duo Counter**, tap the **⌄** arrow, and under **Texts** tap
   **Add New Item** and type `check`. (Typing `check` into **Parameter**
   also works, if your version shows a keyboard for it.)
4. Turn **Run In App** and **Show When Run** off.
5. Name the shortcut **Count Wide Screen**.

`check` only counts when the wide screen is showing *and* it wasn't showing the
last time the shortcut ran, so running it several times in a row while open
won't inflate the count.

### 3. Run it automatically

1. Shortcuts → **Automation** → **+** → **Create Personal Automation**.
2. Pick the trigger that fires when you open the phone:
   - If your iOS version offers an unfold / screen-change trigger, use that.
   - Otherwise, a good stand-in is **App → Is Opened** with the apps you
     usually use on the wide screen, or **Display → Is Turned On**
     (if available), so the check runs whenever you start using the phone.
3. Choose **Run Immediately** and turn off **Notify When Run**.
4. Select the **Count Wide Screen** shortcut.

> The exact automation triggers depend on your iOS version and device. The
> script itself works with any trigger, since it checks the screen shape
> each time it runs.

### 4. Add the widget

1. Long-press the home screen → **Edit** → **Add Widget** → **Scriptable**.
2. Pick a size (small or medium) and add it.
3. Long-press the widget → **Edit Widget** → set **Script** to **Duo Counter**.

It also works as a lock screen widget (circular, rectangular, or inline).

## Shortcut parameters

| Parameter | What it does |
|-----------|--------------|
| `check`   | Counts +1 if the wide screen just became visible |
| `add`     | Always counts +1 (handy for a manual button) |
| `reset`   | Sets the count back to 0 |

The shortcut returns the new total, so you can follow it with **Show Result**
if you want to see the number.

## Notes

- **Widget refresh timing is controlled by iOS.** The count is saved instantly,
  but the widget may take a few minutes to show the new number.
- If the wide screen isn't detected correctly, open the script and change
  `WIDE_RATIO_MAX` near the top (the log from step 1.5 shows your ratio).
