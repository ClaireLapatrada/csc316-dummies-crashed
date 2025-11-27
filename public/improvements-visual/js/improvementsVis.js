/* * * * * * * * * * * * * * *
*      ImprovementsVis        *
* * * * * * * * * * * * * * */

class ImprovementsVis {

    constructor(svg, projection, crashData, yearScroll) {
        let vis = this;
        vis.svg = svg;
        vis.projection = projection;
        vis.crashData = crashData;
        vis.yearScroll = yearScroll; // Reference to yearScroll
        
        // Improvement types configuration
        vis.improvementTypes = {
            'speeding': {
                label: 'Speeding',
                improvement: 'Dynamic Speed Signs',
                color: 'rgba(237,225,55,0.8)',
                url: 'https://roadsafetystrategy.ca/en/listing-directory/roadsafetystrategy/changeable_%28variable%2C_dynamic%2C_active%29_message_signs'
            },
            'dark': {
                label: 'Dark',
                improvement: 'Street Lighting',
                color: 'rgba(0,0,0,0.64)',
                url: 'https://roadsafetystrategy.ca/en/listing-directory/roadsafetystrategy/street_lighting_and_illumination'
            },
            'ice': {
                label: 'Ice',
                improvement: 'Anti-icing Technology',
                color: 'rgba(58,93,220,0.8)',
                url: 'https://roadsafetystrategy.ca/en/listing-directory/roadsafetystrategy/anti-icing_technology'
            },
            'inattentive': {
                label: 'Inattentive Driver',
                improvement: 'Rumble Strips',
                color: 'rgba(98,228,165,0.8)',
                url: 'https://roadsafetystrategy.ca/en/listing-directory/roadsafetystrategy/rumble_strips'
            }
        };
        
        vis.selectedYear = null;
        vis.activeFactors = ['speeding', 'dark', 'ice', 'inattentive'];
        vis.displayData = [];
        vis.factorMaxNeeds = {}; // Store max needs per factor for consistent sizing
    }

    initVis() {
        let vis = this;
        
        // Initialize tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "improvement-tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("font-size", "12px")
            .style("z-index", "1000");
        
        // Hide circles initially
        vis.hide();
    }

    wrangleData(crashData, year) {
        let vis = this;
        
        vis.selectedYear = year;
        
        // Calculate max needs for all factors first (before filtering by activeFactors)
        // This ensures consistent sizing regardless of filter selection
        ['speeding', 'dark', 'ice', 'inattentive'].forEach(factorKey => {
            let factorData = vis.filterByFactor(crashData, year, factorKey);
            let factorCounts = vis.countByLocation(factorData, factorKey);
            vis.factorMaxNeeds[factorKey] = factorCounts.length > 0 ? 
                d3.max(factorCounts, d => d.count) : 1;
        });
        
        // Now filter by active factors
        vis.displayData = [];
        
        vis.activeFactors.forEach(factorKey => {
            let factorData = vis.filterByFactor(crashData, year, factorKey);
            let factorCounts = vis.countByLocation(factorData, factorKey);
            
            factorCounts.forEach(d => {
                vis.displayData.push({
                    lat: d.lat,
                    lng: d.lng,
                    factor: factorKey,
                    needLevel: d.count,
                    improvement: vis.improvementTypes[factorKey].improvement,
                    color: vis.improvementTypes[factorKey].color
                });
            });
        });
        
        vis.updateVis();
    }

