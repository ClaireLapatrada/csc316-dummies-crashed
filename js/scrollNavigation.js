// Scroll Navigation System
// Handles scroll-down navigation to go to next page in order

let currentPageIndex = 0;
let isScrolling = false;
let scrollTimeout = null;
const totalPages = 6;

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

    // Update overlay visibility based on page
    const body = document.body;
    if (pageIndex === 0) {
        // First page - no overlay
        body.style.setProperty('--overlay-opacity', '0');
    } else {
        // Other pages - show overlay with animation
        body.style.setProperty('--overlay-opacity', '1');
    }

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
        case 1: // Year question page
            updateYearDisplay();
            // Initialize year question page if available
            if (window.YearQuestion) {
                // Make sure data is analyzed
                if (window.App && typeof window.App.getGlobalData === 'function') {
                    const data = window.App.getGlobalData();
                    if (data && data.length > 0 && typeof window.YearQuestion.analyzeYearAccidents === 'function') {
                        window.YearQuestion.analyzeYearAccidents(data);
                    }
                }
                // Initialize scroll container if not already done
                const sideSign = document.querySelector('.side-sign-container.year-scroll-sign');
                if (typeof window.YearQuestion.initYearScrollContainer === 'function' && sideSign && !sideSign.hasAttribute('data-initialized')) {
                    window.YearQuestion.initYearScrollContainer();
                    sideSign.setAttribute('data-initialized', 'true');
                }
                // Update display
                if (typeof window.YearQuestion.updateYearAndSigns === 'function') {
                    const currentYear = window.App && typeof window.App.getCurrentYear === 'function' 
                        ? window.App.getCurrentYear() 
                        : 2023;
                    window.YearQuestion.updateYearAndSigns(currentYear);
                }
            }
            break;
        case 2: // Time question page
            updateTimeDisplay();
            break;
        case 3: // Pedestrian chart page
            updatePedestrianChart();
            break;
        case 4: // Main visualization page
            // Check if already initialized
            const vizContainer = document.getElementById('vizContainer');
            if (vizContainer && vizContainer.children.length === 0) {
                if (typeof window.initVisualization === 'function') {
                    window.initVisualization();
                }
                if (typeof window.initYearScroller === 'function') {
                    window.initYearScroller();
                }
                if (typeof window.initTimeSlider === 'function') {
                    window.initTimeSlider();
                }
            }
            if (typeof window.updateVisualization === 'function') {
                setTimeout(() => window.updateVisualization(), 200);
            }
            break;
        case 5: // Dashboard page
            initializeDashboard();
            break;
    }
}

// Update year display on page 1
function updateYearDisplay() {
    const yearSign = document.getElementById('yearSignDisplay');
    if (yearSign) {
        // Wait for App to be available
        setTimeout(() => {
            if (window.App && typeof window.App.getCurrentYear === 'function') {
                const currentYear = window.App.getCurrentYear();
                yearSign.textContent = currentYear;
            } else {
                yearSign.textContent = '2023';
            }
        }, 100);
    }
}

// Update time display on page 2
function updateTimeDisplay() {
    const timeSign = document.getElementById('timeSignDisplay');
    if (timeSign) {
        // Wait for App to be available
        setTimeout(() => {
            if (window.App && typeof window.App.getTimeBuckets === 'function') {
                const timeBuckets = window.App.getTimeBuckets();
                const currentTimeIndex = window.App.getCurrentTimeIndex();
                if (timeBuckets && timeBuckets[currentTimeIndex]) {
                    const timeStr = timeBuckets[currentTimeIndex];
                    // Extract time part (e.g., "6:30 PM" -> "18:30")
                    const [timePart, period] = timeStr.split(' ');
                    if (timePart) {
                        const [hours, minutes] = timePart.split(':');
                        let hour24 = parseInt(hours);
                        if (period === 'PM' && hour24 !== 12) hour24 += 12;
                        if (period === 'AM' && hour24 === 12) hour24 = 0;
                        timeSign.textContent = `${String(hour24).padStart(2, '0')}:${minutes || '00'}`;
                    }
                } else {
                    timeSign.textContent = '01:00';
                }
            } else {
                timeSign.textContent = '01:00';
            }
        }, 100);
    }
}

// Update pedestrian chart on page 3
function updatePedestrianChart() {
    const chartContainer = document.getElementById('pedestrianChart');
    if (!chartContainer || !window.App) return;

    // This would integrate with the pedestrian visualization
    // For now, just ensure the container is ready
    chartContainer.innerHTML = '<div style="color: white; text-align: center; padding: 2rem;">Pedestrian Collision Chart</div>';
}

// Initialize dashboard on page 5
function initializeDashboard() {
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        // Dashboard initialization code would go here
        console.log('Dashboard page initialized');
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

