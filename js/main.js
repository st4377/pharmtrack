/* ============================================
   PharmaTrack — Shared JS Utilities
   ============================================ */
  // Authentication Check
document.addEventListener("DOMContentLoaded", function () {
  const isLoggedIn = localStorage.getItem("pt_loggedIn");

  const publicPages = ["auth.html"];

  const currentPage = window.location.pathname.split("/").pop();

  if (!isLoggedIn && !publicPages.includes(currentPage)) {
    window.location.href = "auth.html";
  }
});
// Reveal on scroll
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

// Highlight active nav link based on current page
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav ul li a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}
 function logout(){
  localStorage.removeItem("pt_loggedIn");
  window.location.href = "auth.html";
}

// Init everything on DOM ready 
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initActiveNav();

 


});
