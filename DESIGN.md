---
name: Compartilhar Tela
description: Watch together from home; the room link is a numbered roll ticket, the only way in.
colors:
  room: "#16100e"
  room-2: "#1e1613"
  room-3: "#2a201c"
  line: "#3a2d28"
  line-2: "#4d3c35"
  ink: "#f3ece2"
  ink-2: "#bcac9e"
  ink-3: "#96857a"
  ticket: "#a3262a"
  ticket-2: "#8c1f23"
  ticket-ink: "#fbeee6"
  ticket-ink-2: "#f0c9bd"
  live: "#ff4b3e"
  wait: "#e9a13b"
  ok: "#5cc98a"
  err: "#ff9e8a"
  stock-1: "#f2c230"
  stock-2: "#5b95e8"
  stock-3: "#ec74a6"
  stock-4: "#4cbb80"
  stock-5: "#f39a45"
  stock-ink: "#1a120e"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(34px, 6vw, 54px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(22px, 2.6vw, 30px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  serial:
    fontFamily: "Archivo Narrow, Arial Narrow, system-ui, sans-serif"
    fontSize: "min(32px, 13.2cqi)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.04em"
  lede:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Archivo Narrow, Arial Narrow, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.16em"
  numeral:
    fontFamily: "Archivo Narrow, Arial Narrow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
    fontFeature: "tnum"
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  hair: "1px"
  chip: "2px"
  overlay: "4px"
  r: "6px"
  round: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button:
    backgroundColor: "{colors.room-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "9px 16px"
    height: "42px"
  button-hover:
    backgroundColor: "#33271f"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.room}"
    rounded: "{rounded.r}"
    padding: "9px 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "#ffffff"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.r}"
    padding: "9px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.room-2}"
    textColor: "{colors.ink}"
  tool:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.r}"
    size: "40px"
  tool-pressed:
    backgroundColor: "{colors.room-3}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.room-3}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.r}"
    padding: "9px 12px"
    height: "42px"
  ticket-body:
    backgroundColor: "{colors.ticket}"
    textColor: "{colors.ticket-ink}"
    rounded: "{rounded.r}"
    padding: "16px 18px 18px"
  ticket-stub:
    backgroundColor: "{colors.ticket-2}"
    textColor: "{colors.ticket-ink}"
    typography: "{typography.numeral}"
    width: "104px"
  ticket-stub-hover:
    backgroundColor: "#7a1a1e"
  stock-label:
    backgroundColor: "{colors.stock-1}"
    textColor: "{colors.stock-ink}"
    typography: "{typography.numeral}"
    padding: "0 12px"
  admission-row:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: "46px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.room}"
    rounded: "{rounded.r}"
    padding: "11px 16px"
---

# Design System: Compartilhar Tela

## Overview

**Creative North Star: "Ingresso de Rolo"**

The interface is a darkened auditorium with one paper object in it: the roll ticket. The ground is a warm near-black that recedes so the picture can own the screen, and the only saturated surfaces are card stock. A red ticket is the room's link and key; small coloured stock tags name each person who is sharing, and the same stock follows that person from their video label to their row in the admissions list. Everything else is ink on dark: quiet borders, hairline rules, tabular figures.

Density is that of an operating panel, not a landing page. The room is a stage plus a fixed side column; the side column reads top to bottom as ticket, admissions, then your own screen with its settings and upload budget. Condensed ticket lettering (Archivo Narrow) carries serials, numbers and labels; Archivo carries the sentences. Motion is short, eased out and paper-like: the stub tears off and reprints, a new admission is stamped in place. Reduced motion collapses all of it.

The world explicitly rejects the video-call default: slate-grey ground, a blue accent, avatar circles.

**Key Characteristics:**
- Warm near-black auditorium ground in three steps, never neutral grey.
- One paper object (the red ticket) with perforation and stub notches.
- Card-stock colour as identity: five sharer stocks, one per person, reused on tile and row.
- A reserved live red used only for "ao vivo" state.
- Condensed, tracked, tabular numerals for serials, admission numbers and budgets.
- Flat panels separated by 1px rules; depth only on the ticket and the toast.

## Colors

A warm dark ground with paper-stock colours that each carry one meaning.

### Primary
- **Room Ticket Red** (`ticket`): the ticket body that holds the room serial and link, and the entry forms that lead into a room. It means "this is the key".
- **Stub Red** (`ticket-2`): the tear-off stub, one step darker than the body so the perforation reads as a fold.
- **Ticket Paper White** (`ticket-ink`) and **Ticket Blush** (`ticket-ink-2`): text, perforation dashes and secondary text printed on the ticket.

