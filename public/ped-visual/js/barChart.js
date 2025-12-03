
/*
 * BarChart - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- raw data; this should never be modified directly
 * @param  displayData      -- the data which will be displayed; set equal to transformations made onto data
 */

class BarChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.originalData = data; // Keep original unfiltered data
        this.data = data; // Will be filtered based on view mode
        this.displayData = data;
        this.currentYear = 2006; 
        this.laneDividersCreated = false;
        this.isPlaying = false;
        this.wasPlaying = undefined;
        this.playInterval = null;
        this.initialYear = 2006;
        this.yearScroll = null;
        this.viewMode = 'pedestrian'; // 'pedestrian' or 'driver'
        this.filterState = { severity: 'all', pedAct: 'all', drivAct: 'all', district: 'all', pedAge: 'all', drivAge: 'all' };
        this.lastHighlightYear = null; // Track last year we showed highlight for
        this.yearHighlights = null; // Will store calculated highlights
        this.colorMapping = {}; // Store persistent color mapping
    }

    /*
	 * Method that initializes the visualization (static content, e.g. SVG area or axes)
 	*/
    initVis() {
        let vis = this;

        // Store original data if not already stored
        if (!vis.originalData) {
            vis.originalData = vis.data;
        }

        // Filter out null values for the current view mode's action field
        const actionField = vis.viewMode === 'pedestrian' ? 'pedAct' : 'manoeuver';
        vis.data = vis.originalData.filter(d => d[actionField])

        // Calculate year highlights (use original data)
        vis.calculateYearHighlights();
        
        // Calculate persistent color mapping based on 2006 data
        vis.calculateColorMapping();

        // Process data and filter by current year
        vis.processData();

        // Margins and dimensions
        vis.margin = {top: 5, right: 5, bottom: 30, left: 110};
		vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height * 1.3 - vis.margin.top - vis.margin.bottom;

		// SVG drawing area
		vis.svg = d3.select("#" + vis.parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // stick figure (load once)
        vis.iconReady = d3.xml("svg/stickfigure.svg").then(data => {
        const imported = document.importNode(data.documentElement, true);
        // ensure we append the <symbol> into our chart's <defs>
        const defs = vis.svg.select("defs").empty() ? vis.svg.append("defs") : vis.svg.select("defs");
        defs.node().appendChild(imported.querySelector("symbol")); // id="icon-stick"
        });

        // Initialize xScale (will be updated in updateVis)
        vis.xScale = d3.scaleLinear()
            .range([0, vis.width])
            .domain([0, 1]);
        
        vis.yScale = d3.scaleBand()
            .domain(d3.range(10)) // Always 10 positions: 0, 1, 2, ..., 9
            .range([0, vis.height])
            .padding(0.1);

        // Color scale uses the persistent mapping
        vis.colorScale = (d) => vis.colorMapping[d] || "#999999";

        vis.updateVis();
        
        // Set up year scroll, control buttons, and filters (after chart is rendered)
        vis.setupYearScroll();
        vis.setupPlayButton();
        vis.setupRestartButton();
        vis.bindTileFilters();
        vis.setupDropdownFilters();
        
        // Responsive resize listener to handle window size changes
        window.addEventListener('resize', debounce(() => vis.handleResize(), 150));
    }

    /*
     * Calculate persistent color mapping based on 2006 ranking
     */
    calculateColorMapping() {
        let vis = this;
        const actionField = vis.viewMode === 'pedestrian' ? 'pedAct' : 'manoeuver';
        
        // Filter for 2006 only
        const data2006 = vis.originalData.filter(d => {
            const dateStr = d.date;
            const yearMatch = dateStr.match(/\/(\d{4})\s/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
            return year === 2006 && d[actionField];
        });

        // Group by action and count
        const counts2006 = Array.from(
            d3.rollup(
                data2006,
                v => v.length,
                d => d[actionField]
            ),
            ([action, count]) => ({ action, count })
        );

        // Sort descending
        counts2006.sort((a, b) => b.count - a.count);

        // Get all unique actions in the entire dataset to ensure everything has a color
        const allActions = Array.from(new Set(vis.originalData.map(d => d[actionField]).filter(d => d)));
        
        // Add any actions missing from 2006 to the end of the list
        allActions.forEach(action => {
            if (!counts2006.find(d => d.action === action)) {
                counts2006.push({ action: action, count: 0 });
            }
        });

        // Create color scale using D3's schemeSet3 or similar diverse categorical scale
        // We want distinct colors for different actions
        const colorScale = d3.scaleOrdinal(d3.schemeSet3);
        
        vis.colorMapping = {};
        
        counts2006.forEach((d, i) => {
            // Use index to pick from categorical scale
            vis.colorMapping[d.action] = colorScale(i);
        });
    }

    /*
	 * Method that resizes visualization elements based on window size changes
 	*/
    handleResize() {
        const vis = this;

        // Force reflow before measuring
        const container = document.getElementById(vis.parentElement);
        container.getBoundingClientRect(); // triggers reflow

        // Get updated width and height
        vis.width = container.clientWidth - vis.margin.left - vis.margin.right;
        vis.height = container.clientHeight - vis.margin.top - vis.margin.bottom;

        // Update SVG size
        d3.select(`#${vis.parentElement} svg`)
            .attr('width', vis.width + vis.margin.left + vis.margin.right)
            .attr('height', vis.height + vis.margin.top + vis.margin.bottom);

        // Update scales
        vis.xScale.range([0, vis.width]);
        vis.yScale.range([0, vis.height]);

        // Update layout, bars, and labels *without clearing everything*
        vis.laneDividersCreated = false;
        vis.updateVis();

        // Reinitialize year scroll with new width
        if (vis.yearScroll) {
            const container = document.querySelector('.visualization-area');
            const containerWidth = container ? container.getBoundingClientRect().width : 800;
            vis.yearScroll.width = Math.min(containerWidth * 0.9, 800);
            vis.yearScroll.init();
            vis.yearScroll.setYear(vis.currentYear);
        }
    }

    /*
     * Create static lane dividers
     */
    createStaticLaneDividers() {
        let vis = this;
        
        // Create exactly 10 lanes (9 dividers between them)
        const laneCount = 10;
        const laneHeight = vis.height / laneCount;
        
        // Create dividers between each lane
        for (let i = 1; i < laneCount; i++) {
            const y = i * laneHeight;
            
            vis.svg.append("line")
                .attr("class", "lane-divider")
                .attr("x1", 0)
                .attr("x2", vis.width)
                .attr("y1", y)
                .attr("y2", y)
                .attr("stroke", "#FFFFFF")
                .attr("stroke-width", 3)
                .attr("stroke-dasharray", "20,20")
                .attr("stroke-dashoffset", i % 2 === 0 ? 0 : 10)
                .attr("opacity", 1);
        }
    }

    /*
     * Calculate maximum count across all years for fixed axis scale
     */
    calculateMaxCount() {
        let vis = this;
        
        // Calculate max count for each year from 2006 to 2023
        // Use original data for max count calculation
        const dataToUse = vis.originalData || vis.data;
        let maxCount = 0;
        for (let year = 2006; year <= 2023; year++) {
            const yearData = dataToUse.filter(d => {
                const dateStr = d.date;
                const yearMatch = dateStr.match(/\/(\d{4})\s/);
                const dataYear = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
                return dataYear >= 2006 && dataYear <= year;
            });
            
            // Apply same filters as processData
            let filteredData = yearData;
            if (vis.filterState.severity === 'fatal') {
                filteredData = filteredData.filter(d => d.severity === 'fatal');
            } else if (vis.filterState.severity === 'nonfatal') {
                filteredData = filteredData.filter(d => d.severity === 'nonfatal');
            }
            
            // action filter (pedestrian or driver based on view mode)
            if (vis.viewMode === 'pedestrian') {
                if (vis.filterState.pedAct !== 'all' && Array.isArray(vis.filterState.pedAct) && vis.filterState.pedAct.length > 0) {
                    filteredData = filteredData.filter(d => vis.filterState.pedAct.includes(d.pedAct));
                }
            } else {
                if (vis.filterState.drivAct !== 'all' && Array.isArray(vis.filterState.drivAct) && vis.filterState.drivAct.length > 0) {
                    filteredData = filteredData.filter(d => vis.filterState.drivAct.includes(d.manoeuver));
                }
            }
            
            if (vis.filterState.district !== 'all' && Array.isArray(vis.filterState.district) && vis.filterState.district.length > 0) {
                filteredData = filteredData.filter(d => vis.filterState.district.includes(d.district));
            }
            
            // age filter (uses pedAge for both modes since drivAge = pedAge)
            // In driver mode, drivAge filter uses pedAge data; in pedestrian mode, pedAge filter uses pedAge data
            const ageFilter = vis.viewMode === 'driver' ? vis.filterState.drivAge : vis.filterState.pedAge;
            if (ageFilter !== 'all' && Array.isArray(ageFilter) && ageFilter.length > 0) {
                filteredData = filteredData.filter(d => ageFilter.includes(d.pedAge));
            }
            
            // Aggregate counts per action - use pedAct or manoeuver based on view mode
            const actionField = vis.viewMode === 'pedestrian' ? 'pedAct' : 'manoeuver';
            const counts = Array.from(
                d3.rollup(
                    filteredData,
                    v => v.length,
                    d => d[actionField]
                ),
                ([action, count]) => ({ pedAct: action, count })
            );
            
            const yearMax = d3.max(counts, d => d.count) || 0;
            if (yearMax > maxCount) {
                maxCount = yearMax;
            }
        }
        
        // Round up to a nice number for the axis
        vis.maxCountForAxis = Math.ceil(maxCount * 1.1);
    }

    /*
     * Process data with cumulative accumulation up to current year
     */
    processData() {
        let vis = this;
        
        // Filter data from 2006 up to current year (cumulative)
        vis.displayData = vis.data.filter(d => {
            // Parse date string like "1/1/2006 10:00:00 AM" to extract year
            const dateStr = d.date;
            const yearMatch = dateStr.match(/\/(\d{4})\s/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
            return year >= 2006 && year <= vis.currentYear;
        });
        // severity filter
        if (vis.filterState.severity === 'fatal') {
            vis.displayData = vis.displayData.filter(d => d.severity === 'fatal');
        } else if (vis.filterState.severity === 'nonfatal') {
            vis.displayData = vis.displayData.filter(d => d.severity === 'nonfatal');
        }

        // action filter (pedestrian or driver based on view mode)
        if (vis.viewMode === 'pedestrian') {
            if (vis.filterState.pedAct !== 'all' && Array.isArray(vis.filterState.pedAct) && vis.filterState.pedAct.length > 0) {
                vis.displayData = vis.displayData.filter(d => vis.filterState.pedAct.includes(d.pedAct));
            }
        } else {
            if (vis.filterState.drivAct !== 'all' && Array.isArray(vis.filterState.drivAct) && vis.filterState.drivAct.length > 0) {
                vis.displayData = vis.displayData.filter(d => vis.filterState.drivAct.includes(d.manoeuver));
            }
        }

        // district filter
        if (vis.filterState.district !== 'all' && Array.isArray(vis.filterState.district) && vis.filterState.district.length > 0) {
            vis.displayData = vis.displayData.filter(d => vis.filterState.district.includes(d.district));
        }

        // age filter (uses pedAge for both modes since drivAge = pedAge)
        // In driver mode, drivAge filter uses pedAge data; in pedestrian mode, pedAge filter uses pedAge data
        const ageFilter = vis.viewMode === 'driver' ? vis.filterState.drivAge : vis.filterState.pedAge;
        if (ageFilter !== 'all' && Array.isArray(ageFilter) && ageFilter.length > 0) {
            vis.displayData = vis.displayData.filter(d => ageFilter.includes(d.pedAge));
        }

        // Aggregate counts per action (cumulative) - use pedAct or manoeuver based on view mode
        const actionField = vis.viewMode === 'pedestrian' ? 'pedAct' : 'manoeuver';
        vis.counts = Array.from(
            d3.rollup(
                vis.displayData,
                v => v.length,
                d => d[actionField]
            ),
            ([action, count]) => ({ pedAct: action, count }) // Keep pedAct name for compatibility with existing code
        );

        // Sort by count (descending) and take top 10
        vis.counts.sort((a, b) => b.count - a.count);
        vis.counts = vis.counts.slice(0, 10); // Always show top 10
    }

    /*
     * Calculate year highlights (e.g., year with most collisions)
     */
    calculateYearHighlights() {
        let vis = this;
        
        // Use original data for year highlights calculation
        const dataToUse = vis.originalData || vis.data;
        
        // Calculate total collisions per year
        const yearCounts = {};
        for (let year = 2006; year <= 2023; year++) {
            const yearData = dataToUse.filter(d => {
                const dateStr = d.date;
                const yearMatch = dateStr.match(/\/(\d{4})\s/);
                const dataYear = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
                return dataYear === year;
            });
            yearCounts[year] = yearData.length;
        }
        
        // Find year with most collisions
        let maxYear = 2006;
        let maxCount = yearCounts[2006];
        for (let year = 2007; year <= 2023; year++) {
            if (yearCounts[year] > maxCount) {
                maxCount = yearCounts[year];
                maxYear = year;
            }
        }

        // The below years and statistics were calculated within Tableau
        let similarYear = 2008;
        let peakYear = 2018;
        let minYear = 2022;
        
        // Store highlights
        vis.yearHighlights = {
            maxYear: maxYear,
            maxCount: maxCount,
            similarYear: similarYear,
            peakYear: peakYear,
            minYear: minYear
        };
    }

    /*
     * Check and show highlight pop-up if needed
     */
    checkAndShowHighlight() {
        let vis = this;
        
        if (!vis.yearHighlights) return;
        
        // Only show if we haven't shown it for this year yet
        if (vis.lastHighlightYear === vis.currentYear) return;
        
        // Check if current year matches a highlight
        if (vis.currentYear === vis.yearHighlights.maxYear) {
            vis.showHighlightPopup({
                year: vis.currentYear,
                title: `Year Highlight: ${vis.currentYear}`,
                message: `This year had the most collisions with ${vis.yearHighlights.maxCount.toLocaleString()} total collisions.`
            });
            vis.lastHighlightYear = vis.currentYear;
        }

        // The below years and statistics were calculated on Tableau beforehand
        if (vis.currentYear === vis.yearHighlights.similarYear) {
            vis.showHighlightPopup({
                year: vis.currentYear,
                title: `Year Highlight: ${vis.currentYear}`,
                message: `2008 recorded 194 collisions, the exact same number as 2007.`
            });
        }

        if (vis.currentYear === vis.yearHighlights.peakYear) {
            vis.showHighlightPopup({
                year: vis.currentYear,
                title: `Year Highlight: ${vis.currentYear}`,
                message: `Collisions peaked at 217, the third highest on record, before starting a steady 4-year decline.`
            });
        }

        if (vis.currentYear === vis.yearHighlights.minYear) {
            vis.showHighlightPopup({
                year: vis.currentYear,
                title: `Year Highlight: ${vis.currentYear}`,
                message: `Collisions hit a record low of 123 this year.`
            });
        }
    }

    /*
     * Show highlight pop-up
     */
    showHighlightPopup(highlight) {
        let vis = this;
        
        // Remove existing pop-up if any
        d3.selectAll('.year-highlight-popup').remove();
        
        // Get road container position for positioning
        const roadContainer = document.querySelector('.road-container');
        const roadRect = roadContainer ? roadContainer.getBoundingClientRect() : null;
        
        // Create pop-up with glass-like effect
            const popup = d3.select('body')
                .append('div')
                .attr('class', 'year-highlight-popup')
                .style('position', 'fixed')
                .style('bottom', roadRect ? `${window.innerHeight - roadRect.bottom + 40}px` : '-15px')
                .style('right', roadRect ? `${window.innerWidth - roadRect.right + 30}px` : '30px')
            .style('background', '#fff')
            .style('padding', '20px 30px')
            .style('border-radius', '8px')
            .style('box-shadow', '0 4px 20px rgba(0, 0, 0, 0.2)')
            .style('z-index', '10000')
            .style('max-width', '400px')
            .style('opacity', 0);
        
        // Add close button (X) in top right
        const closeBtn = popup.append('button')
            .attr('class', 'highlight-close')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('background', 'transparent')
            .style('color', '#333')
            .style('border', 'none')
            .style('padding', '5px 10px')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .style('font-family', 'Arial, sans-serif')
            .style('font-size', '20px')
            .style('font-weight', 'bold')
            .style('line-height', '1')
            .style('width', '30px')
            .style('height', '30px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .text('×')
            .on('click', function() {
                popup.transition()
                    .duration(300)
                    .style('opacity', 0)
                    .remove();
            })
            .on('mouseover', function() {
                d3.select(this).style('background', '#f0f0f0');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'transparent');
            });
        
        // Add content
        popup.append('div')
            .attr('class', 'highlight-title')
            .style('font-family', 'Playfair Display, serif')
            .style('font-size', '24px')
            .style('font-weight', '700')
            .style('color', '#0C7B56')
            .style('margin-bottom', '10px')
            .style('padding-right', '30px')
            .text(highlight.title);
        
        popup.append('div')
            .attr('class', 'highlight-message')
            .style('font-family', 'Arial, sans-serif')
            .style('font-size', '14px')
            .style('color', '#333')
            .style('line-height', '1.5')
            .text(highlight.message);
        
        // Animate in
        popup.transition()
            .duration(300)
            .style('opacity', 1);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (popup.node().parentNode) {
                popup.transition()
                    .duration(300)
                    .style('opacity', 0)
                    .remove();
            }
        }, 4000);
    }

    /* Timeline related methods --------------------------------------------------------------------------------- */

    /*
     * Set up year scroll functionality
     */
    setupYearScroll() {
        let vis = this;
        
        // Get container width for responsive sizing
        const container = document.querySelector('.visualization-area');
        const containerWidth = container ? container.getBoundingClientRect().width : 800;
        
        // Initialize YearScroll
        vis.yearScroll = new YearScroll('#year-scroll-container', {
            startYear: 2006,
            endYear: 2023,
            width: 836,
            onYearChange: (year) => {
                vis.currentYear = year;
                vis.processData();
                vis.updateVis();
                vis.checkAndShowHighlight();
            }
        });
        
        vis.yearScroll.init();
        vis.yearScroll.setYear(vis.currentYear);
        
        // Initialize PlayButton
        if (typeof PlayButton !== 'undefined') {
            vis.playButton = new PlayButton('#playBtn', vis.yearScroll, 1000);
            
            // Override PlayButton's start and stop methods to sync with barChart's isPlaying state
            const originalStart = vis.playButton.start.bind(vis.playButton);
            const originalStop = vis.playButton.stop.bind(vis.playButton);
            const originalRestart = vis.playButton.restart.bind(vis.playButton);
            
            vis.playButton.start = function() {
                vis.isPlaying = true;
                originalStart();
            };
            
            vis.playButton.stop = function() {
                vis.isPlaying = false;
                originalStop();
            };
            
            vis.playButton.restart = function() {
                originalRestart();
                // Start playing after restart
                setTimeout(() => {
                    vis.playButton.start();
                }, 100);
            };
        }
    }
    
    /*
     * Set up play button functionality (legacy - now using PlayButton class)
     */
    setupPlayButton() {
        let vis = this;
        
        // If PlayButton class is available, it's already initialized
        if (vis.playButton) return;
        
        const playButton = document.querySelector('.play-button');
        if (!playButton) return;
        
        playButton.addEventListener('click', () => {
            if (vis.isPlaying) {
                // Stop playing
                vis.stopPlay();
            } else {
                // Start playing
                vis.startPlay();
            }
        });
    }

    /*
     * Start auto-play animation
     */
    startPlay() {
        let vis = this;
        
        vis.isPlaying = true;
        if (vis.yearScroll) {
            vis.yearScroll.setPlaying(true);
        }
        const playButton = document.querySelector('.play-button');
        if (playButton) {
            playButton.classList.add('playing');
        }
        
        // Auto-advance through years
        vis.playInterval = setInterval(() => {
            vis.currentYear++;
            if (vis.currentYear > 2023) {
                vis.currentYear = 2006; // Loop back to start
                vis.lastHighlightYear = null; // Reset highlight tracking when looping
            }
            
            // Update year scroll
            if (vis.yearScroll) {
                vis.yearScroll.setYear(vis.currentYear);
            }
            
            // Update visualization
            vis.processData();
            vis.updateVis();
            
            // Check for highlights
            vis.checkAndShowHighlight();
        }, 2000); // 2 seconds between year changes
    }

    /*
     * Stop auto-play animation
     */
    stopPlay() {
        let vis = this;
        
        vis.isPlaying = false;
        if (vis.yearScroll) {
            vis.yearScroll.setPlaying(false);
        }
        const playButton = document.querySelector('.play-button');
        if (playButton) {
            playButton.classList.remove('playing');
        }
        
        if (vis.playInterval) {
            clearInterval(vis.playInterval);
            vis.playInterval = null;
        }
    }
    
    /*
     * Set up restart button functionality
     */
    setupRestartButton() {
        let vis = this;
        
        const restartButton = document.querySelector('.restart-button');
        if (!restartButton) return;
        
        restartButton.addEventListener('click', () => {
            vis.restartTimeline();
        });
    }

    /*
     * Restart timeline to initial year
     */
    restartTimeline() {
        let vis = this;
        
        // Reset to initial year
        vis.currentYear = vis.initialYear;
        vis.lastHighlightYear = null; // Reset highlight tracking
        
        // Update year scroll
        if (vis.yearScroll) {
            vis.yearScroll.setYear(vis.currentYear);
        }
        
        // Reprocess data and update visualization
        vis.processData();
        vis.updateVis();
    }


    /*
     * Switch view mode and update visualization
     */
    switchViewMode() {
        let vis = this;
        
        // Reset filters for the new mode
        if (vis.viewMode === 'pedestrian') {
            vis.filterState.pedAct = 'all';
            vis.filterState.pedAge = 'all';
        } else {
            vis.filterState.drivAct = 'all';
            vis.filterState.drivAge = 'all'; // drivAge uses pedAge data but has its own filter state
        }
        
        // Re-filter data for the new view mode from original data
        const actionField = vis.viewMode === 'pedestrian' ? 'pedAct' : 'manoeuver';
        vis.data = vis.originalData.filter(d => d[actionField])
        
        // Update dropdown filters
        vis.setupDropdownFilters();
        
        // Recalculate color mapping for new view mode
        vis.calculateColorMapping();

        // Reprocess data and update visualization
        vis.processData();
        vis.updateVis();
    }

    /* Filter related methods --------------------------------------------------------------------------------- */

    /*
     * Applies tile filters (view mode toggle)
     */
    bindTileFilters() {
        const vis = this;
        const bar = document.querySelector('.filter-buttons');
        if (!bar) return;

        bar.addEventListener('click', (e)=>{
            const btn = e.target.closest('.tile');
            if (!btn) return;
            const groupEl = btn.closest('.tile-group');
            const group = groupEl?.getAttribute('data-group');
            const value = btn.getAttribute('data-value');
            if (!group || !value) return;

            // single-select per group
            groupEl.querySelectorAll('.tile').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');

            // Handle view mode toggle
            if (group === 'view') {
                const newViewMode = value;
                if (vis.viewMode !== newViewMode) {
                    vis.viewMode = newViewMode;
                    vis.switchViewMode();
                }
            }
        });
    }

    /*
     * Set up dropdown filters for action and district based on view mode
     */
    setupDropdownFilters() {
        let vis = this;

        // Use original data to get all unique values (not filtered by view mode)
        const dataToUse = vis.originalData || vis.data;

        // Setup severity filter (now a dropdown) - single select
        const uniqueSeverities = ['fatal', 'nonfatal'];
        setupFilter('severity', uniqueSeverities, vis);

        // Get unique values for district (always shown)
        const uniqueDistricts = [...new Set(dataToUse.map(d => d.district).filter(d => d))].sort();
        setupFilter('district', uniqueDistricts, vis);

        // Show/hide filter containers based on view mode
        const pedActContainer = document.querySelector('#pedAct-filter-btn')?.closest('.filter-dropdown-group');
        const drivActContainer = document.querySelector('#drivAct-filter-btn')?.closest('.filter-dropdown-group');
        const pedAgeContainer = document.querySelector('#pedAge-filter-btn')?.closest('.filter-dropdown-group');
        const drivAgeContainer = document.querySelector('#drivAge-filter-btn')?.closest('.filter-dropdown-group');

        if (vis.viewMode === 'pedestrian') {
            // Show pedestrian filters, hide driver filters
            if (pedActContainer) pedActContainer.style.display = '';
            if (drivActContainer) drivActContainer.style.display = 'none';
            if (pedAgeContainer) pedAgeContainer.style.display = '';
            if (drivAgeContainer) drivAgeContainer.style.display = 'none';

            // Setup pedestrian action filter
            const uniquePedActs = [...new Set(dataToUse.map(d => d.pedAct).filter(d => d))].sort();
            setupFilter('pedAct', uniquePedActs, vis);

            // Setup pedestrian age filter
            const uniquePedAges = [...new Set(dataToUse.map(d => d.pedAge).filter(d => d))].sort();
            setupFilter('pedAge', uniquePedAges, vis);
        } else {
            // Show driver filters, hide pedestrian filters
            if (pedActContainer) pedActContainer.style.display = 'none';
            if (drivActContainer) drivActContainer.style.display = '';
            if (pedAgeContainer) pedAgeContainer.style.display = 'none';
            if (drivAgeContainer) drivAgeContainer.style.display = '';

            // Setup driver action filter (using manoeuver instead of drivAct)
            const uniqueManoeuvres = [...new Set(dataToUse.map(d => d.manoeuver).filter(d => d))].sort();
            setupFilter('drivAct', uniqueManoeuvres, vis);

            // Setup driver age filter (uses pedAge since drivAge = pedAge, but show as "Driver Age")
            const uniquePedAges = [...new Set(dataToUse.map(d => d.pedAge).filter(d => d))].sort();
            // Use drivAge filter container but with pedAge data
            setupFilter('drivAge', uniquePedAges, vis);
        }
    }

    /* Tooltip related methods --------------------------------------------------------------------------------- */

    /*
    * Calculate tooltip data for a specific action (pedestrian or driver)
    */
    calculateTooltipData(action) {
        let vis = this;

        // Determine which field to use based on view mode
        const actionField = vis.viewMode === 'pedestrian' ? 'pedAct' : 'manoeuver';

        // Helper function to apply filters to data
        const applyFilters = (data) => {
            let filtered = data;
            
            // severity filter
            if (vis.filterState.severity === 'fatal') {
                filtered = filtered.filter(d => d.severity === 'fatal');
            } else if (vis.filterState.severity === 'nonfatal') {
                filtered = filtered.filter(d => d.severity === 'nonfatal');
            }

            // action filter (pedestrian or driver based on view mode)
            if (vis.viewMode === 'pedestrian') {
                if (vis.filterState.pedAct !== 'all' && Array.isArray(vis.filterState.pedAct) && vis.filterState.pedAct.length > 0) {
                    filtered = filtered.filter(d => vis.filterState.pedAct.includes(d.pedAct));
                }
            } else {
                if (vis.filterState.drivAct !== 'all' && Array.isArray(vis.filterState.drivAct) && vis.filterState.drivAct.length > 0) {
                    filtered = filtered.filter(d => vis.filterState.drivAct.includes(d.manoeuver));
                }
            }

            // district filter
            if (vis.filterState.district !== 'all' && Array.isArray(vis.filterState.district) && vis.filterState.district.length > 0) {
                filtered = filtered.filter(d => vis.filterState.district.includes(d.district));
            }

            // age filter (uses pedAge for both modes since drivAge = pedAge)
            // In driver mode, drivAge filter uses pedAge data; in pedestrian mode, pedAge filter uses pedAge data
            const ageFilter = vis.viewMode === 'driver' ? vis.filterState.drivAge : vis.filterState.pedAge;
            if (ageFilter !== 'all' && Array.isArray(ageFilter) && ageFilter.length > 0) {
                filtered = filtered.filter(d => ageFilter.includes(d.pedAge));
            }
            
            return filtered;
        };

        // Use original data for tooltip calculations to get all data
        const dataToUse = vis.originalData || vis.data;
        
        // Get current year data for this action (single year only) with filters applied
        const currentYearData = applyFilters(dataToUse.filter(d => {
            const dateStr = d.date;
            const yearMatch = dateStr.match(/\/(\d{4})\s/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
            return year === vis.currentYear && d[actionField] === action;
        }));
        const currentCount = currentYearData.length;

        // Get previous year data (single year) with filters applied
        const previousYear = vis.currentYear - 1;
        const previousYearData = applyFilters(dataToUse.filter(d => {
            const dateStr = d.date;
            const yearMatch = dateStr.match(/\/(\d{4})\s/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
            return year === previousYear && d[actionField] === action;
        }));
        const previousCount = previousYearData.length;

        // Calculate increase from previous year
        let increase = currentCount - previousCount;
        let increasePercentage = previousCount > 0
            ? ((increase / previousCount) * 100)
            : (currentCount > 0 ? 100 : 0);

        // Calculate cumulative total (from 2006 to current year) with filters applied
        const cumulativeData = applyFilters(dataToUse.filter(d => {
            const dateStr = d.date;
            const yearMatch = dateStr.match(/\/(\d{4})\s/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
            return year >= 2006 && year <= vis.currentYear && d[actionField] === action;
        }));
        const cumulativeCount = cumulativeData.length;

        // Calculate percentage among all actions for current year (with filters applied)
        const totalCurrentYear = applyFilters(dataToUse.filter(d => {
            const dateStr = d.date;
            const yearMatch = dateStr.match(/\/(\d{4})\s/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date(dateStr).getFullYear();
            return year === vis.currentYear;
        })).length;

        const percentage = totalCurrentYear > 0 ? ((currentCount / totalCurrentYear) * 100) : 0;

        // Find most common month
        const monthCounts = {};
        currentYearData.forEach(d => {
            const dateStr = d.date;
            const monthMatch = dateStr.match(/(\d{1,2})\/\d{1,2}\/(\d{4})/);
            if (monthMatch) {
                const month = parseInt(monthMatch[1]);
                monthCounts[month] = (monthCounts[month] || 0) + 1;
            }
        });

        let mostCommonMonth = "N/A";
        let maxMonthCount = 0;
        Object.entries(monthCounts).forEach(([month, count]) => {
            if (count > maxMonthCount) {
                maxMonthCount = count;
                mostCommonMonth = this.getMonthName(parseInt(month));
            }
        });

        // District concentration
        const districtCounts = {};
        currentYearData.forEach(d => {
            if (d.district) {
                districtCounts[d.district] = (districtCounts[d.district] || 0) + 1;
            }
        });

        // Sort districts by count (descending)
        const sortedDistricts = Object.entries(districtCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3); // Top 3 districts

        // Calculate concentration metrics
        const topDistrict = sortedDistricts[0] ? sortedDistricts[0][0] : "N/A";
        const topDistrictCount = sortedDistricts[0] ? sortedDistricts[0][1] : 0;
        const topDistrictPercentage = currentCount > 0 ? ((topDistrictCount / currentCount) * 100).toFixed(1) : 0;

        // Calculate top 3 districts concentration
        const top3Total = sortedDistricts.reduce((sum, district) => sum + district[1], 0);
        const top3Percentage = currentCount > 0 ? ((top3Total / currentCount) * 100).toFixed(1) : 0;

        return {
            pedAct: action, // Keep pedAct name for compatibility
            cumulativeCount: cumulativeCount,
            currentCount: currentCount,
            previousCount: previousCount,
            increase: increase,
            increasePercentage: increasePercentage,
            percentage: percentage,
            mostCommonMonth: mostCommonMonth,
            topDistrict: topDistrict,
            topDistrictPercentage: topDistrictPercentage,
            topDistrictCount: topDistrictCount,
            top3Districts: sortedDistricts,
            top3Percentage: top3Percentage
        };
    }

    /*
    * Convert month number to month name
    */
    getMonthName(month) {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return months[month - 1] || "Unknown";
    }

    /*
	* The drawing function - should use the D3 update sequence (enter, update, exit)
 	* Function parameters only needed if different kinds of updates are needed
 	*/
    updateVis(){
        const vis = this;
        
        // Update xScale based on current data (for bars and axis - they move together)
        const maxCount = d3.max(vis.counts, d => d.count);
        // Add padding at the end for emoji (about 40px)
        const endPadding = 40;
        const maxBarWidth = vis.width - endPadding;
        
        vis.xScale = d3.scaleLinear()
            .range([0, maxBarWidth])
            .domain([0, maxCount]);
        
        // Create/update road background rectangle (starts where bars start)
        vis.svg.selectAll(".road-background").remove();
        // Insert at the beginning so it appears behind all other elements
        vis.svg.insert("rect", ":first-child")
            .attr("class", "road-background")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("fill", "#666666") // Dark asphalt road color
            .attr("opacity", 1);
        
        // Create/update road shoulders (top and bottom) - start where bars start
        vis.svg.selectAll(".road-shoulder-top, .road-shoulder-bottom").remove();
        // Top shoulder
        vis.svg.insert("rect", ":first-child")
            .attr("class", "road-shoulder-top")
            .attr("x", 0)
            .attr("y", -12)
            .attr("width", vis.width)
            .attr("height", 8)
            .attr("fill", "#92C7B9") // Light mint green
            .attr("opacity", 1);
        // Bottom shoulder
        vis.svg.insert("rect", ":first-child")
            .attr("class", "road-shoulder-bottom")
            .attr("x", 0)
            .attr("y", vis.height + 4)
            .attr("width", vis.width)
            .attr("height", 8)
            .attr("fill", "#92C7B9") // Light mint green
            .attr("opacity", 1);
        
        // Create/update x-axis with same scale as bars (ticks move with bars)
        vis.xAxis = d3.axisTop(vis.xScale)
            .ticks(5)
            .tickFormat(d3.format("d"));
        
        // Select or create x-axis group
        let xAxisGroup = vis.svg.selectAll(".x-axis").data([0]);
        
        const xAxisGroupEnter = xAxisGroup.enter()
            .append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0, 0)");
        
        xAxisGroup = xAxisGroupEnter.merge(xAxisGroup);
        
        // Store previous tick positions before updating
        const previousTickPositions = new Map();
        xAxisGroup.selectAll(".tick").each(function(d) {
            const transform = d3.select(this).attr("transform");
            if (transform) {
                const match = transform.match(/translate\(([^,]+),/);
                if (match) {
                    previousTickPositions.set(d, parseFloat(match[1]));
                }
            }
        });
        
        // Call axis to create/update ticks (this will position them at new locations)
        xAxisGroup.call(vis.xAxis);
        
        // Style x-axis immediately to ensure visibility
        xAxisGroup.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .attr("y1", 0)
            .attr("y2", vis.height);
        
        xAxisGroup.selectAll(".tick text")
            .attr("fill", "#FFFFFF")
            .attr("font-size", "12px")
            .attr("font-weight", "500")
            .attr("font-family", "Arial, sans-serif")
            .attr("dy", "-5px");
        
        xAxisGroup.selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);
        
        // Sort ticks in DOM order by their value (ascending)
        // This ensures they animate in the correct order
        xAxisGroup.selectAll(".tick")
            .sort((a, b) => a - b);
        
        // Reset existing ticks to previous positions for smooth transition
        // New ticks should only appear if they're within the current scale domain
        xAxisGroup.selectAll(".tick").each(function(d) {
            const previousX = previousTickPositions.get(d);
            const currentX = vis.xScale(d);
            const isWithinDomain = d >= 0 && d <= vis.xScale.domain()[1];
            
            if (previousX !== undefined) {
                // Existing tick: reset to previous position for smooth transition
                d3.select(this).attr("transform", `translate(${previousX},0)`);
                d3.select(this).style("opacity", 1); // Ensure it's visible
            } else if (isWithinDomain) {
                // New tick within domain: start from right edge and animate in
                d3.select(this).attr("transform", `translate(${vis.width},0)`);
                d3.select(this).style("opacity", 1);
            } else {
                // New tick outside domain: hide it
                d3.select(this).style("opacity", 0);
            }
        });
        
        // Now transition tick positions smoothly with animation
        // All ticks animate at the same time (no delay)
        xAxisGroup.selectAll(".tick")
            .filter(function(d) {
                // Only animate ticks that are within the domain
                return d >= 0 && d <= vis.xScale.domain()[1];
            })
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .style("opacity", 1)
            .attr("transform", d => `translate(${vis.xScale(d)},0)`);
        
        // Hide ticks that are outside the domain
        xAxisGroup.selectAll(".tick")
            .filter(function(d) {
                return d < 0 || d > vis.xScale.domain()[1];
            })
            .transition()
            .duration(1000)
            .style("opacity", 0);
        
        // Transition domain line smoothly
        xAxisGroup.selectAll(".domain")
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .attr("d", `M${vis.xScale.range()[0]},0V0H${vis.xScale.range()[1]}V0`);
        
        // Ensure tick lines stay extended during transition
        xAxisGroup.selectAll(".tick line")
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .attr("y2", vis.height);
        
        // Clear any existing stick figures to prevent duplicates
        vis.svg.selectAll(".bar-icon").remove();
        
        // Create/update tooltip div
        let tooltip = d3.select("body").selectAll(".tooltip").data([0]);
        tooltip = tooltip.enter()
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("display", "block")
            .style("pointer-events", "none")
            .style("visibility", "visible")
            .merge(tooltip);

        const animationDelay = 50;
        const barCount = vis.counts.length;

        // Create horizontal bars (road lanes)
        const bars = vis.svg.selectAll(".bar")
            .data(vis.counts, d => d.pedAct); 

        const barsEnter = bars.enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", (d, i) => vis.yScale(i))
            .attr("width", 0)
            .attr("height", vis.yScale.bandwidth())
            .attr("fill", d => vis.colorScale(d.pedAct))
            .attr("rx", 12)
            .attr("ry", 12);

        const barsMerged = barsEnter.merge(bars);

        // Add tooltip interactions to bars (before transition)
        barsMerged
            .on("mouseover", function(event, d) {
                // Cancel any tooltip fade-out in progress
                tooltip.interrupt();

                // Pause autoplay if active
                console.log('Mouseover - isPlaying:', vis.isPlaying);
                if (vis.isPlaying) {
                    console.log('Pausing playback');
                    if (vis.playButton) {
                        vis.playButton.stop();
                    } else {
                        vis.stopPlay();
                    }
                    vis.wasPlaying = true;
                } else if (vis.wasPlaying === undefined) {
                    vis.wasPlaying = false;
                }

                // Dim all other bars
                barsMerged.transition()
                    .duration(200)
                    .style("opacity", b => b.pedAct === d.pedAct ? 1 : 0.3);
                
                // Calculate tooltip data - use the action value from the data
                const actionValue = d.pedAct; // This contains pedAct in pedestrian mode, manoeuver in driver mode
                const tooltipData = vis.calculateTooltipData(actionValue);

                // Clear existing tooltip content first
                tooltip.html("");
                
                // Position tooltip temporarily to get dimensions
                tooltip
                    .style("opacity", 0)
                    .style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 20}px`);
                
                // Build tooltip content
                tooltip.append('div')
                    .attr('class', 'tooltip-title')
                    .text(tooltipData.pedAct);
                
                // Cumulative total
                const itemCumulative = tooltip.append('div')
                    .attr('class', 'tooltip-item');
                
                itemCumulative.append('span')
                    .attr('class', 'tooltip-label')
                    .text('Cumulative Total:');
                
                itemCumulative.append('span')
                    .attr('class', 'tooltip-value')
                    .text(tooltipData.cumulativeCount.toLocaleString());
                
                // Current year total
                const item1 = tooltip.append('div')
                    .attr('class', 'tooltip-item');
                
                item1.append('span')
                    .attr('class', 'tooltip-label')
                    .text('Current Year Total:');
                
                item1.append('span')
                    .attr('class', 'tooltip-value')
                    .text(tooltipData.currentCount.toLocaleString());


                // Percentage of total
                const item3 = tooltip.append('div')
                    .attr('class', 'tooltip-item');
                
                item3.append('span')
                    .attr('class', 'tooltip-label')
                    .text('Percentage of Total:');
                
                item3.append('span')
                    .attr('class', 'tooltip-value')
                    .text(`${tooltipData.percentage.toFixed(1)}%`);
                
                
                // Change from previous year
                if (tooltipData.previousCount > 0) {
                    const item2 = tooltip.append('div')
                        .attr('class', 'tooltip-item');

                    const previousYearText = `Change from previous year (non-cumulative):`;
                    const increaseClass = tooltipData.increase > 0
                        ? 'tooltip-positive'
                        : tooltipData.increase < 0
                            ? 'tooltip-negative'
                            : 'tooltip-neutral';
                    const increaseSign = tooltipData.increase > 0 ? '+' : '';

                    // Smart percentage formatting: 12%, 12.5%, -3%
                    const formattedPercent = (() => {
                        const val = tooltipData.increasePercentage;
                        const absVal = Math.abs(val);
                        const sign = val > 0 ? '+' : val < 0 ? '' : '';
                        return absVal % 1 === 0
                            ? `${sign}${val.toFixed(0)}%`
                            : `${sign}${val.toFixed(1)}%`;
                    })();

                    item2.append('span')
                        .attr('class', 'tooltip-label')
                        .text(previousYearText);

                    item2.append('span')
                        .attr('class', `tooltip-value ${increaseClass}`)
                        .text(`${increaseSign}${tooltipData.increase} (${formattedPercent})`);
                }
                
                
                // Most common month
                const item4 = tooltip.append('div')
                    .attr('class', 'tooltip-item');
                
                item4.append('span')
                    .attr('class', 'tooltip-label')
                    .text('Most Common Month:');
                
                item4.append('span')
                    .attr('class', 'tooltip-value')
                    .text(tooltipData.mostCommonMonth);
                
                tooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");

                
                // Removed district concentration because many fields are missing district data
                // causing a stark difference between the collision count for each bar and the
                // top 3 district count (i.e.  Crossing with right of way in 2021 has 987 counts,
                //  but its top 3 districts are  Toronto and East York (13 counts), North York
                //  (8 counts), Scarborough (8 counts).

                // Top districts
                // if (tooltipData.top3Districts.length > 1) {
                //     const itemTop3 = tooltip.append('div')
                //         .attr('class', 'tooltip-item')
                //         .style('flex-direction', 'column')
                //         .style('align-items', 'flex-start');
                //     
                //     itemTop3.append('span')
                //         .attr('class', 'tooltip-label')
                //         .text('District Concentration:');
                //     
                //     // Add each top district
                //     tooltipData.top3Districts.forEach((district, index) => {
                //         const districtPercentage = ((district[1] / tooltipData.currentCount) * 100).toFixed(1);
                //         const districtItem = itemTop3.append('div')
                //             .attr('class', 'tooltip-district-item')
                //             .style('display', 'flex')
                //             .style('justify-content', 'space-between')
                //             .style('width', '100%')
                //             .style('font-size', '11px')
                //             .style('margin-top', '2px');
                //         
                //         districtItem.append('span')
                //             .attr('class', 'tooltip-label')
                //             .style('font-weight', 'normal')
                //             .text(`${index + 1}. ${district[0]}`);
                //         
                //         districtItem.append('span')
                //             .attr('class', 'tooltip-value')
                //             .style('font-weight', 'normal')
                //             .text(`${district[1]} (${districtPercentage}%)`);
                //     });
                // }
                
                // Get tooltip dimensions after content is added
                const tooltipNode = tooltip.node();
                const tooltipRect = tooltipNode.getBoundingClientRect();
                const tooltipWidth = tooltipRect.width;
                const tooltipHeight = tooltipRect.height;
                
                // Calculate viewport boundaries
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const padding = 10; // Padding from edges
                
                // Calculate optimal position
                let left = event.pageX + 15;
                let top = event.pageY - 20;
                
                // Check right edge overflow
                if (left + tooltipWidth + padding > viewportWidth) {
                    // Position to the left of cursor instead
                    left = event.pageX - tooltipWidth - 15;
                }
                
                // Check left edge overflow
                if (left < padding) {
                    left = padding;
                }
                
                // Check bottom edge overflow
                if (top + tooltipHeight + padding > viewportHeight) {
                    // Position above cursor instead
                    top = event.pageY - tooltipHeight - 20;
                }
                
                // Check top edge overflow
                if (top < padding) {
                    top = padding;
                }
                
                // Apply final position and show
                tooltip
                    .style("left", `${left}px`)
                    .style("top", `${top}px`)
                    .style("opacity", 1)
                    .style("display", "block")
                    .style("visibility", "visible");
                
                // Highlight the bar
                d3.select(this)
                    .attr("stroke", "#0C7B56")
                    .attr("stroke-width", 2);
            })
            .on("mousemove", function(event) {
                // Keep tooltip visible while moving mouse over bar
                tooltip.interrupt();
                tooltip.style("opacity", 1);
            })
            .on("mouseout", function(event) {
                // Check if mouse moved directly onto another bar
                const related = event.relatedTarget;

                // Remove stroke
                d3.select(this)
                    .attr("stroke", null)

                const movedToBar = related && related.classList && related.classList.contains("bar");
                if (movedToBar) return; // Don't hide tooltip if we moved to another bar

                // Hide tooltip with a small delay to prevent flickering
                setTimeout(() => {
                    // Double check that mouse is not over any bar or tooltip
                    const hoveredBar = document.querySelector('.bar:hover');
                    const tooltipNode = tooltip.node();
                    if (!hoveredBar && tooltipNode) {
                        tooltip.transition().duration(150).style("opacity", 0);
                    }
                }, 50);
                
                // Restore full opacity to all bars
                barsMerged.transition()
                    .duration(300)
                    .style("opacity", 1);

                // Resume autoplay if it was previously running
                console.log('Mouseout - wasPlaying:', vis.wasPlaying);
                if (vis.wasPlaying) {
                    console.log('Resuming playback');
                    if (vis.playButton) {
                        vis.playButton.start();
                    } else {
                        vis.startPlay();
                    }
                }
                vis.wasPlaying = undefined;
            });

        // Apply transitions after event handlers are attached
        barsMerged
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .attr("width", d => vis.xScale(d.count))
            .attr("y", (d, i) => vis.yScale(i));

        bars.exit().remove();

        // Add text labels showing accumulated numbers inside each bar
        const labels = vis.svg.selectAll(".bar-label")
            .data(vis.counts, d => d.pedAct);

        const labelsEnter = labels.enter().append("text")
            .attr("class", "bar-label")
            .attr("x", 0)
            .attr("y", (d, i) => vis.yScale(i) + vis.yScale.bandwidth()/2)
            .attr("text-anchor", "end")
            .attr("dy", "0.35em")
            .style("font-family", "Arial, sans-serif")
            .style("font-size", "12px")
            .style("font-weight", "700")
            .style("fill", "#000000")
            .style("opacity", 0)
            .text("0");

        labelsEnter.merge(labels)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .style("opacity", 1)
            .attr("x", d => Math.max(vis.xScale(d.count) - 5, 5))
            .attr("text-anchor", "end")
            .attr("y", (d, i) => vis.yScale(i) + vis.yScale.bandwidth()/2)
            .tween("text", function(d) {
                const current = this.textContent.replace(/,/g, '') || 0;
                const target = d.count;
                const interpolator = d3.interpolateNumber(current, target);
                return function(t) {
                    const value = Math.round(interpolator(t));
                    d3.select(this).text(value.toLocaleString());
                };
            });

        labels.exit().remove();

        // Add legend labels to the left of each bar (in the margin area)
        const legendLabels = vis.svg.selectAll(".legend-label")
            .data(vis.counts, d => d.pedAct);

        const legendLabelsEnter = legendLabels.enter().append("text")
            .attr("class", "legend-label")
            .attr("x", -15)
            .attr("y", (d, i) => vis.yScale(i) + vis.yScale.bandwidth()/2)
            .attr("text-anchor", "end")
            .attr("dy", "0.35em")
            .style("font-family", "Overpass, sans-serif")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .style("fill", "#FFFFFF")
            .style("stroke", "none")
            .style("stroke-width", 0)
            .style("opacity", 0)
            .text(d => d.pedAct);

        legendLabelsEnter.merge(legendLabels)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .style("opacity", 1)
            .style("fill", "#FFFFFF")
            .style("stroke", "none")
            .style("stroke-width", 0)
            .attr("x", -15)
            .attr("y", (d, i) => vis.yScale(i) + vis.yScale.bandwidth()/2)
            .text(d => d.pedAct);

        legendLabels.exit().remove();

        // Create static lane dividers
        if (!vis.laneDividersCreated) {
            vis.svg.selectAll(".lane-divider").remove();
            vis.createStaticLaneDividers();
            vis.laneDividersCreated = true;
        }

        // Add icons - position them at the end of each bar (pedestrian or car based on view mode)
        const emojiIcons = vis.svg.selectAll(".emoji-icon")
            .data(vis.counts, d => d.pedAct);

        // Choose emoji based on view mode
        const emoji = vis.viewMode === 'pedestrian' ? "🚶‍♀️" : "🚗";

        const emojiIconsEnter = emojiIcons.enter().append("text")
            .attr("class", "emoji-icon")
            .attr("x", 0)
            .attr("y", (d, i) => vis.yScale(i) + vis.yScale.bandwidth()/2)
            .attr("text-anchor", "start")
            .attr("dy", "0.35em")
            .style("font-size", "20px")
            .style("opacity", 0)
            .text(emoji);

        emojiIconsEnter.merge(emojiIcons)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .style("opacity", 1)
            .attr("x", d => {
                // Position at the end of the bar, accounting for bar width
                const barWidth = vis.xScale(d.count);
                return Math.max(barWidth + 15, 50);
            })
            .attr("y", (d, i) => vis.yScale(i) + vis.yScale.bandwidth()/2)
            .attr("transform", function(d) {
                // Flip the emoji horizontally
                // We need to rotate/scale around its own center
                // Since it's a text element, we can use scale(-1, 1)
                // But we need to translate it correctly to keep position
                const x = Math.max(vis.xScale(d.count) + 15, 50);
                const y = vis.yScale(d.pedAct) + vis.yScale.bandwidth()/2; // This logic might be flawed if y uses index i
                // Actually y is set via attribute, we should apply transform relative to that position
                // Better approach: wrap in a g? Or just use transform-origin.
                // SVG transform origin is tricky.
                // Let's try scale(-1, 1) and adjust x negative.
                const bbox = this.getBBox();
                const centerX = bbox.x + bbox.width / 2;
                const centerY = bbox.y + bbox.height / 2;
                // Since bbox is not available during enter, we can try a simple scaleX(-1) and move x
                // Easier: Flip the emoji char? No.
                // Let's use css transform-box: fill-box; transform-origin: center; transform: scaleX(-1);
                return null;
            })
            .style("transform-box", "fill-box")
            .style("transform-origin", "center")
            .style("transform", "scaleX(-1)")
            .text(emoji);

        emojiIcons.exit().remove();
    }
}

/* 
* Clears and resets timeout (debuff time to resize window) 
*/
function debounce(func, wait) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
}

/*
* Simple filter setup function using D3 patterns
*/
function setupFilter(filterType, options, vis) {
    // Prepare data: add "All" option first
    // For severity, check if current state matches 'all', otherwise check the matching option
    let filterData = [];
    if (filterType === 'severity') {
        const currentSeverity = vis.filterState[filterType] || 'all';
        filterData.push({value: 'all', label: 'All', checked: currentSeverity === 'all'});
        options.forEach(opt => {
            filterData.push({value: opt, label: opt === 'fatal' ? 'Fatal' : opt === 'nonfatal' ? 'Non-fatal' : opt, checked: currentSeverity === opt});
        });
    } else {
        filterData.push({value: 'all', label: 'All', checked: vis.filterState[filterType] === 'all'});
        options.forEach(opt => {
            const isChecked = Array.isArray(vis.filterState[filterType]) && vis.filterState[filterType].includes(opt);
            filterData.push({value: opt, label: opt, checked: isChecked});
        });
    }

    // Select container
    let container = d3.select(`#${filterType}-checkboxes`);
    if (container.empty()) return;

    // Bind data and create checkboxes using D3 pattern
    let items = container.selectAll(".filter-checkbox-item")
        .data(filterData);

    // Enter: create new items
    let itemsEnter = items.enter()
        .append("div")
        .attr("class", "filter-checkbox-item");

    // Append checkbox and label
    itemsEnter.append("input")
        .attr("type", "checkbox")
        .attr("id", d => `${filterType}-${d.value === 'all' ? 'all' : d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
        .attr("value", d => d.value)
        .property("checked", d => d.checked);

    itemsEnter.append("label")
        .attr("for", d => `${filterType}-${d.value === 'all' ? 'all' : d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
        .text(d => d.label);

    // Merge enter and update
    let itemsMerged = itemsEnter.merge(items);

    // Update checkboxes
    itemsMerged.select("input")
        .property("checked", d => d.checked);

    // Handle checkbox changes
    container.on("change", function(event) {
        let allCheckbox = d3.select(`#${filterType}-all`);
        let checkboxes = container.selectAll(`input:not(#${filterType}-all)`);
        let clicked = event.target;

        // Severity is single-select (like radio buttons)
        if (filterType === 'severity') {
            if (clicked.id === `${filterType}-all`) {
                // If "All" is checked, uncheck all others
                if (d3.select(clicked).property("checked")) {
                    checkboxes.property("checked", false);
                    vis.filterState[filterType] = 'all';
                }
            } else {
                // If any other option is checked, uncheck "All" and uncheck other options
                if (d3.select(clicked).property("checked")) {
                    allCheckbox.property("checked", false);
                    checkboxes.property("checked", false);
                    d3.select(clicked).property("checked", true);
                    vis.filterState[filterType] = clicked.value;
                }
            }
        } else {
            // Multi-select for other filters
            if (clicked.id === `${filterType}-all`) {
                // If "All" is checked, uncheck all others
                if (d3.select(clicked).property("checked")) {
                    checkboxes.property("checked", false);
                    vis.filterState[filterType] = 'all';
                }
            } else {
                // If any other checkbox is checked, uncheck "All"
                if (d3.select(clicked).property("checked")) {
                    allCheckbox.property("checked", false);
                }
                
                // Get selected values
                let selected = checkboxes.nodes()
                    .filter(cb => cb.checked)
                    .map(cb => cb.value);
                
                // If nothing selected, select "All"
                if (selected.length === 0) {
                    allCheckbox.property("checked", true);
                    vis.filterState[filterType] = 'all';
                } else {
                    vis.filterState[filterType] = selected;
                }
            }
        }
        
        updateFilterButtonText(filterType, vis.filterState[filterType] === 'all' ? 0 : (Array.isArray(vis.filterState[filterType]) ? vis.filterState[filterType].length : 1), vis);
        vis.processData();
        vis.updateVis();
    });

    // Setup button toggle
    d3.select(`#${filterType}-filter-btn`)
        .on("click", function(event) {
            event.stopPropagation();
            let isVisible = container.style("display") === "flex";
            container.style("display", isVisible ? "none" : "flex");
            // Close other filters
            const allFilterTypes = ['pedAct', 'drivAct', 'pedAge', 'drivAge', 'district', 'severity'];
            allFilterTypes.forEach(type => {
                if (type !== filterType) {
                    const otherContainer = d3.select(`#${type}-checkboxes`);
                    if (!otherContainer.empty()) {
                        otherContainer.style("display", "none");
                    }
                }
            });
        });

    // Close dropdowns when clicking outside
    d3.select("body").on("click", function(event) {
        if (!event.target.closest('.filter-dropdown-group')) {
            const allFilterTypes = ['pedAct', 'drivAct', 'pedAge', 'drivAge', 'district', 'severity'];
            allFilterTypes.forEach(type => {
                const container = d3.select(`#${type}-checkboxes`);
                if (!container.empty()) {
                    container.style("display", "none");
                }
            });
        }
    });
}

/*
* Simple function to update filter button text
*/
function updateFilterButtonText(filterType, count, vis) {
    let button = d3.select(`#${filterType}-filter-btn`);

    if (button.empty()) return;

    let baseText;
    
    // Determine filter label
    if (filterType === 'pedAct') {
        baseText = 'Pedestrian Action';
    } else if (filterType === 'drivAct') {
        baseText = 'Driver Action';
    } else if (filterType === 'district') {
        baseText = 'District';
    } else if (filterType === 'pedAge') {
        baseText = 'Pedestrian Age';
    } else if (filterType === 'drivAge') {
        baseText = 'Driver Age'; // Uses pedAge data but labeled as Driver Age
    } else if (filterType === 'severity') {
        baseText = 'Severity';
    } else {
        baseText = filterType;
    }

    // Check if all values are selected
    let isAll = vis.filterState[filterType] === 'all';
    
    // Update label text
    if (filterType === 'severity') {
        // For severity, show the selected value
        const severityText = isAll ? baseText : (vis.filterState[filterType] === 'fatal' ? 'Fatal' : vis.filterState[filterType] === 'nonfatal' ? 'Non-fatal' : baseText);
        button.select("span")
            .text(severityText);
    } else {
        button.select("span")
            .text(isAll ? baseText : (count > 0 ? `${baseText} (${count})` : baseText));
    }
}
