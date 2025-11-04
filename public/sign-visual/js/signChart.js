import {YearScroll} from '../../../js/yearScroll.js';
import {PlayButton} from './playButton.js';

import {createSolutionVisualization} from './solution.js';

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

function nextSignPage() {
    window.currentSignPage = (window.currentSignPage + 1) % 2;
    console.log('Current sign page after:', window.currentSignPage);

    if (window.currentSignPage === 0) {
        showSignChartPage();
    } else if (window.currentSignPage === 1) {
        showSolutionVisualizationPage();
    }

    updateSignNavigationButton();
}

function updateSignNavigationButton() {
    const btn = document.getElementById('nextSignPageBtn');
    if (!btn) return;

    if (window.currentSignPage === 0) {
        btn.textContent = '→ Solution Visual';
    } else {
        btn.textContent = '← Back to Sign Chart';
    }
}

// Show sign chart page (current visualization)
function showSignChartPage() {

    const signContainer = document.getElementById('yearScrollContainer');
    const cardsRow = document.getElementById('cardsRow');
    const playBtn = document.getElementById('playBtn');

    if (signContainer) signContainer.style.display = 'block';
    if (cardsRow) cardsRow.style.display = 'flex';
    if (playBtn) playBtn.style.display = 'block';

    const solutionViz = document.getElementById('solutionVisualization');
    if (solutionViz) solutionViz.style.display = 'none';

    createSignNavigationButton();
    console.log('Sign chart page displayed');
}

// Show solution visualization page
function showSolutionVisualizationPage() {
    const signContainer = document.getElementById('yearScrollContainer');
    const cardsRow = document.getElementById('cardsRow');
    const playBtn = document.getElementById('playBtn');

    if (signContainer) signContainer.style.display = 'none';
    if (cardsRow) cardsRow.style.display = 'none';
    if (playBtn) playBtn.style.display = 'none';

    let solutionViz = document.getElementById('solutionVisualization');
    if (!solutionViz) {
        solutionViz = document.createElement('div');
        solutionViz.id = 'solutionVisualization';
        solutionViz.style.cssText = `
            width: 100%;
            height: 600px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        `;

        const signContainer = document.getElementById('yearScrollContainer');
        if (signContainer && signContainer.parentNode) {
            signContainer.parentNode.insertBefore(solutionViz, signContainer.nextSibling);
        } else {
            document.body.appendChild(solutionViz);
        }

        window.solutionViz = new createSolutionVisualization('#solutionVisualization', 800, 600);
    } else {
        solutionViz.style.display = 'flex';
    }

    createSignNavigationButton();
    console.log('Solution visualization page displayed');
}

function createSignNavigationButton() {
    const existingBtn = document.getElementById('nextSignPageBtn');
    if (existingBtn) existingBtn.remove();

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'signNavButtonContainer';
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.top = '20px';
    buttonContainer.style.right = '20px';
    buttonContainer.style.zIndex = '1000';

    const nextPageBtn = document.createElement('button');
    nextPageBtn.id = 'nextSignPageBtn';
    nextPageBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        cursor: pointer;
    `;
    nextPageBtn.onclick = nextSignPage;

    nextPageBtn.addEventListener('mouseenter', () => {
        nextPageBtn.style.background = 'rgba(255, 255, 255, 0.25)';
        nextPageBtn.style.transform = 'translateY(-2px)';
        nextPageBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
    });
    nextPageBtn.addEventListener('mouseleave', () => {
        nextPageBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        nextPageBtn.style.transform = 'translateY(0)';
        nextPageBtn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
    });

    buttonContainer.appendChild(nextPageBtn);

    const mainContainer = document.querySelector('main') || document.body;
    mainContainer.style.position = 'relative';
    mainContainer.appendChild(buttonContainer);

    updateSignNavigationButton();
}

function initSignPageNavigation() {
    console.log('=== INITIALIZING SIGN PAGE NAVIGATION ===');
    setTimeout(() => {
        createSignNavigationButton();
        console.log("Sign page navigation system initialized successfully");
    }, 1000);
}

let actualStartYear, actualEndYear;

d3.csv('./data/dataset.csv').then(csvData => {
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
        width: 800
    });
    signScroll.init();

    const playButton = new PlayButton('#playBtn', signScroll, 600, 400);

    updateCountsAndRanks(signScroll.getCurrentYear());

    initSignPageNavigation();

}).catch(err => {
    console.error('Error loading CSV:', err);
});

window.nextSignPage = nextSignPage;
window.showSignChartPage = showSignChartPage;
window.showSolutionVisualizationPage = showSolutionVisualizationPage;
