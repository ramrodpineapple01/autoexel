"""
WCCSA Community Directory Management Tool
Flask application entry point
"""
import os
import csv
import json
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename
from excel_handler import ExcelHandler

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'data/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

excel_handler = ExcelHandler()


# ==================== Routes ====================

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')


# ==================== Directory API ====================

@app.route('/api/directory', methods=['GET'])
def get_directory():
    """Get all directory entries"""
    data = excel_handler.get_sheet_data('Directory')
    return jsonify(data)


@app.route('/api/directory/search', methods=['GET'])
def search_directory():
    """Search directory"""
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    results = excel_handler.search_directory(query)
    return jsonify(results)


@app.route('/api/directory', methods=['POST'])
def add_directory_entry():
    """Add a new directory entry"""
    data = request.json
    success = excel_handler.add_row('Directory', data)
    if success:
        return jsonify({'success': True, 'message': 'Entry added successfully'})
    return jsonify({'success': False, 'message': 'Failed to add entry'}), 400


@app.route('/api/directory/<int:entry_id>', methods=['PUT'])
def update_directory_entry(entry_id):
    """Update a directory entry"""
    data = request.json
    success = excel_handler.update_row('Directory', entry_id, data)
    if success:
        return jsonify({'success': True, 'message': 'Entry updated successfully'})
    return jsonify({'success': False, 'message': 'Entry not found'}), 404


@app.route('/api/directory/<int:entry_id>', methods=['DELETE'])
def delete_directory_entry(entry_id):
    """Delete a directory entry"""
    success = excel_handler.delete_row('Directory', entry_id)
    if success:
        return jsonify({'success': True, 'message': 'Entry deleted successfully'})
    return jsonify({'success': False, 'message': 'Entry not found'}), 404


