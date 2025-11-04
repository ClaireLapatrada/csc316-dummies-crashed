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
        this.isAM = true; // Default to AM
        this.draggingHand = null; // 'hour' or 'minute'

        // map hour numbers to time positions (0=12, 1=1, ..., 11=11)
        this.hourPositions = this.calculateHourPositions();
    }

    calculateHourPositions() {
        const positions = [];
        const radius = 120;
        const centerX = 150;
        const centerY = 150;

        for (let hour = 0; hour < 12; hour++) {
            const angle = (hour * 30 - 90) * (Math.PI / 180); // 30° per hour for 12-hour clock

            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            positions.push({
                hour: hour === 0 ? 12 : hour, // Show 12 instead of 0
                x, y, angle
            });
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

        // Create AM/PM toggle buttons
        const toggleContainer = container.append("div")
            .style("display", "flex")
            .style("justify-content", "center")
            .style("gap", "20px")
            .style("margin-bottom", "15px");

        // AM Button
        const amButton = toggleContainer.append("button")
            .text("AM")
            .style("padding", "8px 20px")
            .style("border", "1px solid rgba(255,255,255,0.3)")
            .style("border-radius", "20px")
            .style("background", this.isAM ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)")
            .style("color", "white")
            .style("cursor", "pointer")
            .style("font-weight", this.isAM ? "bold" : "normal")
            .style("backdrop-filter", "blur(10px)")
            .on("click", function() {
                if (!self.isAM) {
                    self.isAM = true;
                    self.updateAMPMButtons();
                    self.updateHands();
                    self.callbacks.handleTimeChange(self.currentTimeIndex);
                }
            });

        // PM Button
        const pmButton = toggleContainer.append("button")
            .text("PM")
            .style("padding", "8px 20px")
            .style("border", "1px solid rgba(255,255,255,0.3)")
            .style("border-radius", "20px")
            .style("background", !this.isAM ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)")
            .style("color", "white")
            .style("cursor", "pointer")
            .style("font-weight", !this.isAM ? "bold" : "normal")
            .style("backdrop-filter", "blur(10px)")
            .on("click", function() {
                if (self.isAM) {
                    self.isAM = false;
                    self.updateAMPMButtons();
                    self.updateHands();
                    self.callbacks.handleTimeChange(self.currentTimeIndex);
                }
            });

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

        // Main circle (background area)
        const clockCircle = svg.append("circle")
            .attr("cx", 150)
            .attr("cy", 150)
            .attr("r", 140)
            .attr("fill", "url(#circleGradient)")
            .attr("stroke", "rgba(255,255,255,0.3)")
            .attr("stroke-width", 2)
            .style("cursor", "grab");

        // Add minute markers (30-minute increments only)
        for (let minute = 0; minute < 60; minute += 30) {
            const angle = (minute * 6 - 90) * (Math.PI / 180); // 6° per minute
            const innerRadius = 130;
            const outerRadius = 140;

            const x1 = 150 + innerRadius * Math.cos(angle);
            const y1 = 150 + innerRadius * Math.sin(angle);
            const x2 = 150 + outerRadius * Math.cos(angle);
            const y2 = 150 + outerRadius * Math.sin(angle);

            svg.append("line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .attr("stroke", "rgba(255,255,255,0.5)")
                .attr("stroke-width", 3);
        }

        // Add hour markers (1-12)
        for (let hour = 0; hour < 12; hour++) {
            const angle = (hour * 30 - 90) * (Math.PI / 180); // 30° per hour
            const isMajorHour = hour % 3 === 0; // 12, 3, 6, 9 are major hours

            const innerRadius = isMajorHour ? 120 : 125;
            const outerRadius = 140;
            const strokeWidth = isMajorHour ? 4 : 2;
            const strokeColor = isMajorHour ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)";

            const x1 = 150 + innerRadius * Math.cos(angle);
            const y1 = 150 + innerRadius * Math.sin(angle);
            const x2 = 150 + outerRadius * Math.cos(angle);
            const y2 = 150 + outerRadius * Math.sin(angle);

            svg.append("line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .attr("stroke", strokeColor)
                .attr("stroke-width", strokeWidth);
        }

        // Add hour labels (1-12 format)
        this.hourPositions.forEach((pos, index) => {
            const isMajorHour = index % 3 === 0; // 12, 3, 6, 9
            const fontSize = isMajorHour ? "14px" : "12px";
            const fontWeight = isMajorHour ? "bold" : "normal";
            const fillColor = isMajorHour ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)";

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

        // Get current time components
        const { hourAngle, minuteAngle } = this.getCurrentAngles();
        const hourHandLength = 70;
        const minuteHandLength = 100;

        this.handsGroup = svg.append("g")
            .attr("class", "hands-group");

        // Add arrowhead markers
        const defs = svg.append("defs");

        // Hour hand arrowhead (smaller, white)
        defs.append("marker")
            .attr("id", "hourArrowhead")
            .attr("markerWidth", 8)
            .attr("markerHeight", 6)
            .attr("refX", 8)
            .attr("refY", 3)
            .attr("orient", "auto")
            .append("polygon")
            .attr("points", "0 0, 8 3, 0 6")
            .attr("fill", "#ffffff");

        // Minute hand arrowhead (smaller, red)
        defs.append("marker")
            .attr("id", "minuteArrowhead")
            .attr("markerWidth", 8)
            .attr("markerHeight", 5)
            .attr("refX", 8)
            .attr("refY", 2.5)
            .attr("orient", "auto")
            .append("polygon")
            .attr("points", "0 0, 8 2.5, 0 5")
            .attr("fill", "#ff6b6b");

        // Hour hand (thinner, shorter)
        this.hourHand = this.handsGroup.append("line")
            .attr("x1", 150)
            .attr("y1", 150)
            .attr("x2", 150 + hourHandLength * Math.cos(hourAngle))
            .attr("y2", 150 + hourHandLength * Math.sin(hourAngle))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 4)
            .attr("stroke-linecap", "round")
            .attr("marker-end", "url(#hourArrowhead)")
            .style("cursor", "grab")
            .style("pointer-events", "all");

        // Add hour hand circle for better dragging (smaller)
        this.hourHandCircle = this.handsGroup.append("circle")
            .attr("cx", 150 + hourHandLength * Math.cos(hourAngle))
            .attr("cy", 150 + hourHandLength * Math.sin(hourAngle))
            .attr("r", 12)
            .attr("fill", "#ffffff")
            .attr("opacity", 0.3)
            .style("cursor", "grab")
            .style("pointer-events", "all");

        // Minute hand (thinner, longer)
        this.minuteHand = this.handsGroup.append("line")
            .attr("x1", 150)
            .attr("y1", 150)
            .attr("x2", 150 + minuteHandLength * Math.cos(minuteAngle))
            .attr("y2", 150 + minuteHandLength * Math.sin(minuteAngle))
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("marker-end", "url(#minuteArrowhead)")
            .style("cursor", "grab")
            .style("pointer-events", "all");

        // Add minute hand circle for better dragging (smaller)
        this.minuteHandCircle = this.handsGroup.append("circle")
            .attr("cx", 150 + minuteHandLength * Math.cos(minuteAngle))
            .attr("cy", 150 + minuteHandLength * Math.sin(minuteAngle))
            .attr("r", 10)
            .attr("fill", "#ff6b6b")
            .attr("opacity", 0.3)
            .style("cursor", "grab")
            .style("pointer-events", "all");

        // Center circle (slightly smaller)
        this.centerCircle = svg.append("circle")
            .attr("cx", 150)
            .attr("cy", 150)
            .attr("r", 6)
            .attr("fill", "#ffffff")
            .style("cursor", "pointer")
            .on("click", function(event) {
                event.stopPropagation();
                self.resetToCurrentTime();
            });

        // Create drag behaviors with proper sensitivity
        const hourDrag = d3.drag()
            .on("start", function(event) {
                self.isDragging = true;
                self.draggingHand = 'hour';
                container.style("cursor", "grabbing");
                self.hourHand.style("cursor", "grabbing");
                self.hourHandCircle.style("cursor", "grabbing");

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.startAngle = Math.atan2(dy, dx);
                self.currentAngle = self.startAngle;

                // Store initial time for direct snapping
                self.initialHour = self.getCurrent12Hour();
                self.initialMinutes = self.getCurrentMinutes();
            })
            .on("drag", function(event) {
                if (!self.isDragging || self.draggingHand !== 'hour') return;

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.currentAngle = Math.atan2(dy, dx);

                let angleDiff = self.currentAngle - self.startAngle;

                // Normalize angle difference
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                // Reduced sensitivity - require more movement
                const maxAngle = Math.PI / 4; // 45° maximum movement per drag
                const clampedAngleDiff = Math.max(-maxAngle, Math.min(maxAngle, angleDiff));

                // Move hour hand by 1-hour increments (30° per hour)
                // More movement required to trigger change
                const hourSteps = clampedAngleDiff / (Math.PI / 8); // 22.5° per step

                // Only update if we have significant movement
                if (Math.abs(hourSteps) >= 0.6) {
                    const direction = hourSteps > 0 ? 1 : -1;
                    self.adjustHours(direction); // Only move by 1 hour at a time
                    self.startAngle = self.currentAngle;
                }
            })
            .on("end", function(event) {
                // Snap to nearest hour
                if (self.isDragging) {
                    const currentHour = self.getCurrent12Hour();
                    const currentMinutes = self.getCurrentMinutes();
                    // Ensure we're exactly on an hour (00 minutes)
                    if (currentMinutes !== 0) {
                        self.setTime(currentHour, 0);
                    }
                }

                self.isDragging = false;
                self.draggingHand = null;
                container.style("cursor", "grab");
                self.hourHand.style("cursor", "grab");
                self.hourHandCircle.style("cursor", "grab");
            });

        const minuteDrag = d3.drag()
            .on("start", function(event) {
                self.isDragging = true;
                self.draggingHand = 'minute';
                container.style("cursor", "grabbing");
                self.minuteHand.style("cursor", "grabbing");
                self.minuteHandCircle.style("cursor", "grabbing");

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.startAngle = Math.atan2(dy, dx);
                self.currentAngle = self.startAngle;

                // Store initial time for direct snapping
                self.initialHour = self.getCurrent12Hour();
                self.initialMinutes = self.getCurrentMinutes();
            })
            .on("drag", function(event) {
                if (!self.isDragging || self.draggingHand !== 'minute') return;

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.currentAngle = Math.atan2(dy, dx);

                let angleDiff = self.currentAngle - self.startAngle;

                // Normalize angle difference
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                // Reduced sensitivity - require more movement
                const maxAngle = Math.PI / 4; // 45° maximum movement per drag
                const clampedAngleDiff = Math.max(-maxAngle, Math.min(maxAngle, angleDiff));

                // Move minute hand by 30-minute increments (180° per 30 minutes)
                // More movement required to trigger change
                const minuteSteps = clampedAngleDiff / (Math.PI / 8); // 22.5° per step

                // Only update if we have significant movement
                if (Math.abs(minuteSteps) >= 0.6) {
                    const direction = minuteSteps > 0 ? 1 : -1;
                    self.adjustMinutes(direction); // Only move by 30 minutes at a time
                    self.startAngle = self.currentAngle;
                }
            })
            .on("end", function(event) {
                // Snap to nearest 30-minute increment
                if (self.isDragging) {
                    const currentMinutes = self.getCurrentMinutes();
                    const currentHour = self.getCurrent12Hour();
                    // Snap to nearest 30 minutes (0 or 30)
                    const snappedMinutes = Math.round(currentMinutes / 30) * 30;
                    if (currentMinutes !== snappedMinutes) {
                        self.setTime(currentHour, snappedMinutes);
                    }
                }

                self.isDragging = false;
                self.draggingHand = null;
                container.style("cursor", "grab");
                self.minuteHand.style("cursor", "grab");
                self.minuteHandCircle.style("cursor", "grab");
            });

        // Background drag for general time adjustment (less sensitive)
        const backgroundDrag = d3.drag()
            .on("start", function(event) {
                self.isDragging = true;
                container.style("cursor", "grabbing");

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.startAngle = Math.atan2(dy, dx);
                self.currentAngle = self.startAngle;

                // Store initial time
                self.initialHour = self.getCurrent12Hour();
                self.initialMinutes = self.getCurrentMinutes();
            })
            .on("drag", function(event) {
                if (!self.isDragging) return;

                const dx = event.x - 150;
                const dy = event.y - 150;
                self.currentAngle = Math.atan2(dy, dx);

                let angleDiff = self.currentAngle - self.startAngle;

                // Normalize angle difference
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                // Reduced sensitivity
                const maxAngle = Math.PI / 3; // 60° maximum movement
                const clampedAngleDiff = Math.max(-maxAngle, Math.min(maxAngle, angleDiff));

                // Determine which hand to move based on distance from center
                const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
                const isMovingMinuteHand = distanceFromCenter > 100; // Outer area for minutes

                if (isMovingMinuteHand) {
                    // Move minute hand by 30-minute increments
                    const minuteSteps = clampedAngleDiff / (Math.PI / 6);
                    if (Math.abs(minuteSteps) >= 0.8) {
                        const direction = minuteSteps > 0 ? 1 : -1;
                        self.adjustMinutes(direction);
                        self.startAngle = self.currentAngle;
                    }
                } else {
                    // Move hour hand by 1-hour increments
                    const hourSteps = clampedAngleDiff / (Math.PI / 6);
                    if (Math.abs(hourSteps) >= 0.8) {
                        const direction = hourSteps > 0 ? 1 : -1;
                        self.adjustHours(direction);
                        self.startAngle = self.currentAngle;
                    }
                }
            })
            .on("end", function(event) {
                self.isDragging = false;
                container.style("cursor", "grab");
            });

        // Apply drag behaviors
        this.hourHand.call(hourDrag);
        this.hourHandCircle.call(hourDrag);
        this.minuteHand.call(minuteDrag);
        this.minuteHandCircle.call(minuteDrag);
        clockCircle.call(backgroundDrag);

        // Add wheel event listener with smooth scrolling
        const element = document.querySelector(this.containerSelector);
        if (element) {
            let wheelTimeout = null;
            element.addEventListener('wheel', function(event) {
                if (self.animationInProgress || self.isDragging) return;

                event.preventDefault();
                event.stopPropagation();

                // Debounce wheel events to prevent too rapid changes
                if (wheelTimeout) return;

                self.animationInProgress = true;
                const delta = event.deltaY;

                // Smooth scrolling - only one step per wheel event
                if (event.shiftKey) {
                    // Adjust hours by 1-hour increments
                    if (delta < 0) {
                        self.adjustHours(1); // Scroll up - increase hour
                    } else {
                        self.adjustHours(-1); // Scroll down - decrease hour
                    }
                } else {
                    // Adjust minutes by 30-minute increments
                    if (delta < 0) {
                        self.adjustMinutes(1); // Scroll up - increase minutes by 30
                    } else {
                        self.adjustMinutes(-1); // Scroll down - decrease minutes by 30
                    }
                }

                // Debounce wheel events
                wheelTimeout = setTimeout(() => {
                    wheelTimeout = null;
                    self.animationInProgress = false;
                }, 200);
            }, { passive: false });
        }

        // Update the current time display initially
        this.updateCurrentTimeDisplay();

        console.log('Draggable clock hands with improved sensitivity initialized');
    }

    updateAMPMButtons() {
        const container = d3.select(this.containerSelector);

        container.select("button:first-child")
            .style("background", this.isAM ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)")
            .style("font-weight", this.isAM ? "bold" : "normal");

        container.select("button:last-child")
            .style("background", !this.isAM ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)")
            .style("font-weight", !this.isAM ? "bold" : "normal");

        this.updateCurrentTimeDisplay();
    }

    adjustHours(hourSteps) {
        // For drag and wheel, we only move by 1 hour at a time
        const direction = hourSteps > 0 ? 1 : -1;

        let currentHour = this.getCurrent12Hour();

        if (direction > 0) {
            currentHour = (currentHour % 12) + 1;
            if (currentHour === 12) {
                // Toggle AM/PM when going from 11 to 12
                this.isAM = !this.isAM;
            }
        } else {
            currentHour = (currentHour - 1 + 12) % 12 || 12;
            if (currentHour === 11) {
                // Toggle AM/PM when going from 12 to 11
                this.isAM = !this.isAM;
            }
        }

        this.setTime(currentHour, this.getCurrentMinutes());
        this.updateHands();
        this.updateAMPMButtons();
        this.callbacks.handleTimeChange(this.currentTimeIndex);

        // Reset animation flag
        this.animationInProgress = false;
    }

    adjustMinutes(minuteSteps) {
        // For drag and wheel, we only move by 30 minutes at a time
        const direction = minuteSteps > 0 ? 1 : -1;

        let currentMinutes = this.getCurrentMinutes();
        let currentHour = this.getCurrent12Hour();

        if (direction > 0) {
            currentMinutes += 30; // 30-minute increments
            if (currentMinutes >= 60) {
                currentMinutes = 0;
                currentHour = (currentHour % 12) + 1;
                if (currentHour === 12) {
                    this.isAM = !this.isAM;
                }
            }
        } else {
            currentMinutes -= 30;
            if (currentMinutes < 0) {
                currentMinutes = 30;
                currentHour = (currentHour - 1 + 12) % 12 || 12;
                if (currentHour === 11) {
                    this.isAM = !this.isAM;
                }
            }
        }

        this.setTime(currentHour, currentMinutes);
        this.updateHands();
        this.updateAMPMButtons();
        this.callbacks.handleTimeChange(this.currentTimeIndex);

        // Reset animation flag
        this.animationInProgress = false;
    }

    getCurrent12Hour() {
        const currentTime = this.timeBuckets[this.currentTimeIndex];
        const [timePart] = currentTime.split(' ');
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        // Convert to 12-hour format
        const hour12 = hours % 12 || 12;
        return hour12;
    }

    getCurrentMinutes() {
        const currentTime = this.timeBuckets[this.currentTimeIndex];
        const [timePart] = currentTime.split(' ');
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        return minutes || 0;
    }

    setTime(hour, minutes) {
        // Convert to 24-hour format for timeBuckets index
        let hour24 = hour;
        if (!this.isAM && hour !== 12) {
            hour24 = hour + 12;
        } else if (this.isAM && hour === 12) {
            hour24 = 0;
        }

        // Generate the target time in the exact format of your time buckets
        const targetTime = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00 ${this.isAM ? 'AM' : 'PM'}`;

        // Find exact match
        this.currentTimeIndex = this.timeBuckets.findIndex(bucket => bucket === targetTime);

        if (this.currentTimeIndex === -1) {
            // If no exact match found, try to find the closest time
            const targetMinutes = hour24 * 60 + minutes;
            let closestIndex = 0;
            let minDifference = Infinity;

            this.timeBuckets.forEach((bucket, index) => {
                const bucketMinutes = this.timeToMinutes(bucket);
                const difference = Math.abs(bucketMinutes - targetMinutes);

                if (difference < minDifference) {
                    minDifference = difference;
                    closestIndex = index;
                }
            });

            this.currentTimeIndex = closestIndex;
        }

        // Call the callback to update the visualization
        this.callbacks.handleTimeChange(this.currentTimeIndex);
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;

        const [timePart, period] = timeStr.split(' ');
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        let totalMinutes = hours % 12 * 60 + (minutes || 0);
        if (period === 'PM') totalMinutes += 12 * 60;
        return totalMinutes;
    }

    getCurrentAngles() {
        const currentHour = this.getCurrent12Hour();
        const currentMinutes = this.getCurrentMinutes();

        // For 12-hour clock, hour hand moves 30° per hour + 0.5° per minute
        const hourAngle = (currentHour * 30 + currentMinutes * 0.5 - 90) * (Math.PI / 180);
        // Minute hand moves 6° per minute
        const minuteAngle = (currentMinutes * 6 - 90) * (Math.PI / 180);

        return { hourAngle, minuteAngle };
    }

    updateHands() {
        const { hourAngle, minuteAngle } = this.getCurrentAngles();
        const hourHandLength = 70;
        const minuteHandLength = 100;

        const hourX = 150 + hourHandLength * Math.cos(hourAngle);
        const hourY = 150 + hourHandLength * Math.sin(hourAngle);
        const minuteX = 150 + minuteHandLength * Math.cos(minuteAngle);
        const minuteY = 150 + minuteHandLength * Math.sin(minuteAngle);

        this.hourHand
            .attr("x2", hourX)
            .attr("y2", hourY);

        this.hourHandCircle
            .attr("cx", hourX)
            .attr("cy", hourY);

        this.minuteHand
            .attr("x2", minuteX)
            .attr("y2", minuteY);

        this.minuteHandCircle
            .attr("cx", minuteX)
            .attr("cy", minuteY);

        this.updateBackgroundGradient();
        this.updateCurrentTimeDisplay();
    }

    updateCurrentTimeDisplay() {
        const currentHour = this.getCurrent12Hour();
        const currentMinutes = this.getCurrentMinutes();
        const period = this.isAM ? 'AM' : 'PM';

        // Update the existing currentTimeDisplay element in your HTML
        const currentTimeDisplay = document.getElementById('currentTimeDisplay');
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = `${currentHour}:${currentMinutes.toString().padStart(2, '0')} ${period}`;
        }
    }

    resetToCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();

        // Round minutes to nearest 30
        minutes = Math.round(minutes / 30) * 30;
        if (minutes === 60) {
            minutes = 0;
            hours = (hours + 1) % 24;
        }

        this.isAM = hours < 12;
        const hour12 = hours % 12 || 12;

        this.setTime(hour12, minutes);
        this.updateHands();
        this.updateAMPMButtons();
    }

    updateBackgroundGradient() {
        const currentHour = this.getCurrent12Hour();
        const currentMinutes = this.getCurrentMinutes();
        const hour24 = this.isAM ? (currentHour === 12 ? 0 : currentHour) : (currentHour === 12 ? 12 : currentHour + 12);

        const currentTime = new Date();
        currentTime.setHours(hour24, currentMinutes, 0, 0);

        const newColors = window.Background.getGradientByHour(currentTime);
        window.Background.updateGradient(newColors);
    }
}