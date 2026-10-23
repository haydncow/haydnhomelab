// Status page code, kept in its own file so the Content Security Policy
// can block inline scripts (securityheaders.com A+)
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = s => document.querySelector(s);
let stats = null, current = "intro";

/* ---------- power-on intro ---------- */
// standby light blinks, the screen switches on like an old CRT monitor,
// the rack draws itself in green outlines, fills in, then the lights come on.
let booted = false, timers = [];
let hist = null;   // 90-day history from /history.json
const sleep = ms => new Promise(r => timers.push(setTimeout(r, ms)));
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
function prepTrace() {
  const shapes = [...$("#rack").querySelectorAll("rect, path, circle, ellipse")].filter(e => !e.matches(".hit, .light"));
  shapes.forEach(e => {
    e.setAttribute("pathLength", "1");
    let y = 0; try { y = e.getBBox().y; } catch (err) {}
    e.style.setProperty("--d", (Math.max(0, y) / 590 * 0.9 + Math.random() * 0.15).toFixed(2) + "s");
  });
}
function decrypt(el, text, ms) {
  const chars = "!<>-_\\/[]{}=+*^?#01";
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / ms), done = Math.floor(p * text.length);
    el.textContent = text.slice(0, done) + [...text.slice(done)].map(() => chars[Math.random() * chars.length | 0]).join("");
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function showRest() {
  document.body.classList.remove("intro");
}
function finishBoot() {
  if (booted) return; booted = true;
  timers.forEach(clearTimeout);
  const boot = $("#boot"); if (boot) boot.classList.add("gone");
  const rack = $("#rack"); rack.classList.remove("tracing", "fillin", "paused");
  $("#title").textContent = "Live lab";
  showRest();
  try { sessionStorage.setItem("booted", "1"); } catch (e) {}
  powerOn();
}
async function runBoot() {
  let seen = false;
  try { seen = sessionStorage.getItem("booted") === "1"; } catch (e) {}
  if (seen || reduceMotion) { $("#boot").remove(); booted = true; showRest(); powerOn(); return; }
  const boot = $("#boot"), beam = boot.querySelector(".beam"), rack = $("#rack");
  boot.addEventListener("click", finishBoot);
  addEventListener("keydown", finishBoot, { once: true });
  prepTrace();
  rack.classList.add("tracing", "paused");
  $("#title").textContent = "";
  await sleep(950);                                   // standby light blinks
  beam.classList.add("line");                         // stretches into a line
  await sleep(300);
  beam.classList.add("open"); boot.classList.add("open");   // screen switches on
  rack.classList.remove("paused");
  document.body.classList.add("crt");
  later(() => document.body.classList.remove("crt"), 1200);
  later(() => boot.classList.add("gone"), 700);
  decrypt($("#title"), "Live lab", 900);
  await sleep(1900);                                  // rack draws itself
  rack.classList.replace("tracing", "fillin");
  await sleep(900);
  rack.classList.remove("fillin");
  showRest();
  booted = true;
  try { sessionStorage.setItem("booted", "1"); } catch (e) {}
  powerOn();
}

/* lights come on one by one, then data starts flowing */
function powerOn() {
  const rack = $("#rack");
  const lights = [...rack.querySelectorAll(".light")];
  rack.classList.remove("booting");
  lights.forEach((l, i) => { l.style.opacity = 0; setTimeout(() => (l.style.opacity = ""), reduceMotion ? 0 : 150 + i * 180); });
  setTimeout(startPackets, reduceMotion ? 0 : 150 + lights.length * 180);
}

/* ---------- data packets along the cables ---------- */
function packetSpeed() {
  // busier Pi-hole = faster packets. Uses the last 10 minutes of DNS queries.
  const h = stats && stats.dns_history;
  const recent = h && h.length ? h[h.length - 1][1] : 0;
  return Math.max(0.9, 3.2 - Math.min(recent, 600) / 260);
}
function startPackets() {
  if (reduceMotion) return;
  const g = $("#packets");
  g.innerHTML = "";
  const dur = packetSpeed();
  const make = (path, colour, begin, back) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", "2.6"); c.setAttribute("fill", colour); c.setAttribute("filter", "url(#glow)");
    const m = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    m.setAttribute("dur", dur + "s"); m.setAttribute("repeatCount", "indefinite"); m.setAttribute("begin", begin + "s");
    if (back) { m.setAttribute("keyPoints", "1;0"); m.setAttribute("keyTimes", "0;1"); m.setAttribute("calcMode", "linear"); }
    const mp = document.createElementNS("http://www.w3.org/2000/svg", "mpath");
    mp.setAttribute("href", path);
    m.appendChild(mp); c.appendChild(m); g.appendChild(c);
  };
  for (let i = 0; i < 3; i++) {
    make("#cable-pi", "#5cff3a", i * dur / 3, false);
    make("#cable-pi", "#e8eae6", i * dur / 3 + dur / 6, true);
    make("#cable-router", "#ffb38f", i * dur / 3, false);
    make("#cable-router", "#5cff3a", i * dur / 3 + dur / 6, true);
  }
  // my PC: lookups go up to the switch, answers come back down
  for (let i = 0; i < 2; i++) {
    make("#cable-pc", "#e8eae6", i * dur / 2 + dur / 4, true);
    make("#cable-pc", "#5cff3a", i * dur / 2, false);
  }
}

/* ---------- zoom into a part ---------- */
const FULL = [30, 0, 460, 590];
let view = FULL.slice(), anim = null;
function setView(v) { view = v; $("#rack").setAttribute("viewBox", v.map(n => n.toFixed(1)).join(" ")); }
function zoomTo(target) {
  cancelAnimationFrame(anim);
  if (reduceMotion) return setView(target);
  const from = view.slice(), t0 = performance.now(), D = 650;
  const step = now => {
    const t = Math.min(1, (now - t0) / D), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    setView(from.map((f, i) => f + (target[i] - f) * e));
    if (t < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}
function boxFor(el) {
  const b = el.querySelector(".hit").getBBox(), ratio = FULL[2] / FULL[3], pad = 34;
  let w = b.width + pad * 2, h = b.height + pad * 2;
  if (w / h > ratio) h = w / ratio; else w = h * ratio;
  w = Math.min(w, FULL[2]); h = Math.min(h, FULL[3]);
  let x = b.x + b.width / 2 - w / 2, y = b.y + b.height / 2 - h / 2;
  x = Math.max(FULL[0], Math.min(x, FULL[0] + FULL[2] - w));
  y = Math.max(FULL[1], Math.min(y, FULL[1] + FULL[3] - h));
  return [x, y, w, h];
}



/* ---------- info tile: what each rack part is ---------- */
const PARTS = {
  intro: ["Welcome", () => `
    <h2>My homelab</h2>
    <p class="tag">A small server I built to learn networking and security</p>
    <div class="vis-line" id="vis-line">${visLine()}</div>
    <p>Click a part of the rack to zoom in, or click any tile for more. New to this? <button class="chip" data-go-how>How it works</button></p>
    <div class="chips">
      <button class="chip" data-go="pi">Raspberry Pi</button><button class="chip" data-go="switch">Switch</button><button class="chip" data-go="drive">Drive</button>
      <button class="chip" data-go="spare">Spare slot</button><button class="chip" data-go="blank">Blank panel</button>
      <button class="chip" data-go="empty">Open space</button>
    </div>`],
  pi: ["U1 &middot; KKSB panel", () => `
    <h2>Raspberry Pi 5 (2GB)</h2>
    <p class="tag">The server. This page is running on it right now.</p>
    <ul>
      <li><b>Pi-hole</b> blocks ads and trackers</li>
      <li><b>Tailscale</b> lets me manage it from anywhere</li>
      <li><b>Cloudflare Tunnel</b> puts this page online</li>
      <li><b>UFW + Fail2ban</b> keep everything else out</li>
    </ul>
    <div class="chips"><button class="chip" data-open="pi">All live stats &#8599;</button></div>`],
  switch: ["U2 &middot; shelf", () => `
    <h2>TP-Link TL-SG105E</h2>
    <p class="tag">5 port gigabit managed switch</p>
    <p>Port 1 (orange) goes out to the router, port 2 to the Pi, and port 3 to my PC (both black). The moving dots are traffic, and they speed up when Pi-hole is busier.</p>
    <p>It's managed, so it can do <b>VLANs</b>. That's next on my list.</p>`],
  drive: ["U2 &middot; on the switch", () => `
    <h2>WD My Passport 1TB</h2>
    <p class="tag">Storage, plugged into the Pi's blue USB 3 port</p>
    <ul>
      <li><b>Jellyfin</b> films and shows</li>
      <li><b>Nightly backups</b> of the Pi, kept for 14 days</li>
    </ul>
    <p>It sits on top of the switch. If it's unplugged the Pi still boots, it just won't have the films.</p>`],
  spare: ["U1 &middot; KKSB panel", () => `
    <h2>Spare slot</h2>
    <p class="tag">Room for a second Pi</p>
    <p>The panel holds two Pis. This one's empty for now, ready for a backup Pi-hole or a media server.</p>`],
  blank: ["U3", () => `<h2>Blank panel</h2><p class="tag">Came with the rack</p><p>Covers the gap under the switch so it looks tidy.</p>`],
  empty: ["U4", () => `<h2>Open space</h2><p class="tag">Room to grow</p><p>Space for an SSD, a patch panel or whatever comes next.</p>`],
};
function show(part, animate = true) {
  current = part;
  const [label, html] = PARTS[part];
  $("#info-label").innerHTML = label;
  const info = $("#info");
  info.innerHTML = html();
  if (animate) { info.classList.remove("swap"); void info.offsetWidth; info.classList.add("swap"); }
  info.querySelectorAll("[data-go]").forEach(c => c.onclick = () => select(c.dataset.go));
  info.querySelectorAll("[data-open]").forEach(c => c.onclick = e => { e.stopPropagation(); openModal(c.dataset.open, c); });
  document.querySelectorAll(".part").forEach(p => p.classList.toggle("active", p.dataset.part === part));
}
function select(part) {
  show(part);
  const tile = $(".t-rack");
  if (part === "intro") { zoomTo(FULL); $("#back").classList.remove("show"); tile.classList.remove("zoomed"); return; }
  tile.classList.add("zoomed");
  zoomTo(boxFor(document.querySelector(`.part[data-part="${part}"]`)));
  $("#back").classList.add("show");
}
document.querySelectorAll(".part").forEach(p => {
  p.addEventListener("click", () => select(p.dataset.part));
  p.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(p.dataset.part); } });
});
$("#back").onclick = () => select("intro");

