

class PlayButton {
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

        this.button.addEventListener('click', () => this.toggle());
        
        // Set up restart button
        const restartBtn = document.querySelector('#restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restart());
        }
    }

    toggle() {
        if (this.playInterval) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.button.classList.add('playing');

        this.playInterval = setInterval(() => {
            let nextYear = this.yearScroll.getCurrentYear() + 1;
            if (nextYear > this.yearScroll.endYear) {
                this.stop();
                return;
            }

            const endX = this.yearScroll.xScale(nextYear);

            if (this.yearScroll.pedIcon) {
                this.yearScroll.pedIcon.transition()
                    .duration(this.transitionTime)
                    .ease(d3.easeLinear)
                    .attr("x", endX - 20);
            }

            this.yearScroll.currentYear = nextYear;
            this.yearScroll._updateYearLabels();
            if (this.yearScroll.onYearChange) this.yearScroll.onYearChange(nextYear);

        }, this.intervalTime);
    }

    stop() {
        clearInterval(this.playInterval);
        this.playInterval = null;
        this.button.classList.remove('playing');
    }
    
    restart() {
        this.stop();
        const startYear = this.yearScroll.startYear;
        const endX = this.yearScroll.xScale(startYear);
        
        if (this.yearScroll.pedIcon) {
            this.yearScroll.pedIcon.transition()
                .duration(this.transitionTime)
                .ease(d3.easeLinear)
                .attr("x", endX - 20);
        }
        
        this.yearScroll.currentYear = startYear;
        this.yearScroll._updateYearLabels();
        if (this.yearScroll.onYearChange) this.yearScroll.onYearChange(startYear);
    }
}
window.PlayButton = PlayButton;


