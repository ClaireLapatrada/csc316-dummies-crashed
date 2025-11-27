class ConditionBarChart {
    constructor(containerSelector, data = []) {
        this.containerSelector = containerSelector;
        this.data = data;
        this.currentYear = 2006;
        this.filterState = {
            conditionType: 'LIGHT', // Default to LIGHT
            severity: 'all',
            district: 'all'
        };
        this.margin = { top: 40, right: 10, bottom: 60, left: 60 };
        this.width = 600 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
    }

    init() {
        const container = d3.select(this.containerSelector);
        container.html("");

        this.svg = container
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "bar-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .style("color", "#FFFFFF")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-family", "Overpass, sans-serif")
            .style("font-size", "14px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

        // X scale - will be updated based on conditions (starts empty, will be set in update)
        this.xScale = d3.scaleBand()
            .domain([])
            .range([0, this.width])
            .padding(0.3);

        // Y scale - fixed at [0, 14] to match design
        this.yScale = d3.scaleLinear()
            .domain([0, 14])
            .range([this.height, 0]);

        // Add Y axis - show ticks at 0, 2, 4, 6, 8, 10, 12, 14
        this.yAxis = this.svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(this.yScale).ticks(8).tickValues(d3.range(0, 15, 2)).tickFormat(d => d));

        // Style Y axis text - WHITE
        this.yAxis.selectAll("text")
            .attr("fill", "#FFFFFF")
            .attr("color", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");

        // Style Y axis lines - WHITE
        this.yAxis.selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);
        
        this.yAxis.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);

        // Add X axis
        this.xAxis = this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale));
        
        // X scale domain will be set in update() based on actual data

        // Style X axis text - WHITE
        this.xAxis.selectAll("text")
            .attr("fill", "#FFFFFF")
            .attr("color", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .style("color", "#FFFFFF")
            .style("stroke", "none")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");

        // Style X axis lines - WHITE
        this.xAxis.selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");
        
        this.xAxis.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");

        // Don't call update here - wait for data to be set
        // this.update() will be called after data is loaded
        
        // Initialize title
        this.updateTitle();
    }

    setData(data) {
        console.log("=== setData called ===");
        console.log("Input data:", data ? data.length : 0);
        console.log("Input data type:", typeof data, "Is array:", Array.isArray(data));
        if (data && Array.isArray(data)) {
            this.data = data;
            console.log("Data set successfully, length:", this.data.length);
            if (this.data.length > 0) {
                console.log("First record keys:", Object.keys(this.data[0]));
            }
        } else {
            console.log("Invalid data, setting to empty array");
            this.data = [];
        }
        // Update if we have a year set
        if (this.data && this.data.length > 0 && this.currentYear) {
            console.log("Data set, calling update for year:", this.currentYear);
            this.update();
        } else {
            console.log("Not updating - data:", this.data ? this.data.length : 0, "year:", this.currentYear);
        }
    }

    setYear(year) {
        console.log("Setting year to:", year);
        console.log("Data available:", this.data ? this.data.length : 0);
        console.log("Data type:", typeof this.data, "Is array:", Array.isArray(this.data));
        if (this.data && Array.isArray(this.data)) {
            console.log("Data length:", this.data.length);
        }
        this.currentYear = year;
        if (this.data && Array.isArray(this.data) && this.data.length > 0) {
            console.log("Calling update with real data");
            this.update();
        } else {
            console.log("No data available, cannot update");
            if (this.data) {
                console.log("Data exists but:", this.data.length, "items");
            } else {
                console.log("Data is null/undefined");
            }
        }
    }


    update() {
        console.log("=== UPDATE CALLED ===");
        console.log("Updating chart for year:", this.currentYear);
        console.log("Data available:", this.data ? this.data.length : 0);
        console.log("Data type:", typeof this.data);
        console.log("Is array:", Array.isArray(this.data));
        console.log("Filter state:", this.filterState);
        
        if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
            console.log("No data available, cannot update");
            return;
        }

        console.log("Total data records:", this.data.length);

        // Filter data for current year and selected filters
        let filteredData = this.data.filter(d => {
            let year = 2006;
            if (d['Year of collision'] && !isNaN(parseInt(d['Year of collision']))) {
                year = parseInt(d['Year of collision']);
            } else if (d.Year && !isNaN(parseInt(d.Year))) {
                year = parseInt(d.Year);
            }
            if (year !== this.currentYear) return false;

            // Filter by severity
            if (this.filterState.severity !== 'all') {
                const severity = this.getSeverity(d);
                if (Array.isArray(this.filterState.severity)) {
                    if (!this.filterState.severity.includes(severity)) return false;
                } else if (this.filterState.severity !== severity) {
                    return false;
                }
            }

            // Filter by district
            if (this.filterState.district !== 'all') {
                let district = d['DISTRICT'] || 
                              d['District Name'] || 
                              d['District'] || 
                              d['District Name (from Geo)'] ||
                              '';
                district = district.trim();
                // Normalize district name (same logic as in main.js)
                const districtLower = district.toLowerCase();
                if (districtLower.includes('north york')) {
                    district = 'North York';
                } else if (districtLower.includes('etobicoke')) {
                    district = 'Etobicoke';
                } else if (districtLower.includes('scarborough')) {
                    district = 'Scarborough';
                } else if (districtLower.includes('east york')) {
                    district = 'East York';
                } else if (districtLower.includes('york') && !districtLower.includes('north') && !districtLower.includes('east')) {
                    district = 'York';
                } else if (districtLower.includes('toronto') && !districtLower.includes('east') && !districtLower.includes('north')) {
                    district = 'Toronto';
                }
                
                if (Array.isArray(this.filterState.district)) {
                    if (!this.filterState.district.includes(district)) return false;
                } else if (this.filterState.district !== district) {
                    return false;
                }
            }

            return true;
        });

        const yearData = filteredData;

        console.log("Filtered data for year", this.currentYear, ":", yearData.length, "records");

        // Group by selected condition type and count collisions
        const conditionType = this.filterState.conditionType || 'LIGHT';
        
        // Get field name based on condition type
        let fieldName = '';
        if (conditionType === 'LIGHT') {
            fieldName = 'LIGHT';
        } else if (conditionType === 'VISIBILITY') {
            fieldName = 'VISIBILITY';
        } else if (conditionType === 'Road Surface Condition') {
            fieldName = 'Road Surface Condition';
        }
        
        // Use D3 to group by condition value and count
        const conditionCounts = d3.rollups(
            yearData,
            v => v.length, // Count collisions
            d => {
                // Get the value for the selected condition type
                let value = '';
                if (conditionType === 'LIGHT') {
                    value = (d['LIGHT'] || d['Light'] || d['LIGHT_COND'] || '').toString().trim();
                } else if (conditionType === 'VISIBILITY') {
                    value = (d['VISIBILITY'] || d['Visibility'] || '').toString().trim();
                } else if (conditionType === 'Road Surface Condition') {
                    value = (d['Road Surface Condition'] || d['RDSFCOND'] || d['Road Surface'] || '').toString().trim();
                }
                return value || 'Unknown';
            }
        );
        
        // Sort by count (descending) and take top 5
        conditionCounts.sort((a, b) => b[1] - a[1]);
        const top5Conditions = conditionCounts.slice(0, 5);
        
        console.log(`Top 5 ${conditionType} values:`, top5Conditions);
        
        // Convert directly to chart data format - only include conditions with data
        const chartData = top5Conditions
            .filter(c => c[1] > 0) // Only include conditions with data
            .map(c => ({
                condition: c[0], // Use actual condition name
                value: c[1]
            }))
            .sort((a, b) => b.value - a.value); // Sort descending
        
        console.log("Chart data (sorted by value):", chartData);
        console.log("Total collisions counted:", chartData.reduce((a, b) => a + b.value, 0));
        console.log("Year data length:", yearData.length);

        // Use actual condition names directly - no placeholder "Condition X" labels
        const sortedChartData = chartData.map(d => ({
            condition: d.condition, // Use actual condition name
            conditionName: d.condition, // Use actual condition name
            value: d.value
        }));
        
        console.log("Final chart data:", sortedChartData);

        // Update Y scale domain - fixed at 1300
        const maxValue = d3.max(sortedChartData, d => d.value) || 14;
        this.yScale.domain([0, 1300]);
        console.log("Y scale domain updated to [0, 1300], max value:", maxValue);

        // Update Y axis - show appropriate number of ticks
        const tickCount = Math.min(8, Math.ceil(1300 / 100) + 1);
        this.svg.select(".y-axis")
            .call(d3.axisLeft(this.yScale).ticks(tickCount).tickFormat(d => d));
        
        // Ensure Y axis is white - force all styles (must be done after call())
        this.svg.select(".y-axis").selectAll("text")
            .attr("fill", "#FFFFFF")
            .attr("color", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .style("color", "#FFFFFF")
            .style("stroke", "none")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");
        
        this.svg.select(".y-axis").selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");
        
        this.svg.select(".y-axis").selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");
        
        // Ensure X axis is white - force all styles
        this.svg.select(".x-axis").selectAll("text")
            .attr("fill", "#FFFFFF")
            .attr("color", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .style("color", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");
        
        this.svg.select(".x-axis").selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");
        
        this.svg.select(".x-axis").selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");

        // Update X scale domain based on sorted data - use actual condition names
        const xAxisConditionNames = sortedChartData.map(d => d.conditionName);
        this.xScale.domain(xAxisConditionNames);
        
        // Update X axis with new domain
        this.svg.select(".x-axis")
            .call(d3.axisBottom(this.xScale));

        // Ensure X axis is white - force all styles (must be done after call())
        this.svg.select(".x-axis").selectAll("text")
            .attr("fill", "#FFFFFF")
            .attr("color", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .style("color", "#FFFFFF")
            .style("stroke", "none")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");
        
        this.svg.select(".x-axis").selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");
        
        this.svg.select(".x-axis").selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");

        this.renderBars(sortedChartData);
    }

    renderBars(data) {
        console.log("Rendering bars with data:", data);
        console.log("X scale domain:", this.xScale.domain());
        console.log("X scale range:", this.xScale.range());
        console.log("Y scale domain:", this.yScale.domain());
        console.log("Y scale range:", this.yScale.range());
        
        // Remove existing bars
        this.svg.selectAll(".bar").remove();

        // Add bars using proper D3 pattern
        const bars = this.svg.selectAll(".bar")
            .data(data);

        // Enter selection - create new bars
        const barsEnter = bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("fill", "#FFD700")
            .attr("rx", 4);

        // Merge enter and update
        barsEnter.merge(bars)
            .attr("x", d => {
                const x = this.xScale(d.conditionName); // Use conditionName for positioning
                console.log(`Bar for ${d.conditionName}: x=${x}, value=${d.value}`);
                return x || 0;
            })
            .attr("width", this.xScale.bandwidth())
            .attr("y", d => {
                // Use the actual value (scale will handle it)
                const y = this.yScale(d.value);
                console.log(`Bar for ${d.conditionName}: y=${y}, value=${d.value}`);
                return y;
            })
            .attr("height", d => {
                // Calculate height from the bar's y position to the bottom
                const barTop = this.yScale(d.value);
                const barHeight = this.height - barTop;
                console.log(`Bar for ${d.conditionName}: height=${barHeight}, value=${d.value}`);
                return Math.max(0, barHeight);
            })
            .on("mouseover", (event, d) => {
                this.tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                this.tooltip.html(`${d.conditionName}: ${d.value.toLocaleString()}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", (event, d) => {
                this.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", (event, d) => {
                this.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0);
            });

        // Exit selection - remove old bars
        bars.exit().remove();
        
        const renderedBars = this.svg.selectAll(".bar");
        console.log("Bars rendered:", renderedBars.size());
        renderedBars.each(function(d) {
            console.log("Bar element:", d3.select(this).attr("x"), d3.select(this).attr("y"), d3.select(this).attr("height"));
        });
    }

    getSeverity(d) {
        const acclass = d['Accident Classification'] || d['Accident classification'] || '';
        const s = String(acclass || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (s.includes('non-fatal') || s.includes('nonfatal')) return 'Non-fatal';
        if (s.includes('fatal')) return 'Fatal';
        return 'Non-fatal';
    }

    setFilter(filterType, value) {
        this.filterState[filterType] = value;
        this.updateTitle();
        this.update();
    }

    updateTitle() {
        const titleElement = d3.select("#dynamic-title .title-line-1");
        if (titleElement.empty()) return;

        // Get severity text
        let severityText = "";
        if (this.filterState.severity !== 'all') {
            if (Array.isArray(this.filterState.severity)) {
                if (this.filterState.severity.length === 1) {
                    severityText = this.filterState.severity[0];
                } else {
                    // Format multiple severities: "Fatal/Non-fatal"
                    severityText = this.filterState.severity.map(s => {
                        const sLower = s.toLowerCase();
                        if (sLower.includes('fatal') && !sLower.includes('non')) return 'Fatal';
                        if (sLower.includes('non') || sLower.includes('non-fatal')) return 'Non-fatal';
                        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
                    }).join("/");
                }
            } else {
                severityText = this.filterState.severity;
            }
            
            // Normalize severity text
            const severityLower = severityText.toLowerCase();
            if (severityLower.includes('fatal') && !severityLower.includes('non')) {
                severityText = 'Fatal';
            } else if (severityLower.includes('non') || severityLower.includes('non-fatal')) {
                severityText = 'Non-fatal';
            } else {
                severityText = severityText.charAt(0).toUpperCase() + severityText.slice(1).toLowerCase();
            }
        }

        // Get condition type text
        const conditionType = this.filterState.conditionType || 'LIGHT';
        let conditionText = conditionType;
        if (conditionType === 'LIGHT') conditionText = 'Light';
        else if (conditionType === 'VISIBILITY') conditionText = 'Visibility';
        else if (conditionType === 'Road Surface Condition') conditionText = 'Road Surface';

        // Get district text
        let districtText = "All Districts";
        if (this.filterState.district !== 'all') {
            if (Array.isArray(this.filterState.district)) {
                if (this.filterState.district.length === 1) {
                    districtText = this.filterState.district[0];
                } else if (this.filterState.district.length === 2) {
                    districtText = `${this.filterState.district[0]} and ${this.filterState.district[1]}`;
                } else {
                    districtText = this.filterState.district.slice(0, -1).join(", ") + " and " + this.filterState.district[this.filterState.district.length - 1];
                }
            } else {
                districtText = this.filterState.district;
            }
        }

        // Build title
        let title = "";
        if (severityText === "") {
            title = `Collisions by ${conditionText} in ${districtText}`;
        } else {
            title = `${severityText} Collisions by ${conditionText} in ${districtText}`;
        }

        titleElement.text(title);
    }
}

window.TimeBarChart = TimeBarChart;

