// Main application controller
class CollisionMain {
    constructor() {
        this.collisionData = [];
        this.pedestrianData = [];
        this.currentYear = 2006;

        this.filters = {
            severity: 'all', // Can be 'all' or array of selected values
            district: 'all'  // Can be 'all' or array of selected values
        };

        this.yearController = null;
        this.playButton = null;
        this.visualization = new PedestrianInjuryVisual(this);

        // Play button properties
        this.playInterval = null;
        this.isPlaying = false;
        this.animationSpeed = 800;

        this.updatingYear = false;
    }

    // Initialize the application
    async init() {
        try {
            await this.loadData();
            this.initializeYearScroll();
            this.initializePlayButton(); // Initialize play button
            this.visualization.init();
            this.updateVisualization();
            console.log('Pedestrian injury visualization initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }

    async loadData() {
        try {
            this.collisionData = await d3.csv("../../data/dataset.csv");
            console.log('Data loaded:', this.collisionData.length, 'records');
            
            // Debug: Check for pedestrian field names
            if (this.collisionData.length > 0) {
                const sampleKeys = Object.keys(this.collisionData[0]);
                const pedFields = sampleKeys.filter(k => 
                    k.toLowerCase().includes('pedestrian') || 
                    k === 'PEDESTRIAN'
                );
                console.log('Pedestrian-related fields found:', pedFields);
                
                // Check sample values
                const samplePedValues = this.collisionData.slice(0, 10).map(d => ({
                    'Pedestrian Involved': d['Pedestrian Involved'],
                    'PEDESTRIAN': d['PEDESTRIAN'],
                    'Pedestrian': d['Pedestrian']
                }));
                console.log('Sample pedestrian field values:', samplePedValues);
            }
            
            this.processData();
            console.log('Pedestrian incidents after processing:', this.pedestrianData.length, 'records');
            
            // Debug: Show time period distribution
            if (this.pedestrianData.length > 0) {
                const timePeriodCounts = {};
                this.pedestrianData.forEach(d => {
                    timePeriodCounts[d.timePeriod] = (timePeriodCounts[d.timePeriod] || 0) + 1;
                });
                console.log('Time period distribution:', timePeriodCounts);
            }

            // Setup filters after data is loaded
            if (this.visualization) {
                this.visualization.refreshFilters();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            console.log('Falling back to sample data');
        }
    }

    initializeYearScroll() {
        const container = document.getElementById('yearScroller');
        if (!container) {
            console.error('YearScroll container (#yearScroller) not found!');
            return;
        }

        console.log('Initializing YearScroll...');

        this.yearController = new YearScroll('#yearScroller', {
            startYear: 2006,
            endYear: 2023,
            // Reduce margins to minimize empty space and prevent text overlap
            margin: { left: 15, right: 15, top: 40, bottom: 40 },
            onYearChange: (year) => {
                console.log('YearScroll changed year to:', year);
                this.setYear(year, true); // Pass true to indicate it's from YearScroll
            }
        });

        this.yearController.init();
        console.log('YearScroll initialized successfully');
    }

    initializePlayButton() {
        const playBtn = document.getElementById('playBtn');
        const restartBtn = document.getElementById('restartBtn');

        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        } else {
            console.error('Play button (#playBtn) not found!');
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restart());
        } else {
            console.error('Restart button (#restartBtn) not found!');
        }
    }

    // Play button methods
    togglePlay() {
        if (this.isPlaying) {
            this.stopPlay();
        } else {
            this.startPlay();
        }
    }

    startPlay() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.updatePlayButtonUI();

        this.playInterval = setInterval(() => {
            let nextYear = this.currentYear + 1;
            if (nextYear > 2023) {
                this.stopPlay();
                return;
            }

            this.setYear(nextYear, false);

        }, this.animationSpeed);
    }

    stopPlay() {
        this.isPlaying = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this.updatePlayButtonUI();
    }

    restart() {
        this.stopPlay();
        this.setYear(2006);
    }

    updatePlayButtonUI() {
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            const icon = playBtn.querySelector('i');
            if (this.isPlaying) {
                playBtn.classList.add('playing');
                if (icon) icon.className = 'fas fa-pause play-icon';
            } else {
                playBtn.classList.remove('playing');
                if (icon) icon.className = 'fas fa-play play-icon';
            }
        }
    }

