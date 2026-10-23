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
