// Enhanced navigation between all pages - SEPARATE NAVIGATION LOGIC
function createSimpleEmptyPageButton() {
    // Cache DOM elements upfront
    const pages = {
        sign: document.getElementById('signChartPage'),
        empty: document.getElementById('emptyVisualPage'),
        pedestrian: document.getElementById('pedestrianPage'),
        solution: document.getElementById('solutionMapsPage')
    };

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'pageNavContainer';
    buttonContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        gap: 10px;
    `;

    // Create navigation buttons
    const prevButton = document.createElement('button');
    prevButton.id = 'prevPageButton';
    prevButton.innerHTML = '← Previous';
    prevButton.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    const nextButton = document.createElement('button');
    nextButton.id = 'nextPageButton';
    nextButton.innerHTML = 'Next →';
    nextButton.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    // Page indicator
    const pageIndicator = document.createElement('div');
    pageIndicator.id = 'pageIndicator';
    pageIndicator.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        font-family: system-ui, -apple-system, sans-serif;
    `;

    // Add hover effects
    [prevButton, nextButton].forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(255, 255, 255, 0.25)';
            button.style.transform = 'translateY(-2px)';
        }, { passive: true });

        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(255, 255, 255, 0.15)';
            button.style.transform = 'translateY(0)';
        }, { passive: true });
    });

    // Page order and navigation
    const pageOrder = ['sign', 'empty', 'pedestrian', 'solution'];
    let currentPageIndex = 0;

    function getCurrentPage() {
        for (let i = 0; i < pageOrder.length; i++) {
            const pageId = pageOrder[i];
            const pageElement = pages[pageId];
            if (pageElement && pageElement.style.display !== 'none') {
                return { id: pageId, index: i };
            }
        }
        return { id: 'sign', index: 0 }; // Default fallback
    }

    function updateNavigation() {
        const current = getCurrentPage();
        currentPageIndex = current.index;

        // Update buttons
        prevButton.disabled = currentPageIndex === 0;
        nextButton.disabled = currentPageIndex === pageOrder.length - 1;

        // Update indicator
        pageIndicator.textContent = `Page ${currentPageIndex + 1} of ${pageOrder.length}`;

        // Update button styles based on state
        prevButton.style.opacity = prevButton.disabled ? '0.5' : '1';
        nextButton.style.opacity = nextButton.disabled ? '0.5' : '1';
        prevButton.style.cursor = prevButton.disabled ? 'not-allowed' : 'pointer';
        nextButton.style.cursor = nextButton.disabled ? 'not-allowed' : 'pointer';
    }

    function navigateToPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= pageOrder.length) return;

        // Hide all pages
        Object.values(pages).forEach(page => {
            if (page) page.style.display = 'none';
        });

        // Show target page
        const targetPageId = pageOrder[pageIndex];
        const targetPage = pages[targetPageId];
        if (targetPage) {
            targetPage.style.display = 'block';
        }

        currentPageIndex = pageIndex;
        updateNavigation();

        // Simple improvement button check - ADD THIS
        if (targetPageId === 'solution') {
            setTimeout(() => {
                addImprovementButton();
            }, 100);
        }
    }

    function goToNextPage() {
        if (currentPageIndex < pageOrder.length - 1) {
            navigateToPage(currentPageIndex + 1);
        }
    }

    function goToPreviousPage() {
        if (currentPageIndex > 0) {
            navigateToPage(currentPageIndex - 1);
        }
    }

    // Set up button event listeners
    prevButton.addEventListener('click', goToPreviousPage);
    nextButton.addEventListener('click', goToNextPage);

    // Add elements to container
    buttonContainer.appendChild(prevButton);
    buttonContainer.appendChild(pageIndicator);
    buttonContainer.appendChild(nextButton);
    document.body.appendChild(buttonContainer);

    // Initialize navigation state
    updateNavigation();

    // Set up observer to detect page changes from other sources
    let observer;
    if (window.MutationObserver) {
        observer = new MutationObserver(function(mutations) {
            requestAnimationFrame(() => {
                for (let mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        updateNavigation();
                        break;
                    }
                }
            });
        });

        // Observe all pages for style changes
        Object.values(pages).forEach(page => {
            if (page) {
                observer.observe(page, {
                    attributes: true,
                    attributeFilter: ['style']
                });
            }
        });
    }

    // Public API for external navigation
    window.pageNavigation = {
        goToSignChart: () => navigateToPage(0),
        goToEmptyPage: () => navigateToPage(1),
        goToPedestrianPage: () => navigateToPage(2),
        goToSolutionMapsPage: () => navigateToPage(3),
        getCurrentPage: () => pageOrder[currentPageIndex],
        goToNextPage,
        goToPreviousPage
    };

    // Cleanup function
    return function cleanup() {
        if (observer) observer.disconnect();
        [prevButton, nextButton].forEach(button => {
            button.removeEventListener('click', goToNextPage);
            button.removeEventListener('click', goToPreviousPage);
        });
    };
}

// Initialize navigation
(function initNavigation() {
    setTimeout(() => {
        createSimpleEmptyPageButton();
    }, 100); // Small delay to ensure DOM is ready
})();

// Make navigation functions available globally for your HTML buttons
function showPedestrianPage() {
    if (window.pageNavigation) {
        window.pageNavigation.goToPedestrianPage();
    }
}

