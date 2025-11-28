// Main application controller

class CollisionMain {
    constructor() {
        this.collisionData = [];
        this.pedestrianData = [];
        this.currentYear = 2006;
        this.playInterval = null;

        // Available districts from the data
        this.AVAILABLE_DISTRICTS = [
            'Scarborough',
            'North York',
            'Etobicoke York',
            'Toronto and East York'
        ];

        this.initializePlayButton();
        this.filters = {
            severity: 'all',
            district: 'all'
        };

        // Initialize modules - YearController is now in separate file
        this.yearController = null;
        this.visualization = new PedestrianInjuryVisual(this);
    }

    // Initialize the application
    async init() {
        try {
            await this.loadData();
            this.initializeYearScroll();
            this.visualization.init();
            this.updateVisualization();
            console.log('Pedestrian injury visualization initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }

    // Load collision data from CSV
    async loadData() {
        try {
            this.collisionData = await d3.csv("data/dataset.csv");
            this.processData();
            console.log('Data loaded:', this.collisionData.length, 'records');
            console.log('Pedestrian incidents:', this.pedestrianData.length, 'records');
        } catch (error) {
            console.error('Error loading data:', error);
            console.log('Falling back to sample data');
        }
    }

    initializePlayButton() {
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.togglePlay();
            });
        } else {
            console.error('Play button (#playBtn) not found!');
        }
    }

    initializeYearScroll() {
        // Check if the container exists
        const container = document.getElementById('yearScroller');
        if (!container) {
            console.error('YearScroll container (#yearScroller) not found!');
            return;
        }

        console.log('Initializing YearScroll...');

        this.yearController = new YearScroll('#yearScroller', {
            startYear: 2006,
            endYear: 2023,
            onYearChange: (year) => {
                this.setYear(year);
            }
        });

        this.yearController.init();
        console.log('YearScroll initialized successfully');
    }

    // Process CSV data for visualization
    processData() {
        this.pedestrianData = this.collisionData
            .filter(d => d['Pedestrian Involved'] === 'Yes')
            .map(d => {
                // Extract year
                const year = d.Year ? parseInt(d.Year) :
                    d['Year of collision'] ? parseInt(d['Year of collision']) : 2006;

                // Extract time and determine period
                const timeStr = d['Time of Collision'] || '';
                const timePeriod = this.getTimePeriodFromTime(timeStr);

                // Extract injury severity
                const injury = d.Injury || 'None';
                const severity = this.mapSeverity(injury);

                // Extract district - keep as constant
                const district = d.DISTRICT || 'Unknown';

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
            const [time, period] = timeStr.split(' ');
            let hours = parseInt(time.split(':')[0]);

            // Convert to 24-hour format
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            // Time buckets: Morning (8-10), Afternoon (10-2), Evening (2-6), Night (6-8)
            if (hours >= 8 && hours < 10) return 'morning';
            if (hours >= 10 && hours < 14) return 'afternoon';
            if (hours >= 14 && hours < 18) return 'evening';
            if (hours >= 18 && hours < 20) return 'night';

            return 'unknown';
        } catch (error) {
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

    // Filter methods
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
            const severityMatch = this.filters.severity === 'all' || d.severity === this.filters.severity;
            const districtMatch = this.filters.district === 'all' || d.district === this.filters.district;
            return severityMatch && districtMatch;
        });
    }

    // Get available districts for UI components
    getAvailableDistricts() {
        return this.AVAILABLE_DISTRICTS;
    }


    // Update visualization when year changes
    updateVisualization() {
        this.visualization.update(this.currentYear);
    }

    // Set current year
    setYear(year) {
        if (year >= 2006 && year <= 2023) {
            this.currentYear = year;
            this.updateVisualization();
        }
    }

    // Stop animation
    stop() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    togglePlay() {
        this.yearController.togglePlay();
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.collisionApp = new CollisionMain();
    window.collisionApp.init();
});