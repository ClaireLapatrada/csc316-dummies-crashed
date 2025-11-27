class TimeBarChart {
    constructor(containerSelector, data = []) {
        this.containerSelector = containerSelector;
        this.data = data;
        this.currentYear = 2006;
        this.filterState = {
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

        // Initialize title
        this.updateTitle();

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

        // X scale
        this.xScale = d3.scaleBand()
            .domain(["Morning", "Afternoon", "Night"])
            .range([0, this.width])
            .padding(0.3);

        // Y scale - will be updated based on data
        this.yScale = d3.scaleLinear()
            .domain([0, 14])
            .range([this.height, 0]);

        // Add Y axis
        this.yAxis = this.svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(this.yScale).ticks(8).tickFormat(d => d));

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

        // Style X axis text - WHITE
        this.xAxis.selectAll("text")
            .attr("fill", "#FFFFFF")
            .attr("color", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");

        // Style X axis lines - WHITE
        this.xAxis.selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);
        
        this.xAxis.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);

        // Don't call update here - wait for data to be set
        // Only render if we have data
        if (this.data && this.data.length > 0) {
            this.update();
        }
    }

    setData(data) {
        console.log("Setting data on chart:", data ? data.length : 0);
        console.log("Data is array:", Array.isArray(data));
        this.data = data || [];
        console.log("Data set, length:", this.data.length);
        // Update if we have a year set
        if (this.data && this.data.length > 0 && this.currentYear) {
            console.log("Data set, calling update for year:", this.currentYear);
            this.update();
        }
    }

    setYear(year) {
        console.log("Setting year to:", year, "Data available:", this.data ? this.data.length : 0);
        this.currentYear = year;
        if (this.data && Array.isArray(this.data) && this.data.length > 0) {
            console.log("Calling update with real data");
            this.update();
        } else {
            console.log("No data available, cannot update");
        }
    }

    extractHourFromBucket(timeBucket) {
        if (!timeBucket || typeof timeBucket !== 'string') return 0;
        
        // Extract hour from time bucket string like "6:30 PM" or "18:30"
        const match = timeBucket.match(/(\d+):/);
        if (match) {
            let hour = parseInt(match[1]);
            const upperTime = timeBucket.toUpperCase();
            if (upperTime.includes('PM') && hour !== 12) hour += 12;
            if (upperTime.includes('AM') && hour === 12) hour = 0;
            // Handle 24-hour format
            if (hour >= 24) hour = hour % 24;
            return hour;
        }
        
        // Try to extract just hour number
        const hourMatch = timeBucket.match(/\b(\d{1,2})\b/);
        if (hourMatch) {
            return parseInt(hourMatch[1]);
        }
        
        return 0;
    }

    getTimePeriod(timeStr) {
        if (!timeStr) return "Night";
        
        // Handle different time formats
        let hour = 0;
        if (timeStr.includes(':')) {
            // Format like "6:30 PM" or "18:30"
            const parts = timeStr.split(':');
            hour = parseInt(parts[0]);
            if (timeStr.includes('PM') && hour !== 12) hour += 12;
            if (timeStr.includes('AM') && hour === 12) hour = 0;
        } else if (timeStr.includes('AM') || timeStr.includes('PM')) {
            // Format like "6 AM"
            const match = timeStr.match(/(\d+)\s*(AM|PM)/i);
            if (match) {
                hour = parseInt(match[1]);
                if (match[2].toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (match[2].toUpperCase() === 'AM' && hour === 12) hour = 0;
            }
        }
        
        if (hour >= 6 && hour < 12) return "Morning";
        else if (hour >= 12 && hour < 17) return "Afternoon";
        else return "Night";
    }

    update() {
        console.log("=== UPDATE CALLED ===");
        console.log("Updating chart for year:", this.currentYear);
        console.log("Data available:", this.data ? this.data.length : 0);
        console.log("Data type:", typeof this.data);
        console.log("Is array:", Array.isArray(this.data));
        
        if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
            console.log("No data available, using sample data");
            // Use sample data if no data loaded
            const sampleData = [
                { time: "Morning", value: 10 },
                { time: "Afternoon", value: 7 },
                { time: "Night", value: 2 }
            ];
            this.renderBars(sampleData);
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

        // Group by time period and count injuries
        const timeGroups = {
            "Morning": 0,
            "Afternoon": 0,
            "Night": 0
        };

        // Log sample record to see structure
        if (yearData.length > 0) {
            console.log("Sample record:", yearData[0]);
            console.log("All keys in record:", Object.keys(yearData[0]));
            console.log("Time fields:", {
                'Time of Collision BUCKET': yearData[0]['Time of Collision BUCKET'],
                'Time of Collision': yearData[0]['Time of Collision'],
                'Time': yearData[0]['Time']
            });
        }

        yearData.forEach((d, index) => {
            let period = null;
            
            // Try multiple time field names (case variations)
            const timeBucket = d['Time of Collision BUCKET'] || 
                              d['Time of collision BUCKET'] ||
                              d['Time of Collision'] || 
                              d['Time of collision'] ||
                              d['Time'] || '';
            
            if (timeBucket && timeBucket.trim() !== '') {
                // Map time bucket to period
                const hour = this.extractHourFromBucket(timeBucket);
                if (index < 5) {
                    console.log(`Record ${index}: timeBucket="${timeBucket}", extracted hour=${hour}`);
                }
                if (hour >= 6 && hour < 12) period = "Morning";
                else if (hour >= 12 && hour < 17) period = "Afternoon";
                else period = "Night";
            }
            
            // If still no period, try to extract from other time fields
            if (!period) {
                const timeStr = d['Time of Collision'] || 
                               d['Time of collision'] ||
                               d['Time'] || '';
                if (timeStr && timeStr.trim() !== '') {
                    period = this.getTimePeriod(timeStr);
                }
            }
            
            // Default to Night if still no period
            if (!period) {
                period = "Night";
            }
            
            // Count collisions (each record is a collision, so count it)
            if (period && timeGroups.hasOwnProperty(period)) {
                timeGroups[period] += 1; // Count each collision
            }
            
            // Debug first few records
            if (index < 5) {
                console.log(`Record ${index}: period=${period}, timeBucket="${timeBucket}"`);
            }
        });
        
        console.log("Time groups after processing:", timeGroups);

        // Convert to array format
        const chartData = [
            { time: "Morning", value: timeGroups["Morning"] },
            { time: "Afternoon", value: timeGroups["Afternoon"] },
            { time: "Night", value: timeGroups["Night"] }
        ];

        console.log("Chart data:", chartData);

        // Keep Y scale domain fixed at [0, 800]
        this.yScale.domain([0, 800]);

        // Update Y axis
        this.svg.select(".y-axis")
            .call(d3.axisLeft(this.yScale).ticks(8).tickFormat(d => d));
        
        // Ensure Y axis is white - force all styles
        this.svg.select(".y-axis").selectAll("text")
            .attr("fill", "#FFFFFF")
            .attr("color", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .style("color", "#FFFFFF")
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

        this.renderBars(chartData);
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
                const x = this.xScale(d.time);
                console.log(`Bar for ${d.time}: x=${x}, value=${d.value}`);
                return x || 0;
            })
            .attr("width", this.xScale.bandwidth())
            .attr("y", d => {
                // Use the actual value (scale will handle it)
                const y = this.yScale(d.value);
                console.log(`Bar for ${d.time}: y=${y}, value=${d.value}`);
                return y;
            })
            .attr("height", d => {
                // Calculate height from the bar's y position to the bottom
                const barTop = this.yScale(d.value);
                const barHeight = this.height - barTop;
                console.log(`Bar for ${d.time}: height=${barHeight}, value=${d.value}`);
                return Math.max(0, barHeight);
            })
            .on("mouseover", (event, d) => {
                this.tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                this.tooltip.html(`${d.time}: ${d.value.toLocaleString()}`)
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

        // Build title - for time-effect, it's about time periods
        let title = "";
        if (severityText === "") {
            title = `Time's Effect on Accidents in ${districtText}`;
        } else {
            title = `Time's Effect on ${severityText} Accidents in ${districtText}`;
        }

        titleElement.text(title);
    }
}

window.TimeBarChart = TimeBarChart;

