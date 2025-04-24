from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
import json
import os
import tempfile
import uuid
import xml.etree.ElementTree as ET
import pickle
from flask_cors import CORS  # Added CORS import

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes

# Store data in memory (in a real app, you might use a database)
sessions = {}

# Utility functions from the original readxml_2_excel.py
def parse_large_xml(xml_file):
    """Parse large XML file and extract certificate data"""
    # Using iterparse to stream large XML file
    context = ET.iterparse(xml_file, events=("start", "end"))
    _, root = next(context)  # Get root element
    
    cert_data = []

    # Process XML in streaming mode
    for event, elem in context:
        if event == "end" and elem.tag == "Certificate":
            # Extract top-level fields from Certificate
            cert_info = {field.tag: field.text for field in elem if field.tag not in ["ActualEducationOrganization", "Supplements", "Decisions"]}
            
            # Extract ActualEducationOrganization fields
            edu_org = elem.find("ActualEducationOrganization")
            if edu_org is not None:
                for field in edu_org:
                    cert_info[f"EduOrg_{field.tag}"] = field.text
            
            # Add to certificate data
            cert_data.append(cert_info)

            # Clear processed element from memory to prevent high RAM usage
            elem.clear()
    
    # Convert to DataFrame
    df_cert = pd.DataFrame(cert_data)
    return df_cert

# Routes for static files
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

