/* * * * * * * * * * * * * * * *
*           MAIN                 *
* * * * * * * * * * * * * * * */

// init global variables
let myBillboardViz;

// Scroll handling in main.js
function handleScroll() {
    const scrollContent = document.getElementById('scrollContent');
    const scrollProgress = Math.min(window.scrollY / (scrollContent.offsetHeight - window.innerHeight), 1);
    
    if (myBillboardViz) {
        myBillboardViz.updateScrollPosition(scrollProgress);
    }
}

// Initialize scroll listener
window.addEventListener('scroll', handleScroll);

// Load background SVG and initialize visualization
d3.xml("assets/road-background.svg")
    .then(function(xml) {
        initMainPage(xml);
    })
    .catch(function(err) {
        console.log("Error loading background SVG:", err);
        // Initialize anyway with empty background
        initMainPage(null);
    });

// initMainPage
function initMainPage(backgroundSvg) {
    // Initialize BillboardViz
    myBillboardViz = new BillboardViz('billboardVizDiv', backgroundSvg);
    
    // Initial update with scroll position 0
    handleScroll();
}

