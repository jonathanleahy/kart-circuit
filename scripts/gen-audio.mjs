#!/usr/bin/env node
// One-time asset generation against the ElevenLabs API.
// Usage:
//   node scripts/gen-audio.mjs           generate missing assets
//   node scripts/gen-audio.mjs --dry     show plan, call nothing
//   node scripts/gen-audio.mjs --force   regenerate even if files exist
// Token is read from .env (ELEVENLABS_API_KEY=...). Never committed, never bundled.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SFX_DIR = path.join(ROOT, 'public', 'sfx')
const MUSIC_DIR = path.join(ROOT, 'public', 'music')
const DRY = process.argv.includes('--dry')
const FORCE = process.argv.includes('--force')

function loadToken() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return null
  const m = fs
    .readFileSync(envPath, 'utf8')
    .match(/^\s*ELEVENLABS_API_KEY\s*=\s*["']?([^"'\r\n#]+?)["']?\s*$/m)
  return m ? m[1].trim() : null
}

const SFX = [
  {
    file: 'checkpoint.mp3',
    prompt:
      'Bright retro arcade checkpoint chime, single clean positive ping, racing game UI sound',
    duration: 1.2,
  },
  {
    file: 'lap.mp3',
    prompt:
      'Short triumphant arcade fanfare, two ascending synth notes, racing game lap complete jingle',
    duration: 2,
  },
  {
    file: 'finish.mp3',
    prompt:
      'Triumphant arcade victory fanfare, celebratory ascending melody with sparkle, racing game win jingle',
    duration: 4,
  },
  {
    file: 'go.mp3',
    prompt:
      'Single sharp retro arcade race start beep, clean square wave blip, energetic',
    duration: 1,
  },
  {
    file: 'skid.mp3',
    prompt:
      'Tire skid screech on asphalt, short and punchy, arcade racing game drift sound',
    duration: 1.5,
  },
]

const MUSIC = {
  file: 'loop.mp3',
  prompt:
    'Upbeat retro arcade racing music, driving synthwave beat, energetic and catchy, seamless loop, instrumental, no vocals',
  lengthMs: 90000,
}

async function genSfx(token, item) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: item.prompt,
      duration_seconds: item.duration,
      prompt_influence: 0.5,
    }),
  })
  if (!res.ok) {
    throw new Error(`SFX ${item.file}: HTTP ${res.status} ${await res.text()}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(path.join(SFX_DIR, item.file), buf)
  console.log(`  wrote sfx/${item.file} (${(buf.length / 1024).toFixed(0)} kB)`)
}

// UNTESTED ASSUMPTION: exact music endpoint paths/shape. Wrapped so SFX
// generation is unaffected if this needs adjusting after first real run.
async function genMusic(token) {
  const gen = await fetch('https://api.elevenlabs.io/v1/music/generate', {
    method: 'POST',
    headers: {
      'xi-api-key': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: MUSIC.prompt, music_length_ms: MUSIC.lengthMs }),
  })
  if (!gen.ok) {
    throw new Error(`HTTP ${gen.status} ${await gen.text()}`)
  }
  const contentType = gen.headers.get('content-type') ?? ''
  if (contentType.includes('audio')) {
    const buf = Buffer.from(await gen.arrayBuffer())
    fs.writeFileSync(path.join(MUSIC_DIR, MUSIC.file), buf)
    console.log(`  wrote music/${MUSIC.file} (${(buf.length / 1024).toFixed(0)} kB)`)
    return
  }
  const body = await gen.json()
  const id = body.generation_id ?? body.id
  if (!id) {
    throw new Error(`no generation id in response: ${JSON.stringify(body)}`)
  }
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const poll = await fetch(
      `https://api.elevenlabs.io/v1/music/generations/${id}`,
      { headers: { 'xi-api-key': token } },
    )
    const data = await poll.json()
    console.log(`  music: status ${data.status ?? 'unknown'}...`)
    if (data.status === 'done' || data.status === 'completed') {
      const url = data.download_url ?? data.audio_url ?? data.clip?.audio_url
      if (!url) {
        console.warn('  music: completed but no download url. Body:', data)
        return
      }
      const dl = await fetch(url)
      const buf = Buffer.from(await dl.arrayBuffer())
      fs.writeFileSync(path.join(MUSIC_DIR, MUSIC.file), buf)
      console.log(`  wrote music/${MUSIC.file} (${(buf.length / 1024).toFixed(0)} kB)`)
      return
    }
    if (data.status === 'failed' || data.status === 'error') {
      console.warn('  music: generation failed. Body:', data)
      return
    }
  }
  console.warn('  music: timed out waiting for generation')
}

async function main() {
  fs.mkdirSync(SFX_DIR, { recursive: true })
  fs.mkdirSync(MUSIC_DIR, { recursive: true })

  const plan = SFX.filter(
    (s) => FORCE || !fs.existsSync(path.join(SFX_DIR, s.file)),
  )
  const musicNeeded =
    FORCE || !fs.existsSync(path.join(MUSIC_DIR, MUSIC.file))

  if (DRY) {
    console.log('dry run — would generate:')
    for (const s of plan) console.log(`  sfx/${s.file} (${s.duration}s)`)
    if (musicNeeded) console.log(`  music/${MUSIC.file} (${MUSIC.lengthMs}ms)`)
    if (!plan.length && !musicNeeded) console.log('  nothing — all assets exist')
    return
  }

  const token = loadToken()
  if (!token) {
    console.error('ELEVENLABS_API_KEY missing: copy .env.example to .env and fill it in')
    process.exit(1)
  }

  let failures = 0
  for (const s of plan) {
    process.stdout.write(`generating sfx/${s.file}... `)
    try {
      await genSfx(token, s)
    } catch (err) {
      failures++
      console.error(`FAILED: ${err.message}`)
    }
  }

  if (musicNeeded) {
    console.log('generating music (async, may take a minute)...')
    try {
      await genMusic(token)
    } catch (err) {
      failures++
      console.warn(`  music failed: ${err.message} — SFX unaffected`)
    }
  }
  if (failures) process.exitCode = 1
}

await main()
