let barChart;
let yearScroll;
let playButton;
let globalData = [];

// Load data and initialize
d3.csv("/data/dataset.csv").then(function(data) {
    globalData = data;
    console.log("CSV data loaded:", globalData.length, "records");
    console.log("Sample record:", globalData[0]);
    console.log("Available columns:", Object.keys(globalData[0] || {}));

    // Initialize bar chart with data
    barChart = new ConditionBarChart("#barChartContainer", globalData);
    barChart.init();
    
    // Explicitly set data and year - ensure data is properly set
    console.log("Setting data on chart, length:", globalData.length);
    console.log("Global data type:", typeof globalData, "Is array:", Array.isArray(globalData));
    barChart.data = globalData; // Set directly
    barChart.setData(globalData); // Also use setData method
    console.log("Chart data after setting:", barChart.data ? barChart.data.length : 0);
    console.log("Chart data type:", typeof barChart.data, "Is array:", Array.isArray(barChart.data));
    if (barChart.data && barChart.data.length > 0) {
        console.log("First record:", barChart.data[0]);
    }
    barChart.setYear(2006);

    // Initialize year scroll
    yearScroll = new YearScroll("#yearScrollContainer", {
        startYear: 2006,
        endYear: 2023,
        onYearChange: (year) => {
            if (barChart) {
                barChart.setYear(year);
            }
        },
        width: 836
    });
    yearScroll.init();

    // Initialize play button
    playButton = new PlayButton("#playBtn", yearScroll);

    // Setup filters
    setupFilters(globalData, barChart);
}).catch(function(error) {
    console.error("Error loading data:", error);
    // Initialize with empty data if CSV fails
    barChart = new ConditionBarChart("#barChartContainer", []);
    barChart.init();
    
    yearScroll = new YearScroll("#yearScrollContainer", {
        startYear: 2006,
        endYear: 2023,
        onYearChange: (year) => {
            if (barChart) {
                barChart.setYear(year);
            }
        },
        width: window.innerWidth * 0.9
    });
    yearScroll.init();
    
    playButton = new PlayButton("#playBtn", yearScroll);
});

