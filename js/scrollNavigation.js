// Scroll Navigation System
// Handles scroll-down navigation to go to next page in order

let currentPageIndex = 0;
let isScrolling = false;
let scrollTimeout = null;
const totalPages = 4;

// Initialize scroll navigation
function initScrollNavigation() {
    const pageContainer = document.getElementById('pageContainer');
    if (!pageContainer) {
        console.error('Page container not found');
        return;
    }

    // Track scroll direction and navigate to next/previous page
    let lastScrollTop = 0;
    let scrollThreshold = 50; // Minimum scroll distance to trigger page change

    pageContainer.addEventListener('scroll', function() {
        if (isScrolling) return;

        const currentScrollTop = pageContainer.scrollTop;
        const pageHeight = window.innerHeight;
        const scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up';
        
        // Only process if scroll is significant
        if (Math.abs(currentScrollTop - lastScrollTop) < scrollThreshold) {
            lastScrollTop = currentScrollTop;
            return;
        }

        // Determine which page we should be on based on scroll position
        const targetPage = Math.round(currentScrollTop / pageHeight);
        
        if (targetPage !== currentPageIndex && targetPage >= 0 && targetPage < totalPages) {
            navigateToPage(targetPage);
        }

        lastScrollTop = currentScrollTop;
    });

    // Handle wheel events for smoother navigation
    let wheelTimeout = null;
    pageContainer.addEventListener('wheel', function(e) {
        // Don't navigate if scrolling inside year scroll sign container or its children
        const sideSign = e.target.closest('.side-sign-container.year-scroll-sign');
        if (sideSign) {
            return;
        }
        
        clearTimeout(wheelTimeout);
        
        wheelTimeout = setTimeout(() => {
            if (isScrolling) return;

            const deltaY = e.deltaY;
            
            if (deltaY > 0 && currentPageIndex < totalPages - 1) {
                // Scrolling down - go to next page
                navigateToPage(currentPageIndex + 1);
            } else if (deltaY < 0 && currentPageIndex > 0) {
                // Scrolling up - go to previous page
                navigateToPage(currentPageIndex - 1);
            }
        }, 100);
    }, { passive: true });

    // Handle keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (isScrolling) return;

        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            if (currentPageIndex < totalPages - 1) {
                navigateToPage(currentPageIndex + 1);
                e.preventDefault();
            }
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            if (currentPageIndex > 0) {
                navigateToPage(currentPageIndex - 1);
                e.preventDefault();
            }
        }
    });

    // Initialize on page 0
    navigateToPage(0, false);
}

// Navigate to a specific page
function navigateToPage(pageIndex, smooth = true) {
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    if (isScrolling && pageIndex === currentPageIndex) return;

    isScrolling = true;
    currentPageIndex = pageIndex;

    const pageContainer = document.getElementById('pageContainer');
    const targetPage = document.getElementById(`page-${pageIndex}`);
    
    if (!targetPage || !pageContainer) {
        isScrolling = false;
        return;
    }

    // Scroll to the target page
    targetPage.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'start'
    });

    // Update overlay visibility based on page (disabled - all pages use same background)
    const body = document.body;
    // Keep overlay transparent for all pages to match first page
    body.style.setProperty('--overlay-opacity', '0');

    // Initialize page-specific content
    initializePageContent(pageIndex);

    // Reset scrolling flag after animation
    setTimeout(() => {
        isScrolling = false;
    }, smooth ? 800 : 100);
}

// Initialize content for specific pages
function initializePageContent(pageIndex) {
    switch(pageIndex) {
        case 1: // Pedestrian visualization page
            // Visualization loads in iframe, no initialization needed
            break;
        case 2: // Roundabout visualization page
            // Visualization loads in iframe, no initialization needed
            break;
        case 3: // Vehicle injury visualization page
            // Visualization loads in iframe, no initialization needed
            break;
        default:
            // No initialization needed for other pages
            break;
    }
}


// Public API
window.ScrollNavigation = {
    init: initScrollNavigation,
    navigateToPage: navigateToPage,
    getCurrentPage: () => currentPageIndex,
    getTotalPages: () => totalPages
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollNavigation);
} else {
    initScrollNavigation();
}

