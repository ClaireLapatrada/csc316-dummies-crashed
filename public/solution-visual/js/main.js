/* * * * * * * * * * * * * * *
*           MAIN              *
* * * * * * * * * * * * * * */

// init global variables, switches, helper functions
let myMapVis,
    myTimelineVis,
    myLocationChart;

// Load data using promises
let promises = [
    d3.csv("public/solution-visual/data/dataset.csv"),
    d3.json("data/Centreline - Version 2 - 4326.geojson")
];

Promise.all(promises)
    .then(function(data) { 
        initMainPage(data[0], data[1]);
    })
    .catch(function(err) {
        console.log(err);
        // If GeoJSON fails, continue without it
        d3.csv("data/dataset.csv")
            .then(function(csvData) {
                initMainPage(csvData, null);
            });
    });

// initMainPage
function initMainPage(crashData, geoData) {
    let vis = this;

    // Parse and clean crash data
    crashData.forEach(d => {
        d.Year = +d.Year || +d['Year of collision'] || 0;
        d.LATITUDE = +d.LATITUDE;
        d.LONGITUDE = +d.LONGITUDE;
    });

    // Filter out invalid coordinates
    crashData = crashData.filter(d => 
        d.LATITUDE && d.LONGITUDE && 
        !isNaN(d.LATITUDE) && !isNaN(d.LONGITUDE) &&
        d.LATITUDE >= 43.5 && d.LATITUDE <= 44.0 &&
        d.LONGITUDE >= -79.8 && d.LONGITUDE <= -79.0
    );

    // Find actual year range from data
    let years = crashData.map(d => d.Year).filter(y => y > 0);
    let minYear = Math.min(...years);
    let maxYear = Math.max(...years);

    // Create visualization instances (don't initialize yet)
    myMapVis = new MapVis('mapDiv', crashData, geoData);
    myTimelineVis = new TimelineVis('timelineDiv', [minYear, maxYear]);
    myLocationChart = new LocationChart('locationChart', crashData);

    // Initialize MapVis first (needed for SVG and projection)
    myMapVis.initVis();

    // Create and initialize CrashPointsVis with MapVis's SVG and projection
    myCrashPointsVis = new CrashPointsVis(myMapVis.svg, myMapVis.projection, myMapVis.severityColors);
    myMapVis.crashPointsVis = myCrashPointsVis; // Store reference in MapVis
    myCrashPointsVis.initVis();

    // Initialize TimelineVis
    myTimelineVis.initVis();

    // Connect timeline to map
    myTimelineVis.onYearChange = function(year) {
        myMapVis.setYear(year);
        myLocationChart.setYear(year);
    };

    // Set initial year
    myTimelineVis.setYear(minYear);
    myMapVis.setYear(minYear);
    myLocationChart.setYear(minYear);

    // Set up filter checkboxes
    setupFilters();

    // Set up scroll listener
    setupScrollListener();
}

function setupFilters() {
    let filterCheckboxes = [
        { id: 'filter-fatal', severity: 'Fatal' },
        { id: 'filter-major', severity: 'Major' },
        { id: 'filter-minor', severity: 'Minor' },
        { id: 'filter-minimal', severity: 'Minimal' }
    ];

    filterCheckboxes.forEach(filter => {
        d3.select('#' + filter.id).on('change', function() {
            updateFilters();
        });
    });
}

function updateFilters() {
    let activeFilters = [];
    
    if (d3.select('#filter-fatal').property('checked')) activeFilters.push('Fatal');
    if (d3.select('#filter-major').property('checked')) activeFilters.push('Major');
    if (d3.select('#filter-minor').property('checked')) activeFilters.push('Minor');
    if (d3.select('#filter-minimal').property('checked')) activeFilters.push('Minimal');

    myMapVis.setFilters(activeFilters);
    myLocationChart.setFilters(activeFilters);
}

function setupScrollListener() {
    let scrollThrottle = null;
    
    window.addEventListener('scroll', function() {
        if (scrollThrottle) {
            clearTimeout(scrollThrottle);
        }
        
        scrollThrottle = setTimeout(function() {
            updateYearFromScroll();
        }, 10);
    });
}

function updateYearFromScroll() {
    if (!myTimelineVis) return;
    
    // Calculate scroll position
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    let documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    let scrollPercent = Math.max(0, Math.min(1, scrollTop / documentHeight));
    
    // Map scroll position to year range
    let yearRange = myTimelineVis.yearRange;
    let selectedYear = Math.round(yearRange[0] + scrollPercent * (yearRange[1] - yearRange[0]));
    
    // Clamp to valid range
    selectedYear = Math.max(yearRange[0], Math.min(yearRange[1], selectedYear));
    
    // Update timeline and map
    if (myTimelineVis.selectedYear !== selectedYear) {
        myTimelineVis.setYear(selectedYear);
        myMapVis.setYear(selectedYear);
    }
}

