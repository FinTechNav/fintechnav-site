function setupContactForm() {
    const form = document.getElementById('contactForm');
    
    if (form) {
        attachFormHandler(form);
    } else {
        // Wait for form to load
        const observer = new MutationObserver((mutations) => {
            const form = document.getElementById('contactForm');
            if (form) {
                attachFormHandler(form);
                observer.disconnect();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

function attachFormHandler(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            message: document.getElementById('message').value
        };
        
        try {
            await sendEmail(formData);
            form.reset();
        } catch (error) {
            showMessage('error', 'Sorry, there was an error. Please email me directly.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

async function sendEmail(formData) {
    const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
    }
    
    showMessage('success', 'Thank you! Your message has been sent successfully.');
}

function showMessage(type, message) {
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) existingMessage.remove();
    
    const messageElement = document.createElement('div');
    messageElement.className = `form-message form-${type}`;
    messageElement.textContent = message;
    
    const form = document.getElementById('contactForm');
    form.appendChild(messageElement);
    
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => messageElement.remove(), 5000);
}