class LocationChart {
    constructor(parentElement, crashData) {
        this.parentElement = parentElement;
        this.data = crashData;
        this.selectedYear = null;
        this.activeFilters = ["Fatal","Major","Minor","Minimal"];
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Get container dimensions - make it bigger like conditions-visual
        let container = d3.select("#" + vis.parentElement).node();
        let containerWidth = container ? container.clientWidth : 850;
        let containerHeight = container ? container.clientHeight : 560;

        vis.margin = { top: 40, right: 10, bottom: 60, left: 60 };
        vis.width = containerWidth - vis.margin.left - vis.margin.right;
        vis.height = containerHeight - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select("#" + vis.parentElement)
            .html("")
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Y-axis label - WHITE
        vis.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.height / 2)
            .attr("y", -vis.margin.left + 25)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .text("Collisions");

        vis.x = d3.scaleBand().range([0, vis.width]).padding(0.3);
        vis.y = d3.scaleLinear().range([vis.height, 0]);

        vis.xAxis = vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxis = vis.svg.append("g")
            .attr("class", "y-axis");

        // Style Y axis - WHITE
        vis.yAxis.selectAll("text")
            .attr("fill", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");

        vis.yAxis.selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);
        
        vis.yAxis.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);

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

        let allDistricts = Array.from(new Set(filtered.map(d => d['DISTRICT'])));
        console.log("All districts:", allDistricts);

        counts.sort((a, b) => b[1] - a[1]);
        vis.displayData = counts.slice(0, 8);

        vis.avgCollisions = d3.mean(counts, d => d[1]);
    }

    updateVis() {
        const vis = this;
        vis.wrangleData();

        const maxCount = vis.displayData.length ? d3.max(vis.displayData, d => d[1]) : 1;

        vis.x.domain(vis.displayData.map(d => d[0]));
        vis.y.domain([0, maxCount * 1.2]);

        vis.xAxis
            .call(d3.axisBottom(vis.x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("fill", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .style("color", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "8.3px")
            .attr("dx", "1.01em")
            .attr("dy", "1em")
            .call(this.wrap, vis.x.bandwidth());

        // Style X axis lines - WHITE
        vis.xAxis.selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");
        
        vis.xAxis.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1)
            .style("stroke", "#FFFFFF");

        vis.yAxis.call(d3.axisLeft(vis.y).ticks(8));
        
        // Ensure Y axis is white - force all styles
        vis.yAxis.selectAll("text")
            .attr("fill", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", "12px");

        vis.yAxis.selectAll(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);
        
        vis.yAxis.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1);

        const bars = vis.svg.selectAll(".bar")
            .data(vis.displayData, d => d[0]);

        bars.enter().append("rect")
            .attr("class", "bar")
            .style("cursor", "pointer")
            .attr("x", d => vis.x(d[0]))
            .attr("width", vis.x.bandwidth())
            .attr("y", d => vis.y(d[1]))
            .attr("height", d => vis.height - vis.y(d[1]))
            .attr("fill", "#FFD700")
            .merge(bars)
            .style("cursor", "pointer")
            .on("mouseenter", function(event, d) {
                d3.select(this).attr("fill", "#FFA500").attr("opacity", 0.9);
            })
            .on("mouseleave", function(event, d) {
                d3.select(this).attr("fill", "#FFD700").attr("opacity", 1);
            })
            .on("click", function(event, d) {
                event.stopPropagation();
                if (vis.mapVis) {
                    vis.mapVis.zoomToDistrict(d[0]);
                }
            })
            .transition().duration(300)
            .attr("x", d => vis.x(d[0]))
            .attr("width", vis.x.bandwidth())
            .attr("y", d => vis.y(d[1]))
            .attr("height", d => vis.height - vis.y(d[1]))
            .attr("fill", "#FFD700");

        bars.exit().remove();

        const labels = vis.svg.selectAll(".bar-label")
            .data(vis.displayData, d => d[0]);

        labels.enter().append("text")
            .attr("class", "bar-label")
            .attr("x", d => vis.x(d[0]) + vis.x.bandwidth() / 2)
            .attr("y", d => vis.y(d[1]) - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#FFFFFF")
            .style("fill", "#FFFFFF")
            .attr("font-family", "Overpass, sans-serif")
            .text(d => d[1])
            .merge(labels)
            .transition().duration(300)
            .attr("x", d => vis.x(d[0]) + vis.x.bandwidth() / 2)
            .attr("y", d => vis.y(d[1]) - 5)
            .text(d => d[1]);

        vis.svg.selectAll(".avg-line").remove();

        vis.svg.append("line")
            .attr("class", "avg-line")
            .attr("x1", 0)
            .attr("x2", vis.width)
            .attr("y1", vis.y(vis.avgCollisions))
            .attr("y2", vis.y(vis.avgCollisions))
            .attr("stroke", "white")
            .attr("stroke-dasharray", "4 2")
            .attr("stroke-width", 2);

        vis.svg.selectAll(".avg-label").remove();
        vis.svg.append("text")
            .attr("class", "avg-label")
            .attr("x", vis.width - 5)
            .attr("y", vis.y(vis.avgCollisions) - 5)
            .attr("text-anchor", "end")
            .style("font-size", "10px")
            .style("fill", "white")
            .text(`Avg: ${Math.round(vis.avgCollisions)}`);

        labels.exit().remove();
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
        
        // Map neighborhood names to possible district names
        // This is a best-effort mapping since we don't know exact district names
        const neighborhoodToDistrictMap = {
            "Downtown Toronto": ["Downtown", "Downtown Toronto", "51", "52", "53"],
            "Etobicoke": ["Etobicoke", "22", "23", "31", "32", "33"],
            "North York": ["North York", "32", "33", "41", "42", "43"],
            "East York": ["East York", "54", "55"],
            "York": ["York", "12", "13", "14"],
            "Scarborough": ["Scarborough", "41", "42", "43", "44"]
        };
        
        // Try to find matching district
        let possibleDistricts = neighborhoodToDistrictMap[neighborhoodName] || [];
        let matchingDistrict = null;
        
        // Check if any of the possible districts exist in displayData
        for (let district of possibleDistricts) {
            let found = vis.displayData.find(d => 
                d[0] && (
                    d[0].toString().includes(district) || 
                    district.toString().includes(d[0].toString())
                )
            );
            if (found) {
                matchingDistrict = found[0];
                break;
            }
        }
        
        // If no exact match, try to find by name similarity
        if (!matchingDistrict && vis.displayData.length > 0) {
            // Try to find a district that contains part of the neighborhood name
            let nameParts = neighborhoodName.toLowerCase().split(/\s+/);
            for (let data of vis.displayData) {
                let districtName = (data[0] || "").toLowerCase();
                if (nameParts.some(part => districtName.includes(part) || part.includes(districtName))) {
                    matchingDistrict = data[0];
                    break;
                }
            }
        }
        
        // Highlight the matching bar
        vis.svg.selectAll(".bar")
            .attr("opacity", d => {
                if (matchingDistrict && d[0] === matchingDistrict) {
                    return 1;
                } else if (matchingDistrict) {
                    return 0.3; // Dim other bars
                }
                return 1; // No highlight, show all normally
            })
            .attr("stroke", d => {
                if (matchingDistrict && d[0] === matchingDistrict) {
                    return "#0066cc";
                }
                return "none";
            })
            .attr("stroke-width", d => {
                if (matchingDistrict && d[0] === matchingDistrict) {
                    return 3;
                }
                return 0;
            });
        
        // Reset highlight after 3 seconds
        if (matchingDistrict) {
            setTimeout(() => {
                vis.svg.selectAll(".bar")
                    .attr("opacity", 1)
                    .attr("stroke", "none")
                    .attr("stroke-width", 0);
            }, 3000);
        }
    }
}