function setupFilters(data, chart) {
    // Get unique severity values
    const severitySet = new Set();
    data.forEach(d => {
        const acclass = d['Accident Classification'] || d['Accident classification'] || '';
        const s = String(acclass || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (s.includes('non-fatal') || s.includes('nonfatal')) {
            severitySet.add('Non-fatal');
        } else if (s.includes('fatal')) {
            severitySet.add('Fatal');
        } else {
            severitySet.add('Non-fatal');
        }
    });
    const severityOptions = Array.from(severitySet).sort();

    // Get unique district values
    const districtSet = new Set();
    const districtRawValues = new Set(); // For debugging
    
    // First, let's see all possible district-related fields
    if (data.length > 0) {
        const sampleKeys = Object.keys(data[0]);
        console.log("Sample record keys:", sampleKeys);
        const districtFields = sampleKeys.filter(k => 
            k.toLowerCase().includes('district') || 
            k.toLowerCase().includes('dstr') ||
            k === 'DISTRICT'
        );
        console.log("District-related fields:", districtFields);
        
        // Show sample district values from first 10 records
        console.log("Sample DISTRICT values from first 10 records:");
        data.slice(0, 10).forEach((d, i) => {
            const dist = d['DISTRICT'] || d['District Name'] || d['District'] || '';
            if (dist) console.log(`  Record ${i}: "${dist}"`);
        });
    }
    
    data.forEach(d => {
        // Try multiple possible field names for district
        let district = d['DISTRICT'] || 
                      d['District Name'] || 
                      d['District'] || 
                      d['District Name (from Geo)'] ||
                      d['DISTRICT_NAME'] ||
                      d['District_Name'] ||
                      '';
        
        if (district && district.trim() !== '') {
            // Store raw value for debugging
            districtRawValues.add(district);
            
            // Clean up district name - remove extra whitespace
            district = district.trim();
            // Normalize district names to standard format
            const districtLower = district.toLowerCase();
            
            // Map all known variations - check for Toronto/Downtown Toronto first
            if (districtLower === 'toronto' || 
                (districtLower.includes('toronto') && 
                 !districtLower.includes('east') && 
                 !districtLower.includes('north') && 
                 !districtLower.includes('york') &&
                 !districtLower.includes('etobicoke') &&
                 !districtLower.includes('scarborough'))) {
                district = 'Toronto';
            } else if (districtLower.includes('north york')) {
                district = 'North York';
            } else if (districtLower.includes('etobicoke')) {
                district = 'Etobicoke';
            } else if (districtLower.includes('scarborough')) {
                district = 'Scarborough';
            } else if (districtLower.includes('east york')) {
                district = 'East York';
            } else if (districtLower.includes('york') && 
                      !districtLower.includes('north') && 
                      !districtLower.includes('east')) {
                district = 'York';
            }
            // Keep original if it doesn't match known patterns
            districtSet.add(district);
        }
    });
    
    console.log("Raw district values found (all unique):", Array.from(districtRawValues).sort());
    const districtOptions = Array.from(districtSet).sort();
    console.log("Normalized district options found:", districtOptions);
    
    // If Toronto is not in the list, check if we need to add it manually or if it's named differently
    if (!districtOptions.includes('Toronto')) {
        console.warn("Toronto not found in districts!");
        console.warn("Raw district values:", Array.from(districtRawValues).sort());
        // Check if any raw value might be Toronto
        const possibleToronto = Array.from(districtRawValues).filter(v => 
            v.toLowerCase().includes('toronto') && 
            !v.toLowerCase().includes('north') && 
            !v.toLowerCase().includes('east')
        );
        if (possibleToronto.length > 0) {
            console.warn("Possible Toronto values found:", possibleToronto);
        }
    }

    // Setup severity filter
    setupFilter('severity', severityOptions, chart);

    // Setup district filter
    setupFilter('district', districtOptions, chart);
    
    // Setup condition type selector
    setupConditionTypeFilter(chart);
}

function setupFilter(filterType, options, chart) {
    // Create filter data with "All" option
    const filterData = [{value: 'all', label: 'All', checked: true}];
    options.forEach(opt => {
        filterData.push({value: opt, label: opt, checked: false});
    });

    // Select container
    const container = d3.select(`#${filterType}-checkboxes`);
    if (container.empty()) return;

    // Bind data and create checkboxes
    const items = container.selectAll(".filter-checkbox-item")
        .data(filterData);

    // Enter: create new items
    const itemsEnter = items.enter()
        .append("div")
        .attr("class", "filter-checkbox-item");

    itemsEnter.append("input")
        .attr("type", "checkbox")
        .attr("id", d => `${filterType}-${d.value === 'all' ? 'all' : d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
        .attr("value", d => d.value)
        .property("checked", d => d.checked);

    itemsEnter.append("label")
        .attr("for", d => `${filterType}-${d.value === 'all' ? 'all' : d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
        .text(d => d.label);

    // Merge and update
    const itemsMerged = itemsEnter.merge(items);
    itemsMerged.select("input")
        .property("checked", d => d.checked);

    // Add click handlers
    container.selectAll("input").on("change", function(event) {
        const clicked = this;
        const allCheckbox = container.select(`#${filterType}-all`).node();
        const checkboxes = container.selectAll("input").nodes();

        if (clicked.id === `${filterType}-all`) {
            // If "All" is checked, uncheck all others
            if (clicked.checked) {
                checkboxes.forEach(cb => {
                    if (cb !== clicked) cb.checked = false;
                });
                chart.setFilter(filterType, 'all');
            }
        } else {
            // If any other checkbox is checked, uncheck "All"
            if (clicked.checked) {
                allCheckbox.checked = false;
            }

            // Get selected values
            const selected = checkboxes
                .filter(cb => cb.checked && cb.id !== `${filterType}-all`)
                .map(cb => cb.value);

            // If nothing selected, select "All"
            if (selected.length === 0) {
                allCheckbox.checked = true;
                chart.setFilter(filterType, 'all');
            } else {
                chart.setFilter(filterType, selected);
            }
        }
    });

    // Setup button toggle
    d3.select(`#${filterType}-filter-btn`).on("click", function(event) {
        event.stopPropagation();
        const group = d3.select(this.parentNode);
        group.classed("active", !group.classed("active"));
    });

    // Close dropdown when clicking outside
    d3.select("body").on("click", function(event) {
        if (!event.target.closest(`#${filterType}-filter-btn`) && 
            !event.target.closest(`#${filterType}-checkboxes`)) {
            d3.select(`#${filterType}-filter-btn`).node().parentNode.classList.remove("active");
        }
    });
}

function setupConditionTypeFilter(chart) {
    const conditionTypes = [
        { value: 'LIGHT', label: 'Light' },
        { value: 'VISIBILITY', label: 'Visibility' },
        { value: 'Road Surface Condition', label: 'Road Surface Condition' }
    ];
    
    // Create filter data
    const filterData = conditionTypes.map(type => ({
        value: type.value,
        label: type.label,
        checked: type.value === 'LIGHT' // Default to LIGHT
    }));

    // Select container
    const container = d3.select(`#condition-type-checkboxes`);
    if (container.empty()) return;

    // Bind data and create checkboxes (radio button style - only one selected)
    const items = container.selectAll(".filter-checkbox-item")
        .data(filterData);

    // Enter: create new items
    const itemsEnter = items.enter()
        .append("div")
        .attr("class", "filter-checkbox-item");

    itemsEnter.append("input")
        .attr("type", "radio")
        .attr("name", "condition-type")
        .attr("id", d => `condition-type-${d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
        .attr("value", d => d.value)
        .property("checked", d => d.checked);

    itemsEnter.append("label")
        .attr("for", d => `condition-type-${d.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`)
        .text(d => d.label);

    // Merge and update
    const itemsMerged = itemsEnter.merge(items);
    itemsMerged.select("input")
        .property("checked", d => d.checked);

    // Add change handlers
    container.selectAll("input").on("change", function(event) {
        const selected = this.value;
        console.log("Condition type changed to:", selected);
        chart.setFilter('conditionType', selected);
    });

    // Setup button toggle
    d3.select(`#condition-type-filter-btn`).on("click", function(event) {
        event.stopPropagation();
        const group = d3.select(this.parentNode);
        group.classed("active", !group.classed("active"));
    });

    // Close dropdown when clicking outside
    d3.select("body").on("click", function(event) {
        if (!event.target.closest(`#condition-type-filter-btn`) && 
            !event.target.closest(`#condition-type-checkboxes`)) {
            d3.select(`#condition-type-filter-btn`).node().parentNode.classList.remove("active");
        }
    });
}

