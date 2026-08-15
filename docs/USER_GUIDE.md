# User Guide

Kart Circuit is a solo time-trial kart racer. You race the clock over
3 laps of a closed circuit; the timer starts the moment you first
accelerate.

![Start line](screenshots/01-start-line.png)

## Getting going

1. `npm install && npm run dev`, open http://localhost:5173
2. Hold **W** — the race clock starts on your first input
3. Cross the checkered start line to complete each lap; the pulsing orange
   gate (and the orange dot on the minimap) always marks your next
   checkpoint

## The HUD

- **Top-left** — lap counter; an `OFF TRACK` warning appears in amber when
  you leave the tarmac (the grass slows and unsettles the kart)
- **Top-right** — current lap time, best lap this race, last lap, FPS
- **Bottom-left** — speedometer and the drift charge bar (blue = tier 1,
  gold = tier 2)
- **Bottom-right** — minimap with your heading and the next gate

## Driving technique

**Brake before corners, accelerate out of them.** The kart has most grip
at moderate speed; steering authority tapers at high speed, so the fast
line through a corner is slow-in, fast-out.

**Use the whole road.** Kerbs are safe to clip; grass is not — hitting it
mid-corner costs far more time than a tidy line.

### Drifting and boost

Drifting is the core skill:

1. Approach a corner at speed (≥ ~43 km/h) with some steering already in
2. Hold **Shift** — the kart slides wide while turning sharper; the charge
   bar starts filling
3. Release **Shift** for a boost — hold the drift until the bar turns
   **gold** for the stronger tier-2 boost
4. Chain drifts through successive corners; boost tops out above normal
   max speed, so save it for the straights

![Drifting](screenshots/03-drift.png)

### Hills

The circuit rises and falls gently. Downhill straights give free speed and
are the best drift entries; uphill corners punish early acceleration.

## Troubleshooting

- **No sound until you press a key** — browsers block autoplay; any key
  unlocks audio. `M` toggles music
- **Stuck off-track far from the road** — the game auto-rescues you onto
  the centerline if you stray too far; press **R** for a full restart
- **Frame drops on hi-dpi** — rendering caps at 1.5× device pixel ratio;
  shrink the window if your GPU struggles