/* ---------- tiles: mouse glow, counting numbers, mini graphs ---------- */
document.querySelectorAll(".tile").forEach(t => t.addEventListener("pointermove", e => {
  const r = t.getBoundingClientRect();
  t.style.setProperty("--mx", (e.clientX - r.left) + "px"); t.style.setProperty("--my", (e.clientY - r.top) + "px");
}));
const num = v => parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const shown = {};
function countTo(el, target, dec = 0) {
  const key = el.dataset.count, from = shown[key] ?? 0; shown[key] = target;
  const fmt = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString();
  if (reduceMotion || from === target) { el.textContent = fmt(target); return; }
  const t0 = performance.now(), D = 1400;
  const step = now => { const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (target - from) * e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function spark(svg, series) {
  const w = 200, h = 50; svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const all = series.flatMap(s => s.data); if (all.length < 2) { svg.innerHTML = ""; return; }
  const lo = Math.min(...all), hi = Math.max(...all), n = series[0].data.length;
  const X = i => i / (n - 1) * w, Y = v => h - 3 - (v - lo) / (hi - lo || 1) * (h - 6);
  svg.innerHTML = series.map(s => {
    const d = s.data.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
    return `<path class="a" d="${d}L${w} ${h}L0 ${h}Z" fill="${s.colour}"/><path class="l" d="${d}" stroke="${s.colour}" vector-effect="non-scaling-stroke"/>`;
  }).join("");
}
function setGauge(t) {
  const g = $("#gauge");
  $("#gauge-t").textContent = t == null ? "--" : t.toFixed(1);
  g.style.strokeDashoffset = 100 - Math.max(0, Math.min(1, ((t ?? 30) - 30) / 55)) * 100;
  g.setAttribute("stroke", t >= 75 ? "var(--bad)" : t >= 62 ? "var(--amber)" : "var(--pass)");
}
function render() {
  if (!stats) return;
  // a missing reading keeps the last number on screen instead of dropping to 0
  document.querySelectorAll("[data-count]").forEach(el => {
    const v = stats[el.dataset.count];
    if (v == null || (liveOk && el.dataset.count === "power")) return;
    countTo(el, num(v), +el.dataset.dec || 0);
  });
  if (stats.percent != null) {
    $("#pct").textContent = stats.percent;
    $("#ring").style.strokeDashoffset = 207.3 * (1 - Math.min(num(stats.percent), 100) / 100);
  }
  $("#uptime").textContent = stats.uptime ?? "n/a";
  if (!liveOk) { $("#cpu").textContent = stats.load ? "load " + stats.load : "-"; $("#mem").textContent = stats.memory ?? "-"; }
  $("#cost").textContent = stats.cost_year ?? "n/a";
  if (!liveOk) setGauge(stats.temp ? num(stats.temp) : null);
  const pi = stats.pi_history || [], dns = stats.dns_history || [];
  spark($("#spark-dns"), [{ colour: "var(--s-total)", data: dns.map(d => d[1]) }, { colour: "var(--s-blocked)", data: dns.map(d => d[2]) }]);
  if (!liveOk) {
    spark($("#spark-cpu"), [{ colour: "var(--s-blocked)", data: pi.map(p => p[2]) }]);
    spark($("#spark-pow"), [{ colour: "var(--s-blocked)", data: pi.filter(p => p[3] > 0).map(p => p[3]) }]);
  }
  const svc = stats.services || [], up = svc.filter(s => s.up).length;
  $("#svc-count").textContent = !svc.length ? "" : up === svc.length ? `all ${up} up` : `${svc.length - up} down, ${up}/${svc.length} up`;
  $("#svc-count").classList.toggle("bad", up < svc.length);
  const down = svc.filter(s => !s.up);
  $("#svc").innerHTML = svc.length
    ? svcGroups().map(g => `<div class="svc-sec${g.list.length <= 2 ? " half" : ""}"><div class="svc-h">${g.name} ${svcCount(g.list)}</div><div class="svc-chips">${g.list.map(s =>
        `<div class="svc ${s.up ? "up" : "down"}" title="${ABOUT[s.name] || ""}"><i></i>${SVC_SHORT[s.name] || s.name}</div>`).join("")}</div></div>`).join("")
    : `<span class="note">not available yet</span>`;
  const hp = stats.honeypot;
  const cfDay = hist && (hist.days || []).find(d => d.date === new Date().toISOString().slice(0, 10));   // Cloudflare's days are UTC
  const cfToday = hist && hist.firewall ? (cfDay && cfDay.cf_blocked != null ? cfDay.cf_blocked : (hist.firewall.feed || []).filter(e => Date.now() / 1000 - e.time < 86400).length) : null;
  $("#hp-line").innerHTML = (hp ? `honeypot: <b class="${hp.today ? "hp-hot" : ""}">${hp.today} alert${hp.today === 1 ? "" : "s"}</b> in 24h` : "")
    + (cfToday != null ? ` &middot; Cloudflare blocked <b>${Number(cfToday).toLocaleString()}</b> today` : "");
  const vl = $("#vis-line"); if (vl) vl.innerHTML = visLine();
  if (modalOpen && !["network", "attacks", "how", "history"].includes(modalOpen)) drawModal(modalOpen, false);
  if (modalOpen === "network") netInfo();
  if (modalOpen === "attacks") atkUpdate();
}

/* ---------- expanded views ---------- */
const fmtTime = t => new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
function lineChart(el, { title, sub, series, unit = "", min = null, fmt = v => v, tickFmt = null, tf = fmtTime }) {
  const pts = series[0].data;
  const legend = series.length > 1
    ? `<div class="legend">${series.map(s => `<span><i style="background:${s.colour}"></i>${s.name}</span>`).join("")}</div>` : "";
  if (!pts || pts.length < 2) { el.innerHTML = `<h4>${title}</h4><p class="sub">${sub}</p><div class="empty">Collecting data, check back soon.</div>`; return; }
  const W = Math.max(280, el.clientWidth - 32), H = series.length > 1 ? 220 : 170, L = 44, R = 64, T = 10, B = 24;
  const xs = pts.map(p => p[0]), x0 = xs[0], x1 = xs[xs.length - 1];
  const all = series.flatMap(s => s.data.map(p => p[1]));
  let lo = min ?? Math.floor(Math.min(...all) - 2), hi = Math.max(...all);
  hi = hi === lo ? lo + 1 : hi + (hi - lo) * .08;
  const X = t => L + (t - x0) / (x1 - x0 || 1) * (W - L - R);
  const Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, .5, 1].map(f => lo + (hi - lo) * f);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}, ${sub}">`;
  ticks.forEach(v => svg += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${tickFmt ? tickFmt(v) : fmt(Math.round(v))}</text>`);
  [x0, (x0 + x1) / 2, x1].forEach((t, i) => svg += `<text class="axis" x="${X(t)}" y="${H - 4}" text-anchor="${["start", "middle", "end"][i]}">${tf(t)}</text>`);
  series.forEach(s => {
    const d = s.data.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join("");
    svg += `<path class="ln draw" d="${d}" stroke="${s.colour}"/>`;
    const last = s.data[s.data.length - 1];
    svg += `<circle cx="${X(last[0])}" cy="${Y(last[1])}" r="4" fill="${s.colour}" stroke="var(--panel)" stroke-width="2"/>`;
    svg += `<text class="axis" x="${X(last[0]) + 9}" y="${Y(last[1]) + 4}" style="fill:var(--text)">${fmt(last[1])}${unit}</text>`;
  });
  svg += `<line class="xh" y1="${T}" y2="${H - B}" style="opacity:0"/>`;
  series.forEach(s => svg += `<circle class="hv" r="4" fill="${s.colour}" stroke="var(--panel)" stroke-width="2" style="opacity:0"/>`);
  svg += `<rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" class="hitbox"/></svg>`;
  el.innerHTML = `<h4>${title}</h4><p class="sub">${sub}</p>${legend}${svg}<div class="ttip"></div>`;
  el.querySelectorAll(".draw").forEach(p => p.style.setProperty("--len", Math.ceil(p.getTotalLength())));
  const s = el.querySelector("svg"), xh = s.querySelector(".xh"), hv = s.querySelectorAll(".hv"), tip = el.querySelector(".ttip");
  const move = e => {
    const r = s.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * W;
    let i = 0, best = Infinity;
    xs.forEach((t, k) => { const d = Math.abs(X(t) - mx); if (d < best) { best = d; i = k; } });
    const x = X(xs[i]);
    xh.setAttribute("x1", x); xh.setAttribute("x2", x); xh.style.opacity = 1;
    series.forEach((sr, k) => { const p = sr.data[i]; if (!p) return; hv[k].setAttribute("cx", x); hv[k].setAttribute("cy", Y(p[1])); hv[k].style.opacity = 1; });
    tip.innerHTML = `<div class="muted">${tf(xs[i])}</div>` + series.map(sr => sr.data[i] ? `<div><i style="background:${sr.colour}"></i>${sr.name}: <b>${fmt(sr.data[i][1])}${unit}</b></div>` : "").join("");
    tip.style.opacity = 1;
    const er = el.getBoundingClientRect(), px = x / W * r.width + (r.left - er.left);
    tip.style.left = Math.min(px + 12, er.width - tip.offsetWidth - 8) + "px";
    tip.style.top = (r.top - er.top + 8) + "px";
  };
  const leave = () => { xh.style.opacity = 0; hv.forEach(h => h.style.opacity = 0); tip.style.opacity = 0; };
  s.addEventListener("pointermove", move); s.addEventListener("pointerdown", move); s.addEventListener("pointerleave", leave);
}

const ABOUT = {
  "Firewall (UFW)": "Blocks everything coming in unless I've allowed it",
  "Fail2ban": "Bans anyone who gets the SSH login wrong 5 times",
  "Honeypot": "Fake services that alert me if anything pokes around",
  "SSH": "How I log in remotely. Keys only, no passwords",
  "Auto updates": "Installs security fixes by itself every day",
  "Pi-hole": "Blocks ads and trackers on my devices",
  "Unbound": "Looks websites up itself, no Google or Cloudflare in the middle",
  "Tailscale": "Private VPN, so I can reach the lab from anywhere",
  "Cloudflare Tunnel": "Puts this site online without opening my router",
  "Jellyfin": "My own Netflix for films and shows",
  "Homepage": "My private dashboard with links to everything",
  "Speedtest Tracker": "Tests my broadband every 2 hours",
  "Web server": "Serves this page", "Web server (Caddy)": "Serves this page and my .lan names",
  "Live stats": "Takes a reading every 3 seconds for the graphs",
  "Nightly backup": "Saves all my settings every night, keeps 14",
  "SD card": "Watches the card for wear and errors",
};

// "What's running" is split into sections, most important first
const SVC_GROUPS = [
  { name: "Security", about: "Keeping attackers out, and catching anything that gets in.",
    items: ["Firewall (UFW)", "Fail2ban", "Honeypot", "SSH", "Auto updates"] },
  { name: "Network and DNS", about: "Blocking ads, private lookups and safe remote access.",
    items: ["Pi-hole", "Unbound", "Tailscale", "Cloudflare Tunnel"] },
  { name: "Apps", about: "Things I actually use day to day. Home network and Tailscale only.",
    items: ["Jellyfin", "Homepage", "Speedtest Tracker"] },
  { name: "This website", about: "What serves this page and keeps the graphs moving.",
    items: ["Web server (Caddy)", "Web server", "Live stats"] },
  { name: "Looking after the Pi", about: "Backups and SD card health, so nothing is lost if it breaks.",
    items: ["Nightly backup", "SD card"] },
];
const SVC_SHORT = { "Firewall (UFW)": "Firewall", "Web server (Caddy)": "Caddy", "Web server": "Web server", "Cloudflare Tunnel": "Cloudflare",
  "Speedtest Tracker": "Speedtest", "Nightly backup": "Backup", "Auto updates": "Updates" };
function svcGroups() {
  const all = stats && stats.services || [], used = new Set();
  const groups = SVC_GROUPS.map(g => {
    const list = g.items.map(n => all.find(s => s.name === n)).filter(Boolean);
    list.forEach(s => used.add(s.name));
    return { ...g, list };
  }).filter(g => g.list.length);
  const rest = all.filter(s => !used.has(s.name));
  if (rest.length) groups.push({ name: "Other", about: "", list: rest });
  return groups;
}
const svcCount = list => { const up = list.filter(s => s.up).length; return `<b class="${up < list.length ? "bad" : ""}">${up}/${list.length}</b>`; };
const MODALS = {
  dns: () => `<h2 id="m-title">Pi-hole &middot; DNS</h2><p class="tag">Every website lookup my devices make goes through Pi-hole. Ads and trackers get blocked.</p>
    <div class="mgrid">${st("Queries (24h)", stats.queries)}${st("Blocked (24h)", stats.blocked)}${st("Blocked %", stats.percent)}</div>
    <div class="chart" id="mc-dns"></div>`,
  pi: () => `<h2 id="m-title">Raspberry Pi 5</h2><p class="tag">Live stats from the server this page runs on.</p>
    <div class="mgrid">${st("Uptime", stats.uptime)}${st("CPU temp", stats.temp)}${st("CPU load", stats.load)}${st("Memory used", stats.memory)}${st("Power", stats.power)}${st("Cost per year (est.)", stats.cost_year)}</div>
    <div class="chart" id="ml-cpu"></div><div class="chart" id="mc-mem"></div>`,
  temp: () => `<h2 id="m-title">CPU temperature</h2><p class="tag">The Pi has an active cooler. Under 60°C is comfortable, it slows down at 85°C.</p>
    <div class="mgrid">${st("Right now", stats.temp)}${st("CPU load", stats.load)}</div><div class="chart" id="ml-temp"></div><div class="chart" id="mc-temp"></div>`,
  power: () => `<h2 id="m-title">Power use</h2><p class="tag">Measured by the Pi 5's own power chip (volts x amps on each rail). The yearly cost adds about 2 W for the switch and power supply, at about 25p per kWh.</p>
    <div class="mgrid">${st("Pi right now", stats.power)}${st("Whole rack per year (est.)", stats.cost_year)}</div><div class="chart" id="ml-pow"></div><div class="chart" id="mc-pow"></div>`,
  services: () => {
    const all = stats.services || [], up = all.filter(s => s.up).length;
    const card = s => `<div class="${s.up ? "up" : ""}"><i></i><div><b>${s.name}</b><span>${ABOUT[s.name] || ""}</span>${s.detail || s.for ? `<span class="d">${[s.detail, s.for ? "up for " + s.for : ""].filter(Boolean).join(" &middot; ")}</span>` : ""}</div><em>${s.up ? "running" : "down"}</em></div>`;
    return `<h2 id="m-title">What's running</h2><p class="tag">Everything on the Pi, checked every minute. Most important first.</p>
    <div class="mgrid">${st("Running", `${up} of ${all.length}`)}${st("Firewall rules", (all.find(s => s.name === "Firewall (UFW)") || {}).detail?.replace(" rules", "") ?? "n/a")}${st("Pi uptime", stats.uptime)}</div>
    ${svcGroups().map(g => `<section class="svc-group"><h3>${g.name} ${svcCount(g.list)}</h3>${g.about ? `<p>${g.about}</p>` : ""}<div class="svc-big">${g.list.map(card).join("")}</div></section>`).join("")}`;
  },
  how: () => howHtml(),
  history: () => historyHtml(),
  attacks: () => `<h2 id="m-title">Honeypot attack map</h2><p class="tag">Every time something touches one of my fake services, it lands here. The honeypot is only on my home network, so most days it's quiet. That's the good outcome.</p>${atkMap()}`,
  network: () => `<h2 id="m-title">Network map</h2><p class="tag">How everything connects. Pick a story to watch the traffic, or click a device.</p>${netmap()}`,
  security: () => `<h2 id="m-title">Security</h2><p class="tag">How the Pi is locked down, and how I tested it.</p>
    <div class="cards">
      <div><b>No open ports on my router</b><p>This site comes through a Cloudflare Tunnel. The Pi connects out, so nothing at home is open to the internet.</p></div>
      <div><b>SSH keys only</b><p>Password logins are off, root can't log in, and only my user is allowed. I tested that passwords get rejected.</p></div>
      <div><b>Firewall blocks by default</b><p>UFW drops everything coming in apart from what I allowed from my home network and over Tailscale.</p></div>
      <div><b>Fail2ban</b><p>5 wrong SSH logins and that IP gets banned. I tested it from my Kali VM.</p></div>
      <div><b>Lynis audit: 63 to 75</b><p>Hardened SSH, kernel network settings and file permissions. Checked two warnings and found they were false positives.</p></div>
      <div><b>Only safe info here</b><p>No IP addresses, hostnames or software versions on this page.</p></div>
    </div>
    ${honeypotHtml()}
    <div class="am-btns" style="margin:-4px 0 12px"><button class="hbtn" data-go-atk>open the attack map <kbd>A</kbd></button><button class="hbtn" data-go-hist>30-day security history <kbd>S</kbd></button></div>
    <pre class="scan"><span class="f"># every TCP port, scanned from another device on my network</span>
$ sudo nmap -p- &lt;the pi&gt;
Not shown: <span class="f">65531 filtered tcp ports (no-response)</span>
PORT    STATE SERVICE
22/tcp  <span class="o">open</span>  ssh
53/tcp  <span class="o">open</span>  domain
80/tcp  <span class="o">open</span>  http
443/tcp <span class="o">open</span>  https</pre>`,
};
function honeypotHtml() {
  const h = stats && stats.honeypot;
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const when = t => { const s = Date.now() / 1000 - t; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m ago" : s < 86400 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; };
  const list = h && h.recent.length
    ? `<ul class="hp-list">${h.recent.map(e => `<li><i></i><b>${esc(e.service)}</b>${e.user === "a username" ? "<span>tried logging in</span>" : e.user ? `<span>tried user <code>${esc(e.user)}</code></span>` : "<span>connected</span>"}<em>${when(e.time)}</em></li>`).join("")}</ul>`
    : `<p class="note">Nothing has touched it yet. That's the idea: on a healthy network, nothing should.</p>`;
  return `<div class="hp-box"><h3>Honeypot</h3><p class="note">Fake services on my home network that nothing should ever touch: an old SSH server, Telnet, FTP, MySQL, Remote Desktop, VNC, Redis and a NAS login page. If anything connects, it gets logged. Only reachable from inside my home, nothing is open to the internet.</p>
    <div class="mgrid" style="margin:10px 0">${st("Alerts (24h)", h ? h.today : "n/a")}${st("Alerts (all time)", h ? h.total : "n/a")}</div>${list}</div>`;
}
const st = (l, v) => `<div class="stat"><span>${l}</span><b>${v ?? "n/a"}</b></div>`;
function drawModal(kind, animate = true) {
  if (!stats) { $("#m-body").innerHTML = `<p class="empty">Loading live stats...</p>`; return; }
  $("#m-body").innerHTML = MODALS[kind]();
  const dns = stats.dns_history || [], pi = stats.pi_history || [], n = v => Number(v).toLocaleString();
  const C = (id, o) => { const el = document.getElementById(id); if (el) lineChart(el, o); };
  C("mc-dns", { title: "DNS queries, last 24 hours", sub: "Every 10 minutes", min: 0, fmt: n,
    series: [{ name: "Total", colour: "var(--s-total)", data: dns.map(d => [d[0], d[1]]) }, { name: "Blocked", colour: "var(--s-blocked)", data: dns.map(d => [d[0], d[2]]) }] });
  C("mc-temp", { title: "CPU temperature, last 24 hours", sub: "Every 5 minutes", unit: "°C", series: [{ name: "CPU temp", colour: "var(--s-blocked)", data: pi.map(p => [p[0], p[1]]) }] });
  C("mc-mem", { title: "Memory used, last 24 hours", sub: "Every 5 minutes", unit: "%", min: 0, series: [{ name: "Memory used", colour: "var(--s-blocked)", data: pi.map(p => [p[0], p[2]]) }] });
  const pw = pi.filter(p => p.length > 3 && p[3] > 0);
  C("mc-pow", { title: "Power, last 24 hours", sub: "Every 5 minutes", unit: " W", min: 0, fmt: v => Number(v).toFixed(1), tickFmt: v => v.toFixed(1),
    series: [{ name: "Power", colour: "var(--s-blocked)", data: pw.map(p => [p[0], p[3]]) }] });
  drawLive(animate);
  if (kind === "network") netSetup();
  if (kind === "attacks") atkSetup();
  if (kind === "history") histSetup();
  $("#modal .sheet").classList.toggle("wide", kind === "network" || kind === "attacks" || kind === "how" || kind === "history");
  if (!animate) document.querySelectorAll("#m-body .draw").forEach(p => p.classList.remove("draw"));
}
let modalOpen = null, opener = null;
function openModal(kind, from) {
  modalOpen = kind; opener = from;
  const m = $("#modal"), sheet = m.querySelector(".sheet");
  m.classList.add("open"); m.setAttribute("aria-hidden", "false");
  drawModal(kind);
  $("#close").focus({ preventScroll: true });
  if (reduceMotion || !from) return;
  // grow out of the tile that was clicked
  const a = from.getBoundingClientRect(), b = sheet.getBoundingClientRect();
  sheet.animate([
    { transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width}, ${a.height / b.height})`, opacity: .4, borderRadius: "16px" },
    { transform: "none", opacity: 1, borderRadius: "20px" },
  ], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
}
function closeModal() {
  if (!modalOpen) return;
  const m = $("#modal"), sheet = m.querySelector(".sheet");
  const done = () => { m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); modalOpen = null; opener && opener.focus({ preventScroll: true }); };
  if (reduceMotion) return done();
  sheet.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 160, easing: "ease-in" }).onfinish = done;
}
document.querySelectorAll("[data-open]").forEach(t => {
  t.addEventListener("click", () => openModal(t.dataset.open, t));
  t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(t.dataset.open, t); } });
});
$("#close").onclick = closeModal;
$("#modal .scrim").onclick = closeModal;
addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (modalOpen) closeModal(); else if (current !== "intro") select("intro");
});

/* ---------- network map ---------- */
/* ---------- network map: zones, icons, traffic stories ---------- */
const ICON = {
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  router: '<rect x="3" y="12" width="18" height="7" rx="1.5"/><path d="M7 12V6M17 12V6M7 15.5h.01M10 15.5h.01"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
  switch: '<rect x="2.5" y="8" width="19" height="9" rx="1.5"/><path d="M6 12.5h2M10 12.5h2M14 12.5h2"/>',
  pi: '<rect x="4" y="5" width="16" height="14" rx="2"/><rect x="8.5" y="9" width="7" height="6" rx="1"/><path d="M4 9H2M4 15H2M22 9h-2M22 15h-2"/>',
  pc: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  drive: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="12" r="3.2"/><path d="M8.5 18h7"/>',
};
const NODES = {
  you:   { x: 95,  y: 95,  icon: "laptop", t: "You", s: "any browser",
           info: "Anyone visiting this site. You only ever talk to Cloudflare, never directly to my house, so you never see my home IP address." },
  cf:    { x: 330, y: 95,  icon: "cloud", t: "Cloudflare", s: "haydnhomelab.com",
           info: "Sits in front of my website. It hides my home IP, handles HTTPS and blocks a lot of attacks before they ever reach me." },
  net:   { x: 330, y: 240, icon: "globe", t: "Internet", s: "" , info: "The internet." },
  ts:    { x: 330, y: 385, icon: "shield", t: "Tailscale", s: "private network",
           info: "A private network just for my own devices, built on WireGuard encryption. The account has 2FA turned on." },
  me:    { x: 95,  y: 385, icon: "phone", t: "My devices", s: "Mac, phone",
           info: "My Mac and phone. With Tailscale on, they can reach the Pi from anywhere, as if I was at home." },
  hub:   { x: 540, y: 240, icon: "router", t: "EE hub", s: "home router",
           info: "My home router. No port forwarding is set up, so nothing from the internet is let in. That's why the tunnels matter." },
  tp:    { x: 720, y: 240, icon: "wifi", t: "TP-Link box", s: "wireless link",
           info: "Links the rack to the router over Wi-Fi, so the rack doesn't need a long cable to the router." },
  sw:    { x: 900, y: 240, icon: "switch", t: "Switch", s: "TL-SG105E",
           info: "5 port managed switch in the rack. It supports VLANs, which I'll use to separate the lab from the rest of the house." },
  pi:    { x: 900, y: 385, icon: "pi", t: "Raspberry Pi 5", s: "this website", pi: true,
           info: "The server. Runs Pi-hole with Unbound, Caddy (this website), the Cloudflare Tunnel, Tailscale, Jellyfin and Fail2ban. The firewall blocks everything I haven't allowed." },
  pc:    { x: 720, y: 385, icon: "pc", t: "My PC", s: "on the switch",
           info: "My PC, wired into the switch. It uses Pi-hole for its DNS, so ads and trackers get blocked." },
  drive: { x: 1075, y: 385, icon: "drive", t: "My Passport", s: "1TB, USB",
           info: "Plugged into the Pi. Holds Jellyfin films and the nightly backups. The backups folder is root-only." },
};
const LINKS = [["you","cf"],["cf","net"],["net","ts"],["me","ts"],["net","hub"],["hub","tp","wifi"],["tp","sw"],["sw","pi"],["sw","pc"],["pi","drive","usb"]];
const FLOWS = {
  site: { name: "Visiting this site", colour: "#f38020", route: ["you","cf","net","hub","tp","sw","pi"], tunnel: "cf",
    steps: [[0, 1, "You open haydnhomelab.com. Your browser connects to Cloudflare, not to my house."],
            [1, 3, "Cloudflare sends it down the tunnel. The Pi opened this tunnel itself, going outwards, so my router has no open ports."],
            [3, 6, "Inside my home it travels EE hub, TP-Link box, switch, Pi."],
            [6, 6, "Caddy on the Pi serves the page. The live stats update every 3 seconds."]] },
  remote: { name: "My remote access", colour: "#5a86e6", route: ["me","ts","net","hub","tp","sw","pi"], tunnel: "ts",
    steps: [[0, 1, "On my phone or Mac, I switch Tailscale on."],
            [1, 3, "Tailscale makes an encrypted WireGuard tunnel to the Pi. Again, the Pi's side started it, so nothing is open on my router."],
            [3, 6, "It comes through the home network like any other traffic."],
            [6, 6, "Now I can SSH in (keys only) or open Pi-hole and Jellyfin. Nobody else can reach these."]] },
  dns: { name: "Blocking ads", colour: "#5cff3a", route: ["pc","sw","pi","sw","tp","hub","net"],
    steps: [[0, 2, "My PC wants to load a website, so it asks Pi-hole for the address."],
            [2, 2, "__GRAVITY__"],
            [2, 6, "Allowed lookups go to Unbound, also on the Pi. It asks the internet's own DNS servers directly (root, then .com, then the site's own server) and checks the DNSSEC signatures, so no single company sees every site I visit."]] },
};
let netFlow = "site", netAnim = null, netPick = "pi";
function netmap() {
  const n = NODES, W = 1170, H = 470;
  const node = (id) => {
    const d = n[id];
    return `<g class="nm-node${d.pi ? " pi" : ""}" data-node="${id}" tabindex="0" role="button" aria-label="${d.t}" transform="translate(${d.x},${d.y})">
      <rect class="nm-box" x="-74" y="-26" width="148" height="52" rx="13"/>
      <g class="nm-ico" transform="translate(-62,-12)"><svg width="24" height="24" viewBox="0 0 24 24">${ICON[d.icon]}</svg></g>
      <text class="nm-t" x="-30" y="${d.s ? -2 : 5}">${d.t}</text>${d.s ? `<text class="nm-s" x="-30" y="13">${d.s}</text>` : ""}
    </g>`;
  };
  const link = ([a, b, kind]) => `<line class="nm-link${kind ? " " + kind : ""}" data-a="${a}" data-b="${b}" x1="${n[a].x}" y1="${n[a].y}" x2="${n[b].x}" y2="${n[b].y}"/>`;
  const tunnels = `
    <path class="nm-tun cf" d="M ${n.pi.x + 30} ${n.pi.y - 26} C 1080 120, 760 40, ${n.cf.x + 74} ${n.cf.y}"/>
    <path class="nm-tun ts" d="M ${n.pi.x - 20} ${n.pi.y + 26} C 820 470, 520 470, ${n.ts.x + 74} ${n.ts.y + 8}"/>`;
  return `<div class="nm-wrap">
    <div class="nm-flows" role="tablist">${Object.entries(FLOWS).map(([k, f]) =>
      `<button class="nm-flow${k === netFlow ? " on" : ""}" data-flow="${k}" role="tab" style="--c:${f.colour}">${f.name}</button>`).join("")}</div>
    <div class="nm-scroll"><svg class="nm" viewBox="0 0 ${W} ${H}" role="img" aria-label="Network map of my homelab">
      <rect class="nm-zone" x="18" y="24" width="425" height="426" rx="22"/><text class="nm-zl" x="40" y="50">THE INTERNET</text>
      <rect class="nm-zone home" x="458" y="160" width="700" height="290" rx="22"/><text class="nm-zl" x="480" y="186">MY HOME</text>
      <rect class="nm-zone rack" x="812" y="196" width="176" height="236" rx="16"/><text class="nm-zl" x="832" y="425">THE RACK</text>
      ${LINKS.map(link).join("")}
      ${tunnels}
      <text class="nm-tl cf" x="700" y="64">Cloudflare Tunnel, started by the Pi</text>
      <text class="nm-tl ts" x="560" y="462">WireGuard tunnel (Tailscale)</text>
      ${Object.keys(n).map(node).join("")}
      <circle class="nm-pkt" r="6" cx="-20" cy="-20"/>
    </svg></div>
    <p class="nm-swipe">swipe the map sideways to see it all</p>
    <div class="nm-under">
      <ol class="nm-steps" id="nm-steps"></ol>
      <div class="nm-info" id="nm-info"></div>
    </div>
  </div>`;
}
function netSetup() {
  const root = document.querySelector(".nm-wrap"); if (!root) return;
  root.querySelectorAll(".nm-flow").forEach(b => b.onclick = () => { netFlow = b.dataset.flow; netRun(); });
  root.querySelectorAll(".nm-node").forEach(g => {
    const pick = () => { netPick = g.dataset.node; netInfo(); };
    g.onclick = pick; g.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
  });
  netRun(); netInfo();
}
function netInfo() {
  const d = NODES[netPick], box = $("#nm-info"); if (!box) return;
  document.querySelectorAll(".nm-node").forEach(g => g.classList.toggle("picked", g.dataset.node === netPick));
  let live = "";
  if (d.pi && stats) {
    const L = lastLive();
    live = `<div class="nm-live">${[["CPU", L ? Math.round(L[1]) + "%" : stats.load], ["Temp", L && L[2] != null ? L[2].toFixed(1) + "°C" : stats.temp],
      ["Power", L && L[3] != null ? L[3].toFixed(1) + " W" : stats.power], ["Uptime", stats.uptime]].map(([k, v]) => `<span><em>${k}</em>${v ?? "n/a"}</span>`).join("")}</div>`;
  }
  box.innerHTML = `<div class="nm-ih"><svg width="22" height="22" viewBox="0 0 24 24">${ICON[d.icon]}</svg><b>${d.t}</b></div><p>${d.info}</p>${live}<p class="nm-hint">Click any device on the map.</p>`;
}
function netRun() {
  cancelAnimationFrame(netAnim);
  const f = FLOWS[netFlow], root = document.querySelector(".nm-wrap"); if (!root) return;
  root.style.setProperty("--flow", f.colour);
  root.querySelectorAll(".nm-flow").forEach(b => b.classList.toggle("on", b.dataset.flow === netFlow));
  const pairs = new Set(f.route.slice(1).map((id, i) => [f.route[i], id].sort().join("|")));
  root.querySelectorAll(".nm-link").forEach(l => l.classList.toggle("lit", pairs.has([l.dataset.a, l.dataset.b].sort().join("|"))));
  root.querySelectorAll(".nm-node").forEach(g => g.classList.toggle("lit", f.route.includes(g.dataset.node)));
  root.querySelectorAll(".nm-tun, .nm-tl").forEach(t => t.classList.toggle("lit", !!f.tunnel && t.classList.contains(f.tunnel)));
  const grav = stats && stats.gravity ? Number(stats.gravity).toLocaleString() : "thousands of";
  $("#nm-steps").innerHTML = f.steps.map((s, i) => `<li data-i="${i}"><span>${i + 1}</span>${s[2].replace("__GRAVITY__", `Pi-hole checks it against ${grav} known ad and tracker domains. If it's on the list, the answer is "nowhere" and the ad never loads.`)}</li>`).join("");
  const pts = f.route.map(id => [NODES[id].x, NODES[id].y]);
  const pkt = root.querySelector(".nm-pkt"), lis = [...root.querySelectorAll("#nm-steps li")];
  // Timeline: move along each link, and pause at the nodes where a step happens there
  const SPEED = 240, HOLD = 1600, END = 1800;
  const holds = new Set(f.steps.filter(s => s[0] === s[1]).map(s => s[0]));
  const plan = [];
  pts.slice(1).forEach((p, i) => {
    if (holds.has(i) && i > 0) plan.push({ at: i, ms: HOLD });
    plan.push({ from: i, ms: Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]) / SPEED * 1000 });
  });
  plan.push({ at: pts.length - 1, ms: END });
  const cycle = plan.reduce((a, b) => a + b.ms, 0);
  let t0 = performance.now();
  const step = now => {
    let t = (now - t0) % cycle, k = 0;
    while (t > plan[k].ms) { t -= plan[k].ms; k++; }
    const e = plan[k];
    let p, at;
    if (e.from == null) { p = pts[e.at]; at = e.at; }
    else { const a = pts[e.from], b = pts[e.from + 1], r = t / e.ms; p = [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]; at = e.from; }
    pkt.setAttribute("cx", p[0]); pkt.setAttribute("cy", p[1]);
    const still = e.from == null;
    lis.forEach((li, j) => { const [a, b] = f.steps[j]; li.classList.toggle("on", a === b ? still && at === a : at >= a && at < b && !(still && holds.has(at))); });
    if (modalOpen === "network") netAnim = requestAnimationFrame(step);
  };
  if (reduceMotion) { const last = pts[pts.length - 1]; pkt.setAttribute("cx", last[0]); pkt.setAttribute("cy", last[1]); lis.forEach(li => li.classList.add("on")); return; }
  netAnim = requestAnimationFrame(step);
}


/* ---------- honeypot attack map ---------- */
// Only real events from the honeypot log: no IPs or passwords ever reach this page.
// It replays the last 7 days quickly, then watches for new ones every minute.
const TRAPS = [
  { port: 2222, n: "SSH",     svc: "Fake SSH" },
  { port: 23,   n: "Telnet",  svc: "Fake Telnet" },
  { port: 21,   n: "FTP",     svc: "Fake FTP" },
  { port: 3306, n: "MySQL",   svc: "Fake MySQL" },
  { port: 3389, n: "RDP",     svc: "Fake Remote Desktop" },
  { port: 5900, n: "VNC",     svc: "Fake VNC" },
  { port: 6379, n: "Redis",   svc: "Fake Redis" },
  { port: 8081, n: "NAS",     svc: "Fake NAS login page" },
];
const AC = 320, AR_TRAP = 178, AR_HOME = 286;
TRAPS.forEach((t, i) => { t.a = -Math.PI / 2 + i * 2 * Math.PI / TRAPS.length; t.x = AC + AR_TRAP * Math.cos(t.a); t.y = AC + AR_TRAP * Math.sin(t.a); });
const trapFor = e => TRAPS.find(t => t.port === e.port || t.svc === e.service);
let atkSeen = 0, atkCounts = {}, atkTimers = [], atkMode = "replay";
const atkEsc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function atkWeek() { const h = stats && stats.honeypot; return (h && h.week) || []; }
function atkMap() {
  const traps = TRAPS.map((t, i) => `
    <g class="am-trap" data-i="${i}" transform="translate(${t.x.toFixed(1)},${t.y.toFixed(1)})">
      <circle class="heat" r="44" opacity="0"/>
      <circle class="b" r="31"/>
      <text class="p" text-anchor="middle" y="4">:${t.port}</text>
      <text class="n" text-anchor="middle" y="50">${t.n}</text>
      <g class="cnt" transform="translate(23,-23)" style="display:none"><circle r="10"/><text text-anchor="middle" y="3.5">0</text></g>
    </g>`).join("");
  const spokes = TRAPS.map(t => `<line class="am-spoke" x1="${AC}" y1="${AC}" x2="${t.x.toFixed(1)}" y2="${t.y.toFixed(1)}"/>`).join("");
  const h = stats && stats.honeypot;
  return `<div class="am">
    <svg class="am-svg" viewBox="0 0 640 640" role="img" aria-label="Map of my honeypot's fake services and what has touched them">
      <defs><linearGradient id="am-sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb21a" stop-opacity="0"/><stop offset="1" stop-color="#ffb21a" stop-opacity=".28"/></linearGradient></defs>
      <text class="am-zl" x="24" y="34">THE INTERNET</text>
      <text class="am-wall" x="24" y="52">can't reach these: no ports</text>
      <text class="am-wall" x="24" y="67">forwarded on my router</text>
      <circle class="am-ring home" cx="${AC}" cy="${AC}" r="${AR_HOME}"/>
      <text class="am-zl" x="${AC}" y="${AC - AR_HOME + 20}" text-anchor="middle">MY HOME NETWORK</text>
      <circle class="am-ring" cx="${AC}" cy="${AC}" r="${AR_TRAP}"/><circle class="am-ring" cx="${AC}" cy="${AC}" r="100"/><circle class="am-ring" cx="${AC}" cy="${AC}" r="236"/>
      ${reduceMotion ? "" : `<g class="am-sweep"><path d="M${AC} ${AC} L${AC + AR_HOME} ${AC} A${AR_HOME} ${AR_HOME} 0 0 0 ${(AC + AR_HOME * Math.cos(-0.5)).toFixed(1)} ${(AC + AR_HOME * Math.sin(-0.5)).toFixed(1)} Z" fill="url(#am-sw)"/></g>`}
      ${spokes}
      <g class="am-core" transform="translate(${AC},${AC})"><rect x="-66" y="-30" width="132" height="60" rx="14"/>
        <text text-anchor="middle" y="-3">OpenCanary</text><text class="s" text-anchor="middle" y="13">on the Pi</text></g>
      ${traps}
      <g id="am-fx"></g>
    </svg>
    <div class="am-side">
      <div class="am-mode" id="am-mode"><i></i><span>replaying the last 7 days</span></div>
      <div class="mgrid">${st("Last 24h", h ? h.today : "n/a")}${st("Last 7 days", h ? atkWeek().length : "n/a")}${st("All time", h ? h.total : "n/a")}</div>
      <div id="am-quiet"></div>
      <ul class="am-feed" id="am-feed" aria-live="polite"></ul>
      <div class="am-btns"><button class="hbtn" id="am-replay">replay</button><button class="hbtn" id="am-test">send a test hit</button></div>
      <p class="am-note">Shows which fake service was touched, when, and common usernames like root. Never IP addresses or passwords.</p>
    </div>
  </div>`;
}
function atkClear() { atkTimers.forEach(clearTimeout); atkTimers = []; const fx = $("#am-fx"); if (fx) fx.innerHTML = ""; }
function atkSetup() {
  atkClear(); atkCounts = {};
  $("#am-replay").onclick = () => atkReplay();
  $("#am-test").onclick = () => atkHit({ time: Date.now() / 1000, port: TRAPS[Math.floor(Math.random() * TRAPS.length)].port, test: true }, true);
  atkReplay();
}
function atkSetMode(mode) {
  atkMode = mode;
  const m = $("#am-mode"); if (!m) return;
  m.classList.toggle("live", mode === "live");
  m.querySelector("span").textContent = mode === "live" ? "live, watching every minute" : "replaying the last 7 days";
}
function atkQuiet() {
  const q = $("#am-quiet"); if (!q) return;
  q.innerHTML = atkWeek().length ? "" : `<p class="am-quiet">Nothing has touched the traps in the last 7 days. On a healthy network, that's exactly what should happen. Press "send a test hit" to see what an alert looks like.</p>`;
}
function atkReplay() {
  atkClear(); atkCounts = {};
  const feed = $("#am-feed"); if (feed) feed.innerHTML = "";
  document.querySelectorAll(".am-trap").forEach(g => atkBadge(g, 0));
  const ev = atkWeek();
  atkSeen = ev.length ? ev[ev.length - 1].time : 0;
  atkQuiet();
  if (reduceMotion || !ev.length) { ev.forEach(e => atkHit(e, false)); atkSetMode("live"); return; }
  atkSetMode("replay");
  // squash 7 days into about 8 seconds, but keep hits at least 120ms apart
  const t0 = ev[0].time, span = Math.max(1, ev[ev.length - 1].time - t0);
  let last = -999;
  ev.forEach(e => {
    const at = Math.max(last + 120, (e.time - t0) / span * 8000);
    last = at;
    atkTimers.push(setTimeout(() => atkHit(e, true), 300 + at));
  });
  atkTimers.push(setTimeout(() => atkSetMode("live"), 300 + last + 1400));
}
function atkUpdate() {
  // called when stats.json refreshes: animate anything newer than what we've shown
  if (atkMode !== "live") return;
  const fresh = atkWeek().filter(e => e.time > atkSeen);
  if (!fresh.length) return;
  atkSeen = fresh[fresh.length - 1].time;
  atkQuiet();
  fresh.forEach((e, i) => atkTimers.push(setTimeout(() => atkHit(e, true), i * 500)));
}
function atkBadge(g, n) {
  const c = g.querySelector(".cnt"); c.style.display = n ? "" : "none"; c.querySelector("text").textContent = n > 99 ? "99+" : n;
  g.querySelector(".heat").setAttribute("opacity", n ? Math.min(.28, .06 + n * .03) : 0);
}
function atkHit(e, animate) {
  if (modalOpen !== "attacks") return;
  const t = trapFor(e) || TRAPS[0], i = TRAPS.indexOf(t), g = document.querySelector(`.am-trap[data-i="${i}"]`);
  const done = () => {
    if (!e.test) { atkCounts[i] = (atkCounts[i] || 0) + 1; atkBadge(g, atkCounts[i]); }
    atkFeed(e, t, animate);
    if (!animate) return;
    g.classList.add("hit"); atkTimers.push(setTimeout(() => g.classList.remove("hit"), 700));
    const fx = $("#am-fx"), r = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    r.setAttribute("class", "am-ripple"); r.setAttribute("cx", t.x); r.setAttribute("cy", t.y); r.setAttribute("r", 31);
    r.style.transformBox = "fill-box"; r.style.transformOrigin = "center";
    fx.appendChild(r);
    r.animate([{ transform: "scale(1)", opacity: .9 }, { transform: "scale(2.2)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => r.remove();
  };
  if (!animate) return done();
  // a packet comes in from somewhere on the home network edge, near the trap it's heading for
  const a = t.a + (Math.random() - .5) * .9, sx = AC + AR_HOME * Math.cos(a), sy = AC + AR_HOME * Math.sin(a);
  const fx = $("#am-fx"), NS = "http://www.w3.org/2000/svg";
  const trail = document.createElementNS(NS, "line"), pkt = document.createElementNS(NS, "circle");
  trail.setAttribute("class", "am-trail"); pkt.setAttribute("class", "am-pkt"); pkt.setAttribute("r", 4.5);
  if (e.test) { trail.style.stroke = "#5a86e6"; }
  fx.append(trail, pkt);
  const ex = t.x - (t.x - sx) * 31 / Math.hypot(t.x - sx, t.y - sy), ey = t.y - (t.y - sy) * 31 / Math.hypot(t.x - sx, t.y - sy);
  const dur = 750, start = performance.now();
  const step = now => {
    if (modalOpen !== "attacks") return;
    const k = Math.min(1, (now - start) / dur), q = 1 - Math.pow(1 - k, 3);
    const x = sx + (ex - sx) * q, y = sy + (ey - sy) * q, tk = Math.max(0, q - .25);
    pkt.setAttribute("cx", x); pkt.setAttribute("cy", y);
    trail.setAttribute("x1", sx + (ex - sx) * tk); trail.setAttribute("y1", sy + (ey - sy) * tk); trail.setAttribute("x2", x); trail.setAttribute("y2", y);
    if (k < 1) requestAnimationFrame(step); else { pkt.remove(); trail.remove(); done(); }
  };
  requestAnimationFrame(step);
}
function atkFeed(e, t, animate) {
  const feed = $("#am-feed"); if (!feed) return;
  const what = e.test ? "<span>test hit, not real</span>"
    : e.user === "a username" ? "<span>tried logging in</span>"
    : e.user ? `<span>tried user <code>${atkEsc(e.user)}</code></span>` : "<span>connected</span>";
  const d = new Date(e.time * 1000);
  const when = d.toLocaleDateString([], { weekday: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const li = document.createElement("li");
  li.className = (animate ? "new" : "") + (e.test ? " test" : "");
  li.innerHTML = `<i></i><b>${atkEsc(t.n)}</b>${what}<em>${when}</em>`;
  feed.prepend(li);
  while (feed.children.length > 60) feed.lastChild.remove();
}
$("#open-atk").onclick = e => openModal("attacks", e.currentTarget);
document.addEventListener("click", e => { if (e.target.closest("[data-go-atk]")) openModal("attacks", $("#open-atk")); });

/* ---------- security history ---------- */
const escH = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let regionNames = null;
try { regionNames = new Intl.DisplayNames(["en-GB"], { type: "region" }); } catch (e) {}
const country = c => { if (!c || c === "XX" || c === "T1") return "unknown"; try { return regionNames ? regionNames.of(c) : c; } catch (e) { return c; } };
const agoShort = t => { const s = Date.now() / 1000 - t; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m ago" : s < 86400 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; };
function last30() {
  const days = (hist && hist.days) || [], out = [], have = Object.fromEntries(days.map(d => [d.date, d]));
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000), key = d.toLocaleDateString("en-CA");
    out.push(have[key] || { date: key, missing: true });
  }
  return out;
}
const dayUptime = d => {
  const v = Object.values(d.uptime || {}).filter(x => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
function dayBars(id, title, sub, days, get, fmt = v => Number(v).toLocaleString(), opts = {}) {
  const W = 600, H = 120, B = 18, vals = days.map(get), max = opts.max ?? Math.max(1, ...vals.filter(v => v != null)), bw = W / days.length;
  const lo = opts.min ?? 0;
  const bars = days.map((d, i) => {
    const v = vals[i];
    if (v == null) return `<rect class="none" x="${(i * bw + 1).toFixed(1)}" y="${H - B - 2}" width="${(bw - 2).toFixed(1)}" height="2"><title>${d.date}: not recorded</title></rect>`;
    const h = Math.max(2, (v - lo) / (max - lo || 1) * (H - B - 6));
    return `<rect class="${opts.bad && opts.bad(v) ? "bad" : ""}" x="${(i * bw + 1).toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${d.date}: ${fmt(v)}</title></rect>`;
  }).join("");
  const label = d => new Date(d.date + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const total = opts.total ? opts.total(vals.filter(v => v != null)) : null;
  return `<div class="chart hchart" id="${id}"><h4>${title}${total != null ? `<span class="htotal">${total}</span>` : ""}</h4><p class="sub">${sub}</p>
    <svg class="hbars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${title}, last 30 days">${bars}
    <text class="axis" x="0" y="${H - 3}">${label(days[0])}</text><text class="axis" x="${W}" y="${H - 3}" text-anchor="end">today</text></svg></div>`;
}
function historyHtml() {
  if (!hist) return `<h2 id="m-title">Security history</h2><p class="tag">The Pi hasn't sent any history yet. It starts collecting once the new stats script is running.</p>`;
  const days = last30(), sum = a => a.reduce((x, y) => x + y, 0), n = v => Number(v).toLocaleString();
  const recorded = days.filter(d => !d.missing).length;
  const ups = days.map(dayUptime).filter(v => v != null);
  const fw = hist.firewall;
  const feed = fw && fw.feed && fw.feed.length
    ? `<ul class="cf-feed">${fw.feed.map(e => `<li><span class="m">${escH(e.method)}</span><code>${escH(e.path)}</code><span class="r">${escH(e.rule)}</span><span class="c">${escH(country(e.country))}</span><em>${agoShort(e.time)}</em></li>`).join("")}</ul>`
    : `<p class="note">${fw ? "Nothing blocked in the last few hours." : "Not connected to Cloudflare's security log yet."}</p>`;
  return `<h2 id="m-title">Security history</h2><p class="tag">The last 30 days, collected by the Pi every minute.${recorded < 30 && hist.days.length ? ` It started recording on ${new Date((hist.days[0] || {}).date + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}, so older days are empty.` : ""}</p>
    <div class="mgrid">${st("Blocked by Cloudflare", n(sum(days.map(d => d.cf_blocked || 0))))}${st("Ads and trackers blocked", n(sum(days.map(d => d.blocked || 0))))}${st("Honeypot hits", n(sum(days.map(d => d.honeypot || 0))))}${st("Average uptime", ups.length ? (sum(ups) / ups.length).toFixed(2) + "%" : "n/a")}</div>
    <div class="hgrid">
      ${dayBars("hb-cf", "Blocked by Cloudflare", "Requests stopped before they reached my house", days, d => d.cf_blocked ?? null)}
      ${dayBars("hb-ads", "Ads and trackers blocked", "Pi-hole, all my devices", days, d => d.blocked ?? null)}
      ${dayBars("hb-hp", "Honeypot hits", "Anything touching my fake services", days, d => d.honeypot ?? (d.missing ? null : 0), undefined, { bad: v => v > 0 })}
      ${dayBars("hb-up", "Uptime", "Average across every service, checked every minute", days, dayUptime, v => v.toFixed(2) + "%", { min: 90, max: 100, bad: v => v < 99 })}
    </div>
    <div class="hp-box"><h3>Recently blocked by Cloudflare</h3><p class="note">Real requests my firewall rules and rate limit stopped. Only the path, country and rule are shown, never IP addresses. Some are my own tests. Updated every 5 minutes.</p>${feed}</div>
    <p class="hw-note">Uptime per service is on the <a href="/status/">status page</a>.</p>`;
}
function histSetup() {}

/* ---------- how it works (for people who aren't techy) ---------- */
function visLine() {
  const v = stats && stats.visitors;
  if (!v) return "";
  const n = x => Number(x).toLocaleString();
  return `visitors: <b>${n(v.today)}</b> today &middot; <b>${n(v.week)}</b> this week`;
}
function visBars(days) {
  if (!days || days.length < 2) return "";
  const W = 600, H = 70, max = Math.max(1, ...days.map(d => d[1])), bw = W / days.length;
  const today = new Date().toISOString().slice(0, 10);
  return `<svg class="hw-bars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Visitors per day">${days.map((d, i) => {
    const h = Math.max(2, d[1] / max * (H - 4));
    return `<rect class="${d[0] === today ? "today" : ""}" x="${(i * bw + 1).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${d[0]}: ${d[1]} visitors</title></rect>`;
  }).join("")}</svg>`;
}
function howHtml() {
  const card = (icon, t, s) => `<div class="hw-card"><svg viewBox="0 0 24 24">${ICON[icon]}</svg><b>${t}</b><span>${s}</span></div>`;
  const v = stats && stats.visitors, n = x => Number(x).toLocaleString();
  return `<h2 id="m-title">How it works</h2><p class="tag">The plain English version, no tech knowledge needed.</p>
  <section class="hw-sec"><h3>What is this?</h3>
    <p>A <b>homelab</b> is a small server at home that you use to learn. Mine is a <b>Raspberry Pi 5</b>, a computer about the size of a credit card, in a mini 10 inch rack on my desk. I'm using it to learn networking and cyber security hands-on, because I want to work in cyber security.</p></section>
  <section class="hw-sec"><h3>What's in the rack</h3><div class="hw-cards">
    ${card("pi", "Raspberry Pi 5", "The brain. Every service on this page runs on it, using about as much power as a phone charger.")}
    ${card("switch", "Network switch", "Plugs everything together, like an extension lead for internet cables.")}
    ${card("drive", "1TB hard drive", "Storage for films and the Pi's nightly backups.")}
  </div></section>
  <section class="hw-sec"><h3>What it does</h3><div class="hw-cards">
    ${card("shield", "Blocks ads", "Pi-hole is like a bouncer with a list. When a device asks for an advert, it gets turned away before it ever loads.")}
    ${card("globe", "Looks up websites itself", "Unbound finds where websites live without asking Google or Cloudflare, so no big company sees every site I visit.")}
    ${card("phone", "Lets me in from anywhere", "Tailscale is a private, encrypted tunnel just for my own devices, so I can reach the Pi from my phone anywhere.")}
    ${card("laptop", "My own Netflix", "Jellyfin plays films from the hard drive on the TV, laptop or phone.")}
    ${card("drive", "Backs itself up", "Every night it saves all its settings to the hard drive, and keeps two weeks of copies.")}
  </div></section>
  <section class="hw-sec"><h3>How you're seeing this page</h3>
    <p>Normally to put a website online from home, you'd open a door in your router to the whole internet. I didn't. Instead:</p>
    <ol class="hw-flow">
      <li><b>You visit the site</b>Your browser talks to Cloudflare, a big company that sits in front of millions of websites.</li>
      <li><b>Cloudflare checks you</b>It blocks attacks and bots before they get anywhere near my house.</li>
      <li><b>Through a tunnel</b>The Pi opened a tunnel out to Cloudflare itself, so my router has no open doors.</li>
      <li><b>The Pi answers</b>It sends this page back, and updates the numbers every 3 seconds.</li>
    </ol>
    <div class="am-btns"><button class="hbtn" data-go-net>see it animated on the network map <kbd>N</kbd></button></div></section>
  <section class="hw-sec"><h3>How it stays safe</h3><ul class="hw-safe">
    <li><b>No open doors</b> on my home router</li>
    <li><b>Firewall</b> blocks everything I haven't allowed</li>
    <li><b>No passwords</b> to log in, only digital keys</li>
    <li><b>Auto bans</b> anyone guessing logins</li>
    <li><b>A honeypot</b>: fake services that set off an alarm</li>
    <li><b>Security headers A+</b> on this site</li>
    <li><b>Cloudflare firewall rules</b> and rate limits</li>
    <li><b>Security updates</b> install themselves daily</li>
    <li><b>Tested it myself</b> by attacking it from Kali Linux</li>
  </ul>
  <div class="am-btns"><button class="hbtn" data-go-atk>watch the honeypot <kbd>A</kbd></button></div></section>
  ${v ? `<section class="hw-sec"><h3>Visitors</h3>
    <div class="mgrid">${st("Today", n(v.today))}${st("Last 7 days", n(v.week))}${st("Last " + v.days.length + " days", n(v.month))}${st("Page views", n(v.views_month))}</div>
    ${visBars(v.days)}
    <p class="hw-note">Counted by Cloudflare, unique visitors per day added up. My Pi never sees or stores anyone's IP address, just these totals.</p></section>` : ""}
  <section class="hw-sec"><h3>Who built it</h3>
    <p>I chose and bought the parts, built the rack, ran every command on the Pi and tested it all. <b>Claude, an AI assistant, wrote the code for this website</b> and guided me through the setup step by step. The full story, with everything that went wrong, is on <a href="https://github.com/haydncow/homelab-plan">GitHub</a>. More about me, and the apprenticeship I'm looking for, is on my <a href="/">homepage</a>.</p></section>`;
}
$("#open-how").onclick = e => openModal("how", e.currentTarget);
document.addEventListener("click", e => {
  if (e.target.closest("[data-go-how]")) openModal("how", $("#open-how"));
  if (e.target.closest("[data-go-net]")) openModal("network", $("#open-net"));
  if (e.target.closest("[data-go-hist]")) openModal("history", $("#open-hist"));
});
$("#open-net").onclick = e => openModal("network", e.currentTarget);
$("#open-hist").onclick = e => openModal("history", e.currentTarget);
addEventListener("keydown", e => {
  if (e.target.matches("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "n" || e.key === "N") openModal("network", $("#open-net"));
  if (e.key === "a" || e.key === "A") openModal("attacks", $("#open-atk"));
  if (e.key === "h" || e.key === "H") openModal("how", $("#open-how"));
  if (e.key === "s" || e.key === "S") openModal("history", $("#open-hist"));
});

/* ---------- "updated 2s ago" ticker ---------- */
setInterval(() => {
  const L = lastLive(), t = L ? L[0] : stats && stats.updated;
  if (!t) return;
  const s = Math.max(0, Math.round(Date.now() / 1000 - t));
  $("#ago").textContent = s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}, 1000);

/* ---------- 3D tilt on the rack ---------- */
if (!reduceMotion && matchMedia("(hover: hover) and (min-width: 1100px)").matches) {
  const rt = $(".t-rack"), rs = $("#rack");
  rt.addEventListener("pointermove", e => {
    if (rt.classList.contains("zoomed")) return;
    const r = rt.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    rs.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 5}deg)`;
  });
  rt.addEventListener("pointerleave", () => (rs.style.transform = ""));
}

let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => modalOpen && !["network", "attacks", "how"].includes(modalOpen) && drawModal(modalOpen, false), 200); });

/* ---------- live data: every 3 seconds ---------- */
let live = null, liveOk = false, liveFails = 0;
const lastLive = () => liveOk && live.points.length ? live.points[live.points.length - 1] : null;
const secs = t => new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
function drawLive(animate = false) {
  if (!liveOk || !modalOpen) return;
  const pts = live.points, col = i => pts.filter(p => p[i] != null).map(p => [p[0], p[i]]);
  const sub = `Live. A new reading every ${live.every || 3} seconds.`;
  const D = (id, o) => {
    const el = document.getElementById(id);
    if (!el || el.matches(":hover")) return;   // don't redraw under the mouse
    lineChart(el, { ...o, sub, tf: secs });
    if (!animate) el.querySelectorAll(".draw").forEach(p => p.classList.remove("draw"));
  };
  D("ml-cpu", { title: "CPU use, last 5 minutes", unit: "%", min: 0, fmt: v => Math.round(v), series: [{ name: "CPU", colour: "var(--s-blocked)", data: col(1) }] });
  D("ml-temp", { title: "CPU temperature, last 5 minutes", unit: "°C", fmt: v => Number(v).toFixed(1), tickFmt: v => v.toFixed(1), series: [{ name: "CPU temp", colour: "var(--s-blocked)", data: col(2) }] });
  D("ml-pow", { title: "Power, last 5 minutes", unit: " W", min: 0, fmt: v => Number(v).toFixed(2), tickFmt: v => v.toFixed(1), series: [{ name: "Power", colour: "var(--s-blocked)", data: col(3) }] });
}
function renderLive() {
  const pts = live.points, last = pts[pts.length - 1];
  if (last[2] != null) setGauge(last[2]);
  if (last[3] != null) countTo(document.querySelector('[data-count="power"]'), last[3], 1);
  $("#cpu").textContent = Math.round(last[1]) + "%";
  if (last[4] != null) $("#mem").textContent = Math.round(last[4]) + "%";
  spark($("#spark-cpu"), [{ colour: "var(--s-blocked)", data: pts.map(p => p[1]) }]);
  const pw = pts.filter(p => p[3] != null).map(p => p[3]);
  if (pw.length > 1) spark($("#spark-pow"), [{ colour: "var(--s-blocked)", data: pw }]);
  drawLive();
}
async function loadLive() {
  if (document.hidden || !booted) return;
  try {
    const r = await fetch("/live.json", { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json(), pts = data.points || [];
    if (!pts.length || Date.now() / 1000 - pts[pts.length - 1][0] > 30) throw new Error("stale");
    live = data; liveOk = true; liveFails = 0;
    document.body.classList.add("is-live");
    renderLive();
  } catch (e) {
    // live service not running: fall back to the once-a-minute stats
    if (++liveFails >= 3 && liveOk) { liveOk = false; document.body.classList.remove("is-live"); render(); }
  }
}
setInterval(loadLive, 3000);

/* ---------- minute data ---------- */
async function load() {
  const pill = $("#status"), text = $("#status-text");
  try {
    const r = await fetch("/stats.json", { cache: "no-store" });
    const first = !stats;
    stats = await r.json();
    const live = (Date.now() / 1000 - stats.updated) / 60 < 15;
    pill.classList.remove("online", "offline"); pill.classList.add(live ? "online" : "offline");
    text.textContent = live ? "online" : "last seen " + stats.updated_text;
    if (booted) render();
    if (booted && !reduceMotion && first) startPackets();
  } catch (e) {
    pill.classList.remove("online"); pill.classList.add("offline"); text.textContent = "stats unavailable";
  }
}
const _showRest = showRest;
showRest = function () { _showRest(); setTimeout(() => { render(); loadLive(); }, 300); };

/* ---------- 90-day history (uptime, daily totals, Cloudflare blocks) ---------- */
async function loadHist() {
  try {
    const r = await fetch("/history.json", { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    hist = await r.json();
    if (booted) render();
    if (modalOpen === "history") drawModal("history", false);
  } catch (e) { /* older Pi script without history yet, the rest of the page still works */ }
}
loadHist();
setInterval(loadHist, 300000);

show("intro", false);
runBoot();
load();
setInterval(load, 60000);
