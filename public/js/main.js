/* ========================================
   FINCA GANADERA EL PROGRESO - MAIN JS
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {

  // --- Menú Hamburguesa ---
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });

    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  }

  // --- Header Scroll Effect ---
  const header = document.getElementById('header');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // --- Scroll Suave a Secciones ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const headerHeight = header.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  // --- Animaciones al Scroll (fade-in, fade-in-left, fade-in-right, scale-in) ---
  const observerOptions = { threshold: 0.1 };
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .scale-in').forEach(function (el) {
    observer.observe(el);
  });

  // --- Animated Counters ---
  const counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const counters = entry.target.querySelectorAll('[data-target]');
        counters.forEach(function (counter) {
          animateCounter(counter, parseInt(counter.getAttribute('data-target')), 2000);
        });
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const statsBar = document.querySelector('.stats-bar');
  if (statsBar) {
    counterObserver.observe(statsBar);
  }

  function animateCounter(element, target, duration) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(function () {
      start += increment;
      if (start >= target) {
        element.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(start).toLocaleString();
      }
    }, 16);
  }

  // --- Filtros de Galería ---
  document.querySelectorAll('.filtro-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filtro-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      const items = document.querySelectorAll('.galeria-item');

      items.forEach(function (item) {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
          item.style.display = '';
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.8)';
          setTimeout(function () { item.style.display = 'none'; }, 300);
        }
      });
    });
  });

  // --- Lightbox con Navegación ---
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxCounter = document.getElementById('lightboxCounter');
  let currentLightboxIndex = 0;
  let visibleItems = [];

  function getVisibleItems() {
    return Array.from(document.querySelectorAll('.galeria-item')).filter(function (item) {
      return item.style.display !== 'none';
    });
  }

  function openLightbox(index) {
    visibleItems = getVisibleItems();
    currentLightboxIndex = index;
    updateLightboxImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateLightboxImage() {
    if (visibleItems.length === 0) return;
    const item = visibleItems[currentLightboxIndex];
    const img = item.querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCounter.textContent = (currentLightboxIndex + 1) + ' / ' + visibleItems.length;
  }

  document.querySelectorAll('.galeria-item').forEach(function (item, index) {
    item.addEventListener('click', function () {
      visibleItems = getVisibleItems();
      const visibleIndex = visibleItems.indexOf(item);
      openLightbox(visibleIndex >= 0 ? visibleIndex : 0);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', function (e) {
      e.stopPropagation();
      currentLightboxIndex = (currentLightboxIndex - 1 + visibleItems.length) % visibleItems.length;
      updateLightboxImage();
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', function (e) {
      e.stopPropagation();
      currentLightboxIndex = (currentLightboxIndex + 1) % visibleItems.length;
      updateLightboxImage();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') {
      currentLightboxIndex = (currentLightboxIndex - 1 + visibleItems.length) % visibleItems.length;
      updateLightboxImage();
    }
    if (e.key === 'ArrowRight') {
      currentLightboxIndex = (currentLightboxIndex + 1) % visibleItems.length;
      updateLightboxImage();
    }
  });

  // --- Formulario de Contacto ---
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const nombre = document.getElementById('nombre').value.trim();
      const email = document.getElementById('email').value.trim();
      const mensaje = document.getElementById('mensaje').value.trim();

      if (!nombre || !email || !mensaje) {
        showNotification('Por favor, complete todos los campos requeridos.', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification('Por favor, ingrese un correo electrónico válido.', 'error');
        return;
      }

      const submitBtn = contactForm.querySelector('.form-submit');
      const originalContent = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
      submitBtn.disabled = true;

      setTimeout(function () {
        showNotification('¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.', 'success');
        contactForm.reset();
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
      }, 1500);
    });
  }

  // --- Sistema de Notificaciones ---
  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;

    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const icon = icons[type] || icons.info;

    notification.innerHTML = '<div class="notification-content"><i class="fas ' + icon + '"></i><span>' + message + '</span></div><button class="notification-close">&times;</button>';

    notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:16px 24px;border-radius:12px;color:#fff;font-family:"DM Sans",sans-serif;font-size:0.95rem;z-index:3000;display:flex;align-items:center;gap:12px;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,0.2);animation:slideInRight 0.4s ease;backdrop-filter:blur(10px);';

    const colors = { success: '#2D6A4F', error: '#C62828', info: '#1565C0' };
    notification.style.background = colors[type] || colors.info;

    document.body.appendChild(notification);

    const style = document.createElement('style');
    style.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
    document.head.appendChild(style);

    notification.querySelector('.notification-close').addEventListener('click', function () {
      notification.style.animation = 'slideOutRight 0.4s ease forwards';
      setTimeout(function () { notification.remove(); }, 400);
    });

    notification.querySelector('.notification-close').style.cssText = 'background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;opacity:0.8;padding:0 0 0 8px;transition:opacity 0.3s;';
    notification.querySelector('.notification-close').addEventListener('mouseenter', function () { this.style.opacity = '1'; });
    notification.querySelector('.notification-close').addEventListener('mouseleave', function () { this.style.opacity = '0.8'; });

    setTimeout(function () {
      if (notification.parentElement) {
        notification.style.animation = 'slideOutRight 0.4s ease forwards';
        setTimeout(function () { notification.remove(); }, 400);
      }
    }, 5000);
  }

  // --- Botón Volver Arriba ---
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });

    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Active Nav Link ---
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', function () {
    const scrollPos = window.scrollY + header.offsetHeight + 100;
    sections.forEach(function (section) {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector('.nav-menu a[href="#' + id + '"]');
      if (link) {
        if (scrollPos >= top && scrollPos < top + height) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  });

  // --- Hero Parallax ---
  const hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', function () {
      if (window.scrollY < hero.offsetHeight) {
        hero.style.backgroundPositionY = (window.scrollY * 0.3) + 'px';
      }
    });
  }

  // --- Preload Imágenes de Galería ---
  document.querySelectorAll('.galeria-item img').forEach(function (img) {
    const preload = new Image();
    preload.src = img.src;
  });

});
