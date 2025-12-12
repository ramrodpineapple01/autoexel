# WCCSA Community Directory Management Tool

A standalone local web application for managing community directory information, board of directors, committees, lot owners, and an interactive lot map. Runs entirely offline with no internet connection required.

## Features

- **Directory Management**: Search, add, edit, and delete community member entries
- **Bulk Import**: Import directory entries from CSV files with template download
- **Board of Directors**: Manage board positions by year with additional duties
- **Committees**: Track 15 committees with members, chairs, and meeting notes
- **Lot Owners**: Auto-sync from directory or bulk import with lot number assignment
- **Interactive Lot Map**: Visual map with clickable regions, owner names, and editor mode
- **Print Support**: Print-friendly views for all sections

## Requirements

- Python 3.7 or higher
- pip (Python package manager)

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the Flask server:
```bash
python app.py
```

2. Open your web browser and navigate to:
```
http://localhost:5000
```

The application will automatically create the necessary Excel file (`data/community_data.xlsx`) on first run.

## Usage

### Directory

- **Add Entry**: Click "Add Entry" to manually add a new directory entry
- **Search**: Use the search box to filter entries by any field
- **Edit/Delete**: Use the action buttons in each row
- **Bulk Import**: Click "Bulk Import" and select a CSV file. Download the template first to ensure proper format
- **Print**: Click "Print" for a print-friendly view

### Board of Directors

- **Select Year**: Choose a year from the dropdown or add a new year
- **Edit Positions**: Click on any field to edit. Changes save automatically
- **Additional Duties**: Add roles like "Treasurer" in the Additional Duties field

### Committees

- **Add Members**: Click "Add Member" for any committee
- **Set Chair**: Use the role dropdown to designate a Chair
- **Meeting Notes**: Add notes in the textarea at the bottom of each committee section
- Changes save automatically

### Lot Owners

- **Sync from Directory**: Click "Sync from Directory" to automatically create lot owner entries from directory names
- **Assign Lot Numbers**: Enter lot numbers in the "Lot Numbers" column (comma-separated for multiple lots)
- **Bulk Import**: Import lot assignments from CSV

### Lot Map

- **View Mode**: Click on any lot to see/edit owner information
- **Editor Mode**: Click "Editor Mode" to draw polygon regions around lots
  - Click to add points to a polygon
  - Double-click to finish a polygon
  - Enter lot number when prompted
- **Zoom Controls**: Use zoom in/out buttons or reset zoom
- **Save Regions**: After drawing, click on a region and use the editor panel to set owner name and label position

## CSV Import Formats

### Directory Template
```csv
Owner,Phone,Address,City,Zip,Email
John Doe,555-1234,123 Main St,City,12345,john@example.com
```

### Lot Owners Template
```csv
Surname,FirstName,Lot_Numbers
Doe,John,1,2,3
Smith,Jane,5
```

## File Structure

```
autoexel/
├── app.py                 # Flask application
├── excel_handler.py       # Excel file operations
├── requirements.txt       # Python dependencies
├── data/
│   ├── community_data.xlsx    # Main data file (auto-created)
│   └── templates/         # CSV templates
├── static/
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   └── img/              # Images (lot map background)
└── templates/
    └── index.html        # Main HTML template
```

## Notes

- All data is stored locally in `data/community_data.xlsx`
- The lot map uses `static/img/lot_map_bg.jpg` as the background (your Picture1.jpg)
- The application runs entirely offline - no internet connection required
- Data is saved automatically as you make changes

## Troubleshooting

- **Port already in use**: Change the port in `app.py` (last line)
- **Excel file locked**: Make sure the Excel file is not open in another program
- **Map not loading**: Ensure `Picture1.jpg` is copied to `static/img/lot_map_bg.jpg`
