/* ============================================
   PharmaTrack — Shared JS Utilities
   ============================================ */

// ── Logout — MUST be outside DOMContentLoaded to work globally ──
function logout() {
  sessionStorage.clear();
  window.location.href = "/auth/logout";
}

// ── Auth check ───────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  const publicPages = ["auth.html"];
  const currentPage = window.location.pathname.split("/").pop();

  // Check Google login via URL param (set after OAuth callback)
  const params = new URLSearchParams(window.location.search);
  if (params.get("loggedIn") === "true") {
    sessionStorage.setItem("pt_loggedIn", "true");
    sessionStorage.setItem("pt_name",  params.get("name")  || "");
    sessionStorage.setItem("pt_photo", params.get("photo") || "");
    sessionStorage.setItem("pt_email", params.get("email") || "");
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const isLoggedIn = sessionStorage.getItem("pt_loggedIn");
  if (!isLoggedIn && !publicPages.includes(currentPage)) {
    window.location.href = "/auth.html";
  }

  initReveal();
  initActiveNav();
});

// ── Reveal on scroll 
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));
}

// ── Active nav link ───────────────────────────
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav ul li a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}