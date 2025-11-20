// Main initialization for Vehicle Injury Visualization

let vehicleChart;
let yearScroller;
let timeSlider;
let globalData = [];
let timeBuckets = [];
let currentYear = 2006;
let currentTimeIndex = 0;

// Utility functions
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [timePart, period] = timeStr.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    let totalMinutes = hours % 12 * 60 + (minutes || 0);
    if (period === 'PM') totalMinutes += 12 * 60;
    return totalMinutes;
}

function findClosestTimeIndex(targetTime, buckets) {
    const targetMinutes = targetTime.getHours() * 60 + targetTime.getMinutes();
    let closestIndex = 0;
    let minDifference = Infinity;

    buckets.forEach((bucket, index) => {
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

// Load data and initialize
d3.csv("data/dataset.csv").then(function(data) {
    globalData = data;
    console.log("CSV data loaded:", globalData.length, "records");

    // Extract years from data
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

    // Set initial time index (6:30 PM)
    let time = new Date();
    time.setHours(18, 30, 0, 0);
    currentTimeIndex = findClosestTimeIndex(time, timeBuckets);

    // Initialize vehicle chart
    vehicleChart = new VehicleChart("#vizContainer", globalData, {
        onYearChange: (year) => {
            currentYear = year;
            updateDisplay();
        },
        onTimeChange: (timeBucket) => {
            updateDisplay();
        }
    });
    vehicleChart.init();
    vehicleChart.setYear(currentYear);
    vehicleChart.setTimeBucket(timeBuckets[currentTimeIndex]);

    // Initialize year scroller
    yearScroller = new YearScroll('#yearScroller', {
        startYear: 2006,
        endYear: 2023,
        onYearChange: (year) => {
            currentYear = year;
            vehicleChart.setYear(year);
            updateDisplay();
        },
        width: Math.min(800, window.innerWidth - 200)
    });
    yearScroller.init();
    yearScroller.setYear(currentYear);

    // Initialize time slider
    timeSlider = new TimeSliderWithHours(
        "#timeSlider",
        timeBuckets,
        {
            currentTimeIndex: currentTimeIndex,
            handleTimeChange: (newTimeIndex) => {
                currentTimeIndex = newTimeIndex;
                // Update visualization immediately, synchronously
                vehicleChart.setTimeBucket(timeBuckets[newTimeIndex]);
                updateDisplay();
            },
            onDragStart: (isDragging) => {
                // Mark as dragging for instant updates (no animations)
                vehicleChart.setDragging(isDragging);
            }
        }
    );
    timeSlider.init();

    // Set up play and restart buttons
    const playBtn = document.querySelector('#playBtn');
    const restartBtn = document.querySelector('#restartBtn');
    let playInterval = null;
    
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (playInterval) {
                // Stop playing
                clearInterval(playInterval);
                playInterval = null;
                playBtn.classList.remove('playing');
            } else {
                // Start playing
                playBtn.classList.add('playing');
                playInterval = setInterval(() => {
                    let nextYear = currentYear + 1;
                    if (nextYear > 2023) {
                        clearInterval(playInterval);
                        playInterval = null;
                        playBtn.classList.remove('playing');
                        return;
                    }
                    currentYear = nextYear;
                    yearScroller.setYear(currentYear);
                    vehicleChart.setYear(currentYear);
                    updateDisplay();
                }, 1000);
            }
        });
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
                playBtn.classList.remove('playing');
            }
            currentYear = 2006;
            yearScroller.setYear(currentYear);
            vehicleChart.setYear(currentYear);
            updateDisplay();
        });
    }

    // Initial display update
    updateDisplay();

}).catch(function(error) {
    console.error("Error loading the CSV file:", error);
    d3.select("#vizContainer")
        .append("div")
        .style("color", "red")
        .style("padding", "2rem")
        .style("text-align", "center")
        .text("Error: Could not load data/dataset.csv. Please check the file path and format.");
});

function updateDisplay() {
    // Update year display
    d3.select("#currentYearDisplay").text(currentYear);

    // Update time display
    const currentBucket = timeBuckets[currentTimeIndex];
    if (currentBucket) {
        d3.select("#currentTimeDisplay").text(currentBucket);
        
        // Calculate time period
        const [timePart, period] = currentBucket.split(' ');
        let [hours] = timePart.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        d3.select("#timePeriodDisplay").text(getTimePeriod(hours));
    }
}

