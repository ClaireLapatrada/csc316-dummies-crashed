
// Global variable to track current page
if (typeof window.currentPage === 'undefined') {
    window.currentPage = 0; // 0 = main page, 1 = empty page
}

// function to go to next page
function nextPage() {
    window.currentPage = (window.currentPage + 1) % 2;

    console.log('Current page after:', window.currentPage);

    if (window.currentPage === 0) {
        console.log('Switching to MAIN PAGE');
        showMainPage();
        updateNavigationButton();
    } else {
        console.log('Switching to EMPTY PAGE');
        // Show alternate page (embed main visual)
        showEmptyPage();
        function showEmptyPage() {
        console.log('=== SHOWING ALT PAGE: MAIN VISUAL IFRAME ===');

        // cache originals once
        if (!window.originalMainContent) {
            window.originalMainContent = document.querySelector('main').innerHTML;
            window.originalHeaderContent = document.querySelector('header').innerHTML;
            window.originalFooterContent = document.querySelector('footer').innerHTML;
        }

        // header
        document.querySelector('header').innerHTML = `
            <div class="py-4 text-center">
            <h1 class="fw-bold mb-2" style="color: white;">Pedestrian Action View</h1>
            <p class="fs-5 mb-0" style="color: rgba(255,255,255,0.8);">
                Cumulative collisions by pedestrian action (2006–2023)
            </p>
            </div>
        `;

        // main: iframe to the imported app
        document.querySelector('main').innerHTML = `
            <div class="container-fluid">
            <div class="row">
                <div class="col-12">
                <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.25);">
                    <iframe
                    id="mainVisualFrame"
                    src="public/ped-visual/index.html"
                    title="Pedestrian Action Visual"
                    style="width:100%; height: calc(100vh - 220px); border: 0; display:block; background:transparent;">
                    </iframe>
                </div>
                </div>
            </div>
            </div>
        `;

        // footer
        document.querySelector('footer').innerHTML = `
            <div class="py-3 text-center">
            <small style="color: rgba(255,255,255,0.5);">Created with D3.js • 2025 • Combined Visuals</small>
            </div>
        `;

        // Navigation button disabled
        console.log("Alt page displayed successfully (iframe).");
        }
        updateNavigationButton();
    }
}

// update navigation button text and appearance
function updateNavigationButton() {
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (nextPageBtn) {
        if (window.currentPage === 0) {
            nextPageBtn.textContent = 'Next Page →';
            nextPageBtn.classList.remove('btn-secondary');
            nextPageBtn.classList.add('btn-primary');
        } else {
            nextPageBtn.textContent = '← Back to Main';
            nextPageBtn.classList.remove('btn-primary');
            nextPageBtn.classList.add('btn-secondary');
        }
    }
}

// Show empty page -
function showEmptyPage() {
    console.log('=== SHOWING EMPTY PAGE ===');

    // save the original main content for later restoration
    if (!window.originalMainContent) {
        window.originalMainContent = document.querySelector('main').innerHTML;
        window.originalHeaderContent = document.querySelector('header').innerHTML;
        window.originalFooterContent = document.querySelector('footer').innerHTML;
    }

    // replace entire page with new content
    document.querySelector('header').innerHTML = `
        <div class="py-4 text-center">
            <h1 class="fw-bold mb-2" style="color: white;">Vehicle</h1>
            <p class="fs-5 mb-0" style="color: rgba(255,255,255,0.8);">
                Comprehensive Data Analysis & Insights
            </p>
        </div>
    `;

    document.querySelector('main').innerHTML = `
        <div class="container-fluid">
            <div class="row justify-content-center">
                <div class="col-12">
                    <!-- Hero Section -->
                    <div class="text-center mb-5" style="padding: 60px 0;">
                        <p style="font-size: 1.3rem; color: rgba(255,255,255,0.8); max-width: 600px; margin: 0 auto 3rem;">
                            Traffic
                        </p>
                    </div>
        </div>
    `;

    document.querySelector('footer').innerHTML = `
        <div class="py-3 text-center">
            <small style="color: rgba(255,255,255,0.5);">Advanced Analytics Platform • 2025 • Next Generation Data Visualization</small>
        </div>
    `;

    console.log("Empty page displayed successfully - entire page replaced");
}

// Show main page
function showMainPage() {
    console.log('=== SHOWING MAIN PAGE ===');

    // restore the original content
    if (window.originalMainContent && window.originalHeaderContent && window.originalFooterContent) {
        document.querySelector('header').innerHTML = window.originalHeaderContent;
        document.querySelector('main').innerHTML = window.originalMainContent;
        document.querySelector('footer').innerHTML = window.originalFooterContent;

        // reinitialize all the components
        setTimeout(() => {
            if (typeof window.initVisualization === 'function') {
                window.initVisualization();
            }
            if (typeof window.updateVisualization === 'function') {
                window.updateVisualization();
            }
            if (typeof window.initYearScroller === 'function') {
                window.initYearScroller();
            }
            if (typeof window.initTimeSlider === 'function') {
                window.initTimeSlider();
            }
            // Navigation button disabled
            console.log('Main page restored successfully');
        }, 100);
    } else {
        console.error('Original content not saved');
    }
}

// create and initialize navigation button
function createNavigationButton() {
    // Navigation button disabled - using scroll navigation instead
    // Remove any existing button if it exists
    const existingBtn = document.getElementById('nextPageBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    const existingContainer = document.getElementById('navButtonContainer');
    if (existingContainer) {
        existingContainer.remove();
    }
    return; // Exit early - button creation disabled
}

// initialize page navigation system
function initPageNavigation() {
    console.log('=== INITIALIZING PAGE NAVIGATION ===');
    // Navigation button disabled - using scroll navigation instead
    // No button creation needed
}

window.nextPage = nextPage;
window.showMainPage = showMainPage;
window.showEmptyPage = showEmptyPage;

// Public API
window.PageNavigation = {
    nextPage: nextPage,
    init: initPageNavigation,
    getCurrentPage: () => window.currentPage,
    showMainPage: showMainPage,
    showEmptyPage: showEmptyPage
};

console.log('nextPage loaded successfully');