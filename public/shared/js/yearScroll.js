/**
 * YearScroll Class
 * 
 * A custom slider component built with D3.js that allows users to select a year
 * by dragging a pedestrian icon along a track.
 */
class YearScroll {
    /**
     * Creates an instance of YearScroll.
     * 
     * @param {string} containerSelector - The CSS selector for the container element where the slider will be rendered.
     * @param {Object} options - Configuration options for the slider.
     * @param {number} [options.startYear=2006] - The starting year of the range.
     * @param {number} [options.endYear=2023] - The ending year of the range.
     * @param {Function} [options.onYearChange=null] - Callback function to be executed when the selected year changes.
     * @param {number} [options.width=800] - The default width of the slider in pixels.
     * @param {Object} [options.margin] - Margins for the SVG content.
     */
    constructor(containerSelector, {
        startYear = 2006,
        endYear = 2023,
        onYearChange = null,
        width = 800,
        margin = { left: 60, right: 60, top: 40, bottom: 40 }
    } = {}) {
        this.containerSelector = containerSelector;
        this.startYear = startYear;
        this.endYear = endYear;
        this.onYearChange = onYearChange;
        
        // Generate array of years for the range
        this.years = d3.range(startYear, endYear + 1);
        this.currentYear = startYear;
        
        this.width = width;
        this.height = 100;
        
        // Merge provided margins with defaults
        this.margin = { left: 60, right: 60, top: 40, bottom: 40 };
        this.margin = { ...this.margin, ...margin };
        
        this.isPlaying = false; // State to track if the slider is being animated externally
    }

    /**
     * Initializes the DOM elements and D3 visualizations.
     * Sets up the SVG, track, pedestrian icon, and event listeners.
     */
    init() {
        console.log('Initializing Pedestrian-Style YearScroll for:', this.containerSelector);

        const self = this;
        const trackY = 30; // Vertical position of the track
        const trackHeight = 12;

        // Clear any existing content in the container
        d3.select(this.containerSelector).html("");

        // Attempt to get container width for responsive sizing
        const container = d3.select(this.containerSelector).node();
        if (container && container.offsetWidth) {
            this.width = container.offsetWidth;
        }

        // Create the main SVG element
        this.svg = d3.select(this.containerSelector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", this.height)
            .attr("class", "year-scroller-ped")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "none")
            .style("display", "block");

        // Update width after SVG is created to get actual rendered width
        const svgNode = this.svg.node();
        if (svgNode) {
            const actualWidth = svgNode.getBoundingClientRect().width;
            if (actualWidth > 0) {
                this.width = actualWidth;
                this.svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);
            }
        }

        // Create a linear scale mapping years to x-coordinates
        this.xScale = d3.scaleLinear()
            .domain([this.startYear, this.endYear])
            .range([this.margin.left + 20, this.width - this.margin.right - 20]); // Adjust range to bring labels in

        const trackWidth = this.xScale.range()[1] - this.xScale.range()[0] + 25;

        // Draw the white horizontal track bar with rounded ends
        this.track = this.svg.append("rect")
            .attr("x", this.xScale.range()[0] - 12) // Align start with first year label
            .attr("y", trackY - trackHeight/2 + 17)
            .attr("width", trackWidth) // Width matches distance between first and last year label
            .attr("height", trackHeight)
            .attr("fill", "#FFFFFF")
            .style("cursor", "pointer")
            .style("pointer-events", "all");

        // Draw dark green segments to create a "road line" dashed appearance
        const segmentWidth = 4;
        const segmentGap = 4;
        // Calculate number of segments to fit with at least 4px gap at the end
        // Formula derived from: (n * width) + ((n-1) * gap) <= trackWidth - 4
        const numSegments = Math.floor((trackWidth - 4 + segmentGap) / (segmentWidth + segmentGap));

        for (let i = 0; i < numSegments; i++) {
            this.svg.append("rect")
                .attr("x", this.xScale.range()[0] + i * (segmentWidth + segmentGap) - 10) // Align start with track
                .attr("y", trackY - trackHeight/2 + 19)
                .attr("width", segmentWidth)
                .attr("height", trackHeight - 4)
                .attr("fill", "#0A6B4A")
                .style("pointer-events", "none"); // Don't block track interactions
        }

