/**
 * Image loading and optimization script
 * Implements lazy loading and progressive enhancement
 */
document.addEventListener('DOMContentLoaded', function() {
  // Find all images that should be lazy loaded
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  
  // If IntersectionObserver is available, use it for lazy loading
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // Replace src with data-src if it exists
          if (img.dataset.src) {
            img.src = img.dataset.src;
          }
          
          // Add loaded class for animation if needed
          img.classList.add('loaded');
          
          // Stop observing the image after it's loaded
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });
    
    // Start observing each image
    lazyImages.forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    lazyImages.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      img.classList.add('loaded');
    });
  }
  
  // Add error handling for images
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', function() {
      // Add a class to handle styling broken images
      this.classList.add('img-error');
      
      // Optionally replace with a placeholder
      // this.src = '/path/to/placeholder.png';
      
      // Log error for debugging
      console.error(`Failed to load image: ${this.src}`);
    });
  });
});