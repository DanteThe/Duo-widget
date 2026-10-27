// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: cookie-bite;

// Peanut Butter Cup (Flipped) — the same floating peanut butter cup as
// peanut-butter-cup.js, but facing and drifting the opposite way.
//
// iOS widgets are still images, so the cup can't move continuously. Instead,
// every time iOS refreshes the widget the cup is drawn at a slightly different
// height, tilt and turn, so it drifts around over the day.
//
// Want a real photo? Save it as cup.png in the Scriptable folder in the Files
// app (the same photo the original widget uses). This script mirrors it for
// you the first time it runs in the Scriptable app (or when you tap the
// widget) and keeps the mirrored copy, so the widget itself does no extra
// work. The photo stays on your phone.
//
// Battery: the picture is drawn once per refresh (a few milliseconds of work),
// with no internet, location or sensors. Refreshes are requested every
// 30 minutes, and iOS may space them out further.

const REFRESH_MINUTES = 30
// Any file named like cup.png, Cup.PNG, cup.png.png, cup.jpg or cup.heic.
const PHOTO_PATTERN = /^cup(\.[a-z]+)*\.(png|jpe?g|heic)$/i
// The mirrored copy is kept in Scriptable's on-device folder.
const FLIPPED_FILE = "cup-mirrored-cache.png"
const FLIPPED_INFO = "cup-mirrored-cache.json"
// Big photos are shrunk when mirrored so the widget stays light on memory.
const FLIPPED_MAX_SIDE = 900

// Colours
const BG_TOP = "#2e0508"
const BG_BOTTOM = "#1c0201"
const CHOCOLATE = [112, 64, 33]     // side of the cup
const TOP_RIM = "#4a2914"
const TOP_FILL = "#6b3b1d"
const CRUMB = "#d9a066"

const family = config.widgetFamily || "small"
const W = family === "medium" ? 640 : 300
const H = 300

// Position of the cup, driven by the clock so each refresh looks different.
// Tilt, turn and drift all run the opposite way to the original widget.
const t = Date.now() / 60000 // minutes
const floatY = Math.sin(t / 47) * 14
const tilt = -Math.sin(t / 71) * 0.2
const spin = Math.PI * 2 - (t / 9) % (Math.PI * 2)
const pitch = 0.33 + Math.sin(t / 113) * 0.06

const cx = W / 2
const R = 104       // top radius
const r = 80        // bottom radius
const depth = 70    // height of the side
const yTop = 108 + floatY
const yBottom = yTop + depth
const pivot = { x: cx, y: (yTop + yBottom) / 2 }
const RIDGES = 30

function rotate(p) {
  const dx = p.x - pivot.x
  const dy = p.y - pivot.y
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  return new Point(pivot.x + dx * c - dy * s, pivot.y + dx * s + dy * c)
}

function ellipsePoint(centerY, radius, angle, scale = 1, lift = 0) {
  return rotate({
    x: cx + radius * scale * Math.cos(angle),
    y: centerY - lift + radius * scale * pitch * Math.sin(angle),
  })
}

function polygon(points) {
  const path = new Path()
  path.move(points[0])
  for (const p of points.slice(1)) path.addLine(p)
  path.closeSubpath()
  return path
}

function ellipse(centerY, radius, scale = 1, lift = 0, offsetX = 0, steps = 48) {
  const pts = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const p = ellipsePoint(centerY, radius, a, scale, lift)
    pts.push(new Point(p.x + offsetX, p.y))
  }
  return polygon(pts)
}

function fill(ctx, path, color) {
  ctx.addPath(path)
  ctx.setFillColor(color)
  ctx.fillPath()
}

function rgb([r, g, b], k) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0")
  return new Color(`#${c(r)}${c(g)}${c(b)}`)
}

function drawShadow(ctx) {
  // Higher cup -> smaller, fainter shadow.
  const lift = (floatY + 14) / 28
  const groundY = 270
  for (let i = 0; i < 6; i++) {
    const rx = (78 - lift * 14) * (1 - i * 0.12)
    const ry = rx * 0.16
    const path = new Path()
    path.addEllipse(new Rect(cx - rx, groundY - ry, rx * 2, ry * 2))
    fill(ctx, path, new Color("#000000", 0.1 + (1 - lift) * 0.04))
  }
}

