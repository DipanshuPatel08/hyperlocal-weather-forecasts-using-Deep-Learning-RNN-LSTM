// --- Required Libraries ---
// 1. ArduinoJson: For efficient JSON serialization.
#include <ArduinoJson.h>

// 2. DHT sensor library: For DHT11 temperature and humidity sensor.
// 3. Adafruit Unified Sensor: A dependency for the DHT library.
#include <DHT.h>
#include <DHT_U.h>

// 4. Adafruit BMP280 Library: For BMP280 pressure and temperature sensor.
// 5. Wire: Built-in library for I2C communication (used by BMP280).
#include <Wire.h>
#include <Adafruit_BMP280.h>

// --- Sensor Pin Definitions ---
#define DHTPIN 2          // DHT11 data pin connected to Arduino Digital Pin 2
#define DHTTYPE DHT11     // Type of DHT sensor (DHT11 or DHT22)

#define RAIN_ANALOG_PIN A0 // Rain sensor analog output to Arduino Analog Pin A0
#define LDR_PIN A1        // LDR analog output to Arduino Analog Pin A1

#define MQ135_PIN A2      // MQ-135 analog output to Arduino Analog Pin A2
#define MQ9_PIN A3        // MQ-9 analog output to Arduino Analog Pin A3

// --- Sensor Objects ---
DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP280 bmp; // BMP280 uses I2C (SDA to A4, SCL to A5 on Uno)

// --- MQ Sensor Calibration Parameters (PLACEHOLDERS - CRITICAL FOR ACCURACY) ---
// R0 is the sensor's resistance in clean air.
const float R0_MQ135 = 33.0; // Placeholder: Example R0 for MQ-135 in clean air (kOhms)
const float R0_MQ9 = 10.0;   // Placeholder: Example R0 for MQ-9 in clean air (kOhms)
const float RL_MQ_SENSORS = 10.0; // Load resistor (RL) used in your MQ sensor circuit (kOhms)

// --- Helper Functions for MQ Sensor Calculations (PLACEHOLDERS - REPLACE WITH DATASHEET FORMULAS) ---
// These functions convert raw analog readings to gas concentrations (PPM).

// Function to calculate Rs (Sensor Resistance) from analog reading
float getRs(int analogValue, float Vcc = 5.0, float Rl = RL_MQ_SENSORS) {
  float Vout = analogValue * (Vcc / 1023.0); // Convert analog reading to voltage
  if (Vout == 0) return -1.0; // Avoid division by zero, indicate error
  float Rs = ((Vcc / Vout) - 1) * Rl; // Calculate sensor resistance (Rs)
  return Rs;
}

// Function to calculate gas concentration for MQ-135 (CO2, NH3, Alcohol)
float calculateMQ135Gas(int analogValue, const char* gasType) {
  float Rs = getRs(analogValue);
  if (Rs < 0) return -1.0; // Error in Rs calculation
  float ratio = Rs / R0_MQ135;

  if (strcmp(gasType, "CO2") == 0) {
    return map(ratio * 100, 50, 100, 5000, 400); 
  } else if (strcmp(gasType, "NH3") == 0) {
    return map(ratio * 100, 50, 100, 500, 0); 
  } else if (strcmp(gasType, "Alcohol") == 0) {
    return map(ratio * 100, 50, 100, 500, 0);
  }
  return -1.0; // Indicate unknown gas type or error
}

// Function to calculate gas concentration for MQ-9 (CO, LPG, CH4)
float calculateMQ9Gas(int analogValue, const char* gasType) {
  float Rs = getRs(analogValue);
  if (Rs < 0) return -1.0; // Error in Rs calculation
  float ratio = Rs / R0_MQ9;

  if (strcmp(gasType, "CO") == 0) {
    return map(ratio * 100, 50, 100, 1000, 0); 
  } else if (strcmp(gasType, "LPG") == 0) {
    return map(ratio * 100, 50, 100, 10000, 0);
  } else if (strcmp(gasType, "CH4") == 0) {
    return map(ratio * 100, 50, 100, 10000, 0); 
  }
  return -1.0; // Indicate unknown gas type or error
}

// AQI (Air Quality Index) Calculation 
float calculateAQI(float co2, float nh3, float co_val) {

  float aqi_score = 0;
  int valid_contributions = 0;

  if (co2 != -999.0) { aqi_score += (co2 / 2000.0) * 50.0; valid_contributions++; }
  if (nh3 != -999.0) { aqi_score += (nh3 / 5.0) * 30.0; valid_contributions++; }
  if (co_val != -999.0) { aqi_score += (co_val / 50.0) * 20.0; valid_contributions++; }

  if (valid_contributions == 0) return -1.0; // Indicate error if no valid contributions

  // Normalize by number of valid contributions, then constrain to typical AQI range
  return constrain(aqi_score, 0.0, 300.0);
}


