// My portfolio (the homepage): theme toggle and live readings from my Raspberry Pi.
// Kept in its own file so the Content Security Policy can block inline scripts.
// Code written by Claude (AI). The data comes from the same stats files as my live lab.
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  // ---- theme: follows the system setting unless the visitor picks one ----
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) { /* storage blocked, fine */ }
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  // phones always get dark mode (easier on the eyes, and one less button on a small screen)
  var phone = window.matchMedia && matchMedia("(max-width: 760px)").matches;
  if (phone) root.setAttribute("data-theme", "dark");
  var darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return darkQuery && darkQuery.matches ? "dark" : "light";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".theme");
    function syncButton() {
      var t = currentTheme();
      btn.setAttribute("data-mode", t);
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    if (btn) {
      syncButton();
      btn.addEventListener("click", function () {
        var next = currentTheme() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* not saved, still switches */ }
        syncButton();
      });
      if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", syncButton);
    }
    var printBtn = document.querySelector("[data-print]");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
    startLive();
    console.log("%cHi! You opened the console, so you're probably my kind of person.", "font-weight:bold");
    console.log("Everything about this lab, including what went wrong, is at https://github.com/haydncow/haydnhomelab");
  });

  // ---- live readings ----
  var stats = null, lastPoint = null, boot = null, fetchedOk = false;

  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function setText(name, text) { all('[data-live="' + name + '"]').forEach(function (el) { el.textContent = text; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }

  // "1d 2h 5m" -> seconds, for older stats files without an exact boot time
  function parseUptime(text) {
    if (!text) return null;
    var m = /(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?/.exec(text);
    if (!m) return null;
    return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60;
  }

  function formatUptime(secs) {
    secs = Math.max(0, Math.floor(secs));
    var d = Math.floor(secs / 86400), h = Math.floor(secs % 86400 / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60;
    return (d ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  function agoText(secs) {
    if (secs < 90) return "a minute ago";
    if (secs < 3600) return Math.round(secs / 60) + " minutes ago";
    if (secs < 172800) return Math.round(secs / 3600) + " hours ago";
    return Math.round(secs / 86400) + " days ago";
  }

  function refresh() {
    var a = getJSON("/stats.json").then(function (s) { stats = s; fetchedOk = true; }, function () { fetchedOk = false; });
    var b = getJSON("/live.json").then(function (l) {
      lastPoint = l && l.points && l.points.length ? l.points[l.points.length - 1] : null;
    }, function () { lastPoint = null; });
    Promise.all([a, b]).then(render);
  }

  function render() {
    var now = Date.now() / 1000;
    var fresh = fetchedOk && stats && stats.updated && now - stats.updated < 600;

    // status light and sentence
    all("[data-live-led]").forEach(function (el) {
      el.classList.toggle("on", !!fresh);
      el.classList.toggle("off", fetchedOk && !fresh);
    });
    all("[data-live-pin]").forEach(function (el) { el.classList.toggle("on", !!fresh); });

    if (!fetchedOk || !stats) {
      boot = null;
      setText("status", "Couldn\u2019t reach the lab just now.");
      setText("uptime", "up for --");
      setText("temp", "CPU --");
      setText("backup", "backup --");
      return;
    }

    var svc = stats.services || [];
    var up = svc.filter(function (s) { return s.up; }).length;
    if (fresh) {
      setText("status", svc.length ? "Online now, " + up + " of " + svc.length + " services running." : "Online now.");
    } else {
      setText("status", "The lab is offline right now. Last seen " + agoText(now - stats.updated) + ".");
    }

    // uptime: exact boot time if the stats have it, otherwise work it out
    if (typeof stats.boot === "number") boot = stats.boot;
    else {
      var secs = parseUptime(stats.uptime);
      boot = secs == null ? null : stats.updated - secs;
    }
    if (!fresh) boot = null;
    tick();

    // temperature: the 3 second reading if there is one, otherwise the minute one
    var temp = null;
    if (lastPoint && lastPoint[2] != null && now - lastPoint[0] < 120) temp = lastPoint[2].toFixed(1) + "°C";
    else if (stats.temp) temp = stats.temp;
    setText("temp", temp ? "CPU " + temp : "CPU --");

    // last backup, from the "Nightly backup" line in What's running
    var backup = svc.filter(function (s) { return s.name === "Nightly backup"; })[0];
    var m = backup && backup.detail ? /last ran (.+?) ago/.exec(backup.detail) : null;
    setText("backup", m ? "backed up " + m[1] + " ago" : "backup --");
  }

  function tick() {
    if (boot == null) {
      if (!fresh()) setText("uptime", fetchedOk && stats ? "offline" : "up for --");
      return;
    }
    setText("uptime", "up for " + formatUptime(Date.now() / 1000 - boot));
  }
  function fresh() { return fetchedOk && stats && stats.updated && Date.now() / 1000 - stats.updated < 600; }

  function startLive() {
    refresh();
    setInterval(refresh, 30000);
    setInterval(tick, 1000);
  }
})();

// Back to top button for long pages on phones. Code written by Claude (AI).
(function () {
  "use strict";
  if (!window.matchMedia || !matchMedia("(max-width: 760px)").matches) return;
  document.addEventListener("DOMContentLoaded", function () {
    if (document.documentElement.scrollHeight < window.innerHeight * 3) return;   // short pages don't need it
    var b = document.createElement("button");
    b.className = "to-top"; b.type = "button"; b.setAttribute("aria-label", "Back to top");
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(b);
    var shown = false;
    window.addEventListener("scroll", function () {
      var s = window.scrollY > window.innerHeight * 1.5;
      if (s !== shown) { shown = s; b.classList.toggle("show", s); }
    }, { passive: true });
  });
})();
