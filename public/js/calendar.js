window.CalendarApp = {
    data: {
        year: null,
        month: null,
        monthName: 'Unknown'
    },
    
    setData: function(year, month, monthName) {
        this.data = { year, month, monthName };
    },
    
    init: function() {
        console.log('🗓️ Calendar initialized with data:', this.data);
        this.attachEventListeners();
    },
    
    attachEventListeners: function() {
        const calendar = document.querySelector('.calendar');
        if (!calendar) {
            console.error('❌ Calendar element not found');
            return;
        }
        
        calendar.addEventListener('click', (e) => {
            // Handle add meal button clicks
            if (e.target.closest('.add-meal')) {
                e.stopPropagation();
                const dayElement = e.target.closest('.day');
                this.handleAddMeal(dayElement);
                return;
            }
            
            // Handle meal clicks
            if (e.target.closest('.meal')) {
                e.stopPropagation();
                const mealElement = e.target.closest('.meal');
                this.handleViewMeal(mealElement);
                return;
            }
            
            // Handle day clicks
            if (e.target.closest('.day') && !e.target.closest('.other-month')) {
                const dayElement = e.target.closest('.day');
                this.handleAddMeal(dayElement);
                return;
            }
        });
    },
    
    handleAddMeal: function(dayElement) {
        const year = parseInt(dayElement.dataset.year);
        const month = parseInt(dayElement.dataset.month);
        const day = parseInt(dayElement.dataset.day);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            console.error('❌ Invalid date data:', { year, month, day });
            return;
        }
        
        console.log('➕ Adding meal for:', { year, month, day });
        
        try {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            window.location.href = `/meals/new?date=${dateStr}`;
        } catch (error) {
            console.error('❌ Error creating date:', error);
            this.showAlert('error', 'Error creating meal date. Please try again.');
        }
    },
    
    handleViewMeal: function(mealElement) {
        const mealId = mealElement.dataset.mealId;
        
        if (!mealId || mealId.trim() === '') {
            console.error('❌ No meal ID found');
            return;
        }
        
        console.log('👁️ Viewing meal:', mealId);
        window.location.href = `/meals/${mealId}`;
    },
    
    showAlert: function(type, message) {
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
};

function navigateMonth(direction) {
    const currentYear = window.CalendarApp.data.year || new Date().getFullYear();
    const currentMonth = window.CalendarApp.data.month !== null ? window.CalendarApp.data.month : new Date().getMonth();
    
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    
    if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    }
    
    console.log('🔄 Navigating to:', { year: newYear, month: newMonth });
    window.location.href = `/calendar?year=${newYear}&month=${newMonth}`;
}

// Initialize the calendar when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Calendar page loaded successfully');
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('💥 Calendar error:', e.error);
});

// Utility functions for meal signup functionality
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
            window.CalendarApp.showAlert('success', result.message || 'Successfully signed up for meal!');
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
        window.CalendarApp.showAlert('error', error.message || 'Error signing up for meal. Please try again.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function refreshCalendar() {
    window.location.reload();
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