# Real-Time Hyperlocal Weather & Air Quality Forecasting Station

![Dashboard Screenshot](path/to/your/screenshot.jpg) <!-- **Important:** Replace this path with the actual path to your screenshot after you upload it to your repo -->

This project is an end-to-end IoT and Deep Learning application that provides real-time, hyperlocal weather and air quality forecasts. An Arduino sensor array streams live environmental data to a Flask server, which uses a trained RNN-LSTM model to predict future conditions and displays everything on a dynamic, modern web dashboard.

## Features

-   **Real-Time Data Acquisition:** Collects live data every second from a suite of sensors connected to an Arduino.
-   **Deep Learning Forecasts:** Utilizes a Recurrent Neural Network (RNN) with LSTM layers, trained on historical time-series data, to predict weather and AQI for the next 14 hours.
-   **Dynamic Web Dashboard:** A sleek, single-page web application built with Flask, Tailwind CSS, and Chart.js that updates in real-time without needing to refresh.
-   **Continual Learning:** Automatically aggregates live sensor data every two hours and appends it to the training dataset, allowing the model to be periodically retrained and improved.

---

## How It Works

The project follows a continuous data pipeline:

1.  **Sensor Array (Arduino):** An Arduino Uno with DHT11, BMP280, MQ-135, and other sensors reads temperature, humidity, pressure, and various gas concentrations.
2.  **Data Transmission:** The Arduino formats the readings into a JSON string and sends it over the USB serial port every second.
3.  **Backend Server (Flask):** The main `app.py` script runs a Flask web server. A background thread, managed by `serial_handler.py`, continuously listens to the serial port for incoming JSON data.
4.  **Live Processing & Prediction:**
    * For each new reading, the server preprocesses it to create engineered features (like cyclical time features).
    * This new data point is added to a rolling 24-hour window of recent readings.
    * This window is fed into the pre-trained Keras LSTM model to generate a 14-hour forecast.
5.  **Real-Time Updates (Socket.IO):** Both the live sensor data and the new forecast are immediately pushed to the web dashboard using WebSockets, ensuring the UI is always up-to-date.
6.  **Data Aggregation (`dataset_updater.py`):** In parallel, all raw readings are collected. Every two hours, they are averaged into a single data point and appended to the `cleaned_weather_data.csv` file, enriching the dataset for future model retraining.

---

## Technology Stack

| Category          | Technology                                                              |
| ----------------- | ----------------------------------------------------------------------- |
| **Hardware** | Arduino Uno, DHT11, BMP280, MQ-135, MQ-9, Rain Sensor, LDR                |
| **Backend** | Python, Flask, Flask-SocketIO, PySerial, Pandas, NumPy                  |
| **Machine Learning**| TensorFlow, Keras, Scikit-learn                                         |
| **Frontend** | HTML5, Tailwind CSS, JavaScript, Chart.js                               |
| **Development** | Jupyter Notebook, VS Code, Git & GitHub                                 |

---

## The Deep Learning Model

The forecasting model is a **Recurrent Neural Network (RNN)** using **Long Short-Term Memory (LSTM)** layers. This architecture is specifically chosen for its effectiveness in learning from sequential and time-series data, like weather patterns.

-   **Architecture:** Sequential model with two LSTM layers and Dropout for regularization.
-   **Input:** The model takes a sequence of the last **24 hours** of sensor data as input.
-   **Output:** It predicts **7 future steps** (at 2-hour intervals) for three key target variables:
    1.  **Temperature** (°C)
    2.  **Precipitation** (%)
    3.  **Air Quality Index (AQI)**

