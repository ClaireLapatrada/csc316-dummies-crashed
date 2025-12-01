# 🚗 Dummies Crashed

## 📊 Project Overview
**Dummies Crashed** is a data-driven analysis of fatal traffic collisions in Toronto.  
Our goal is to identify key factors behind these crashes and provide actionable insights to help the city reduce future incidents—such as prioritizing road construction, fixing potholes, or installing speeding cameras.  
We will also create data visualizations to promote safe driving habits.

---

## 🎯 What We're Handing In

This project is a comprehensive interactive data visualization website that presents traffic collision data for Toronto through multiple visualizations. The project consists of:

### Custom Code (Our Implementation)
- **Main Navigation System** (`js/scrollNavigation.js`) - Custom scroll-based page navigation with dot indicators
- **All Visualization Components** - Custom D3.js implementations for:
  - Time's Effect on Accidents for Pedestrian (`public/vehicle-visual/`)
  - Fatal Collisions Ranked By Involvement (`public/sign-visual/`)
  - Cumulative Pedestrian Collisions by Action (`public/ped-visual/`)
  - Toronto Collisions Map (`public/solution-visual/`)
  - Improvements Visualization (`public/improvements-visual/`)
  - Roundabout Visualization (`public/roundabout-visual/`)
- **Timeline/Year Scroll Component** (`public/shared/js/yearScroll.js`) - Custom interactive timeline slider
- **Play Button Component** (`public/shared/js/playButton.js`) - Custom auto-play functionality for timeline
- **All CSS Styling** - Custom stylesheets for layout, animations, and responsive design
- **Data Processing Logic** - Custom JavaScript for filtering, aggregating, and processing collision data
- **HTML Structure** - All page layouts and content structure

### Third-Party Libraries and Resources

#### JavaScript Libraries (CDN)
- **D3.js v7** (`https://d3js.org/d3.v7.min.js`) - Used for data visualization and DOM manipulation
- **Bootstrap 5.3.3** (`https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/`) - Used for grid system and some UI components

