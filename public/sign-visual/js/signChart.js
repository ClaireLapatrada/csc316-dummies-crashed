// Vehicle Type Collision Matrix Visualization

const vehicleTypes = [
    { id: 'automobile', name: 'Car', color: '#FFD700' },
    { id: 'pedestrian', name: 'Pedestrian', color: '#FFFFFF' },
    { id: 'cyclist', name: 'Bike', color: '#0A6B4A' },
    { id: 'motorcycle', name: 'Motorcycle', color: '#FF6B6B' },
    { id: 'truck', name: 'Truck', color: '#4ECDC4' },
    { id: 'transit', name: 'Transit', color: '#95E1D3' }
];

let rawData = [];
let matrixDataByYear = {};
let maxCollisions = 0;
let maxSeverityCount = 0;

let svg, width, height, margin;
let rowScale, colScale, cellSize;
let tooltip;

// Get vehicle types involved in a collision entry
function getVehicleTypesInvolved(entry) {
    const types = [];
    if (entry['Automobile Involved'] === 'Yes') types.push('automobile');
    if (entry['Pedestrian Involved'] === 'Yes') types.push('pedestrian');
    if (entry['Cyclist Involved'] === 'Yes') types.push('cyclist');
    if (entry['Motorcycle Involved'] === 'Yes') types.push('motorcycle');
    if (entry['Truck Involved'] === 'Yes') types.push('truck');
    if (entry['Transit or City Vehicle Involved'] === 'Yes') types.push('transit');
    return types;
}

// Get severity level
function getSeverity(entry) {
    // Try to use the explicit Injury column first
    const injury = (entry['Injury'] || '').toLowerCase();
    if (injury.includes('fatal')) return 'Fatal';
    if (injury.includes('major')) return 'Major';
    if (injury.includes('minor')) return 'Minor';
    if (injury.includes('minimal')) return 'Minimal';

    // Fallback to Accident Classification
    const classification = (entry['Accident Classification'] || '').toLowerCase();
    // Be careful not to match "non-fatal" as "fatal"
    if (classification.includes('fatal') && !classification.includes('non-fatal')) return 'Fatal';
    if (classification.includes('major')) return 'Major';
    if (classification.includes('minor')) return 'Minor';
    
    return 'Minimal';
}

// Build matrix data for a given year
function buildMatrixData(yearData, year) {
    const matrix = {};
    
    // Initialize all cells
    vehicleTypes.forEach(rowType => {
        vehicleTypes.forEach(colType => {
            const key = `${rowType.id}-${colType.id}`;
            matrix[key] = {
                row: rowType.id,
                col: colType.id,
                count: 0,
                severity: { Fatal: 0, Major: 0, Minor: 0, Minimal: 0 },
                accidents: new Set()
            };
        });
    });
    
    // Group entries by accident number (same accident can have multiple rows)
    const accidentsByNumber = {};
    yearData.forEach(entry => {
        const accidentNum = entry['Accident Number'] || entry['ACCNUM'] || entry['OBJECTID'];
        if (!accidentNum) return;
        
        if (!accidentsByNumber[accidentNum]) {
            accidentsByNumber[accidentNum] = {
                entries: [],
                involvedTypes: new Set(),
                severity: getSeverity(entry) // Use first entry's severity
            };
        }
        
        accidentsByNumber[accidentNum].entries.push(entry);
        
        // Collect all vehicle types from all rows of this accident
        const types = getVehicleTypesInvolved(entry);
        types.forEach(type => accidentsByNumber[accidentNum].involvedTypes.add(type));
    });
    
    // Process each unique accident only once
    Object.keys(accidentsByNumber).forEach(accidentNum => {
        const accident = accidentsByNumber[accidentNum];
        const involvedTypes = Array.from(accident.involvedTypes);
        
        if (involvedTypes.length === 0) return;
        
        const severity = accident.severity;
        
        // Create pairs of vehicle types (including same-type pairs)
        for (let i = 0; i < involvedTypes.length; i++) {
            for (let j = i; j < involvedTypes.length; j++) {
                const type1 = involvedTypes[i];
                const type2 = involvedTypes[j];
                
                // Skip pedestrian x pedestrian - not a collision
                if (type1 === 'pedestrian' && type2 === 'pedestrian') continue;
                
                // Use upper-left triangle (row <= col in terms of array index)
                const rowIndex = vehicleTypes.findIndex(vt => vt.id === type1);
                const colIndex = vehicleTypes.findIndex(vt => vt.id === type2);
                
                if (rowIndex === -1 || colIndex === -1) continue;
                
                // Ensure we're in lower triangle (top-left visually)
                const finalRow = rowIndex >= colIndex ? type1 : type2;
                const finalCol = rowIndex >= colIndex ? type2 : type1;
                
                const cellKey = `${finalRow}-${finalCol}`;
                
                if (matrix[cellKey]) {
                    // Count each unique accident only once per cell
                    if (!matrix[cellKey].accidents.has(accidentNum)) {
                        matrix[cellKey].count++;
                        matrix[cellKey].severity[severity]++;
                        matrix[cellKey].accidents.add(accidentNum);
                    }
                }
            }
        }
    });
    
    // Convert to array format
    const matrixArray = [];
    vehicleTypes.forEach(rowType => {
        vehicleTypes.forEach(colType => {
            const key = `${rowType.id}-${colType.id}`;
            const cell = matrix[key];
            if (cell) {
                const rowIndex = vehicleTypes.findIndex(vt => vt.id === rowType.id);
                const colIndex = vehicleTypes.findIndex(vt => vt.id === colType.id);
                
                // Only include lower triangle (top-left visually, including diagonal)
                if (rowIndex >= colIndex) {
                    matrixArray.push({
                        row: rowType.id,
                        col: colType.id,
                        rowIndex: rowIndex,
                        colIndex: colIndex,
                        count: cell.count,
                        severity: cell.severity
                    });
                }
            }
        });
    });
    
    return matrixArray;
}