@app.route('/api/directory/bulk-import', methods=['POST'])
def bulk_import_directory():
    """Bulk import directory entries from CSV"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    try:
        # Read CSV - try multiple encodings
        file_content = file.stream.read()
        stream = None
        
        # Try UTF-8 first, then fallback to latin-1 and utf-8-sig (BOM)
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                stream = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if stream is None:
            return jsonify({
                'success': False,
                'message': 'Could not decode CSV file. Please ensure the file is saved as UTF-8 or CSV format.'
            }), 400
        
        # Parse CSV
        csv_reader = csv.DictReader(stream.splitlines())
        
        required_headers = ['Owner', 'Phone', 'Address', 'City', 'State', 'Zip', 'Email', 'Lot_Number']
        headers = csv_reader.fieldnames
        
        if not headers:
            return jsonify({
                'success': False,
                'message': 'CSV file appears to be empty or invalid. Please check the file format.'
            }), 400
        
        # Check for required headers (case-insensitive)
        headers_lower = [h.strip().lower() if h else '' for h in headers]
        required_lower = [h.lower() for h in required_headers]
        
        missing_headers = []
        for req_header in required_lower:
            if req_header not in headers_lower:
                missing_headers.append(req_header)
        
        if missing_headers:
            return jsonify({
                'success': False,
                'message': f'CSV is missing required columns: {", ".join(missing_headers)}. Found columns: {", ".join(headers)}'
            }), 400
        
        # Create header mapping (case-insensitive)
        header_map = {}
        for req_header in required_headers:
            for idx, header in enumerate(headers):
                if header and header.strip().lower() == req_header.lower():
                    header_map[req_header] = header
                    break
        
        imported = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (row 1 is header)
            # Skip empty rows
            if not any(str(v).strip() if v else '' for v in row.values()):
                continue
            
            try:
                excel_handler.add_row('Directory', {
                    'Owner': row.get(header_map.get('Owner', 'Owner'), ''),
                    'Phone': row.get(header_map.get('Phone', 'Phone'), ''),
                    'Address': row.get(header_map.get('Address', 'Address'), ''),
                    'City': row.get(header_map.get('City', 'City'), ''),
                    'State': row.get(header_map.get('State', 'State'), ''),
                    'Zip': row.get(header_map.get('Zip', 'Zip'), ''),
                    'Email': row.get(header_map.get('Email', 'Email'), ''),
                    'Lot_Number': row.get(header_map.get('Lot_Number', 'Lot_Number'), '')
                })
                imported += 1
            except Exception as e:
                errors.append(f'Row {row_num}: {str(e)}')
        
        if errors:
            return jsonify({
                'success': False,
                'message': f'Imported {imported} entries, but encountered errors: {"; ".join(errors[:5])}'
            }), 400
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {imported} entries'
        })
    
    except csv.Error as e:
        return jsonify({
            'success': False,
            'message': f'CSV parsing error: {str(e)}. Please ensure the file is a valid CSV format.'
        }), 400
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'message': f'Import error: {str(e)}'
        }), 400


@app.route('/api/directory/template', methods=['GET'])
def get_directory_template():
    """Download CSV template for directory import"""
    template_path = 'data/templates/directory_template.csv'
    os.makedirs(os.path.dirname(template_path), exist_ok=True)
    
    # Create template file
    with open(template_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Owner', 'Phone', 'Address', 'City', 'State', 'Zip', 'Email', 'Lot_Number'])
        writer.writerow(['John Doe', '555-1234', '123 Main St', 'City', 'CA', '12345', 'john@example.com', '1'])
    
    return send_file(template_path, as_attachment=True, download_name='directory_template.csv')


# ==================== Board of Directors API ====================

@app.route('/api/bod', methods=['GET'])
def get_bod():
    """Get board of directors"""
    year = request.args.get('year', None)
    data = excel_handler.get_sheet_data('Board_of_Directors')
    
    if year:
        data = [row for row in data if str(row.get('Year', '')) == str(year)]
    
    return jsonify(data)


@app.route('/api/bod/years', methods=['GET'])
def get_bod_years():
    """Get all years with board data"""
    data = excel_handler.get_sheet_data('Board_of_Directors')
    years = sorted(set(str(row.get('Year', '')) for row in data if row.get('Year')), reverse=True)
    return jsonify(years)


@app.route('/api/bod', methods=['POST'])
def save_bod():
    """Save board of directors data"""
    data = request.json
    year = data.get('year')
    positions = data.get('positions', [])
    
    # Delete existing entries for this year
    ws = excel_handler.wb['Board_of_Directors']
    rows_to_delete = []
    for idx, row in enumerate(ws.iter_rows(min_row=2), start=2):
        if str(row[0].value) == str(year):
            rows_to_delete.append(idx)
    
    for idx in reversed(rows_to_delete):
        ws.delete_rows(idx)
    
    # Add new entries
    for pos in positions:
        excel_handler.add_row('Board_of_Directors', {
            'Year': year,
            'Position': pos.get('position', ''),
            'Name': pos.get('name', ''),
            'Additional_Duties': pos.get('additional_duties', ''),
            'Contact_Info': pos.get('contact_info', '')
        })
    
    return jsonify({'success': True, 'message': 'Board of Directors saved successfully'})


# ==================== Committees API ====================

@app.route('/api/committees', methods=['GET'])
def get_committees():
    """Get all committees"""
    committees = excel_handler.get_committees()
    return jsonify(committees)


@app.route('/api/committees', methods=['POST'])
def save_committee():
    """Save a committee"""
    data = request.json
    committee_name = data.get('committee_name')
    members = data.get('members', [])
    meeting_notes = data.get('meeting_notes', '')
    
    excel_handler.save_committee(committee_name, members, meeting_notes)
    return jsonify({'success': True, 'message': 'Committee saved successfully'})


# ==================== Lot Owners API ====================

@app.route('/api/lot-owners', methods=['GET'])
def get_lot_owners():
    """Get all lot owners"""
    data = excel_handler.get_sheet_data('Lot_Owners')
    return jsonify(data)


@app.route('/api/lot-owners', methods=['POST'])
def add_lot_owner():
    """Add or update a lot owner"""
    data = request.json
    surname = data.get('Surname', '').strip()
    firstname = data.get('FirstName', '').strip()
    
    # Check if lot owner already exists
    if surname and firstname:
        # Try to update existing entry
        update_data = {
            'Surname': surname,
            'FirstName': firstname,
            'Lot_Numbers': data.get('Lot_Numbers', '')
        }
        if excel_handler.update_lot_owner(surname, firstname, update_data):
            return jsonify({'success': True, 'message': 'Lot owner updated successfully'})
    
    # If not found, add as new row
    success = excel_handler.add_row('Lot_Owners', data)
    if success:
        return jsonify({'success': True, 'message': 'Lot owner added successfully'})
    return jsonify({'success': False, 'message': 'Failed to add lot owner'}), 400


@app.route('/api/lot-owners/bulk-import', methods=['POST'])
def bulk_import_lot_owners():
    """Bulk import lot owners from CSV"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    try:
        # Read CSV - try multiple encodings
        file_content = file.stream.read()
        stream = None
        
        # Try UTF-8 first, then fallback to latin-1 and utf-8-sig (BOM)
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                stream = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if stream is None:
            return jsonify({
                'success': False,
                'message': 'Could not decode CSV file. Please ensure the file is saved as UTF-8 or CSV format.'
            }), 400
        
        # Parse CSV
        csv_reader = csv.DictReader(stream.splitlines())
        
        required_headers = ['Surname', 'FirstName', 'Lot_Numbers']
        headers = csv_reader.fieldnames
        
        if not headers:
            return jsonify({
                'success': False,
                'message': 'CSV file appears to be empty or invalid. Please check the file format.'
            }), 400
        
        # Check for required headers (case-insensitive)
        headers_lower = [h.strip().lower() if h else '' for h in headers]
        required_lower = [h.lower() for h in required_headers]
        
        missing_headers = []
        for req_header in required_lower:
            if req_header not in headers_lower:
                missing_headers.append(req_header)
        
        if missing_headers:
            return jsonify({
                'success': False,
                'message': f'CSV is missing required columns: {", ".join(missing_headers)}. Found columns: {", ".join(headers)}'
            }), 400
        
        # Create header mapping (case-insensitive)
        header_map = {}
        for req_header in required_headers:
            for idx, header in enumerate(headers):
                if header and header.strip().lower() == req_header.lower():
                    header_map[req_header] = header
                    break
        
        imported = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (row 1 is header)
            # Skip empty rows
            if not any(str(v).strip() if v else '' for v in row.values()):
                continue
            
            try:
                surname = row.get(header_map.get('Surname', 'Surname'), '').strip()
                firstname = row.get(header_map.get('FirstName', 'FirstName'), '').strip()
                lot_numbers = row.get(header_map.get('Lot_Numbers', 'Lot_Numbers'), '').strip()
                
                # Use update_lot_owner to avoid duplicates
                if surname and firstname:
                    update_data = {
                        'Surname': surname,
                        'FirstName': firstname,
                        'Lot_Numbers': lot_numbers
                    }
                    if not excel_handler.update_lot_owner(surname, firstname, update_data):
                        # If update failed, add as new row
                        excel_handler.add_row('Lot_Owners', update_data)
                else:
                    excel_handler.add_row('Lot_Owners', {
                        'Surname': surname,
                        'FirstName': firstname,
                        'Lot_Numbers': lot_numbers
                    })
                imported += 1
            except Exception as e:
                errors.append(f'Row {row_num}: {str(e)}')
        
        if errors:
            return jsonify({
                'success': False,
                'message': f'Imported {imported} entries, but encountered errors: {"; ".join(errors[:5])}'
            }), 400
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {imported} lot owners'
        })
    
    except csv.Error as e:
        return jsonify({
            'success': False,
            'message': f'CSV parsing error: {str(e)}. Please ensure the file is a valid CSV format.'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Import error: {str(e)}'
        }), 400


