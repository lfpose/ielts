#!/usr/bin/env bash
# ╔══════════════════════════════════════════════╗
# ║  CREATIVE CANVAS — edit this file freely!    ║
# ║  dev.sh will hot-reload on every save.       ║
# ╚══════════════════════════════════════════════╝
#
# Variable-weight typographic rendering.
# Characters chosen by brightness density.
# Morphs between saved shapes. Warm chromatic CA.
# Contract: runs until killed.

set -euo pipefail

E=$'\033'
CR=$'\r'
RST="${E}[0m"
CLR="${E}[K"
BSU="${E}[?2026h"
ESU="${E}[?2026l"

# All output to terminal directly (not stdout — we may be backgrounded)
exec 3>/dev/tty 2>/dev/null || exec 3>&1

printf '%s' "${E}[?25l" >&3
trap 'printf "%s%s%s" "${E}[?2026l" "${E}[?25h" "${E}[0m" >&3 2>/dev/null; printf "\r%*s\r" "$(tput cols 2>/dev/null || echo 80)" "" >&3 2>/dev/null' EXIT INT TERM

GW=36
GH=12
NF=0

LABEL="${ANIM_LABEL:-Working...}"

# Generate frames into a temp file — Python streams, bash reads incrementally
FRAME_FILE=$(mktemp /tmp/anim_frames.XXXXXX)
trap 'rm -f "$FRAME_FILE"; printf "%s%s%s" "${E}[?2026l" "${E}[?25h" "${E}[0m" >&3 2>/dev/null; printf "\r%*s\r" "$(tput cols 2>/dev/null || echo 80)" "" >&3 2>/dev/null' EXIT INT TERM

# Start Python generation in background — writes to temp file
python3 -c "
import math, sys

ESC = chr(27)
PI2 = 2 * math.pi
CA_H = 1
CA_V = 1
TH = 0.06

W = 36
H = 12
R = min(W, H) * 0.32

PAL = {
    4: (255, 95, 55),
    2: (230, 185, 45),
    1: (75, 145, 195),
    6: (255, 185, 55),
    5: (225, 105, 145),
    3: (140, 200, 165),
    7: (255, 255, 255),
}

# Density ramp — light to heavy visual weight
RAMP = ' .·:;+*%#@'

def col(cr, cg, cb, ch):
    return ESC + '[38;2;' + str(cr) + ';' + str(cg) + ';' + str(cb) + 'm' + ch + ESC + '[0m'

def bmap(gw, gh, sfn, ldx, ldy, ldz, hhx, hhy, hhz, t):
    mw = gw + 2 * CA_H
    mh = gh + 2 * CA_V
    cx = (gw - 1) / 2.0
    cy = (gh - 1) / 2.0
    return [[sfn(mx - CA_H, my - CA_V, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t) for mx in range(mw)] for my in range(mh)]

def render_typo(bm, gw, gh):
    n = len(RAMP) - 1  # index range for non-space chars
    rows = []
    for gy in range(gh):
        cells = []
        for gx in range(gw):
            # CA offsets
            rv = bm[gy + CA_V][gx + 2 * CA_H]
            gv = bm[gy + 2 * CA_V][gx + CA_H]
            bv = bm[gy + CA_V][gx]

            # Color from channel on/off
            k = (int(rv > TH) << 2) | (int(gv > TH) << 1) | int(bv > TH)
            if not k:
                cells.append(' ')
                continue

            cr, cg, cb = PAL[k]

            # Brightness = max of active channels → pick character weight
            bright = max(rv, gv, bv)
            idx = min(n, int(bright * n + 0.5))
            if idx < 1: idx = 1  # at least lightest visible char
            ch = RAMP[idx]

            cells.append(col(cr, cg, cb, ch))
        rows.append(''.join(cells))
    return rows

def lit(sx, sy, sz, ldx, ldy, ldz, hhx, hhy, hhz):
    diff = max(0.0, sx*ldx + sy*ldy + sz*ldz)
    spec = max(0.0, sx*hhx + sy*hhy + sz*hhz) ** 32
    return min(1.0, diff * 0.85 + spec * 0.55)

# ── Shapes ──

