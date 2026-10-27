// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: wine-bottle;

// Dr Pepper — a widget showing a soda can floating among rising bubbles, on
// the same dark maroon background as the peanut butter cup widget.
//
// iOS widgets are still images, so the can can't move continuously. Instead,
// every time iOS refreshes the widget the can is drawn at a slightly different
// height and tilt, and the bubbles move up, so it drifts around over the day.
//
// Want a real photo? Save a picture named drpepper.png (or dr-pepper.png,
// Dr Pepper.jpg, ...) in the Scriptable folder in the Files app, and the
// widget floats that instead. A cut-out with a see-through background looks
// best. The photo stays on your phone. Without a photo it draws a plain can.
//
// Battery: the picture is drawn once per refresh (a few milliseconds of work),
// with no internet, location or sensors. Refreshes are requested every
// 30 minutes, and iOS may space them out further.

const REFRESH_MINUTES = 30
// Any file named like drpepper.png, Dr Pepper.PNG, dr-pepper.jpg or
// dr_pepper.heic.
const PHOTO_PATTERN = /^dr[-_ ]?pepper(\.[a-z]+)*\.(png|jpe?g|heic)$/i

// Colours
const BG_TOP = "#2e0508"
const BG_BOTTOM = "#1c0201"
const CAN = [118, 16, 36]           // burgundy can body
const LID = [196, 196, 204]         // aluminium top and bottom
const BUBBLE = "#f3c1c9"

const family = config.widgetFamily || "small"
const W = family === "medium" ? 640 : 300
const H = 300

// Position of the can, driven by the clock so each refresh looks different.
const t = Date.now() / 60000 // minutes
const floatY = Math.sin(t / 47) * 14
const tilt = Math.sin(t / 71) * 0.22
const pitch = 0.26

const cx = W / 2
const R = 52          // can radius
const BODY = 150      // can height
const yTop = 62 + floatY
const yBottom = yTop + BODY
const pivot = { x: cx, y: (yTop + yBottom) / 2 }
const STRIPS = 36

function rotate(p) {
  const dx = p.x - pivot.x
  const dy = p.y - pivot.y
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  return new Point(pivot.x + dx * c - dy * s, pivot.y + dx * s + dy * c)
}

function ellipsePoint(centerY, radius, angle, scale = 1) {
  return rotate({
    x: cx + radius * scale * Math.cos(angle),
    y: centerY + radius * scale * pitch * Math.sin(angle),
  })
}

function polygon(points) {
  const path = new Path()
  path.move(points[0])
  for (const p of points.slice(1)) path.addLine(p)
  path.closeSubpath()
  return path
}

