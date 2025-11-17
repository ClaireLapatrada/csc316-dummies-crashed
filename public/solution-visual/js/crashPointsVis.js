/* * * * * * * * * * * * * * *
*      CrashPointsVis         *
* * * * * * * * * * * * * * */

class CrashPointsVis {

    constructor(svg, projection, severityColors) {
        let vis = this;
        vis.svg = svg;
        vis.projection = projection;
        vis.severityColors = severityColors;
        
        // Don't auto-initialize - let main.js control initialization
    }

    initVis() {
        let vis = this;
        
        // Initialize data storage
        vis.displayData = [];
        
        // Initialize tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "crash-point-tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("font-size", "12px")
            .style("z-index", "1000");
    }

    wrangleData(data) {
        let vis = this;
        
        // Store the processed data
        vis.displayData = data || [];
        
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Helper function to get x coordinate (use projection if available, otherwise use linear scale)
        let getX = function(d) {
            if (vis.projection) {
                return vis.projection([d.lng, d.lat])[0];
            }
            return d.x;
        };
        
        // Helper function to get y coordinate (use projection if available, otherwise use linear scale)
        let getY = function(d) {
            if (vis.projection) {
                return vis.projection([d.lng, d.lat])[1];
            }
            return d.y;
        };

        // D3 update pattern - Bind data with key function
        let crashPoints = vis.svg.selectAll(".crash-point")
            .data(vis.displayData, d => d.x + '_' + d.y);

        // Exit - Remove elements that are no longer in the data
        crashPoints.exit()
            .remove();

        // Enter - Add new elements with initial state
        let enter = crashPoints.enter()
            .append("circle")
            .attr("class", "crash-point")
            .attr("cx", getX)
            .attr("cy", getY)
            .attr("r", 0)
            .attr("opacity", 0)
            .attr("fill", d => vis.severityColors[d.severity])
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .on("mouseover", function(event, d) {
                vis.showTooltip(event, d);
            })
            .on("mousemove", function(event) {
                vis.moveTooltip(event);
            })
            .on("mouseout", function() {
                vis.hideTooltip();
            });

        // Merge - Combine enter and update selections, set final state
        let merge = enter.merge(crashPoints);

        // Add event handlers to existing crash points as well
        crashPoints.on("mouseover", function(event, d) {
                vis.showTooltip(event, d);
            })
            .on("mousemove", function(event) {
                vis.moveTooltip(event);
            })
            .on("mouseout", function() {
                vis.hideTooltip();
            });

        merge
            .attr("cx", getX)
            .attr("cy", getY)
            .attr("r", d => d.size / 2)
            .attr("opacity", 0.8)
            .attr("fill", d => vis.severityColors[d.severity]);
    }

    // Update positions of existing crash points when map zooms/pans
    updateCoordinates(projection) {
        let vis = this;
        vis.projection = projection;

        let crashPoints = vis.svg.selectAll(".crash-point");
        if (!crashPoints.empty()) {
            crashPoints
                .attr("cx", function(d) {
                    if (d && d.lng !== undefined && d.lat !== undefined && vis.projection) {
                        let coords = vis.projection([d.lng, d.lat]);
                        return coords ? coords[0] : 0;
                    }
                    return d.x || 0;
                })
                .attr("cy", function(d) {
                    if (d && d.lng !== undefined && d.lat !== undefined && vis.projection) {
                        let coords = vis.projection([d.lng, d.lat]);
                        return coords ? coords[1] : 0;
                    }
                    return d.y || 0;
                });
        }
    }

    showTooltip(event, d) {
        let vis = this;
        vis.tooltip
            .style("opacity", 1)
            .html(`Number of crashes: ${d.count || 1}`);
        vis.moveTooltip(event);
    }

    moveTooltip(event) {
        let vis = this;
        vis.tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }

    hideTooltip() {
        let vis = this;
        vis.tooltip
            .style("opacity", 0);
    }
}

