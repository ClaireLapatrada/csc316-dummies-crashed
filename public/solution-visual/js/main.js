/* * * * * * * * * * * * * * *
*           MAIN              *
* * * * * * * * * * * * * * */

// init global variables, switches, helper functions
let myMapVis,
    myTimelineVis,
    myLocationChart,
    myCrashPointsVis,
    myImprovementsVis;
let currentView = 'map'; // 'map' or 'improvements'
let globalCrashData = null; // Store crash data globally for access in view switching

// Load data using promises
let promises = [
    d3.csv("data/dataset.csv"),
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
    
    // Store crash data globally for access in view switching
    globalCrashData = crashData;

    // Find actual year range from data
    let years = crashData.map(d => d.Year).filter(y => y > 0);
    let minYear = Math.min(...years);
    let maxYear = Math.max(...years);

    // Create visualization instances (don't initialize yet)
    myMapVis = new MapVis('mapDiv', crashData, geoData);
    myMapVis.currentView = 'map'; // Initialize current view
    myTimelineVis = new TimelineVis('timelineDiv', [minYear, maxYear]);
    myLocationChart = new LocationChart('locationChart', crashData);

    // Initialize MapVis first (needed for SVG and projection)
    myMapVis.initVis();

    // Initialize TimelineVis
    myTimelineVis.initVis();

    // LocationChart is already initialized in constructor

    // Create and initialize CrashPointsVis with MapVis's SVG and projection
    myCrashPointsVis = new CrashPointsVis(myMapVis.svg, myMapVis.projection, myMapVis.severityColors);
    myMapVis.crashPointsVis = myCrashPointsVis; // Store reference in MapVis
    myCrashPointsVis.initVis();

    // Create and initialize ImprovementsVis with MapVis's SVG and projection
    myImprovementsVis = new ImprovementsVis(myMapVis.svg, myMapVis.projection, crashData, myTimelineVis);
    myMapVis.improvementsVis = myImprovementsVis; // Store reference in MapVis
    myImprovementsVis.initVis();
    myImprovementsVis.onBackClick = function() {
        switchToMapView();
    };

    // Connect timeline to map
    myTimelineVis.onYearChange = function(year) {
        myMapVis.setYear(year);
        myLocationChart.setYear(year);
        // Update improvements when in improvements view (both manual and playing)
        if (myImprovementsVis && currentView === 'improvements') {
            myImprovementsVis.wrangleData(globalCrashData, year);
        }
    };
    
    // Connect play/pause to improvements
    if (myTimelineVis) {
        let originalPlay = myTimelineVis.play;
        let originalPause = myTimelineVis.pause;
        
        myTimelineVis.play = function() {
            if (originalPlay) originalPlay.call(this);
            // Draw factors when play starts
            if (currentView === 'improvements' && myImprovementsVis) {
                myImprovementsVis.wrangleData(globalCrashData, myTimelineVis.selectedYear);
            }
        };
        
        myTimelineVis.pause = function() {
            if (originalPause) originalPause.call(this);
            // Don't clear factors on pause, just stop updating
        };
    }

    // Set initial year
    myTimelineVis.setYear(minYear);
    myMapVis.setYear(minYear);
    myLocationChart.setYear(minYear);

    // Set up filter checkboxes
    setupFilters();

    // Set up scroll listener
    setupScrollListener();

    // Set up improvements view button
    setupImprovementsView();
}

function switchToImprovementsView() {
    currentView = 'improvements';
    
    // Update MapVis with current view state
    if (myMapVis) {
        myMapVis.currentView = 'improvements';
    }
    
    // Hide crash points
    if (myCrashPointsVis) {
        myCrashPointsVis.svg.selectAll(".crash-point").style("display", "none");
    }
    
    // Hide LocationChart container
    d3.select("#options-panel").select(".mt-4").style("display", "none");
    
    // Hide severity filters and control buttons
    d3.select("#severity-filter-btn").style("display", "none");
    d3.select("#severity-checkboxes").style("display", "none");
    d3.select(".control-buttons").style("display", "none");
    d3.select("#improvementsButton").style("display", "none");
    
    // Show improvement circles and create UI
    if (myImprovementsVis) {
        myImprovementsVis.show();
        myImprovementsVis.createFactorFilters();
        myImprovementsVis.createBackButton();
        // Draw factors for current year
        myImprovementsVis.wrangleData(globalCrashData, myTimelineVis.selectedYear);
    }
}

