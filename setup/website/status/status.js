// My status page: 90 days of uptime for every service on the Pi.
// Reads /history.json (written every minute by homelab-status.py) and
// /stats.json for the live details. Code written by Claude (AI).
(function () {
  "use strict";
  var GROUPS = [
    ["Security", ["Firewall (UFW)", "Fail2ban", "CrowdSec", "Honeypot", "SSH", "Auto updates", "Vulnerability scan"]],
    ["Network and DNS", ["Pi-hole", "Unbound", "Tailscale", "Cloudflare Tunnel"]],
    ["Apps", ["Jellyfin", "Homepage", "Speedtest Tracker"]],
    ["This website", ["Web server (Caddy)", "Web server", "Live stats"]],
    ["Looking after the Pi", ["Nightly backup", "SD card"]]
  ];
  var ABOUT = {
    "Firewall (UFW)": "Blocks everything coming in unless I've allowed it",
    "Fail2ban": "Bans anyone who gets the SSH login wrong 5 times",
    "CrowdSec": "Spots attacks in my logs and blocks them, with a shared blocklist",
    "Vulnerability scan": "Trivy checks my Docker apps for known CVEs every week",
    "Honeypot": "Fake services that alert me if anything pokes around",
    "SSH": "How I log in. Keys only, no passwords",
    "Auto updates": "Installs security fixes by itself",
    "Pi-hole": "Blocks ads and trackers on my devices",
    "Unbound": "Looks websites up itself, privately",
    "Tailscale": "Private VPN to reach the lab from anywhere",
    "Cloudflare Tunnel": "Puts this site online without opening my router",
    "Jellyfin": "My own Netflix",
    "Homepage": "My private dashboard",
    "Speedtest Tracker": "Tests my broadband every 2 hours",
    "Web server (Caddy)": "Serves this website", "Web server": "Serves this website",
    "Live stats": "Readings every 3 seconds for the live lab",
    "Nightly backup": "Encrypted backup every night",
    "SD card": "Watches the card for wear and errors"
  };
  var DAYS = window.innerWidth < 600 ? 30 : 90;   // fewer, wider bars on a phone
  var $ = function (s) { return document.querySelector(s); };
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dayKey(offset) { return new Date(Date.now() - offset * 86400000).toLocaleDateString("en-CA"); }
  function nice(key) { return new Date(key + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }

  function draw(hist, stats) {
    var byDate = {};
    (hist.days || []).forEach(function (d) { byDate[d.date] = d; });
    var keys = [];
    for (var i = DAYS - 1; i >= 0; i--) keys.push(dayKey(i));
    var live = {};
    (hist.services || []).forEach(function (s) { live[s.name] = s; });
    var details = {};
    ((stats && stats.services) || []).forEach(function (s) { details[s.name] = s; });

    var names = (hist.services || []).map(function (s) { return s.name; });
    var used = {}, groups = [];
    GROUPS.forEach(function (g) {
      var list = g[1].filter(function (n) { return names.indexOf(n) >= 0; });
      list.forEach(function (n) { used[n] = true; });
      if (list.length) groups.push([g[0], list]);
    });
    var rest = names.filter(function (n) { return !used[n]; });
    if (rest.length) groups.push(["Other", rest]);

    var down = names.filter(function (n) { return !live[n].up && !live[n].maint; });
    var maint = names.filter(function (n) { return !live[n].up && live[n].maint; });
    var ov = $("#overall");
    var led = down.length ? "off" : "on";
    var text = down.length ? down.length + " service" + (down.length > 1 ? "s" : "") + " down: " + down.join(", ")
      : "All systems running" + (maint.length ? " (" + maint.length + " stopped on purpose)" : "");
    var fresh = Date.now() / 1000 - hist.updated < 15 * 60;
    if (!fresh) { led = "off"; text = "The Pi hasn't reported in for a while"; }
    ov.innerHTML = '<span class="led ' + led + '"></span><span>' + esc(text) + "</span><small>checked " +
      new Date(hist.updated * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</small>";
    document.querySelectorAll("[data-live-led]").forEach(function (el) { el.className = "led " + (fresh ? "on" : "off"); });

    $("#groups").innerHTML = groups.map(function (g) {
      return '<section class="sgroup"><h2>' + esc(g[0]) + "</h2>" + g[1].map(function (name) {
        var s = live[name], upW = 0, checks = 0;
        var bars = keys.map(function (k) {
          var d = byDate[k], v = d && d.uptime ? d.uptime[name] : undefined;
          var cls, label;
          if (v == null) { cls = "none"; label = "not recorded"; }
          else if (v === "maint") { cls = "maint"; label = "stopped on purpose"; }
          else {
            cls = v >= 99.5 ? "" : v >= 90 ? "mid" : "bad"; label = v.toFixed(2) + "% up";
            var c = d.checks - ((d.maint && d.maint[name]) || 0); upW += v * c; checks += c;
          }
          return '<i class="' + cls + '" data-tip="' + esc(nice(k) + ": " + label) + '"></i>';
        }).join("");
        var pct = checks ? (upW / checks).toFixed(2) + "%" : "n/a";
        var state = s.up ? ["up", "Running"] : s.maint ? ["maint", "Maintenance"] : ["down", "Down"];
        var det = details[name];
        var forTxt = det && det.for ? "up for " + det.for : "";
        return '<div class="svc-row"><div class="svc-top"><b>' + esc(name) + '</b><span class="svc-state ' + state[0] + '">' + state[1] +
          '</span><span class="about">' + esc(ABOUT[name] || forTxt) + '</span><span class="pct" title="Uptime over the days recorded">' + pct + "</span></div>" +
          '<div class="ubars" style="--n:' + DAYS + '" role="img" aria-label="' + esc(name + ", " + pct + " uptime over the days recorded") + '">' + bars + "</div>" +
          (s.maint ? '<p class="maint-note">' + esc(s.maint) + "</p>" : "") + "</div>";
      }).join("") + "</section>";
    }).join("") + '<div class="ubar-axis" aria-hidden="true"><span>' + nice(keys[0]) + "</span><span>today</span></div>";

    var first = (hist.days || [])[0];
    $("#since").textContent = first ? "Recording since " + new Date(first.date + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) +
      ". Days before that are empty. Downtime includes restarts while I was setting things up." : "";
  }

  // hover or tap a bar to see that day
  var tip = $("#tip");
  function showTip(e) {
    var t = e.target.closest && e.target.closest("[data-tip]");
    if (!t) { tip.style.opacity = 0; return; }
    tip.textContent = t.getAttribute("data-tip");
    var r = t.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
    tip.style.top = (r.top - tip.offsetHeight - 8) + "px";
    tip.style.opacity = 1;
  }
  document.addEventListener("pointerover", showTip);
  document.addEventListener("pointerdown", showTip);
  window.addEventListener("scroll", function () { tip.style.opacity = 0; }, { passive: true });

  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  function load() {
    Promise.all([getJSON("/history.json"), getJSON("/stats.json").catch(function () { return null; })])
      .then(function (res) { draw(res[0], res[1]); })
      .catch(function () {
        $("#overall").innerHTML = '<span class="led off"></span><span>Couldn\'t load the status from the Pi right now.</span>';
      });
  }
  document.addEventListener("DOMContentLoaded", function () { load(); setInterval(load, 60000); });
})();
