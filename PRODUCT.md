# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + plain JavaScript (no UI framework), chosen by the owner for the redesign. Output is static files deployed to GitHub Pages (https://brunnoaires.github.io/compartilhar-tela/) via GitHub Actions; no own backend. The pre-redesign app was a single `index.html` with `peerjs.min.js`; `teste.html` (audio diagnostic) stays outside the redesign.

## Users

People watching something together at a distance: one person in the room shares a film, series, or video from their PC (with the PC's audio), and friends or family watch it live. Several people can be in a room, and anyone in it may share at the same time. Sharers are on a desktop browser (Chrome, Edge, or Firefox); viewers are often on a phone.

## Product Purpose

Make "let's watch this together" take one link: create a room, send the link, everyone sees and hears the same thing in high quality, with no account, no install, and no server owned by the project. Success is a viewer opening the link, typing an optional name, and watching with sound within seconds, and a sharer getting system audio working on the first try.

## Positioning

- **No login, no install:** open the link and you are in. No account, no app, no own server.
- **High quality:** up to 1440p at 60 fps with PC audio, sent peer to peer over WebRTC; the public PeerJS server is used only for the two ends to find each other.
- **Private by construction:** the room link carries a random 128-bit code; only link holders can join, and video never passes through a server. There is no fixed host: the room list lives in one participant's tab and another participant takes over automatically if that tab closes. Join approval and removing people do not exist (an older README claimed them); adding them is a separate product decision.
- **Many at once:** every person in the room can share their screen simultaneously.

All four must survive any redesign.

## Operating Context

- Typical flow: sharer creates a room → copies the link → sends it over a chat app → viewers open it, optionally type a name, and enter → sharer starts sharing and picks screen/tab with audio in the browser's native picker.
- Viewing happens on phones and on desktops, often fullscreen; sharing happens on a desktop.
- System audio depends on the browser picker: on Windows Chrome/Edge choose *Tela inteira* + *Compartilhar áudio do sistema*; in a tab, *Compartilhar áudio da aba*; macOS only shares tab audio. Getting this right is the most common friction point.
- A room closes after being empty for 5 minutes; people can leave and rejoin.
- Upload bandwidth is the real limit: each viewer costs the chosen bitrate (e.g. 12 Mbps × 3 viewers = 36 Mbps).

## Capabilities and Constraints

- Rooms: create, join by link, leave, rejoin, create a new room; member list with names and who is sharing.
- Sharing settings: quality (720p / 1080p / 1440p / native), frame rate (30 / 60), bitrate per viewer (4–35 Mbps), content hint (motion vs. detail), codec (H.264, VP9, AV1, VP8, browser default), PC audio mode (automatic, all sound, all except the browser via `restrictOwnAudio`, none).
- Live share: preview, audio status, who is receiving it, switch screen, stop sharing.
- Watching: multiple video tiles, focus one tile, fullscreen, volume, optional stats (resolution, fps, real bitrate).
- Audio fallback: if Windows refuses audio (`Could not start audio source`) the app retries with `restrictOwnAudio` and remembers the choice; `teste.html` diagnoses audio.
- Sharing is unavailable on phones (browser limitation); watching works there.
- `?srv=host:port` points to another PeerJS server.
- Interface language is Brazilian Portuguese today; whether to add other languages is undecided.
- Terminology in use: *sala* (room), *link da sala*, *compartilhar tela*, *áudio do PC*.

## Brand Commitments

Name: **Compartilhar Tela**. Voice in the current copy is plain, direct, second person, practical, and free of marketing. No logo or other brand assets exist; the existing visual design is explicitly discarded and must not constrain the redesign.

## Evidence on Hand

- `README.md`: how it works, audio guidance, tips.
- `teste.html`: audio diagnostic page.
- No users, testimonials, usage numbers, or benchmarks exist. Do not invent any.

## Product Principles

1. **One link, zero ceremony.** Every step between opening the link and watching is a cost; the name is optional and nothing else stands in the way.
2. **The picture is the product.** While watching, the video owns the screen, on a phone as much as on a TV-sized monitor; controls appear when needed and get out of the way.
3. **Sound must just work.** System audio is the hardest part, so guide the sharer through it at the moment of choosing, and recover automatically when the OS refuses.
4. **Privacy you can see.** Who is in the room and who is sharing is always visible; the link is the only key, so it is shown and handled like one.
5. **Honest about limits.** Say plainly what costs bandwidth, what a browser cannot do, and why something failed, in the user's own terms.

## Accessibility & Inclusion

No product-specific standard was set. Phone-sized viewing with touch is a primary case, so controls must be reachable and legible on small screens and in fullscreen.
