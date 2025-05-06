function initializeNavigation() {
  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
            
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
            
      if (targetElement) {
        const headerOffset = 120;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
                
        // Update active nav link manually after scroll
        setTimeout(() => {
          updateActiveNavLink();
        }, 500);
      }
    });
  });

  // Add active state to navigation
  function updateActiveNavLink() {
    const navLinks = document.querySelectorAll('nav a');
        
    // Define sections with their actual content containers
    const aboutSection = document.querySelector('#about-content #about') || document.querySelector('#about');
    const careerSection = document.querySelector('#career');
    const interestsSection = document.querySelector('#interests-content #interests') || document.querySelector('#interests');
    const musicSection = document.querySelector('#music');
    const wineSection = document.querySelector('#wine');
    const contactSection = document.querySelector('#contact-content #contact') || document.querySelector('#contact');
        
    const sections = [
      { element: aboutSection, id: 'about' },
      { element: careerSection, id: 'career' },
      { element: interestsSection, id: 'interests' },
      { element: musicSection, id: 'music' },
      { element: wineSection, id: 'wine' },
      { element: contactSection, id: 'contact' }
    ].filter(section => section.element); // Remove any null elements

    let current = '';
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const isMobile = window.innerWidth <= 950;
        
    // Adjust threshold for mobile
    const threshold = isMobile ? 150 : 200;
        
    // Handle initial page load - highlight About section by default
    if (scrollPosition < 100) {
      current = 'about';
    } else {
      // Find which section is currently visible
      for (const section of sections) {
        const sectionElement = section.element;
        const sectionRect = sectionElement.getBoundingClientRect();
                
        // Consider a section visible if it's within the viewport threshold
        // For mobile, make the threshold smaller to account for smaller screen size
        if (
          (sectionRect.top <= threshold && sectionRect.bottom >= 0) ||
                    (sectionRect.top <= windowHeight && sectionRect.bottom >= windowHeight) ||
                    (sectionRect.top <= 0 && sectionRect.bottom >= windowHeight)
        ) {
          current = section.id;
                    
          // Special handling for music and wine sections
          if (section.id === 'music' || section.id === 'wine') {
            // Check if we're scrolled past the main interests section intro
            if (interestsSection && interestsSection.getBoundingClientRect().top < -50) {
              current = 'interests';
            }
          }
                    
          break;
        }
      }
    }

    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
            
      // Handle navigation highlighting
      if (href === '#about' && current === 'about') {
        link.classList.add('active');
      } else if (href === '#career' && current === 'career') {
        link.classList.add('active');
      } else if ((href === '#music' || href === '#wine') && 
                       (current === 'interests' || current === 'music' || current === 'wine')) {
        link.classList.add('active');
      } else if (href === '#contact' && current === 'contact') {
        link.classList.add('active');
      }
    });
        
    // Log current section for debugging
    console.log('Current section:', current);
  }

  // Run on scroll with debounce for performance
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(updateActiveNavLink, 50);
  });
    
  // Run on load and resize
  window.addEventListener('load', updateActiveNavLink);
  window.addEventListener('resize', updateActiveNavLink);
    
  // Run when sections are loaded
  const observer = new MutationObserver(() => {
    updateActiveNavLink();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
    
  // Make updateActiveNavLink globally available for other scripts
  window.updateActiveNavLink = updateActiveNavLink;
}