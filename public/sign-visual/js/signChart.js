// Global variable to track current page
if (typeof window.currentSignPage === 'undefined') {
    window.currentSignPage = 0; // 0 = main sign chart, 1 = solution visualization
}

const categories = [
    { id: "bike", name: "Bike", icon: "./svg/bike.svg" },
    { id: "car", name: "Car", icon: "./svg/car.svg" },
    { id: "pedestrian", name: "Pedestrian", icon: "./svg/pedestrian.svg" }
];

const data = {};
let rawData = [];

function countFatalAccidentsByType(yearData, year) {
    const yearEntries = yearData.filter(d => +d['Year of collision'] === year);

    const counts = {
        bike: 0,
        car: 0,
        pedestrian: 0
    };

    yearEntries.forEach(entry => {
        const accidentClassification = entry['Accident Classification'];
        const isFatal = accidentClassification && accidentClassification.toLowerCase().includes('fatal');

        if (isFatal) {
            if (entry['Cyclist Involved'] === 'Yes') counts.bike++;
            if (entry['Automobile Involved'] === 'Yes') counts.car++;
            if (entry['Pedestrian Involved'] === 'Yes') counts.pedestrian++;
        }
    });

    return counts;
}

function updateCountsAndRanks(year) {
    categories.forEach(cat => {
        const cardElement = document.getElementById(`${cat.id}Card`);
        if (cardElement) cardElement.style.display = 'flex';
    });

    if (!data[year]) {
        console.log(`No data for year ${year}`);
        return;
    }

    const fatalCounts = countFatalAccidentsByType(rawData, year);

    const values = categories.map(cat => ({
        id: cat.id,
        value: data[year][cat.id],
        deathCount: fatalCounts[cat.id] || 0
    }));

    console.log(`Year ${year}: Total=${data[year].bike}/${data[year].car}/${data[year].pedestrian}, Fatal=${fatalCounts.bike}/${fatalCounts.car}/${fatalCounts.pedestrian}`);

    values.forEach(v => {
        const countElement = document.getElementById(`${v.id}Count`);
        const deathElement = document.getElementById(`${v.id}DeathCount`);

        if (countElement) countElement.textContent = v.value;
        if (deathElement) deathElement.textContent = v.deathCount;
    });

    const ranked = [...values].sort((a,b) => b.value - a.value);
    ranked.forEach((v, index) => {
        const rankElement = document.getElementById(`${v.id}Rank`);
        if (rankElement) rankElement.textContent = index + 1;
    });
}


let actualStartYear, actualEndYear;

d3.csv('data/dataset.csv').then(csvData => {
    rawData = csvData;
    const validYears = [...new Set(csvData.map(d => +d['Year of collision']))].filter(year => year >= 2006 && year <= 2023).sort();
    actualStartYear = Math.min(...validYears);
    actualEndYear = Math.max(...validYears);

    console.log(`Actual data range: ${actualStartYear} to ${actualEndYear}`);

    const yearData = {};

    validYears.forEach(year => {
        yearData[year] = { bike: 0, car: 0, pedestrian: 0 };
    });

    csvData.forEach(d => {
        const year = +d['Year of collision'];
        if (yearData[year]) {
            if (d['Cyclist Involved'] === 'Yes') yearData[year].bike++;
            if (d['Automobile Involved'] === 'Yes') yearData[year].car++;
            if (d['Pedestrian Involved'] === 'Yes') yearData[year].pedestrian++;
        }
    });

    Object.assign(data, yearData);

    Object.keys(data).sort().forEach(year => {
        console.log(`Year ${year}:`, data[year]);
    });

    const signScroll = new YearScroll("#yearScrollContainer", {
        startYear: actualStartYear,
        endYear: actualEndYear,
        onYearChange: updateCountsAndRanks,
        width: 836
    });
    signScroll.init();

    const playButton = new PlayButton('#playBtn', signScroll, 600, 400);

    updateCountsAndRanks(signScroll.getCurrentYear());


}).catch(err => {
    console.error('Error loading CSV:', err);
});

