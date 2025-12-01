/* * * * * * * * * * * * * * *
*          MapVis             *
* * * * * * * * * * * * * * */

class MapVis {

    constructor(parentElement, crashData, geoData) {
        let vis = this;
        vis.parentElement = parentElement;
        vis.crashData = crashData;
        vis.geoData = geoData;
        vis.selectedYear = 2003;
        vis.activeFilters = ['Fatal', 'Major', 'Minor', 'Minimal'];

        // Severity colors
        vis.severityColors = {
            'Fatal': 'rgba(226,55,55,0.76)',
            'Major': 'rgba(237,119,55,0.8)',
            'Minor': 'rgba(237,225,55,0.8)',
            'Minimal': 'rgba(128,128,128,0.8)'
        };

        // Don't auto-initialize - let main.js control initialization
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 0, right: 0, bottom: 0, left: 0};
        // Get actual container dimensions
        let container = d3.select("#" + vis.parentElement).node();
        if (container) {
            // Account for padding
            const padding = 40; // 20px on each side
            vis.width = Math.max(850, (container.clientWidth || 1170) - padding);
            vis.height = Math.max(560, (container.clientHeight || 784) - padding);
        } else {
            vis.width = 1170 - vis.margin.left - vis.margin.right;
            vis.height = 784 - vis.margin.top - vis.margin.bottom;
        }

        // init drawing area
        vis.svgElement = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .style("cursor", "grab");
        
        vis.svg = vis.svgElement
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Calculate bounds from data or use default Toronto bounds
        if (vis.crashData && vis.crashData.length > 0) {
            let lats = vis.crashData.map(d => +d.LATITUDE).filter(d => !isNaN(d) && d > 0);
            let lngs = vis.crashData.map(d => +d.LONGITUDE).filter(d => !isNaN(d) && d < 0);
            if (lats.length > 0 && lngs.length > 0) {
                vis.latMin = d3.min(lats);
                vis.latMax = d3.max(lats);
                vis.lngMin = d3.min(lngs);
                vis.lngMax = d3.max(lngs);
                // Add padding
                let latPadding = (vis.latMax - vis.latMin) * 0.1;
                let lngPadding = (vis.lngMax - vis.lngMin) * 0.1;
                vis.latMin -= latPadding;
                vis.latMax += latPadding;
                vis.lngMin -= lngPadding;
                vis.lngMax += lngPadding;
            } else {
                // Default Toronto bounds
                vis.latMin = 43.58;
                vis.latMax = 43.85;
                vis.lngMin = -79.65;
                vis.lngMax = -79.11;
            }
        } else {
            // Default Toronto bounds
            vis.latMin = 43.58;
            vis.latMax = 43.85;
            vis.lngMin = -79.65;
            vis.lngMax = -79.11;
        }

        // Set up coordinate scales
        vis.xScale = d3.scaleLinear()
            .domain([vis.lngMin, vis.lngMax])
            .range([0, vis.width]);

        vis.yScale = d3.scaleLinear()
            .domain([vis.latMin, vis.latMax])
            .range([vis.height, 0]);

        // Store scales for use in wrangleData
        vis.latScale = vis.yScale;
        vis.lngScale = vis.xScale;

        // Draw map background 
        vis.mapBackground = vis.svg.append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("fill", "#f5f5f5")
            .attr("rx", 12);

        // Create projection centered on Toronto (always create it for labels)
            let centerLng = (vis.lngMin + vis.lngMax) / 2;
            let centerLat = (vis.latMin + vis.latMax) / 2;
            
            vis.projection = d3.geoMercator()
                .center([centerLng, centerLat])
                .scale(vis.width * 100)
                .translate([vis.width / 2, vis.height / 2]);

            vis.path = d3.geoPath()
                .projection(vis.projection);

