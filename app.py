import os
import time
import json
import threading
from collections import deque
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import serial
from flask import Flask, render_template
from flask_socketio import SocketIO
from tensorflow.keras.models import load_model
import joblib

# ==============================================================================
# CONFIGURATION
# ==============================================================================
SERIAL_PORT = os.environ.get('SERIAL_PORT', '/dev/tty.usbmodem14101')  # Mac default, override with env
SERIAL_BAUDRATE = 9600
MODEL_DIR = 'models/saved_model'
MODEL_PATH = os.path.join(MODEL_DIR, 'weather_forecast_model.keras')
FEATURE_SCALER_PATH = os.path.join(MODEL_DIR, 'feature_scaler.pkl')
TARGET_SCALER_PATH = os.path.join(MODEL_DIR, 'target_scaler.pkl')
LOOKBACK_WINDOW = 24
FORECAST_HORIZON = 7
FEATURE_COLS = [
    'temp', 'humidity', 'pressure', 'rain_analog', 'light_intensity', 'aqi',
    'precipitation', 'hour', 'day_of_week', 'month', 'day_of_year',
    'hour_sin', 'hour_cos', 'month_sin', 'month_cos'
]
TARGET_COLS = ['temp', 'precipitation', 'aqi']

# ==============================================================================
# FLASK & SOCKETIO SETUP
# ==============================================================================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key!'
socketio = SocketIO(app, async_mode='threading')

# ==============================================================================
# LOAD MODEL AND SCALERS
# ==============================================================================
try:
    print("Loading model and scalers...")
    model = load_model(MODEL_PATH)
    feature_scaler = joblib.load(FEATURE_SCALER_PATH)
    target_scaler = joblib.load(TARGET_SCALER_PATH)
    print("Model and scalers loaded successfully.")
except Exception as e:
    print(f"FATAL ERROR: Could not load model or scalers. Please check the paths: {e}")
    exit()

# ==============================================================================
# DATA STORAGE AND STATE
# ==============================================================================
recent_readings = deque(maxlen=LOOKBACK_WINDOW)
data_lock = threading.Lock()

# ==============================================================================
# DATA PREPROCESSING FOR LIVE DATA
# ==============================================================================
def preprocess_live_data(data_json):
    df = pd.DataFrame([data_json])
    df['datetime'] = datetime.now()
    df['precipitation'] = 1 - (df['rain_analog'] / 1023.0)
    df['hour'] = df['datetime'].dt.hour
    df['day_of_week'] = df['datetime'].dt.dayofweek
    df['month'] = df['datetime'].dt.month
    df['day_of_year'] = df['datetime'].dt.dayofyear
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    df = df[FEATURE_COLS]
    return df

# ==============================================================================
# BACKGROUND THREAD FOR SERIAL READING AND PREDICTION
# ==============================================================================
def serial_reader_thread():
    print("Starting background serial reader thread...")
    while True:
        try:
            with serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=2) as ser:
                print(f"Successfully connected to Arduino on {SERIAL_PORT}.")
                socketio.emit('status', {'msg': f'Connected to sensor on {SERIAL_PORT}.'})
                
                while True:
                    line = ser.readline()
                    if not line:
                        continue

                    try:
                        data_str = line.decode('utf-8').strip()
                        data_json = json.loads(data_str)
                        
                        processed_df_row = preprocess_live_data(data_json)
                        
                        with data_lock:
                            recent_readings.append(processed_df_row)
                            current_sequence = list(recent_readings)

                        socketio.emit('current_data', data_json)

                        if len(current_sequence) == LOOKBACK_WINDOW:
                            sequence_df = pd.concat(current_sequence, ignore_index=True)
                            scaled_sequence = feature_scaler.transform(sequence_df)
                            model_input = np.expand_dims(scaled_sequence, axis=0)
                            prediction_scaled = model.predict(model_input, verbose=0)
                            prediction_actual = target_scaler.inverse_transform(prediction_scaled.reshape(-1, len(TARGET_COLS)))
                            
                            forecast = []
                            now = datetime.now()
                            # Create a 2-hourly forecast from the 7 prediction steps
                            for i in range(min(5, FORECAST_HORIZON)): # Limit to 5 cards for the UI
                                forecast_time = now + timedelta(hours=(i+1)*2)
                                forecast.append({
                                    'time': forecast_time.strftime('%H:00'),
                                    'temp': round(prediction_actual[i, 0], 1),
                                    'precipitation': round(prediction_actual[i, 1] * 100, 1),
                                    'aqi': int(prediction_actual[i, 2])
                                })
                            
                            socketio.emit('new_forecast', {'forecast': forecast})
                            socketio.emit('status', {'msg': 'Live prediction active.'})
                        else:
                            status_msg = f'Gathering data... {len(current_sequence)}/{LOOKBACK_WINDOW}'
                            socketio.emit('status', {'msg': status_msg})

                    except json.JSONDecodeError:
                        print(f"Warning: Could not decode JSON: {line}")
                    except Exception as e:
                        print(f"Error in reading loop: {e}")
                    
                    time.sleep(1)

        except serial.SerialException:
            socketio.emit('status', {'msg': f'Sensor not detected on {SERIAL_PORT}. Retrying...'})
            time.sleep(5)
        except Exception as e:
            print(f"Critical error in serial thread: {e}")
            time.sleep(5)

# ==============================================================================
# FLASK ROUTES
# ==============================================================================
@app.route('/')
def index():
    return render_template('index.html')

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================
if __name__ == '__main__':
    print("Starting Flask server...")
    thread = threading.Thread(target=serial_reader_thread)
    thread.daemon = True
    thread.start()
    socketio.run(app, debug=True, use_reloader=False, host='0.0.0.0', port=5000)


# Main execution flow
if __name__ == '__main__':
    # Execute functions or start server
    pass
