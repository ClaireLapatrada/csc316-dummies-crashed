
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
        showEmptyPage();
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
            // Re-add the navigation button
            createNavigationButton();
            console.log('Main page restored successfully');
        }, 100);
    } else {
        console.error('Original content not saved');
    }
}

// create and initialize navigation button
function createNavigationButton() {
    // Remove existing button if it exists
    const existingBtn = document.getElementById('nextPageBtn');
    if (existingBtn) {
        existingBtn.remove();
    }

    console.log('Creating navigation button...');

    // create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'navButtonContainer';
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.top = '20px';
    buttonContainer.style.right = '20px';
    buttonContainer.style.zIndex = '9999';

    // create the button
    const nextPageBtn = document.createElement('button');
    nextPageBtn.id = 'nextPageBtn';
    nextPageBtn.className = 'btn btn-primary';
    nextPageBtn.textContent = 'Next Page →';
    nextPageBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        cursor: pointer;
    `;

    // Add hover effects
    nextPageBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255, 255, 255, 0.25)';
        this.style.transform = 'translateY(-3px)';
        this.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.4)';
    });

    nextPageBtn.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255, 255, 255, 0.15)';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    });

    // add click event
    nextPageBtn.onclick = nextPage;

    // Append button to contaner
    buttonContainer.appendChild(nextPageBtn);

    // Add to body
    document.body.appendChild(buttonContainer);
    console.log("Navigation button created and added successfully");
}

// initialize page navigation system
function initPageNavigation() {
    console.log('=== INITIALIZING PAGE NAVIGATION ===');

    // Wait a bit for the DOM to be fully ready
    setTimeout(() => {
        createNavigationButton();
        console.log("Page navigation system initialized successfully");
    }, 100);
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