        // Add the pedestrian icon at the starting position
        // Note: The path is relative to the visual's index.html location
        this.pedIcon = this.svg.append("image")
            .attr("xlink:href", "../../imgs/ped.png")
            .attr("x", this.margin.left - 25)
            .attr("y", trackY - 20)
            .attr("width", 40)
            .attr("height", 40)
            .style("cursor", "grab");

        // Add year labels below the track
        this.yearLabels = this.svg.selectAll(".year-label")
            .data(this.years)
            .enter()
            .append("text")
            .attr("class", "year-label")
            .attr("x", d => this.xScale(d))
            .attr("y", trackY + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .style("pointer-events", "none")
            .text(d => d);

        // Define drag behavior for the pedestrian icon
        const dragBehavior = d3.drag()
            .on("start", function() {
                d3.select(this).style("cursor", "grabbing");
            })
            .on("drag", function(event) { self._onDrag(event); })
            .on("end", function() {
                d3.select(this).style("cursor", "grab");
                self._onDragEnd();
            });

        // Apply drag behavior to the icon
        this.pedIcon.call(dragBehavior);
        
        // Create an invisible larger hit area around the track for easier interaction
        this.trackHitArea = this.svg.append("rect")
            .attr("x", this.margin.left - 10)
            .attr("y", trackY - trackHeight/2 - 15)
            .attr("width", trackWidth + 20)
            .attr("height", trackHeight + 30)
            .attr("fill", "transparent")
            .style("cursor", "pointer")
            .style("pointer-events", "all");
        
        // Define drag behavior for the track itself (clicking/dragging anywhere on track moves icon)
        const trackDragBehavior = d3.drag()
            .on("start", function() {
                self.track.style("cursor", "grabbing");
                self.trackHitArea.style("cursor", "grabbing");
            })
            .on("drag", function(event) { 
                self._onTrackDrag(event); 
            })
            .on("end", function() {
                self.track.style("cursor", "pointer");
                self.trackHitArea.style("cursor", "pointer");
                self._onDragEnd();
            });
        
        // Apply track drag behavior
        this.track.call(trackDragBehavior);
        this.trackHitArea.call(trackDragBehavior);
        
        // Add click listeners to jump to position immediately
        this.track.on("click", function(event) {
            self._onTrackClick(event);
        });
        
        this.trackHitArea.on("click", function(event) {
            self._onTrackClick(event);
        });

        // Initialize position
        this._updatePedPosition();

        console.log('Pedestrian-style YearScroll initialized successfully');
    }

    /**
     * Updates the styling of year labels.
     * Also updates the external year display if it exists.
     */
    _updateYearLabels() {
        this.yearLabels
            .attr("fill", "#FFFFFF")
            .attr("font-weight", "normal");

        if (document.getElementById('currentYearDisplay')) {
            document.getElementById('currentYearDisplay').textContent = this.currentYear;
        }
    }

    /**
     * Updates the position of the pedestrian icon based on the current year.
     * @param {boolean} animate - Whether to animate the transition.
     * @param {number} duration - Duration of the animation in ms.
     */
    _updatePedPosition(animate = false, duration = 400) {
        if (!this.pedIcon) return;

        const x = this.xScale(this.currentYear);
        this.pedIcon.interrupt(); // Stop any active transitions

        if (animate) {
            this.pedIcon.transition()
                .duration(duration)
                .ease(d3.easeCubicInOut)
                .attr("x", x - 20); // -20 to center the 40px wide icon
        } else {
            this.pedIcon.attr("x", x - 20);
        }
    }

