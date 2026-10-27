// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: mobile-alt;

// Duo Widget — counts how many times the wide (inner) screen has been opened.
//
// One script does everything:
//   - Run from Shortcuts with parameter "check"  -> counts +1 only if the wide
//     screen is showing now and was not showing last time it checked.
//   - Run from Shortcuts with parameter "add"    -> always counts +1.
//   - Run from Shortcuts with parameter "reset"  -> sets the count back to 0.
//   - Added as a Scriptable widget               -> shows the count.
//
// The count is stored on this device only, inside Scriptable's own folder.
// Nothing is sent anywhere.

const STORE_FILE = "duo-counter.json"

// Folded phones use a tall, narrow screen (about 2:1 or taller). The opened
// wide screen is much closer to square (about 4:3 or wider). Anything below
// this long-side / short-side ratio is treated as the wide screen.
// Adjust it if your device is detected the wrong way (run the script in the
// app with no parameter to see the measured ratio).
const WIDE_RATIO_MAX = 1.6

const fm = FileManager.local()
const storePath = fm.joinPath(fm.documentsDirectory(), STORE_FILE)

function loadState() {
  const fresh = { total: 0, today: 0, day: dayKey(new Date()), lastOpened: null, wasWide: false }
  if (!fm.fileExists(storePath)) return fresh
  try {
    return Object.assign(fresh, JSON.parse(fm.readString(storePath)))
  } catch (e) {
    return fresh
  }
}

function saveState(state) {
  fm.writeString(storePath, JSON.stringify(state))
}

function dayKey(date) {
  const df = new DateFormatter()
  df.dateFormat = "yyyy-MM-dd"
  return df.string(date)
}

function rollDay(state) {
  const today = dayKey(new Date())
  if (state.day !== today) {
    state.day = today
    state.today = 0
  }
}

function screenRatio() {
  const size = Device.screenSize()
  const long = Math.max(size.width, size.height)
  const short = Math.min(size.width, size.height)
  return long / short
}

function isWideScreen() {
  return screenRatio() < WIDE_RATIO_MAX
}

function countOne(state) {
  state.total += 1
  state.today += 1
  state.lastOpened = new Date().toISOString()
}

function handleCommand(command, state) {
  rollDay(state)
  switch (command) {
    case "add":
      countOne(state)
      state.wasWide = true
      break
    case "check": {
      const wide = isWideScreen()
      if (wide && !state.wasWide) countOne(state)
      state.wasWide = wide
      break
    }
    case "reset":
      state.total = 0
      state.today = 0
      state.lastOpened = null
      break
    default:
      throw new Error(`Unknown parameter "${command}". Use add, check or reset.`)
  }
  saveState(state)
  return state.total
}

function lastOpenedText(state) {
  if (!state.lastOpened) return "Not opened yet"
  const rdf = new RelativeDateTimeFormatter()
  rdf.useNamedDateTimeStyle()
  return rdf.string(new Date(state.lastOpened), new Date())
}

function buildWidget(state) {
  const family = config.widgetFamily
  const widget = new ListWidget()
  // A hint only; iOS decides when widgets actually refresh.
  widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000)

  if (family === "accessoryInline") {
    widget.addText(`Opened ${state.total}×`)
    return widget
  }

  if (family === "accessoryCircular") {
    widget.addAccessoryWidgetBackground = true
    const count = widget.addText(String(state.total))
    count.font = Font.boldRoundedSystemFont(22)
    count.minimumScaleFactor = 0.4
    count.centerAlignText()
    return widget
  }

  if (family === "accessoryRectangular") {
    const title = widget.addText("Wide screen")
    title.font = Font.semiboldSystemFont(13)
    const count = widget.addText(`${state.total} opens`)
    count.font = Font.boldRoundedSystemFont(20)
    const today = widget.addText(`${state.today} today`)
    today.font = Font.systemFont(12)
    return widget
  }

  const bg = new LinearGradient()
  bg.colors = [new Color("#1c2a4a"), new Color("#0b1020")]
  bg.locations = [0, 1]
  widget.backgroundGradient = bg
  widget.setPadding(14, 14, 14, 14)

  const title = widget.addText("WIDE SCREEN OPENED")
  title.font = Font.semiboldSystemFont(10)
  title.textColor = new Color("#8fa3c7")

  widget.addSpacer()

  const count = widget.addText(String(state.total))
  count.font = Font.boldRoundedSystemFont(family === "small" ? 46 : 56)
  count.textColor = Color.white()
  count.minimumScaleFactor = 0.4
  count.lineLimit = 1

  const unit = widget.addText(state.total === 1 ? "time" : "times")
  unit.font = Font.mediumSystemFont(13)
  unit.textColor = new Color("#c9d4ea")

  widget.addSpacer()

  const today = widget.addText(`${state.today} today · ${lastOpenedText(state)}`)
  today.font = Font.systemFont(11)
  today.textColor = new Color("#8fa3c7")
  today.lineLimit = 1
  today.minimumScaleFactor = 0.7

  return widget
}

const state = loadState()
rollDay(state)

if (config.runsInWidget) {
  Script.setWidget(buildWidget(state))
} else if (args.shortcutParameter != null) {
  const command = String(args.shortcutParameter).trim().toLowerCase()
  Script.setShortcutOutput(handleCommand(command, state))
} else {
  // Opened directly in the Scriptable app: show a preview and the measured
  // screen ratio so WIDE_RATIO_MAX can be tuned if needed.
  console.log(`Screen ratio: ${screenRatio().toFixed(2)} (wide if below ${WIDE_RATIO_MAX})`)
  console.log(`Wide screen now: ${isWideScreen()}`)
  await buildWidget(state).presentSmall()
}

Script.complete()
