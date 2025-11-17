// Year Question Page Logic
// Analyzes dataset and displays warning signs ordered by accident count

let yearAccidentData = {}; // Cache for year -> {pedestrian, cyclist, car} counts

/**
 * Analyze dataset to count accidents by type for each year
 */
function analyzeYearAccidents(data) {
    const yearData = {};
    
    data.forEach(row => {
        const year = parseInt(row.Year) || parseInt(row['Year of collision']) || 2006;
        if (year < 2006 || year > 2023) return;
        
        if (!yearData[year]) {
            yearData[year] = {
                pedestrian: 0,
                cyclist: 0,
                car: 0
            };
        }
        
        // Count unique accidents (by Accident Number) for each type
        const accidentNum = row['Accident Number'];
        const isPedestrian = row['Pedestrian Involved'] === 'Yes';
        const isCyclist = row['Cyclist Involved'] === 'Yes';
        const isCar = row['Automobile Involved'] === 'Yes';
        
        // Use a set to track unique accidents per year
        if (!yearData[year].accidents) {
            yearData[year].accidents = {
                pedestrian: new Set(),
                cyclist: new Set(),
                car: new Set()
            };
        }
        
        if (isPedestrian) {
            yearData[year].accidents.pedestrian.add(accidentNum);
        }
        if (isCyclist) {
            yearData[year].accidents.cyclist.add(accidentNum);
        }
        if (isCar) {
            yearData[year].accidents.car.add(accidentNum);
        }
    });
    
    // Convert sets to counts
    Object.keys(yearData).forEach(year => {
        yearData[year].pedestrian = yearData[year].accidents.pedestrian.size;
        yearData[year].cyclist = yearData[year].accidents.cyclist.size;
        yearData[year].car = yearData[year].accidents.car.size;
        delete yearData[year].accidents;
    });
    
    yearAccidentData = yearData;
    return yearData;
}

/**
 * Get ordered types for a given year (most to least)
 */
function getOrderedTypes(year) {
    const data = yearAccidentData[year] || { pedestrian: 0, cyclist: 0, car: 0 };
    
    const types = [
        { type: 'pedestrian', count: data.pedestrian },
        { type: 'cyclist', count: data.cyclist },
        { type: 'car', count: data.car }
    ];
    
    // Sort by count (descending)
    types.sort((a, b) => b.count - a.count);
    
    console.log(`Year ${year} accident counts:`, data);
    console.log(`Ordered types:`, types.map(t => `${t.type}: ${t.count}`).join(', '));
    
    return types;
}

/**
 * Update warning signs display based on current year
 */
function updateWarningSignsOrder(year) {
    const warningSignsContainer = document.querySelector('.warning-signs');
    if (!warningSignsContainer) {
        console.warn('Warning signs container not found');
        return;
    }
    
    const orderedTypes = getOrderedTypes(year);
    console.log(`Year ${year} ordered types:`, orderedTypes);
    
    const signs = warningSignsContainer.querySelectorAll('.warning-sign');
    if (signs.length === 0) {
        console.warn('No warning signs found');
        return;
    }
    
    // Create a map of type to element
    const signMap = {};
    signs.forEach(sign => {
        const type = sign.getAttribute('data-type');
        signMap[type] = sign;
    });
    
    // Reorder and resize signs based on count
    orderedTypes.forEach((item, index) => {
        const sign = signMap[item.type];
        if (!sign) {
            console.warn(`Sign not found for type: ${item.type}`);
            return;
        }
        
        // Calculate size based on position (first = largest, last = smallest)
        // Scale from 1.0 (largest) to 0.7 (smallest) - less dramatic difference
        const scale = 1.0 - (index * 0.15);
        const zIndex = 10 - index; // Front to back
        
        // Calculate rotation based on position - more dramatic perspective
        const rotation = (index - 1) * 20;
        
        // Apply transform with scale
        sign.style.transform = `perspective(500px) rotateY(${rotation}deg) scale(${scale})`;
        sign.style.zIndex = zIndex;
        sign.style.order = index;
        sign.style.transition = 'all 0.5s ease';
        
        // Update image size - use explicit width/height for better control
        const img = sign.querySelector('.warning-icon');
        if (img) {
            // Base size of 300px (much larger), scaled by position
            const baseSize = 300;
            const imgSize = baseSize * scale;
            img.style.width = `${imgSize}px`;
            img.style.height = `${imgSize}px`;
            img.style.objectFit = 'contain';
            img.style.display = 'block';
            console.log(`Setting ${item.type} size to ${imgSize}px (scale: ${scale})`);
        } else {
            console.warn(`Image not found for ${item.type}`);
        }
    });
    
    // Reorder DOM elements
    orderedTypes.forEach(item => {
        const sign = signMap[item.type];
        if (sign) {
            warningSignsContainer.appendChild(sign);
        }
    });
}