    setYear(year, fromYearScroll = false) {
        if (this.updatingYear) return;

        console.log('Setting year to:', year, 'fromYearScroll:', fromYearScroll);

        if (year >= 2006 && year <= 2023 && this.currentYear !== year) {
            this.updatingYear = true;
            this.currentYear = year;

            // Update YearScroll if the change didn't come from it
            if (!fromYearScroll && this.yearController && this.yearController.setYear) {
                const animateDuration = Math.max(this.animationSpeed - 100, 300);
                this.yearController.setYear(year, { animate: true, duration: animateDuration });
            }

            this.updateVisualization();

            const yearDisplay = document.getElementById('currentYearDisplay');
            if (yearDisplay) {
                yearDisplay.textContent = year;
            }

            this.updatingYear = false;
        }
    }

    // Process CSV data for visualization
    processData() {
        this.pedestrianData = this.collisionData
            .filter(d => {
                // Check multiple possible field names for pedestrian involvement
                const pedInvolved = d['Pedestrian Involved'] || 
                                   d['PEDESTRIAN'] || 
                                   d['Pedestrian'] || '';
                return pedInvolved === 'Yes' || pedInvolved === 'yes' || pedInvolved === 'Y' || pedInvolved === 'y';
            })
            .map(d => {
                // Extract year
                const year = d.Year ? parseInt(d.Year) :
                    d['Year of collision'] ? parseInt(d['Year of collision']) : 2006;

                // Extract time and determine period
                const timeStr = d['Time of Collision'] || d['Time'] || d['TIME'] || '';
                const timePeriod = this.getTimePeriodFromTime(timeStr);

                // Extract injury severity
                const injury = d.Injury || d['Injury Severity'] || 'None';
                const severity = this.mapSeverity(injury);

                // Extract district - keep as constant
                const district = d.DISTRICT || d['District Name'] || d['District'] || 'Unknown';

                return {
                    year: year,
                    time: timeStr,
                    timePeriod: timePeriod,
                    injury: injury,
                    severity: severity,
                    district: district,
                    collisionType: d['Accident Classification'] || 'Unknown'
                };
            })
            .filter(d => d.timePeriod !== 'unknown' && d.severity !== 'unknown');
    }

    // Determine time period from time string
    getTimePeriodFromTime(timeStr) {
        if (!timeStr) return 'unknown';

        try {
            // Handle different time formats
            let hours = 0;
            
            // Check if it's already in 24-hour format (e.g., "18:30" or just "18")
            if (timeStr.includes(':')) {
                const parts = timeStr.split(' ');
                const timePart = parts[0];
                const period = parts[1];
                
                hours = parseInt(timePart.split(':')[0]);
                
                // Convert to 24-hour format if AM/PM is present
                if (period) {
                    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
                }
            } else {
                // Try to parse as number
                hours = parseInt(timeStr);
            }
            
            // Normalize hours to 0-23 range
            if (hours >= 24) hours = hours % 24;
            if (hours < 0) hours = 0;

            // Map to time periods based on HTML definitions:
            // Morning: 5AM – 11AM (5 <= hours < 11)
            // Afternoon: 11AM – 4PM (11 <= hours < 16)
            // Evening: 4PM – 8PM (16 <= hours < 20)
            // Night: 8PM – 5AM (hours >= 20 || hours < 5)
            if (hours >= 5 && hours < 11) return 'morning';
            if (hours >= 11 && hours < 16) return 'afternoon';
            if (hours >= 16 && hours < 20) return 'evening';
            if (hours >= 20 || hours < 5) return 'night';

            return 'unknown';
        } catch (error) {
            console.error('Error parsing time:', timeStr, error);
            return 'unknown';
        }
    }

