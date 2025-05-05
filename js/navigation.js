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
                    behavior: "smooth"
                });
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
        const contactSection = document.querySelector('#contact-content #contact') || document.querySelector('#contact');
        
        const sections = [
            { element: aboutSection, id: 'about' },
            { element: careerSection, id: 'career' },
            { element: interestsSection, id: 'interests' },
            { element: contactSection, id: 'contact' }
        ].filter(section => section.element); // Remove any null elements

        let current = '';
        const scrollPosition = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionElement = section.element;
            const sectionTop = sectionElement.offsetTop;
            const sectionHeight = sectionElement.clientHeight;
            
            // Adjust the trigger point to highlight the section when it's more prominently visible
            if (scrollPosition >= sectionTop - 200 && scrollPosition < sectionTop + sectionHeight - 200) {
                current = section.id;
            }
        });

        // Set first section as active if at the top of page
        if (scrollPosition < 100) {
            current = 'about';
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            // Handle navigation highlighting
            if (href === '#about' && current === 'about') {
                link.classList.add('active');
            } else if (href === '#career' && current === 'career') {
                link.classList.add('active');
            } else if ((href === '#music' || href === '#wine') && current === 'interests') {
                link.classList.add('active');
            } else if (href === '#contact' && current === 'contact') {
                link.classList.add('active');
            }
        });
    }

    // Run on scroll with debounce for performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(updateActiveNavLink, 50);
    });
    
    // Run on load
    window.addEventListener('load', updateActiveNavLink);
    
    // Run when sections are loaded
    const observer = new MutationObserver(() => {
        updateActiveNavLink();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}