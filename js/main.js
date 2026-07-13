/* ========================================
   FINCA GANADERA EL PROGRESO - JAVASCRIPT
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- Menú Hamburguesa ---
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Cerrar menú al hacer clic en un enlace
  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  // Cerrar menú al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    }
  });

  // --- Header con fondo al hacer scroll ---
  const header = document.getElementById('header');

  const handleScroll = () => {
    if (window.scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Ejecutar al cargar

  // --- Scroll suave a secciones ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        const headerHeight = header.offsetHeight;
        const targetPosition = targetElement.offsetTop - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Animaciones al hacer scroll (Intersection Observer) ---
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in').forEach(element => {
    observer.observe(element);
  });

  // --- Filtro de Galería ---
  const filtroBtns = document.querySelectorAll('.filtro-btn');
  const galeriaItems = document.querySelectorAll('.galeria-item');

  filtroBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover clase active de todos los botones
      filtroBtns.forEach(b => b.classList.remove('active'));
      // Agregar active al botón clickeado
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      galeriaItems.forEach(item => {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
          item.style.display = 'block';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.8)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // --- Lightbox de Galería ---
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  galeriaItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  lightboxClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  // --- Formulario de Contacto (Simulado) ---
  const contactForm = document.getElementById('contactForm');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const mensaje = document.getElementById('mensaje').value.trim();

    if (!nombre || !email || !mensaje) {
      showNotification('Por favor, complete todos los campos obligatorios.', 'error');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Por favor, ingrese un correo electrónico válido.', 'error');
      return;
    }

    // Simular envío
    const submitBtn = contactForm.querySelector('.form-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;

    setTimeout(() => {
      showNotification(`Gracias ${nombre}! Su mensaje ha sido enviado correctamente. Nos pondremos en contacto pronto.`, 'success');
      contactForm.reset();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }, 1500);
  });

  // --- Sistema de Notificaciones ---
  function showNotification(message, type = 'info') {
    // Remover notificación existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
      </div>
      <button class="notification-close">&times;</button>
    `;

    // Estilos de la notificación
    Object.assign(notification.style, {
      position: 'fixed',
      top: '100px',
      right: '20px',
      padding: '16px 24px',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
      zIndex: '3000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '15px',
      maxWidth: '450px',
      animation: 'slideInRight 0.4s ease',
      background: type === 'success' ? 'linear-gradient(135deg, #00420C, #007A19)' : 
                  type === 'error' ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 
                  'linear-gradient(135deg, #2980b9, #3498db)',
      color: '#fff',
      fontFamily: "'Lato', sans-serif"
    });

    const content = notification.querySelector('.notification-content');
    Object.assign(content.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '0.95rem'
    });

    const closeBtn = notification.querySelector('.notification-close');
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: '1.5rem',
      cursor: 'pointer',
      padding: '0',
      lineHeight: '1',
      opacity: '0.8',
      transition: 'opacity 0.3s'
    });

    closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.8');

    closeBtn.addEventListener('click', () => notification.remove());

    document.body.appendChild(notification);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease forwards';
        setTimeout(() => notification.remove(), 400);
      }
    }, 5000);
  }

  // Agregar animaciones CSS para notificaciones
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // --- Botón Volver Arriba ---
  const backToTop = document.getElementById('backToTop');

  const handleBackToTop = () => {
    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', handleBackToTop);

  backToTop.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // --- Resaltar enlace activo del menú ---
  const sections = document.querySelectorAll('section[id]');

  const highlightNav = () => {
    const scrollPosition = window.scrollY + header.offsetHeight + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        document.querySelectorAll('.nav-menu a').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav);

  // --- Contador animado para estadísticas (opcional) ---
  const animateCounter = (element, target, duration = 2000) => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        element.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(start).toLocaleString();
      }
    }, 16);
  };

  // --- Precarga de imágenes de galería ---
  const preloadImages = () => {
    const images = document.querySelectorAll('.galeria-item img');
    images.forEach(img => {
      const preload = new Image();
      preload.src = img.src;
    });
  };

  preloadImages();

  // --- Efecto parallax sutil en el hero ---
  const hero = document.querySelector('.hero');

  window.addEventListener('scroll', () => {
    if (window.scrollY < window.innerHeight) {
      const parallax = window.scrollY * 0.3;
      hero.style.backgroundPositionY = `calc(50% + ${parallax}px)`;
    }
  });

  console.log('🐄 Finca Ganadera El Progreso - Sitio web cargado correctamente');

});
