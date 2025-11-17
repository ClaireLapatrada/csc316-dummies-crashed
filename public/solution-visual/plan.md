# Crash Visualization Improvements Plan

## Cleanup Section (Sark)

### 1. Fix Drop Shadows to Align with Figma (Sark) 
- **Files**: `root/css/style.css`, `root/js/timelineVis.js`
- **Tasks**:
  - Review Figma design specifications for drop shadow values
  - Update `#main-container` box-shadow (currently `0px 4px 1px 0px rgba(0,0,0,0.25)`)
  - Update `#options-panel` inset box-shadow (currently `0px 4px 1px 0px inset rgba(0,0,0,0.25)`)
  - Update timeline track drop-shadow in `timelineVis.js` line 47 (currently `drop-shadow(0px 4px 1px rgba(0,0,0,0.25))`)
  - Ensure all shadows match Figma specifications exactly

### 2. Round Corners of Triangle Selector (Sark) 
- **Files**: `root/js/timelineVis.js`
- **Tasks**:
  - Replace polygon handle (line 66-69) with a rounded shape
  - Use `path` element with rounded corners or apply `stroke-linejoin: round` and `stroke-linecap: round`
  - Alternatively, use a rounded rectangle or custom SVG path with rounded corners
  - Maintain current size and color (#ec6b68)

### 3. Add Scroll to Change Time
- **Files**: `root/js/main.js`, `root/css/style.css`
- **Tasks**:
  - Fix `setupScrollListener()` and `updateYearFromScroll()` functions (lines 98-132)
  - Remove `overflow: hidden` from body or implement scroll within a container
  - Map scroll position to year range correctly
  - Ensure scroll doesn't conflict with timeline drag interaction
  - Add option to enable/disable scroll-based time changing

### 4. Fix Circle Animation (Don't Go to Zero) (Sark) (fine for now)
- **Files**: `root/js/mapVis.js`
- **Tasks**:
  - Modify `updateVis()` method (lines 224-262)
  - Change exit transition: instead of animating to `r: 0`, animate to final position of new circle if it exists at same location
  - For enter transition: start from previous position if circle existed, not from `r: 0`
  - Use D3's key function more effectively to track circles by location
  - Smooth transitions between years without disappearing/reappearing

### 5. Check Map Sizing to Circle Position 
- **Files**: `root/js/mapVis.js`
- **Tasks**:
  - Verify coordinate scaling in `initVis()` (lines 72-79)
  - Check if circle positions (x, y) calculated in `wrangleData()` (lines 173-174) align correctly with map bounds
  - Ensure circles don't appear outside map boundaries
  - Test with edge cases (min/max latitude/longitude)
  - Adjust padding or bounds if circles are misaligned

### 6. Switch to Bootstrap and Add Title (Viktoriia)
- **Files**: `root/index.html`, `root/css/style.css`, `root/js/main.js`
- **Tasks**:
  - Refactor layout to use Bootstrap grid system and utility classes
  - Replace custom positioning (absolute positioning) with Bootstrap containers, rows, and columns
  - Use Bootstrap components where appropriate (buttons, cards, etc.)
  - Migrate custom CSS to Bootstrap utility classes where possible
  - Add page title/tile at the top of the visualization
  - Style title with Bootstrap typography classes
  - Ensure responsive design using Bootstrap breakpoints
  - Maintain current visual design while leveraging Bootstrap structure
  - Test layout across different screen sizes

## Additional Features Section

### 7. Filtering by Vehicle Type
- **Files**: `root/index.html`, `root/js/main.js`, `root/js/mapVis.js`, `root/css/style.css`
- **Tasks**:
  - Add vehicle type checkboxes to options panel in `index.html`
  - Extract unique vehicle types from dataset (check "Vehicle Type" column)
  - Add `activeVehicleFilters` property to `MapVis` class
  - Update `wrangleData()` to filter by vehicle type in addition to severity
  - Add `setVehicleFilters()` method to `MapVis`
  - Connect checkboxes in `main.js` similar to severity filters
  - Style vehicle type filters in CSS

### 8. Two Map Year Comparison
- **Files**: `root/index.html`, `root/js/main.js`, `root/js/mapVis.js`, `root/css/style.css`
- **Tasks**:
  - Add toggle/button in options panel to enable comparison mode
  - Modify `MapVis` to support dual-year display (split map or overlay)
  - Add `selectedYear2` property and comparison visualization
  - Update `wrangleData()` to handle two years simultaneously
  - Render two sets of circles with different opacity or side-by-side maps
  - Add year selector for second map
  - Style comparison mode UI

### 9. Location Distribution Graph in Options Panel (Viktoriia)
- **Files**: `root/index.html`, `root/js/main.js`, `root/css/style.css`
- **Tasks**:
  - Create new `LocationChart.js` class for neighborhood distribution
  - Add chart container div to options panel in `index.html`
  - Extract "Toronto Neighbourhood Name" from data
  - Count crashes per neighborhood for selected year
  - Create bar chart or pie chart showing distribution
  - Update chart when year or filters change
  - Style chart to fit in options panel (compact design)

### 10. Zoom and Pan on Map (Sark) Done
- **Files**: `root/js/mapVis.js`
- **Tasks**:
  - Implement D3 zoom behavior using `d3.zoom()`
  - Add zoom to `initVis()` method
  - Update scales dynamically on zoom/pan
  - Recalculate circle positions on zoom
  - Add zoom controls (buttons or mouse wheel)
  - Reset zoom button
  - Store zoom state and restore on year change if desired

### 11. City Labels on Map (Sark) Done
- **Files**: `root/js/mapVis.js`, `root/css/style.css`
- **Tasks**:
  - Define Toronto neighborhood/city center coordinates
  - Add text labels for major areas (Scarborough, North York, Etobicoke, Downtown, etc.)
  - Position labels using map coordinates
  - Style labels with appropriate font, size, and color
  - Ensure labels don't overlap with crash circles
  - Make labels responsive to zoom level (show/hide based on zoom)

### 12. Old-Fashioned Map Design Features (Sark)
- **Files**: `root/js/mapVis.js`, `root/css/style.css`
- **Tasks**:
  - Change map background to parchment/aged paper color/texture
  - Add compass rose in corner
  - Add decorative border around map
  - Use serif or vintage-style fonts for labels
  - Add subtle texture overlay or pattern
  - Style roads to look more hand-drawn (slightly irregular)
  - Add map title/legend styling
  - Consider sepia tone color scheme

### 13. Faster Loading by Removing Data
- **Files**: `root/js/main.js`
- **Tasks**:
  - Analyze data size and identify optimization opportunities
  - Option 1: Sample data (e.g., every Nth record)
  - Option 2: Filter out minimal severity crashes initially
  - Option 3: Load data in chunks by year
  - Option 4: Reduce GeoJSON detail (simplify road geometries)
  - Implement chosen strategy in `initMainPage()`
  - Add loading indicator
  - Measure and document performance improvement

### 14. Tooltip on Circles
- **Files**: `root/js/mapVis.js`, `root/css/style.css`
- **Tasks**:
  - Create tooltip div in HTML or dynamically in D3
  - Add mouseover event listeners to crash circles
  - Display tooltip with:
    - Number of crashes in cluster
    - Breakdown by severity type
    - Location coordinates or street names
    - Year information
  - Position tooltip near cursor or circle
  - Style tooltip with appropriate background, border, padding
  - Hide tooltip on mouseout

### 15. Commentary on Timeline for Toronto Changes
- **Files**: `root/js/timelineVis.js`, `root/index.html`, `root/css/style.css`
- **Tasks**:
  - Research significant Toronto events/changes by year
  - Create data structure mapping years to commentary
  - Add commentary display area near timeline
  - Show commentary for selected year
  - Style commentary text appropriately
  - Examples: new transit lines, major construction, policy changes affecting traffic
  - Update commentary when year changes via drag or scroll

### 16. Road Improvement Suggestions Based on Driver/Pedestrian Actions (Dz)
- **Files**: `root/js/mapVis.js`, `root/index.html`, `root/css/style.css`, `root/js/main.js`
- **Tasks**:
  - Analyze crash data for patterns in driver/pedestrian actions
  - Identify locations with high frequency of specific action types:
    - "Pedestrian Action" column (e.g., crossing at intersection, crossing mid-block)
    - "Apparent Driver Action" column (e.g., failed to yield, improper turn)
    - "Pedestrian Involved" and "Cyclist Involved" flags
  - Create algorithm to suggest improvements:
    - High pedestrian crashes → suggest crosswalks, pedestrian signals
    - High cyclist crashes → suggest bike lanes, cyclist infrastructure
    - High "failed to yield" → suggest better signage, traffic lights
    - High "improper turn" → suggest turn restrictions, better lane markings
  - Add toggle/button in options panel to show/hide improvement suggestions
  - Render improvement suggestion markers on map (different visual style from crash points)
    - Use distinct icons (e.g., crosswalk icon, sign icon, bike lane icon)
    - Different color scheme (e.g., blue or green) to distinguish from crash points
  - Cluster improvement suggestions by location
  - Add tooltip/info panel showing:
    - Suggested improvement type
    - Number of crashes that would benefit
    - Specific action patterns that led to suggestion
    - Priority level based on crash frequency/severity
  - Allow filtering by improvement type (crosswalks, signs, bike lanes, etc.)
  - Style improvement markers distinctly from crash circles
  - Update suggestions when year or filters change

### 17. Play Button to Run Through Timeline (Viktoriia)
- **Files**: `root/js/timelineVis.js`, `root/index.html`, `root/css/style.css`, `root/js/main.js`
- **Tasks**:
  - Add play button to timeline area (near timeline slider)
  - Create play button UI element with play and pause icons
  