    filterByFactor(crashData, year, factorKey) {
        let vis = this;
        
        return crashData.filter(d => {
            let crashYear = +d.Year || +d['Year of collision'] || 0;
            if (crashYear !== year) return false;
            
            // Check if crash matches the factor
            switch(factorKey) {
                case 'speeding':
                    // Check "Speeding Related" column
                    let speeding = (d['Speeding Related'] || '').toString().trim().toLowerCase();
                    return speeding === 'yes' || speeding === '1' || speeding === 'true';
                
                case 'dark':
                    // Check "LIGHT" column for dark conditions
                    let light = (d.LIGHT || '').toString().trim();
                    return light === 'Dark' || light === 'Dusk' || light === 'Dawn';
                
                case 'ice':
                    // Check "Road Surface Condition" for ice
                    let roadSurface = (d['Road Surface Condition'] || '').toString().trim();
                    return roadSurface.toLowerCase().includes('ice') || 
                           roadSurface.toLowerCase().includes('icy') ||
                           roadSurface.toLowerCase().includes('snow');
                
                case 'inattentive':
                    // Check "Aggressive and Distracted Driving Related"
                    let aggressive = (d['Aggressive and Distracted Driving Related'] || '').toString().trim().toLowerCase();
                    return aggressive === 'yes' || aggressive === '1' || aggressive === 'true';
                
                default:
                    return false;
            }
        });
    }

    countByLocation(crashes, factorKey) {
        let vis = this;
        
        // Group by rounded location (cluster nearby crashes within ~100 meters)
        let clusterMap = {};
        const clusterRadius = 0.001; // ~100 meters in degrees
        
        crashes.forEach(d => {
            if (!d.LATITUDE || !d.LONGITUDE || isNaN(d.LATITUDE) || isNaN(d.LONGITUDE)) return;
            
            // Round to cluster radius
            let roundedLat = Math.round(d.LATITUDE / clusterRadius) * clusterRadius;
            let roundedLng = Math.round(d.LONGITUDE / clusterRadius) * clusterRadius;
            let key = roundedLat + '_' + roundedLng;
            
            if (!clusterMap[key]) {
                clusterMap[key] = {
                    lat: roundedLat,
                    lng: roundedLng,
                    count: 0
                };
            }
            clusterMap[key].count++;
        });
        
        return Object.values(clusterMap);
    }

