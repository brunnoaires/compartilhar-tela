import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo-narrow/500.css";
import "@fontsource/archivo-narrow/600.css";
import "@fontsource/archivo-narrow/700.css";
import { Peer } from "peerjs";

const $ = (id) => document.getElementById(id);
const ROOM_RE = /^tela-[0-9a-f]{32}$/;
const ROOM_TTL = 5 * 60 * 1000;   // sala que fica vazia por mais tempo que isso é encerrada
const KEEPER_SILENCE = 15000;     // sem notícias do organizador por esse tempo: reconecta
const MEMBER_SILENCE = 20000;     // o organizador tira da lista quem some por esse tempo
const STOCKS = 5;                 // cores de papel-cartão para quem transmite (--stock-1..5)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2800);
}

function show(id) {
  for (const s of ["landing", "join", "leftScreen", "room"]) $(s).hidden = s !== id;
  $("topbarRoom").hidden = id !== "room";
}

function icon(name, cls = "i") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", cls); svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#i-" + name);
  svg.append(use);
  return svg;
}
function setIcon(btn, name) { btn.querySelector("use").setAttribute("href", "#i-" + name); }

// número de série do ingresso: os primeiros 12 dígitos do código da sala
const serialOf = (roomId) => roomId.slice(5, 17).toUpperCase().match(/.{4}/g).join("·");
const pad3 = (n) => "Nº " + String(n).padStart(3, "0");
const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

// em telas estreitas o canhoto do ingresso de entrada vai para baixo
const narrowTicket = matchMedia("(max-width: 440px)");
function layoutEntryTickets() { for (const t of document.querySelectorAll(".ticket-entry")) t.classList.toggle("vertical", narrowTicket.matches); }
narrowTicket.addEventListener("change", layoutEntryTickets);
layoutEntryTickets();

// Permite apontar para outro servidor PeerJS: ?srv=host:porta (útil para testes ou servidor próprio)
function peerOptions() {
  const p = new URLSearchParams(location.search);
  const opts = { debug: 1 };
  const srv = p.get("srv");
  if (srv) {
    const [host, port] = srv.split(":");
    Object.assign(opts, { host, port: Number(port || 443), path: "/", secure: location.protocol === "https:" && host !== "localhost" });
  }
  return opts;
}

function randHex(bytes) {
  const b = new Uint8Array(bytes); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
const cleanName = (n) => String(n || "").replace(/\s+/g, " ").trim().slice(0, 40) || "Convidado";

// ---------- SDP: áudio estéreo em alta qualidade, início rápido e preferência de codec ----------
function stereoOpus(sdp) {
  const m = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i);
  if (!m) return sdp;
  const pt = m[1];
  const re = new RegExp("a=fmtp:" + pt + " (.*)", "i");
  const extra = "stereo=1;sprop-stereo=1;maxaveragebitrate=256000;cbr=0;useinbandfec=1";
  if (re.test(sdp)) {
    return sdp.replace(re, (line, params) => {
      const kept = params.split(";").filter((x) => !/^(stereo|sprop-stereo|maxaveragebitrate|useinbandfec)=/.test(x.trim()));
      return "a=fmtp:" + pt + " " + kept.concat(extra).join(";");
    });
  }
  return sdp.replace("a=rtpmap:" + pt + " opus/48000/2", "a=rtpmap:" + pt + " opus/48000/2\r\na=fmtp:" + pt + " " + extra);
}

// faz a taxa de bits começar alta (sem isso o WebRTC leva vários segundos subindo de ~300 kbps)
function fastStart(sdp) {
  return sdp.replace(/a=fmtp:(\d+) (.*)/g, (line, pt, params) => {
    const rtp = sdp.match(new RegExp("a=rtpmap:" + pt + " ([\\w-]+)/90000"));
    if (!rtp || /^(rtx|red|ulpfec|flexfec-03)$/i.test(rtp[1]) || /x-google-start-bitrate/.test(params)) return line;
    return line + ";x-google-start-bitrate=6000;x-google-min-bitrate=1500";
  });
}