// Initialize the matrix chart
function initMatrixChart() {
    const container = d3.select('#bubbleChart');
    const containerNode = container.node();
    if (!containerNode) return;
    
    const containerRect = containerNode.getBoundingClientRect();
    width = containerRect.width || 720;
    height = containerRect.height || 520;
    
    margin = { top: 80, right: 50, bottom: 20, left: 100 };
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const numTypes = vehicleTypes.length;
    // Make cells square - use the smaller dimension to ensure square cells
    // But use more of the available width for columns
    const squareSize = Math.min(chartWidth / numTypes, chartHeight / numTypes);
    const totalSquareSize = squareSize * numTypes;
    
    svg = container
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales with equal spacing for square cells
    const cellPadding = 0.02; // Equal padding for consistent spacing
    rowScale = d3.scaleBand()
        .domain(vehicleTypes.map(d => d.id))
        .range([0, totalSquareSize])
        .padding(cellPadding);
    
    colScale = d3.scaleBand()
        .domain(vehicleTypes.map(d => d.id))
        .range([0, totalSquareSize])
        .padding(cellPadding);
    
    // Create tooltip
    tooltip = d3.select('#matrixTooltip');
}

// Get color for collision count
function getColorForCount(count, maxCount) {
    if (maxCount === 0) return '#E8E8E8';
    
    const ratio = count / maxCount;
    
    // Green (low) -> Yellow -> Orange -> Red (high)
    if (ratio < 0.25) {
        // Green to Yellow
        const t = ratio / 0.25;
        return d3.interpolateRgb('#4CAF50', '#FFEB3B')(t);
    } else if (ratio < 0.5) {
        // Yellow to Orange
        const t = (ratio - 0.25) / 0.25;
        return d3.interpolateRgb('#FFEB3B', '#FF9800')(t);
    } else if (ratio < 0.75) {
        // Orange to Red-Orange
        const t = (ratio - 0.5) / 0.25;
        return d3.interpolateRgb('#FF9800', '#FF5722')(t);
    } else {
        // Red-Orange to Red
        const t = (ratio - 0.75) / 0.25;
        return d3.interpolateRgb('#FF5722', '#F44336')(t);
    }
}

