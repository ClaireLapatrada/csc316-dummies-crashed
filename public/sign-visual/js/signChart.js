import {YearScroll} from '../../../js/yearScroll.js';
import {PlayButton} from './playButton.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const categories = [
    { id: "bike", name: "Bike", icon: "./svg/bike.svg" },
    { id: "car", name: "Car", icon: "./svg/car.svg" },
    { id: "pedestrian", name: "Pedestrian", icon: "./svg/pedestrian.svg" }
];

const data = {};

function updateCountsAndRanks(year) {
    const values = categories.map(cat => ({
        id: cat.id,
        value: data[year][cat.id]
    }));

    values.forEach(v => {
        document.getElementById(`${v.id}Count`).textContent = v.value;
    });

    const ranked = [...values].sort((a,b) => b.value - a.value);
    ranked.forEach((v, index) => {
        document.getElementById(`${v.id}Rank`).textContent = index + 1;
    });
}

d3.csv('./data/deaths.csv', d => {
    const year = +d.year;
    data[year] = {
        bike: +d.bike,
        car: +d.car,
        pedestrian: +d.pedestrian
    };
}).then(() => {

    const signScroll = new YearScroll("#yearScrollContainer", {
        startYear: 2006,
        endYear: 2023,
        onYearChange: updateCountsAndRanks,
        width: 800
    });
    signScroll.init();

    const playButton = new PlayButton('#playBtn', signScroll, 600, 400);

    updateCountsAndRanks(signScroll.getCurrentYear());
}).catch(err => {
    console.error('Error loading CSV:', err);
});
