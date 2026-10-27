// Light and dark mode for my live lab, status page and write-ups, the same as on my portfolio.
// It follows the system setting unless the visitor picks one, and the choice is
// shared with the portfolio (both pages use the same "theme" key).
// In its own file so the Content Security Policy can block inline scripts. Code written by Claude (AI).
(function () {
  "use strict";
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) { /* storage blocked, fine */ }
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  // phones always get dark mode (easier on the eyes, and one less button on a small screen)
  var phone = window.matchMedia && matchMedia("(max-width: 760px)").matches;
  if (phone) root.setAttribute("data-theme", "dark");
  var darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function current() {
    return root.getAttribute("data-theme") || (darkQuery && darkQuery.matches ? "dark" : "light");
  }
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".theme");
    if (!btn) return;
    function sync() {
      var t = current();
      btn.setAttribute("data-mode", t);
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    sync();
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* not saved, still switches */ }
      sync();
    });
    if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", sync);
  });
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