function ellipse(centerY, radius, scale = 1, steps = 48) {
  const pts = []
  for (let i = 0; i < steps; i++) {
    pts.push(ellipsePoint(centerY, radius, (i / steps) * Math.PI * 2, scale))
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

// Shading for a strip of the can facing angle a (0..π is the front).
// Light comes from the upper left, with a narrow shiny highlight.
function shadeAt(a) {
  const light = Math.PI * 0.72
  const diffuse = Math.max(0, Math.cos(a - light))
  const shine = Math.pow(Math.max(0, Math.cos(a - Math.PI * 0.62)), 24)
  return 0.45 + 0.55 * diffuse + 0.6 * shine
}

function drawShadow(ctx) {
  // Higher can -> smaller, fainter shadow.
  const lift = (floatY + 14) / 28
  const groundY = 272
  for (let i = 0; i < 6; i++) {
    const rx = (66 - lift * 12) * (1 - i * 0.12)
    const ry = rx * 0.18
    const path = new Path()
    path.addEllipse(new Rect(cx - rx, groundY - ry, rx * 2, ry * 2))
    fill(ctx, path, new Color("#000000", 0.1 + (1 - lift) * 0.04))
  }
}

function drawCan(ctx) {
  const step = Math.PI / STRIPS
  // Bottom rim (aluminium), then the body strips.
  for (let i = 0; i < STRIPS; i++) {
    const a0 = i * step
    const a1 = a0 + step
    fill(ctx, polygon([
      ellipsePoint(yBottom - 8, R, a0),
      ellipsePoint(yBottom - 8, R, a1),
      ellipsePoint(yBottom, R, a1, 0.86),
      ellipsePoint(yBottom, R, a0, 0.86),
    ]), rgb(LID, shadeAt((a0 + a1) / 2) * 0.8))
    fill(ctx, polygon([
      ellipsePoint(yTop + 8, R, a0),
      ellipsePoint(yTop + 8, R, a1),
      ellipsePoint(yBottom - 8, R, a1),
      ellipsePoint(yBottom - 8, R, a0),
    ]), rgb(CAN, shadeAt((a0 + a1) / 2)))
  }

  // A plain light band around the middle, in place of a label.
  for (let i = 0; i < STRIPS; i++) {
    const a0 = i * step
    const a1 = a0 + step
    const mid = yTop + BODY * 0.5
    fill(ctx, polygon([
      ellipsePoint(mid - 16, R, a0, 1.002),
      ellipsePoint(mid - 16, R, a1, 1.002),
      ellipsePoint(mid + 16, R, a1, 1.002),
      ellipsePoint(mid + 16, R, a0, 1.002),
    ]), new Color("#ffffff", 0.08 + 0.12 * Math.min(1, shadeAt((a0 + a1) / 2) - 0.45)))
  }

  // Top: neck, lid and the opening tab.
  for (let i = 0; i < STRIPS; i++) {
    const a0 = i * step
    const a1 = a0 + step
    fill(ctx, polygon([
      ellipsePoint(yTop, R, a0, 0.86),
      ellipsePoint(yTop, R, a1, 0.86),
      ellipsePoint(yTop + 8, R, a1),
      ellipsePoint(yTop + 8, R, a0),
    ]), rgb(LID, shadeAt((a0 + a1) / 2) * 0.9))
  }
  fill(ctx, ellipse(yTop, R, 0.86), rgb(LID, 1.05))
  fill(ctx, ellipse(yTop + 1, R, 0.74), rgb(LID, 0.82))
  const tab = [
    ellipsePoint(yTop + 1, R, Math.PI * 1.5, 0.05),
    ellipsePoint(yTop + 1, R, Math.PI * 1.5, 0.5),
  ]
  ctx.setStrokeColor(rgb(LID, 1.15))
  ctx.setLineWidth(9)
  const tabPath = new Path()
  tabPath.move(tab[0])
  tabPath.addLine(tab[1])
  ctx.addPath(tabPath)
  ctx.strokePath()
}

function drawBubbles(ctx) {
  // Bubbles rise a little further each refresh and wrap back to the bottom.
  const bubbles = [
    { x: -100, s: 6, speed: 0.9, offset: 0 },
    { x: -78, s: 4, speed: 1.3, offset: 90 },
    { x: 94, s: 7, speed: 0.7, offset: 40 },
    { x: 116, s: 4, speed: 1.1, offset: 150 },
    { x: 80, s: 3, speed: 1.6, offset: 210 },
    { x: -120, s: 3, speed: 1.2, offset: 230 },
  ]
  ctx.setLineWidth(1.5)
  for (const b of bubbles) {
    const y = H - 30 - ((t * b.speed + b.offset) % (H - 50))
    const x = cx + b.x + Math.sin(t / 13 + b.offset) * 4
    const path = new Path()
    path.addEllipse(new Rect(x - b.s, y - b.s, b.s * 2, b.s * 2))
    ctx.addPath(path)
    ctx.setStrokeColor(new Color(BUBBLE, 0.7))
    ctx.strokePath()
    const shine = new Path()
    shine.addEllipse(new Rect(x - b.s * 0.5, y - b.s * 0.6, b.s * 0.5, b.s * 0.5))
    fill(ctx, shine, new Color("#ffffff", 0.6))
  }
}

// Looks for the photo in the Scriptable folder (iCloud first, then on-device).
// When run in the app, it logs what it found to help with setup.
async function loadPhoto() {
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
        log(`Using ${name}`)
        return image
      }
      log(`Found ${name} but couldn't open it as a picture`)
    } catch (e) {
      log(`Found ${name} but couldn't open it: ${e}`)
    }
  }
  log("No drpepper.png found, drawing a can instead")
  return null
}

function drawPhoto(ctx, photo) {
  // Widgets can't rotate images, so the photo floats by moving up and down,
  // drifting sideways and growing slightly as it rises.
  const scale = 1 + (-floatY / 14) * 0.04
  const maxW = 200 * scale
  const maxH = 210 * scale
  const fit = Math.min(maxW / photo.size.width, maxH / photo.size.height)
  const w = photo.size.width * fit
  const h = photo.size.height * fit
  const x = cx - w / 2 + Math.sin(t / 59) * 6
  const y = 140 + floatY - h / 2
  ctx.drawImageInRect(photo, new Rect(x, y, w, h))
}

function drawScene(photo) {
  const ctx = new DrawContext()
  ctx.size = new Size(W, H)
  ctx.opaque = false
  ctx.respectScreenScale = true
  drawShadow(ctx)
  drawBubbles(ctx)
  if (photo) {
    drawPhoto(ctx, photo)
  } else {
    drawCan(ctx)
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

  const image = widget.addImage(drawScene(photo))
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
