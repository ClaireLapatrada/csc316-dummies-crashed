import { YearScroll } from './yearScroll.js';

// Global variables
let globalData = [];
let timeBuckets = [];
let currentTimeIndex = 0;
let currentYear = 2006;

// Setting initial time
let time = new Date();
time.setHours(18, 30, 0, 0);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load data
    d3.csv("data/dataset.csv").then(function(data) {
        globalData = data;
        console.log("CSV data loaded:", globalData.length, "records");

        // Extract years from data - FIXED VERSION
        globalData = globalData.map(d => {
            let extractedYear = 2006;

            // Try multiple possible year fields
            if (d.Year && !isNaN(parseInt(d.Year))) {
                extractedYear = parseInt(d.Year);
            } else if (d['Year of collision'] && !isNaN(parseInt(d['Year of collision']))) {
                extractedYear = parseInt(d['Year of collision']);
            } else if (d.Year && d.Year.trim() !== '') {
                extractedYear = parseInt(d.Year);
            }

            // Validate year range
            if (extractedYear < 2006 || extractedYear > 2023 || isNaN(extractedYear)) {
                extractedYear = 2006; // Default to 2006 if invalid
            }

            d.year = extractedYear;
            return d;
        });

        // Extract and sort time buckets
        timeBuckets = [...new Set(globalData.map(d => d['Time of Collision BUCKET']))]
            .filter(t => t && t.trim() !== '')
            .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

        console.log("Time buckets:", timeBuckets);
        console.log("Available years:", [...new Set(globalData.map(d => d.year))].sort());

        // find initial time index based on starting time
        currentTimeIndex = findClosestTimeIndex(time);

        // initialize components
        initBackground();
        initVisualization();
        initYearScroller();
        initTimeSlider();
        initPageNavigation()
        updateTimeDisplay();
        updateVisualization();

    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.innerHTML = '<div class="error-message">Error loading dataset.csv. Please check if the file exists in the data folder.</div>';
        }
    });
});

// Initialize Year Scroller
function initYearScroller() {
    console.log("Initializing year scroller...");

    const yearScroll = new YearScroll('#yearScroller', {
        onYearChange: (year) => {
            console.log('=== YEAR CHANGED TO:', year, '===');
            currentYear = year;
            updateVisualization();
            updateTimeDisplay();
        },
        width: 800
    });
    yearScroll.init();
}

// Initialize Time Slider
function initTimeSlider() {
    console.log("Initializing Draggable TimeSlider with Background Gradients...");

    const timeSlider = new TimeSliderWithHours(
        "#timeSlider",
        timeBuckets,
        {
            currentTimeIndex: currentTimeIndex,
            handleTimeChange: handleTimeChange
        }
    );

    timeSlider.init();
}
function handleTimeChange(newTimeIndex) {
    console.log('=== TIME CHANGED TO INDEX:', newTimeIndex, '===');
    currentTimeIndex = newTimeIndex;

    // Update the time object to match the selected bucket
    const currentBucket = timeBuckets[currentTimeIndex];
    if (currentBucket) {
        const [timePart, period] = currentBucket.split(' ');
        let [hours, minutes, seconds] = timePart.split(':').map(Number);

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        time.setHours(hours, minutes || 0, seconds || 0, 0);
    }

    // Update background gradient based on new time
    const newColors = getGradientByHour(time);
    updateGradient(newColors);

    // Update visualization and display
    updateVisualization();
    updateTimeDisplay();
}

// Update time display
function updateTimeDisplay() {
    const currentBucket = timeBuckets[currentTimeIndex];
    d3.select("#currentTimeDisplay").text(currentBucket);
    d3.select("#timePeriodDisplay").text(getTimePeriod(time.getHours()));

    // update accident count for current time bucket & current year
    const accidentCount = globalData.filter(d =>
        d['Time of Collision BUCKET'] === currentBucket &&
        d.year === currentYear
    ).length;
    d3.select("#accidentCount").text(accidentCount);

    console.log(`Time display updated: ${currentBucket}, count: ${accidentCount}`);
}

// utility functions
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;

    const [timePart, period] = timeStr.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);

    let totalMinutes = hours % 12 * 60 + (minutes || 0);
    if (period === 'PM') totalMinutes += 12 * 60;
    return totalMinutes;
}

function findClosestTimeIndex(targetTime) {
    const targetMinutes = targetTime.getHours() * 60 + targetTime.getMinutes();
    let closestIndex = 0;
    let minDifference = Infinity;

    timeBuckets.forEach((bucket, index) => {
        const bucketMinutes = timeToMinutes(bucket);
        const difference = Math.abs(bucketMinutes - targetMinutes);

        if (difference < minDifference) {
            minDifference = difference;
            closestIndex = index;
        }
    });

    return closestIndex;
}


function getTimePeriod(hours) {
    if (hours >= 6 && hours < 12) return "Morning";
    else if (hours >= 12 && hours < 17) return "Afternoon";
    else if (hours >= 17 && hours < 20) return "Evening";
    else return "Night";
}

function updateGradient(newColors) {
    const interpolate = currentColors.map((c, i) => d3.interpolateRgb(currentColors[i], newColors[i]));
    let t = 0;
    const step = () => {
        t += 0.02;
        if(t > 1) t = 1;
        const interpolated = interpolate.map(f => f(t));
        body.style("background", `linear-gradient(120deg, ${interpolated.join(", ")})`)
            .style("background-size", "400% 400%");
        if(t < 1) requestAnimationFrame(step);
        else currentColors = newColors;
    };
    step();
}

window.App = {
    getGlobalData: () => globalData,
    getTimeBuckets: () => timeBuckets,
    getCurrentTimeIndex: () => currentTimeIndex,
    getCurrentTime: () => time,
    getCurrentYear: () => currentYear,
    handleTimeChange: handleTimeChange,

};