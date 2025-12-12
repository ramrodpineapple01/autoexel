/**
 * Lot Map management JavaScript
 */

let mapCanvas, mapCtx;
let mapImage = null;
let mapScale = 1;
let mapOffsetX = 0;
let mapOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let editorMode = false;
let currentPolygon = null;
let lotRegions = [];
let selectedRegion = null;
let imageLoaded = false;

// Initialize map
async function loadLotMap() {
    const canvas = document.getElementById('lot-map-canvas');
    if (!canvas) return;

    mapCanvas = canvas;
    mapCtx = canvas.getContext('2d');

    // Load background image
    mapImage = new Image();
    mapImage.onload = function() {
        imageLoaded = true;
        resizeCanvas();
        drawMap();
    };
    mapImage.src = '/static/img/lot_map_bg.jpg';

    // Load lot regions
    await loadLotRegions();

    // Set up event listeners
    setupMapListeners();
}

// Resize canvas
function resizeCanvas() {
    if (!mapImage || !mapCanvas) return;

    const container = mapCanvas.parentElement;
    const maxWidth = container.clientWidth - 40;
    const maxHeight = window.innerHeight - 300;

    const imageAspect = mapImage.width / mapImage.height;
    const containerAspect = maxWidth / maxHeight;

    let canvasWidth, canvasHeight;

    if (imageAspect > containerAspect) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / imageAspect;
    } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * imageAspect;
    }

    mapCanvas.width = canvasWidth;
    mapCanvas.height = canvasHeight;
    mapScale = canvasWidth / mapImage.width;
}

// Draw map
function drawMap() {
    if (!mapCtx || !mapImage || !imageLoaded) return;

    // Clear canvas
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Draw background image
    mapCtx.drawImage(mapImage, 0, 0, mapCanvas.width, mapCanvas.height);

    // Draw lot regions
    lotRegions.forEach(region => {
        drawRegion(region);
    });

    // Draw current polygon being drawn
    if (currentPolygon && currentPolygon.length > 0) {
        drawPolygon(currentPolygon);
    }
}

// Draw a region
function drawRegion(region) {
    if (!region.Coordinates || region.Coordinates.length === 0) return;

    const coords = region.Coordinates;
    const isSelected = selectedRegion && selectedRegion.Lot_Number === region.Lot_Number;

    // Draw polygon
    mapCtx.beginPath();
    mapCtx.moveTo(coords[0].x * mapScale, coords[0].y * mapScale);
    for (let i = 1; i < coords.length; i++) {
        mapCtx.lineTo(coords[i].x * mapScale, coords[i].y * mapScale);
    }
    mapCtx.closePath();

    // Fill
    mapCtx.fillStyle = isSelected ? 'rgba(45, 80, 22, 0.3)' : 'rgba(107, 158, 62, 0.2)';
    mapCtx.fill();

    // Stroke
    mapCtx.strokeStyle = isSelected ? '#2d5016' : '#6b9e3e';
    mapCtx.lineWidth = isSelected ? 3 : 2;
    mapCtx.stroke();

    // Draw lot number and owner name
    if (region.Label_X !== undefined && region.Label_Y !== undefined) {
        const labelX = region.Label_X * mapScale;
        const labelY = region.Label_Y * mapScale;

        // Background for text
        const text = region.Lot_Number + (region.Owner_Name ? `\n${region.Owner_Name}` : '');
        mapCtx.font = 'bold 12px Arial';
        const metrics = mapCtx.measureText(text.split('\n')[0]);
        const textWidth = metrics.width;
        const textHeight = 30;

        mapCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        mapCtx.fillRect(labelX - 5, labelY - textHeight + 5, textWidth + 10, textHeight);

        // Text
        mapCtx.fillStyle = '#2d5016';
        mapCtx.textAlign = 'left';
        mapCtx.textBaseline = 'top';
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
            mapCtx.fillText(line, labelX, labelY - textHeight + 5 + (idx * 15));
        });
    }
}

// Draw polygon
function drawPolygon(points) {
    if (points.length < 2) return;

    mapCtx.beginPath();
    mapCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        mapCtx.lineTo(points[i].x, points[i].y);
    }
    mapCtx.strokeStyle = '#2d5016';
    mapCtx.lineWidth = 2;
    mapCtx.stroke();

    // Draw points
    points.forEach(point => {
        mapCtx.beginPath();
        mapCtx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        mapCtx.fillStyle = '#2d5016';
        mapCtx.fill();
    });
}

// Setup event listeners
function setupMapListeners() {
    if (!mapCanvas) return;

    // Mouse events
    mapCanvas.addEventListener('mousedown', handleMouseDown);
    mapCanvas.addEventListener('mousemove', handleMouseMove);
    mapCanvas.addEventListener('mouseup', handleMouseUp);
    mapCanvas.addEventListener('click', handleClick);
    mapCanvas.addEventListener('dblclick', handleDoubleClick);

    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    const toggleModeBtn = document.getElementById('toggle-map-mode-btn');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            mapScale *= 1.2;
            drawMap();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            mapScale *= 0.8;
            drawMap();
        });
    }

    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            mapScale = mapCanvas.width / mapImage.width;
            mapOffsetX = 0;
            mapOffsetY = 0;
            drawMap();
        });
    }

    if (toggleModeBtn) {
        toggleModeBtn.addEventListener('click', toggleEditorMode);
    }

    // Save region button
    const saveRegionBtn = document.getElementById('save-lot-region-btn');
    if (saveRegionBtn) {
        saveRegionBtn.addEventListener('click', saveCurrentRegion);
    }

    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            document.getElementById('lot-map-editor-panel').style.display = 'none';
            selectedRegion = null;
            drawMap();
        });
    }
}

