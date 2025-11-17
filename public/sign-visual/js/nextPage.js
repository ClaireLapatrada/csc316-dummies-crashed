// Enhanced navigation system for all pages
function setupPageNavigation() {
    // Cache DOM elements
    const pages = {
        sign: document.getElementById('signChartPage'),
        empty: document.getElementById('emptyVisualPage'),
        pedestrian: document.getElementById('pedestrianPage'),
        solution: document.getElementById('solutionMapsPage')
    };

    // Create navigation button container if it doesn't exist
    let buttonContainer = document.getElementById('pageNavContainer');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.id = 'pageNavContainer';
        buttonContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
        `;
        document.body.appendChild(buttonContainer);
    }

    // Clear existing buttons
    buttonContainer.innerHTML = '';

    // Create navigation buttons based on current page
    const currentPage = getCurrentPage();

    switch(currentPage) {
        case 'signChartPage':
            createNavigationButton('View Map →', 'solutionMapsPage', buttonContainer);
            break;
        case 'emptyVisualPage':
            createNavigationButton('← Previous', 'signChartPage', buttonContainer);
            createNavigationButton('Next →', 'pedestrianPage', buttonContainer);
            break;
        case 'pedestrianPage':
            createNavigationButton('← Previous', 'emptyVisualPage', buttonContainer);
            createNavigationButton('View Map →', 'solutionMapsPage', buttonContainer);
            break;
        case 'solutionMapsPage':
            createNavigationButton('← Previous', 'pedestrianPage', buttonContainer);
            createNavigationButton('Back to Start', 'signChartPage', buttonContainer);
            break;
    }

    // Public API for external navigation
    window.pageNavigation = {
        goToPage: function(pageId) {
            navigateToPage(pageId);
        },
        goToNext: function() {
            const current = getCurrentPage();
            const pageOrder = ['signChartPage', 'emptyVisualPage', 'pedestrianPage', 'solutionMapsPage'];
            const currentIndex = pageOrder.indexOf(current);
            if (currentIndex < pageOrder.length - 1) {
                navigateToPage(pageOrder[currentIndex + 1]);
            }
        },
        goToPrevious: function() {
            const current = getCurrentPage();
            const pageOrder = ['signChartPage', 'emptyVisualPage', 'pedestrianPage', 'solutionMapsPage'];
            const currentIndex = pageOrder.indexOf(current);
            if (currentIndex > 0) {
                navigateToPage(pageOrder[currentIndex - 1]);
            }
        }
    };
}

function createNavigationButton(text, targetPage, container) {
    const button = document.createElement('button');
    button.className = 'nav-button';
    button.innerHTML = text;
    button.style.cssText = `
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

    // Add hover effects
    button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(255, 255, 255, 0.25)';
        button.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.background = 'rgba(255, 255, 255, 0.15)';
        button.style.transform = 'translateY(0)';
    });

    button.addEventListener('click', () => {
        navigateToPage(targetPage);
    });

    container.appendChild(button);
}

function getCurrentPage() {
    const pages = ['signChartPage', 'emptyVisualPage', 'pedestrianPage', 'solutionMapsPage'];
    for (let pageId of pages) {
        const page = document.getElementById(pageId);
        if (page && page.style.display !== 'none') {
            return pageId;
        }
    }
    return 'signChartPage'; // default
}

function navigateToPage(targetPageId) {
    // Hide all pages
    const pages = ['signChartPage', 'emptyVisualPage', 'pedestrianPage', 'solutionMapsPage'];
    pages.forEach(pageId => {
        const page = document.getElementById(pageId);
        if (page) {
            page.style.display = 'none';
        }
    });

    // Show target page
    const targetPage = document.getElementById(targetPageId);
    if (targetPage) {
        targetPage.style.display = 'block';

        if (targetPageId === 'solutionMapsPage') {

            console.log('Navigated to solution maps page');

            // If the map needs any post-navigation setup, it can be done here
            setTimeout(() => {
                // Ensure the map visualization is properly displayed
                if (typeof myMapVis !== 'undefined' && myMapVis.updateVis) {
                    myMapVis.updateVis();
                }
            }, 100);
        }
    }

    // Update navigation buttons
    setTimeout(setupPageNavigation, 50);
}

// Initialize navigation when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupPageNavigation();

        // Force show the navigation on sign chart page
        const signPage = document.getElementById('signChartPage');
        if (signPage && signPage.style.display !== 'none') {
            setupPageNavigation(); // Call again to ensure buttons are created
        }
    }, 1000); // Increased delay to ensure page is fully loaded
});



window.addEventListener('load', function() {
    setTimeout(setupPageNavigation, 1500);
});