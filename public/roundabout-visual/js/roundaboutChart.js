/**
 * RoundaboutChart
 * A D3 radar chart component styled to look like a 5-lane roundabout.
 */
class RoundaboutChart {

  /**
   * Constructor
   * @param {string} parentSelector - CSS selector for the parent SVG element
   * @param {Array} seriesData - Array of data series objects
   * @param {Object} options - Configuration options
   */
  constructor(parentSelector, seriesData, options = {}) {
    // --- 1. Setup Properties ---
    this.parentSelector = parentSelector;
    this.svg = d3.select(parentSelector);
    if (this.svg.empty()) {
      console.error(`Error: Parent element ${parentSelector} not found.`);
      return;
    }
    
    this.series = seriesData;
    this.tooltip = d3.select('.tooltip');
    
    // Define all axes and count
    this.axes = this.series[0].axes.map(d => d.axis);
    this.numAxes = this.axes.length;
    this.angleSlice = (Math.PI * 2) / this.numAxes;
    this.angleOffset = -Math.PI / 2; // Start at 12 o'clock

    // Set default options and merge with user-provided ones
    this.opts = {
      levels: 5,
      islandRadius: 70,
      labelFactor: 1.15, // How far out to place labels
      margin: { top: 60, right: 60, bottom: 60, left: 60 },
      curve: d3.curveLinearClosed, // Smooth curve for the data path
      ...options // User options (from main.js) will override defaults
    };
    
    // --- 2. Initialize ---
    this._init();
    this._bindResize();
  }

  /**
   * Initializes the chart and performs the first render.
   */
  _init() {
    // Get initial dimensions from the SVG container's PARENT
    const rect = this.svg.node().parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = this.width; // Make it square (1:1 aspect ratio)
    
    // Apply initial dimensions to the SVG
    this.svg
        .attr('width', this.width)
        .attr('height', this.height);

    // Create the main 'g' container for the chart
    this.g = this.svg.append('g')
      .attr('class', 'chart-wrapper');

    // Initial render
    this.render();
  }

  /**
   * Sets up scales and layout based on current dimensions.
   */
  _layout() {
    // Calculate chart dimensions inside margins
    this.chartWidth = this.width - this.opts.margin.left - this.opts.margin.right;
    this.chartHeight = this.height - this.opts.margin.top - this.opts.margin.bottom;
    
    // Center of the chart
    this.centerX = this.chartWidth / 2;
    this.centerY = this.chartHeight / 2;
    
    // Translate the main 'g' container to the center
    this.g.attr('transform', `translate(${this.centerX + this.opts.margin.left}, ${this.centerY + this.opts.margin.top})`);

    // --- Scales ---
    const maxChartRadius = Math.min(this.chartWidth, this.chartHeight) / 2;
    
    // The "road" will go from the island radius to the max chart radius
    this.maxRadius = maxChartRadius;
    this.minRadius = this.opts.islandRadius;
    
    // This is the core scale:
    // Domain [0, 1] (data value) maps to
    // Range [minRadius, maxRadius] (pixel value)
    this.rScale = d3.scaleLinear()
      .domain([0, 1]) // Data is 0.0 to 1.0
      .range([this.minRadius, this.maxRadius]);
  }

