class YearScroll {
    constructor(containerSelector, {
        startYear = 2006,
        endYear = 2023,
        onYearChange = null,
        width = 800
    } = {}) {
        this.containerSelector = containerSelector;
        this.startYear = startYear;
        this.endYear = endYear;
        this.onYearChange = onYearChange;
        this.years = d3.range(startYear, endYear + 1);
        this.currentYear = startYear;
        this.width = width;
        this.height = 140;
        this.margin = { left: 60, right: 60, top: 30, bottom: 30 };
    }

    init() {
        console.log('Initializing Car-Style YearScroll for:', this.containerSelector);

        const self = this;
        const trackY = this.height / 2;

        // Clear container first
        d3.select(this.containerSelector).html("");

        this.svg = d3.select(this.containerSelector)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "year-scroller-car")
            .style("display", "block")
            .style("margin", "0 auto");

        this.xScale = d3.scaleLinear()
            .domain([this.startYear, this.endYear])
            .range([this.margin.left, this.width - this.margin.right]);

        // Create track background (road-like)
        this.svg.append("rect")
            .attr("x", this.margin.left - 25)
            .attr("y", trackY - 25)
            .attr("width", this.width - this.margin.left - this.margin.right + 50)
            .attr("height", 50)
            .attr("rx", 12)
            .attr("fill", "#2f2f2f")
            .attr("stroke", "#555")
            .attr("stroke-width", 2);

        // Road center line (dashed)
        this.svg.append("line")
            .attr("x1", this.margin.left - 5)
            .attr("x2", this.width - this.margin.right + 5)
            .attr("y1", trackY)
            .attr("y2", trackY)
            .attr("stroke", "#dcdcdc")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "10,10")
            .attr("stroke-linecap", "round");

        // Year labels above the track
        this.yearLabels = this.svg.selectAll(".year-label")
            .data(this.years)
            .enter()
            .append("text")
            .attr("class", "year-label")
            .attr("x", d => this.xScale(d))
            .attr("y", trackY - 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", d => d === this.currentYear ? "#ffeb3b" : "#ccc")
            .attr("font-weight", d => d === this.currentYear ? "bold" : "normal")
            .style("pointer-events", "none")
            .text(d => d);

        // Create car slider
        const carWidth = 36;
        const carHeight = 20;

        // Car body
        this.car = this.svg.append("g")
            .attr("class", "car-slider")
            .attr("transform", `translate(${this.xScale(this.currentYear) - carWidth/2}, ${trackY - carHeight/2})`)
            .style("cursor", "grab");

        // Car body (main rectangle)
        this.car.append("rect")
            .attr("width", carWidth)
            .attr("height", carHeight)
            .attr("rx", 4)
            .attr("fill", "#ff4757")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        // Car windows
        this.car.append("rect")
            .attr("x", 4)
            .attr("y", 4)
            .attr("width", 12)
            .attr("height", 8)
            .attr("rx", 2)
            .attr("fill", "#87CEEB");

        this.car.append("rect")
            .attr("x", 20)
            .attr("y", 4)
            .attr("width", 12)
            .attr("height", 8)
            .attr("rx", 2)
            .attr("fill", "#87CEEB");

        // Car wheels
        this.car.append("circle")
            .attr("cx", 8)
            .attr("cy", carHeight)
            .attr("r", 4)
            .attr("fill", "#333")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        this.car.append("circle")
            .attr("cx", carWidth - 8)
            .attr("cy", carHeight)
            .attr("r", 4)
            .attr("fill", "#333")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        // Headlights
        this.car.append("circle")
            .attr("cx", 2)
            .attr("cy", 8)
            .attr("r", 2)
            .attr("fill", "#ffeb3b");

        this.car.append("circle")
            .attr("cx", carWidth - 2)
            .attr("cy", 8)
            .attr("r", 2)
            .attr("fill", "#ffeb3b");

        // REMOVED: Year display below car

        // Add instruction text
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height - 10)
            .attr("text-anchor", "middle")
            .attr("fill", "rgba(255,255,255,0.7)")
            .attr("font-size", "12px")
            .text("Drag the car to select year");

        // Drag behavior
        const dragBehavior = d3.drag()
            .on("start", function() {
                d3.select(this).style("cursor", "grabbing");
                // Add some visual feedback
                self.car.selectAll("rect")
                    .transition()
                    .duration(100)
                    .attr("fill", "#ff6b81");
            })
            .on("drag", function(event) {
                self._onDrag(event);
            })
            .on("end", function() {
                d3.select(this).style("cursor", "grab");
                // Reset car color
                self.car.selectAll("rect")
                    .transition()
                    .duration(100)
                    .attr("fill", "#ff4757");
                self._onDragEnd();
            });

        this.car.call(dragBehavior);

        console.log('Car-style YearScroll initialized successfully');
    }

    _updateYearLabels() {
        this.yearLabels
            .attr("fill", d => d === this.currentYear ? "#ffeb3b" : "#ccc")
            .attr("font-weight", d => d === this.currentYear ? "bold" : "normal");

        // REMOVED: Year display on car update

        // Update year display in HTML (this remains for the separate display)
        document.getElementById('currentYearDisplay').textContent = this.currentYear;
    }


    _onDrag(event) {
        let x = Math.max(this.margin.left, Math.min(this.width - this.margin.right, event.x));
        this.car.attr("transform", `translate(${x - 18}, ${this.height/2 - 10})`);

        const newYear = Math.round(this.xScale.invert(x));
        if (newYear !== this.currentYear) {
            this.currentYear = newYear;
            this._updateYearLabels();
        }
    }

    _onDragEnd() {
        const snappedX = this.xScale(this.currentYear);
        this.car.transition()
            .duration(200)
            .ease(d3.easeBackOut)
            .attr("transform", `translate(${snappedX - 18}, ${this.height/2 - 10})`);
        this._updateYearLabels();
        if (this.onYearChange) {
            console.log('Year changed to:', this.currentYear);
            this.onYearChange(this.currentYear);
        }
    }

    // Public method to set year programmatically
    setYear(year) {
        if (year >= this.startYear && year <= this.endYear) {
            this.currentYear = year;
            const snappedX = this.xScale(this.currentYear);
            this.car.attr("transform", `translate(${snappedX - 18}, ${this.height/2 - 10})`);
            this._updateYearLabels();
            if (this.onYearChange) this.onYearChange(this.currentYear);
        }
    }

    // Public method to get current year
    getCurrentYear() {
        return this.currentYear;
    }
}