### Secondary
- **Sharer Stocks** (`stock-1` Yellow, `stock-2` Blue, `stock-3` Pink, `stock-4` Green, `stock-5` Orange): one per sharer, assigned in order and freed when they stop. Shown as the solid label at the foot of their video tile and as a small chip on their admission row. Text on a stock is always `stock-ink`.

### Tertiary
- **On-Air Red** (`live`): the live signal only: pulsing lamp, "ao vivo" header count, live state in the tile strip and admissions.
- **Signals**: `wait` amber (connecting lamp), `ok` green (connected/audio lamp), `err` salmon (error text, danger hover).

### Neutral
- **Auditorium** (`room`): page ground, header (at 92% with blur), scrollbar track.
- **Auditorium Raised** (`room-2`): ghost hover, fix-it boxes, select menus.
- **Seat Fabric** (`room-3`): buttons, inputs, pressed tools.
- **Rule** (`line`) and **Rule Strong** (`line-2`): 1px dividers and control borders.
- **Ink** (`ink`), **Ink Muted** (`ink-2`), **Ink Faint** (`ink-3`): primary text, secondary text and labels, admission numbers and idle states.

### Named Rules
**The Reserved Red Rule.** `live` means "on air" and nothing else. It is never a button colour, a link colour or decoration.

**The Stock Is the Person Rule.** A sharer's stock colour appears wherever that person appears (video label, admission chip) and nowhere else. Red is not a sharer stock; it belongs to the ticket and the live signal.

**The Warm Dark Rule.** Neutrals carry a red-brown hue (around 40 degrees). Do not introduce cool or pure grey surfaces; the only true black is the video letterbox (`#000`).

## Typography

**Display Font:** Archivo (with system-ui fallback), weights 400 to 700
**Label/Numeral Font:** Archivo Narrow (with Arial Narrow fallback), weights 500 to 700
**Mono:** ui-monospace (Cascadia Mono, Consolas) for the raw link and video stats

**Character:** Archivo speaks in plain sentences; Archivo Narrow is the ticket printer, tracked wide and set in tabular figures. Both fonts are self-hosted via Fontsource.

### Hierarchy
- **Display** (700, clamp 34 to 54px, 1.02, -0.025em, balanced): the single headline of an entry screen (create, join, left).
- **Headline** (700, clamp 22 to 30px, 1.15): the message shown on an empty stage.
- **Serial** (Narrow 700, up to 32px scaled to the ticket width, 0.04em, no wrap): the room code on the ticket, grouped in fours with middle dots.
- **Lede** (400, 17px, 1.55, max 52ch): the one supporting paragraph under the display line.
- **Body** (400, 15px, 1.5) and **Body Small** (14px, 1.45): UI text, guide steps, member names.
- **Label** (Narrow 700, 12px, 0.16em, uppercase): side-panel headings ("Na sala", "Sua tela"); field labels use 600 at 0.1em.
- **Numeral** (Narrow 600 to 700, 13 to 15px, 0.02 to 0.12em, tabular): admission numbers ("Nº 001"), stock labels, ledger values, budget totals, state words.

### Named Rules
**The Ticket Printer Rule.** Every number a person compares or reads off (serials, admission numbers, Mbps, resolutions) is set in Archivo Narrow with tabular figures. Sentences never are.

**The One Headline Rule.** Display size appears once per entry screen and never inside the room, where the picture is the headline.

## Layout

The room is a two-column grid: a fluid stage and a fixed side column (380px; 340px below 1100px), under a sticky 56px header (52px on phones). Below 920px the columns stack, video first, ticket and admissions after. Below 640px the stage goes edge to edge (frames lose their radius and inset rule).

The stage auto-fits tiles at a 460px minimum; a single tile fills it; a focused tile spans the full row with the rest at 240px below. All frames share one registration: 16:9, black letterbox, a strip beneath with stock label, name, state and tools.

Entry screens are a single centred column (max 600px) with display line, lede, the ticket form, and a ruled fact list.

Spacing runs on 6, 8, 12, 16, 24, 32px, with side-panel sections 28px apart and the stage padded 24px (16px on tablet). Lists use fixed columns so values change in place: admissions are 58px number, flexible name, auto state; the ledger and budget are label left, value right.

## Elevation & Depth

Flat by default. Panels, lists and controls sit on the ground separated by 1px rules (`line`). Depth is reserved for objects that are physically "on top".

