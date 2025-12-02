class LocationChart {
    constructor(parentElement, crashData) {
        this.parentElement = parentElement;
        this.data = crashData;
        this.selectedYear = null;
        this.activeFilters = ["Fatal","Major","Minor","Minimal"];
        this.globalMaxValue = null; // Constant max value for all speedometers
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Get container dimensions
        let container = d3.select("#" + vis.parentElement).node();
        let containerWidth = container ? container.clientWidth : 400;
        let containerHeight = container ? container.clientHeight : 400;

        vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        vis.width = containerWidth - vis.margin.left - vis.margin.right;
        vis.height = containerHeight - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select("#" + vis.parentElement)
            .html("")
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Speedometer settings
        vis.gaugeRadius = Math.min(vis.width, vis.height) / 5;
        vis.gaugeCenterX = vis.width / 4;
        vis.gaugeCenterY = vis.height / 3;

        vis.updateVis();
    }

    wrangleData() {
        let vis = this;

        let filtered = vis.data.filter(d => {
            // Ensure Year is a number for comparison
            let crashYear = +d.Year || +d['Year of collision'] || 0;
            let classification = (d['Accident Classification'] || '').trim();
            // Filter out entries with no category
            if (!classification || classification === '') {
                return false;
            }
            return (!vis.selectedYear || crashYear === +vis.selectedYear) &&
                   (vis.activeFilters.length === 0 || vis.activeFilters.includes(classification));
        });

        let counts = d3.rollups(filtered, v => v.length, d => d['DISTRICT']);

        // Map district numbers to region names
        const districtToRegion = {
            '41': 'Scarborough', '42': 'Scarborough', '43': 'Scarborough', '44': 'Scarborough',
            '22': 'Etobicoke York', '23': 'Etobicoke York', '31': 'Etobicoke York', '32': 'Etobicoke York', '33': 'Etobicoke York',
            '12': 'North York', '13': 'North York', '14': 'North York', '32': 'North York', '33': 'North York',
            '51': 'Toronto and East York', '52': 'Toronto and East York', '53': 'Toronto and East York', '54': 'Toronto and East York', '55': 'Toronto and East York'
        };

        // Aggregate by region
        let regionCounts = {};
        counts.forEach(([district, count]) => {
            let region = districtToRegion[district] || district;
            if (!regionCounts[region]) {
                regionCounts[region] = 0;
            }
            regionCounts[region] += count;
        });

        // Convert to array and sort
        vis.displayData = Object.entries(regionCounts)
            .map(([region, count]) => [region, count])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4); // Top 4 regions

        // Calculate global max across all years and filters for consistent scale
        // Find the maximum collision count for any region in any single year/filter combination
        if (vis.globalMaxValue === null) {
            let allFiltered = vis.data.filter(d => {
                let classification = (d['Accident Classification'] || '').trim();
                return classification && classification !== '';
            });
            
            const districtToRegion = {
                '41': 'Scarborough', '42': 'Scarborough', '43': 'Scarborough', '44': 'Scarborough',
                '22': 'Etobicoke York', '23': 'Etobicoke York', '31': 'Etobicoke York', '32': 'Etobicoke York', '33': 'Etobicoke York',
                '12': 'North York', '13': 'North York', '14': 'North York', '32': 'North York', '33': 'North York',
                '51': 'Toronto and East York', '52': 'Toronto and East York', '53': 'Toronto and East York', '54': 'Toronto and East York', '55': 'Toronto and East York'
            };
            
            // Calculate max for each year and filter combination
            let maxValue = 0;
            const allYears = [...new Set(allFiltered.map(d => +d.Year || +d['Year of collision'] || 0))].filter(y => y >= 2006 && y <= 2023);
            const allClassifications = ['Fatal', 'Major', 'Minor', 'Minimal'];
            
            // Check all combinations to find the absolute maximum single region count
            allYears.forEach(year => {
                allClassifications.forEach(classification => {
                    let yearFiltered = allFiltered.filter(d => {
                        let crashYear = +d.Year || +d['Year of collision'] || 0;
                        let dClassification = (d['Accident Classification'] || '').trim();
                        return crashYear === year && dClassification === classification;
                    });
                    
                    let yearCounts = d3.rollups(yearFiltered, v => v.length, d => d['DISTRICT']);
                    let yearRegionCounts = {};
                    yearCounts.forEach(([district, count]) => {
                        let region = districtToRegion[district] || district;
                        if (!yearRegionCounts[region]) {
                            yearRegionCounts[region] = 0;
                        }
                        yearRegionCounts[region] += count;
                    });
                    
                    // Find max for this year/classification combination
                    const yearMax = Math.max(...Object.values(yearRegionCounts), 0);
                    if (yearMax > maxValue) {
                        maxValue = yearMax;
                    }
                });
            });
            
            vis.globalMaxValue = maxValue || 1;
        }
        
        vis.maxCount = vis.globalMaxValue;
        vis.avgCollisions = d3.mean(vis.displayData, d => d[1]);
    }

    updateVis() {
        const vis = this;
        vis.wrangleData();

        // Calculate positions for 4 speedometers in a 2x2 grid
        const gaugeRadius = Math.min(vis.width, vis.height) / 5;
        const gaugeSpacingX = vis.width / 2;
        const gaugeSpacingY = vis.height / 2;
        const positions = [
            { x: gaugeSpacingX / 2, y: gaugeSpacingY / 2 }, // Top-left
            { x: gaugeSpacingX * 1.5, y: gaugeSpacingY / 2 }, // Top-right
            { x: gaugeSpacingX / 2, y: gaugeSpacingY * 1.5 }, // Bottom-left
            { x: gaugeSpacingX * 1.5, y: gaugeSpacingY * 1.5 } // Bottom-right
        ];

        // Get existing speedometers or create new ones
        vis.displayData.slice(0, 4).forEach((d, i) => {
            if (i >= positions.length) return;
            
            const [region, count] = d;
            const pos = positions[i];
            const gaugeClass = `gauge-${region.replace(/\s+/g, '-')}`;
            const existingGauge = vis.svg.select(`g.${gaugeClass}`);
            
            if (existingGauge.empty()) {
                // Create new speedometer
                vis.createSpeedometer(pos.x, pos.y, gaugeRadius, region, count, vis.maxCount, i);
            } else {
                // Update existing speedometer with smooth transition
                vis.updateSpeedometer(existingGauge, count, vis.maxCount, gaugeRadius);
            }
        });

        // Remove speedometers that are no longer in displayData
        vis.svg.selectAll("g[class^='gauge-']").each(function() {
            const gaugeLabel = d3.select(this).select(".region-label").text();
            const stillExists = vis.displayData.some(d => d[0] === gaugeLabel);
            if (!stillExists) {
                d3.select(this).remove();
            }
        });
    }

    updateSpeedometer(gaugeGroup, value, maxValue, radius) {
        const vis = this;
        
        // Get the region label to determine color
        const regionLabel = gaugeGroup.select(".region-label").text();
        const regionColors = {
            'Scarborough': '#FF6B6B',      // Red
            'Etobicoke York': '#4ECDC4',   // Teal
            'North York': '#FFD93D',       // Yellow
            'Toronto and East York': '#A78BFA' // Purple
        };
        const gaugeColor = regionColors[regionLabel] || '#FFD700';
        
        // Calculate new needle angle
        const normalizedValue = Math.min(value / maxValue, 1);
        const needleAngle = -Math.PI + (Math.PI * normalizedValue);
        const needleLength = radius * 0.85;
        const needleX = Math.cos(needleAngle) * needleLength;
        const needleY = Math.sin(needleAngle) * needleLength;

        // Update needle with smooth transition
        gaugeGroup.select(".needle")
            .transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("x2", needleX)
            .attr("y2", needleY)
            .attr("stroke", gaugeColor);

        // Update center circle color
        gaugeGroup.select("circle")
            .attr("fill", gaugeColor);

        // Update value label (no animation, just update directly)
        gaugeGroup.select(".value-label")
            .text(value)
            .attr("fill", gaugeColor);
    }

    createSpeedometer(centerX, centerY, radius, label, value, maxValue, index) {
        const vis = this;
        
        // Color scheme for different regions
        const regionColors = {
            'Scarborough': '#FF6B6B',      // Red
            'Etobicoke York': '#4ECDC4',   // Teal
            'North York': '#FFD93D',       // Yellow
            'Toronto and East York': '#A78BFA' // Purple
        };
        
        const gaugeColor = regionColors[label] || '#FFD700';
        
        // Create group for this speedometer
        const gaugeGroup = vis.svg.append("g")
            .attr("class", `gauge-${label.replace(/\s+/g, '-')}`)
            .attr("transform", `translate(${centerX}, ${centerY})`);

        // Draw outer arc (semi-circle from -180 to 0 degrees)
        const arc = d3.arc()
            .innerRadius(radius * 0.7)
            .outerRadius(radius)
            .startAngle(-Math.PI)
            .endAngle(0);

        gaugeGroup.append("path")
            .attr("d", arc)
            .attr("fill", "rgba(255, 255, 255, 0.2)")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 2);

        // Draw tick marks
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const angle = -Math.PI + (Math.PI * i / numTicks);
            const tickValue = (maxValue * i / numTicks);
            
            // Tick line
            const tickLength = i % (numTicks / 2) === 0 ? radius * 0.15 : radius * 0.08;
            const x1 = Math.cos(angle) * (radius - tickLength);
            const y1 = Math.sin(angle) * (radius - tickLength);
            const x2 = Math.cos(angle) * radius;
            const y2 = Math.sin(angle) * radius;
            
            gaugeGroup.append("line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .attr("stroke", "#FFFFFF")
                .attr("stroke-width", 1.5);

            // Tick label (only for major ticks)
            if (i % (numTicks / 2) === 0) {
                const labelX = Math.cos(angle) * (radius * 0.5);
                const labelY = Math.sin(angle) * (radius * 0.5);
                gaugeGroup.append("text")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("fill", "#FFFFFF")
                    .attr("font-family", "Overpass, sans-serif")
                    .attr("font-size", "10px")
                    .text(Math.round(tickValue));
            }
        }

        // Calculate needle angle (0 = pointing up, -180 = pointing left, 0 = pointing right)
        // Map value from 0 to maxValue to angle from -180 to 0 degrees
        const normalizedValue = Math.min(value / maxValue, 1);
        const needleAngle = -Math.PI + (Math.PI * normalizedValue);

        // Draw needle with smooth transition
        const needleLength = radius * 0.85;
        const needleX = Math.cos(needleAngle) * needleLength;
        const needleY = Math.sin(needleAngle) * needleLength;

        const needle = gaugeGroup.append("line")
            .attr("class", "needle")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 0)
            .attr("stroke", gaugeColor)
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round")
            .style("cursor", "pointer")
            .on("click", function(event) {
                event.stopPropagation();
                if (vis.mapVis) {
                    vis.mapVis.zoomToDistrict(label);
                }
            });

        // Animate needle to final position
        needle.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("x2", needleX)
            .attr("y2", needleY);

        // Draw center circle
        gaugeGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", radius * 0.1)
            .attr("fill", gaugeColor)
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 2);

        // Region label on top (bigger with more padding)
        gaugeGroup.append("text")
            .attr("class", "region-label")
            .attr("x", 0)
            .attr("y", -radius * 1.3)
            .attr("text-anchor", "middle")
            .attr("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "13px")
            .attr("font-weight", "bold")
            .text(label);

        // Value label below
        gaugeGroup.append("text")
            .attr("class", "value-label")
            .attr("x", 0)
            .attr("y", radius * 0.5)
            .attr("text-anchor", "middle")
            .attr("fill", gaugeColor)
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text(value);
    }

    setYear(year) {
        this.selectedYear = year;
        this.updateVis();
    }

    setFilters(filters) {
        this.activeFilters = filters;
        this.updateVis();
    }

    setMapVis(mapVis) {
        this.mapVis = mapVis;
    }

    wrap(text, width) {
        text.each(function() {
            const textSel = d3.select(this);
            const original = textSel.text();
            const words = original.split(/\s+/);
            if (words.length === 1 && words[0].length > 12) {
                const word = words[0];
                const mid = Math.ceil(word.length / 2);
                const first = word.slice(0, mid);
                const second = word.slice(mid);
                textSel.text(null);
                textSel.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "0em")
                    .text(first);
                textSel.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.1em")
                    .text(second);
            } else {
                textSel.text(original);
            }
        });
    }

    highlightDistrict(neighborhoodName) {
        let vis = this;
        
        // Map neighborhood names to region names
        const neighborhoodToRegionMap = {
            "Downtown Toronto": "Toronto and East York",
            "Etobicoke": "Etobicoke York",
            "North York": "North York",
            "East York": "Toronto and East York",
            "York": "Etobicoke York",
            "Scarborough": "Scarborough"
        };
        
        let matchingRegion = neighborhoodToRegionMap[neighborhoodName] || neighborhoodName;
        
        // Find matching region in displayData
            let found = vis.displayData.find(d => 
            d[0] && d[0].toString().toLowerCase().includes(matchingRegion.toLowerCase())
            );
        
        if (!found && vis.displayData.length > 0) {
            // Try to find by name similarity
            let nameParts = neighborhoodName.toLowerCase().split(/\s+/);
            for (let data of vis.displayData) {
                let regionName = (data[0] || "").toLowerCase();
                if (nameParts.some(part => regionName.includes(part) || part.includes(regionName))) {
                    found = data;
                    break;
                }
            }
        }
        
        // Highlight the matching speedometer
        vis.svg.selectAll("g[class^='gauge-']")
            .attr("opacity", function() {
                if (found) {
                    const gaugeLabel = d3.select(this).select(".region-label").text();
                    if (gaugeLabel === found[0]) {
                    return 1;
                    } else {
                        return 0.3; // Dim other gauges
                    }
                }
                return 1;
            })
            .select(".needle")
            .attr("stroke", function() {
                if (found) {
                    const gaugeLabel = d3.select(this.parentNode).select(".region-label").text();
                    if (gaugeLabel === found[0]) {
                    return "#0066cc";
                    }
                }
                return "#FFD700";
            })
            .attr("stroke-width", function() {
                if (found) {
                    const gaugeLabel = d3.select(this.parentNode).select(".region-label").text();
                    if (gaugeLabel === found[0]) {
                        return 4;
                    }
                }
                return 3;
            });
        
        // Reset highlight after 3 seconds
        if (found) {
            setTimeout(() => {
                vis.svg.selectAll("g[class^='gauge-']")
                    .attr("opacity", 1)
                    .select(".needle")
                    .attr("stroke", "#FFD700")
                    .attr("stroke-width", 3);
            }, 3000);
        }
    }
}
