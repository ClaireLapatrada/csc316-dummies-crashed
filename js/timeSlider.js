class TimeSliderWithHours {
    constructor(containerSelector, timeBuckets, callbacks) {
        this.containerSelector = containerSelector;
        this.timeBuckets = timeBuckets;
        this.callbacks = callbacks;
        this.currentTimeIndex = callbacks.currentTimeIndex || 0;
        this.isDragging = false;
        this.startAngle = 0;
        this.currentAngle = 0;
        this.animationInProgress = false;

        // map hour numbers to time positions (0=12AM, 1=1AM, ..., 23=11PM)
        this.hourPositions = this.calculateHourPositions();
    }

    calculateHourPositions() {
        const positions = [];
        const radius = 120;
        const centerX = 150;
        const centerY = 150;

        for (let hour = 0; hour < 24; hour++) {
            const angle = (hour * 15 - 90) * (Math.PI / 180);

            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            positions.push({ hour, x, y, angle });
        }

        return positions;
    }

    init() {
        const self = this;

        // clear container first
        d3.select(this.containerSelector).html("");

        // create main container
        const container = d3.select(this.containerSelector)
            .style("position", "relative")
            .style("width", "300px")
            .style("height", "300px")
            .style("cursor", "grab")
            .style("user-select", "none");

        // create SVG
        const svg = container.append("svg")
            .attr("width", 300)
            .attr("height", 300)
            .attr("viewBox", "0 0 300 300");

        // create background circle with gradient
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "circleGradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(255,255,255,0.1)");

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(255,255,255,0.05)");

        // Main circle (draggable area)
        const clockCircle = svg.append("circle")
            .attr("cx", 150)
            .attr("cy", 150)
            .attr("r", 140)
            .attr("fill", "url(#circleGradient)")
            .attr("stroke", "rgba(255,255,255,0.3)")
            .attr("stroke-width", 2)
            .style("cursor", "grab");

        for (let hour = 0; hour < 24; hour++) {
            const angle = (hour * 15) * (Math.PI / 180); // 15° per hour
            const isMajorHour = hour % 6 === 0; // 0, 6, 12, 18 are major hours

            const innerRadius = isMajorHour ? 130 : 135;
            const outerRadius = 140;
            const strokeWidth = isMajorHour ? 2 : 1;
            const strokeColor = isMajorHour ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)";

            const x1 = 150 + innerRadius * Math.cos(angle - Math.PI/2); // Offset by -90° to start at top
            const y1 = 150 + innerRadius * Math.sin(angle - Math.PI/2);
            const x2 = 150 + outerRadius * Math.cos(angle - Math.PI/2);
            const y2 = 150 + outerRadius * Math.sin(angle - Math.PI/2);

            svg.append("line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .attr("stroke", strokeColor)
                .attr("stroke-width", strokeWidth);
        }

        this.hourPositions.forEach((pos, index) => {
            const isMajorHour = index % 6 === 0; // 0, 6, 12, 18
            const fontSize = isMajorHour ? "12px" : "10px";
            const fontWeight = isMajorHour ? "bold" : "normal";
            const fillColor = isMajorHour ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)";

            svg.append("text")
                .attr("x", pos.x)
                .attr("y", pos.y)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", fillColor)
                .style("font-size", fontSize)
                .style("font-weight", fontWeight)
                .style("pointer-events", "none")
                .text(pos.hour);
        });

        const currentHour = this.getCurrentHour();
        const pointerAngle = (currentHour * 15 - 90) * (Math.PI / 180);
        const pointerLength = 110;

        this.pointerGroup = svg.append("g")
            .attr("class", "pointer-group");

        // Pointer line
        this.pointer = this.pointerGroup.append("line")
            .attr("x1", 150)
            .attr("y1", 150)
            .attr("x2", 150 + pointerLength * Math.cos(pointerAngle))
            .attr("y2", 150 + pointerLength * Math.sin(pointerAngle))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 3)
            .attr("marker-end", "url(#arrowhead)");

        // add arrowhead marker
        svg.append("defs")
            .append("marker")
            .attr("id", "arrowhead")
            .attr("markerWidth", 10)
            .attr("markerHeight", 7)
            .attr("refX", 10)
            .attr("refY", 3.5)
            .attr("orient", "auto")
            .append("polygon")
            .attr("points", "0 0, 10 3.5, 0 7")
            .attr("fill", "#ffffff");

        svg.append("circle")
            .attr("cx", 150)
            .attr("cy", 150)
            .attr("r", 4)
            .attr("fill", "#ffffff");

        const drag = d3.drag()
            .on("start", function(event) {
                self.isDragging = true;
                container.style("cursor", "grabbing");

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.startAngle = Math.atan2(dy, dx);
                self.currentAngle = self.startAngle;
            })
            .on("drag", function(event) {
                if (!self.isDragging) return;

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.currentAngle = Math.atan2(dy, dx);

                let angleDiff = self.currentAngle - self.startAngle;

                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const maxAngle = Math.PI;
                const clampedAngleDiff = Math.max(-maxAngle, Math.min(maxAngle, angleDiff));
                const timeSteps = clampedAngleDiff / (Math.PI / 12); // π/12 radians = 15°

                if (Math.abs(timeSteps) >= 0.3) {
                    const direction = timeSteps > 0 ? 1 : -1;
                    const steps = Math.floor(Math.abs(timeSteps));

                    let timeChanged = false;
                    for (let i = 0; i < steps; i++) {
                        if (direction > 0) {
                            if (self.currentTimeIndex < self.timeBuckets.length - 1) {
                                self.currentTimeIndex++;
                                timeChanged = true;
                            }
                        } else {
                            if (self.currentTimeIndex > 0) {
                                self.currentTimeIndex--;
                                timeChanged = true;
                            }
                        }
                    }

                    if (timeChanged) {

                        self.updatePointer();
                        self.callbacks.handleTimeChange(self.currentTimeIndex);

                        self.startAngle = self.currentAngle;
                    }
                }
            })
            .on("end", function(event) {
                self.isDragging = false;
                container.style("cursor", "grab");
            });

        clockCircle.call(drag);

        const element = document.querySelector(this.containerSelector);

        element.addEventListener('wheel', function(event) {
            if (self.animationInProgress || self.isDragging) return;

            event.preventDefault();
            event.stopPropagation();

            const delta = event.deltaY;

            self.animationInProgress = true;

            if (delta < 0) {
                // Scroll up - move backward by exactly 30 minutes (1 time bucket)
                if (self.currentTimeIndex === 0) {
                    // Wrap around to the end (11:30 PM)
                    self.currentTimeIndex = self.timeBuckets.length - 1;
                } else {
                    self.currentTimeIndex--;
                }
            } else {
                if (self.currentTimeIndex === self.timeBuckets.length - 1) {
                    self.currentTimeIndex = 0;
                } else {
                    self.currentTimeIndex++;
                }
            }

            self.smoothUpdatePointer();

        }, { passive: false });

        element.addEventListener('click', function(event) {
            if (self.animationInProgress || self.isDragging) return;

            self.animationInProgress = true;

            if (self.currentTimeIndex < self.timeBuckets.length - 1) {
                self.currentTimeIndex++;
            } else {
                self.currentTimeIndex = 0;
            }
            self.smoothUpdatePointer();
        });

        console.log('TimeSlider with 180-degree dragging and 30-minute scroll increments initialized');
    }

    getCurrentHour() {
        const currentTime = this.timeBuckets[this.currentTimeIndex];
        const [timePart, period] = currentTime.split(' ');
        let [hours] = timePart.split(':').map(Number);

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return hours;
    }

    smoothUpdatePointer() {
        const self = this;
        const currentHour = this.getCurrentHour();
        const targetAngle = (currentHour * 15 - 90) * (Math.PI / 180);
        const pointerLength = 110;

        const targetX = 150 + pointerLength * Math.cos(targetAngle);
        const targetY = 150 + pointerLength * Math.sin(targetAngle);

        this.pointer
            .transition()
            .duration(400)
            .ease(d3.easeCubicOut)
            .attr("x2", targetX)
            .attr("y2", targetY)
            .on("end", function() {
                self.animationInProgress = false;
                self.callbacks.handleTimeChange(self.currentTimeIndex);

                self.updateBackgroundGradient();
            });
    }

    updatePointer() {
        const currentHour = this.getCurrentHour();
        const pointerAngle = (currentHour * 15 - 90) * (Math.PI / 180);
        const pointerLength = 110;

        const x2 = 150 + pointerLength * Math.cos(pointerAngle);
        const y2 = 150 + pointerLength * Math.sin(pointerAngle);

        this.pointer
            .attr("x2", x2)
            .attr("y2", y2);

        this.updateBackgroundGradient();
    }

    updateBackgroundGradient() {
        const currentTime = new Date();
        const [timePart, period] = this.timeBuckets[this.currentTimeIndex].split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        currentTime.setHours(hours, minutes || 0, 0, 0);

        const newColors = window.Background.getGradientByHour(currentTime);
        window.Background.updateGradient(newColors);
    }
}