// Comprehensive solution implementation function
function implementSolutions() {
    console.log('Implementing safety solutions...');

    // Get the map container
    const mapDiv = document.getElementById('mapDiv');
    if (!mapDiv) {
        console.error('Map container not found');
        return;
    }

    // Remove any existing overlay first
    const existingOverlay = mapDiv.querySelector('.implementation-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Create implementation overlay
    const implementationOverlay = document.createElement('div');
    implementationOverlay.className = 'implementation-overlay';
    implementationOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(76, 175, 80, 0.15);
        border: 3px solid #4CAF50;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        pointer-events: none;
        backdrop-filter: blur(2px);
    `;

    implementationOverlay.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.3); max-width: 400px; text-align: center;">
            <div style="color: #4CAF50; font-size: 48px; margin-bottom: 15px;">
                <i class="fas fa-check-circle"></i>
            </div>
            <h4 style="color: #4CAF50; margin-bottom: 15px; font-weight: bold;">Safety Solutions Implemented!</h4>
            <div style="text-align: left; color: #555; line-height: 1.5;">
                <p style="margin-bottom: 8px;"><i class="fas fa-crosswalk me-2"></i><strong>Enhanced Crosswalks:</strong> Raised pedestrian crossings with better lighting</p>
                <p style="margin-bottom: 8px;"><i class="fas fa-traffic-light me-2"></i><strong>Smart Traffic Signals:</strong> Longer pedestrian crossing times</p>
                <p style="margin-bottom: 8px;"><i class="fas fa-car-side me-2"></i><strong>Speed Reduction:</strong> Traffic calming measures in high-risk areas</p>
                <p style="margin-bottom: 0;"><i class="fas fa-lightbulb me-2"></i><strong>Improved Lighting:</strong> Better street lighting in collision-prone zones</p>
            </div>
            <button class="btn btn-success mt-3" onclick="this.parentElement.parentElement.remove()" style="pointer-events: auto;">
                <i class="fas fa-times me-2"></i>Close
            </button>
        </div>
    `;

    // Ensure map container has relative positioning
    mapDiv.style.position = 'relative';
    mapDiv.appendChild(implementationOverlay);

    // Visual enhancements on the map
    if (window.myMapVis && window.myMapVis.svg) {
        highlightHighRiskAreas();
    }

    // Show success message in console
    console.log('Safety solutions implemented successfully!');
}

// Function to highlight high-risk areas on the map
function highlightHighRiskAreas() {
    if (!window.myMapVis || !window.myMapVis.svg) return;

    const svg = window.myMapVis.svg;

    // Remove any existing highlights
    svg.selectAll('.safety-highlight').remove();

    // Add pulsing circles to represent implemented solutions
    const highlights = [
        { name: "Downtown Core", x: 400, y: 300, radius: 60 },
        { name: "North York Center", x: 500, y: 200, radius: 45 },
        { name: "Scarborough Cross", x: 600, y: 400, radius: 50 },
        { name: "Etobicoke Hub", x: 250, y: 350, radius: 40 }
    ];

    highlights.forEach(area => {
        const highlightGroup = svg.append('g')
            .attr('class', 'safety-highlight')
            .attr('transform', `translate(${area.x}, ${area.y})`);

        // Pulsing effect circle
        highlightGroup.append('circle')
            .attr('r', area.radius)
            .attr('fill', 'rgba(76, 175, 80, 0.2)')
            .attr('stroke', '#4CAF50')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .style('animation', 'pulse 2s infinite');

        // Solution icon
        highlightGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('font-size', '20px')
            .attr('fill', '#4CAF50')
            .html('⚙️');

        // Area label
        highlightGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', `${area.radius + 20}px`)
            .attr('font-size', '12px')
            .attr('fill', '#4CAF50')
            .attr('font-weight', 'bold')
            .text(area.name);
    });

    // Add CSS animation for pulsing effect
    if (!document.querySelector('#safety-animations')) {
        const style = document.createElement('style');
        style.id = 'safety-animations';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.7; }
                50% { transform: scale(1.05); opacity: 0.9; }
                100% { transform: scale(1); opacity: 0.7; }
            }
            .safety-highlight {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }
}

// Enhanced back to analysis function
function showPedestrianPage() {
    // Remove any implementation overlays
    const mapDiv = document.getElementById('mapDiv');
    if (mapDiv) {
        const overlay = mapDiv.querySelector('.implementation-overlay');
        if (overlay) overlay.remove();

        // Remove safety highlights
        if (window.myMapVis && window.myMapVis.svg) {
            window.myMapVis.svg.selectAll('.safety-highlight').remove();
        }
    }

    // Navigate to pedestrian page
    if (window.pageNavigation && typeof window.pageNavigation.goToPedestrianPage === 'function') {
        window.pageNavigation.goToPedestrianPage();
    } else {
        // Fallback navigation
        document.querySelectorAll('.visualization-page').forEach(page => {
            page.style.display = 'none';
        });
        const pedestrianPage = document.getElementById('pedestrianPage');
        if (pedestrianPage) {
            pedestrianPage.style.display = 'block';
        }
    }
}

// Simple improvement button - convert existing button
function addImprovementButton() {
    const solutionPage = document.getElementById('solutionMapsPage');
    if (!solutionPage || solutionPage.style.display === 'none') return;

    // Find the button container in the solution page
    const buttonContainer = solutionPage.querySelector('.col-3.d-flex.align-items-center.justify-content-end');
    if (!buttonContainer) {
        console.log('Button container not found');
        return;
    }

    // Check if we already have the improvement button
    let improvementBtn = buttonContainer.querySelector('.improvement-button');

    if (!improvementBtn) {
        // Create improvement button
        improvementBtn = document.createElement('button');
        improvementBtn.className = 'btn btn-success improvement-button';
        improvementBtn.innerHTML = '<i class="fas fa-tools me-2"></i>Implement Solutions';
        improvementBtn.onclick = implementSolutions;

        // Clear container and add our button
        buttonContainer.innerHTML = '';
        buttonContainer.appendChild(improvementBtn);

        console.log('Improvement button created and added');
    }
}

// Make sure it's called when solution page loads
document.addEventListener('DOMContentLoaded', function() {
    // Try immediately
    setTimeout(addImprovementButton, 100);

    // Also set up an interval to keep checking (for navigation)
    setInterval(addImprovementButton, 1000);
});

window.addImprovementButton = addImprovementButton;


window.implementSolutions = implementSolutions;
window.showPedestrianPage = showPedestrianPage;
window.highlightHighRiskAreas = highlightHighRiskAreas;