    /**
     * Handler for dragging the pedestrian icon.
     * Calculates the new year based on mouse position and updates the state.
     * @param {Object} event - The D3 drag event.
     */
    _onDrag(event) {
        // Get the SVG element and its bounding box
        const svgNode = this.svg.node();
        const svgRect = svgNode.getBoundingClientRect();
        const svgPoint = svgNode.createSVGPoint();
        
        // Convert screen coordinates to SVG coordinates
        svgPoint.x = event.x;
        svgPoint.y = event.y;
        const svgCoordinates = svgPoint.matrixTransform(svgNode.getScreenCTM().inverse());
        
        // Constrain x within range
        const range = this.xScale.range();
        let x = Math.max(range[0], Math.min(range[1], svgCoordinates.x));
        this.pedIcon.attr("x", x - 20);

        // Convert position back to year
        const newYear = Math.round(this.xScale.invert(x));
        if (newYear !== this.currentYear && newYear >= this.startYear && newYear <= this.endYear) {
            this.currentYear = newYear;
            this._updateYearLabels();
            if (this.onYearChange) this.onYearChange(this.currentYear);
        }
    }

    /**
     * Handler for dragging on the track area.
     * Delegates to the same logic as _onDrag but stops event propagation.
     * @param {Object} event - The D3 drag event.
     */
    _onTrackDrag(event) {
        event.sourceEvent.stopPropagation(); // Prevent event bubbling
        
        const svgNode = this.svg.node();
        const svgPoint = svgNode.createSVGPoint();
        
        svgPoint.x = event.x;
        svgPoint.y = event.y;
        const svgCoordinates = svgPoint.matrixTransform(svgNode.getScreenCTM().inverse());
        
        // Constrain x within range
        const range = this.xScale.range();
        let x = Math.max(range[0], Math.min(range[1], svgCoordinates.x));
        this.pedIcon.attr("x", x - 20);

        const newYear = Math.round(this.xScale.invert(x));
        if (newYear !== this.currentYear && newYear >= this.startYear && newYear <= this.endYear) {
            this.currentYear = newYear;
            this._updateYearLabels();
            if (this.onYearChange) this.onYearChange(this.currentYear);
        }
    }
    
    /**
     * Handler for clicking on the track.
     * Jumps the slider directly to the clicked position/year.
     * @param {Object} event - The D3 click event.
     */
    _onTrackClick(event) {
        event.stopPropagation(); // Prevent event bubbling
        
        const svgNode = this.svg.node();
        const svgPoint = svgNode.createSVGPoint();
        
        svgPoint.x = event.x;
        svgPoint.y = event.y;
        const svgCoordinates = svgPoint.matrixTransform(svgNode.getScreenCTM().inverse());
        
        // Constrain x within range
        const range = this.xScale.range();
        let x = Math.max(range[0], Math.min(range[1], svgCoordinates.x));
        const newYear = Math.round(this.xScale.invert(x));
        
        if (newYear >= this.startYear && newYear <= this.endYear) {
            this.setYear(newYear);
        }
    }

    /**
     * Called when a drag operation ends.
     * Snaps the icon to the exact position of the selected year.
     */
    _onDragEnd() {
        const snappedX = this.xScale(this.currentYear);
        this.pedIcon.transition()
            .duration(200)
            .ease(d3.easeBackOut)
            .attr("x", snappedX - 20);
        this._updateYearLabels();
        if (this.onYearChange) this.onYearChange(this.currentYear);
    }

    /**
     * Programmatically sets the current year.
     * @param {number} year - The year to set.
     * @param {Object} options - Animation options.
     */
    setYear(year, { animate = false, duration = 400 } = {}) {
        if (year >= this.startYear && year <= this.endYear) {
            this.currentYear = year;
            this._updatePedPosition(animate, duration);
            this._updateYearLabels();
            if (this.onYearChange) this.onYearChange(this.currentYear);
        }
    }

    /**
     * Returns the currently selected year.
     * @returns {number}
     */
    getCurrentYear() {
        return this.currentYear;
    }

    /**
     * Checks if the slider is currently in playing state.
     * @returns {boolean}
     */
    isPlaying() {
        return this.isPlaying;
    }

    /**
     * Sets the playing state.
     * @param {boolean} playing 
     */
    setPlaying(playing) {
        this.isPlaying = playing;
    }
}


// Export the class to the window object for global access
window.YearScroll = YearScroll;
