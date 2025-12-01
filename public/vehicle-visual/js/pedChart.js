// Visualization controller
class PedestrianInjuryVisual {
    constructor(app) {
        this.app = app;
        this.timePeriods = {
            morning: document.getElementById('morning-bubbles'),
            afternoon: document.getElementById('afternoon-bubbles'),
            evening: document.getElementById('evening-bubbles'),
            night: document.getElementById('night-bubbles')
        };
        this.timePeriodData = {
            morning: [],
            afternoon: [],
            evening: [],
            night: []
        };
        this.tooltip = document.getElementById('timePeriodTooltip');
        this.circleTooltip = document.getElementById('circleTooltip');
        this.allCircles = []; // Store all circle references for magnet effect
        
        // Create circle tooltip if it doesn't exist
        if (!this.circleTooltip) {
            this.circleTooltip = document.createElement('div');
            this.circleTooltip.id = 'circleTooltip';
            this.circleTooltip.className = 'circle-tooltip';
            document.body.appendChild(this.circleTooltip);
        }
    }

    init() {
        this.setupEventListeners();
        // Setup tooltip listeners after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.setupTooltipListeners();
        }, 100);
    }

    setupEventListeners() {
        // Checkboxes are set up in setupFilters method
        this.setupFilters();
    }

    setupFilters() {
        // Use all pedestrian data, not filtered data, to show all available options
        const data = this.app.pedestrianData || [];
        
        // Get unique severity values
        const severitySet = new Set();
        data.forEach(d => {
            if (d.severity && d.severity !== 'unknown') {
                severitySet.add(d.severity);
            }
        });
        const severityOptions = Array.from(severitySet).sort().map(s => {
            const severityMap = {
                'fatal': 'Fatal',
                'major': 'Major',
                'minor': 'Minor',
                'minimal': 'Minimal'
            };
            return severityMap[s] || s.charAt(0).toUpperCase() + s.slice(1);
        });

        // Get unique district values
        const districtSet = new Set();
        data.forEach(d => {
            const district = d.district || 'Unknown';
            if (district !== 'Unknown' && district.trim() !== '') {
                // Normalize district names
                const districtLower = district.toLowerCase();
                let normalizedDistrict = district;
                
                if (districtLower.includes('toronto') && !districtLower.includes('north') && !districtLower.includes('east')) {
                    normalizedDistrict = 'Toronto and East York';
                } else if (districtLower.includes('north york')) {
                    normalizedDistrict = 'North York';
                } else if (districtLower.includes('etobicoke')) {
                    normalizedDistrict = 'Etobicoke York';
                } else if (districtLower.includes('scarborough')) {
                    normalizedDistrict = 'Scarborough';
                } else if (districtLower.includes('east york')) {
                    normalizedDistrict = 'Toronto and East York';
                } else if (districtLower.includes('york') && !districtLower.includes('north') && !districtLower.includes('east')) {
                    normalizedDistrict = 'Etobicoke York';
                }
                
                districtSet.add(normalizedDistrict);
            }
        });
        const districtOptions = Array.from(districtSet).sort();

        // Setup severity filter
        this.setupFilter('severity', severityOptions, this.app);

        // Setup district filter
        this.setupFilter('district', districtOptions, this.app);
    }

    setupFilter(filterType, options, app) {
        // Create filter data with "All" option
        const filterData = [{value: 'all', label: 'All', checked: true}];
        options.forEach(opt => {
            filterData.push({value: opt, label: opt, checked: false});
        });

        // Select container
        const container = d3.select(`#${filterType}-checkboxes`);
        if (container.empty()) return;

        // Bind data and create checkboxes
        const items = container.selectAll(".filter-checkbox-item")
            .data(filterData);

        // Enter: create new items
        const itemsEnter = items.enter()
            .append("div")
            .attr("class", "filter-checkbox-item");

        itemsEnter.append("input")
            .attr("type", "checkbox")
            .attr("id", d => `${filterType}-${d.value === 'all' ? 'all' : d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
            .attr("value", d => d.value)
            .property("checked", d => d.checked);

        itemsEnter.append("label")
            .attr("for", d => `${filterType}-${d.value === 'all' ? 'all' : d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
            .text(d => d.label);

        // Merge and update
        const itemsMerged = itemsEnter.merge(items);
        itemsMerged.select("input")
            .property("checked", d => d.checked);

        // Add click handlers
        container.selectAll("input").on("change", function(event) {
            const clicked = this;
            const allCheckbox = container.select(`#${filterType}-all`).node();
            const checkboxes = container.selectAll("input").nodes();

            if (clicked.id === `${filterType}-all`) {
                // If "All" is checked, uncheck all others
                if (clicked.checked) {
                    checkboxes.forEach(cb => {
                        if (cb !== clicked) cb.checked = false;
                    });
                    if (filterType === 'severity') {
                        app.filterBySeverity('all');
                    } else if (filterType === 'district') {
                        app.filterByDistrict('all');
                    }
                }
            } else {
                // If any other checkbox is checked, uncheck "All"
                if (clicked.checked) {
                    allCheckbox.checked = false;
                }

                // Get selected values
                const selected = checkboxes
                    .filter(cb => cb.checked && cb.id !== `${filterType}-all`)
                    .map(cb => cb.value);

                // If nothing selected, select "All"
                if (selected.length === 0) {
                    allCheckbox.checked = true;
                    if (filterType === 'severity') {
                        app.filterBySeverity('all');
                    } else if (filterType === 'district') {
                        app.filterByDistrict('all');
                    }
                } else {
                    if (filterType === 'severity') {
                        app.filterBySeverity(selected);
                    } else if (filterType === 'district') {
                        app.filterByDistrict(selected);
                    }
                }
            }
        });

        // Setup button toggle
        d3.select(`#${filterType}-filter-btn`).on("click", function(event) {
            event.stopPropagation();
            const group = d3.select(this.parentNode);
            group.classed("active", !group.classed("active"));
        });

        // Close dropdown when clicking outside
        d3.select("body").on("click", function(event) {
            if (!event.target.closest(`#${filterType}-filter-btn`) && 
                !event.target.closest(`#${filterType}-checkboxes`)) {
                d3.select(`#${filterType}-filter-btn`).node().parentNode.classList.remove("active");
            }
        });
    }

    setupTooltipListeners() {
        // Setup info icon hover listeners
        const infoIcons = document.querySelectorAll('.info-icon');
        infoIcons.forEach(icon => {
            const period = icon.getAttribute('data-period');
            
            icon.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, period);
            });
            
            icon.addEventListener('mousemove', (e) => {
                this.updateTooltipPosition(e);
            });
            
            icon.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    update(year) {
        const filteredData = this.app.getFilteredData();
        const yearData = filteredData.filter(d => d.year === year);

        Object.keys(this.timePeriods).forEach(period => {
            const periodData = yearData.filter(d => d.timePeriod === period);
            // Store data for tooltip
            this.timePeriodData[period] = periodData;
            this.updateTimePeriod(period, periodData);
        });
    }

    refreshFilters() {
        // Refresh filter options when data changes
        this.setupFilters();
    }

    updateTimePeriod(period, data) {
        const container = this.timePeriods[period];
        console.log(`Updating ${period} with ${data.length} incidents`);
        container.innerHTML = '';

        // Remove old circles for this period from allCircles
        this.allCircles = this.allCircles.filter(circle => !circle.dataset.period || circle.dataset.period !== period);

        // Sort data by time
        const sortedData = [...data].sort((a, b) => {
            const timeA = this.parseTimeToMinutes(a.time || '');
            const timeB = this.parseTimeToMinutes(b.time || '');
            return timeA - timeB;
        });

        // Create colored circles for each incident with period-specific colors
        sortedData.forEach((incident, index) => {
            this.createCircle(container, incident, index, period);
        });

        if (data.length === 0) {
            console.log(`No data for ${period}`);
            this.showNoDataMessage(container);
        } else {
            console.log(`Created ${data.length} circles for ${period}`);
        }
    }

    parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        
        try {
            // Handle different time formats
            let hours = 0;
            let minutes = 0;
            
            if (timeStr.includes(':')) {
                const parts = timeStr.split(' ');
                const timePart = parts[0];
                const period = parts[1];
                
                const [h, m] = timePart.split(':');
                hours = parseInt(h) || 0;
                minutes = parseInt(m) || 0;
                
                // Convert to 24-hour format if AM/PM is present
                if (period) {
                    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
                }
            } else {
                // Try to parse as number
                hours = parseInt(timeStr) || 0;
            }
            
            // Normalize hours to 0-23 range
            if (hours >= 24) hours = hours % 24;
            if (hours < 0) hours = 0;
            
            return hours * 60 + minutes;
        } catch (error) {
            return 0;
        }
    }

    createCircle(container, incident, index, period) {
        const circle = document.createElement('div');

        // Smaller size for dots
        const size = 7;

        // Color scheme for each time period
        const periodColors = {
            morning: '#FFD166',    // Warm yellow (sunrise)
            afternoon: '#FF9F43',  // Medium orange (bright day)
            evening: '#FF6B6B',    // Coral/red (sunset)
            night: '#4ECDC4'       // Teal/cyan (night)
        };

        circle.className = 'injury-circle';
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.style.backgroundColor = periodColors[period] || '#FFD166';
        circle.style.borderRadius = '50%';
        circle.style.display = 'block';
        circle.style.cursor = 'pointer';
        circle.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        circle.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';

        // Store incident data for tooltip
        circle.dataset.incident = JSON.stringify(incident);
        circle.dataset.period = period;
        circle.dataset.index = index;

        console.log(`Creating circle for ${incident.severity} injury in ${incident.district}`);

        circle.textContent = '';

        circle.style.animationDelay = `${index * 0.05}s`;

        // Store circle reference for magnet effect
        this.allCircles.push(circle);

        // Add hover event listeners
        circle.addEventListener('mouseenter', (e) => {
            this.showCircleTooltip(e, incident, period);
            this.applyMagnetEffect(circle, period);
        });

        circle.addEventListener('mousemove', (e) => {
            this.updateCircleTooltipPosition(e);
        });

        circle.addEventListener('mouseleave', () => {
            this.hideCircleTooltip();
            this.removeMagnetEffect(circle, period);
        });

        container.appendChild(circle);
    }

    applyMagnetEffect(hoveredCircle, period) {
        const hoveredRect = hoveredCircle.getBoundingClientRect();
        const hoveredX = hoveredRect.left + hoveredRect.width / 2;
        const hoveredY = hoveredRect.top + hoveredRect.height / 2;
        
        const maxDistance = 50; // Maximum distance for magnet effect (in pixels)
        const baseSize = 7; // Base circle size
        
        // Enlarge the hovered circle
        hoveredCircle.style.transform = 'scale(1.8)';
        hoveredCircle.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.6)';
        hoveredCircle.style.zIndex = '1000';
        
        // Find and enlarge nearby circles in the same period
        this.allCircles.forEach(circle => {
            if (circle === hoveredCircle || circle.dataset.period !== period) return;
            
            const circleRect = circle.getBoundingClientRect();
            const circleX = circleRect.left + circleRect.width / 2;
            const circleY = circleRect.top + circleRect.height / 2;
            
            // Calculate distance
            const distance = Math.sqrt(
                Math.pow(circleX - hoveredX, 2) + 
                Math.pow(circleY - hoveredY, 2)
            );
            
            if (distance <= maxDistance) {
                // Calculate scale based on distance (closer = larger)
                const normalizedDistance = distance / maxDistance; // 0 to 1
                const scale = 1 + (0.5 * (1 - normalizedDistance)); // 1.0 to 1.5
                
                circle.style.transform = `scale(${scale})`;
                circle.style.transition = 'transform 0.2s ease';
                circle.style.zIndex = '999';
            }
        });
    }

    removeMagnetEffect(hoveredCircle, period) {
        // Reset hovered circle
        hoveredCircle.style.transform = 'scale(1)';
        hoveredCircle.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
        hoveredCircle.style.zIndex = 'auto';
        
        // Reset all nearby circles in the same period
        this.allCircles.forEach(circle => {
            if (circle.dataset.period === period) {
                circle.style.transform = 'scale(1)';
                circle.style.zIndex = 'auto';
            }
        });
    }

    showNoDataMessage(container) {
        const message = document.createElement('div');
        message.className = 'no-data-message';
        message.textContent = 'No pedestrian incidents this time period';
        container.appendChild(message);
    }

    showTooltip(event, period) {
        const data = this.timePeriodData[period] || [];
        const totalIncidents = data.length;
        
        // Calculate severity breakdown
        const severityCounts = {
            fatal: 0,
            major: 0,
            minor: 0,
            minimal: 0
        };
        
        data.forEach(d => {
            if (severityCounts.hasOwnProperty(d.severity)) {
                severityCounts[d.severity]++;
            }
        });
        
        // Calculate district breakdown (top 3)
        const districtCounts = {};
        data.forEach(d => {
            const district = d.district || 'Unknown';
            districtCounts[district] = (districtCounts[district] || 0) + 1;
        });
        const topDistricts = Object.entries(districtCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        // Period labels
        const periodLabels = {
            morning: 'Morning (5AM – 11AM)',
            afternoon: 'Afternoon (11AM – 4PM)',
            evening: 'Evening (4PM – 8PM)',
            night: 'Night (8PM – 5AM)'
        };
        
        // Build tooltip content
        let tooltipHTML = `<div class="tooltip-title">${periodLabels[period]}</div>`;
        tooltipHTML += `<div class="tooltip-stat">
            <span class="tooltip-stat-label">Total Incidents:</span>
            <span class="tooltip-stat-value">${totalIncidents}</span>
        </div>`;
        
        if (totalIncidents > 0) {
            tooltipHTML += `<div class="tooltip-severity">
                <div style="font-weight: 600; margin-bottom: 6px; color: #FFD166;">Severity Breakdown:</div>`;
            
            if (severityCounts.fatal > 0) {
                tooltipHTML += `<div class="tooltip-severity-item">
                    <span>Fatal:</span>
                    <span style="color: #FFD166;">${severityCounts.fatal}</span>
                </div>`;
            }
            if (severityCounts.major > 0) {
                tooltipHTML += `<div class="tooltip-severity-item">
                    <span>Major:</span>
                    <span style="color: #FFD166;">${severityCounts.major}</span>
                </div>`;
            }
            if (severityCounts.minor > 0) {
                tooltipHTML += `<div class="tooltip-severity-item">
                    <span>Minor:</span>
                    <span style="color: #FFD166;">${severityCounts.minor}</span>
                </div>`;
            }
            if (severityCounts.minimal > 0) {
                tooltipHTML += `<div class="tooltip-severity-item">
                    <span>Minimal:</span>
                    <span style="color: #FFD166;">${severityCounts.minimal}</span>
                </div>`;
            }
            
            tooltipHTML += `</div>`;
            
            if (topDistricts.length > 0) {
                tooltipHTML += `<div class="tooltip-severity" style="margin-top: 10px;">
                    <div style="font-weight: 600; margin-bottom: 6px; color: #FFD166;">Top Districts:</div>`;
                topDistricts.forEach(([district, count]) => {
                    tooltipHTML += `<div class="tooltip-severity-item">
                        <span>${district}:</span>
                        <span style="color: #FFD166;">${count}</span>
                    </div>`;
                });
                tooltipHTML += `</div>`;
            }
        }
        
        this.tooltip.innerHTML = tooltipHTML;
        this.tooltip.classList.add('show');
        this.updateTooltipPosition(event);
    }

    updateTooltipPosition(event) {
        if (!this.tooltip.classList.contains('show')) return;
        
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = event.clientX + 15;
        let top = event.clientY - 10;
        
        // Adjust if tooltip goes off right edge
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = event.clientX - tooltipRect.width - 15;
        }
        
        // Adjust if tooltip goes off bottom edge
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = event.clientY - tooltipRect.height - 10;
        }
        
        // Adjust if tooltip goes off top edge
        if (top < 10) {
            top = 10;
        }
        
        // Adjust if tooltip goes off left edge
        if (left < 10) {
            left = 10;
        }
        
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    hideTooltip() {
        this.tooltip.classList.remove('show');
    }

    showCircleTooltip(event, incident, period) {
        // Format time
        const timeStr = incident.time || 'Unknown';
        
        // Format severity
        const severityMap = {
            'fatal': 'Fatal',
            'major': 'Major',
            'minor': 'Minor',
            'minimal': 'Minimal'
        };
        const severity = severityMap[incident.severity] || incident.severity || 'Unknown';
        
        // Format district
        const district = incident.district || 'Unknown';
        
        // Format collision type
        const collisionType = incident.collisionType || 'Unknown';
        
        // Period labels
        const periodLabels = {
            morning: 'Morning',
            afternoon: 'Afternoon',
            evening: 'Evening',
            night: 'Night'
        };
        
        // Build tooltip content
        let tooltipHTML = `<div class="circle-tooltip-title">Collision Details</div>`;
        tooltipHTML += `<div class="circle-tooltip-item">
            <span class="circle-tooltip-label">Time Period:</span>
            <span class="circle-tooltip-value">${periodLabels[period]}</span>
        </div>`;
        tooltipHTML += `<div class="circle-tooltip-item">
            <span class="circle-tooltip-label">Time:</span>
            <span class="circle-tooltip-value">${timeStr}</span>
        </div>`;
        tooltipHTML += `<div class="circle-tooltip-item">
            <span class="circle-tooltip-label">Severity:</span>
            <span class="circle-tooltip-value">${severity}</span>
        </div>`;
        tooltipHTML += `<div class="circle-tooltip-item">
            <span class="circle-tooltip-label">District:</span>
            <span class="circle-tooltip-value">${district}</span>
        </div>`;
        if (collisionType !== 'Unknown') {
            tooltipHTML += `<div class="circle-tooltip-item">
                <span class="circle-tooltip-label">Type:</span>
                <span class="circle-tooltip-value">${collisionType}</span>
            </div>`;
        }
        
        this.circleTooltip.innerHTML = tooltipHTML;
        this.circleTooltip.classList.add('show');
        this.updateCircleTooltipPosition(event);
    }

    updateCircleTooltipPosition(event) {
        if (!this.circleTooltip.classList.contains('show')) return;
        
        const tooltipRect = this.circleTooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = event.clientX + 15;
        let top = event.clientY - 10;
        
        // Adjust if tooltip goes off right edge
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = event.clientX - tooltipRect.width - 15;
        }
        
        // Adjust if tooltip goes off bottom edge
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = event.clientY - tooltipRect.height - 10;
        }
        
        // Adjust if tooltip goes off top edge
        if (top < 10) {
            top = 10;
        }
        
        // Adjust if tooltip goes off left edge
        if (left < 10) {
            left = 10;
        }
        
        this.circleTooltip.style.left = `${left}px`;
        this.circleTooltip.style.top = `${top}px`;
    }

    hideCircleTooltip() {
        this.circleTooltip.classList.remove('show');
    }
}