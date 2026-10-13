---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface brief: app (index.html), full flow

Scope: create room, join by link, room (watch + share + people + settings), left, room ended/not found. teste.html out of scope. Mode: Operate.

Audience/job: a sharer on a desktop PC streams a film or series with PC audio; friends and family watch from home, often on a phone, in the dark. Success: link to watching-with-sound in seconds; audio right on the first try; always visible who is in the room and who is sharing.

Constraints: Vite + vanilla JS, static GitHub Pages; pt-BR only; touch-first viewing. No approval/removal (does not exist). Keep all PeerJS/WebRTC behavior, restrictOwnAudio fallback, ?srv=, every quality option.

## Direction contract

THESIS: The room link is a roll ticket: numbered, tear-off, the only way in. Refuses the category default of a slate video-call grid with a blue accent and avatar circles.

OWN-WORLD: Darkened-auditorium ground (warm near-black, never neutral slate). Roll-ticket card stock as functional colour: red ticket for the room link; yellow/blue/pink/green/orange stocks tag each sharer (red is kept out of the sharer stocks because it belongs to the room ticket and the live signal), the same stock on their video label and their member row. One "ao vivo" signal colour used for live state only. Condensed ticket lettering (Archivo Narrow) for numerals, serials and labels in tabular figures; Archivo for UI text. Perforation and stub notch appear only on the ticket.

STORY: The visitor sees the picture first, understands the link is the key to the room, knows who is admitted and who is live, and the sharer sees what each setting costs in upload before choosing it.

FIRST VIEWPORT: Desktop room: slim header (name, live count) across; the video stage owns the left ~74%, with a ticket-stock label on each frame; right column 372px: red ticket (room serial from the hex code, URL, "Destacar e copiar" stub), numbered admissions list (Nº 001…) with fixed columns, then "Sua tela" card with the share action and upload budget. Phone: video full width on top, ticket and admissions below.

FORM: Ingresso de Rolo, position 4 of the ordered list (1 drive-in, 2 marquee, 3 videolocadora, 4 roll ticket, 5 TV ident, 6 cineclube riso, 7 chita); seed key 532fc1c2. Raises: reserved live colour (orienteering); upload as a budget with a right-aligned total (j-card); each setting shows its consequence (monochrome); all frames share one registration (botanical); member rows with fixed columns, state changes in place (split-flap). Signature interaction: "Destacar e copiar" tears the stub off along the perforation and copies the link; motion grammar is short, ease-out, paper-like (tear, stamp), reduced-motion respected.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open
Exact token values; minimum supported phone width (target 320px).