function switchToMapView() {
    currentView = 'map';
    
    // Update MapVis with current view state
    if (myMapVis) {
        myMapVis.currentView = 'map';
    }
    
    // Show crash points
    if (myCrashPointsVis) {
        myCrashPointsVis.svg.selectAll(".crash-point").style("display", "block");
    }
    
    // Show LocationChart container
    d3.select("#options-panel").select(".mt-4").style("display", "block");
    
    // Hide improvement circles
    if (myImprovementsVis) {
        myImprovementsVis.hide();
        myImprovementsVis.removeFactorFilters();
    }
    
    // Restore severity filters and control buttons
    d3.select("#severity-filter-btn").style("display", "block");
    d3.select(".control-buttons").style("display", "flex");
    d3.select("#improvementsButton").style("display", "block");
}

function setupImprovementsView() {
    d3.select("#improvementsButton").on("click", function() {
        switchToImprovementsView();
    });
    
    // Set up play button handler
    d3.select("#playButton").on("click", function() {
        if (myTimelineVis) {
            if (myTimelineVis.isPlaying) {
                myTimelineVis.pause();
                d3.select(this).classed("playing", false);
            } else {
                myTimelineVis.play();
                d3.select(this).classed("playing", true);
            }
        }
    });
    
    // Set up restart button handler
    d3.select("#restartButton").on("click", function() {
        if (myTimelineVis) {
            myTimelineVis.setYear(myTimelineVis.yearRange[0]);
        }
    });
    
    // Set up info button handler
    d3.select("#infoButton").on("click", function() {
        showInfoModal();
    });
}

function showInfoModal() {
    // Remove existing modal if any
    d3.select("#info-modal").remove();
    
    // Create modal
    let modal = d3.select("body")
        .append("div")
        .attr("id", "info-modal")
        .style("position", "fixed")
        .style("top", "0")
        .style("left", "0")
        .style("width", "100%")
        .style("height", "100%")
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("z-index", "2000")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .on("click", function() {
            modal.remove();
        });
    
    let modalContent = modal.append("div")
        .style("background-color", "white")
        .style("padding", "30px")
        .style("border-radius", "12px")
        .style("max-width", "600px")
        .style("max-height", "80vh")
        .style("overflow-y", "auto")
        .style("position", "relative")
        .on("click", function(event) {
            event.stopPropagation();
        });
    
    modalContent.append("button")
        .style("position", "absolute")
        .style("top", "10px")
        .style("right", "10px")
        .style("background", "none")
        .style("border", "none")
        .style("font-size", "24px")
        .style("cursor", "pointer")
        .text("×")
        .on("click", function() {
            modal.remove();
        });
    
    modalContent.append("p")
        .style("font-family", "Roboto, sans-serif")
        .style("margin-bottom", "15px")
        .style("line-height", "1.6")
        .html("This visualization maps traffic collision patterns across Toronto neighborhoods, revealing where and why accidents occur. The severity map uses color intensity to highlight accident hotspots, while the improvements view shows factors that could be improved with simple road interventions.<br/><br/>Use the play button to animate changes year-by-year, revealing temporal trends in collision patterns and the effectiveness of safety measures over time.<br/><br/>Crash data: <a href='https://data.torontopolice.on.ca/datasets/TorontoPS::traffic-collisions-open-data-asr-t-tbl-001/about' target='_blank' style='color: #0066cc; text-decoration: underline;'>https://data.torontopolice.on.ca/datasets/TorontoPS::traffic-collisions-open-data-asr-t-tbl-001/about</a><br/>Map: <a href='https://open.toronto.ca/dataset/toronto-centreline-tcl/' target='_blank' style='color: #0066cc; text-decoration: underline;'>https://open.toronto.ca/dataset/toronto-centreline-tcl/</a>");
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