void setup() {
  Serial.begin(9600); // Initialize serial communication at 9600 baud rate

  // Initialize DHT sensor
  dht.begin();
  Serial.println("DHT sensor initialized.");

  // Initialize BMP280 sensor
  // BMP280 I2C address is typically 0x76 or 0x77.
  // We'll try 0x76 first, if that fails, the sensor will return 0.0 for readings.
  if (!bmp.begin(0x76)) { 
    Serial.println(F("Could not find a valid BMP280 sensor, check wiring or I2C address (0x76 or 0x77)!"));
    // If BMP fails, subsequent readings will be 0.0, which we handle as -999.0
  } else {
    Serial.println("BMP280 sensor initialized.");
    // Optional: Configure BMP280 oversampling and filter settings for better accuracy
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,     // Operating Mode
                    Adafruit_BMP280::SAMPLING_X2,     // Temp. oversampling
                    Adafruit_BMP280::SAMPLING_X16,    // Pressure oversampling
                    Adafruit_BMP280::FILTER_X16,      // IIR Filter
                    Adafruit_BMP280::STANDBY_MS_500); // Standby time
  }

  // Seed the random number generator (for any random elements if you add them later, e.g., for testing)
  randomSeed(analogRead(A5)); // Use an unconnected analog pin for better randomness
}

void loop() {
  // --- Read Raw Sensor Values ---
  // DHT11
  float h = dht.readHumidity();
  float t_dht = dht.readTemperature(); // Reads in Celsius

  // BMP280
  float t_bmp = bmp.readTemperature(); // Reads in Celsius
  float p_pa = bmp.readPressure();     // Reads in Pascals

  // Rain Sensor (Analog)
  int rain_analog_raw = analogRead(RAIN_ANALOG_PIN);

  // LDR (Light Dependent Resistor)
  int ldr_analog_raw = analogRead(LDR_PIN);

  // MQ-135 (Air Quality Sensor)
  int mq135_analog_raw = analogRead(MQ135_PIN);

  // MQ-9 (CO and Flammable Gas Sensor)
  int mq9_analog_raw = analogRead(MQ9_PIN);

  // --- Perform Calculations & Error Handling for Desired Features ---

  // DHT11 Data Validation
  if (isnan(h) || isnan(t_dht)) {
    Serial.println(F("Failed to read from DHT sensor!"));
    h = -999.0; // Use -999.0 to indicate an invalid reading to the Python script
    t_dht = -999.0;
  }

  // BMP280 Data Validation
  // BMP returns 0.0 if sensor is not found or read fails
  if (t_bmp == 0.0 && p_pa == 0.0) {
    Serial.println(F("Failed to read from BMP280 sensor!"));
    t_bmp = -999.0;
    p_pa = -999.0;
  }
  float p_hpa = p_pa / 100.0; // Convert Pa to hPa (millibars)

  // Combined Temperature (average of DHT and BMP, handling errors)
  float temp; // Renamed to 'temp' as requested
  int valid_temp_readings = 0;

  if (t_dht != -999.0) {
    temp += t_dht;
    valid_temp_readings++;
  }

  if (t_bmp != -999.0) {
    temp += t_bmp;
    valid_temp_readings++;
  }

  if (valid_temp_readings > 0) {
    temp /= valid_temp_readings;
  } else {
    temp = -999.0; // Both failed, set to error value
  }


  // Rain Detected (boolean)
  // Adjust this threshold based on your rain sensor's behavior (wet vs. dry readings)
  bool rain_detected_val = (rain_analog_raw < 500); // Example: below 500 means wet

  // Light Intensity (mapping analog to a 0-100 scale)
  // Adjust mapping based on your LDR wiring (higher analog = brighter or darker?)
  float light_intensity_scaled = map(ldr_analog_raw, 0, 1023, 0, 100); // 0% (dark) to 100% (bright)

  // MQ-135 derived values (using placeholder calibration functions)
  float nh3_val = calculateMQ135Gas(mq135_analog_raw, "NH3");
  float co2_val = calculateMQ135Gas(mq135_analog_raw, "CO2");
  float alcohol_val = calculateMQ135Gas(mq135_analog_raw, "Alcohol");

  // MQ-9 derived values (using placeholder calibration functions)
  float co_val_from_mq9 = calculateMQ9Gas(mq9_analog_raw, "CO"); // Renamed for clarity
  float lpg_val = calculateMQ9Gas(mq9_analog_raw, "LPG");
  float ch4_val = calculateMQ9Gas(mq9_analog_raw, "CH4");
  
  // AQI Calculation (using placeholder function)
  float aqi_val = calculateAQI(co2_val, nh3_val, co_val_from_mq9); // Use the renamed variable

  // --- Create JSON Document ---
  // StaticJsonDocument is allocated on the stack.
  // 300 bytes should be sufficient for this data structure with all fields.
  StaticJsonDocument<300> doc; 

  // Add key-value pairs to the JSON document in the specified order
  // Ensure the keys match what your Python script expects!
  doc["temp"] = temp; 
  doc["humidity"] = h;
  doc["pressure"] = p_hpa;
  doc["rain_analog"] = rain_analog_raw;
  doc["rain_detected"] = rain_detected_val;
  doc["light_intensity"] = light_intensity_scaled; 
  doc["nh3"] = nh3_val;
  doc["co"] = co_val_from_mq9; 
  doc["co2"] = co2_val;
  doc["alcohol"] = alcohol_val;
  doc["lpg"] = lpg_val;
  doc["ch4"] = ch4_val;
  doc["aqi"] = aqi_val;

  // --- Serialize JSON to Serial Port ---
  // This sends the JSON string over USB to your computer
  serializeJson(doc, Serial);
  Serial.println(); // Add a newline character so Python's readline() knows when a message ends

  delay(1000); // Send data every 1 seconds (adjust as needed)
}