#### CSS Frameworks
- **Bootstrap 5.3.3 CSS** - Grid system and utility classes
- **Font Awesome 6.4.0** (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`) - Icons

#### Fonts (Google Fonts)
- **Overpass** - Primary font family for all text
- **Inter** - Secondary font (used in some sections)
- **Roboto** - Legacy font (minimal usage)

#### Data Sources
- **Toronto Police Service Public Safety Data Portal** - Killed and Seriously Injured (KSI) Collisions Dataset
- **City of Toronto Open Data** - Geographic and road infrastructure data

---

## 🌐 Project URLs

### Live Website
**URL:** (https://clairelapatrada.github.io/csc316-dummies-crashed/)

### Screencast Videos
**Main Demo Video:** [Add link to your main screencast video here]

**Additional Videos (if any):** [Add links to any supplementary videos]

---

## 🎨 Non-Obvious Features

### 1. **Scroll-Based Navigation System**
- The main page uses a custom scroll navigation system that snaps to full-page sections
- Scroll events are intercepted and converted to page transitions
- Works with mouse wheel, keyboard arrows, and touch gestures
- Includes smooth animations between pages

### 2. **Dot Navigation Indicator**
- Right-side navigation dots show current page position
- Dots are clickable for direct navigation
- Active dot scales up progressively based on page index
- Navigation state is maintained during scroll

### 3. **Interactive Timeline Component**
- Custom-built timeline slider appears in multiple visualizations
- Features a draggable pedestrian icon to select years
- Includes play/pause button for automatic year progression
- Year labels update dynamically as you scrub through the timeline
- Consistent styling across all visualizations

### 4. **Multi-Select Filter System**
- Checkbox-based filters allow multiple selections simultaneously
- Filters update visualizations in real-time
- Available filters include:
  - Severity (Fatal, Major, Minor, Minimal)
  - District
  - Time Period (Morning, Afternoon, Evening, Night)
  - Pedestrian/Driver Actions
  - Age Groups

### 5. **Hover Interactions**
- **Time Period Panels**: Info icons show detailed statistics on hover
- **Data Points (Dots)**: Individual collision points enlarge and show tooltips with collision details
- **Magnet Effect**: Nearby dots scale up when hovering over a data point for better visibility
- **Tooltips**: Dynamic tooltips appear with contextual information

### 6. **Iframe-Based Visualization Architecture**
- Each visualization is loaded in an iframe for isolation
- Prevents CSS/JavaScript conflicts between pages
- Allows independent scrolling within visualizations
- Main navigation handles iframe scroll boundaries intelligently

### 7. **Animation and Transitions**
- Smooth page transitions with fade-in effects
- Staggered animations for text elements
- Scale animations for interactive elements
- Loading states for data fetching

---

## 📂 Project Structure

```
csc316-dummies-crashed/
├── index.html                 # Main entry point with navigation
├── js/                        # Main application JavaScript
│   ├── scrollNavigation.js   # Custom scroll navigation system
│   ├── main.js               # Main application logic
│   └── ...
├── css/                       # Global stylesheets
│   └── style.css             # Main stylesheet
├── data/                      # Data files
│   ├── dataset.csv           # Main collision dataset
│   └── ...
├── public/                    # Visualization pages
│   ├── vehicle-visual/       # Time's Effect visualization
│   ├── sign-visual/          # Fatal Collisions Ranking
│   ├── ped-visual/           # Pedestrian Actions visualization
│   ├── solution-visual/      # Toronto Collisions Map
│   ├── improvements-visual/  # Road Improvements visualization
│   ├── roundabout-visual/    # Roundabout visualization
│   └── shared/               # Shared components
│       └── js/
│           ├── yearScroll.js # Timeline component
│           └── playButton.js # Play button component
└── README.md                  # This file
```

---

## 👥 Team Members
| Name | Role | Email |
|------|------|-------|
| **Janna** | Project Manager | janna.lim@mail.utoronto.ca |
| **Claire** | UI/UX Design, Front-End Development | claire.jaroonjetjumnong@mail.utoronto.ca |
| **Dechen** | UI/UX Design | de.zangmo@mail.utoronto.ca |
| **Viktoriia** | TBD | viktoriia.dyrda@mail.utoronto.ca |
| **Mitchell** | Data Engineer | mitchell.whitten@mail.utoronto.ca |
| **Sark** | UI/UX Design, Idea Generator | sark.asadourian@mail.utoronto.ca |

---

## 📂 Data Sources
We use publicly available traffic collision datasets from the [Toronto Police Service Public Safety Data Portal](https://data.torontopolice.on.ca/), primarily:
- **Killed and Seriously Injured (KSI) Collisions Dataset** – includes geographical information, road conditions, crash time/date, and demographic details.
- Other supporting datasets as needed.

---

## 🤝 Team Agreement

### Communication
- **Channels:** Discord & Instagram  
- **Response Time:** Within 24 hours (preferably 4 hours during business hours, 9am–5pm EST).  
- **Urgent Matters:** Use `@channel` mentions.  
- **Meetings:** Thursdays at **2:15pm EST** at **Gerstein Library**.  
  - Each member gives a 2-minute status update.  
  - Meeting notes stored in a shared Google Doc.  
  - Attendance is mandatory (notify team lead 24 hrs in advance if absent).  

---

## 💻 Code Guidelines
- Follow the **Google JavaScript/HTML/CSS Style Guide**.  
- **Branch naming convention:** `[name]/[feature]`  
  - Example: `janna/home-page`
- Add **inline comments** for complex code.  
- Functions >20 lines must have **detailed docstrings**.  
- Comment any **workarounds or technical debt**.

---

## 🔀 Version Control Workflow

### Main Rules
- `main` branch is **protected** – no direct commits.
- Each member merges **their own feature branch** after review.
- Always create new branches from the **latest main**.

### Creating a Branch
```bash
# Ensure you're on main and up to date
git checkout main
git pull

# Create a new branch
git checkout -b name/feature
```

### Making Changes

Make your edits on your branch.

Pull updates to stay in sync:

```bash
git pull
```

Resolve any merge conflicts if needed.

Stage, commit, and push:

```bash
git add .
git commit -m "Describe your change"
git push origin name/feature
```

### Creating a Pull Request

1. Go to GitHub and click **Compare & pull request**.
2. Add two reviewers under the **Reviewers** tab.
3. Notify the team in Discord after opening the pull request.

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for development)

### Running Locally
1. Clone the repository
2. Start a local web server (e.g., `python -m http.server 8000` or `npx serve`)
3. Open `http://localhost:8000` in your browser

### Note
Some features require a web server due to CORS restrictions when loading data files.

---

## 📝 License
[Add your license information here if applicable]

---

## 🙏 Acknowledgments
- Toronto Police Service for providing open data
- D3.js community for excellent documentation
- All team members for their contributions