// Update matrix chart for a given year
function updateMatrixChart(year) {
    if (!svg) initMatrixChart();
    if (!svg) return;
    
    // Filter by year only - includes ALL crashes regardless of severity
    const yearData = rawData.filter(d => +d['Year of collision'] === year);
    const matrixData = buildMatrixData(yearData, year);
    
    // Update global max
    matrixData.forEach(d => {
        if (d.count > maxCollisions) maxCollisions = d.count;
        Object.values(d.severity).forEach(sev => {
            if (sev > maxSeverityCount) maxSeverityCount = sev;
        });
    });
    
    // Clear previous chart
    svg.selectAll('*').remove();
    
    // Draw cells (only lower triangle - top-left visually)
    const upperTriangleData = matrixData.filter(d => {
        const rowIdx = vehicleTypes.findIndex(vt => vt.id === d.row);
        const colIdx = vehicleTypes.findIndex(vt => vt.id === d.col);
        return rowIdx >= colIdx; // Lower triangle (top-left visually) including diagonal
    });
    
    const cells = svg.selectAll('.cell-group')
        .data(upperTriangleData, d => `${d.row}-${d.col}`);
    
    const cellGroup = cells.enter()
        .append('g')
        .attr('class', 'cell-group');
    
    cellGroup
        .append('rect')
        .attr('class', 'cell')
        .attr('x', d => colScale(d.col))
        .attr('y', d => rowScale(d.row))
        .attr('width', colScale.bandwidth())
        .attr('height', rowScale.bandwidth())
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', d => {
            return getColorForCount(d.count, maxCollisions);
        })
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('stroke-width', 2)
                .attr('stroke', '#FFFFFF');
            
            const rowName = vehicleTypes.find(vt => vt.id === d.row)?.name || d.row;
            const colName = vehicleTypes.find(vt => vt.id === d.col)?.name || d.col;
            
            let tooltipHtml = `<strong>${rowName} × ${colName}</strong><br>`;
            tooltipHtml += `Total: <strong>${d.count}</strong> collisions<br>`;
            tooltipHtml += `Fatal: ${d.severity.Fatal} | Major: ${d.severity.Major}<br>`;
            tooltipHtml += `Minor: ${d.severity.Minor} | Minimal: ${d.severity.Minimal}`;
            
            tooltip
                .html(tooltipHtml)
                .classed('visible', true)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('stroke-width', 1);
            tooltip.classed('visible', false);
        });
    
    // Add text labels with collision counts
    cellGroup
        .append('text')
        .attr('class', 'cell-label')
        .attr('x', d => colScale(d.col) + colScale.bandwidth() / 2)
        .attr('y', d => rowScale(d.row) + rowScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', d => {
            // Use white text for darker colors, black for lighter
            const ratio = maxCollisions > 0 ? d.count / maxCollisions : 0;
            return ratio > 0.5 ? '#FFFFFF' : '#000000';
        })
        .attr('font-family', 'Overpass, sans-serif')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(d => d.count);
    
    // Add row labels (left side)
    const rowLabels = svg.selectAll('.row-label')
        .data(vehicleTypes);
    
    rowLabels.enter()
        .append('text')
        .merge(rowLabels)
        .attr('class', 'row-label')
        .attr('x', -15)
        .attr('y', d => rowScale(d.id) + rowScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('fill', '#FFFFFF')
        .attr('font-family', 'Overpass, sans-serif')
        .attr('font-size', '14px')
        .attr('font-weight', '500')
        .text(d => d.name);
    
    rowLabels.exit().remove();
    
    // Add column labels (top)
    const colLabels = svg.selectAll('.col-label')
        .data(vehicleTypes);
    
    colLabels.enter()
        .append('text')
        .merge(colLabels)
        .attr('class', 'col-label')
        .attr('fill', '#FFFFFF')
        .attr('font-family', 'Overpass, sans-serif')
        .attr('font-size', '14px')
        .attr('font-weight', '500')
        .attr('text-anchor', 'middle')
        .attr('transform', d => {
            // Position at center of each cell, shifted to align properly
            const x = colScale(d.id) + colScale.bandwidth() / 2 + 15;
            const y = -30;
            // Translate to position, then rotate around that point
            return `translate(${x},${y}) rotate(-45)`;
        })
        .text(d => d.name);
    
    colLabels.exit().remove();
}

// Load data and initialize
let actualStartYear, actualEndYear;
let signScroll;

d3.csv('../../data/dataset.csv').then(csvData => {
    rawData = csvData;
    
    const validYears = [...new Set(csvData.map(d => +d['Year of collision']))]
        .filter(year => year >= 2006 && year <= 2023)
        .sort((a, b) => a - b);
    
    actualStartYear = Math.min(...validYears);
    actualEndYear = Math.max(...validYears);

    console.log(`Data range: ${actualStartYear} to ${actualEndYear}`);

    // Pre-build matrix data for all years
    validYears.forEach(year => {
        const yearData = rawData.filter(d => +d['Year of collision'] === year);
        matrixDataByYear[year] = buildMatrixData(yearData, year);
    });
    
    // Initialize chart
    initMatrixChart();
    
    // Initialize year scroll
    signScroll = new YearScroll("#yearScrollContainer", {
        startYear: actualStartYear,
        endYear: actualEndYear,
        onYearChange: (year) => {
            updateMatrixChart(year);
        },
        width: 836
    });
    signScroll.init();

    // Initialize play button
    const playButton = new PlayButton('#playBtn', signScroll);

    // Initial render
    updateMatrixChart(signScroll.getCurrentYear());

}).catch(err => {
    console.error('Error loading CSV:', err);
});
