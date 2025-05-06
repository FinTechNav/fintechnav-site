function initializeAnimations() {
    // Scroll reveal animation
    function reveal() {
        const reveals = document.querySelectorAll('.fade-in');
        
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add('active');
            } else {
                reveals[i].classList.remove('active');
            }
        }
    }

    window.addEventListener('scroll', reveal);
    
    // Initial check on page load
    reveal();
    
    // Add hover effects for interest boxes when loaded
    function addInterestBoxHoverListeners() {
        const interestBoxes = document.querySelectorAll('.interest-box');
        
        interestBoxes.forEach(box => {
            box.addEventListener('mouseenter', function() {
                this.style.boxShadow = '0 5px 15px rgba(201, 161, 95, 0.3)';
                this.style.transform = 'translateY(-5px)';
            });
            
            box.addEventListener('mouseleave', function() {
                this.style.boxShadow = '';
                this.style.transform = '';
            });
        });
    }
    
    // Remove all link-arrow elements from non-timeline company links
    function cleanupLinkArrows() {
        // Remove all link arrows outside the timeline
        const nonTimelineArrows = document.querySelectorAll('.link-arrow:not(.company-link span)');
        nonTimelineArrows.forEach(arrow => {
            arrow.remove();
        });
        
        // Remove company-link class from non-timeline links
        const regularLinks = document.querySelectorAll('a:not(.timeline a)');
        regularLinks.forEach(link => {
            if (link.classList.contains('company-link')) {
                link.classList.remove('company-link');
            }
        });
    }
    
    // Add contact form hover effect
    function addContactFormHoverEffect() {
        const contactForm = document.querySelector('.contact-form');
        
        if (contactForm) {
            contactForm.addEventListener('mouseenter', function() {
                this.style.boxShadow = '0 5px 15px rgba(201, 161, 95, 0.3)';
                this.style.transform = 'translateY(-5px)';
            });
            
            contactForm.addEventListener('mouseleave', function() {
                this.style.boxShadow = '';
                this.style.transform = '';
            });
        }
    }
    
    // Check if DOM is loaded, otherwise wait for it
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(function() {
            addInterestBoxHoverListeners();
            cleanupLinkArrows();
            addContactFormHoverEffect();
        }, 1000); // Delay to ensure content is loaded
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                addInterestBoxHoverListeners();
                cleanupLinkArrows();
                addContactFormHoverEffect();
            }, 1000);
        });
    }
    
    // Add listeners whenever content is changed
    const observer = new MutationObserver(function() {
        addInterestBoxHoverListeners();
        cleanupLinkArrows();
        addContactFormHoverEffect();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Responsive behavior for mobile/desktop changes
    function handleResponsiveChanges() {
        adjustInterestsLayout();
    }
    
    window.addEventListener('resize', handleResponsiveChanges);
    handleResponsiveChanges(); // Initial check
}

// Adjust layout of interest boxes based on screen width
function adjustInterestsLayout() {
    const interestsContainer = document.querySelector('.interests');
    if (!interestsContainer) return;
    
    const interestBoxes = document.querySelectorAll('.interest-box');
    const isMobile = window.innerWidth <= 950; // Match breakpoint in Timeline.js
    
    if (interestBoxes.length >= 2) {
        if (isMobile) {
            // Stack them on mobile
            interestBoxes.forEach(box => {
                box.style.width = '100%';
            });
        } else {
            // Side by side on desktop
            interestBoxes.forEach(box => {
                box.style.width = '48%';
            });
        }
    }
}

// Make reveal available globally
window.reveal = function() {
    const reveals = document.querySelectorAll('.fade-in');
    
    for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const elementTop = reveals[i].getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add('active');
        } else {
            reveals[i].classList.remove('active');
        }
    }
};

// Initialize animations on load
document.addEventListener('DOMContentLoaded', initializeAnimations);