import random
import json

# Function to generate realistic sensor data

def generate_sensor_data():
    data = {
        'temperature': round(random.uniform(15.0, 35.0), 2),  # in Celsius
        'humidity': round(random.uniform(30.0, 90.0), 2),     # in percentage
        'pressure': round(random.uniform(950.0, 1050.0), 2),  # in hPa
        'rain_analog': random.randint(0, 1023),               # analog value
        'rain_detected': random.choice([True, False]),       # boolean value
        'light_intensity': random.randint(0, 1023),          # analog value
        'nh3': round(random.uniform(0.0, 0.5), 2),            # in ppm
        'co': round(random.uniform(0.0, 0.5), 2),             # in ppm
        'co2': round(random.uniform(300.0, 500.0), 2),        # in ppm
        'alcohol': round(random.uniform(0.0, 0.5), 2),        # in ppm
        'lpg': round(random.uniform(0.0, 0.5), 2),            # in ppm
        'ch4': round(random.uniform(0.0, 0.5), 2),            # in ppm
        'aqi': random.randint(0, 500)                         # Air Quality Index
    }
    return data

# Main function to print the generated data

def main():
    sensor_data = generate_sensor_data()
    print(json.dumps(sensor_data, indent=4))

if __name__ == '__main__':
    main()