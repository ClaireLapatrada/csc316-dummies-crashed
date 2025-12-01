// Main application controller
class CollisionMain {
    constructor() {
        this.collisionData = [];
        this.pedestrianData = [];
        this.currentYear = 2006;

        this.filters = {
            severity: 'all',
            district: 'all'
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
            this.collisionData = await d3.csv("/data/dataset.csv");
            this.processData();
            console.log('Data loaded:', this.collisionData.length, 'records');
            console.log('Pedestrian incidents:', this.pedestrianData.length, 'records');
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
                this.yearController.setYear(year);
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

            if (hours >= 5 && hours < 11) return 'morning';
            if (hours >= 11 && hours < 16) return 'afternoon';
            if (hours >= 16 && hours < 20) return 'evening';
            if (hours >= 5 && hours < 24) return 'night';

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

    updateVisualization() {
        this.visualization.update(this.currentYear);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.collisionApp = new CollisionMain();
    window.collisionApp.init();
});