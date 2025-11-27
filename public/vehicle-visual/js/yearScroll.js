class YearScroll {
    constructor(containerSelector, {
        startYear = 2006,
        endYear = 2023,
        onYearChange = null,
        width = 100
    } = {}) {
        this.containerSelector = containerSelector;
        this.startYear = startYear;
        this.endYear = endYear;
        this.onYearChange = onYearChange;
        this.years = d3.range(startYear, endYear + 1);
        this.currentYear = startYear;
        this.width = width;
        this.height = 100;
        this.margin = { left: 60, right: 60, top: 40, bottom: 40 };
        this.isPlaying = false;
    }

    init() {
        console.log('Initializing Pedestrian-Style YearScroll for:', this.containerSelector);

        const self = this;
        const trackY = 40;
        const trackHeight = 12;
        const trackWidth = this.width - this.margin.left - this.margin.right;

        d3.select(this.containerSelector).html("");

        // Get container width for full width
        const container = d3.select(this.containerSelector).node();
        if (container && container.offsetWidth) {
            this.width = container.offsetWidth;
        }

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

        this.xScale = d3.scaleLinear()
            .domain([this.startYear, this.endYear])
            .range([this.margin.left, this.width - this.margin.right]);

        // White horizontal bar with rounded ends
        this.svg.append("rect")
            .attr("x", this.margin.left)
            .attr("y", trackY - trackHeight/2)
            .attr("width", trackWidth)
            .attr("height", trackHeight)
            .attr("rx", trackHeight/2)
            .attr("fill", "#FFFFFF");

        // Dark green segments creating dashed appearance
        const segmentWidth = 8;
        const segmentGap = 4;
        const numSegments = Math.floor(trackWidth / (segmentWidth + segmentGap));
        const actualSegmentGap = (trackWidth - (numSegments * segmentWidth)) / (numSegments - 1);

        for (let i = 0; i < numSegments; i++) {
            this.svg.append("rect")
                .attr("x", this.margin.left + i * (segmentWidth + actualSegmentGap))
                .attr("y", trackY - trackHeight/2 + 2)
                .attr("width", segmentWidth)
                .attr("height", trackHeight - 4)
                .attr("fill", "#0A6B4A");
        }

        // Pedestrian icon at the start
        this.pedIcon = this.svg.append("image")
            .attr("xlink:href", "../../imgs/ped.png")
            .attr("x", this.margin.left - 25)
            .attr("y", trackY - 20)
            .attr("width", 40)
            .attr("height", 40)
            .style("cursor", "grab");

        // Year labels below
        this.yearLabels = this.svg.selectAll(".year-label")
            .data(this.years)
            .enter()
            .append("text")
            .attr("class", "year-label")
            .attr("x", d => this.xScale(d))
            .attr("y", trackY + 30)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .style("pointer-events", "none")
            .text(d => d);

        const dragBehavior = d3.drag()
            .on("start", function() {
                d3.select(this).style("cursor", "grabbing");
            })
            .on("drag", function(event) { self._onDrag(event); })
            .on("end", function() {
                d3.select(this).style("cursor", "grab");
                self._onDragEnd();
            });

        this.pedIcon.call(dragBehavior);

        // Update position initially
        this._updatePedPosition();

        console.log('Pedestrian-style YearScroll initialized successfully');
    }

    _updateYearLabels() {
        this.yearLabels
            .attr("fill", "#FFFFFF")
            .attr("font-weight", "normal");

        if (document.getElementById('currentYearDisplay')) {
            document.getElementById('currentYearDisplay').textContent = this.currentYear;
        }
    }

    _updatePedPosition() {
        const x = this.xScale(this.currentYear);
        this.pedIcon.attr("x", x - 20);
    }

    _onDrag(event) {
        // Get the SVG element and its bounding box
        const svgNode = this.svg.node();
        const svgRect = svgNode.getBoundingClientRect();
        const svgPoint = svgNode.createSVGPoint();

        // Convert screen coordinates to SVG coordinates
        svgPoint.x = event.x;
        svgPoint.y = event.y;
        const svgCoordinates = svgPoint.matrixTransform(svgNode.getScreenCTM().inverse());

        let x = Math.max(this.margin.left, Math.min(this.width - this.margin.right, svgCoordinates.x));
        this.pedIcon.attr("x", x - 20);

        const newYear = Math.round(this.xScale.invert(x));
        if (newYear !== this.currentYear && newYear >= this.startYear && newYear <= this.endYear) {
            this.currentYear = newYear;
            this._updateYearLabels();
            if (this.onYearChange) this.onYearChange(this.currentYear);
        }
    }

    _onDragEnd() {
        const snappedX = this.xScale(this.currentYear);
        this.pedIcon.transition()
            .duration(500)
            .ease(d3.easeBackOut)
            .attr("x", snappedX - 20);
        this._updateYearLabels();
        if (this.onYearChange) this.onYearChange(this.currentYear);
    }

    setYear(year) {
        if (year >= this.startYear && year <= this.endYear) {
            this.currentYear = year;
            this._updatePedPosition();
            this._updateYearLabels();
            if (this.onYearChange) this.onYearChange(this.currentYear);
        }
    }

    getCurrentYear() {
        return this.currentYear;
    }

    // Add method to check if playing
    isPlaying() {
        return this.isPlaying;
    }

    // Add method to set playing state
    setPlaying(playing) {
        this.isPlaying = playing;
    }
}


window.YearScroll = YearScroll;