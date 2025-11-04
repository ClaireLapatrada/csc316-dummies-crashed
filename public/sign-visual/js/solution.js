export function createSolutionVisualization() {
    const container = document.getElementById('solutionVisualization');
    if (!container) return;

    container.innerHTML = '';

    const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background', 'rgba(30, 30, 50, 0.3)')
        .style('border-radius', '15px');

    const width = container.clientWidth;
    const height = container.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    const buildingColors = [
        '#f8f8f8', '#e8e8e8', '#f0f0f0', '#e0e0e0',
        '#f5f5f5', '#eeeeee', '#fafafa', '#e6e6e6'
    ];

    const windowColors = [
        '#6ec6f5', '#4fc3f7', '#29b6f6', '#03a9f4',
        '#4fc3f7', '#29b6f6', '#03a9f4', '#0288d1'
    ];

    const colors = {
        road: '#2f2f2f',
        roadStroke: '#555',
        roadMarkings: '#dcdcdc',
        buildingHighlight: '#ffffff'
    };

    const gridCols = 4; // 4 columns
    const gridRows = 2; // 2 rows
    const buildingWidth = 120;
    const buildingHeight = 150;
    const roadWidth = 50;
    const gap = 5;

    const totalWidth = (gridCols * buildingWidth) + ((gridCols - 1) * roadWidth) + (2 * gap * gridCols);
    const totalHeight = (gridRows * buildingHeight) + ((gridRows - 1) * roadWidth) + (2 * gap * gridRows);

    const startX = centerX - totalWidth / 2;
    const startY = centerY - totalHeight / 2;

    for (let row = 0; row <= gridRows; row++) {
        const y = startY + row * (buildingHeight + roadWidth + 2 * gap) - roadWidth/2;

        // Road base
        svg.append('rect')
            .attr('x', startX - 25)
            .attr('y', y)
            .attr('width', totalWidth + 50)
            .attr('height', roadWidth)
            .attr('rx', 12)
            .attr('fill', colors.road)
            .attr('stroke', colors.roadStroke)
            .attr('stroke-width', 2);

        svg.append('line')
            .attr('x1', startX - 5)
            .attr('x2', startX + totalWidth + 5)
            .attr('y1', y + roadWidth/2)
            .attr('y2', y + roadWidth/2)
            .attr('stroke', colors.roadMarkings)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '10,10')
            .attr('stroke-linecap', 'round');
    }

    for (let col = 0; col <= gridCols; col++) {
        const x = startX + col * (buildingWidth + roadWidth + 2 * gap) - roadWidth/2;

        svg.append('rect')
            .attr('x', x)
            .attr('y', startY - 25)
            .attr('width', roadWidth)
            .attr('height', totalHeight + 50)
            .attr('rx', 12)
            .attr('fill', colors.road)
            .attr('stroke', colors.roadStroke)
            .attr('stroke-width', 2);

        svg.append('line')
            .attr('x1', x + roadWidth/2)
            .attr('x2', x + roadWidth/2)
            .attr('y1', startY - 5)
            .attr('y2', startY + totalHeight + 5)
            .attr('stroke', colors.roadMarkings)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '10,10')
            .attr('stroke-linecap', 'round');
    }

    let buildingIndex = 0;
    const buildings = [];

    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const x = startX + roadWidth/2 + gap + col * (buildingWidth + roadWidth + 2 * gap);
            const y = startY + roadWidth/2 + gap + row * (buildingHeight + roadWidth + 2 * gap);

            buildings.push({
                x: x,
                y: y,
                row: row,
                col: col,
                baseColor: buildingColors[buildingIndex],
                windowColor: windowColors[buildingIndex],
                width: buildingWidth,
                height: buildingHeight
            });

            buildingIndex++;
        }
    }

    buildings.forEach((building, i) => {
        const buildingGroup = svg.append('g')
            .attr('class', 'building')
            .attr('transform', `translate(${building.x}, ${building.y})`);


        buildingGroup.append('rect')
            .attr('x', -5)
            .attr('y', -20)
            .attr('width', building.width + 10)
            .attr('height', 15)
            .attr('rx', 6)
            .attr('fill', '#999')
            .attr('stroke', '#555')
            .attr('stroke-width', 2);

        buildingGroup.append('rect')
            .attr('x', building.width/2 - 25)
            .attr('y', building.height - 50)
            .attr('width', 50)
            .attr('height', 50)
            .attr('fill', building.windowColor)
            .attr('stroke', '#444')
            .attr('stroke-width', 2);

        buildingGroup.append('rect')
            .attr('x', building.width/2 - 35)
            .attr('y', building.height - 60)
            .attr('width', 70)
            .attr('height', 10)
            .attr('rx', 4)
            .attr('fill', '#999')
            .attr('stroke', '#444')
            .attr('stroke-width', 2);

        const rows = 3, cols = 4;
        const winW = 20, winH = 25;
        const gapX = (building.width - (cols * winW)) / (cols + 1);
        const gapY = (building.height - 80 - (rows * winH)) / (rows + 1); // Leave space for door

        const startWinX = gapX;
        const startWinY = gapY;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                buildingGroup.append('rect')
                    .attr('x', startWinX + c * (winW + gapX))
                    .attr('y', startWinY + r * (winH + gapY))
                    .attr('width', winW)
                    .attr('height', winH)
                    .attr('fill', building.windowColor)
                    .attr('stroke', '#444')
                    .attr('stroke-width', 2);
            }
        }
    });
    console.log('Solution visualization created with 8 buildings');
}