        // Draw GeoJSON if available
        if (vis.geoData && vis.geoData.features && vis.geoData.features.length > 0) {
            // Draw roads
            vis.roads = vis.svg.selectAll(".road")
                .data(vis.geoData.features)
                .enter()
                .append("path")
                .attr("class", "road")
                .attr("d", vis.path)
                .attr("fill", "none")
                .attr("stroke", "#a7a7a7")
                .attr("stroke-width", 0.3)
                .style("opacity", 1);
            
            console.log("Roads drawn:", vis.roads.size());
        } else {
            console.warn("No geoData or features available for roads. geoData:", vis.geoData);
        }

        // Define neighborhood labels data
        vis.neighborhoods = [
            { name: "Downtown Toronto", lat: 43.6537, lng: -79.3819 },
            { name: "Etobicoke", lat: 43.6439, lng: -79.5643 },
            { name: "North York", lat: 43.7722, lng: -79.4140 },
            { name: "East York", lat: 43.6922, lng: -79.3291 },
            { name: "York", lat: 43.6904, lng: -79.4786 },
            { name: "Scarborough", lat: 43.7728, lng: -79.2582 }
        ];

        // Draw neighborhood labels
        vis.neighborhoodLabels = vis.svg.selectAll(".neighborhood-label")
            .data(vis.neighborhoods)
            .enter()
            .append("text")
            .attr("class", "neighborhood-label")
            .attr("x", d => vis.projection([d.lng, d.lat])[0])
            .attr("y", d => vis.projection([d.lng, d.lat])[1])
            .attr("text-anchor", "middle")
            .attr("dy", "-0.5em")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .attr("stroke", "white")
            .attr("stroke-width", "0.3px")
            .attr("paint-order", "stroke")
            .style("cursor", "pointer")
            .on("mouseenter", function() {
                d3.select(this).attr("fill", "#0066cc").attr("font-size", "13px");
            })
            .on("mouseleave", function() {
                d3.select(this).attr("fill", "#333").attr("font-size", "12px");
            })
            .on("click", function(event, d) {
                event.stopPropagation();
                vis.zoomToNeighborhood(d);
            })
            .text(d => d.name);

        // CrashPointsVis will be created and initialized from main.js
        // Don't create it here to allow main.js to control initialization