    // Map injury to severity
    mapSeverity(injury) {
        const severityMap = {
            'Fatal': 'fatal',
            'Major': 'major',
            'Minor': 'minor',
            'Minimal': 'minimal',
            'None': 'minimal'
        };
        return severityMap[injury] || 'unknown';
    }

    // Filter methods - now accept 'all' or array of values
    filterBySeverity(severity) {
        this.filters.severity = severity;
        this.updateVisualization();
    }

    filterByDistrict(district) {
        this.filters.district = district;
        this.updateVisualization();
    }

    getFilteredData() {
        return this.pedestrianData.filter(d => {
            // Handle severity filter - can be 'all' or array
            let severityMatch = true;
            if (this.filters.severity !== 'all') {
                if (Array.isArray(this.filters.severity)) {
                    // Map display names back to filter values
                    const severityMap = {
                        'Fatal': 'fatal',
                        'Major': 'major',
                        'Minor': 'minor',
                        'Minimal': 'minimal'
                    };
                    const filterValues = this.filters.severity.map(s => severityMap[s] || s.toLowerCase());
                    severityMatch = filterValues.includes(d.severity);
                } else {
                    const severityMap = {
                        'Fatal': 'fatal',
                        'Major': 'major',
                        'Minor': 'minor',
                        'Minimal': 'minimal'
                    };
                    const filterValue = severityMap[this.filters.severity] || this.filters.severity.toLowerCase();
                    severityMatch = d.severity === filterValue;
                }
            }
            
            // Handle district matching with normalization
            let districtMatch = true;
            if (this.filters.district !== 'all') {
                const dataDistrict = (d.district || '').trim();
                
                if (Array.isArray(this.filters.district)) {
                    // Check if data district matches any selected district
                    districtMatch = this.filters.district.some(filterDistrict => {
                        const dataDistrictLower = dataDistrict.toLowerCase();
                        const filterDistrictLower = filterDistrict.toLowerCase();
                        
                        // Handle combined district names
                        if (filterDistrictLower === 'toronto and east york') {
                            return dataDistrictLower.includes('toronto') || 
                                   dataDistrictLower.includes('east york') ||
                                   dataDistrictLower === 'toronto' ||
                                   dataDistrictLower === 'east york';
                        } else if (filterDistrictLower === 'etobicoke york') {
                            return dataDistrictLower.includes('etobicoke') || 
                                   dataDistrictLower.includes('york') ||
                                   dataDistrictLower === 'etobicoke' ||
                                   dataDistrictLower === 'york';
                        } else {
                            return dataDistrictLower.includes(filterDistrictLower) || 
                                   filterDistrictLower.includes(dataDistrictLower);
                        }
                    });
                } else {
                    const filterDistrict = this.filters.district.toLowerCase();
                    const dataDistrictLower = dataDistrict.toLowerCase();
                    
                    // Handle combined district names
                    if (filterDistrict === 'toronto and east york') {
                        districtMatch = dataDistrictLower.includes('toronto') || 
                                      dataDistrictLower.includes('east york') ||
                                      dataDistrictLower === 'toronto' ||
                                      dataDistrictLower === 'east york';
                    } else if (filterDistrict === 'etobicoke york') {
                        districtMatch = dataDistrictLower.includes('etobicoke') || 
                                      dataDistrictLower.includes('york') ||
                                      dataDistrictLower === 'etobicoke' ||
                                      dataDistrictLower === 'york';
                    } else {
                        districtMatch = dataDistrictLower.includes(filterDistrict) || 
                                       filterDistrict.includes(dataDistrictLower);
                    }
                }
            }
            
            return severityMatch && districtMatch;
        });
    }

    updateVisualization() {
        this.visualization.update(this.currentYear);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.collisionApp = new CollisionMain();
    window.collisionApp.init();
});