  /**
   * Main render function. Clears and draws all chart elements.
   */
  render() {
    // Update layout and scales
    this._layout();

    // Clear previous render
    this.g.selectAll('*').remove();

    // --- 1. Draw Roundabout Base ---
    
    // Draw the main "asphalt" road surface (the biggest circle)
    this.g.append('circle')
      .attr('r', this.maxRadius)
      .attr('class', 'roundabout-road'); // Uses style from css/styles.css

    // Draw the central "grass" island
    this.g.append('circle')
      .attr('r', this.minRadius)
      .attr('class', 'roundabout-island'); // Uses style from css/styles.css

    // --- 2. Draw the "Lanes" (Grid Levels) ---
    // We have 5 levels (0.2, 0.4, 0.6, 0.8, 1.0)
    // We need 4 lane dividers (at 0.2, 0.4, 0.6, 0.8)
    const laneLevels = d3.range(1, this.opts.levels); // [1, 2, 3, 4]

    this.g.selectAll('.lane-divider')
      .data(laneLevels)
      .enter()
      .append('circle')
      .attr('class', 'lane-divider')
      .attr('r', d => this.rScale(d / this.opts.levels)) // r at 20%, 40%, 60%, 80%
      .attr('fill', 'none');
      
    // --- 3. Draw the Axis Spokes ---
    this.g.selectAll('.axis-spoke')
      .data(this.axes)
      .enter()
      .append('line')
      .attr('class', 'axis-spoke')
      .attr('x1', (d, i) => this.rScale(0) * Math.cos(this.angleSlice * i + this.angleOffset))
      .attr('y1', (d, i) => this.rScale(0) * Math.sin(this.angleSlice * i + this.angleOffset))
      .attr('x2', (d, i) => this.rScale(1) * Math.cos(this.angleSlice * i + this.angleOffset))
      .attr('y2', (d, i) => this.rScale(1) * Math.sin(this.angleSlice * i + this.angleOffset));

    // --- 4. Draw the Axis Labels ---
    this.g.selectAll('.axis-label')
      .data(this.axes)
      .enter()
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', (d, i) => this.rScale(1.05) * Math.cos(this.angleSlice * i + this.angleOffset))
      .attr('y', (d, i) => this.rScale(1.05) * Math.sin(this.angleSlice * i + this.angleOffset))
      .attr('dy', '0.35em') // Vertical alignment
      .text(d => d)
      .call(this.wrapText, 100); // Wrap long labels (optional, good practice)

    // --- 5. Draw the Data Series ---
    
    // d3.lineRadial is perfect for this
    const radarLine = d3.lineRadial()
      .angle((d, i) => this.angleSlice * i + this.angleOffset)
      .radius(d => this.rScale(d.value))
      .curve(this.opts.curve);

    // Draw each series (in our case, just one)
    this.series.forEach(series => {
      // Draw the filled area
      this.g.append('path')
        .datum(series.axes)
        .attr('class', 'data-area')
        .attr('d', radarLine)
        .attr('fill', series.color)
        .attr('stroke', series.color);

      // --- 6. Draw Tooltip Hotspots ---
      // Add invisible points at each vertex for easier hovering
      this.g.selectAll('.data-point')
        .data(series.axes)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('r', 12) // Generous hover/tap target
        .attr('cx', (d, i) => this.rScale(d.value) * Math.cos(this.angleSlice * i + this.angleOffset))
        .attr('cy', (d, i) => this.rScale(d.value) * Math.sin(this.angleSlice * i + this.angleOffset))
        .attr('fill', 'transparent')
        .on('mouseover', (event, d) => this.showTooltip(event, d))
        .on('mouseout', () => this.hideTooltip());
    });
  }

  /**
   * Shows the tooltip.
   */
  showTooltip(event, d) {
    const formatPercent = d3.format('.1%');
    this.tooltip.style('opacity', 1)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 28}px`)
      .html(`<strong>${d.axis}</strong><br>${formatPercent(d.value)}`);
  }

  /**
   * Hides the tooltip.
   */
  hideTooltip() {
    this.tooltip.style('opacity', 0);
  }

  /**
   * Binds a ResizeObserver to re-render the chart on container resize.
   */
  _bindResize() {
    const ro = new ResizeObserver(() => {
      // Get parent's width
      const rect = this.svg.node().parentElement.getBoundingClientRect();
      this.width = rect.width;
      this.height = this.width; // Maintain a 1:1 aspect ratio
      
      // Update SVG dimensions
      this.svg
        .attr('width', this.width)
        .attr('height', this.height);
        
      // Re-render the chart
      this.render();
    });
    // Observe the parent element of the SVG
    ro.observe(this.svg.node().parentElement);
  }
  
  /**
   * Helper function to wrap long SVG text labels.
   */
  wrapText(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          x = text.attr("x"),
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
      
      // Smart vertical alignment based on position
      const angle = Math.atan2(y, x);
      const isTop = Math.abs(angle + Math.PI/2) < Math.PI/4;
      const isBottom = Math.abs(angle - Math.PI/2) < Math.PI/4;
      let verticalAdjust = 0;

      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          verticalAdjust++;
        }
      }
      
      // Adjust y-position for multi-line labels on top/bottom
      if (verticalAdjust > 0) {
        if (isTop) {
           text.selectAll("tspan").attr("y", parseFloat(y) - (verticalAdjust * 10) );
        } else if (isBottom) {
           // a slight adjustment is fine
        } else {
           text.selectAll("tspan").attr("y", parseFloat(y) - (verticalAdjust * 6) );
        }
      }
      
      // Adjust text-anchor based on position (again, as in simple render)
      const deg = (angle * 180 / Math.PI) + 180;
      if (deg > 350 || deg < 10) text.style("text-anchor", "middle"); // Top
      else if (deg > 170 && deg < 190) text.style("text-anchor", "middle"); // Bottom
      else if (deg >= 190 && deg <= 350) text.style("text-anchor", "end"); // Left
      else text.style("text-anchor", "start"); // Right
    });
  }

}