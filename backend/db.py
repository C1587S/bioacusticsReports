import os
import psycopg2
from dotenv import load_dotenv
from flask import Flask, request, jsonify

# Load environment variables from a .env file
load_dotenv()

# Retrieve database connection details from environment variables
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_PORT = os.getenv("DB_PORT")

# Create a Flask app
app = Flask(__name__)

def get_top_files(project_name):
    """
    Get the top files for a given project based on certain criteria.

    Parameters:
    - project_name (str): The name of the project to retrieve files for.

    Returns:
    - list: A list of dictionaries containing file information.
    """
    
    conn = psycopg2.connect(
        dbname=DB_NAME, 
        user=DB_USER, 
        password=DB_PASS, 
        host=DB_HOST, 
        port=DB_PORT
    )
    cur = conn.cursor()

    # Use parameterized query to prevent SQL injection
    sql_query = """
    SELECT file_id, COUNT(*) as num_observations
    FROM public."Observations"
    WHERE project_id = (
        SELECT id FROM public."Projects" WHERE title = %s
    )
    AND high_frequency IS NOT NULL
    AND confidence >= 0.99
    GROUP BY file_id
    ORDER BY num_observations DESC
    LIMIT 10;
    """
    cur.execute(sql_query, (project_name,))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    data = [{"file_id": row[0], "num_observations": row[1]} for row in rows]
    return data

def get_file_details(file_id):
    """
    Get details of a specific file by its ID.

    Parameters:
    - file_id (int): The ID of the file to retrieve details for.

    Returns:
    - dict or None: A dictionary containing file details, or None if the file does not exist.
    """
    conn = psycopg2.connect(
        dbname=DB_NAME, 
        user=DB_USER, 
        password=DB_PASS, 
        host=DB_HOST, 
        port=DB_PORT
    )
    cur = conn.cursor()

    sql_query = """
        SELECT 
            f.name AS name, 
            f.url AS url, 
            f.file_metadata AS datetime, 
            ST_Y(sp.location) AS latitude,  -- Extract latitude
            ST_X(sp.location) AS longitude, -- Extract longitude
            e.name AS ecosystem_name,
            f.project_id AS project_id
        FROM public."Files" AS f
        JOIN public."SamplingPoints" AS sp ON f.sampling_point_id = sp.id
        JOIN public."Ecosystems" AS e ON sp.ecosystem_id = e.id
        WHERE f.id = %s;
    """
    cur.execute(sql_query, (file_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()

    if row:
        return {
            "name": row[0], 
            "url": row[1], 
            "datetime": row[2].get('Datetime'),  
            "latitude": row[3],  # Latitude
            "longitude": row[4],  # Longitude
            "ecosystem_name": row[5],
            "project_id": row[6]
        }
    else:
        return None
    
def get_detection_details(file_id):
    """
    Get detection details of a specific file by its ID.

    Parameters:
    - file_id (int): The ID of the file to retrieve detection details for.

    Returns:
    - list: A list of dictionaries containing detection details.
    """
    conn = psycopg2.connect(
        dbname=DB_NAME, 
        user=DB_USER, 
        password=DB_PASS, 
        host=DB_HOST, 
        port=DB_PORT
    )
    cur = conn.cursor()
    
    sql_query = """
    SELECT confidence, taxon_id, high_frequency, low_frequency, start_time, end_time
    FROM public."Observations"
    WHERE file_id = %s;
    """
    cur.execute(sql_query, (file_id,))
    rows = cur.fetchall()  # Fetch all rows

    cur.close()
    conn.close()

    if rows:
        return [
            {
                "confidence": row[0], 
                "taxon_id": row[1], 
                "high_frequency": row[2], 
                "low_frequency": row[3],
                "start_time": row[4].isoformat(),  # Format datetime to ISO format string
                "end_time": row[5].isoformat()     # Format datetime to ISO format string
            }
            for row in rows
        ]
    else:
        return []

@app.route('/')
def home():
    return 'Bioacoustic request server'

@app.route('/get_top_files', methods=['GET'])
def get_top_files_route():
    project = request.args.get('project')
    data = get_top_files(project)
    return jsonify(data)

@app.route('/get_file_details', methods=['GET'])
def get_file_details_route():
    file_id = request.args.get('file_id')
    data = get_file_details(file_id)
    return jsonify(data)

@app.route('/get_detection_details', methods=['GET'])
def get_detection_details_route():
    file_id = request.args.get('file_id')
    data = get_detection_details(file_id)
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
