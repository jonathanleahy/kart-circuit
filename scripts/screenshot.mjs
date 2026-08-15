#!/usr/bin/env node
// Captures gameplay screenshots by driving the kart with synthetic input.
// Usage: node scripts/screenshot.mjs [url]
// Requires the dev server running (npm run dev).

import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const URL = process.argv[2] ?? 'http://localhost:5173'
const OUT_DIR = path.resolve(import.meta.dirname, '..', 'docs', 'screenshots')

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  // Shot 1: on the grid at the start line
  await page.screenshot({ path: path.join(OUT_DIR, '01-start-line.png') })

  // Shot 2: at speed on the first straight
  await page.keyboard.down('w')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: path.join(OUT_DIR, '02-at-speed.png') })

  // Shot 3: mid-drift with sparks and tire marks
  await page.keyboard.down('a')
  await page.keyboard.down('Shift')
  await page.waitForTimeout(1400)
  await page.screenshot({ path: path.join(OUT_DIR, '03-drift.png') })
  await page.keyboard.up('Shift')
  await page.keyboard.up('a')

  // Shot 4: boost release on the approach to a gate
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(OUT_DIR, '04-boost.png') })

  await browser.close()
  console.log(`wrote 4 screenshots to ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
