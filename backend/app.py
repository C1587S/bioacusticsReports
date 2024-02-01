from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import db
import utils

load_dotenv('environment_vars')
AUDIO_FILES_DIR = os.getenv("AUDIO_FILES_DIR")
RESULTS_FILES_DIR = os.getenv("RESULTS_FILES_DIR")
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

# Create the Flask app
app = Flask(__name__)

# Enable CORS for the app
CORS(app)

# Define the directory for audio files

# Define the home route
@app.route('/')
def home():
    return 'Bioacoustic request server SSSSF'

# Route to get top files for a project
@app.route('/get_top_files', methods=['GET'])
def get_top_files_route():
    project = request.args.get('project')
    data = db.get_top_files(project)
    return jsonify(data)

# Route to get file details
@app.route('/get_file_details', methods=['GET'])
def get_file_details_route():
    file_id = request.args.get('file_id')
    data = db.get_file_details(file_id)
    return jsonify(data)

# Route to get detection details for a file
@app.route('/get_detection_details', methods=['GET'])
def get_detection_details_route():
    file_id = request.args.get('file_id')
    data = db.get_detection_details(file_id)
    return jsonify(data)

# Route to generate spectrogram
@app.route('/generate_spectrogram', methods=['POST'])
def generate_spectrogram_route():
    try:
        data = request.get_json()
        obs_data = data['obsData']
        project_name = data['project']
        file_name = data['fileName']
        file_url = data['url']
        audio_url = file_url.replace("s3:/", "/shared_volume_s3fs")
        
        # Construct the file path for the audio file
        # file_path = utils.construct_file_path(project_name, file_name)
        if not os.path.exists(audio_url):
            return jsonify({"error": f"Audio file not found: {audio_url}"}), 404

        # Generate spectrogram and get detection data
        spectrogram_path, detection_data = utils.generate_spectrogram(audio_url, obs_data=obs_data)

        # Update URLs for audio and spectrogram
        project_folder = project_name.lower().replace(' ', '_')
        base_url = "http://localhost:5001"
        spectrogram_url = f"{base_url}/results/{os.path.basename(spectrogram_path)}"


        return jsonify({"audioUrl": audio_url, "spectrogramUrl": spectrogram_url, "detectionData": detection_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/<path:filename>')
def serve_audio_file(filename):
    return send_from_directory(AUDIO_FILES_DIR, filename)

# Serve result files (spectrograms)
@app.route('/results/<path:filename>')
def results_files(filename):
    return send_from_directory(RESULTS_FILES_DIR, filename)

# Run the Flask app if this script is executed
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=FLASK_DEBUG)