// Pastel color scheme for vehicle types
const vehicleColors = {
    "Automobile": "#88ff00",
    "Motorcycle": "#FFB347",
    "Truck": "rgba(215,47,237,0.96)",
    "Transit": "#61ffd5",
    "Bicycle": "#CB99C9",
    "Other": "#FDFD96"
};

let svg, width, height, margin;
let yScale;
let selectedCircle = null;

function initVisualization() {
    const container = d3.select("#vizContainer");
    container.html("");

    width = Math.min(800, window.innerWidth - 50);
    height = 400;

    margin = { top: 80, right: 30, bottom: 50, left: 60 };

    svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    console.log("Visualization initialized with dimensions:", width, "x", height);
}


// Get injury breakdown for a specific vehicle type, year, and time bucket
function getInjuryBreakdown(data, vehicleType, year, timeBucket) {
    console.log(`Getting injury breakdown for ${vehicleType} in ${year} at ${timeBucket}`);

    const filteredData = data.filter(d => {
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

function prepareVehicleData(globalData, currentTimeBucket) {
    const currentYear = window.App.getCurrentYear();
    console.log("Preparing vehicle data for time:", currentTimeBucket, "and year:", currentYear);

    const vehicleTypes = ['Automobile', 'Motorcycle', 'Truck', 'Transit', 'Bicycle', 'Other'];
    const circleData = [];

    vehicleTypes.forEach(vehicleType => {
        const injuryBreakdown = getInjuryBreakdown(globalData, vehicleType, currentYear, currentTimeBucket);

        if (injuryBreakdown.total > 0) {
            circleData.push({
                year: currentYear,
                vehicleType: vehicleType,
                totalInjuries: injuryBreakdown.total,
                color: vehicleColors[vehicleType],
                radius: Math.max(15, Math.min(45, Math.sqrt(injuryBreakdown.total) * 2.2)),
                injuryBreakdown: injuryBreakdown,
                isSelected: false
            });
        }
    });

    console.log("Vehicle data prepared:", circleData.length, "circles for year", currentYear);
    return circleData;
}

// update visualization based on current time and year
function updateVisualization() {
    console.log("=== UPDATE VISUALIZATION CALLED ===");
    console.log("Current year:", window.App.getCurrentYear());
    console.log("Current time index:", window.App.getCurrentTimeIndex());

    if (!window.App.getGlobalData().length) {
        console.log("No global data available");
        return;
    }

    const currentTimeBucket = window.App.getTimeBuckets()[window.App.getCurrentTimeIndex()];
    const globalData = window.App.getGlobalData();

    console.log("Current time bucket:", currentTimeBucket);
    console.log("Global data length:", globalData.length);

    // update background gradient based on current time
    const newColors = window.Background.getGradientByHour(window.App.getCurrentTime());
    window.Background.updateGradient(newColors);

    // pepare vehicle data
    const circleData = prepareVehicleData(globalData, currentTimeBucket);

    // Clear previous visualization
    svg.selectAll("*").remove();

    if (circleData.length === 0) {
        console.log("No data to display - showing message");
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", "16px")
            .text(`No injury data for ${currentTimeBucket} in ${window.App.getCurrentYear()}`);
        return;
    }

    console.log("Rendering", circleData.length, "vehicle circles");

    // get domains for scales
    const injuryCounts = circleData.map(d => d.totalInjuries);
    const maxInjuries = d3.max(injuryCounts) || Math.max(10, d3.max(injuryCounts));

    console.log("Max injuries:", maxInjuries);

    // Calculate total accident count for current time and year
    const totalAccidents = globalData.filter(d =>
        d['Time of Collision BUCKET'] === currentTimeBucket &&
        d.year === window.App.getCurrentYear()
    ).length;

    svg.append("text")
        .attr("class", "accident-count-display")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .style("fill", "hotpink")
        .style("font-size", "32px")
        .style("font-weight", "bold")
        .text(`Total Accidents: ${totalAccidents}`);

    // Create Y scale
    yScale = d3.scaleLinear()
        .domain([0, maxInjuries * 1.2])
        .range([height - margin.bottom, margin.top])
        .nice();

    // add Y axis
    const yAxis = d3.axisLeft(yScale)
        .ticks(Math.min(10, Math.max(5, maxInjuries)))
        .tickFormat(d3.format("d"));

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .text("Number of Injuries");

    // add horizontal grid lines
    const gridLines = yScale.ticks(Math.min(8, maxInjuries)).filter(tick => tick > 0);
    svg.selectAll(".grid-line")
        .data(gridLines)
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "rgba(255,255,255,0.15)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2");

    // Create vehicle circles group
    const circlesGroup = svg.append("g")
        .attr("class", "vehicle-circles");

    // Calculate horizontal positions for circles (evenly distributed)
    const availableWidth = width - margin.left - margin.right;
    const circleSpacing = availableWidth / (circleData.length + 1);

    // create circles with animation
    const circles = circlesGroup.selectAll(".vehicle-circle")
        .data(circleData, d => d.vehicleType)
        .enter()
        .append("circle")
        .attr("class", "vehicle-circle")
        .attr("cx", (d, i) => margin.left + circleSpacing * (i + 1))
        .attr("cy", height - margin.bottom)
        .attr("r", d => d.radius)
        .attr("fill", d => d.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("opacity", 0.95)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.4))");

    // Animate circles to their positions based on injury count
    circles.transition()
        .duration(1000)
        .delay((d, i) => i * 200)
        .attr("cy", d => yScale(d.totalInjuries))
        .ease(d3.easeElasticOut.period(0.6));

    // Add click interaction
    circles.on("click", function(event, circleData) {
        event.stopPropagation();

        // Reset previously selected circle
        if (selectedCircle && selectedCircle !== circleData) {
            resetSelectedCircle();
        }

        // Toggle selection
        if (circleData.isSelected) {
            resetSelectedCircle();
        } else {
            selectCircle(this, circleData);
        }
    });

    // click anywhere else to deselect
    svg.on("click", function(event) {
        if (!event.target.classList.contains('vehicle-circle')) {
            resetSelectedCircle();
        }
    });

    // add legend
    const vehicleTypes = ['Automobile', 'Motorcycle', 'Truck', 'Transit', 'Bicycle', 'Other'];
    const legend = svg.selectAll(".legend")
        .data(vehicleTypes)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${width - 120}, ${margin.top + 60 + i * 20})`);

    legend.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 7)
        .style("fill", d => vehicleColors[d])
        .style("stroke", "#fff")
        .style("stroke-width", 1.5);

    legend.append("text")
        .attr("x", 15)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("fill", "white")
        .style("font-size", "11px")
        .style("text-anchor", "start")
        .text(d => d);

    console.log("Visualization updated successfully!");
}

function selectCircle(circleElement, circleData) {
    circleData.isSelected = true;
    selectedCircle = circleData;

    // Animate circle expansion
    d3.select(circleElement)
        .transition()
        .duration(300)
        .attr("r", circleData.radius * 1.3)
        .style("filter", "drop-shadow(0 4px 12px rgba(255,255,255,0.6))")
        .style("stroke-width", 3);

    showInjuryBreakdown(circleData);
}

function resetSelectedCircle() {
    if (selectedCircle) {
        selectedCircle.isSelected = false;

        // reset all circles to normal state
        d3.selectAll(".vehicle-circle")
            .transition()
            .duration(300)
            .attr("r", d => d.radius)
            .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.4))")
            .style("stroke-width", 2);

        selectedCircle = null;

        // hide injury breakdown
        hideInjuryBreakdown();
    }
}

function showInjuryBreakdown(circleData) {
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
            <div class="click-note">Click on the anywhere to close</div>
        </div>
    `;

    tooltip.innerHTML = breakdownContent;
    tooltip.classList.add('show', 'injury-breakdown-tooltip');
}

function hideInjuryBreakdown() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('show', 'injury-breakdown-tooltip');
}






