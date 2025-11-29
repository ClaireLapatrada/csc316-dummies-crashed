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
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('severityFilter').addEventListener('change', (e) => {
            this.app.filterBySeverity(e.target.value);
        });

        document.getElementById('districtFilter').addEventListener('change', (e) => {
            this.app.filterByDistrict(e.target.value);
        });
    }

    update(year) {
        const filteredData = this.app.getFilteredData();
        const yearData = filteredData.filter(d => d.year === year);

        Object.keys(this.timePeriods).forEach(period => {
            const periodData = yearData.filter(d => d.timePeriod === period);
            this.updateTimePeriod(period, periodData);
        });
    }

    updateTimePeriod(period, data) {
        const container = this.timePeriods[period];
        console.log(`Updating ${period} with ${data.length} incidents`);
        container.innerHTML = '';

        // Create yellow circles for each incident
        data.forEach((incident, index) => {
            this.createCircle(container, incident, index);
        });

        if (data.length === 0) {
            console.log(`No data for ${period}`);
            this.showNoDataMessage(container);
        } else {
            console.log(`Created ${data.length} circles for ${period}`);
        }
    }

    createCircle(container, incident, index) {
        const circle = document.createElement('div');

        // All circles are the same size and yellow
        const size = 15;

        circle.className = 'injury-circle';
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.style.backgroundColor = '#FFD166';
        circle.style.borderRadius = '50%';
        circle.style.display = 'block';

        console.log(`Creating circle for ${incident.severity} injury in ${incident.district}`);

        circle.textContent = '';

        circle.style.animationDelay = `${index * 0.05}s`;

        container.appendChild(circle);
    }

    showNoDataMessage(container) {
        const message = document.createElement('div');
        message.className = 'no-data-message';
        message.textContent = 'No pedestrian incidents this time period';
        container.appendChild(message);
    }
}