/**
 * Initialize scrollable year container in the side sign
 */
function initYearScrollContainer() {
    const sideSignContainer = document.querySelector('.side-sign-container.year-scroll-sign');
    if (!sideSignContainer) return;
    
    let isScrolling = false;
    let scrollTimeout = null;
    let snapTimeout = null;
    
    // Handle scroll events - allow vertical scrolling within sign, prevent page navigation
    sideSignContainer.addEventListener('wheel', function(e) {
        // Allow vertical scrolling within the sign
        e.stopPropagation(); // Prevent page scroll
        
        isScrolling = true;
        clearTimeout(scrollTimeout);
        clearTimeout(snapTimeout);
        
        // Update year while scrolling
        scrollTimeout = setTimeout(() => {
            updateYearFromScrollPosition(sideSignContainer);
        }, 50);
        
        // Snap to nearest year when scrolling stops
        snapTimeout = setTimeout(() => {
            isScrolling = false;
            snapToNearestYear(sideSignContainer);
        }, 150);
    }, { passive: true });
    
    // Handle scroll event to update year and snap
    sideSignContainer.addEventListener('scroll', function(e) {
        e.stopPropagation();
        
        // Move sign image and text together with scroll
        const scrollContent = sideSignContainer.querySelector('.side-sign-scroll-content');
        const signImage = sideSignContainer.querySelector('.side-sign-image');
        const yearText = document.getElementById('yearSignDisplay');
        
        if (scrollContent && signImage) {
            // Calculate scroll progress (0 to 1)
            const maxScroll = scrollContent.scrollHeight - sideSignContainer.clientHeight;
            const scrollProgress = maxScroll > 0 ? sideSignContainer.scrollTop / maxScroll : 0;
            
            // Move sign image proportionally with scroll
            // The sign moves from top to bottom as you scroll
            const signHeight = signImage.offsetHeight || 300;
            const containerHeight = sideSignContainer.clientHeight;
            const maxMove = containerHeight - signHeight;
            const signOffset = scrollProgress * maxMove;
            
            signImage.style.transform = `translateY(${signOffset}px)`;
            
            // Also move the year text with the sign
            if (yearText) {
                yearText.style.transform = `translate(-50%, calc(-50% + ${signOffset}px))`;
            }
        }
        
        // Update active year in real-time as user scrolls
        updateActiveYearFromScroll(sideSignContainer);
        
        if (!isScrolling) {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                updateYearFromScrollPosition(sideSignContainer);
                snapToNearestYear(sideSignContainer);
            }, 100);
        }
    }, { passive: true });
    
    // Handle touch events for mobile
    let touchStartY = 0;
    sideSignContainer.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    sideSignContainer.addEventListener('touchend', function(e) {
        setTimeout(() => {
            snapToNearestYear(sideSignContainer);
        }, 100);
    }, { passive: true });
    
    // Highlight current year
    updateYearHighlight(2023);
}

/**
 * Snap to the nearest year item
 */
function snapToNearestYear(container) {
    const yearItems = container.querySelectorAll('.side-sign-year-item');
    if (yearItems.length === 0) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + (containerRect.height / 2);
    
    let closestItem = null;
    let closestDistance = Infinity;
    
    yearItems.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.top + (itemRect.height / 2);
        const distance = Math.abs(itemCenter - containerCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });
    
    if (closestItem) {
        const scrollContent = container.querySelector('.side-sign-scroll-content');
        if (scrollContent) {
            const itemOffsetTop = closestItem.offsetTop;
            const containerHeight = container.clientHeight;
            const itemHeight = closestItem.offsetHeight;
            
            // Center the closest item
            const targetScroll = itemOffsetTop - (containerHeight / 2) + (itemHeight / 2);
            container.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
            });
            
            // Update year after snapping
            setTimeout(() => {
                const newYear = parseInt(closestItem.getAttribute('data-year'));
                const currentYear = parseInt(document.getElementById('yearSignDisplay').textContent) || 2023;
                
                if (newYear !== currentYear) {
                    updateYearAndSigns(newYear);
                }
            }, 300);
        }
    }
}

