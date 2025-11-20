/* * * * * * * * * * * * * * *
*        TimelineVis          *
* * * * * * * * * * * * * * */

class TimelineVis {

    constructor(parentElement, yearRange) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.yearRange = yearRange || [2006, 2024];
        vis.selectedYear = vis.yearRange[0];
        vis.onYearChange = null;

        vis.isPlaying = false;
        vis.playInterval = null;
    }

    initVis() {
        let vis = this;

        vis.margin = {left: 60, right: 60, top: 30, bottom: 30};
        vis.width = 800;
        vis.height = 140;

        const trackY = vis.height / 2;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .style("display", "block")
            .style("margin", "0 auto");

        // Year scale
        vis.yearScale = d3.scaleLinear()
            .domain([vis.yearRange[0], vis.yearRange[1]])
            .range([vis.margin.left, vis.width - vis.margin.right]);

        // Create track background (road-like)
        vis.svg.append("rect")
            .attr("x", vis.margin.left - 25)
            .attr("y", trackY - 25)
            .attr("width", vis.width - vis.margin.left - vis.margin.right + 50)
            .attr("height", 50)
            .attr("rx", 12)
            .attr("fill", "#2f2f2f")
            .attr("stroke", "#555")
            .attr("stroke-width", 2);

        // Road center line (dashed)
        vis.svg.append("line")
            .attr("x1", vis.margin.left - 5)
            .attr("x2", vis.width - vis.margin.right + 5)
            .attr("y1", trackY)
            .attr("y2", trackY)
            .attr("stroke", "#dcdcdc")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "10,10")
            .attr("stroke-linecap", "round");

        // Year labels above the track
        vis.years = d3.range(vis.yearRange[0], vis.yearRange[1] + 1);
        
        vis.yearLabels = vis.svg.selectAll(".year-label")
            .data(vis.years)
            .enter()
            .append("text")
            .attr("class", "year-label")
            .attr("x", d => vis.yearScale(d))
            .attr("y", trackY - 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", d => d === vis.selectedYear ? "#ffeb3b" : "#ccc")
            .attr("font-weight", d => d === vis.selectedYear ? "bold" : "normal")
            .style("pointer-events", "none")
            .text(d => d);

        // Create car slider
        const carWidth = 36;
        const carHeight = 20;

        vis.handle = vis.svg.append("g")
            .attr("class", "car-slider")
            .attr("transform", `translate(${vis.yearScale(vis.selectedYear) - carWidth/2}, ${trackY - carHeight/2})`)
            .style("cursor", "grab");

        // Car body (main rectangle)
        vis.handle.append("rect")
            .attr("width", carWidth)
            .attr("height", carHeight)
            .attr("rx", 4)
            .attr("fill", "#ff4757")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        // Car windows
        vis.handle.append("rect")
            .attr("x", 4)
            .attr("y", 4)
            .attr("width", 12)
            .attr("height", 8)
            .attr("rx", 2)
            .attr("fill", "#87CEEB");

        vis.handle.append("rect")
            .attr("x", 20)
            .attr("y", 4)
            .attr("width", 12)
            .attr("height", 8)
            .attr("rx", 2)
            .attr("fill", "#87CEEB");

        // Car wheels
        vis.handle.append("circle")
            .attr("cx", 8)
            .attr("cy", carHeight)
            .attr("r", 4)
            .attr("fill", "#333")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        vis.handle.append("circle")
            .attr("cx", carWidth - 8)
            .attr("cy", carHeight)
            .attr("r", 4)
            .attr("fill", "#333")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        // Headlights
        vis.handle.append("circle")
            .attr("cx", 2)
            .attr("cy", 8)
            .attr("r", 2)
            .attr("fill", "#ffeb3b");

        vis.handle.append("circle")
            .attr("cx", carWidth - 2)
            .attr("cy", 8)
            .attr("r", 2)
            .attr("fill", "#ffeb3b");

        vis.carWidth = carWidth;
        vis.carHeight = carHeight;

        // Drag functionality
        vis.drag = d3.drag()
            .on("start", function(event) {
                d3.select(this).raise();
                d3.select(this).style("cursor", "grabbing");
            })
            .on("drag", function(event) {
                let x = Math.max(vis.margin.left, Math.min(vis.width - vis.margin.right, event.x));
                const trackY = vis.height / 2;
                vis.handle.attr("transform", `translate(${x - vis.carWidth/2}, ${trackY - vis.carHeight/2})`);
                
                // Calculate year from position
                let year = Math.round(vis.yearScale.invert(x));
                year = Math.max(vis.yearRange[0], Math.min(vis.yearRange[1], year));
                
                if (year !== vis.selectedYear) {
                    vis.selectedYear = year;
                    vis._updateYearLabels();
                    if (vis.onYearChange) {
                        vis.onYearChange(year);
                    }
                }
            })
            .on("end", function(event) {
                d3.select(this).style("cursor", "grab");
            });

        vis.handle.call(vis.drag);

        // Play button click handler is now in main.js

        vis.updateVis();
    }

    wrangleData() {
        let vis = this;
        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        // Handle position is updated in drag handler
    }

    setYear(year) {
        let vis = this;
        if (year >= vis.yearRange[0] && year <= vis.yearRange[1]) {
            vis.selectedYear = year;
            const trackY = vis.height / 2;
            let x = vis.yearScale(year);
            vis.handle.transition().duration(800).ease(d3.easeCubicOut)
                .attr("transform", `translate(${x - vis.carWidth/2}, ${trackY - vis.carHeight/2})`);
            vis._updateYearLabels();
        }
    }

    _updateYearLabels() {
        let vis = this;
        vis.yearLabels
            .attr("fill", d => d === vis.selectedYear ? "#ffeb3b" : "#ccc")
            .attr("font-weight", d => d === vis.selectedYear ? "bold" : "normal");
    }

    animateToYear(year) {
        let vis = this;
        vis.setYear(year);
        if (vis.onYearChange) {
            setTimeout(() => vis.onYearChange(year), 700);
        }
    }

    play() {
        let vis = this;
        vis.isPlaying = true;
        
        // Update play button state
        d3.select("#playButton").classed("playing", true);
        let improvementsPlayButton = d3.select("#improvementsPlayButton");
        if (!improvementsPlayButton.empty()) {
            improvementsPlayButton.classed("playing", true);
        }

        vis.playInterval = d3.interval(() => {
            let nextYear = vis.selectedYear + 1;
            if (nextYear > vis.yearRange[1]) {
                vis.pause();
            } else {
                vis.animateToYear(nextYear);
            }
        }, 1700);
    }

    pause() {
        let vis = this;
        vis.isPlaying = false;
        if (vis.playInterval) {
            vis.playInterval.stop();
            vis.playInterval = null;
        }
        
        // Update play button state
        d3.select("#playButton").classed("playing", false);
        let improvementsPlayButton = d3.select("#improvementsPlayButton");
        if (!improvementsPlayButton.empty()) {
            improvementsPlayButton.classed("playing", false);
        }
    }
}

