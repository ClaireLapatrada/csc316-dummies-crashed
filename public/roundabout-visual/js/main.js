// --- 1. Run Data Load and Chart Rendering ---
loadData();


// --- 2. Helper Functions ---

/**
 * Classifies a 24-hour time number (e.g., 236) into a time band.
 */
function timeBandFromNUM(t){
  const n = +t; if (!Number.isFinite(n)) return undefined;
  const h = Math.floor(n/100) % 24;
  if (h < 6) return "Night";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

/**
 * Classifies an accident class string into a simple severity.
 */
function classifySeverity(acclass){
  const s = String(acclass || '').toLowerCase().replace(/\s+/g,' ').trim();
  if (s.includes('non-fatal')) return 'nonfatal';
  if (s.includes('fatal'))     return 'fatal';
  return 'nonfatal'; // Default to nonfatal
}

/**
 * Safe getter for accessing row properties with multiple possible column names.
 */
const get = (row, ...keys) => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return undefined;
};

/**
 * Safe checker for 'Yes' values across different formats.
 */
const yes = (row, ...keys) => {
  const v = String(get(row, ...keys) || '').toLowerCase();
  return v === 'yes' || v === 'y' || v === 'true' || v === '1';
};

/**
 * Parses a single row from the CSV.
 */
function parseRow(d){
  // dates/times
  const date = get(d, 'DATE', 'Date', 'Collision Date');
  const time = get(d, 'TIME', 'Time', 'Time of Collision');
  const pedInv = yes(d, 'PEDESTRIAN', 'Pedestrian Involved');
  const cycInv = yes(d, 'CYCLIST', 'Cyclist Involved');
  // involved age
  const invAgeRaw = get(d, 'INVAGE', 'Involved Age', 'AGE');
  const invAge = Number.parseInt(invAgeRaw, 10);

  return {
    accNum: +get(d, 'ACCNUM', 'Accident Number'),
    date,
    time,
    timeBand: timeBandFromNUM(get(d, 'TIME', 'Time')),
    accLoc: get(d, 'ACCLOC', 'Collision Location'),
    light: get(d, 'LIGHT', 'LIGHT_COND', 'Light', 'LIGHT '),
    visibility: get(d, 'VISIBILITY'),
    surface: get(d, 'RDSFCOND', 'Road Surface Condition'),
    severity: classifySeverity(get(d, 'ACCLASS', 'Accident Classification')),
    speeding: yes(d, 'SPEEDING', 'Speeding Related'),
    aggdistr: yes(d, 'AG_DRIV', 'Aggressive and Distracted Driving Related'),
    redlight: yes(d, 'REDLIGHT', 'Red Light Related'),
    alcohol: yes(d, 'ALCOHOL', 'Alcohol Related'),
    pedInv,
    cycInv,
    invAge: Number.isFinite(invAge) ? invAge : undefined
  };
}

/**
 * Calculates the proportion (0.0 to 1.0) of items in an array that pass a test.
 */
function prop(arr, fn){ 
  return d3.mean(arr, d => fn(d) ? 1 : 0) || 0; 
}

// --- 3. Main Data Loading and Chart Init Function ---

function loadData(){
  d3.csv('data/collisions.csv', parseRow).then(rows => {
    const data = rows.filter(r => r.accNum && r.date);

    // Basic cumulative slice: 2006–2023
    const parseMDY = d3.timeParse('%m/%d/%Y %I:%M:%S %p'); // Adjusted for full timestamp
    const within = d => {
      // Try parsing with the full timestamp format first
      let dt = parseMDY(d.date);
      if (!dt) {
          // Fallback for other potential date formats
          dt = new Date(d.date); 
      }
      const y = dt.getFullYear();
      return y >= 2006 && y <= 2023;
    };
    const rows206_23 = data.filter(within);

    // --- Series builders ---
    function buildFactorSeries(rows){
      const atIntersection = prop(rows, d => /intersection/i.test(d.accLoc || ''));
      const speeding = prop(rows, d => d.speeding);
      const aggdistr = prop(rows, d => d.aggdistr);
      const alcohol = prop(rows, d => d.alcohol);
      const night = prop(rows, d => String(d.light||'').toLowerCase().includes('dark'));
      const poorWeather = prop(rows, d => {
        const vis = String(d.visibility||'').toLowerCase();
        const surf = String(d.surface||'').toLowerCase();
        const badVis = vis && !/clear/.test(vis);
        const badSurf = /(wet|snow|slush|ice|loose|mud|sand|gravel)/.test(surf);
        return badVis || badSurf;
      });
      const pedInvolved = prop(rows, d => d.pedInv);
      const cycInvolved = prop(rows, d => d.cycInv);

      return [{
        name: 'All collisions (2006–2023) — Factors',
        color: '#d95f02',
        axes: [
          { axis: 'At Intersection', value: atIntersection },
          { axis: 'Speeding Related', value: speeding },
          { axis: 'Aggressive/Distracted', value: aggdistr },
          { axis: 'Alcohol Related', value: alcohol },
          { axis: 'Night-time', value: night },
          { axis: 'Poor Weather', value: poorWeather },
          { axis: 'Pedestrian Involved', value: pedInvolved },
          { axis: 'Cyclist Involved', value: cycInvolved }
        ]
      }];
    }

    function buildAgeSeries(rows){
      const buckets = [
        { label: 'Age 0–20',  test: a => a >= 0 && a < 20 },
        { label: 'Age 20–40', test: a => a >= 20 && a < 40 },
        { label: 'Age 40–60', test: a => a >= 40 && a < 60 },
        { label: 'Age 60–80', test: a => a >= 60 && a < 80 },
        { label: 'Age 80+',   test: a => a >= 80 }
      ];
      const axes = buckets.map(b => ({
        axis: b.label,
        value: prop(rows, r => Number.isFinite(r.invAge) && b.test(r.invAge))
      }));
      return [{ name: 'All collisions (2006–2023) — Ages', color: '#1b9e77', axes }];
    }

    const factorSeries = buildFactorSeries(rows206_23);
    const ageSeries = buildAgeSeries(rows206_23);

    // --- Mount chart ---
    // This assumes roundaboutChart.js defines a class 'RoundaboutChart'
    // It will be drawn in the <svg id="roundabout-chart"> element.
    const chart = new RoundaboutChart('#roundabout-chart', factorSeries, {
      levels: 5,           // This will create the 5 lanes
      roadWidth: 80,       // Example: width of the road area
      islandRadius: 70,    // Example: radius of the central island
      totalCollisions: rows206_23.length
    });

    // dataset toggle events
    const radios = document.querySelectorAll('input[name="dataset"]');
    radios.forEach(r => r.addEventListener('change', e => {
      if (e.target.value === 'ages') {
        chart.update(ageSeries, { totalCollisions: rows206_23.length });
      } else {
        chart.update(factorSeries, { totalCollisions: rows206_23.length });
      }
    }));
    
  }).catch(error => {
    console.error('Error loading or parsing data:', error);
    // Select the existing chart container to show the error
    d3.select('.chart-container').append('div')
      .style('color', 'red')
      .style('padding', '2rem')
      .style('text-align', 'center')
      .text('Error: Could not load data/collisions.csv. Please check the file path and format.');
  });
}