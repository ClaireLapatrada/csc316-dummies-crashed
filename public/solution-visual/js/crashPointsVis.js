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
        let getX = function (d) {
            if (vis.projection) {
                return vis.projection([d.lng, d.lat])[0];
            }
            return d.x;
        };

        // Helper function to get y coordinate
        let getY = function (d) {
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
            .attr("stroke-width", 1);

        // Merge - Combine enter and update selections, set final state
        let merge = enter.merge(crashPoints);

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
                .attr("cx", function (d) {
                    if (d && d.lng !== undefined && d.lat !== undefined && vis.projection) {
                        let coords = vis.projection([d.lng, d.lat]);
                        return coords ? coords[0] : 0;
                    }
                    return d.x || 0;
                })
                .attr("cy", function (d) {
                    if (d && d.lng !== undefined && d.lat !== undefined && vis.projection) {
                        let coords = vis.projection([d.lng, d.lat]);
                        return coords ? coords[1] : 0;
                    }
                    return d.y || 0;
                });
        }

    }

}

