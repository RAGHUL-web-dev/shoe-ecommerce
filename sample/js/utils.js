// Utility functions
const API_BASE_URL = 'http://localhost:5000/api';

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');

    let icon = 'fa-info-circle';
    let bgColor = 'bg-gray-800';
    
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            bgColor = 'bg-green-600';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            bgColor = 'bg-red-600';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            bgColor = 'bg-yellow-600';
            break;
    }

    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-none border-2 border-neon transform translate-x-full transition-transform duration-300 z-50`;
    toastIcon.className = `fas ${icon} text-neon`;
    toastMessage.textContent = message;

    toast.classList.remove('translate-x-full');
    toast.classList.add('translate-x-0');

    setTimeout(() => {
        toast.classList.remove('translate-x-0');
        toast.classList.add('translate-x-full');
    }, 5000);
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function isStrongPassword(password) {
    return password.length >= 6;
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get CSRF token from cookies
function getCSRFToken() {
    const name = 'csrf_token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}