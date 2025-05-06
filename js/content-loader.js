async function loadSectionContent() {
  const sections = [
    { id: 'about', url: 'sections/about.html' },
    { id: 'interests', url: 'sections/interests.html' },
    { id: 'contact', url: 'sections/contact.html' },
  ];

  const loadPromises = sections.map((section) => loadSection(section.id, section.url));

  await Promise.all(loadPromises);

  // Check for responsive layout, control interest boxes
  adjustInterestsLayout();
  window.addEventListener('resize', adjustInterestsLayout);
}

async function loadSection(sectionId, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.text();
    const container = document.getElementById(`${sectionId}-content`);

    if (container) {
      container.innerHTML = data;

      // Re-run reveal function for newly loaded content
      if (typeof reveal === 'function') {
        reveal();
      }
    }
  } catch (error) {
    console.error(`Error loading ${sectionId}:`, error);
    showErrorMessage(`Failed to load ${sectionId} section. Please refresh the page.`);
  }
}

function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
        background-color: #4a2d2d;
        border: 1px solid #7a4a4a;
        color: #ff8080;
        padding: 15px;
        border-radius: 4px;
        margin: 20px 0;
        text-align: center;
    `;
  errorDiv.textContent = message;

  const main = document.querySelector('main');
  main.insertBefore(errorDiv, main.firstChild);

  setTimeout(() => errorDiv.remove(), 5000);
}

// Function to adjust interests layout based on window size
function adjustInterestsLayout() {
  // Only run if interests section exists
  const interestsSection = document.querySelector('#interests');
  if (!interestsSection) return;

  const interestBoxes = document.querySelectorAll('.interest-box');
  const isMobile = window.innerWidth <= 768;

  if (interestBoxes.length >= 2) {
    if (isMobile) {
      // Stack them on mobile
      interestBoxes.forEach((box) => {
        box.style.width = '100%';
      });
    } else {
      // Side by side on desktop
      interestBoxes.forEach((box) => {
        box.style.width = '48%';
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSectionContent();
  if (typeof initializeAnimations === 'function') {
    initializeAnimations();
  }
  if (typeof initializeNavigation === 'function') {
    initializeNavigation();
  }
  if (typeof setupContactForm === 'function') {
    setupContactForm();
  }
});