    updateVis() {
        let vis = this;

        // Helper function to get x coordinate
        let getX = function(d) {
            if (vis.projection && d.lng !== undefined && d.lat !== undefined) {
                let coords = vis.projection([d.lng, d.lat]);
                if (coords && (coords[0] < 0 || coords[0] > 10000 || coords[1] < 0 || coords[1] > 10000)) {
                    console.log('Suspicious coordinates:', d.lat, d.lng, '->', coords);
                }
                return coords ? coords[0] : 0;
            }
            return 0;
        };
        
        // Helper function to get y coordinate
        let getY = function(d) {
            if (vis.projection && d.lng !== undefined && d.lat !== undefined) {
                let coords = vis.projection([d.lng, d.lat]);
                return coords ? coords[1] : 0;
            }
            return 0;
        };
        
        // Calculate radius scale independently for each factor
        let radiusScales = {};
        let minRadius = 3; // Smaller circles
        let maxRadius = 15; // Smaller circles
        
        ['speeding', 'dark', 'ice', 'inattentive'].forEach(factorKey => {
            let maxNeed = vis.factorMaxNeeds[factorKey] || 1; // Use stored max needs
            radiusScales[factorKey] = d3.scaleSqrt()
                .domain([1, maxNeed])
                .range([minRadius, maxRadius]);
        });

        // Ensure circles are visible
        vis.show();
        
        let improvementCircles = vis.svg.selectAll(".improvement-circle")
            .data(vis.displayData, d => d.lat + '_' + d.lng + '_' + d.factor);

        // Exit - Remove elements that are no longer in the data
        improvementCircles.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .attr("opacity", 0)
            .remove();

        // Enter - Add new elements with initial state
        let enter = improvementCircles.enter()
            .append("circle")
            .attr("class", "improvement-circle")
            .attr("cx", getX)
            .attr("cy", getY)
            .attr("r", 0)
            .attr("opacity", 0)
            .attr("fill", d => d.color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .style("pointer-events", "all")
            .style("display", "block")
            .style("z-index", "10")
            .raise() // Move to front
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
        let merge = enter.merge(improvementCircles);

        merge
            .transition()
            .duration(300)
            .attr("cx", getX)
            .attr("cy", getY)
            .attr("r", d => {
                let scale = radiusScales[d.factor];
                return scale ? scale(d.needLevel) : minRadius;
            })
            .attr("opacity", 0.8)
            .attr("fill", d => d.color);
    }

    showTooltip(event, d) {
        let vis = this;
        vis.tooltip
            .style("opacity", 1)
            .html(`Possible solution: ${d.improvement}<br/>Number of crashes: ${d.needLevel}`);
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

    createFactorFilters() {
        let vis = this;
        
        // Wire up the checkboxes in the filter-buttons area
        d3.select("#factor-filter-inattentive")
            .property("checked", vis.activeFactors.includes('inattentive'))
            .on("change", function() {
                vis.updateActiveFactors();
            });
        
        d3.select("#factor-filter-ice")
            .property("checked", vis.activeFactors.includes('ice'))
            .on("change", function() {
                vis.updateActiveFactors();
            });
        
        d3.select("#factor-filter-dark")
            .property("checked", vis.activeFactors.includes('dark'))
            .on("change", function() {
                vis.updateActiveFactors();
            });
        
        d3.select("#factor-filter-speeding")
            .property("checked", vis.activeFactors.includes('speeding'))
            .on("change", function() {
                vis.updateActiveFactors();
            });
    }

    createBackButton() {
        let vis = this;
        let optionsPanel = d3.select("#options-panel");
        
        // Remove existing button container if any
        optionsPanel.select("#improvements-button-container").remove();
        
        // Don't create back button for improvements-visual since we're always in improvements view
        return;
        
        // Create button container
        let buttonContainer = document.createElement("div");
        buttonContainer.id = "improvements-button-container";
        buttonContainer.className = "d-flex gap-2 mt-3 mb-2";
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "8px";
        
        // Create play button
        let playButtonElement = document.createElement("button");
        playButtonElement.id = "improvementsPlayButton";
        playButtonElement.className = "btn";
        playButtonElement.style.width = "55px";
        playButtonElement.style.height = "40px";
        playButtonElement.style.padding = "0";
        playButtonElement.style.fontWeight = "700";
        playButtonElement.style.borderRadius = "8px";
        playButtonElement.style.backgroundColor = "#000";
        playButtonElement.style.border = "1px solid #000";
        playButtonElement.style.color = "#fff";
        playButtonElement.style.transition = "background-color 0.2s ease";
        playButtonElement.style.display = "flex";
        playButtonElement.style.alignItems = "center";
        playButtonElement.style.justifyContent = "center";
        playButtonElement.style.fontSize = "16px";
        playButtonElement.style.cursor = "pointer";
        playButtonElement.textContent = (vis.yearScroll && vis.yearScroll.isPlaying) ? "⏸" : "▶";
        
        playButtonElement.onmouseover = function() {
            this.style.backgroundColor = "#333";
        };
        playButtonElement.onmouseout = function() {
            this.style.backgroundColor = "#000";
        };
        
        playButtonElement.onclick = function() {
            // Play/pause is handled by PlayButton class
        };
        
        // Create back button
        let backButtonElement = document.createElement("button");
        backButtonElement.id = "backButton";
        backButtonElement.className = "btn flex-grow-1";
        backButtonElement.style.height = "40px";
        backButtonElement.style.padding = "10px";
        backButtonElement.style.fontWeight = "700";
        backButtonElement.style.borderRadius = "8px";
        backButtonElement.style.backgroundColor = "#000";
        backButtonElement.style.border = "1px solid #000";
        backButtonElement.style.color = "#fff";
        backButtonElement.style.transition = "background-color 0.2s ease";
        backButtonElement.style.cursor = "pointer";
        backButtonElement.textContent = "Back";
        
        backButtonElement.onmouseover = function() {
            this.style.backgroundColor = "#333";
        };
        backButtonElement.onmouseout = function() {
            this.style.backgroundColor = "#000";
        };
        
        backButtonElement.onclick = function() {
            if (vis.onBackClick) {
                vis.onBackClick();
            }
        };
        
        buttonContainer.appendChild(playButtonElement);
        buttonContainer.appendChild(backButtonElement);
        
        locationChartContainer.parentNode.insertBefore(buttonContainer, locationChartContainer);
    }

    createImprovementsList() {
        let vis = this;
        let optionsPanel = d3.select("#options-panel");
        
        // Remove existing list if any
        optionsPanel.select("#improvements-list").remove();
        
        let buttonContainer = optionsPanel.select("#improvements-button-container").node();
        if (!buttonContainer) return;
        
        // Create list container
        let listContainer = document.createElement("div");
        listContainer.id = "improvements-list";
        listContainer.className = "mt-3";
        listContainer.style.display = "block";
        
        // Improvements data
        let improvementsData = [
            { factor: 'speeding', text: 'Dynamic Speed Signs' },
            { factor: 'dark', text: 'Street Lighting' },
            { factor: 'ice', text: 'Anti-icing Technology' },
            { factor: 'inattentive', text: 'Rumble Strips' }
        ];
        
        improvementsData.forEach(improvement => {
            let link = document.createElement("a");
            link.href = vis.improvementTypes[improvement.factor].url;
            link.target = "_blank";
            link.style.display = "block";
            link.style.marginBottom = "8px";
            link.style.color = "#000";
            link.style.textDecoration = "none";
            link.style.fontSize = "14px";
            link.style.cursor = "pointer";
            link.textContent = improvement.text;
            
            link.onmouseover = function() {
                this.style.textDecoration = "underline";
            };
            link.onmouseout = function() {
                this.style.textDecoration = "none";
            };
            
            listContainer.appendChild(link);
        });
        
        buttonContainer.parentNode.insertBefore(listContainer, buttonContainer.nextSibling);
    }

    removeFactorFilters() {
        let vis = this;
        let optionsPanel = d3.select("#options-panel");
        
        // Restore original title
        optionsPanel.select(".options-title").text("Filters");
        
        // Remove factor filters
        optionsPanel.selectAll(".filter-option")
            .filter(function() {
                let inputId = d3.select(this).select("input").attr("id");
                return inputId && inputId.startsWith("factor-filter-");
            })
            .remove();
        
        // Remove button container
        optionsPanel.select("#improvements-button-container").remove();
        
        // Remove improvements list
        optionsPanel.select("#improvements-list").remove();
        
        // Show severity filters
        optionsPanel.selectAll(".filter-option")
            .filter(function() {
                let inputId = d3.select(this).select("input").attr("id");
                return inputId && inputId.startsWith("filter-") && !inputId.startsWith("factor-filter-");
            })
            .style("display", "block");
    }

    updateActiveFactors() {
        let vis = this;
        vis.activeFactors = [];
        
        ['speeding', 'dark', 'ice', 'inattentive'].forEach(factorKey => {
            let checkbox = d3.select("#factor-filter-" + factorKey).node();
            if (checkbox && checkbox.checked) {
                vis.activeFactors.push(factorKey);
            }
        });
        
        // Trigger update if we have a selected year
        if (vis.selectedYear !== null && vis.crashData) {
            vis.wrangleData(vis.crashData, vis.selectedYear);
        }
    }

    show() {
        let vis = this;
        vis.svg.selectAll(".improvement-circle")
            .style("display", "block");
    }

    hide() {
        let vis = this;
        vis.svg.selectAll(".improvement-circle")
            .style("display", "none");
    }

    updateCoordinates(projection) {
        let vis = this;
        vis.projection = projection;

        let circles = vis.svg.selectAll(".improvement-circle");
        if (!circles.empty()) {
            circles
                .attr("cx", function(d) {
                    if (d && d.lng !== undefined && d.lat !== undefined && vis.projection) {
                        let coords = vis.projection([d.lng, d.lat]);
                        return coords ? coords[0] : 0;
                    }
                    return 0;
                })
                .attr("cy", function(d) {
                    if (d && d.lng !== undefined && d.lat !== undefined && vis.projection) {
                        let coords = vis.projection([d.lng, d.lat]);
                        return coords ? coords[1] : 0;
                    }
                    return 0;
                });
        }
    }
}
window.ImprovementsVis = ImprovementsVis;

