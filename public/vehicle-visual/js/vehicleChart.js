// Vehicle Injury Chart
// Refactored to work standalone without window.App dependencies

// Pastel color scheme for vehicle types
const vehicleColors = {
    "Automobile": "rgba(136,255,0,0.69)",
    "Motorcycle": "#FFB347",
    "Truck": "rgba(215,47,237,0.96)",
    "Transit": "#61ffd5",
    "Bicycle": "#CB99C9",
    "Other": "#FDFD96"
};

class VehicleChart {
    constructor(containerSelector, data, callbacks = {}) {
        this.containerSelector = containerSelector;
        this.data = data;
        this.currentYear = 2006;
        this.currentTimeBucket = null;
        this.onYearChange = callbacks.onYearChange || null;
        this.onTimeChange = callbacks.onTimeChange || null;
        this.isDragging = false; // Track if we're in a drag operation

        this.svg = null;
        this.width = 0;
        this.height = 100;
        this.margin = { top: 50, right: 150, bottom: 40, left: 40 };
        this.yScale = null;
        this.selectedCircle = null;
    }

    setDragging(isDragging) {
        this.isDragging = isDragging;
    }

    init() {
        const container = d3.select(this.containerSelector);
        container.html("");

        // Make chart responsive to container size
        const containerRect = container.node().getBoundingClientRect();
        this.width = containerRect.width || Math.min(800, window.innerWidth - 100);
        this.height = Math.min(400, (window.innerHeight - 300) || 400);

        // Create a centered SVG with proper viewBox
        this.svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("display", "block")
            .style("margin", "0 auto");

        console.log("Vehicle chart initialized with dimensions:", this.width, "x", this.height);
    }

    setYear(year) {
        this.currentYear = year;
        this.update();
    }

    setTimeBucket(timeBucket) {
        this.currentTimeBucket = timeBucket;
        this.update();
    }

    // Get injury breakdown for a specific vehicle type, year, and time bucket
    getInjuryBreakdown(vehicleType, year, timeBucket) {
        const filteredData = this.data.filter(d => {
            const matchesYear = parseInt(d.year) === parseInt(year);
            const matchesTime = d['Time of Collision BUCKET'] === timeBucket;
            const hasInjury = d.Injury && d.Injury.trim() !== '';

            // Vehicle type matching
            let matchesVehicle = false;
            if (vehicleType === 'All') {
                matchesVehicle = true;
            } else {
                const vehicleTypeLower = vehicleType.toLowerCase();
                const dataVehicleType = (d['Vehicle Type'] || '').toLowerCase();

                if (vehicleTypeLower === 'automobile') {
                    matchesVehicle = dataVehicleType.includes('auto') ||
                        dataVehicleType.includes('car') ||
                        dataVehicleType.includes('station') ||
                        dataVehicleType === '' ||
                        dataVehicleType.includes('vehicle');
                } else if (vehicleTypeLower === 'motorcycle') {
                    matchesVehicle = dataVehicleType.includes('motor') ||
                        dataVehicleType.includes('moped') ||
                        dataVehicleType.includes('scooter') ||
                        dataVehicleType.includes('cycle') && !dataVehicleType.includes('bicycle');
                } else if (vehicleTypeLower === 'truck') {
                    matchesVehicle = dataVehicleType.includes('truck') ||
                        dataVehicleType.includes('van') ||
                        dataVehicleType.includes('pickup');
                } else if (vehicleTypeLower === 'transit') {
                    matchesVehicle = dataVehicleType.includes('bus') ||
                        dataVehicleType.includes('transit') ||
                        dataVehicleType.includes('city');
                } else if (vehicleTypeLower === 'bicycle') {
                    matchesVehicle = dataVehicleType.includes('bicycle') ||
                        dataVehicleType.includes('bike') ||
                        dataVehicleType.includes('cycle') && !dataVehicleType.includes('motor');
                } else if (vehicleTypeLower === 'other') {
                    matchesVehicle = !dataVehicleType.includes('auto') &&
                        !dataVehicleType.includes('car') &&
                        !dataVehicleType.includes('motor') &&
                        !dataVehicleType.includes('truck') &&
                        !dataVehicleType.includes('bus') &&
                        !dataVehicleType.includes('bicycle') &&
                        !dataVehicleType.includes('cycle') &&
                        dataVehicleType.trim() !== '';
                }
            }

            return matchesYear && matchesTime && hasInjury && matchesVehicle;
        });

        // Count injuries by type
        const injuryCounts = d3.rollup(
            filteredData,
            v => v.length,
            d => d.Injury
        );

        return {
            total: filteredData.length,
            major: injuryCounts.get('Major') || 0,
            minor: injuryCounts.get('Minor') || 0,
            fatal: injuryCounts.get('Fatal') || 0,
            none: injuryCounts.get('None') || 0,
            unknown: injuryCounts.get('Unknown') || 0,
            sampleRecords: filteredData.slice(0, 5)
        };
    }

