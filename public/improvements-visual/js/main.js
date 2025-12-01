/* * * * * * * * * * * * * * *
*           MAIN              *
* * * * * * * * * * * * * * */

// init global variables, switches, helper functions
let myMapVis,
    yearScroll,
    playButton,
    myCrashPointsVis,
    myImprovementsVis;
let currentView = 'improvements'; // 'map' or 'improvements'
let globalCrashData = null; // Store crash data globally for access in view switching

// Load data using promises
// Try to load GeoJSON, but continue without it if it fails
d3.csv("/data/dataset.csv")
    .then(function(csvData) {
        // Try to load GeoJSON, but don't fail if it's missing
        d3.json("/data/Centreline - Version 2 - 4326.geojson")
            .then(function(geoData) {
                initMainPage(csvData, geoData);
            })
            .catch(function(err) {
                // GeoJSON file is optional - continue without it
                console.log("GeoJSON file not found, continuing without road data");
                initMainPage(csvData, null);
            });
    })
    .catch(function(err) {
        console.error("Failed to load CSV data:", err);
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
    myMapVis.currentView = 'improvements'; // Initialize current view

    // Initialize MapVis first (needed for SVG and projection)
    myMapVis.initVis();

    // Initialize year scroll
    yearScroll = new YearScroll("#yearScrollContainer", {
        startYear: minYear,
        endYear: maxYear,
        onYearChange: (year) => {
            if (myMapVis) {
                myMapVis.setYear(year);
            }
            // Always update improvements since this page is always in improvements view
            if (myImprovementsVis) {
                // Ensure projection is up to date before wrangling data
                if (myMapVis && myMapVis.projection) {
                    myImprovementsVis.projection = myMapVis.projection;
                }
                myImprovementsVis.wrangleData(globalCrashData, year);
                // Update coordinates after data is wrangled
                if (myMapVis && myMapVis.projection) {
                    myImprovementsVis.updateCoordinates(myMapVis.projection);
                }
            }
        },
        width: 836
    });
    yearScroll.init();

    // Initialize play button
    playButton = new PlayButton("#playBtn", yearScroll);

    // Create and initialize CrashPointsVis with MapVis's SVG and projection
    myCrashPointsVis = new CrashPointsVis(myMapVis.svg, myMapVis.projection, myMapVis.severityColors);
    myMapVis.crashPointsVis = myCrashPointsVis; // Store reference in MapVis
    myCrashPointsVis.initVis();

    // Create and initialize ImprovementsVis with MapVis's SVG and projection
    myImprovementsVis = new ImprovementsVis(myMapVis.svg, myMapVis.projection, crashData, yearScroll);
    myMapVis.improvementsVis = myImprovementsVis; // Store reference in MapVis
    myImprovementsVis.setMapVis(myMapVis); // Connect mapVis for zoom functionality
    myImprovementsVis.initVis();
    myImprovementsVis.onBackClick = function() {
        switchToMapView();
    };

    // Set up filter checkboxes
    setupFilters();
    
    // Set up factors filter button dropdown
    setupFactorsFilterButton();

    // Set up improvements view button
    setupImprovementsView();
    
    // Switch to improvements view by default
    switchToImprovementsView();
    
    // Set initial year after everything is set up
    yearScroll.setYear(minYear);
    myMapVis.setYear(minYear);
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
    
    
    // Hide severity filters (but keep control buttons visible)
    d3.select("#severity-filter-btn").style("display", "none");
    d3.select("#severity-checkboxes").classed("show", false).style("display", "none");
    
    // Show improvement circles and create UI
    if (myImprovementsVis) {
        myImprovementsVis.show();
        myImprovementsVis.createFactorFilters();
        myImprovementsVis.createBackButton();
        // Draw factors for current year
        myImprovementsVis.wrangleData(globalCrashData, yearScroll.getCurrentYear());
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
    
    
    // Hide improvement circles
    if (myImprovementsVis) {
        myImprovementsVis.hide();
        myImprovementsVis.removeFactorFilters();
    }
    
    // Restore severity filters and control buttons
    d3.select("#severity-filter-btn").style("display", "block");
    d3.select("#severity-checkboxes").classed("show", false).style("display", "");
    d3.select(".control-buttons").style("display", "flex");
}

function setupImprovementsView() {
    // Set up view toggle buttons
    d3.selectAll('.tile-group[data-group="view"] .tile').on('click', function(event) {
        event.stopPropagation(); // Prevent event bubbling
        const value = d3.select(this).attr('data-value');
        
        // Update active state
        d3.selectAll('.tile-group[data-group="view"] .tile').classed('active', false);
        d3.select(this).classed('active', true);
        
        // Switch views
        if (value === 'improvements') {
            switchToImprovementsView();
        } else {
            switchToMapView();
        }
    });
    
    // Play button and restart button are handled by PlayButton class
    
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

function setupFactorsFilterButton() {
    // Toggle dropdown on button click
    d3.select("#factors-filter-btn").on("click", function(event) {
        event.stopPropagation();
        let dropdownGroup = d3.select(this.parentElement);
        dropdownGroup.classed("active", !dropdownGroup.classed("active"));
    });
    
    // Close dropdown when clicking outside
    d3.select("body").on("click", function() {
        d3.selectAll(".filter-dropdown-group").classed("active", false);
    });
    
    // Prevent dropdown from closing when clicking inside it
    d3.select("#factors-checkboxes").on("click", function(event) {
        event.stopPropagation();
    });
}

function updateFilters() {
    let activeFilters = [];
    
    if (d3.select('#filter-fatal').property('checked')) activeFilters.push('Fatal');
    if (d3.select('#filter-major').property('checked')) activeFilters.push('Major');
    if (d3.select('#filter-minor').property('checked')) activeFilters.push('Minor');
    if (d3.select('#filter-minimal').property('checked')) activeFilters.push('Minimal');

    myMapVis.setFilters(activeFilters);
}



