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

        vis.initVis()
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 0, right: 0, bottom: 40, left: 0};
        vis.width = 831 - vis.margin.left - vis.margin.right;
        // Use a positive inner height so content isn't clipped
        vis.height = 27;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Year scale
        vis.yearScale = d3.scaleTime()
            .domain([new Date(vis.yearRange[0], 0, 1), new Date(vis.yearRange[1], 0, 1)])
            .range([35, vis.width]);

        // Create slider track
        vis.track = vis.svg.append("rect")
            .attr("class", "timeline-track")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("rx", 7)
            .attr("fill", "#fff")
            .style("filter", "drop-shadow(0px 4px 1px rgba(0,0,0,0.25))");

        // Create dashed line
        vis.line = vis.svg.append("line")
            .attr("class", "timeline-line")
            .attr("x1", 0)
            .attr("y1", vis.height / 2)
            .attr("x2", vis.width)
            .attr("y2", vis.height / 2)
            .attr("stroke", "#000")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5");

        // Create triangular handle
        let initialX = vis.yearScale(new Date(vis.selectedYear, 0, 1));
        vis.handle = vis.svg.append("g")
            .attr("class", "timeline-handle")
            .attr("transform", `translate(${initialX}, ${vis.height / 2})`);

        vis.handle.append("polygon")
            .attr("points", "-18.5,-18.5 0,0 -18.5,18.5")
            .attr("fill", "#ec6b68")
            .attr("transform", "rotate(90)");

        // Year labels - dynamically generate based on year range
        vis.years = [];
        for (let y = vis.yearRange[0]; y <= vis.yearRange[1]; y += 2) {
            vis.years.push(y);
        }
        
        vis.yearLabels = vis.svg.selectAll(".year-label")
            .data(vis.years)
            .enter()
            .append("text")
            .attr("class", "year-label")
            .attr("x", d => vis.yearScale(new Date(d, 0, 1)))
            .attr("y", vis.height + 20)
            .attr("text-anchor", "middle")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-weight", 800)
            .attr("font-size", "16px")
            .attr("fill", "#000")
            .text(d => d);

        // Drag functionality
        vis.drag = d3.drag()
            .on("start", function(event) {
                d3.select(this).raise();
            })
            .on("drag", function(event) {
                let x = Math.max(13, Math.min(vis.width - 13, event.x));
                vis.handle.attr("transform", `translate(${x}, ${vis.height / 2})`);
                
                // Calculate year from position
                let year = Math.round(vis.yearScale.invert(x).getFullYear());
                if (year !== vis.selectedYear && year >= vis.yearRange[0] && year <= vis.yearRange[1]) {
                    vis.selectedYear = year;
                    if (vis.onYearChange) {
                        vis.onYearChange(year);
                    }
                }
            });

        vis.handle.call(vis.drag);

        d3.select("#playButton").on("click", function() {
            if (vis.isPlaying) {
                vis.pause();
                d3.select(this).text("▶");
            } else {
                vis.play();
                d3.select(this).text("⏸");
            }
        });

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
            let x = vis.yearScale(new Date(year, 0, 1));
            vis.handle.transition().duration(800).ease(d3.easeCubicOut)
                .attr("transform", `translate(${x}, ${vis.height / 2})`);
        }
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

        vis.playInterval = d3.interval(() => {
            let nextYear = vis.selectedYear + 1;
            if (nextYear > vis.yearRange[1]) {
                vis.pause();
                d3.select("#playButton").text("▶");
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
    }
}

