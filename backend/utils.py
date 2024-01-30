import os
import librosa
import librosa.display
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import requests

# Load environment variables from a .env file

def construct_file_path(project_name, file_name):
    """
    Construct the file path for an audio file based on project name and file name.

    Parameters:
    - project_name (str): The name of the project.
    - file_name (str): The name of the audio file.

    Returns:
    - str: The constructed file path.
    """
    base_path = 'audio_files'
    project_folder = project_name.lower().replace(' ', '_')
    file_name = file_name.lower().replace('.WAV', '.wav') 
    return os.path.join(base_path, project_folder, file_name)

def fetch_sci_name(taxon_id):
    """
    Fetch the scientific name of a species using its taxon ID.

    Parameters:
    - taxon_id (str): The taxon ID of the species.

    Returns:
    - str: The scientific name of the species or "Unknown" if not found.
    """
    url = f"https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&loc=es&com_name={taxon_id}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        if data:
            return data[0]['sciName']
    return "Unknown"

def get_taxon_info():
    """
    Get taxonomy information for species from the eBird API.

    Returns:
    - pandas.DataFrame: A DataFrame containing species information (common name, taxon ID, and scientific name).
    """
    url = "https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&loc=es&com_name="

    response = requests.get(url)
    response.raise_for_status() 
    data = response.json()
    df_species = pd.DataFrame(data)
    df_species.rename(columns={"comName": "com_name", "speciesCode": "taxon_id", "sciName": "sci_name"}, inplace=True)
    df_species = df_species[["com_name", "taxon_id", "sci_name"]]
    
    return df_species

def merge_adjacent_boxes(df):
    """
    Merge adjacent bounding boxes with the same taxon ID.

    Parameters:
    - df (pandas.DataFrame): DataFrame containing detection data with columns 'taxon_id', 'start_time', 'end_time', and 'confidence'.

    Returns:
    - pandas.DataFrame: DataFrame with merged boxes.
    """
    # Sort the DataFrame by taxon_id and start_time
    sorted_df = df.sort_values(by=['taxon_id', 'start_time'])
    merged_boxes = []

    current_box = None
    for _, row in sorted_df.iterrows():
        if current_box is not None:
            # Check if the current row can be merged with the current_box
            if row['taxon_id'] == current_box['taxon_id'] and row['start_time'] <= current_box['end_time']:
                # Extend the current_box's end_time
                current_box['end_time'] = max(current_box['end_time'], row['end_time'])
            else:
                # Current row can't be merged, add the current_box to merged_boxes
                merged_boxes.append(current_box)
                current_box = row.to_dict()
        else:
            # Initialize the first current_box
            current_box = row.to_dict()

    # Add the last box
    if current_box is not None:
        merged_boxes.append(current_box)

    return pd.DataFrame(merged_boxes)

def generate_spectrogram(file_path, results_dir='results', obs_data=None):
    """
    Generate a spectrogram image for an audio file and return detection data.

    Parameters:
    - file_path (str): Path to the audio file.
    - results_dir (str): Directory to save the spectrogram image.
    - obs_data (list of dictionaries): Observation data including 'taxon_id', 'start_time', 'end_time', and 'confidence'.

    Returns:
    - tuple: A tuple containing the path to the spectrogram image and detection data in JSON format.
    """
    if obs_data is not None:
        df = pd.DataFrame(obs_data)
        
    df.drop_duplicates(inplace=True)
    df = df.groupby([col for col in df.columns if col != 'confidence'], as_index=False).agg({'confidence': 'max'})
    df = df.query("confidence >= 0.95")
    
    # Fetch scientific names
    df_species = get_taxon_info()
    df_species.to_csv('species_info.csv', index=False)
    unique_taxon_ids = df['taxon_id'].unique()
    sci_names = {taxon_id: df_species.query(f"taxon_id=='{taxon_id}'")["sci_name"].values[0] if taxon_id in df_species["taxon_id"].values else None for taxon_id in unique_taxon_ids}
    com_names = {taxon_id: df_species.query(f"taxon_id=='{taxon_id}'")["com_name"].values[0] if taxon_id in df_species["taxon_id"].values else None for taxon_id in unique_taxon_ids}
    
    df['sciName'] = df['taxon_id'].map(sci_names)
    df['comName'] = df['taxon_id'].map(com_names)

    unique_sci_names = df['sciName'].unique()
    
    # Generate distinct colors for the boxes
    num_colors = len(unique_sci_names)
    cmap = plt.get_cmap('viridis')
    colors = [cmap(i / num_colors) for i in range(num_colors)]
    
    color_map_sciname = {sci_name: colors[i] for i, sci_name in enumerate(unique_sci_names)}

    # Ensure the results directory exists
    os.makedirs(results_dir, exist_ok=True)
    plt.style.use('dark_background')

    # Load and resample the audio file
    y, sr = librosa.load(file_path, sr=48000)
    D = librosa.amplitude_to_db(np.abs(librosa.stft(y)), ref=np.max)

    # Create the figure for the spectrogram
    plt.figure(figsize=(15, 8), dpi=100)
    ax = plt.subplot(1, 1, 1)

    # Plot the spectrogram
    librosa.display.specshow(D, sr=sr, x_axis='time', y_axis='log', cmap='viridis')

    # Draw bounding boxes and labels
    merged_df = merge_adjacent_boxes(df)
    
    for index, row in merged_df.iterrows():
        color = color_map_sciname[row['sciName']]
        rect = plt.Rectangle((row['start_time'], row['low_frequency']), 
                            row['end_time'] - row['start_time'], 
                            row['high_frequency'] - row['low_frequency'], 
                            edgecolor=color, 
                            facecolor='none',
                            linewidth=2)
        ax.add_patch(rect)

    # Remove Y-axis ticks and labels
    ax.set_yticks([])
    ax.set_yticklabels([])
     
    # Remove X-axis ticks and labels
    ax.tick_params(axis='x', which='both', bottom=False, top=False, labelbottom=False)

    plt.xlabel('')
    plt.ylabel('')

    # Adjust spacing and remove margins
    plt.subplots_adjust(left=0, right=1, bottom=0, top=1)

    output_path = os.path.join(results_dir, os.path.basename(file_path).split('.')[0] + '_spectrogram.png')
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0)
    plt.close()

    # Convert detection data to JSON
    detection_data_json = merged_df.to_json(orient='records')

    # Ensure to return exactly two values: path to spectrogram and detection data
    return output_path, detection_data_json