// Handle mouse down
function handleMouseDown(e) {
    if (!editorMode) {
        isDragging = true;
        dragStartX = e.clientX - mapOffsetX;
        dragStartY = e.clientY - mapOffsetY;
    }
}

// Handle mouse move
function handleMouseMove(e) {
    if (isDragging && !editorMode) {
        mapOffsetX = e.clientX - dragStartX;
        mapOffsetY = e.clientY - dragStartY;
        drawMap();
    }
}

// Handle mouse up
function handleMouseUp(e) {
    isDragging = false;
}

// Handle click
function handleClick(e) {
    if (!editorMode) {
        // Check if clicking on a region
        const rect = mapCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / mapScale;
        const y = (e.clientY - rect.top) / mapScale;

        const clickedRegion = findRegionAtPoint(x, y);
        if (clickedRegion) {
            selectedRegion = clickedRegion;
            openRegionEditor(clickedRegion);
            drawMap();
        } else {
            selectedRegion = null;
            document.getElementById('lot-map-editor-panel').style.display = 'none';
            drawMap();
        }
    } else {
        // Editor mode: add point to polygon
        const rect = mapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!currentPolygon) {
            currentPolygon = [];
        }
        currentPolygon.push({ x, y });
        drawMap();
    }
}

// Handle double click
function handleDoubleClick(e) {
    if (editorMode && currentPolygon && currentPolygon.length >= 3) {
        // Finish polygon
        finishPolygon();
    }
}

// Finish polygon
function finishPolygon() {
    if (!currentPolygon || currentPolygon.length < 3) return;

    // Convert canvas coordinates to image coordinates
    const imageCoords = currentPolygon.map(point => ({
        x: point.x / mapScale,
        y: point.y / mapScale
    }));

    // Calculate center for label position
    const centerX = imageCoords.reduce((sum, p) => sum + p.x, 0) / imageCoords.length;
    const centerY = imageCoords.reduce((sum, p) => sum + p.y, 0) / imageCoords.length;

    // Prompt for lot number
    const lotNumber = prompt('Enter lot number:');
    if (!lotNumber) {
        currentPolygon = null;
        drawMap();
        return;
    }

    // Create region
    const region = {
        Lot_Number: lotNumber,
        Owner_Name: '',
        Region_Type: 'polygon',
        Coordinates: imageCoords,
        Label_X: centerX,
        Label_Y: centerY
    };

    lotRegions.push(region);
    currentPolygon = null;
    drawMap();
}

// Find region at point
function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function findRegionAtPoint(x, y) {
    for (let region of lotRegions) {
        if (region.Coordinates && pointInPolygon({ x, y }, region.Coordinates)) {
            return region;
        }
    }
    return null;
}

// Toggle editor mode
function toggleEditorMode() {
    editorMode = !editorMode;
    const btn = document.getElementById('toggle-map-mode-btn');
    btn.textContent = editorMode ? 'View Mode' : 'Editor Mode';
    mapCanvas.style.cursor = editorMode ? 'crosshair' : 'default';
    currentPolygon = null;
    selectedRegion = null;
    document.getElementById('lot-map-editor-panel').style.display = 'none';
    drawMap();
}

// Open region editor
function openRegionEditor(region) {
    document.getElementById('edit-lot-number').value = region.Lot_Number || '';
    document.getElementById('edit-owner-name').value = region.Owner_Name || '';
    document.getElementById('edit-label-x').value = region.Label_X || 0;
    document.getElementById('edit-label-y').value = region.Label_Y || 0;
    document.getElementById('lot-map-editor-panel').style.display = 'block';
}

// Save current region
async function saveCurrentRegion() {
    if (!selectedRegion) return;

    const lotNumber = document.getElementById('edit-lot-number').value;
    const ownerName = document.getElementById('edit-owner-name').value;
    const labelX = parseFloat(document.getElementById('edit-label-x').value) || 0;
    const labelY = parseFloat(document.getElementById('edit-label-y').value) || 0;

    // Update local data
    selectedRegion.Owner_Name = ownerName;
    selectedRegion.Label_X = labelX;
    selectedRegion.Label_Y = labelY;

    // Save to backend
    try {
        await apiCall('/api/lot-map/regions', {
            method: 'POST',
            body: JSON.stringify({
                lot_number: lotNumber,
                owner_name: ownerName,
                region_type: selectedRegion.Region_Type || 'polygon',
                coordinates: selectedRegion.Coordinates,
                label_x: labelX,
                label_y: labelY
            })
        });
        showMessage('Lot region saved successfully');
        drawMap();
    } catch (error) {
        console.error('Error saving region:', error);
    }
}

// Load lot regions
async function loadLotRegions() {
    try {
        lotRegions = await apiCall('/api/lot-map/regions');
        if (imageLoaded) {
            drawMap();
        }
    } catch (error) {
        console.error('Error loading lot regions:', error);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (imageLoaded) {
        resizeCanvas();
        drawMap();
    }
});

