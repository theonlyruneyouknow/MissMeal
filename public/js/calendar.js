// Calendar functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
    setupEventListeners();
});

function initializeCalendar() {
    // Any initialization code for the calendar
    console.log('Calendar initialized');
}

function setupEventListeners() {
    // Setup form submission for meal signup
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleMealSignup);
    }
    
    // Setup modal close on background click
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeSignupModal();
            }
        });
    }
    
    // Setup ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSignupModal();
        }
    });
}

function showSignupModal(mealId) {
    const modal = document.getElementById('signupModal');
    const mealIdInput = document.getElementById('mealId');
    
    if (modal && mealIdInput) {
        mealIdInput.value = mealId;
        modal.style.display = 'block';
        
        // Focus on first input
        const firstInput = modal.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    const form = document.getElementById('signupForm');
    
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (form) {
        form.reset();
    }
}

async function handleMealSignup(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const mealId = formData.get('mealId');
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"><span class="spinner"></span> Signing up...</span>';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`/meals/${mealId}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                familyName: formData.get('familyName'),
                contactName: formData.get('contactName'),
                phoneNumber: formData.get('phoneNumber'),
                email: formData.get('email'),
                deliveryType: formData.get('deliveryType')
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('success', result.message || 'Successfully signed up for meal!');
            closeSignupModal();
            
            // Refresh the page to show updated meal assignment
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(result.error || 'Failed to sign up for meal');
        }
        
    } catch (error) {
        console.error('Error signing up for meal:', error);
        showAlert('error', error.message || 'Error signing up for meal. Please try again.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showAlert(type, message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alert, container.firstChild);
        
        // Auto-remove success alerts after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (alert.parentElement) {
                    alert.remove();
                }
            }, 5000);
        }
    }
}

function refreshCalendar() {
    // Show loading state
    const refreshBtn = document.querySelector('button[onclick="refreshCalendar()"]');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<span class="loading"><span class="spinner"></span> Refreshing...</span>';
        refreshBtn.disabled = true;
        
        // Reload the page
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}

// Utility function to format phone numbers as user types
function formatPhoneNumber(input) {
    // Remove all non-digits
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 10 digits
    value = value.substring(0, 10);
    
    // Format as (XXX) XXX-XXXX
    if (value.length >= 6) {
        value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    } else if (value.length >= 3) {
        value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
    }
    
    input.value = value;
}

// Add phone number formatting to phone inputs
document.addEventListener('DOMContentLoaded', function() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', () => formatPhoneNumber(input));
    });
});

// Function to validate form before submission
function validateSignupForm(form) {
    const requiredFields = ['familyName', 'contactName', 'phoneNumber', 'email'];
    const errors = [];
    
    requiredFields.forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field || !field.value.trim()) {
            errors.push(`${fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`);
        }
    });
    
    // Validate email format
    const email = form.querySelector('[name="email"]');
    if (email && email.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            errors.push('Please enter a valid email address');
        }
    }
    
    // Validate phone number format
    const phone = form.querySelector('[name="phoneNumber"]');
    if (phone && phone.value) {
        const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
        if (!phoneRegex.test(phone.value)) {
            errors.push('Please enter a valid phone number');
        }
    }
    
    return errors;
}

// Enhanced form submission with validation
async function handleMealSignup(e) {
    e.preventDefault();
    
    const form = e.target;
    
    // Validate form
    const errors = validateSignupForm(form);
    if (errors.length > 0) {
        showAlert('error', errors.join('<br>'));
        return;
    }
    
    const formData = new FormData(form);
    const mealId = formData.get('mealId');
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"><span class="spinner"></span> Signing up...</span>';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`/meals/${mealId}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                familyName: formData.get('familyName'),
                contactName: formData.get('contactName'),
                phoneNumber: formData.get('phoneNumber'),
                email: formData.get('email'),
                deliveryType: formData.get('deliveryType')
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('success', result.message || 'Successfully signed up for meal!');
            closeSignupModal();
            
            // Refresh the page to show updated meal assignment
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(result.error || 'Failed to sign up for meal');
        }
        
    } catch (error) {
        console.error('Error signing up for meal:', error);
        showAlert('error', error.message || 'Error signing up for meal. Please try again.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}