/**
 * Update year based on scroll position within the sign
 */
function updateYearFromScrollPosition(container) {
    const yearItems = container.querySelectorAll('.side-sign-year-item');
    if (yearItems.length === 0) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + (containerRect.height / 2);
    
    // Find which year item is closest to center
    let closestItem = null;
    let closestDistance = Infinity;
    
    yearItems.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.top + (itemRect.height / 2);
        const distance = Math.abs(itemCenter - containerCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });
    
    if (closestItem) {
        const newYear = parseInt(closestItem.getAttribute('data-year'));
        const currentYear = parseInt(document.getElementById('yearSignDisplay').textContent) || 2023;
        
        if (newYear !== currentYear) {
            updateYearAndSigns(newYear);
        }
    }
}

/**
 * Update year display and warning signs
 * @param {number} year - The year to display
 * @param {boolean} updateAppState - Whether to update App state (default: true)
 */
function updateYearAndSigns(year, updateAppState = true) {
    const yearDisplay = document.getElementById('yearSignDisplay');
    
    // Simply update the year text without animation
    if (yearDisplay) {
        yearDisplay.textContent = year;
    }
    
    // Update global current year directly without triggering callback
    if (updateAppState && window.App) {
        // Directly set the internal variable to avoid circular calls
        if (window.App._setCurrentYearInternal) {
            window.App._setCurrentYearInternal(year);
        }
    }
    
    updateWarningSignsOrder(year);
    updateYearHighlight(year);
}

/**
 * Highlight the current year in scroll container and scroll to it
 */
function updateYearHighlight(year) {
    const container = document.querySelector('.side-sign-container.year-scroll-sign');
    const items = document.querySelectorAll('.side-sign-year-item');
    let activeItem = null;
    
    items.forEach(item => {
        if (parseInt(item.getAttribute('data-year')) === year) {
            item.classList.add('active');
            activeItem = item;
        } else {
            item.classList.remove('active');
        }
    });
    
    // Scroll active year into view (center it)
    if (activeItem && container) {
        const scrollContent = container.querySelector('.side-sign-scroll-content');
        if (scrollContent) {
            const itemOffsetTop = activeItem.offsetTop;
            const containerHeight = container.clientHeight;
            const itemHeight = activeItem.offsetHeight;
            
            // Center the active item in the container
            const targetScroll = itemOffsetTop - (containerHeight / 2) + (itemHeight / 2);
            container.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
            });
        }
    }
    
    // Also update active state based on scroll position
    updateActiveYearFromScroll(container);
}

/**
 * Update which year is active based on scroll position (like timer selector)
 */
function updateActiveYearFromScroll(container) {
    if (!container) return;
    
    const yearItems = container.querySelectorAll('.side-sign-year-item');
    if (yearItems.length === 0) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + (containerRect.height / 2);
    
    let closestItem = null;
    let closestDistance = Infinity;
    
    yearItems.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.top + (itemRect.height / 2);
        const distance = Math.abs(itemCenter - containerCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });
    
    // Update active states
    yearItems.forEach(item => {
        if (item === closestItem) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Initialize when data is available
function initializeYearQuestion() {
    if (window.App && typeof window.App.getGlobalData === 'function') {
        const data = window.App.getGlobalData();
        if (data && data.length > 0) {
            analyzeYearAccidents(data);
            if (!document.querySelector('.side-sign-container.year-scroll-sign')?.hasAttribute('data-initialized')) {
                initYearScrollContainer();
                const sideSign = document.querySelector('.side-sign-container.year-scroll-sign');
                if (sideSign) {
                    sideSign.setAttribute('data-initialized', 'true');
                }
            }
            const currentYear = window.App.getCurrentYear ? window.App.getCurrentYear() : 2023;
            updateYearAndSigns(currentYear);
            return true;
        }
    }
    return false;
}

// Try to initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for data to be loaded
    if (initializeYearQuestion()) {
        return;
    }
    
    // Retry after a delay
    let retries = 0;
    const maxRetries = 10;
    const checkInterval = setInterval(() => {
        if (initializeYearQuestion() || retries >= maxRetries) {
            clearInterval(checkInterval);
        }
        retries++;
    }, 300);
});

// Export functions for use in scrollNavigation
window.YearQuestion = {
    analyzeYearAccidents,
    updateWarningSignsOrder,
    updateYearAndSigns,
    getOrderedTypes,
    initializeYearQuestion,
    initYearScrollContainer
};