function drawSide(ctx) {
  // Light comes from the upper right.
  const light = Math.PI * 0.2
  const step = (Math.PI * 2) / RIDGES
  for (let i = 0; i < RIDGES; i++) {
    let a0 = (spin + i * step) % (Math.PI * 2)
    let a1 = a0 + step
    // Only the front half (angles 0..π) faces the viewer.
    a0 = Math.max(a0, 0)
    a1 = Math.min(a1, Math.PI)
    if (a1 <= a0) continue
    const mid = (a0 + a1) / 2
    const pleat = i % 2 === 0 ? 1 : 0.8
    const shade = (0.5 + 0.55 * Math.max(0, Math.cos(mid - light))) * pleat
    fill(ctx, polygon([
      ellipsePoint(yTop, R, a0),
      ellipsePoint(yTop, R, a1),
      ellipsePoint(yBottom, r, a1),
      ellipsePoint(yBottom, r, a0),
    ]), rgb(CHOCOLATE, shade))
  }
}

function drawTop(ctx) {
  fill(ctx, ellipse(yTop, R), new Color(TOP_RIM))
  fill(ctx, ellipse(yTop, R, 0.9, 3), new Color(TOP_FILL))

  // Ridged edge around the rim.
  const step = (Math.PI * 2) / RIDGES
  ctx.setStrokeColor(new Color("#2e180a", 0.55))
  ctx.setLineWidth(1.6)
  for (let i = 0; i < RIDGES; i++) {
    const a = spin + i * step
    const path = new Path()
    path.move(ellipsePoint(yTop, R, a, 0.985))
    path.addLine(ellipsePoint(yTop, R, a, 0.9, 3))
    ctx.addPath(path)
    ctx.strokePath()
  }

  // Glossy shine on the chocolate.
  fill(ctx, ellipse(yTop, R, 0.55, 8, R * 0.22), new Color("#ffffff", 0.07))
  fill(ctx, ellipse(yTop, R, 0.32, 10, R * 0.3), new Color("#ffffff", 0.1))
  fill(ctx, ellipse(yTop, R, 0.12, 11, R * 0.38), new Color("#ffffff", 0.22))
}

function drawCrumbs(ctx) {
  const crumbs = [
    { x: 118, y: -40, s: 7, speed: 23 },
    { x: -112, y: -62, s: 5, speed: 31 },
    { x: -126, y: 34, s: 6, speed: 19 },
  ]
  for (const c of crumbs) {
    const bob = Math.sin(t / c.speed) * 8
    const x = cx + c.x
    const y = pivot.y + c.y + bob
    const path = new Path()
    path.addEllipse(new Rect(x - c.s, y - c.s * 0.75, c.s * 2, c.s * 1.5))
    fill(ctx, path, new Color(CRUMB))
  }
}

// Looks for cup.png in the Scriptable folder (iCloud first, then on-device).
// When run in the app, it logs what it found to help with setup.
async function findPhoto() {
  const places = []
  try { places.push(["iCloud Drive → Scriptable", FileManager.iCloud()]) } catch (e) {}
  places.push(["On My iPhone → Scriptable", FileManager.local()])
  for (const [label, fm] of places) {
    let names = []
    try { names = fm.listContents(fm.documentsDirectory()) } catch (e) {}
    const images = names.filter((n) => /\.(png|jpe?g|heic)$/i.test(n))
    log(`${label}: ${images.length ? images.join(", ") : "no pictures"}`)
    const name = images.find((n) => PHOTO_PATTERN.test(n))
    if (!name) continue
    const path = fm.joinPath(fm.documentsDirectory(), name)
    try {
      if (fm.isFileStoredIniCloud(path)) await fm.downloadFileFromiCloud(path)
      const image = fm.readImage(path)
      if (image) {
        log(`Found ${name}`)
        return { image, name, changed: fm.modificationDate(path).getTime() }
      }
      log(`Found ${name} but couldn't open it as a picture`)
    } catch (e) {
      log(`Found ${name} but couldn't open it: ${e}`)
    }
  }
  log("No cup photo found, drawing the cup instead")
  return null
}

