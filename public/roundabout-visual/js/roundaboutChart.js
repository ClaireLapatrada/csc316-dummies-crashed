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
      labelFactor: 1.25, // How far out to place labels (increased to prevent overlap)
      margin: { top: 60, right: 60, bottom: 60, left: 60 },
      curve: d3.curveBasisClosed, // Smoother curve for the data path
      totalCollisions: null, // Total number of collisions for converting percentages
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
    this.chartWidth = this.width * 0.85 - this.opts.margin.left - this.opts.margin.right + 100;
    this.chartHeight = this.height * 0.85 - this.opts.margin.top - this.opts.margin.bottom;
    
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

    // --- 2b. Draw Level Labels ---
    // Add labels for each level - either counts or percentages
    const allLevels = d3.range(1, this.opts.levels + 1); // [1, 2, 3, 4, 5]
    const formatNumber = d3.format(',');
    const formatPercent = d3.format('.0%');
    
    // Function to get label text - use counts if available, otherwise percentages
    const getLabelText = (level) => {
      const proportion = level / this.opts.levels;
      if (this.opts.totalCollisions) {
        return formatNumber(Math.round(proportion * this.opts.totalCollisions));
      }
      return formatPercent(proportion);
    };
    
    // Top labels (positive y-axis)
    this.g.selectAll('.level-label-top')
      .data(allLevels)
      .enter()
      .append('text')
      .attr('class', 'level-label')
      .attr('x', 0)
      .attr('y', d => -this.rScale(d / this.opts.levels))
      .attr('dy', '0.35em')
      .text(d => getLabelText(d))
      .style('font-size', '10px')
      .style('fill', '#ffffff')
      .style('font-weight', '500')
      .style('text-anchor', 'middle');
    
    // Bottom labels (negative y-axis)
    this.g.selectAll('.level-label-bottom')
      .data(allLevels)
      .enter()
      .append('text')
      .attr('class', 'level-label')
      .attr('x', 0)
      .attr('y', d => this.rScale(d / this.opts.levels))
      .attr('dy', '0.35em')
      .text(d => getLabelText(d))
      .style('font-size', '10px')
      .style('fill', '#ffffff')
      .style('font-weight', '500')
      .style('text-anchor', 'middle');
    
    // Right labels (positive x-axis)
    this.g.selectAll('.level-label-right')
      .data(allLevels)
      .enter()
      .append('text')
      .attr('class', 'level-label')
      .attr('x', d => this.rScale(d / this.opts.levels))
      .attr('y', 0)
      .attr('dy', '0.35em')
      .text(d => getLabelText(d))
      .style('font-size', '10px')
      .style('fill', '#ffffff')
      .style('font-weight', '500')
      .style('text-anchor', 'middle');
    
    // Left labels (negative x-axis)
    this.g.selectAll('.level-label-left')
      .data(allLevels)
      .enter()
      .append('text')
      .attr('class', 'level-label')
      .attr('x', d => -this.rScale(d / this.opts.levels))
      .attr('y', 0)
      .attr('dy', '0.35em')
      .text(d => getLabelText(d))
      .style('font-size', '10px')
      .style('fill', '#ffffff')
      .style('font-weight', '500')
      .style('text-anchor', 'middle');
      
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
      .attr('x', (d, i) => this.rScale(this.opts.labelFactor) * Math.cos(this.angleSlice * i + this.angleOffset))
      .attr('y', (d, i) => this.rScale(this.opts.labelFactor) * Math.sin(this.angleSlice * i + this.angleOffset))
      .attr('dy', '0.35em') // Vertical alignment
      .text(d => d)
      .style('font-family', 'Overpass, sans-serif')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('fill', '#FFFFFF')
      .call(this.wrapText, 100); // Wrap long labels

    // --- 5. Draw the Data Series ---
    
    const radarLine = d3.lineRadial()
      .angle((d, i) => this.angleSlice * i + this.angleOffset)
      .radius(d => this.rScale(d.value))
      .curve(this.opts.curve);

    // Draw each series
    this.series.forEach(series => {
      // Color palette for each segment
      const colors = [
        '#e41a1c', // red
        '#377eb8', // blue
        '#4daf4a', // green
        '#984ea3', // purple
        '#ff7f00', // orange
        '#ffff33', // yellow
        '#a65628', // brown
        '#f781bf'  // pink
      ];
      
      // Draw each segment centered on its spoke
      series.axes.forEach((d, i) => {
        const prevIndex = (i - 1 + series.axes.length) % series.axes.length;
        const nextIndex = (i + 1) % series.axes.length;
        
        // Current spoke angle and radius
        const currentAngle = this.angleSlice * i + this.angleOffset;
        const currentRadius = this.rScale(d.value);
        
        // Midpoint angles to previous and next spokes
        const angleToPrev = currentAngle - this.angleSlice / 2;
        const angleToNext = currentAngle + this.angleSlice / 2;
        
        // Radii at the midpoints (interpolate between adjacent values)
        const prevRadius = this.rScale(series.axes[prevIndex].value);
        const nextRadius = this.rScale(series.axes[nextIndex].value);
        const radiusAtPrevMid = (currentRadius + prevRadius) / 2;
        const radiusAtNextMid = (currentRadius + nextRadius) / 2;
        
        // Helper to build path at a given progress t in [0,1]
        const buildPath = (t) => {
          const s = Math.max(0, Math.min(1, t));
          const rPrev = radiusAtPrevMid * s;
          const rCur  = currentRadius * s;
          const rNext = radiusAtNextMid * s;
          return `M 0,0
            L ${rPrev * Math.cos(angleToPrev)},${rPrev * Math.sin(angleToPrev)}
            L ${rCur * Math.cos(currentAngle)},${rCur * Math.sin(currentAngle)}
            L ${rNext * Math.cos(angleToNext)},${rNext * Math.sin(angleToNext)}
            Z`;
        };

        // Store the angle for hover expansion
        const segmentAngle = currentAngle;
        const chartInstance = this;
        
        const segment = this.g.append('path')
          .attr('d', buildPath(0))
          .attr('fill', colors[i % colors.length])
          .attr('fill-opacity', 0)
          .attr('stroke', colors[i % colors.length])
          .attr('stroke-width', 2)
          .attr('stroke-opacity', 0)
          .style('cursor', 'pointer')
          .attr('transform', 'translate(0, 0)')
          .on('mouseover', function(event) {
            // Expand the segment on hover
            const expandDistance = 15; // pixels to expand
            const dx = Math.cos(segmentAngle) * expandDistance;
            const dy = Math.sin(segmentAngle) * expandDistance;
            d3.select(this)
              .transition()
              .duration(200)
              .ease(d3.easeCubicOut)
              .attr('transform', `translate(${dx}, ${dy})`)
              .attr('stroke-width', 3)
              .attr('fill-opacity', 0.9);
          })
          .on('mousemove', (event) => {
            chartInstance.showTooltip(event, d);
          })
          .on('mouseout', function() {
            // Contract the segment on mouseout
            d3.select(this)
              .transition()
              .duration(200)
              .ease(d3.easeCubicOut)
              .attr('transform', 'translate(0, 0)')
              .attr('stroke-width', 2)
              .attr('fill-opacity', 0.7);
            chartInstance.hideTooltip();
          });

        // Animate outwards
        segment
          .transition()
          .delay(i * 80)
          .duration(700)
          .ease(d3.easeCubicOut)
          .attrTween('d', () => (t) => buildPath(t))
          .attr('fill-opacity', 0.7)
          .attr('stroke-opacity', 1);
      });
    });
  }

  /**
   * Shows the tooltip.
   */
  showTooltip(event, d) {
    const formatPercent = d3.format('.1%');
    const formatNumber = d3.format(',');

    let valueLine = formatPercent(d.value);
    if (Number.isFinite(this.opts.totalCollisions)) {
      const count = Math.round((d.value || 0) * this.opts.totalCollisions);
      valueLine += ` (${formatNumber(count)} of ${formatNumber(this.opts.totalCollisions)})`;
    }

    this.tooltip.style('opacity', 1)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 28}px`)
      .html(`<strong>${d.axis}</strong><br>${valueLine}`);
  }

  /**
   * Hides the tooltip.
   */
  hideTooltip() {
    this.tooltip.style('opacity', 0);
  }

  /**
   * Updates the chart with a new data series (and optional options) and re-renders.
   * @param {Array} seriesData - New series data in the same format as constructor.
   * @param {Object} options - Optional options to merge (e.g., totalCollisions)
   */
  update(seriesData, options = {}) {
    this.series = seriesData;
    // Merge option overrides
    this.opts = { ...this.opts, ...options };
    // Recompute axes and angle slice
    this.axes = this.series[0].axes.map(d => d.axis);
    this.numAxes = this.axes.length;
    this.angleSlice = (Math.PI * 2) / this.numAxes;
    // Re-render
    this.render();
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