        // Store initial projection parameters
        if (vis.projection) {
            vis.initialScale = vis.projection.scale();
            vis.initialCenter = vis.projection.center();
            
            // Helper function to update all map elements
            vis.updateMapElements = function() {
                // Update the path generator
                vis.path = d3.geoPath().projection(vis.projection);
                
                // Update roads
                vis.svg.selectAll(".road").attr("d", vis.path);
                
                // Update crash points coordinates using CrashPointsVis
                if (vis.crashPointsVis) {
                    vis.crashPointsVis.updateCoordinates(vis.projection);
                }
                
                // Update improvement circles coordinates if improvements view is active
                if (vis.improvementsVis) {
                    vis.improvementsVis.updateCoordinates(vis.projection);
                }
                
                // Update neighborhood labels
                let labels = vis.svg.selectAll(".neighborhood-label");
                if (!labels.empty()) {
                    // Calculate current zoom scale factor
                    let currentScale = vis.projection.scale();
                    let scaleFactor = currentScale / vis.initialScale;
                    let fontSize = Math.max(10, Math.min(16, 12 * scaleFactor));
                    
                    labels
                        .attr("x", function(d) {
                            if (d && d.lng !== undefined && d.lat !== undefined) {
                                let coords = vis.projection([d.lng, d.lat]);
                                return coords ? coords[0] : 0;
                            }
                            return 0;
                        })
                        .attr("y", function(d) {
                            if (d && d.lng !== undefined && d.lat !== undefined) {
                                let coords = vis.projection([d.lng, d.lat]);
                                return coords ? coords[1] : 0;
                            }
                            return 0;
                        })
                        .attr("font-size", fontSize + "px");
                    
                    // Move labels to the front (on top of crash points)
                    labels.each(function() {
                        this.parentNode.appendChild(this);
                    });
                }
            };
            
            // Store initial state for panning
            let initialCenter, startPoint, isDragging = false;
            
            // Set up zoom behavior (handles scroll zoom and drag pan)
            vis.zoom = d3.zoom()
                .scaleExtent([0.5, 10]) // Allow zoom from 0.5x to 10x
                .on("start", function(event) {
                    // Check if this is a drag (mousedown) or zoom (wheel)
                    if (event.sourceEvent && event.sourceEvent.type === "mousedown") {
                        isDragging = true;
                        // Change cursor to move when dragging
                        vis.svgElement.style("cursor", "move");
                        // Store the initial center when drag starts
                        initialCenter = vis.projection.center();
                        // Store the starting point in geographic coordinates
                        startPoint = vis.projection.invert([event.sourceEvent.x, event.sourceEvent.y]);
                    } else {
                        isDragging = false;
                    }
                })
                .on("zoom", function(event) {
                    // Always update projection scale based on zoom transform
                    vis.projection.scale(event.transform.k * vis.initialScale);
                    
                    // Handle panning during drag
                    if (isDragging && event.sourceEvent && startPoint) {
                        // Get the current point under the mouse in geographic coordinates
                        let currentPoint = vis.projection.invert([event.sourceEvent.x, event.sourceEvent.y]);
                        if (currentPoint) {
                            // Calculate the geographic delta
                            let deltaLng = startPoint[0] - currentPoint[0];
                            let deltaLat = startPoint[1] - currentPoint[1];
                            
                            // Update the projection center
                            vis.projection.center([
                                initialCenter[0] + deltaLng,
                                initialCenter[1] + deltaLat
                            ]);
                        }
                    } else if (vis.programmaticCenter) {
                        // Handle programmatic center changes (from neighborhood clicks)
                        vis.projection.center(vis.programmaticCenter);
                        vis.programmaticCenter = null; // Clear after use
                    }
                    
                    // Update all map elements
                    vis.updateMapElements();
                })
                .on("end", function(event) {
                    isDragging = false;
                    // Change cursor back to grab when not dragging
                    vis.svgElement.style("cursor", "grab");
                });
            
            // Apply zoom behavior to the SVG (handles both scroll zoom and drag pan)
            vis.svgElement.call(vis.zoom);
        }

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // Filter data by year and severity
        vis.displayData = vis.crashData.filter(d => {
            // Try Year column first, then Year of collision
            let year = +d.Year || +d['Year of collision'] || 0;
            let injury = (d.Injury || '').trim();
            let classification = (d['Accident Classification'] || '').trim();
            
            // Map injury/classification to severity
            let severity = 'Minimal';
            if (injury === 'Fatal' || classification === 'Fatal') {
                severity = 'Fatal';
            } else if (injury === 'Major' || classification.includes('Major')) {
                severity = 'Major';
            } else if (injury === 'Minor' || classification.includes('Minor')) {
                severity = 'Minor';
            } else if (injury === 'Minimal') {
                severity = 'Minimal';
            } else if (injury === 'None' || !injury) {
                severity = 'Minimal';
            }

            return year === vis.selectedYear && 
                   vis.activeFilters.includes(severity) &&
                   d.LATITUDE && 
                   d.LONGITUDE &&
                   !isNaN(+d.LATITUDE) && 
                   !isNaN(+d.LONGITUDE);
        }).map(d => {
            let injury = (d.Injury || '').trim();
            let classification = (d['Accident Classification'] || '').trim();
            
            // Map to severity
            let severity = 'Minimal';
            if (injury === 'Fatal' || classification === 'Fatal') {
                severity = 'Fatal';
            } else if (injury === 'Major' || classification.includes('Major')) {
                severity = 'Major';
            } else if (injury === 'Minor' || classification.includes('Minor')) {
                severity = 'Minor';
            } else if (injury === 'Minimal') {
                severity = 'Minimal';
            } else if (injury === 'None' || !injury) {
                severity = 'Minimal';
            }

            return {
                lat: +d.LATITUDE,
                lng: +d.LONGITUDE,
                severity: severity,
                x: vis.xScale(+d.LONGITUDE),
                y: vis.yScale(+d.LATITUDE)
            };
        });

