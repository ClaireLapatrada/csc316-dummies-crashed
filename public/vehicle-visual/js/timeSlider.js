class TimeSliderWithHours {
    constructor(containerSelector, timeBuckets, callbacks) {
        this.containerSelector = containerSelector;
        this.timeBuckets = timeBuckets;
        this.callbacks = callbacks;
        this.currentTimeIndex = callbacks.currentTimeIndex || 0;
        this.isDragging = false;
        this.startAngle = 0;
        this.currentAngle = 0;
        this.animationInProgress = false;

        // Define the 4 equally divided time periods (6 hours each) - COUNTERCLOCKWISE
        this.timePeriods = [
            { name: "Morning", start: 6, end: 12, color: "rgba(255, 223, 0, 0.9)" },    // 6 AM - 12 PM (UPPER RIGHT) - Bright yellow
            { name: "Afternoon", start: 12, end: 18, color: "rgba(255, 140, 0, 0.9)" }, // 12 PM - 6 PM (LOWER RIGHT) - Orange
            { name: "Evening", start: 18, end: 24, color: "rgba(75, 0, 130, 0.9)" },    // 6 PM - 12 AM (LOWER LEFT) - Purple
            { name: "Night", start: 0, end: 6, color: "rgba(25, 25, 112, 0.9)" }        // 12 AM - 6 AM (UPPER LEFT) - Dark blue
        ];

        // Track active period
        this.activePeriod = null;

        // Calculate period positions
        this.periodPositions = this.calculatePeriodPositions();
    }

    calculatePeriodPositions() {
        const positions = [];
        const radius = 120;
        const centerX = 150;
        const centerY = 150;

        this.timePeriods.forEach(period => {
            // Calculate middle angle of the period (each period is 6 hours = 90 degrees)
            // For counterclockwise: 0° at top, 90° at left, 180° at bottom, 270° at right
            const totalHours = period.end > period.start ? period.end - period.start : (24 - period.start) + period.end;
            const middleHour = (period.start + totalHours / 2) % 24;

            // Convert hour to angle (counterclockwise, 0° at top)
            // Morning (9 AM) = 315°, Afternoon (3 PM) = 45°, Evening (9 PM) = 135°, Night (3 AM) = 225°
            let angle;
            if (period.name === "Morning") {
                angle = 315 * (Math.PI / 180); // Upper right (315°)
            } else if (period.name === "Afternoon") {
                angle = 45 * (Math.PI / 180);  // Lower right (45°)
            } else if (period.name === "Evening") {
                angle = 135 * (Math.PI / 180); // Lower left (135°)
            } else { // Night
                angle = 225 * (Math.PI / 180); // Upper left (225°)
            }

            const x = centerX + radius * Math.sin(angle); // Use sin for X (counterclockwise from top)
            const y = centerY - radius * Math.cos(angle); // Use -cos for Y (counterclockwise from top)

            // Calculate start and end angles for the arc (counterclockwise from top)
            let startAngle, endAngle;
            if (period.name === "Morning") {
                startAngle = 270 * (Math.PI / 180); // 270° (right)
                endAngle = 360 * (Math.PI / 180);   // 360° (top) - FIXED: should be 360°, not 0°
            } else if (period.name === "Afternoon") {
                startAngle = 0 * (Math.PI / 180);   // 0° (top)
                endAngle = 90 * (Math.PI / 180);    // 90° (left)
            } else if (period.name === "Evening") {
                startAngle = 90 * (Math.PI / 180);  // 90° (left)
                endAngle = 180 * (Math.PI / 180);   // 180° (bottom)
            } else { // Night
                startAngle = 180 * (Math.PI / 180); // 180° (bottom)
                endAngle = 270 * (Math.PI / 180);   // 270° (right)
            }

            positions.push({
                period: period.name,
                x, y, angle,
                startAngle: startAngle,
                endAngle: endAngle,
                color: period.color
            });
        });

        return positions;
    }

    init() {
        const self = this;

        // clear container first
        d3.select(this.containerSelector).html("");

        // create main container
        const container = d3.select(this.containerSelector)
            .style("position", "relative")
            .style("width", "300px")
            .style("height", "300px")
            .style("cursor", "pointer")
            .style("user-select", "none");

        // create SVG
        const svg = container.append("svg")
            .attr("width", 300)
            .attr("height", 300)
            .attr("viewBox", "0 0 300 300");

        // Create time period arcs
        this.createTimePeriodArcs(svg);

        // create background circle with gradient
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "circleGradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(255,255,255,0.1)");

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(255,255,255,0.05)");

        // Main circle (clickable area)
        const clockCircle = svg.append("circle")
            .attr("cx", 150)
            .attr("cy", 150)
            .attr("r", 140)
            .attr("fill", "url(#circleGradient)")
            .attr("stroke", "rgba(0,0,0,0.2)")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("click", function(event) {
                if (self.animationInProgress) return;

                const rect = this.getBoundingClientRect();
                const x = event.clientX - rect.left - 150;
                const y = event.clientY - rect.top - 150;
                const angle = Math.atan2(y, x);

                self.handleClickOnAngle(angle);
            });

        // Create period labels
        this.createPeriodLabels(svg);

        // Create clickable period arcs (invisible overlay for better clicking)
        this.createClickablePeriodArcs(svg);

        // Center dot
        svg.append("circle")
            .attr("cx", 150)
            .attr("cy", 150)
            .attr("r", 4)
            .attr("fill", "#ffffff");

        // Set initial active period based on current time
        this.setInitialActivePeriod();

        console.log('TimeSlider with clickable time periods initialized');
        console.log('Available time buckets:', this.timeBuckets);
    }

    createTimePeriodArcs(svg) {
        const centerX = 150;
        const centerY = 150;
        const innerRadius = 100;
        const outerRadius = 140;

        // Store arc references for later updates
        this.periodArcs = [];

        this.timePeriods.forEach((period, index) => {
            // Calculate angles for specific quadrants (counterclockwise from top)
            let startAngle, endAngle;
            if (period.name === "Morning") {
                startAngle = 270 * (Math.PI / 180); // 270° (right)
                endAngle = 360 * (Math.PI / 180);   // 360° (top) - FIXED
            } else if (period.name === "Afternoon") {
                startAngle = 0 * (Math.PI / 180);   // 0° (top)
                endAngle = 90 * (Math.PI / 180);    // 90° (left)
            } else if (period.name === "Evening") {
                startAngle = 90 * (Math.PI / 180);  // 90° (left)
                endAngle = 180 * (Math.PI / 180);   // 180° (bottom)
            } else { // Night
                startAngle = 180 * (Math.PI / 180); // 180° (bottom)
                endAngle = 270 * (Math.PI / 180);   // 270° (right)
            }

            // Create arc path
            const arcGenerator = d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .startAngle(startAngle)
                .endAngle(endAngle);

            const arc = svg.append("path")
                .attr("d", arcGenerator)
                .attr("transform", `translate(${centerX}, ${centerY})`)
                .attr("fill", period.color)
                .attr("stroke", "rgba(0,0,0,0.8)")
                .attr("stroke-width", 2)
                .attr("class", `period-arc period-${period.name.toLowerCase()}`)
                .style("opacity", 0.9); // Increased opacity

            this.periodArcs.push({
                element: arc,
                period: period
            });
        });
    }

    createClickablePeriodArcs(svg) {
        const centerX = 150;
        const centerY = 150;
        const innerRadius = 100;
        const outerRadius = 140;
        const self = this;

        this.timePeriods.forEach(period => {
            // Calculate angles for specific quadrants (counterclockwise from top)
            let startAngle, endAngle;
            if (period.name === "Morning") {
                startAngle = 270 * (Math.PI / 180); // 270° (right)
                endAngle = 360 * (Math.PI / 180);   // 360° (top) - FIXED
            } else if (period.name === "Afternoon") {
                startAngle = 0 * (Math.PI / 180);   // 0° (top)
                endAngle = 90 * (Math.PI / 180);    // 90° (left)
            } else if (period.name === "Evening") {
                startAngle = 90 * (Math.PI / 180);  // 90° (left)
                endAngle = 180 * (Math.PI / 180);   // 180° (bottom)
            } else { // Night
                startAngle = 180 * (Math.PI / 180); // 180° (bottom)
                endAngle = 270 * (Math.PI / 180);   // 270° (right)
            }

            // Create invisible clickable arc
            const arcGenerator = d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .startAngle(startAngle)
                .endAngle(endAngle);

            svg.append("path")
                .attr("d", arcGenerator)
                .attr("transform", `translate(${centerX}, ${centerY})`)
                .attr("fill", "transparent")
                .attr("stroke", "none")
                .style("cursor", "pointer")
                .on("click", function(event) {
                    event.stopPropagation();
                    if (self.animationInProgress) return;
                    console.log(`Clicked on ${period.name} period`);
                    self.selectPeriod(period);
                })
                .on("mouseover", function() {
                    d3.select(this).style("cursor", "pointer");
                });
        });
    }

    createPeriodLabels(svg) {
        const centerX = 150;
        const centerY = 150;
        const self = this;

        // Store label references for later updates
        this.periodLabels = [];

        this.periodPositions.forEach(position => {
            const label = svg.append("text")
                .attr("x", position.x)
                .attr("y", position.y)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#000")
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .style("cursor", "pointer")
                .style("pointer-events", "all")
                .on("click", function(event) {
                    event.stopPropagation();
                    if (self.animationInProgress) return;

                    const period = self.timePeriods.find(p => p.name === position.period);
                    if (period) {
                        console.log(`Clicked on ${period.name} label`);
                        self.selectPeriod(period);
                    }
                })
                .on("mouseover", function() {
                    d3.select(this).style("cursor", "pointer");
                })
                .text(position.period);

            this.periodLabels.push({
                element: label,
                period: position.period
            });
        });
    }

    // ... rest of the methods remain the same as your previous code
    handleClickOnAngle(angle) {
        if (this.animationInProgress) return;

        // For counterclockwise from top: adjust angle calculation
        let normalizedAngle = angle + (Math.PI / 2); // Rotate 90° counterclockwise
        if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

        // Convert angle to degrees (counterclockwise from top)
        let degrees = (normalizedAngle * 180 / Math.PI);

        // Determine which quadrant was clicked
        let targetPeriod;
        if (degrees >= 315 || degrees < 45) {
            // Upper right quadrant (Morning)
            targetPeriod = this.timePeriods.find(p => p.name === "Morning");
        } else if (degrees >= 45 && degrees < 135) {
            // Lower right quadrant (Afternoon)
            targetPeriod = this.timePeriods.find(p => p.name === "Afternoon");
        } else if (degrees >= 135 && degrees < 225) {
            // Lower left quadrant (Evening)
            targetPeriod = this.timePeriods.find(p => p.name === "Evening");
        } else {
            // Upper left quadrant (Night)
            targetPeriod = this.timePeriods.find(p => p.name === "Night");
        }

        console.log(`Clicked at ${degrees.toFixed(2)}°, selecting ${targetPeriod.name}`);
        this.selectPeriod(targetPeriod);
    }

    getBucketsForPeriod(period) {
        const buckets = this.timeBuckets.filter(bucket => {
            const bucketHour = this.getHourFromTimeBucket(bucket);
            if (period.start < period.end) {
                return bucketHour >= period.start && bucketHour < period.end;
            } else {
                // Overnight period
                return bucketHour >= period.start || bucketHour < period.end;
            }
        });

        console.log(`Buckets for ${period.name}:`, buckets);
        return buckets;
    }

    selectPeriod(period) {
        console.log(`=== SELECTING PERIOD: ${period.name} ===`);

        if (this.animationInProgress) {
            console.log('Animation in progress, skipping');
            return;
        }

        this.animationInProgress = true;

        // Update active period
        this.activePeriod = period.name;
        console.log(`Active period set to: ${this.activePeriod}`);

        // Update visualization - make the selected period bright
        this.updatePeriodHighlights();

        // Find all time buckets within this period
        const periodBuckets = this.getBucketsForPeriod(period);
        console.log(`Found ${periodBuckets.length} buckets for ${period.name}`);

        if (periodBuckets.length > 0) {
            // For now, just select the FIRST available bucket in this period
            const selectedBucket = periodBuckets[0];
            const newTimeIndex = this.timeBuckets.indexOf(selectedBucket);

            console.log(`Selected bucket: ${selectedBucket}, New time index: ${newTimeIndex}`);

            if (newTimeIndex !== -1 && newTimeIndex !== this.currentTimeIndex) {
                this.currentTimeIndex = newTimeIndex;

                // Update visualization
                if (this.callbacks && this.callbacks.handleTimeChange) {
                    try {
                        console.log('Calling handleTimeChange with index:', newTimeIndex);
                        this.callbacks.handleTimeChange(this.currentTimeIndex);
                    } catch (e) {
                        console.error('Error updating time:', e);
                    }
                }

                this.updateBackgroundGradient();

                console.log(`Successfully selected ${period.name}: ${selectedBucket}`);
            } else {
                console.log(`Already selected this time or couldn't find index`);
            }
        } else {
            console.warn(`No time buckets found for period: ${period.name}`);
        }

        this.animationInProgress = false;
        console.log('=== SELECTION COMPLETED ===');
    }

    updatePeriodHighlights() {
        console.log('Updating period highlights for:', this.activePeriod);

        // Update arcs
        this.periodArcs.forEach(arc => {
            if (arc.period.name === this.activePeriod) {
                arc.element
                    .transition()
                    .duration(300)
                    .style("opacity", 1)
                    .attr("stroke", "rgba(255,255,255,0.8)")
                    .attr("stroke-width", 3);
            } else {
                arc.element
                    .transition()
                    .duration(300)
                    .style("opacity", 0.9) // Keep non-active periods more visible
                    .attr("stroke", "rgba(0,0,0,0.5)")
                    .attr("stroke-width", 2);
            }
        });

        // Update labels
        this.periodLabels.forEach(label => {
            if (label.period === this.activePeriod) {
                label.element
                    .transition()
                    .duration(300)
                    .style("font-size", "16px")
                    .style("fill", "#fff")
                    .style("text-shadow", "0 0 5px rgba(0,0,0,0.8)");
            } else {
                label.element
                    .transition()
                    .duration(300)
                    .style("font-size", "14px")
                    .style("fill", "#000")
                    .style("text-shadow", "none");
            }
        });
    }

    setInitialActivePeriod() {
        // Set initial active period based on current time index
        const currentHour = this.getHourFromTimeBucket(this.timeBuckets[this.currentTimeIndex]);
        console.log('Initial current hour:', currentHour);

        for (const period of this.timePeriods) {
            if (period.start < period.end) {
                if (currentHour >= period.start && currentHour < period.end) {
                    this.activePeriod = period.name;
                    break;
                }
            } else {
                if (currentHour >= period.start || currentHour < period.end) {
                    this.activePeriod = period.name;
                    break;
                }
            }
        }

        console.log('Initial active period:', this.activePeriod);

        // Update highlights
        this.updatePeriodHighlights();
    }

    getHourFromTimeBucket(timeBucket) {
        if (!timeBucket) return 0;
        const [timePart, period] = timeBucket.split(' ');
        let [hours] = timePart.split(':').map(Number);

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return hours;
    }

    updateBackgroundGradient() {
        if (!window.Background) {
            console.warn('Background module not found');
            return;
        }

        const currentTime = new Date();
        const [timePart, period] = this.timeBuckets[this.currentTimeIndex].split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        currentTime.setHours(hours, minutes || 0, 0, 0);

        const newColors = window.Background.getGradientByHour(currentTime);
        window.Background.updateGradient(newColors);
    }

    // Method to manually set time (for debugging)
    setTimeIndex(index) {
        if (index >= 0 && index < this.timeBuckets.length) {
            this.currentTimeIndex = index;
            this.setInitialActivePeriod();
            if (this.callbacks && this.callbacks.handleTimeChange) {
                this.callbacks.handleTimeChange(this.currentTimeIndex);
            }
            this.updateBackgroundGradient();
        }
    }
}