// Mirrors a picture left-to-right. Scriptable can't do this directly, so it
// uses a hidden web view, which only works when running in the app.
async function mirror(image) {
  const base64 = Data.fromPNG(image).toBase64String()
  const web = new WebView()
  await web.loadHTML("<canvas id='c'></canvas>")
  const result = await web.evaluateJavaScript(`
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, ${FLIPPED_MAX_SIDE} / Math.max(img.width, img.height))
      const c = document.getElementById("c")
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      const g = c.getContext("2d")
      g.translate(c.width, 0)
      g.scale(-1, 1)
      g.drawImage(img, 0, 0, c.width, c.height)
      completion(c.toDataURL("image/png").split(",")[1])
    }
    img.onerror = () => completion(null)
    img.src = "data:image/png;base64,${base64}"
  `, true)
  if (!result) throw new Error("the picture couldn't be read")
  return Image.fromData(Data.fromBase64String(result))
}

// Returns the mirrored photo, making (or remaking) it when cup.png is new or
// has changed. The widget can't mirror, so until the script has run once in
// the app it shows the photo unmirrored.
async function loadPhoto() {
  const source = await findPhoto()
  if (!source) return null
  const fm = FileManager.local()
  const dir = fm.documentsDirectory()
  const cachePath = fm.joinPath(dir, FLIPPED_FILE)
  const infoPath = fm.joinPath(dir, FLIPPED_INFO)
  let info = null
  try { info = JSON.parse(fm.readString(infoPath)) } catch (e) {}
  const upToDate = info && info.name === source.name && info.changed === source.changed && fm.fileExists(cachePath)
  if (upToDate) {
    const cached = fm.readImage(cachePath)
    if (cached) {
      log("Using the mirrored copy")
      return cached
    }
  }
  if (config.runsInWidget) {
    log("Not mirrored yet: tap the widget or run the script in Scriptable once")
    return source.image
  }
  try {
    const flipped = await mirror(source.image)
    fm.writeImage(cachePath, flipped)
    fm.writeString(infoPath, JSON.stringify({ name: source.name, changed: source.changed }))
    log("Mirrored the photo and saved the copy")
    return flipped
  } catch (e) {
    log(`Couldn't mirror the photo: ${e}`)
    return source.image
  }
}

function drawPhoto(ctx, photo) {
  // Widgets can't rotate images, so the photo floats by moving up and down,
  // drifting sideways and growing slightly as it rises.
  const scale = 1 + (-floatY / 14) * 0.04
  const maxW = 230 * scale
  const maxH = 190 * scale
  const fit = Math.min(maxW / photo.size.width, maxH / photo.size.height)
  const w = photo.size.width * fit
  const h = photo.size.height * fit
  const x = cx - w / 2 - Math.sin(t / 59) * 6
  const y = 140 + floatY - h / 2
  ctx.drawImageInRect(photo, new Rect(x, y, w, h))
}

function drawCup(photo) {
  const ctx = new DrawContext()
  ctx.size = new Size(W, H)
  ctx.opaque = false
  ctx.respectScreenScale = true
  drawShadow(ctx)
  drawCrumbs(ctx)
  if (photo) {
    drawPhoto(ctx, photo)
  } else {
    drawSide(ctx)
    drawTop(ctx)
  }
  return ctx.getImage()
}

function buildWidget(photo) {
  const widget = new ListWidget()
  const bg = new LinearGradient()
  bg.colors = [new Color(BG_TOP), new Color(BG_BOTTOM)]
  bg.locations = [0, 1]
  widget.backgroundGradient = bg
  widget.setPadding(0, 0, 0, 0)
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000)

  const image = widget.addImage(drawCup(photo))
  image.centerAlignImage()
  image.applyFillingContentMode()
  return widget
}

const widget = buildWidget(await loadPhoto())
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentSmall()
}
Script.complete()
