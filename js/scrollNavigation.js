// Scroll Navigation System
// Handles scroll-down navigation to go to next page in order

let currentPageIndex = 0;
let isScrolling = false;
let scrollTimeout = null;
let wheelAccumulator = 0;
let lastWheelTime = 0;
const totalPages = 14;
const WHEEL_THRESHOLD = 50; // Minimum accumulated wheel delta to trigger navigation
const WHEEL_RESET_TIME = 150; // Time in ms to reset wheel accumulator

// Initialize scroll navigation
function initScrollNavigation() {
    const pageContainer = document.getElementById('pageContainer');
    if (!pageContainer) {
        console.error('Page container not found');
        return;
    }

    // Track if we're programmatically scrolling to prevent feedback loops
    let isProgrammaticScroll = false;

    // Helper function to check if event is over an iframe and get scroll info
    function getIframeScrollInfo(x, y) {
        const iframes = document.querySelectorAll('.viz-iframe');
        
        for (let iframe of iframes) {
            const rect = iframe.getBoundingClientRect();
            
            // Check if mouse is over this iframe
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeBody = iframeDoc.body;
                    const iframeHtml = iframeDoc.documentElement;
                    
                    const scrollTop = iframeBody.scrollTop || iframeHtml.scrollTop;
                    const scrollHeight = iframeBody.scrollHeight || iframeHtml.scrollHeight;
                    const clientHeight = iframeBody.clientHeight || iframeHtml.clientHeight;
                    
                    // Check if at scroll boundaries (with small threshold)
                    const isAtTop = scrollTop <= 5;
                    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
                    const canScroll = scrollHeight > clientHeight + 10; // Add small threshold
                    
                    return { isIframe: true, isAtTop, isAtBottom, canScroll };
                } catch (e) {
                    // Cross-origin or other error - can't access iframe content
                    // Assume it might be scrollable, so be more lenient
                    return { isIframe: true, isAtTop: false, isAtBottom: false, canScroll: true };
                }
            }
        }
        return { isIframe: false };
    }

    // Prevent scrolling in iframes and setup wheel handlers
    function setupIframeWheelHandlers() {
        const iframes = document.querySelectorAll('.viz-iframe');
        iframes.forEach(iframe => {
            // Try to prevent scrolling in iframe content
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const iframeBody = iframeDoc.body;
                const iframeHtml = iframeDoc.documentElement;
                
                // Prevent scrolling on body and html
                iframeBody.style.overflow = 'hidden';
                iframeHtml.style.overflow = 'hidden';
                iframeBody.style.height = '100%';
                iframeHtml.style.height = '100%';
            } catch (err) {
                // Can't access iframe content (cross-origin) - will use mouse position check
            }
            
            // Add wheel listener to iframe element itself (capture phase to intercept)
            iframe.addEventListener('wheel', function(e) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeBody = iframeDoc.body;
                    const iframeHtml = iframeDoc.documentElement;
                    
                    const scrollTop = iframeBody.scrollTop || iframeHtml.scrollTop;
                    const scrollHeight = iframeBody.scrollHeight || iframeHtml.scrollHeight;
                    const clientHeight = iframeBody.clientHeight || iframeHtml.clientHeight;
                    
                    const canScroll = scrollHeight > clientHeight + 10;
                    const isAtTop = scrollTop <= 5;
                    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
                    
                    // If scrollable and at boundaries, navigate pages instead
                    if (canScroll) {
                        if (e.deltaY > 0 && isAtBottom && currentPageIndex < totalPages - 1) {
                            // At bottom, scrolling down - go to next page
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToPage(currentPageIndex + 1);
                            return;
                        } else if (e.deltaY < 0 && isAtTop && currentPageIndex > 0) {
                            // At top, scrolling up - go to previous page
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToPage(currentPageIndex - 1);
                            return;
                        }
                        // Otherwise, let iframe scroll normally
                    } else {
                        // Not scrollable - always navigate
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.deltaY > 0 && currentPageIndex < totalPages - 1) {
                            navigateToPage(currentPageIndex + 1);
                        } else if (e.deltaY < 0 && currentPageIndex > 0) {
                            navigateToPage(currentPageIndex - 1);
                        }
                    }
                } catch (err) {
                    // Can't access iframe content (cross-origin) - prevent default and navigate
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.deltaY > 0 && currentPageIndex < totalPages - 1) {
                        navigateToPage(currentPageIndex + 1);
                    } else if (e.deltaY < 0 && currentPageIndex > 0) {
                        navigateToPage(currentPageIndex - 1);
                    }
                }
            }, { passive: false, capture: true });
        });
    }

    // Setup iframe handlers - try multiple times as iframes load
    function trySetupIframes() {
        setupIframeWheelHandlers();
        // Try again after a delay in case iframes aren't loaded yet
        setTimeout(setupIframeWheelHandlers, 500);
        setTimeout(setupIframeWheelHandlers, 1500);
    }
    
    trySetupIframes();
    
    // Also setup when new iframes might be added
    const observer = new MutationObserver(() => {
        trySetupIframes();
    });
    observer.observe(pageContainer, { childList: true, subtree: true });

    // Handle wheel events for smooth navigation (primary method)
    pageContainer.addEventListener('wheel', function(e) {
        // Don't navigate if scrolling inside year scroll sign container or its children
        const sideSign = e.target.closest('.side-sign-container.year-scroll-sign');
        if (sideSign) {
            return;
        }
        
        // Don't navigate if already scrolling
        if (isScrolling) {
            e.preventDefault();
            return;
        }

        // Check if scrolling over an iframe using mouse coordinates
        const iframeInfo = getIframeScrollInfo(e.clientX, e.clientY);
        let shouldNavigate = false;
        let navigateDirection = null;

        if (iframeInfo.isIframe) {
            // If over an iframe, check scroll boundaries
            if (iframeInfo.canScroll) {
                // Iframe has scrollable content
                if (e.deltaY > 0 && iframeInfo.isAtBottom) {
                    // Scrolling down and at bottom of iframe - navigate to next page
                    shouldNavigate = true;
                    navigateDirection = 'down';
                    e.preventDefault();
                } else if (e.deltaY < 0 && iframeInfo.isAtTop) {
                    // Scrolling up and at top of iframe - navigate to previous page
                    shouldNavigate = true;
                    navigateDirection = 'up';
                    e.preventDefault();
                } else {
                    // Let iframe handle scrolling - don't prevent default
                    return;
                }
            } else {
                // Iframe has no scrollable content - always navigate
                shouldNavigate = true;
                navigateDirection = e.deltaY > 0 ? 'down' : 'up';
                e.preventDefault();
            }
        } else {
            // Not over iframe - use normal navigation logic
            e.preventDefault();
        }

        const now = Date.now();
        const timeSinceLastWheel = now - lastWheelTime;
        
        // Reset accumulator if too much time has passed
        if (timeSinceLastWheel > WHEEL_RESET_TIME) {
            wheelAccumulator = 0;
        }
        
        wheelAccumulator += e.deltaY;
        lastWheelTime = now;
        
        // Use requestAnimationFrame for smooth handling
        requestAnimationFrame(() => {
            if (isScrolling) return;
            
            // If we determined we should navigate from iframe check, do it immediately
            if (shouldNavigate) {
                if (navigateDirection === 'down' && currentPageIndex < totalPages - 1) {
                    navigateToPage(currentPageIndex + 1);
                    wheelAccumulator = 0;
                } else if (navigateDirection === 'up' && currentPageIndex > 0) {
                    navigateToPage(currentPageIndex - 1);
                    wheelAccumulator = 0;
                }
                return;
            }
            
            // Normal navigation logic for non-iframe areas
            const absAccumulator = Math.abs(wheelAccumulator);
            
            if (absAccumulator >= WHEEL_THRESHOLD) {
                if (wheelAccumulator > 0 && currentPageIndex < totalPages - 1) {
                    // Scrolling down - go to next page
                    navigateToPage(currentPageIndex + 1);
                    wheelAccumulator = 0;
                } else if (wheelAccumulator < 0 && currentPageIndex > 0) {
                    // Scrolling up - go to previous page
                    navigateToPage(currentPageIndex - 1);
                    wheelAccumulator = 0;
                }
            }
        });
    }, { passive: false });

    // Handle scroll events only for edge cases (when user drags scrollbar or uses touch)
    let scrollDebounceTimeout = null;
    let lastScrollTop = pageContainer.scrollTop;
    
    pageContainer.addEventListener('scroll', function() {
        // Ignore scroll events during programmatic scrolling
        if (isProgrammaticScroll || isScrolling) {
            return;
        }

        clearTimeout(scrollDebounceTimeout);
        
        scrollDebounceTimeout = setTimeout(() => {
            if (isProgrammaticScroll || isScrolling) return;
            
            const currentScrollTop = pageContainer.scrollTop;
            const pageHeight = window.innerHeight;
            const targetPage = Math.round(currentScrollTop / pageHeight);
            
            // Only navigate if significantly different from current page
            if (targetPage !== currentPageIndex && 
                targetPage >= 0 && 
                targetPage < totalPages &&
                Math.abs(currentScrollTop - (targetPage * pageHeight)) < pageHeight * 0.3) {
                isProgrammaticScroll = true;
                currentPageIndex = targetPage;
                updateDotNavigation(targetPage);
                navigateToPage(targetPage);
                setTimeout(() => {
                    isProgrammaticScroll = false;
                }, 100);
            } else {
                // Update dots even if not navigating (for smooth transitions)
                const currentPage = Math.round(currentScrollTop / pageHeight);
                if (currentPage >= 0 && currentPage < totalPages && currentPage !== currentPageIndex) {
                    currentPageIndex = currentPage;
                    updateDotNavigation(currentPage);
                }
            }
            
            lastScrollTop = currentScrollTop;
        }, 50);
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

    // Setup dot navigation click handlers
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (!isScrolling) {
                navigateToPage(index);
            }
        });
    });

    // Initialize on page 0
    navigateToPage(0, false);
    updateDotNavigation(0);
    
    // Animate initial page content
    setTimeout(() => {
        const initialPage = document.getElementById('page-0');
        if (initialPage) {
            initialPage.classList.add('page-active');
            animatePageContent(initialPage);
        }
    }, 100);
}