### Shadow Vocabulary
- **Ticket lift** (`filter: drop-shadow(0 10px 18px rgba(0,0,0,.35))`): the ticket only; a drop-shadow so it follows the notched mask.
- **Toast** (`box-shadow: 0 12px 30px rgba(0,0,0,.45)`): the transient confirmation.
- **Frame registration** (`box-shadow: inset 0 0 0 1px` `line`): video frames, preview and the empty stage.
- **Live lamp pulse** (`0 0 0 0` to `0 0 0 7px` of `live` at 0): the only animated glow.

### Named Rules
**The Paper Floats Rule.** Only the ticket and the toast cast shadows. Panels and tiles never do.

## Shapes

One corner radius (6px) on controls, frames, ticket and toast; 4px on overlays printed over video; 2px on stock chips; circles only for status lamps and guide-step numbers. The ticket is the only cut shape: radial-gradient masks bite 9px notches where body meets stub, and a dashed 2px-by-9px perforation runs along the stub's edge. On narrow containers (set by script) the stub moves below the body and the notches and perforation rotate with it. The stock label squares off its outer corner into the frame's bottom-left.

**The One Paper Object Rule.** Perforation and notches belong to the ticket and its miniature (brand mark, favicon, ticket icon). Panels, tiles, buttons and inputs are never perforated or notched.

## Components

### Buttons
Solid, quiet, warm.
- **Shape:** gently rounded (6px), 42px minimum height, 600 14px Archivo, 8px icon gap.
- **Default:** seat-fabric fill with a strong rule border; hover brightens the border to `ink-3`; active nudges down 1px.
- **Primary:** ink-filled with dark text; hover goes to pure white. One primary per area (share, rejoin).
- **Ghost:** transparent, muted ink; hover gains raised ground and a rule border. Used for "Sair da sala".
- **Danger:** default at rest; hover turns border and text `err`.
- **Disabled:** 45% opacity.

### Tools
40px square icon buttons in the tile strip (mute, stats, focus, fullscreen). Transparent at rest; pressed state keeps the seat-fabric fill and strong border. Icons are 18 to 19px stroked line SVGs (1.75 stroke, round caps).

### Inputs / Fields
- **Style:** seat-fabric fill, strong rule border, 6px radius, 42px height; selects carry a muted chevron.
- **Label:** uppercase Narrow label above, with optional qualifier ("opcional") in sentence case.
- **On the ticket:** translucent dark fill with paper-white border and text.
- **Focus:** global 2px `stock-1` outline at 2px offset; on the ticket the outline turns `ticket-ink`.

### Ticket (signature)
The room's link as a roll ticket: red body (serial, link in mono) plus a darker stub (icon and action, "Destacar e copiar" / "Criar sala" / "Entrar"). The stub is the button. On copy the stub tears (0.62s: lift, rotate 14 degrees, fall away) and reprints from the perforation (0.45s clip reveal), with a toast confirming. Entry tickets are wider (128px stub).

### Tile strip
Under every frame: a solid stock label ("Nº 002") flush left, name and state ("ao vivo" in `live`), then tools. The strip ends in a 1px rule.

### Admissions list
An ordered, ruled list: Narrow numeral "Nº 001", name with muted qualifier, state with the person's stock chip when sharing. New rows stamp their number in (0.5s scale from 1.5).

### Ledger and Budget
The settings ledger is a two-column definition list (muted label, right-aligned Narrow value) that states each setting's consequence. The upload budget is a row of segments, one per viewer (filled `ink` when connected, outlined when pending), with the Mbps total right-aligned in Narrow.

### Navigation
A sticky header: ticket brand mark plus tracked uppercase wordmark, connection lamp and status, on-air count in `live`, and a ghost leave button pushed right. On phones in the room the wordmark and leave label collapse to icons.

### Toast
Ink-filled card (6px), dark text, bottom-centre, rises 12px and fades in.

## Do's and Don'ts

### Do:
- **Do** keep the ground warm near-black (`room`, `room-2`, `room-3`) and let the video letterbox be the only pure black.
- **Do** give each sharer one stock and repeat it on their tile label and admission chip.
- **Do** set serials, admission numbers, Mbps and resolutions in Archivo Narrow with tabular figures.
- **Do** separate side-panel content with 1px `line` rules and fixed columns so state changes in place.
- **Do** show what a setting costs (ledger, budget) next to the setting.
- **Do** keep motion short and eased out (`cubic-bezier(.16, 1, .3, 1)`, 0.15 to 0.62s) and honour reduced motion.

### Don't:
- **Don't** use `live` red for anything but live state.
- **Don't** use red as a sharer stock or as a button fill outside the ticket.
- **Don't** perforate or notch anything except the ticket and its miniature mark.
- **Don't** add avatar circles, a blue accent, or slate-grey surfaces.
- **Don't** put shadows on panels, tiles or buttons.
