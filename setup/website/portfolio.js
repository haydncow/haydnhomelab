// My portfolio (the homepage): theme, live readings from my Raspberry Pi, and the
// sentence at the top that's built from my Cloudflare firewall log.
// Kept in its own file so the Content Security Policy can block inline scripts.
// Code written by Claude (AI). It never shows IP addresses: only paths, countries and counts.
// The paths come from strangers' requests, so they're only ever added as plain text.
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  // ---------- theme: follows the system setting unless the visitor picks one ----------
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) { /* storage blocked, fine */ }
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  // phones always get dark mode (easier on the eyes, and one less button on a small screen)
  if (window.matchMedia && matchMedia("(max-width: 760px)").matches) root.setAttribute("data-theme", "dark");
  var darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function currentTheme() {
    return root.getAttribute("data-theme") || (darkQuery && darkQuery.matches ? "dark" : "light");
  }
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function setText(name, text) { all('[data-live="' + name + '"]').forEach(function (el) { el.textContent = text; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }

  // ---------- turning a blocked request into a plain-English sentence ----------
  var regions = null;
  try { regions = new Intl.DisplayNames(["en-GB"], { type: "region" }); } catch (e) { /* older browser */ }
  var THE = { NL: 1, US: 1, GB: 1, PH: 1, AE: 1, BS: 1, DO: 1, CF: 1, MV: 1, SC: 1, KY: 1, GM: 1, CZ: 0, VA: 1, MH: 1, SB: 1, KM: 1 };
  var NAMES = { HK: "Hong Kong", MO: "Macao", CD: "the DR Congo", CG: "the Republic of the Congo", US: "the United States", GB: "the UK", KR: "South Korea", KP: "North Korea" };
  function place(code) {
    code = (code || "").toUpperCase();
    if (code === "T1") return "a computer hiding its location with Tor";
    if (!code || code === "XX") return "a computer in an unknown country";
    var name = NAMES[code];
    if (!name) {
      try { name = regions ? regions.of(code) : code; } catch (e) { name = code; }
      if (THE[code]) name = "the " + name;
    }
    return "a computer in " + name;
  }
  // what the path is, for someone who isn't technical (checked in order, first match wins)
  var EXPLAIN = [
    [/(^|\/)\.env/i, "a file that often holds passwords"],
    [/(^|\/)\.git(\/|$)/i, "where code keeps its history"],
    [/(^|\/)\.aws|credentials/i, "a file of cloud passwords"],
    [/wp-login\.php|wp-admin/i, "a WordPress login page"],
    [/xmlrpc\.php/i, "a WordPress file used to guess passwords"],
    [/wp-|wordpress/i, "part of WordPress"],
    [/phpinfo|(^|\/)info\.php/i, "a page that lists server settings"],
    [/phpmyadmin|(^|\/)pma(\/|$)/i, "a database admin page"],
    [/\.(bak|old|backup|sql|zip|tar|gz|tgz|rar|7z)$/i, "a backup file"],
    [/\.php/i, "a PHP page"],
    [/cgi-bin/i, "an old kind of server script"],
    [/(^|\/)(admin|administrator|login|signin)(\/|$|\.)/i, "an admin login page"],
    [/\.(ya?ml|ini|conf|config|json|xml)$/i, "a settings file"],
    [/server-status/i, "a server status page"],
    [/\.ds_store/i, "a hidden Mac file"],
    [/actuator|(^|\/)api\//i, "an app’s admin interface"]
  ];
  function explain(path) {
    for (var i = 0; i < EXPLAIN.length; i++) if (EXPLAIN[i][0].test(path)) return EXPLAIN[i][1];
    return "";
  }
  var BLOCKED_BY = {
    "My firewall rule": "My firewall rule blocked it", "Rate limit": "My rate limit blocked it",
    "Managed rules": "Cloudflare’s managed rules blocked it", "Security level": "Cloudflare’s security check blocked it",
    "Browser check": "Cloudflare’s browser check stopped it", "DDoS protection": "Cloudflare’s DDoS protection blocked it",
    "Bot fight mode": "Cloudflare’s bot protection blocked it", "Bad request": "Cloudflare refused it as a bad request"
  };
  function agoStart(secs) {
    if (secs < 90) return "Just now";
    if (secs < 3300) return Math.round(secs / 60) + " minutes ago";
    if (secs < 5400) return "An hour ago";
    return Math.round(secs / 3600) + " hours ago";
  }
  function agoText(secs) {
    if (secs < 90) return "a minute ago";
    if (secs < 3600) return Math.round(secs / 60) + " minutes ago";
    if (secs < 172800) return Math.round(secs / 3600) + " hours ago";
    return Math.round(secs / 86400) + " days ago";
  }
  function todayKey() {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  var lineSig = null;
  function liveLine(now) {
    var el = document.querySelector("[data-live-line]");
    if (!el || !hist || !hist.firewall) return;
    var feed = hist.firewall.feed || [], f = feed[0];
    if (!f || !f.time || now - f.time > 26 * 3600) return;      // nothing recent: keep the normal sentence
    var path = String(f.path || "/"), shown = path.length > 38 ? path.slice(0, 36) + "…" : path;
    var verb = String(f.method).toUpperCase() === "POST" ? " tried to send data to " : " tried to open ";
    var what = explain(path);
    var today = (hist.days || []).filter(function (d) { return d.date === todayKey(); })[0];
    var n = today && today.cf_blocked;
    var sig = [f.time, path, f.country, f.rule, n, Math.round((now - f.time) / 60)].join("|");
    if (sig === lineSig) return;
    lineSig = sig;
    // built from text nodes, so a strange path can't turn into code on my page
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(agoStart(now - f.time) + ", " + place(f.country) + verb));
    var code = document.createElement("span");
    code.className = "path";
    code.textContent = shown;
    code.title = path;
    frag.appendChild(code);
    frag.appendChild(document.createTextNode((what ? ", " + what : "") + ". " + (BLOCKED_BY[f.rule] || "Cloudflare blocked it") +
      " before it reached the Pi." + (n > 1 ? " That’s " + n.toLocaleString("en-GB") + " blocked today." : "")));
    el.textContent = "";
    el.appendChild(frag);
    var src = document.querySelector("[data-live-src]");
    if (src) src.textContent = "From my Cloudflare firewall log. It updates while you’re here, and never shows IP addresses.";
  }

  // ---------- live readings ----------
  var stats = null, hist = null, lastPoint = null, boot = null, fetchedOk = false;

  function parseUptime(text) {   // "1d 2h 5m" -> seconds, for older stats without an exact boot time
    if (!text) return null;
    var m = /(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?/.exec(text);
    return m ? (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 : null;
  }
  function formatUptime(secs) {
    secs = Math.max(0, Math.floor(secs));
    var d = Math.floor(secs / 86400), h = Math.floor(secs % 86400 / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60;
    return (d ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
  }
  function fresh() { return fetchedOk && stats && stats.updated && Date.now() / 1000 - stats.updated < 600; }

  function refresh() {
    var a = getJSON("/stats.json").then(function (s) { stats = s; fetchedOk = true; }, function () { fetchedOk = false; });
    var b = getJSON("/live.json").then(function (l) {
      lastPoint = l && l.points && l.points.length ? l.points[l.points.length - 1] : null;
    }, function () { lastPoint = null; });
    var c = getJSON("/history.json").then(function (h) { hist = h; }, function () { /* the rest still works */ });
    Promise.all([a, b, c]).then(render);
  }

  function render() {
    var now = Date.now() / 1000, ok = fresh();
    all("[data-live-led]").forEach(function (el) {
      el.classList.toggle("on", !!ok);
      el.classList.toggle("off", fetchedOk && !ok);
    });
    var rack = document.querySelector("[data-anatomy]");
    if (rack) rack.classList.toggle("offline", !ok);

    liveLine(now);

    if (!fetchedOk || !stats) {
      boot = null;
      setText("status", "Couldn’t reach the lab just now.");
      setText("uptime", "Up for --"); setText("temp", "CPU --"); setText("backup", "Backup --");
      var src = document.querySelector("[data-live-src]");
      if (src && lineSig === null) src.textContent = "Couldn’t reach the Pi just now, so this sentence isn’t live.";
      return;
    }
    var svc = stats.services || [], up = svc.filter(function (s) { return s.up; }).length;
    setText("status", ok ? (svc.length ? "Online now, " + up + " of " + svc.length + " services running." : "Online now.")
                         : "Offline right now. Last seen " + agoText(now - stats.updated) + ".");

    if (typeof stats.boot === "number") boot = stats.boot;
    else { var secs = parseUptime(stats.uptime); boot = secs == null ? null : stats.updated - secs; }
    if (!ok) boot = null;
    tick();

    var temp = lastPoint && lastPoint[2] != null && now - lastPoint[0] < 120 ? lastPoint[2].toFixed(1) + "°C" : stats.temp;
    setText("temp", temp ? "CPU " + temp : "CPU --");
    var backup = svc.filter(function (s) { return s.name === "Nightly backup"; })[0];
    var m = backup && backup.detail ? /last ran (.+?) ago/.exec(backup.detail) : null;
    setText("backup", m ? "Last backed up " + m[1] + " ago" : "Backup --");

    var sec = stats.security;
    setText("cve-line", sec && sec.cve_critical != null
      ? "This week’s scan: " + sec.cve_critical + " critical, " + (sec.cve_high != null ? sec.cve_high : "?") + " high."
      : "");
  }

  function tick() {
    if (boot == null) { if (!fresh()) setText("uptime", fetchedOk && stats ? "Offline" : "Up for --"); return; }
    setText("uptime", "Up for " + formatUptime(Date.now() / 1000 - boot));
  }

  document.addEventListener("DOMContentLoaded", function () {
    // theme button
    var btn = document.querySelector(".theme");
    if (btn) {
      var sync = function () {
        var t = currentTheme();
        btn.setAttribute("data-mode", t);
        btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
      };
      sync();
      btn.addEventListener("click", function () {
        var next = currentTheme() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* not saved, still switches */ }
        sync();
      });
      if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", sync);
    }
    all("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });

    // my name joins the top bar once the big one has scrolled away
    var mast = document.querySelector("[data-masthead]");
    if (mast && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        document.body.classList.toggle("past-name", !es[0].isIntersecting);
      }, { rootMargin: "-60px 0px 0px 0px" }).observe(mast);
    } else document.body.classList.add("past-name");

    // the one thing that moves on its own: the rack's lights switch on when you reach it
    var rack = document.querySelector("[data-anatomy]");
    if (rack) {
      if ("IntersectionObserver" in window && !calm) {
        var ro = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { rack.classList.add("on"); ro.disconnect(); }
        }, { threshold: 0.45 });
        ro.observe(rack);
      } else rack.classList.add("on");
    }

    refresh();
    setInterval(refresh, 30000);
    setInterval(tick, 1000);

    // a back-to-top button on phones
    if (window.matchMedia && matchMedia("(max-width: 760px)").matches) {
      var toTop = document.createElement("button");
      toTop.className = "to-top"; toTop.type = "button"; toTop.setAttribute("aria-label", "Back to top");
      toTop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); });
      document.body.appendChild(toTop);
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { toTop.classList.toggle("show", window.scrollY > window.innerHeight * 1.5); ticking = false; });
      }, { passive: true });
    }

    console.log("%cHi! You opened the console, so you're probably my kind of person.", "font-weight:bold");
    console.log("Everything about this lab, including what went wrong, is at https://github.com/haydncow/haydnhomelab");
  });
})();