// Update dot navigation
function updateDotNavigation(pageIndex) {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.classList.remove('active');
        if (index === pageIndex) {
            dot.classList.add('active');
        }
    });
}

// Navigate to a specific page
function navigateToPage(pageIndex, smooth = true) {
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    if (isScrolling && pageIndex === currentPageIndex) return;
    
    // Cancel any pending navigation
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
    }
    
    // Reset wheel accumulator when navigation starts
    wheelAccumulator = 0;

    isScrolling = true;
    currentPageIndex = pageIndex;

    const pageContainer = document.getElementById('pageContainer');
    const targetPage = document.getElementById(`page-${pageIndex}`);
    
    if (!targetPage || !pageContainer) {
        isScrolling = false;
        return;
    }

    // Update dot navigation
    updateDotNavigation(pageIndex);

    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
        // Add animation classes to the target page
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => {
            page.classList.remove('page-entering', 'page-active');
        });
        
        // Add entering animation to target page
        targetPage.classList.add('page-entering');
        
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
        
        // Trigger text animations on the new page
        setTimeout(() => {
            targetPage.classList.add('page-active');
            animatePageContent(targetPage);
        }, 100);

        // Reset scrolling flag after animation (reduced timeout for faster response)
        const animationDuration = smooth ? 600 : 50;
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            scrollTimeout = null;
        }, animationDuration);
    });
}

// Animate page content elements
function animatePageContent(page) {
    // Animate all text elements with staggered delays
    const textElements = page.querySelectorAll('h1, h2, h3, h4, h5, h6, p, .intro-title, .safety-box, .viz-container-full');
    textElements.forEach((el, index) => {
        el.style.animation = 'none';
        // Force reflow
        void el.offsetWidth;
        el.style.animation = `fadeInUp 0.8s ease-out ${index * 0.1}s both`;
    });
    
    // Animate iframes with a slight delay
    const iframes = page.querySelectorAll('.viz-iframe');
    iframes.forEach((iframe, index) => {
        iframe.style.opacity = '0';
        iframe.style.transform = 'scale(0.95)';
        setTimeout(() => {
            iframe.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            iframe.style.opacity = '1';
            iframe.style.transform = 'scale(1)';
        }, 200 + index * 100);
    });
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
        case 4: // Sign visualization page
            // Visualization loads in iframe, no initialization needed
            break;
        case 5: // Solution visualization page
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