    prepareVehicleData() {
        if (!this.currentTimeBucket) return [];

        const vehicleTypes = ['Automobile', 'Motorcycle', 'Truck', 'Transit', 'Bicycle', 'Other'];
        const circleData = [];

        vehicleTypes.forEach(vehicleType => {
            const injuryBreakdown = this.getInjuryBreakdown(vehicleType, this.currentYear, this.currentTimeBucket);

            if (injuryBreakdown.total > 0) {
                circleData.push({
                    year: this.currentYear,
                    vehicleType: vehicleType,
                    totalInjuries: injuryBreakdown.total,
                    color: vehicleColors[vehicleType],
                    radius: Math.max(15, Math.min(45, Math.sqrt(injuryBreakdown.total) * 2.2)),
                    injuryBreakdown: injuryBreakdown,
                    isSelected: false
                });
            }
        });

        return circleData;
    }

    update() {
        if (!this.currentTimeBucket) return;

        // Force immediate update, no throttling
        const circleData = this.prepareVehicleData();

        // Get domains for scales
        const injuryCounts = circleData.map(d => d.totalInjuries);
        const maxInjuries = d3.max(injuryCounts) || Math.max(10, d3.max(injuryCounts));

        // Calculate total accident count for current time and year
        const totalAccidents = this.data.filter(d =>
            d['Time of Collision BUCKET'] === this.currentTimeBucket &&
            parseInt(d.year) === this.currentYear
        ).length;

        // Clear only non-essential elements, keep circles for transitions
        this.svg.selectAll(".accident-count-display, .axis, .grid-line, .legend").remove();

        // Update accident count display
        this.svg.append("text")
            .attr("class", "accident-count-display")
            .attr("x", this.width / 2)
            .attr("y", 40)
            .attr("text-anchor", "middle")
            .style("fill", "#FFFFFF")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .style("font-family", "Overpass, sans-serif")
            .text(`Total Accidents: ${totalAccidents}`);

        // Create Y scale
        this.yScale = d3.scaleLinear()
            .domain([0, maxInjuries * 1.2])
            .range([this.height - this.margin.bottom, this.margin.top])
            .nice();

        // Add Y axis
        const yAxis = d3.axisLeft(this.yScale)
            .ticks(Math.min(10, Math.max(5, maxInjuries)))
            .tickFormat(d3.format("d"));

        const yAxisGroup = this.svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${this.margin.left},0)`)
            .call(yAxis);
        
        yAxisGroup.selectAll("text")
            .style("fill", "#FFFFFF")
            .style("font-family", "Overpass, sans-serif");
        
        yAxisGroup.selectAll(".axis path, .axis line")
            .style("stroke", "#FFFFFF");
        
        yAxisGroup.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -this.height / 2)
            .attr("dy", "1em")
            .attr("fill", "#FFFFFF")
            .attr("text-anchor", "middle")
            .style("font-family", "Overpass, sans-serif")
            .text("Number of Injuries");

        // Add horizontal grid lines
        const gridLines = this.yScale.ticks(Math.min(8, maxInjuries)).filter(tick => tick > 0);
        this.svg.selectAll(".grid-line")
            .data(gridLines)
            .enter()
            .append("line")
            .attr("class", "grid-line")
            .attr("x1", this.margin.left)
            .attr("x2", this.width - this.margin.right)
            .attr("y1", d => this.yScale(d))
            .attr("y2", d => this.yScale(d))
            .attr("stroke", "rgba(0,0,0,0.1)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2,2");

        // Calculate horizontal positions for circles (evenly distributed)
        const availableWidth = this.width - this.margin.left - this.margin.right;
        const circleSpacing = availableWidth / (circleData.length + 1);

        // Get or create vehicle circles group
        let circlesGroup = this.svg.select(".vehicle-circles");
        if (circlesGroup.empty()) {
            circlesGroup = this.svg.append("g").attr("class", "vehicle-circles");
        }

        // Create a key function to track circles by vehicle type
        const key = d => d.vehicleType;

        // Bind data with key function
        const circles = circlesGroup.selectAll(".vehicle-circle")
            .data(circleData, key);

        // ENTER: Create new circles for new vehicle types
        const circlesEnter = circles.enter()
            .append("circle")
            .attr("class", "vehicle-circle")
            .attr("cx", (d, i) => this.margin.left + circleSpacing * (i + 1))
            .attr("cy", this.height - this.margin.bottom) // Start from bottom
            .attr("r", 0) // Start with radius 0
            .attr("fill", d => d.color)
            .attr("stroke", "#000")
            .attr("stroke-width", 2)
            .style("opacity", 0)
            .style("cursor", "pointer")
            .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.4))");

        // Animate new circles in
        circlesEnter
            .transition()
            .duration(1000)
            .delay((d, i) => i * 150)
            .attr("cy", d => this.yScale(d.totalInjuries))
            .attr("r", d => d.radius)
            .style("opacity", 0.95)
            .ease(d3.easeElasticOut.period(0.6));

        // UPDATE: Transition existing circles to new positions
        circles
            .transition()
            .duration(1000)
            .delay((d, i) => i * 100)
            .attr("cx", (d, i) => {
                // Find the new index for this vehicle type
                const newIndex = circleData.findIndex(item => item.vehicleType === d.vehicleType);
                return this.margin.left + circleSpacing * (newIndex + 1);
            })
            .attr("cy", d => this.yScale(d.totalInjuries))
            .attr("r", d => d.radius)
            .style("opacity", 0.95)
            .ease(d3.easeCubicOut);

        // EXIT: Animate out circles that are no longer in data
        circles.exit()
            .transition()
            .duration(800)
            .attr("cy", this.height - this.margin.bottom) // Move to bottom
            .attr("r", 0) // Shrink to zero
            .style("opacity", 0)
            .remove();

        // Add click interaction to all circles
        const self = this;
        circlesGroup.selectAll(".vehicle-circle")
            .on("click", function(event, circleData) {
                event.stopPropagation();

                // Reset previously selected circle
                if (self.selectedCircle && self.selectedCircle !== circleData) {
                    self.resetSelectedCircle();
                }

                // Toggle selection
                if (circleData.isSelected) {
                    self.resetSelectedCircle();
                } else {
                    self.selectCircle(this, circleData, event);
                }
            });

        // Click anywhere else to deselect (only if not dragging)
        if (!this.isDragging) {
            this.svg.on("click", function(event) {
                if (!event.target.classList.contains('vehicle-circle')) {
                    self.resetSelectedCircle();
                }
            });
        }

        // Update legend (remove and recreate)
        this.svg.selectAll(".legend").remove();
        const vehicleTypes = ['Automobile', 'Motorcycle', 'Truck', 'Transit', 'Bicycle', 'Other'];
        const legend = this.svg.selectAll(".legend")
            .data(vehicleTypes)
            .enter()
            .append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${this.width - 130}, ${this.margin.top + 60 + i * 20})`);

        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 7)
            .style("fill", d => vehicleColors[d])
            .style("stroke", "#000")
            .style("stroke-width", 1.5);

        legend.append("text")
            .attr("x", 15)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .style("fill", "#FFFFFF")
            .style("font-size", "11px")
            .style("text-anchor", "start")
            .style("font-family", "Overpass, sans-serif")
            .text(d => d);
    }

    selectCircle(circleElement, circleData, event) {
        circleData.isSelected = true;
        this.selectedCircle = circleData;

        // Animate circle expansion
        d3.select(circleElement)
            .transition()
            .duration(300)
            .attr("r", circleData.radius * 1.3)
            .style("filter", "drop-shadow(0 4px 12px rgba(12,123,86,0.6))")
            .style("stroke-width", 3)
            .style("stroke", "#0C7B56");

        this.showInjuryBreakdown(circleData, event);
    }

    resetSelectedCircle() {
        if (this.selectedCircle) {
            this.selectedCircle.isSelected = false;

            // Reset all circles to normal state
            d3.selectAll(".vehicle-circle")
                .transition()
                .duration(300)
                .attr("r", d => d.radius)
                .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.4))")
                .style("stroke-width", 2)
                .style("stroke", "#000");

            this.selectedCircle = null;

            // Hide injury breakdown
            this.hideInjuryBreakdown();
        }
    }

    showInjuryBreakdown(circleData, event) {
        const tooltip = document.getElementById('tooltip');
        const breakdown = circleData.injuryBreakdown;

        let breakdownContent = `
            <div class="injury-breakdown">
                <h3>${circleData.vehicleType} - Injury Breakdown</h3>
                <div class="injury-stats">
                    <div class="injury-item">
                        <span class="injury-label">Total Injuries:</span>
                        <span class="injury-count">${breakdown.total}</span>
                    </div>
                    <div class="injury-item">
                        <span class="injury-label">Major:</span>
                        <span class="injury-count">${breakdown.major}</span>
                    </div>
                    <div class="injury-item">
                        <span class="injury-label">Minor:</span>
                        <span class="injury-count">${breakdown.minor}</span>
                    </div>
                    <div class="injury-item">
                        <span class="injury-label">Fatal:</span>
                        <span class="injury-count">${breakdown.fatal}</span>
                    </div>
                    <div class="injury-item">
                        <span class="injury-label">None:</span>
                        <span class="injury-count">${breakdown.none}</span>
                    </div>
        `;

        if (breakdown.unknown > 0) {
            breakdownContent += `
                    <div class="injury-item">
                        <span class="injury-label">Unknown:</span>
                        <span class="injury-count">${breakdown.unknown}</span>
                    </div>
            `;
        }

        breakdownContent += `
                </div>
                <div class="sample-records">
                    <h4>Sample Injury Records:</h4>
        `;

        // Add sample records
        if (breakdown.sampleRecords && breakdown.sampleRecords.length > 0) {
            breakdown.sampleRecords.forEach(record => {
                breakdownContent += `
                    <div class="record">
                        <strong>Injury:</strong> ${record.Injury || 'Not specified'} | 
                        <strong>Location:</strong> ${record.STREET1 || 'Unknown'} | 
                        <strong>Time:</strong> ${record['Time of Collision'] || 'Unknown'}
                    </div>
                `;
            });
        } else {
            breakdownContent += `<div class="record">No detailed records available</div>`;
        }

        breakdownContent += `
                </div>
                <div class="click-note">Click anywhere to close</div>
            </div>
        `;

        tooltip.innerHTML = breakdownContent;
        tooltip.classList.add('show', 'injury-breakdown-tooltip');

        // Position tooltip near the circle after content is set
        if (event) {
            // Use setTimeout to ensure content is rendered
            setTimeout(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                let left = event.pageX + 15;
                let top = event.pageY - 20;

                // Adjust if tooltip would go off screen
                if (left + tooltipRect.width > viewportWidth) {
                    left = event.pageX - tooltipRect.width - 15;
                }
                if (top + tooltipRect.height > viewportHeight) {
                    top = event.pageY - tooltipRect.height - 20;
                }

                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            }, 10);
        }
    }

    hideInjuryBreakdown() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('show', 'injury-breakdown-tooltip');
    }
}

// Expose to global scope
window.VehicleChart = VehicleChart;

