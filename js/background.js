// Gradient backgrounds for different times of day
const gradients = {
    morning: ["#FFF7C0", "#ea5525", "#ffe88a", "#ff7858"],
    afternoon: ["#87CEFA", "#ADD8E6", "#e8d87e", "#E0FFFF"],
    evening: ["#e0b92b", "#8342bd", "#531994", "#4b1e7a"],
    night: ["#26267e", "#080870", "#151591", "#1a1a2a"]
};

let currentColors = gradients.evening;
const body = d3.select("body");

function initBackground() {
    animateGradientShift();
}

// Get gradient by hour
function getGradientByHour(date) {
    if(date.getHours() >= 6 && date.getHours() < 12) return gradients.morning;
    else if(date.getHours() >= 12 && date.getHours() < 17) return gradients.afternoon;
    else if(date.getHours() >= 17 && date.getHours() < 20) return gradients.evening;
    else return gradients.night;
}

// initialize gradient animation
function animateGradientShift() {
    let position = 0;
    function step() {
        position = (position + 0.2) % 100;
        body.style("background-position", `${position}% 50%`);
        requestAnimationFrame(step);
    }
    step();
}

// update gradient with smooth transition
function updateGradient(newColors) {
    const interpolate = currentColors.map((c, i) => d3.interpolateRgb(c, newColors[i]));
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

window.Background = {
    updateGradient: (newColors) => updateGradient(newColors),
    getGradientByHour: (date) => getGradientByHour(date)
};