@app.route('/api/lot-owners/template', methods=['GET'])
def get_lot_owners_template():
    """Download CSV template for lot owners import"""
    template_path = 'data/templates/lot_owners_template.csv'
    os.makedirs(os.path.dirname(template_path), exist_ok=True)
    
    with open(template_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Surname', 'FirstName', 'Lot_Numbers'])
        writer.writerow(['Doe', 'John', '1,2,3'])
    
    return send_file(template_path, as_attachment=True, download_name='lot_owners_template.csv')


@app.route('/api/lot-owners/sync-directory', methods=['POST'])
def sync_lot_owners_from_directory():
    """Sync lot owners from directory (extract surname, firstname)"""
    directory = excel_handler.get_sheet_data('Directory')
    
    # Clear existing lot owners (keep header row only)
    ws = excel_handler.wb['Lot_Owners']
    # Delete all data rows (rows 2 and onwards), keeping header row 1
    if ws.max_row > 1:
        ws.delete_rows(2, ws.max_row)
    
    # Ensure header row exists and is correct (only recreate if missing or wrong)
    if ws.max_row == 0 or (ws.max_row >= 1 and ws.cell(1, 1).value != 'Surname'):
        # Header doesn't exist or is wrong, recreate it
        headers = ['Surname', 'FirstName', 'Lot_Numbers']
        for col_idx, header in enumerate(headers, start=1):
            ws.cell(1, col_idx, value=header)
        excel_handler.format_headers(ws)
        excel_handler.wb.save(excel_handler.file_path)
    
    # Extract names from directory and add as data rows (starting from row 2)
    for entry in directory:
        owner = entry.get('Owner', '').strip()
        if owner:
            # Try to split name (assumes "FirstName LastName" or "LastName, FirstName")
            parts = owner.split(',')
            if len(parts) == 2:
                surname = parts[0].strip()
                firstname = parts[1].strip()
            else:
                name_parts = owner.split()
                if len(name_parts) >= 2:
                    firstname = name_parts[0]
                    surname = ' '.join(name_parts[1:])
                else:
                    surname = owner
                    firstname = ''
            
            # Add row using add_row which will append after existing rows (starting at row 2)
            excel_handler.add_row('Lot_Owners', {
                'Surname': surname,
                'FirstName': firstname,
                'Lot_Numbers': ''
            })
    
    excel_handler.wb.save(excel_handler.file_path)
    return jsonify({'success': True, 'message': f'Lot owners synced from directory ({len(directory)} entries)'})


# ==================== Lot Map API ====================

@app.route('/api/lot-map/regions', methods=['GET'])
def get_lot_map_regions():
    """Get all lot map regions"""
    regions = excel_handler.get_lot_map_regions()
    # Parse coordinates JSON strings
    for region in regions:
        coords = region.get('Coordinates', '[]')
        if isinstance(coords, str):
            try:
                region['Coordinates'] = json.loads(coords)
            except:
                region['Coordinates'] = []
    return jsonify(regions)


@app.route('/api/lot-map/regions', methods=['POST'])
def save_lot_map_region():
    """Save a lot map region"""
    data = request.json
    lot_number = data.get('lot_number')
    owner_name = data.get('owner_name', '')
    region_type = data.get('region_type', 'polygon')
    coordinates = data.get('coordinates', [])
    label_x = data.get('label_x', 0)
    label_y = data.get('label_y', 0)
    
    excel_handler.save_lot_map_region(
        lot_number, owner_name, region_type, coordinates, label_x, label_y
    )
    return jsonify({'success': True, 'message': 'Lot map region saved'})


@app.route('/api/lot-map/regions/<lot_number>', methods=['GET'])
def get_lot_map_region(lot_number):
    """Get a specific lot map region"""
    region = excel_handler.get_lot_map_region(lot_number)
    if region:
        return jsonify(region)
    return jsonify({'error': 'Region not found'}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