def sphere(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    r2 = sx*sx + sy*sy
    if r2 > 1.0: return 0.0
    return lit(sx, sy, math.sqrt(1.0 - r2), ldx, ldy, ldz, hhx, hhy, hhz)

def ring(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    d = math.sqrt(sx*sx + sy*sy)
    if d < 0.38 or d > 1.0: return 0.0
    sz = max(0.1, 1.0 - abs(d - 0.68) / 0.32)
    return lit(sx, sy, sz, ldx, ldy, ldz, hhx, hhy, hhz)

def gear(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    d = math.sqrt(sx*sx + sy*sy)
    a = math.atan2(sy, sx)
    if d < 0.18: return 0.0
    teeth = 0.6 + 0.2 * (1.0 if math.sin(8*a + t) > 0.3 else 0.0)
    if d > teeth or d < 0.32: return 0.0
    return lit(sx * 0.3, sy * 0.3, 0.7, ldx, ldy, ldz, hhx, hhy, hhz)

def helix(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    if abs(sy) > 1.0: return 0.0
    w1 = math.sin(sy * 4.0 + t) * 0.42
    w2 = math.sin(sy * 4.0 + t + 3.14) * 0.42
    if abs(sx - w1) < 0.15 or abs(sx - w2) < 0.15:
        return lit(sx * 0.3, sy * 0.3, 0.8, ldx, ldy, ldz, hhx, hhy, hhz)
    ry = (sy * 4.0 + t) % PI2
    if ry % 1.5 < 0.25:
        mid = (w1 + w2) / 2; hw = abs(w1 - w2) / 2
        if abs(sx - mid) < hw: return 0.5
    return 0.0

def spiral(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    d = math.sqrt(sx*sx + sy*sy)
    if d > 1.0 or d < 0.04: return 0.0
    a = math.atan2(sy, sx)
    s = (a + d * 6.0 + t) % PI2
    if s > 1.6: return 0.0
    return lit(sx * 0.3, sy * 0.3, max(0.1, 1.0 - d), ldx, ldy, ldz, hhx, hhy, hhz)

def plasma(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    d = math.sqrt(sx*sx + sy*sy)
    if d > 0.92: return 0.0
    if d < 0.12: return 0.9
    a = math.atan2(sy, sx)
    for i in range(6):
        arc_a = i * PI2 / 6 + t
        da = ((a - arc_a + math.pi) % PI2) - math.pi
        wiggle = math.sin(d * 15 + t * 3 + i * 2) * 0.15
        if abs(da + wiggle) < 0.08: return 0.5 + 0.4 * (1.0 - d)
    return 0.0

def breathring(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    d = math.sqrt(sx*sx + sy*sy)
    inner = 0.3 + 0.12 * math.sin(t * 2)
    outer = 0.75 + 0.1 * math.sin(t * 2 + 1)
    if d < inner or d > outer: return 0.0
    mid = (inner + outer) / 2
    sz = 1.0 - abs(d - mid) / ((outer - inner) / 2)
    return lit(sx, sy, sz, ldx, ldy, ldz, hhx, hhy, hhz)

def azathoth(x, y, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t):
    sx = (x - cx) / R; sy = (y - cy) / R
    d = math.sqrt(sx*sx + sy*sy)
    a = math.atan2(sy, sx)
    if d > 0.92: return 0.0
    if d < 0.18: return 0.65 + 0.25 * math.sin(a * 7 + t * 5) * math.sin(d * 25 + t * 8)
    for i in range(9):
        arm_a = i * PI2 / 9 + t * 0.5
        da = ((a - arm_a + math.pi) % PI2) - math.pi
        wiggle = math.sin(d * 10 + t * 3 + i * 1.7) * 0.2
        thickness = 0.1 * (1.0 - d * 0.8)
        if abs(da + wiggle) < thickness: return 0.3 + 0.4 * (1.0 - d)
    noise = math.sin(sx * 30 + t) * math.sin(sy * 30 - t * 0.7)
    if noise > 0.8 and d > 0.3: return 0.2
    return 0.0

SHAPES = [
    sphere, sphere, ring, breathring, sphere,
    gear, helix, spiral, plasma, azathoth,
]

FPS = 60
HOLD = 180
TRANSITION = 45
SEGMENT = HOLD + TRANSITION
N_SHAPES = len(SHAPES)
TOTAL_FRAMES = N_SHAPES * SEGMENT

mw = W + 2 * CA_H
mh = H + 2 * CA_V

for f in range(TOTAL_FRAMES):
    seg = f // SEGMENT
    seg_frame = f % SEGMENT
    shape_a = SHAPES[seg % N_SHAPES]
    shape_b = SHAPES[(seg + 1) % N_SHAPES]
    t = f * PI2 / (FPS * 4)

    ldx = math.cos(t) * 0.6
    ldy = -0.2
    ldz = math.sin(t) * 0.6 + 0.4
    ll = math.sqrt(ldx*ldx + ldy*ldy + ldz*ldz)
    ldx /= ll; ldy /= ll; ldz /= ll
    hhx = ldx; hhy = ldy; hhz = ldz + 1.0
    hhl = math.sqrt(hhx*hhx + hhy*hhy + hhz*hhz)
    hhx /= hhl; hhy /= hhl; hhz /= hhl

    cx = (W - 1) / 2.0
    cy = (H - 1) / 2.0

    if seg_frame < HOLD:
        bm = [[shape_a(mx - CA_H, my - CA_V, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t) for mx in range(mw)] for my in range(mh)]
    else:
        blend = (seg_frame - HOLD) / float(TRANSITION)
        blend = blend * blend * (3 - 2 * blend)
        bm = []
        for my in range(mh):
            row = []
            for mx in range(mw):
                va = shape_a(mx - CA_H, my - CA_V, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t)
                vb = shape_b(mx - CA_H, my - CA_V, cx, cy, ldx, ldy, ldz, hhx, hhy, hhz, t)
                row.append(va * (1 - blend) + vb * blend)
            bm.append(row)

    rows = render_typo(bm, W, H)
    for row in rows:
        sys.stdout.write(row + '\n')
    sys.stdout.flush()
sys.stderr.write(str(TOTAL_FRAMES))
" > "$FRAME_FILE" 2>/tmp/anim_nf &
GEN_PID=$!

# ── Spinner ──
SP=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

# ── Layout ──
PAD="  "
GAP=3
TR=$((GH / 2))

# Wait for at least 1 full frame (GH lines) before starting
while true; do
    LINES_READY=$(wc -l < "$FRAME_FILE" 2>/dev/null || echo 0)
    ((LINES_READY >= GH)) && break
    sleep 0.05
done

# Load available lines into array
declare -a FL
load_frames() {
    local idx=0
    while IFS= read -r line; do
        FL[$idx]="$line"
        idx=$((idx+1))
    done < "$FRAME_FILE"
    LOADED=$idx
}

load_frames

for ((i=0; i<GH; i++)); do echo >&3; done

SECONDS=0
f=0 si=0

while true; do
    # Reload if generator is still running and we're near the end
    FRAMES_AVAIL=$((LOADED / GH))
    if kill -0 "$GEN_PID" 2>/dev/null && ((f >= FRAMES_AVAIL - 2)); then
        load_frames
        FRAMES_AVAIL=$((LOADED / GH))
    fi

    # Wrap to available frames
    ((FRAMES_AVAIL > 0)) || { sleep 0.05; continue; }
    frame=$((f % FRAMES_AVAIL))

    printf -v es "%4ds" "$SECONDS"

    buf="${BSU}${E}[${GH}A"
    for ((ri=0; ri<GH; ri++)); do
        idx=$((frame*GH+ri))
        if ((ri==TR)); then
            buf+="${CR}${PAD}${FL[$idx]}$(printf '%*s' $GAP '')${E}[38;2;140;200;165m${SP[$si]}${RST}  ${E}[1m${LABEL}${RST}  ${E}[2m${es}${RST}${CLR}"$'\n'
        else
            buf+="${CR}${PAD}${FL[$idx]}${CLR}"$'\n'
        fi
    done
    buf+="${ESU}"

    printf '%s' "$buf" >&3

    si=$(( (si+1) % 10 ))
    f=$((f+1))

    # Once fully loaded, get total and loop properly
    if ! kill -0 "$GEN_PID" 2>/dev/null; then
        NF=$(cat /tmp/anim_nf 2>/dev/null || echo "$FRAMES_AVAIL")
        if ((NF > 0)); then
            f=$((f % NF))
        fi
    fi

    sleep 0.017
done
