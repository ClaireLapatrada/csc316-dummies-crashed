import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export class PlayButton {
    /**
     * @param {string} selector - CSS selector for the button element
     * @param {YearScroll} yearScroll - Instance of YearScroll
     * @param {number} intervalTime - Time between year steps in ms (default 600)
     * @param {number} transitionTime - Duration of car animation in ms (default 400)
     */
    constructor(selector, yearScroll, intervalTime = 600, transitionTime = 400) {
        this.button = document.querySelector(selector);
        if (!this.button) throw new Error(`PlayButton: No element found for selector ${selector}`);

        this.yearScroll = yearScroll;
        this.intervalTime = intervalTime;
        this.transitionTime = transitionTime;
        this.playInterval = null;

        this.button.classList.add('go');
        this.button.textContent = 'GO';
        this.button.style.cursor = 'pointer';

        this.button.addEventListener('click', () => this.toggle());
    }

    toggle() {
        if (this.playInterval) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.button.textContent = 'STOP';
        this.button.classList.remove('go');
        this.button.classList.add('stop');

        this.playInterval = setInterval(() => {
            let nextYear = this.yearScroll.getCurrentYear() + 1;
            if (nextYear > this.yearScroll.endYear) nextYear = this.yearScroll.startYear;

            const endX = this.yearScroll.xScale(nextYear);

            this.yearScroll.car.transition()
                .duration(this.transitionTime)
                .ease(d3.easeLinear)
                .attr("transform", `translate(${endX - 18}, ${this.yearScroll.height/2 - 10})`);

            this.yearScroll.currentYear = nextYear;
            this.yearScroll._updateYearLabels();
            if (this.yearScroll.onYearChange) this.yearScroll.onYearChange(nextYear);

        }, this.intervalTime);
    }

    stop() {
        clearInterval(this.playInterval);
        this.playInterval = null;
        this.button.textContent = 'GO';
        this.button.classList.remove('stop');
        this.button.classList.add('go');
    }
}