function preferCodec(sdp, codec) {
  if (!codec || codec === "auto") return sdp;
  const lines = sdp.split("\r\n");
  const mIdx = lines.findIndex((l) => l.startsWith("m=video"));
  if (mIdx < 0) return sdp;
  let end = lines.findIndex((l, i) => i > mIdx && l.startsWith("m="));
  if (end < 0) end = lines.length;
  const section = lines.slice(mIdx, end);
  const preferred = [];
  section.forEach((l) => {
    const m = l.match(/^a=rtpmap:(\d+) ([\w-]+)\//);
    if (m && m[2].toUpperCase() === codec.toUpperCase()) preferred.push(m[1]);
  });
  if (!preferred.length) return sdp;
  // inclui o RTX associado a cada payload preferido
  section.forEach((l) => {
    const m = l.match(/^a=fmtp:(\d+) apt=(\d+)/);
    if (m && preferred.includes(m[2])) preferred.push(m[1]);
  });
  const parts = lines[mIdx].split(" ");
  const pts = parts.slice(3);
  lines[mIdx] = parts.slice(0, 3).concat(preferred, pts.filter((p) => !preferred.includes(p))).join(" ");
  return lines.join("\r\n");
}

// ---------- estatísticas de envio: mostra onde está o gargalo ----------
async function sendStats(pc, prev) {
  const rep = await pc.getStats();
  let out = null, src = null;
  rep.forEach((r) => {
    if (r.type === "outbound-rtp" && r.kind === "video") out = r;
    if (r.type === "media-source" && r.kind === "video") src = r;
  });
  if (!out) return null;
  const mbps = prev && out.timestamp > prev.ts ? ((out.bytesSent - prev.bytes) * 8) / (out.timestamp - prev.ts) / 1000 : 0;
  const codec = out.codecId && rep.get(out.codecId) ? rep.get(out.codecId).mimeType.replace("video/", "") : "";
  const impl = out.encoderImplementation || "";
  const hw = out.powerEfficientEncoder === true || /MediaFoundation|NVENC|Nvidia|VideoToolbox|VAAPI|Accelerat|ExternalEncoder/i.test(impl);
  const sw = !hw && (out.powerEfficientEncoder === false || /libvpx|OpenH264|libaom|dav1d|SVT/i.test(impl));
  return {
    next: { bytes: out.bytesSent, ts: out.timestamp },
    w: out.frameWidth, h: out.frameHeight, fps: out.framesPerSecond, capFps: src ? src.framesPerSecond : null,
    mbps, codec, enc: hw ? "placa de vídeo" : sw ? "processador" : "", limit: out.qualityLimitationReason || "none",
  };
}
function describeSend(s, wantFps) {
  const line = (s.w || "?") + "×" + (s.h || "?") + " · " + Math.round(s.fps || 0) + " fps · " + s.mbps.toFixed(1) + " Mbps · " +
    s.codec + (s.enc ? " (" + s.enc + ")" : "") + (s.capFps != null ? " · captura " + Math.round(s.capFps) + " fps" : "");
  let hint;
  if (s.limit === "cpu") hint = "O processador não está dando conta. Use o codec H.264, deixe o jogo em janela sem bordas e limite o FPS do jogo.";
  else if (s.limit === "bandwidth") hint = "A sua internet de upload está no limite. Diminua a taxa por pessoa ou a qualidade.";
  else if (s.capFps != null && s.capFps < wantFps * 0.75) hint = "A captura está em " + Math.round(s.capFps) + " fps. Num jogo, isso costuma ser tela cheia exclusiva: troque para janela sem bordas. Em tela parada é normal.";
  else if (s.enc === "processador") hint = "O vídeo está sendo codificado pelo processador. Se travar, escolha H.264 e veja se a aceleração de hardware do navegador está ligada.";
  else hint = "Envio sem gargalo. Se travar para alguém, o problema está na internet de quem assiste.";
  return { line, hint };
}

// =====================================================================
//  ORGANIZADOR DA SALA
//  Um Peer com o id da sala, rodando na aba de algum participante. Ele só guarda a lista de
//  quem está na sala; o vídeo vai direto de quem compartilha para cada pessoa. Se a aba dele
//  fecha, outro participante assume o id sozinho.
// =====================================================================
function startKeeper(roomId) {
  return new Promise((resolve) => {
    const kp = new Peer(roomId, peerOptions());
    const members = new Map(); // id -> { conn, name, sharing, seq, audio, no, seen }
    const startedAt = Date.now();
    let opened = false, dead = false, tick = null, nextNo = 1;
    const api = { destroy, get alive() { return !dead; } };

    const snapshot = () => [...members].map(([id, m]) => ({ id, name: m.name, sharing: m.sharing, seq: m.seq, audio: m.audio, no: m.no }));
    function broadcast() {
      const msg = { t: "state", members: snapshot(), age: Date.now() - startedAt };
      for (const m of members.values()) if (m.conn.open) { try { m.conn.send(msg); } catch {} }
    }
    // número de admissão: fica com a pessoa enquanto ela estiver na sala, mesmo se o organizador mudar
    function admissionNo(id, wanted) {
      const old = members.get(id);
      if (old) return old.no;
      const w = Number(wanted);
      const taken = (n) => [...members.values()].some((m) => m.no === n);
      const no = Number.isInteger(w) && w > 0 && w < 1000 && !taken(w) ? w : (() => { while (taken(nextNo)) nextNo++; return nextNo; })();
      nextNo = Math.max(nextNo, no + 1);
      return no;
    }
    function drop(id, conn) {
      const m = members.get(id);
      if (!m || (conn && m.conn !== conn)) return;
      members.delete(id);
      try { m.conn.close(); } catch {}
      broadcast();
    }
    function destroy() {
      if (dead) return;
      dead = true;
      clearInterval(tick);
      for (const m of members.values()) { try { m.conn.close(); } catch {} }
      members.clear();
      try { kp.destroy(); } catch {}
    }

    kp.on("open", () => {
      opened = true;
      tick = setInterval(() => {
        const now = Date.now();
        for (const [id, m] of members) if (now - m.seen > MEMBER_SILENCE) drop(id);
        broadcast();
      }, 5000);
      resolve(api);
    });
    kp.on("connection", (conn) => {
      if (!conn.metadata || conn.metadata.room !== roomId) { conn.close(); return; }
      conn.on("data", (d) => {
        if (!d || typeof d !== "object" || dead) return;
        if (d.t === "hello" || d.t === "update") {
          const old = members.get(conn.peer);
          if (old && old.conn !== conn) { try { old.conn.close(); } catch {} }
          const no = admissionNo(conn.peer, d.no);
          members.set(conn.peer, { conn, name: cleanName(d.name), sharing: !!d.sharing, seq: Number(d.seq) || 0, audio: !!d.audio, no, seen: Date.now() });
          broadcast();
        } else if (d.t === "ping") {
          const m = members.get(conn.peer);
          if (m && m.conn === conn) m.seen = Date.now();
        } else if (d.t === "bye") {
          drop(conn.peer, conn);
        }
      });
      conn.on("close", () => drop(conn.peer, conn));
      conn.on("error", () => drop(conn.peer, conn));
    });
    kp.on("disconnected", () => {
      setTimeout(() => { if (!dead && !kp.destroyed && kp.disconnected) { try { kp.reconnect(); } catch {} } }, 1500);
    });
    kp.on("error", (e) => {
      if (!opened) { dead = true; try { kp.destroy(); } catch {} resolve(null); return; }
      // outro participante pegou o id enquanto este estava sem internet: sai e deixa todos irem para o novo
      if (e.type === "unavailable-id") destroy();
    });
  });
}

// =====================================================================
//  PARTICIPANTE
// =====================================================================
function startRoom(roomId, myName, created) {
  show("room");
  document.title = "Sala · Compartilhar Tela";
  const me = { id: "tm-" + randHex(12), name: cleanName(myName), no: 0 };
  const roomKey = "ct-room-" + roomId;
  let peer = null, keeper = null, keeperConn = null, lastKeeperMsg = 0, connecting = false, left = false;
  let members = [], connState = "connecting", lastInRoom = 0;
  let myStream = null, shareSeq = 0, usedMode = "full", audioFailed = false;
  const outCalls = new Map();      // id -> { call, at }        (minha tela indo para cada pessoa)
  const inCalls = new Map();       // id -> { call, seq, name, tile, video, ... }  (telas chegando)
  const lastCallAttempt = new Map();
  let myStatsCall = null, myStatsPrev = null;
  const absentSince = new Map();
  const stockOf = new Map();       // id -> 1..5, a cor de papel-cartão de quem transmite
  const seenMembers = new Set();
  const canShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  // ---- quem pode reabrir uma sala vazia: só quem esteve nela nos últimos 5 minutos ----
  function touch() { lastInRoom = Date.now(); store.set(roomKey, String(lastInRoom)); }
  function canRevive() {
    const t = Math.max(lastInRoom, Number(store.get(roomKey) || 0));
    return Date.now() - t < ROOM_TTL;
  }
  if (created) touch();

  const link = new URL(location.href); link.hash = roomId;
  $("shareLink").value = link.toString();
  $("roomSerial").textContent = serialOf(roomId);
  if (!canShare) {
    $("shareBtn").hidden = true; $("noShareSupport").hidden = false;
    $("audioGuide").hidden = true; $("settings").hidden = true;
  }
  if (navigator.share && matchMedia("(pointer: coarse)").matches) $("nativeShareBtn").hidden = false;

  // cor de papel-cartão: a primeira livre entre quem está transmitindo agora
  function stockFor(id) {
    if (stockOf.has(id)) return stockOf.get(id);
    const used = new Set(stockOf.values());
    let s = 1; while (used.has(s) && s < STOCKS) s++;
    if (used.has(s)) s = (stockOf.size % STOCKS) + 1;
    stockOf.set(id, s);
    return s;
  }
  function releaseStocks() {
    const live = new Set(members.filter((m) => m.sharing).map((m) => m.id));
    for (const id of inCalls.keys()) live.add(id);
    if (myStream) live.add(me.id);
    for (const id of [...stockOf.keys()]) if (!live.has(id)) stockOf.delete(id);
  }
  const stockVar = (id) => "var(--stock-" + stockFor(id) + ")";

  // ---------------- conexão com o organizador ----------------
  function setConn(state) {
    connState = state;
    const st = $("roomStatus");
    st.textContent = "";
    const lamp = document.createElement("span");
    if (state === "ok") {
      const n = members.length;
      lamp.className = "lamp ok";
      st.append(lamp, n <= 1 ? "Só você na sala" : plural(n, "pessoa", "pessoas") + " na sala");
    } else if (state === "reconnecting") {
      lamp.className = "lamp wait";
      st.append(lamp, "Reconectando… quem já transmite continua");
    } else if (state === "waiting") {
      lamp.className = "lamp wait";
      st.append(lamp, "Sala vazia, esperando alguém voltar");
    } else {
      lamp.className = "lamp wait";
      st.append(lamp, "Conectando…");
    }
    const can = state === "ok" || state === "reconnecting";
    $("shareBtn").disabled = !can; $("stageShareBtn").disabled = !can;
    updateStage();
  }

  function tryConnect() {
    return new Promise((resolve) => {
      let settled = false, conn = null, timer = null;
      const onErr = (e) => {
        if (e && e.type === "peer-unavailable" && String(e.message).endsWith(" " + roomId)) finish("unavailable");
      };
      function finish(r) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        peer.off("error", onErr);
        if (r !== "ok" && conn) { try { conn.close(); } catch {} }
        resolve(r);
      }
      peer.on("error", onErr);
      try { conn = peer.connect(roomId, { reliable: true, metadata: { room: roomId } }); } catch {}
      if (!conn) { finish("timeout"); return; }
      timer = setTimeout(() => finish("timeout"), 10000);
      conn.on("open", () => { if (settled || left) { try { conn.close(); } catch {} return; } attachKeeperConn(conn); finish("ok"); });
      conn.on("error", () => finish("timeout"));
    });
  }

  function claimDelay() {
    const ids = members.map((m) => m.id).sort();
    const rank = ids.indexOf(me.id);
    return (rank > 0 ? rank * 700 : 0) + Math.floor(Math.random() * 400);
  }

  async function connectKeeper() {
    if (connecting || left) return;
    connecting = true;
    try {
      while (!left && !keeperConn) {
        if (!peer || !peer.open) { await sleep(1000); continue; }
        const r = await tryConnect();
        if (r === "ok" || left) break;
        if (r === "unavailable") {
          if (canRevive()) {
            await sleep(claimDelay());
            if (left || keeperConn) break;
            if (!keeper || !keeper.alive) {
              const k = await startKeeper(roomId);
              if (left) { if (k) k.destroy(); break; }
              if (k) { keeper = k; continue; }   // agora este participante é o organizador; conecta nele
            }
          } else {
            setConn("waiting");
          }
          await sleep(connState === "waiting" ? 4000 : 800);
        } else {
          await sleep(1500);
        }
      }
    } finally {
      connecting = false;
    }
  }

  function attachKeeperConn(conn) {
    keeperConn = conn;
    lastKeeperMsg = Date.now();
    touch();
    send({ t: "hello", ...myInfo() });
    conn.on("data", (d) => {
      if (keeperConn !== conn || !d || typeof d !== "object") return;
      lastKeeperMsg = Date.now();
      if (d.t === "state" && Array.isArray(d.members)) onState(d.members, Number(d.age) || 0);
    });
    conn.on("close", () => { if (keeperConn === conn) { keeperConn = null; onKeeperLost(); } });
  }

  function onKeeperLost() {
    if (left) return;
    setConn("reconnecting");
    connectKeeper();
  }

  const myInfo = () => ({ name: me.name, sharing: !!myStream, seq: shareSeq, audio: !!(myStream && myStream.getAudioTracks().length), no: me.no || undefined });
  function send(msg) { if (keeperConn && keeperConn.open) { try { keeperConn.send(msg); } catch {} } }

  function onState(list, age) {
    members = list.filter((m) => m && typeof m.id === "string").map((m) => ({ ...m, name: cleanName(m.name), no: Number(m.no) || 0 }));
    // o organizador pode ainda não ter a minha entrada (ex.: acabou de assumir)
    const self = members.find((m) => m.id === me.id);
    if (self) { if (self.no) me.no = self.no; }
    else members.push({ id: me.id, ...myInfo(), no: me.no });
    const now = Date.now();
    const ids = new Set(members.map((m) => m.id));
    // quem sumiu da lista: fecha as conexões. Um organizador recém-assumido pode ainda não conhecer todo mundo, então espera um pouco.
    for (const id of new Set([...inCalls.keys(), ...outCalls.keys()])) {
      if (ids.has(id)) { absentSince.delete(id); continue; }
      if (!absentSince.has(id)) absentSince.set(id, now);
      const grace = age < 15000 ? 20000 : 0;
      if (now - absentSince.get(id) >= grace) { closeOut(id); removeIncoming(id); absentSince.delete(id); }
    }
    for (const m of members) {
      const ic = inCalls.get(m.id);
      if (!ic) continue;
      if (!m.sharing && m.seq >= ic.seq) removeIncoming(m.id);   // parou de compartilhar
      else if (ic.name !== m.name) { ic.name = m.name; ic.nameEl.textContent = m.name; }
    }
    releaseStocks();
    setConn("ok");
    renderMembers();
    reconcile();
  }

  // ---------------- minha tela indo para os outros ----------------
  function reconcile() {
    if (!myStream || !peer || !peer.open || left) return;
    const now = Date.now();
    for (const m of members) {
      if (m.id === me.id) continue;
      const oc = outCalls.get(m.id);
      if (oc) {
        const st = oc.call.peerConnection ? oc.call.peerConnection.connectionState : "new";
        const stuck = (st === "new" || st === "connecting") && now - oc.at > 20000;
        if (st === "failed" || st === "closed" || stuck) closeOut(m.id); else continue;
      }
      if (now - (lastCallAttempt.get(m.id) || 0) < 5000) continue;
      callMember(m.id);
    }
    renderMyShare();
  }

  function callMember(id) {
    lastCallAttempt.set(id, Date.now());
    const c = cfg();
    let call;
    try {
      call = peer.call(id, myStream, {
        metadata: { room: roomId, name: me.name, seq: shareSeq },
        sdpTransform: (sdp) => fastStart(preferCodec(stereoOpus(sdp), c.codec)),
      });
    } catch (e) { console.warn(e); return; }
    if (!call) return;
    const oc = { call, at: Date.now() };
    outCalls.set(id, oc);
    const gone = () => { if (outCalls.get(id) === oc) { outCalls.delete(id); renderMyShare(); } };
    const pc = call.peerConnection;
    if (pc) pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") { tuneSenders(call); renderMyShare(); }
      if (pc.connectionState === "failed" || pc.connectionState === "closed") gone();
    });
    call.on("close", gone);
    call.on("error", gone);
    setTimeout(() => tuneSenders(call), 1500);
  }

  function closeOut(id) {
    const oc = outCalls.get(id);
    if (!oc) return;
    outCalls.delete(id);
    try { oc.call.close(); } catch {}
  }
  function closeAllOut() { for (const id of [...outCalls.keys()]) closeOut(id); lastCallAttempt.clear(); }

  async function tuneSenders(call) {
    const c = cfg();
    const pc = call.peerConnection;
    if (!pc) return;
    for (const sender of pc.getSenders()) {
      if (!sender.track) continue;
      const p = sender.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      if (sender.track.kind === "video") {
        p.encodings[0].maxBitrate = c.bitrate * 1000;
        p.encodings[0].maxFramerate = c.fps;
        p.encodings[0].scaleResolutionDownBy = 1;
        p.encodings[0].priority = "high";
        p.encodings[0].networkPriority = "high";
        p.degradationPreference = c.content === "motion" ? "maintain-framerate" : "maintain-resolution";
      } else {
        p.encodings[0].maxBitrate = 256000;
        p.encodings[0].priority = "high";
      }
      try { await sender.setParameters(p); } catch (e) { console.warn("setParameters", e); }
    }
  }

  // ---------------- telas chegando ----------------
  function onIncomingCall(call) {
    const md = call.metadata || {};
    if (md.room !== roomId || left) { try { call.close(); } catch {} return; }
    let entry = inCalls.get(call.peer);
    if (entry && entry.call && entry.call !== call) { const old = entry.call; entry.call = null; try { old.close(); } catch {} }
    if (!entry) { entry = makeTile(call.peer, cleanName(md.name)); inCalls.set(call.peer, entry); }
    entry.call = call;
    entry.seq = Number(md.seq) || 0;
    entry.last = null;
    entry.wait.hidden = false; entry.wait.textContent = "Conectando à tela de " + entry.name + "…";
    call.answer(undefined, { sdpTransform: (sdp) => fastStart(stereoOpus(sdp)) });
    call.on("stream", (s) => {
      if (entry.call !== call || entry.video.srcObject === s) return;
      entry.video.srcObject = s;
      entry.wait.hidden = true;
      entry.video.muted = entry.muted;
      entry.video.play().catch(() => {
        entry.muted = true; entry.video.muted = true; entry.video.play().catch(() => {});
        updateTileAudio(entry);
        toast("O navegador começou sem som. Toque no alto-falante para ouvir.");
      });
      updateTileState(entry, s);
      const pc = call.peerConnection;
      // não força atraso zero (isso desliga a suavização e o vídeo engasga); um buffer pequeno deixa tudo fluido
      if (pc) pc.getReceivers().forEach((r) => { if ("jitterBufferTarget" in r) r.jitterBufferTarget = 150; });
    });
    call.on("close", () => { if (inCalls.get(call.peer) === entry && entry.call === call) removeIncoming(call.peer); });
    const pc = call.peerConnection;
    if (pc) pc.addEventListener("connectionstatechange", () => {
      if (entry.call !== call) return;
      if (pc.connectionState === "disconnected") { entry.wait.hidden = false; entry.wait.textContent = "Conexão instável…"; }
      if (pc.connectionState === "connected" && entry.video.srcObject) entry.wait.hidden = true;
      if (pc.connectionState === "failed") removeIncoming(call.peer);   // quem compartilha liga de novo sozinho
    });
    updateStage();
    renderMembers();
  }

  function removeIncoming(id) {
    const entry = inCalls.get(id);
    if (!entry) return;
    inCalls.delete(id);
    const c = entry.call; entry.call = null;
    try { c && c.close(); } catch {}
    entry.video.srcObject = null;
    if (document.fullscreenElement === entry.frame) document.exitFullscreen().catch(() => {});
    entry.tile.remove();
    releaseStocks();
    updateStage();
    renderMembers();
  }

  function makeTile(id, name) {
    const tile = document.createElement("article"); tile.className = "tile";
    tile.style.setProperty("--stock", stockVar(id));
    const frame = document.createElement("div"); frame.className = "frame";
    const video = document.createElement("video"); video.autoplay = true; video.playsInline = true;
    const stats = document.createElement("p"); stats.className = "frame-stats"; stats.hidden = true;
    const wait = document.createElement("div"); wait.className = "frame-wait";
    frame.append(video, stats, wait);

    const strip = document.createElement("div"); strip.className = "strip";
    const stock = document.createElement("span"); stock.className = "stock";
    const who = document.createElement("div"); who.className = "strip-who";
    const nameEl = document.createElement("span"); nameEl.className = "strip-name"; nameEl.textContent = name;
    const state = document.createElement("span"); state.className = "strip-state"; state.textContent = "Ao vivo";
    who.append(nameEl, state);
    const tools = document.createElement("div"); tools.className = "tools";
    const mk = (ic, label) => { const b = document.createElement("button"); b.type = "button"; b.className = "tool"; b.title = label; b.setAttribute("aria-label", label); b.append(icon(ic)); return b; };
    const muteBtn = mk("vol", "Desligar o som");
    const vol = document.createElement("input"); vol.type = "range"; vol.className = "vol"; vol.min = "0"; vol.max = "1"; vol.step = "0.01"; vol.value = "1"; vol.setAttribute("aria-label", "Volume de " + name);
    const statsBtn = mk("stats", "Estatísticas"); statsBtn.setAttribute("aria-pressed", "false");
    const focusBtn = mk("focus", "Destacar esta tela"); focusBtn.setAttribute("aria-pressed", "false");
    const fsBtn = mk("full", "Tela cheia");
    tools.append(muteBtn, vol, statsBtn, focusBtn, fsBtn);
    strip.append(stock, who, tools);
    tile.append(frame, strip);
    tile.setAttribute("aria-label", "Tela de " + name);
    $("stage").append(tile);

    const entry = { tile, frame, video, stats, wait, nameEl, state, stock, muteBtn, vol, focusBtn, name, muted: false, call: null, seq: 0, last: null };
    muteBtn.onclick = () => {
      entry.muted = !entry.muted; video.muted = entry.muted;
      if (!entry.muted && video.volume === 0) { video.volume = 1; vol.value = "1"; }
      updateTileAudio(entry);
    };
    vol.oninput = () => { video.volume = Number(vol.value); entry.muted = video.volume === 0; video.muted = entry.muted; updateTileAudio(entry); };
    const toggleFs = () => {
      if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
      const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
      if (req) req.call(frame);
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();   // iPhone: só o próprio vídeo entra em tela cheia
    };
    fsBtn.onclick = toggleFs;
    video.addEventListener("dblclick", toggleFs);
    const toggleFocus = () => {
      const on = !tile.classList.contains("focus");
      for (const e of inCalls.values()) { e.tile.classList.remove("focus"); e.focusBtn.setAttribute("aria-pressed", "false"); }
      tile.classList.toggle("focus", on);
      focusBtn.setAttribute("aria-pressed", String(on));
      updateStage();
    };
    focusBtn.onclick = toggleFocus;
    video.addEventListener("click", () => { if (inCalls.size > 1) toggleFocus(); });
    statsBtn.onclick = () => { stats.hidden = !stats.hidden; statsBtn.setAttribute("aria-pressed", String(!stats.hidden)); };
    updateTileState(entry, null);
    return entry;
  }
  function updateTileAudio(entry) {
    const off = entry.muted || entry.video.volume === 0;
    setIcon(entry.muteBtn, off ? "mute" : "vol");
    const label = off ? "Ligar o som" : "Desligar o som";
    entry.muteBtn.title = label; entry.muteBtn.setAttribute("aria-label", label);
  }
  function updateTileState(entry, stream) {
    const m = members.find((x) => x.id === [...inCalls].find(([, e]) => e === entry)?.[0]);
    const hasAudio = stream ? stream.getAudioTracks().length > 0 : m ? !!m.audio : true;
    entry.state.textContent = hasAudio ? "Ao vivo" : "Ao vivo · sem som";
  }

  function updateStage() {
    const tiles = inCalls.size;
    const stage = $("stage");
    const focused = !!stage.querySelector(".tile.focus");
    stage.classList.toggle("focused", focused && tiles > 1);
    stage.classList.toggle("solo", tiles === 1);
    const msg = $("stageMsg");
    $("newRoomBtn").hidden = true;
    $("stageShareBtn").hidden = true;
    if (connState === "connecting") {
      msg.hidden = false; $("stageMsgTitle").textContent = "Entrando na sala…"; $("stageMsgText").textContent = "";
    } else if (connState === "waiting") {
      msg.hidden = false;
      $("stageMsgTitle").textContent = "Ninguém está na sala agora";
      $("stageMsgText").textContent = "Assim que alguém voltar, você entra sozinho. Uma sala que fica 5 minutos vazia é encerrada.";
      $("newRoomBtn").hidden = false;
    } else if (tiles === 0) {
      msg.hidden = false;
      if (myStream) {
        $("stageMsgTitle").textContent = "Você está transmitindo";
        $("stageMsgText").textContent = "As telas dos outros aparecem aqui quando eles transmitirem. A sua prévia fica ao lado.";
      } else {
        $("stageMsgTitle").textContent = "Ninguém está transmitindo";
        $("stageMsgText").textContent = canShare
          ? "Quando alguém passar a tela, ela aparece aqui. Várias pessoas podem transmitir ao mesmo tempo."
          : "Quando alguém passar a tela, ela aparece aqui.";
        $("stageShareBtn").hidden = !canShare;
      }
    } else {
      msg.hidden = true;
    }
    // quem está ao vivo, no topo
    const liveCount = members.filter((m) => m.sharing).length || (tiles + (myStream ? 1 : 0));
    $("onAir").hidden = liveCount === 0 || connState === "connecting";
    $("onAirText").textContent = liveCount + " ao vivo";
  }

  function renderMembers() {
    const ol = $("memberList"); ol.textContent = "";
    const sorted = [...members].sort((a, b) => (a.no || 999) - (b.no || 999) || a.name.localeCompare(b.name));
    for (const m of sorted) {
      const li = document.createElement("li");
      const no = document.createElement("span"); no.className = "adm-no"; no.textContent = m.no ? pad3(m.no) : "Nº ···";
      const nm = document.createElement("span"); nm.className = "adm-name"; nm.textContent = m.name;
      if (m.id === me.id) { const y = document.createElement("small"); y.textContent = " (você)"; nm.append(y); }
      const st = document.createElement("span"); st.className = "adm-state";
      const sharing = m.id === me.id ? !!myStream : m.sharing;
      if (sharing) {
        st.classList.add("live");
        const chip = document.createElement("span"); chip.className = "adm-chip"; chip.style.setProperty("--stock", stockVar(m.id));
        st.append(chip, m.audio || (m.id === me.id && myStream && myStream.getAudioTracks().length) ? "Ao vivo" : "Ao vivo · mudo");
      } else {
        st.textContent = "Assistindo";
      }
      li.append(no, nm, st);
      if (!seenMembers.has(m.id)) { seenMembers.add(m.id); if (!reducedMotion()) li.classList.add("stamp"); }
      ol.append(li);
    }
    $("memberCount").textContent = members.length;
    // a cor do papel de cada tela acompanha a de quem transmite
    for (const [id, e] of inCalls) { e.tile.style.setProperty("--stock", stockVar(id)); e.stock.textContent = pad3(members.find((m) => m.id === id)?.no || 0).replace("Nº 000", "Nº ···"); }
  }

  // ---------------- compartilhar a minha tela ----------------
  // O padrão é restrictOwnAudio: o som do PC vai sem o do navegador. Sem isso, quem transmite enquanto assiste
  // a outra tela devolve o áudio dessa tela, e a outra pessoa se ouve com atraso (eco).
  // Alguns PCs falham com "Could not start audio source" num dos modos e funcionam no outro; o que funcionou fica salvo.
  const loadMode = () => store.get("ct-audio") || "restrict";
  const pickMode = () => { const m = $("audioMode").value; return m === "auto" ? loadMode() : m; };
  const isAudioError = (e) => e && (e.name === "NotReadableError" || /audio/i.test(e.message || ""));
  const cfg = () => ({
    quality: $("quality").value, fps: Number($("fps").value), bitrate: Number($("bitrate").value),
    content: $("content").value, codec: $("codec").value,
  });

  // cada configuração mostra a sua consequência
  function renderLedger() {
    const c = cfg();
    const viewers = Math.max(0, members.length - 1);
    const mbps = c.bitrate / 1000;
    const dl = $("settingsLedger"); dl.textContent = "";
    const row = (k, v) => { const dt = document.createElement("dt"); dt.textContent = k; const dd = document.createElement("dd"); dd.textContent = v; dl.append(dt, dd); };
    const res = { "720": "1280×720", "1080": "1920×1080", "1440": "2560×1440", native: "a resolução da sua tela" }[c.quality];
    row("Imagem", "Até " + res + " a " + c.fps + " fps");
    row("Se a internet apertar", c.content === "motion" ? "Mantém a fluidez, perde nitidez" : "Mantém a nitidez, perde quadros");
    row("Cada pessoa assistindo", mbps + " Mbps do seu upload");
    row(viewers ? "Com " + plural(viewers, "pessoa", "pessoas") + " agora" : "Com 3 pessoas", (viewers ? viewers : 3) * mbps + " Mbps no total");
    const mode = $("audioMode").value;
    const audio = { auto: loadMode() === "restrict" ? "Menos o som do navegador (evita eco)" : "Todo o som do PC (salvo)", full: "Todo o som do PC", restrict: "Menos o som do navegador", none: "Vídeo sem som" }[mode];
    row("Áudio", audio);
    row("Codec", { H264: "Placa de vídeo, o mais leve para o PC", VP9: "Mais nítido, pesa mais no processador", AV1: "O mais nítido; nem todo navegador recebe", VP8: "Funciona em qualquer navegador", auto: "O navegador escolhe" }[c.codec]);
  }
  for (const id of ["quality", "fps", "bitrate", "content", "codec", "audioMode"]) $(id).addEventListener("change", () => { renderLedger(); if (myStream) for (const oc of outCalls.values()) tuneSenders(oc.call); });

  async function capture(mode) {
    const c = cfg();
    const size = { "720": [1280, 720], "1080": [1920, 1080], "1440": [2560, 1440] }[c.quality];
    const video = { frameRate: { ideal: c.fps, max: c.fps } };
    if (size) { video.width = { ideal: size[0], max: size[0] }; video.height = { ideal: size[1], max: size[1] }; }
    // windowAudio "window": ao escolher uma janela, leva só o som dela, não o do PC inteiro (ignorado onde não existe)
    const extra = { systemAudio: "include", windowAudio: "window", selfBrowserSurface: "exclude", surfaceSwitching: "include", monitorTypeSurfaces: "include" };
    // áudio sem restrições extras (canais, taxa): elas fazem o Windows falhar com "Could not start audio source"
    const audio = mode === "none" ? false : mode === "restrict" ? { restrictOwnAudio: true } : true;
    const s = await navigator.mediaDevices.getDisplayMedia({ video, audio, ...extra });
    usedMode = mode;
    const vt = s.getVideoTracks()[0];
    if (vt) {
      vt.contentHint = c.content;
      vt.addEventListener("ended", () => { if (myStream === s) stopShare(); });
    }
    const at = s.getAudioTracks()[0];
    if (at) {
      audioFailed = false;
      at.contentHint = "music";
      at.applyConstraints({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }).catch(() => {});
    }
    return s;
  }

  async function startShare(noAudio) {
    $("shareErr").textContent = "";
    $("noAudioBox").hidden = true;
    let mode = noAudio === true ? "none" : pickMode();
    let s = null;
    try { s = await capture(mode); }
    catch (e) {
      if (e.name === "NotAllowedError") return;
      if (mode !== "none" && isAudioError(e)) {
        // tenta de novo pelo outro caminho de áudio do Windows
        mode = mode === "full" ? "restrict" : "full";
        try { s = await capture(mode); if ($("audioMode").value === "auto") store.set("ct-audio", mode); }
        catch (e2) {
          if (isAudioError(e2)) e = e2;
          else {
            if ($("audioMode").value === "auto") store.set("ct-audio", mode);
            $("shareErr").textContent = "O áudio do PC falhou nesse modo. Clique em “Compartilhar minha tela” de novo para tentar o outro modo.";
            return;
          }
        }
      }
      if (!s) {
        if (mode !== "none" && isAudioError(e)) {
          audioFailed = true;
          $("shareErr").textContent = "O Windows não deixou capturar o áudio do PC (" + e.message + ").";
          $("noAudioBox").hidden = false;
        } else {
          $("shareErr").textContent = "Não foi possível capturar a tela: " + e.message;
        }
        return;
      }
    }
    if (left) { s.getTracks().forEach((t) => t.stop()); return; }
    myStream = s;
    shareSeq++;
    $("preview").srcObject = s;
    send({ t: "update", ...myInfo() });
    const self = members.find((m) => m.id === me.id);
    if (self) Object.assign(self, myInfo());
    renderMembers();
    closeAllOut();
    reconcile();
    renderMyShare();
    updateStage();
  }

  function stopShare() {
    const s = myStream;
    myStream = null;
    closeAllOut();
    if (s) s.getTracks().forEach((t) => t.stop());
    $("preview").srcObject = null;
    $("myStats").textContent = ""; $("sendHint").textContent = "";
    send({ t: "update", ...myInfo() });
    const self = members.find((m) => m.id === me.id);
    if (self) Object.assign(self, myInfo());
    releaseStocks();
    renderMembers();
    renderMyShare();
    updateStage();
  }

  async function switchSource() {
    let s;
    try { s = await capture(usedMode); }
    catch (e) { if (e.name !== "NotAllowedError") toast("Não foi possível trocar: " + e.message); return; }
    if (!myStream || left) { s.getTracks().forEach((t) => t.stop()); return; }
    const old = myStream;
    const hadAudio = old.getAudioTracks().length > 0;
    myStream = s;
    $("preview").srcObject = s;
    const nv = s.getVideoTracks()[0], na = s.getAudioTracks()[0];
    if (hadAudio !== !!na) {
      closeAllOut();            // mudou de "com áudio" para "sem áudio" (ou o contrário): liga de novo para todos
    } else {
      for (const oc of outCalls.values()) {
        const pc = oc.call.peerConnection; if (!pc) continue;
        for (const sender of pc.getSenders()) {
          const kind = sender.track ? sender.track.kind : null;
          try {
            if (kind === "video" && nv) await sender.replaceTrack(nv);
            else if (kind === "audio" && na) await sender.replaceTrack(na);
          } catch (e) { console.warn(e); }
        }
        tuneSenders(oc.call);
      }
    }
    old.getTracks().forEach((t) => t.stop());
    send({ t: "update", ...myInfo() });
    reconcile();
    renderMyShare();
    renderMembers();
  }

  function renderMyShare() {
    const live = !!myStream;
    $("shareIdle").hidden = live;
    $("shareLive").hidden = !live;
    $("shareState").textContent = live ? "Ao vivo" : "Parada";
    $("shareState").style.color = live ? "var(--live)" : "";
    renderLedger();
    if (!live) return;
    const has = myStream.getAudioTracks().length > 0;
    const badge = $("audioBadge"); badge.textContent = "";
    const lamp = document.createElement("span");
    lamp.className = has ? "lamp ok" : "lamp wait";
    badge.append(lamp, has
      ? (usedMode === "restrict" ? "O som do PC vai junto, menos o do navegador" : "O som do PC vai junto")
      : (audioFailed ? "Sem som: o Windows não deixou capturar o áudio" : "Sem som. Para levar o áudio, troque a tela e marque “Compartilhar áudio”"));

    // orçamento de upload: um segmento por pessoa assistindo
    const others = members.filter((m) => m.id !== me.id).length;
    let ok = 0;
    for (const oc of outCalls.values()) if (oc.call.peerConnection && oc.call.peerConnection.connectionState === "connected") ok++;
    const mbps = Math.round(cfg().bitrate / 1000);
    const bar = $("budgetBar"); bar.textContent = "";
    for (let i = 0; i < Math.max(others, 1); i++) {
      const seg = document.createElement("i");
      if (others && i < ok) seg.className = "on"; else if (others) seg.className = "pending";
      bar.append(seg);
    }
    if (others === 0) {
      $("budgetLabel").textContent = "Ninguém assistindo ainda. Mande o link.";
      $("budgetTotal").textContent = "0 Mbps";
    } else {
      $("budgetLabel").textContent = mbps + " Mbps × " + plural(others, "pessoa", "pessoas") + (ok < others ? " · " + ok + " conectada" + (ok === 1 ? "" : "s") : "");
      $("budgetTotal").textContent = mbps * others + " Mbps de upload";
    }
  }

  // ---------------- o ingresso: destacar e copiar ----------------
  async function copyLink() {
    const url = $("shareLink").value;
    let ok = true;
    try { await navigator.clipboard.writeText(url); }
    catch { $("shareLink").select(); ok = document.execCommand("copy"); }
    const stub = $("copyBtn"), label = stub.querySelector("span");
    if (!ok) { $("shareLink").focus(); $("shareLink").select(); toast("Não deu para copiar sozinho. O link está selecionado: copie com Ctrl+C."); return; }
    toast("Link copiado. Mande para quem vai assistir.");
    if (reducedMotion()) { label.textContent = "Copiado"; setTimeout(() => { label.textContent = "Destacar e copiar"; }, 2000); return; }
    stub.disabled = true;
    stub.classList.remove("reprint"); stub.classList.add("tear");
    setTimeout(() => {
      stub.classList.remove("tear"); label.textContent = "Copiado"; setIcon(stub, "copy");
      void stub.offsetWidth; stub.classList.add("reprint");
      stub.disabled = false;
      setTimeout(() => { label.textContent = "Destacar e copiar"; }, 2200);
    }, 640);
  }

  // ---------------- sair ----------------
  function leave(silent) {
    if (left) return;
    const wasIn = !!keeperConn;
    send({ t: "bye" });
    left = true;
    if (myStream) { myStream.getTracks().forEach((t) => t.stop()); myStream = null; }
    for (const id of [...outCalls.keys()]) closeOut(id);
    for (const id of [...inCalls.keys()]) removeIncoming(id);
    if (wasIn) touch();
    const kc = keeperConn; keeperConn = null;
    setTimeout(() => {
      try { kc && kc.close(); } catch {}
      try { keeper && keeper.destroy(); } catch {}
      try { peer && peer.destroy(); } catch {}
    }, silent ? 0 : 150);
    if (!silent) { show("leftScreen"); document.title = "Compartilhar Tela"; }
  }

  // ---------------- laços de manutenção ----------------
  setInterval(() => {
    if (left) return;
    if (peer && peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch {} }
    if (keeperConn) {
      if (Date.now() - lastKeeperMsg > KEEPER_SILENCE) {
        const c = keeperConn; keeperConn = null;
        try { c.close(); } catch {}
        onKeeperLost();
      } else {
        send({ t: "ping" });
        touch();
      }
    }
    if (keeper && !keeper.alive) keeper = null;
    reconcile();
  }, 4000);

  setInterval(async () => {
    if (left) return;
    if (myStream) {
      const vt = myStream.getVideoTracks()[0];
      const oc = [...outCalls.values()].find((o) => o.call.peerConnection && o.call.peerConnection.connectionState === "connected");
      let st = null;
      if (oc) { try { st = await sendStats(oc.call.peerConnection, oc === myStatsCall ? myStatsPrev : null); } catch {} }
      if (st) {
        myStatsCall = oc; myStatsPrev = st.next;
        const d = describeSend(st, cfg().fps);
        $("myStats").textContent = d.line; $("sendHint").textContent = d.hint;
      } else if (vt) {
        const s = vt.getSettings();
        $("myStats").textContent = "Capturando " + (s.width || "?") + "×" + (s.height || "?") + " · " + Math.round(s.frameRate || 0) + " fps";
        $("sendHint").textContent = "";
      }
      renderMyShare();
    }
    for (const entry of inCalls.values()) {
      if (entry.stats.hidden || !entry.call || !entry.call.peerConnection) continue;
      let rep;
      try { rep = await entry.call.peerConnection.getStats(); } catch { continue; }
      let v = null, pair = null;
      rep.forEach((r) => {
        if (r.type === "inbound-rtp" && r.kind === "video") v = r;
        if (r.type === "candidate-pair" && r.nominated && r.state === "succeeded") pair = r;
      });
      if (!v) continue;
      let kbps = 0;
      if (entry.last) kbps = ((v.bytesReceived - entry.last.bytes) * 8) / (v.timestamp - entry.last.ts);
      entry.last = { bytes: v.bytesReceived, ts: v.timestamp };
      let codec = "";
      if (v.codecId && rep.get(v.codecId)) codec = rep.get(v.codecId).mimeType.replace("video/", "");
      const rtt = pair && pair.currentRoundTripTime != null ? Math.round(pair.currentRoundTripTime * 1000) + " ms" : "?";
      entry.stats.textContent = (v.frameWidth || "?") + "×" + (v.frameHeight || "?") + " · " + Math.round(v.framesPerSecond || 0) +
        " fps · " + (kbps / 1000).toFixed(1) + " Mbps · " + codec + " · ping " + rtt +
        (v.freezeCount != null ? " · travadas " + v.freezeCount : "") + (v.packetsLost ? " · perdas " + v.packetsLost : "");
    }
  }, 1000);

  // ---------------- botões ----------------
  $("shareBtn").onclick = () => startShare(false);
  $("stageShareBtn").onclick = () => startShare(false);
  $("noAudioBtn").onclick = () => startShare(true);
  $("stopShareBtn").onclick = stopShare;
  $("switchBtn").onclick = switchSource;
  $("leaveBtn").onclick = () => leave(false);
  $("copyBtn").onclick = copyLink;
  $("nativeShareBtn").onclick = () => navigator.share({ title: "Compartilhar Tela", text: "Entra na sala para assistir comigo:", url: $("shareLink").value }).catch(() => {});
  window.addEventListener("beforeunload", (e) => { if (myStream && !left) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("pagehide", () => leave(true));
  renderLedger();

  // ---------------- início ----------------
  (async () => {
    setConn("connecting");
    if (created) {
      keeper = await startKeeper(roomId);
      if (!keeper) {
        $("stageMsgTitle").textContent = "Não foi possível criar a sala";
        $("stageMsgText").textContent = "O servidor que liga as pessoas não respondeu. Recarregue a página para tentar de novo.";
        return;
      }
    }
    peer = new Peer(me.id, peerOptions());
    peer.on("open", () => connectKeeper());
    peer.on("call", onIncomingCall);
    peer.on("disconnected", () => {
      setTimeout(() => { if (!left && !peer.destroyed && peer.disconnected) { try { peer.reconnect(); } catch {} } }, 1000);
    });
    peer.on("error", (e) => {
      console.warn("peer", e.type, e.message);
      if (e.type === "peer-unavailable") {
        const id = String(e.message).split(" ").pop();
        if (outCalls.has(id)) closeOut(id);
      }
    });
  })();
}

// =====================================================================
function cleanupOldRooms() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("ct-room-") && Date.now() - Number(localStorage.getItem(k) || 0) > 24 * 3600 * 1000) localStorage.removeItem(k);
    }
  } catch {}
}

function newRoom() {
  history.replaceState(null, "", location.pathname + location.search);
  location.reload();
}

(function main() {
  cleanupOldRooms();
  const savedName = store.get("ct-name") || "";
  $("landingName").value = savedName;
  $("joinName").value = savedName;
  $("newRoomBtn").onclick = newRoom;
  $("newRoomBtn2").onclick = newRoom;
  $("rejoinBtn").onclick = () => location.reload();
  window.addEventListener("hashchange", () => location.reload());

  const room = decodeURIComponent(location.hash.slice(1));
  if (ROOM_RE.test(room)) {
    show("join");
    $("joinSerial").textContent = serialOf(room);
    document.title = "Convite · Compartilhar Tela";
    $("joinForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const n = $("joinName").value.trim(); store.set("ct-name", n); startRoom(room, n, false);
    });
  } else {
    show("landing");
    $("landingForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const n = $("landingName").value.trim(); store.set("ct-name", n);
      const id = "tela-" + randHex(16);
      history.replaceState(null, "", location.pathname + location.search + "#" + id);
      startRoom(id, n, true);
    });
  }
})();
