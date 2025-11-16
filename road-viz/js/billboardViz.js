/* * * * * * * * * * * * * * * *
*       BillboardViz            *
* * * * * * * * * * * * * * * */

class BillboardViz {
    constructor(parentElement, backgroundSvg) {
        this.parentElement = parentElement;
        this.backgroundSvg = backgroundSvg;
        this.scrollProgress = 0;
        
        // Road perspective: diagonal from bottom-left to top-right
        // Road in original SVG goes from approximately (0, 832) to (1280, 335)
        // These will be scaled to viewport dimensions
        this.roadStartX_svg = 0;
        this.roadStartY_svg = 832;
        this.roadEndX_svg = 1280;
        this.roadEndY_svg = 335;
        this.svgWidth = 1280;
        this.svgHeight = 832;
        
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Get container dimensions
        vis.margin = {top: 0, right: 0, bottom: 0, left: 0};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height;

        // Create main SVG
        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .style("position", "absolute")
            .style("top", 0)
            .style("left", 0);

        // Add background layer
        vis.backgroundLayer = vis.svg.append("g").attr("class", "background-layer");
        
        // Calculate scaling to always fill width (no blank sides)
        const svgAspectRatio = vis.svgWidth / vis.svgHeight;
        
        // Always fit to width, center vertically if needed
        const bgWidth = vis.width;
        const bgHeight = vis.width / svgAspectRatio;
        const bgX = 0;
        const bgY = (vis.height - bgHeight) / 2;
        
        // Use image element to display background SVG
        vis.backgroundLayer.append("image")
            .attr("href", "assets/road-background.svg")
            .attr("width", bgWidth)
            .attr("height", bgHeight)
            .attr("x", bgX)
            .attr("y", bgY);
        
        // Store background bounds for billboard positioning
        vis.bgBounds = {x: bgX, y: bgY, width: bgWidth, height: bgHeight};

        // Create billboard layer
        vis.billboardLayer = vis.svg.append("g").attr("class", "billboard-layer");

        // Initialize billboard data
        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // Create 3 billboards with initial positions
        vis.billboardData = [
            {
                id: 0,
                baseX: 400,  // Starting position on road
                baseY: 700,  // Y position on road
                chartType: 'bar',
                chartData: [20, 35, 45, 30, 25, 40]
            },
            {
                id: 1,
                baseX: 600,
                baseY: 600,
                chartType: 'pie',
                chartData: [
                    {label: 'A', value: 30},
                    {label: 'B', value: 25},
                    {label: 'C', value: 45}
                ]
            },
            {
                id: 2,
                baseX: 800,
                baseY: 500,
                chartType: 'bar',
                chartData: [15, 50, 35, 20, 45, 30]
            }
        ];

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Create billboard groups
        vis.billboards = vis.billboardLayer.selectAll(".billboard-group")
            .data(vis.billboardData);

        vis.billboards.exit().remove();

        const billboardEnter = vis.billboards.enter()
            .append("g")
            .attr("class", "billboard-group");

        // Create trapezoid for each billboard
        billboardEnter.each(function(d, i) {
            const group = d3.select(this);
            
            // Create trapezoid path
            group.append("path")
                .attr("class", "billboard-trapezoid")
                .attr("fill", "#F5ECE4")
                .attr("stroke", "#0f0b05")
                .attr("stroke-width", 2);
            
            // Create chart container group
            group.append("g")
                .attr("class", "chart-container");
            
            // Create text container group
            group.append("g")
                .attr("class", "text-container");
        });

        // Merge and update
        vis.billboards = billboardEnter.merge(vis.billboards);

        // Initial update with scroll position
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            vis.updateScrollPosition(vis.scrollProgress);
        }, 0);
    }

    updateScrollPosition(scrollProgress) {
        let vis = this;
        vis.scrollProgress = scrollProgress;

        // Check if billboards exist
        if (!vis.billboards || vis.billboards.empty()) {
            return;
        }

        // Calculate movement range
        // Start off-screen right (outside drawing area), end off-screen left
        const startX = vis.width + 400;  // Start off-screen right
        const endX = -400;  // End off-screen left
        const xRange = startX - endX;

        // Calculate scale range
        const minScale = 0.5;
        const maxScale = 1.4;
        const scaleRange = maxScale - minScale;

        // Sequential appearance: each billboard appears after the previous one is gone
        const billboardDuration = 0.4;  // Each billboard takes 40% of scroll range
        const billboardGap = 0.1;  // Gap between billboards

        vis.billboards.each(function(d, i) {
            const group = d3.select(this);
            
            // Calculate when this billboard should start and end
            const billboardStart = i * (billboardDuration + billboardGap);
            const billboardEnd = billboardStart + billboardDuration;
            
            let adjustedProgress;
            if (scrollProgress < billboardStart) {
                adjustedProgress = 0;  // Not started yet
            } else if (scrollProgress > billboardEnd) {
                adjustedProgress = 1;  // Finished
            } else {
                // Normalize to 0-1 within this billboard's range
                adjustedProgress = (scrollProgress - billboardStart) / billboardDuration;
            }
            
            // Calculate x position (right to left)
            const x = startX - (adjustedProgress * xRange);
            
            // Calculate scale (smaller to larger)
            const scale = minScale + (adjustedProgress * scaleRange);
            
            // Scale road coordinates to match background scaling
            const bgScaleX = vis.bgBounds.width / vis.svgWidth;
            const bgScaleY = vis.bgBounds.height / vis.svgHeight;
            const roadStartX = vis.bgBounds.x + (vis.roadStartX_svg * bgScaleX);
            const roadStartY = vis.bgBounds.y + (vis.roadStartY_svg * bgScaleY);
            const roadEndX = vis.bgBounds.x + (vis.roadEndX_svg * bgScaleX);
            const roadEndY = vis.bgBounds.y + (vis.roadEndY_svg * bgScaleY);
            
            // Calculate y position on road based on x
            // Road equation: y = roadStartY + ((x - roadStartX) / (roadEndX - roadStartX)) * (roadEndY - roadStartY)
            // Clamp x to road bounds for calculation, but allow billboards outside
            const clampedX = Math.max(roadStartX, Math.min(roadEndX, x));
            const roadY = roadStartY + ((clampedX - roadStartX) / (roadEndX - roadStartX)) * (roadEndY - roadStartY);
            
            // Billboard dimensions
            const billboardWidth = 150 * scale;
            const billboardHeight = 100 * scale;
            
            // Calculate trapezoid points matching Vector 8.svg shape
            // Left and right sides are VERTICAL
            // Top and bottom edges are PARALLEL to road (slanted)
            // Shape: isosceles trapezoid with vertical sides
            const roadSlope = (roadEndY - roadStartY) / (roadEndX - roadStartX);
            
            // Bottom edge: parallel to road, centered at (x, roadY)
            const bottomHalfWidth = billboardWidth / 2;
            const bottomLeftX = x - bottomHalfWidth;
            const bottomLeftY = roadY - (bottomHalfWidth * roadSlope);
            const bottomRightX = x + bottomHalfWidth;
            const bottomRightY = roadY + (bottomHalfWidth * roadSlope);
            
            // Top edge: parallel to bottom, same horizontal width (vertical sides)
            // Left and right sides are VERTICAL - same X coordinates for top and bottom
            const topLeftX = bottomLeftX;  // Vertical left side
            const topRightX = bottomRightX;  // Vertical right side
            
            // Top edge: parallel to bottom (same slope), at height billboardHeight above
            const topCenterY = roadY - billboardHeight;
            const topCenterX = x;  // Top edge center is directly above bottom center
            
            // Top edge line: y = topCenterY + roadSlope * (x - topCenterX)
            // Find Y coordinates where vertical sides intersect the top edge
            const topLeftY = topCenterY + roadSlope * (topLeftX - topCenterX);
            const topRightY = topCenterY + roadSlope * (topRightX - topCenterX);
            
            // Create trapezoid path (relative to group origin at roadY)
            // Convert to group-relative coordinates
            const bottomLeftX_rel = bottomLeftX - x;
            const bottomLeftY_rel = bottomLeftY - roadY;
            const bottomRightX_rel = bottomRightX - x;
            const bottomRightY_rel = bottomRightY - roadY;
            const topLeftX_rel = topLeftX - x;
            const topLeftY_rel = topLeftY - roadY;
            const topRightX_rel = topRightX - x;
            const topRightY_rel = topRightY - roadY;
            
            const trapezoidPath = `M ${bottomLeftX_rel} ${bottomLeftY_rel} L ${bottomRightX_rel} ${bottomRightY_rel} L ${topRightX_rel} ${topRightY_rel} L ${topLeftX_rel} ${topLeftY_rel} Z`;
            
            group.select(".billboard-trapezoid")
                .attr("d", trapezoidPath);
            
            // Calculate center point for chart and text (in billboard coordinate system)
            const centerX = 0;  // Relative to group
            const centerY = -billboardHeight / 2;  // Relative to roadY
            
            // Apply transform to position and scale the entire group
            // The group transform positions it, and all children inherit the perspective
            group.attr("transform", `translate(${x}, ${roadY}) scale(${scale})`);
            
            // Update chart (positioned relative to group origin)
            vis.updateChart(group, d, centerX, centerY, scale);
            
            // Update text (positioned relative to group origin)
            vis.updateText(group, d, centerX, centerY, scale);
        });
    }

    updateChart(group, billboardData, centerX, centerY, scale) {
        let vis = this;
        
        const chartContainer = group.select(".chart-container");
        chartContainer.selectAll("*").remove();
        
        // Chart dimensions (not scaled, as scale is applied to group)
        const chartWidth = 100;
        const chartHeight = 60;
        
        if (billboardData.chartType === 'bar') {
            // Create bar chart
            const barData = billboardData.chartData;
            const maxValue = d3.max(barData);
            
            const xScale = d3.scaleBand()
                .domain(d3.range(barData.length))
                .range([0, chartWidth])
                .padding(0.1);
            
            const yScale = d3.scaleLinear()
                .domain([0, maxValue])
                .range([chartHeight, 0]);
            
            chartContainer.selectAll(".bar")
                .data(barData)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", (d, i) => centerX - chartWidth/2 + xScale(i))
                .attr("y", d => centerY - chartHeight/2 + yScale(d))
                .attr("width", xScale.bandwidth())
                .attr("height", d => chartHeight - yScale(d))
                .attr("fill", "#0f0b05")
                .attr("stroke", "#F5ECE4")
                .attr("stroke-width", 1);
        } else if (billboardData.chartType === 'pie') {
            // Create pie chart
            const pieData = billboardData.chartData;
            const pie = d3.pie()
                .value(d => d.value)
                .sort(null);
            
            const radius = Math.min(chartWidth, chartHeight) / 2 - 5;
            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);
            
            const colors = ['#0f0b05', '#4a4a4a', '#7a7a7a'];
            
            chartContainer.selectAll(".pie-slice")
                .data(pie(pieData))
                .enter()
                .append("path")
                .attr("class", "pie-slice")
                .attr("d", arc)
                .attr("fill", (d, i) => colors[i % colors.length])
                .attr("stroke", "#F5ECE4")
                .attr("stroke-width", 1)
                .attr("transform", `translate(${centerX}, ${centerY})`);
        }
    }

    updateText(group, billboardData, centerX, centerY, scale) {
        let vis = this;
        
        const textContainer = group.select(".text-container");
        textContainer.selectAll("*").remove();
        
        // Font size (not scaled, as scale is applied to group)
        const fontSize = 12;
        
        textContainer.append("text")
            .attr("class", "billboard-text")
            .attr("x", centerX)
            .attr("y", centerY - 40)
            .attr("text-anchor", "middle")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", fontSize)
            .attr("font-weight", "600")
            .attr("fill", "#0f0b05")
            .text(`Billboard ${billboardData.id + 1}`);
        
        textContainer.append("text")
            .attr("class", "billboard-text")
            .attr("x", centerX)
            .attr("y", centerY + 50)
            .attr("text-anchor", "middle")
            .attr("font-family", "Overpass, sans-serif")
            .attr("font-size", fontSize * 0.8)
            .attr("fill", "#0f0b05")
            .text(billboardData.chartType === 'bar' ? 'Bar Chart' : 'Pie Chart');
    }
}

