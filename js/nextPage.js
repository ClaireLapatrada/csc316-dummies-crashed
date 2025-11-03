// Global variable to track current page
if (typeof window.currentPage === 'undefined') {
    window.currentPage = 0; // 0 = main, 1 = pedestrian visual, 2 = sign visual
}

// Go to next page
function nextPage() {
    window.currentPage = (window.currentPage + 1) % 3;
    console.log('Current page after:', window.currentPage);

    if (window.currentPage === 0) {
        console.log('Switching to MAIN PAGE');
        showMainPage();
    } else if (window.currentPage === 1) {
        console.log('Switching to PEDESTRIAN VISUAL PAGE');
        showPedestrianVisualPage();
    } else if (window.currentPage === 2) {
        console.log('Switching to SIGN VISUAL PAGE');
        showSignVisualPage();
    }

    updateNavigationButton();
}

// Update navigation button
function updateNavigationButton() {
    const btn = document.getElementById('nextPageBtn');
    if (!btn) return;

    if (window.currentPage === 0) {
        btn.textContent = '→ Pedestrian Visual';
    } else if (window.currentPage === 1) {
        btn.textContent = '→ Sign Visual';
    } else {
        btn.textContent = '← Back to Main';
    }
}

// Show main page
function showMainPage() {
    console.log('=== SHOWING MAIN PAGE ===');

    if (window.originalMainContent && window.originalHeaderContent && window.originalFooterContent) {
        document.querySelector('header').innerHTML = window.originalHeaderContent;
        document.querySelector('main').innerHTML = window.originalMainContent;
        document.querySelector('footer').innerHTML = window.originalFooterContent;

        setTimeout(() => {
            if (typeof window.initVisualization === 'function') window.initVisualization();
            if (typeof window.updateVisualization === 'function') window.updateVisualization();
            if (typeof window.initYearScroller === 'function') window.initYearScroller();
            if (typeof window.initTimeSlider === 'function') window.initTimeSlider();
            createNavigationButton();
            console.log('Main page restored successfully');
        }, 100);
    } else {
        console.error('Original content not saved');
    }
}

// Show pedestrian visual page
function showPedestrianVisualPage() {
    console.log('=== SHOWING PEDESTRIAN VISUAL PAGE ===');

    if (!window.originalMainContent) {
        window.originalMainContent = document.querySelector('main').innerHTML;
        window.originalHeaderContent = document.querySelector('header').innerHTML;
        window.originalFooterContent = document.querySelector('footer').innerHTML;
    }

    document.querySelector('header').innerHTML = `
        <div class="py-4 text-center">
            <h1 class="fw-bold mb-2" style="color: white;">Pedestrian Action View</h1>
            <p class="fs-5 mb-0" style="color: rgba(255,255,255,0.8);">
                Cumulative collisions by pedestrian action (2006–2023)
            </p>
        </div>
    `;

    document.querySelector('main').innerHTML = `
        <div class="container-fluid">
            <div class="row">
                <div class="col-12">
                    <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.25);">
                        <iframe
                            id="pedVisualFrame"
                            src="public/ped-visual/index.html"
                            title="Pedestrian Visual"
                            style="width:100%; height: calc(100vh - 220px); border:0; display:block; background:transparent;">
                        </iframe>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.querySelector('footer').innerHTML = `
        <div class="py-3 text-center">
            <small style="color: rgba(255,255,255,0.5);">Created with D3.js • 2025 • Pedestrian Visual</small>
        </div>
    `;

    createNavigationButton();
    console.log("Pedestrian visual page displayed successfully (iframe).");
}

// Show sign visual page
function showSignVisualPage() {
    console.log('=== SHOWING SIGN VISUAL PAGE ===');

    if (!window.originalMainContent) {
        window.originalMainContent = document.querySelector('main').innerHTML;
        window.originalHeaderContent = document.querySelector('header').innerHTML;
        window.originalFooterContent = document.querySelector('footer').innerHTML;
    }

    document.querySelector('header').innerHTML = `
        <div class="py-4 text-center">
            <h1 class="fw-bold mb-2" style="color: white;">Who is Killed the Most</h1>
            <p class="fs-5 mb-0" style="color: rgba(255,255,255,0.8);">
                Scroll to see each year
            </p>
        </div>
    `;

    document.querySelector('main').innerHTML = `
        <div class="container-fluid">
            <div class="row">
                <div class="col-12">
                    <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.25);">
                        <<iframe
    id="signVisualFrame"
    src="public/sign-visual/index.html"
    title="Sign Visual"
    style="width:100%; height: calc(100vh - 220px); border:0; display:block; background:transparent;">
</iframe>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.querySelector('footer').innerHTML = `
        <div class="py-3 text-center">
            <small style="color: rgba(255,255,255,0.5);">Created with D3.js • 2025 • Sign Visual</small>
        </div>
    `;

    createNavigationButton();
    console.log("Sign visual page displayed successfully (iframe).");
}

// create and initialize navigation button
function createNavigationButton() {
    const existingBtn = document.getElementById('nextPageBtn');
    if (existingBtn) existingBtn.remove();

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'navButtonContainer';
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.top = '20px';
    buttonContainer.style.right = '20px';
    buttonContainer.style.zIndex = '9999';

    const nextPageBtn = document.createElement('button');
    nextPageBtn.id = 'nextPageBtn';
    nextPageBtn.className = 'btn btn-primary';
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
    nextPageBtn.onclick = nextPage;

    nextPageBtn.addEventListener('mouseenter', () => {
        nextPageBtn.style.background = 'rgba(255, 255, 255, 0.25)';
        nextPageBtn.style.transform = 'translateY(-3px)';
        nextPageBtn.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.4)';
    });
    nextPageBtn.addEventListener('mouseleave', () => {
        nextPageBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        nextPageBtn.style.transform = 'translateY(0)';
        nextPageBtn.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    });

    buttonContainer.appendChild(nextPageBtn);
    document.body.appendChild(buttonContainer);

    updateNavigationButton();
}

// initialize page navigation system
function initPageNavigation() {
    console.log('=== INITIALIZING PAGE NAVIGATION ===');
    setTimeout(() => {
        createNavigationButton();
        console.log("Page navigation system initialized successfully");
    }, 100);
}

// expose functions
window.nextPage = nextPage;
window.showMainPage = showMainPage;
window.showPedestrianVisualPage = showPedestrianVisualPage;
window.showSignVisualPage = showSignVisualPage;

window.PageNavigation = {
    nextPage,
    init: initPageNavigation,
    getCurrentPage: () => window.currentPage,
    showMainPage,
    showPedestrianVisualPage,
    showSignVisualPage
};

console.log('nextPage loaded successfully');