        // Group by location to cluster overlapping points (within 5px)
        let clusterMap = {};
        vis.displayData.forEach(d => {
            // Round to nearest 5 pixels for clustering
            let roundedX = Math.round(d.x / 5) * 5;
            let roundedY = Math.round(d.y / 5) * 5;
            let key = roundedX + '_' + roundedY;
            if (!clusterMap[key]) {
                clusterMap[key] = [];
            }
            clusterMap[key].push(d);
        });

        // Create cluster data with size
        vis.clusteredData = Object.values(clusterMap).map(cluster => {
            let basePoint = cluster[0];
            let severityCounts = {
                'Fatal': 0,
                'Major': 0,
                'Minor': 0,
                'Minimal': 0
            };
            cluster.forEach(d => severityCounts[d.severity]++);
            
            // Determine dominant severity
            let dominantSeverity = Object.keys(severityCounts).reduce((a, b) => 
                severityCounts[a] > severityCounts[b] ? a : b
            );

            // Size based on cluster size
            let size = Math.min(61, Math.max(3, 3 + cluster.length * 3));

            return {
                x: basePoint.x,
                y: basePoint.y,
                lat: basePoint.lat,
                lng: basePoint.lng,
                severity: dominantSeverity,
                size: size,
                count: cluster.length
            };
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update crash points using CrashPointsVis (follows initVis -> wrangleData -> updateVis pattern)
        // Only update crashpoints if we're in map view, not in improvements view
        if (vis.crashPointsVis && vis.currentView === 'map') {
            vis.crashPointsVis.wrangleData(vis.clusteredData);
        }
        
        // Update improvement circles coordinates if improvements view is active
        if (vis.improvementsVis) {
            vis.improvementsVis.updateCoordinates(vis.projection);
        }
        
        // Move labels to the front (on top of crash points)
        vis.svg.selectAll(".neighborhood-label")
            .each(function() {
                this.parentNode.appendChild(this);
            });
    }

    setYear(year) {
        let vis = this;
        vis.selectedYear = year;
        vis.wrangleData();
    }

    setFilters(filters) {
        let vis = this;
        vis.activeFilters = filters;
        vis.wrangleData();
    }

    zoomToNeighborhood(neighborhood) {
        let vis = this;
        
        // Calculate zoom scale to show the neighborhood area
        // Use a scale that shows about 1/3 of the map area centered on the neighborhood
        let zoomLevel = 2.5; // Zoom in 2.5x
        
        // Update projection center immediately
        vis.projection.center([neighborhood.lng, neighborhood.lat]);
        
        // Store the target center for the zoom handler to maintain during transition
        vis.programmaticCenter = [neighborhood.lng, neighborhood.lat];
        
        // Calculate the transform that matches our projection changes
        // The transform scale factor is relative to initial scale
        let transform = d3.zoomIdentity
            .scale(zoomLevel);
        
        // Apply the zoom transform with transition
        vis.svgElement
            .transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .call(vis.zoom.transform, transform)
            .on("end", function() {
                // Clear programmatic center flag after transition
                vis.programmaticCenter = null;
            });
    }

    zoomToLocation(lat, lng) {
        let vis = this;
        
        // Calculate zoom scale to show the location area
        let zoomLevel = 3.0; // Zoom in 3x for improvement circles
        
        // Update projection center immediately
        vis.projection.center([lng, lat]);
        
        // Store the target center for the zoom handler to maintain during transition
        vis.programmaticCenter = [lng, lat];
        
        // Calculate the transform that matches our projection changes
        let transform = d3.zoomIdentity
            .scale(zoomLevel);
        
        // Apply the zoom transform with transition
        vis.svgElement
            .transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .call(vis.zoom.transform, transform)
            .on("end", function() {
                // Clear programmatic center flag after transition
                vis.programmaticCenter = null;
            });
    }
}