# API Endpoints
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload and parse data"""
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не предоставлен'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400
    
    try:
        # Create a new session ID
        session_id = str(uuid.uuid4())
        
        # Process file based on extension
        file_ext = file.filename.split('.')[-1].lower()
        
        # Save file to temp directory
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, f"{session_id}.{file_ext}")
        file.save(file_path)
        
        # Parse file based on extension
        if file_ext == 'csv':
            df = pd.read_csv(file_path, low_memory=True)
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(file_path)
        elif file_ext == 'xml':
            df = parse_large_xml(file_path)
        elif file_ext in ['pickle', 'pkl', 'pck', 'pcl']:
            with open(file_path, 'rb') as f:
                df = pickle.load(f)
        else:
            return jsonify({'error': 'Неподдерживаемый формат файла'}), 400
        
        # Convert DataFrame to JSON
        data = df.replace({np.nan: None}).to_dict('records')
        
        # Store in session
        sessions[session_id] = {
            'data': data,
            'file_path': file_path,
            'filename': file.filename,
            'filters': []
        }
        
        # Return basic info and the first 1000 records (for large files)
        return jsonify({
            'session_id': session_id,
            'total_rows': len(data),
            'columns': list(df.columns),
            'data': data[:1000]  # Limit initial data transfer
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/<session_id>', methods=['GET'])
def get_data(session_id):
    """Get data for a session with pagination"""
    if session_id not in sessions:
        return jsonify({'error': 'Сессия не найдена'}), 404
    
    try:
        start = int(request.args.get('start', 0))
        length = int(request.args.get('length', 50))
        
        session_data = sessions[session_id]
        data = session_data['data']
        
        # Convert filters from JSON string if present
        filters_str = request.args.get('filters', None)
        if filters_str:
            try:
                filters = json.loads(filters_str)
                if filters:
                    for filter_info in filters:
                        column = filter_info['column']
                        values = filter_info['values']
                        data = [row for row in data if row.get(column) in values]
            except:
                pass  # Ignore filter parsing errors
        # Apply any active filters from session
        elif 'filters' in session_data and session_data['filters']:
            for filter_info in session_data['filters']:
                column = filter_info['column']
                values = filter_info['values']
                data = [row for row in data if row.get(column) in values]
        
        # Get total filtered count
        total_filtered = len(data)
        
        # Paginate
        data_page = data[start:start+length]
        
        return jsonify({
            'data': data_page,
            'recordsTotal': len(session_data['data']),
            'recordsFiltered': total_filtered,
            'draw': int(request.args.get('draw', 1))  # Important for DataTables
        })
    except Exception as e:
        return jsonify({'error': str(e), 'data': []}), 500

@app.route('/api/filter/<session_id>', methods=['POST'])
def apply_filter(session_id):
    """Apply filters to the data"""
    if session_id not in sessions:
        return jsonify({'error': 'Сессия не найдена'}), 404
    
    filter_data = request.json
    
    if not filter_data or 'filters' not in filter_data:
        return jsonify({'error': 'Недопустимые данные фильтра'}), 400
    
    try:
        # Save filters
        sessions[session_id]['filters'] = filter_data['filters']
        
        # Apply filters
        data = sessions[session_id]['data']
        filtered_data = data
        
        for filter_info in filter_data['filters']:
            column = filter_info['column']
            values = filter_info['values']
            filtered_data = [row for row in filtered_data if row.get(column) in values]
        
        return jsonify({
            'success': True,
            'total_rows': len(data),
            'filtered_rows': len(filtered_data)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/<session_id>', methods=['GET'])
def export_data(session_id):
    """Export data in various formats"""
    if session_id not in sessions:
        return jsonify({'error': 'Сессия не найдена'}), 404
    
    export_format = request.args.get('format', 'csv')
    
    try:
        # Get data with any active filters
        data = sessions[session_id]['data']
        
        if 'filters' in sessions[session_id] and sessions[session_id]['filters']:
            for filter_info in sessions[session_id]['filters']:
                column = filter_info['column']
                values = filter_info['values']
                data = [row for row in data if row.get(column) in values]
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Create temporary file for export
        temp_dir = tempfile.gettempdir()
        original_filename = sessions[session_id]['filename'].split('.')[0]
        
        if export_format == 'csv':
            output_file = os.path.join(temp_dir, f"{original_filename}_export.csv")
            df.to_csv(output_file, index=False)
            mimetype = 'text/csv'
        elif export_format == 'excel':
            output_file = os.path.join(temp_dir, f"{original_filename}_export.xlsx")
            df.to_excel(output_file, index=False)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif export_format == 'json':
            output_file = os.path.join(temp_dir, f"{original_filename}_export.json")
            df.to_json(output_file, orient='records')
            mimetype = 'application/json'
        else:
            return jsonify({'error': 'Неподдерживаемый формат экспорта'}), 400
        
        return send_from_directory(
            directory=temp_dir,
            path=os.path.basename(output_file),
            mimetype=mimetype,
            as_attachment=True,
            download_name=os.path.basename(output_file)
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update/<session_id>', methods=['POST'])
def update_cell(session_id):
    """Update a cell value"""
    if session_id not in sessions:
        return jsonify({'error': 'Сессия не найдена'}), 404
    
    update_data = request.json
    
    if not update_data or 'row' not in update_data or 'column' not in update_data or 'value' not in update_data:
        return jsonify({'error': 'Недопустимые данные обновления'}), 400
    
    row_index = update_data['row']
    column = update_data['column']
    value = update_data['value']
    
    # Update the cell
    try:
        sessions[session_id]['data'][row_index][column] = value
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/presets', methods=['GET', 'POST'])
def manage_presets():
    """Get or save filter presets"""
    # In a real application, these would be stored in a database
    # For this demo, we'll use a JSON file
    presets_file = os.path.join(tempfile.gettempdir(), 'filter_presets.json')
    
    if request.method == 'GET':
        try:
            if os.path.exists(presets_file):
                with open(presets_file, 'r') as f:
                    presets = json.load(f)
                return jsonify(presets)
            else:
                return jsonify([])
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            presets = request.json
            with open(presets_file, 'w') as f:
                json.dump(presets, f)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

# Start the application
if __name__ == '__main__':
    # Make sure the static folder exists
    os.makedirs('static', exist_ok=True)
    
    # Run the app
    app.run(debug=True)