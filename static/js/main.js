// Establish connection to the server via Socket.IO
const socket = io();

// --- SCREENSHOT MODE ---
// Set this to 'true' to show fake data for screenshots.
// Set back to 'false' to use live data from the Arduino.
const screenshotMode = false;

// --- GLOBAL CHART VARIABLES ---
let forecastChart;
let fullForecastData = {}; // Will store { labels: [], temps: [], precipitations: [], aqis: [] }
let currentChartType = 'temp'; // 'temp', 'precipitation', or 'aqi'

// --- SVG Icons ---
const icons = {
    sunny: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-yellow-400"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.106a.75.75 0 010 1.06l-1.591 1.59a.75.75 0 11-1.06-1.06l1.59-1.591a.75.75 0 011.06 0zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5h2.25a.75.75 0 01.75.75zM17.836 17.894a.75.75 0 011.06 0l1.591 1.59a.75.75 0 11-1.06 1.06l-1.59-1.591a.75.75 0 010-1.06zM12 21.75a.75.75 0 01-.75-.75v-2.25a.75.75 0 011.5 0v2.25a.75.75 0 01-.75.75zM5.106 17.836a.75.75 0 010-1.06l1.591-1.59a.75.75 0 011.06 1.06l-1.59 1.591a.75.75 0 01-1.06 0zM3 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H3.75A.75.75 0 013 12zM6.164 7.164a.75.75 0 01-1.06 0L3.51 5.574a.75.75 0 111.06-1.06l1.591 1.59a.75.75 0 010 1.06z"></path></svg>`,
    cloudy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-gray-400"><path fill-rule="evenodd" d="M11.25 1.5A5.25 5.25 0 006 6.75c0 2.654 1.835 4.87 4.375 5.585A.75.75 0 0111.25 13.5v-1.5a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v1.5a.75.75 0 01-.825.748A5.25 5.25 0 0016.5 6.75 5.25 5.25 0 0011.25 1.5zM3 14.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm0 3.75a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clip-rule="evenodd"></path></svg>`,
    rainy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-blue-400"><path d="M5.22 14.25a.75.75 0 000 1.06l.53.53a.75.75 0 001.06 0l1.9-1.9-1.59-1.59-1.9 1.9zM18 9.75a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zM14.25 18a.75.75 0 001.06 0l.53-.53a.75.75 0 000-1.06l-1.9-1.9-1.59 1.59 1.9 1.9z"></path><path fill-rule="evenodd" d="M15 2.25a.75.75 0 01.75.75v.755a4.5 4.5 0 013.235 2.122 3 3 0 012.965 2.568.75.75 0 01-1.485.21-1.5 1.5 0 00-1.482-1.285 3 3 0 00-2.965 2.568 3 3 0 01-2.965 2.569A3 3 0 016 12.75a3 3 0 01-2.965-2.569 3 3 0 00-2.965-2.568 1.5 1.5 0 00-1.482 1.285.75.75 0 01-1.485-.21A3 3 0 016 6.372a4.5 4.5 0 013.235-2.122V3a.75.75 0 01.75-.75h4.5zM9.75 18a.75.75 0 01.75.75v.25a.75.75 0 01-1.5 0v-.25a.75.75 0 01.75-.75zM12 15.75a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75z" clip-rule="evenodd"></path></svg>`,
    partly_cloudy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-gray-300"><path d="M12.91 1.25a.75.75 0 00-1.82 0l-5.625 2.5a.75.75 0 00-.44 1.002l2.5 5.625a.75.75 0 001.002.44l5.625-2.5a.75.75 0 00.44-1.002l-2.5-5.625zM11.25 5.16l1.72 3.87-3.87-1.72 2.15-2.15z"></path><path d="M20.25 10.5a.75.75 0 00-1.5 0v.636a4.503 4.503 0 00-1.875-.965l-.348-.154a.75.75 0 00-.826.33L14.4 12.6a.75.75 0 00.33.826l.154.348a4.503 4.503 0 00.965 1.875v.636a.75.75 0 001.5 0v-.636a4.503 4.503 0 00.965-1.875l.154-.348a.75.75 0 00-.33-.826l-.348-.154a4.503 4.503 0 00-1.875-.965v-.636z"></path><path d="M13.5 15.75a.75.75 0 00-1.5 0v.636a4.503 4.503 0 00-1.875-.965l-.348-.154a.75.75 0 00-.826.33L7.65 17.85a.75.75 0 00.33.826l.348.154a4.503 4.503 0 001.875.965v.636a.75.75 0 001.5 0v-.636a4.503 4.503 0 001.875-.965l.348-.154a.75.75 0 00.826-.33l1.252-2.25a.75.75 0 00-.33-.826l-.348-.154a4.503 4.503 0 00-1.875-.965v-.636z"></path></svg>`,
    humidity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-cyan-400"><path fill-rule="evenodd" d="M12.54 2.22a.75.75 0 00-1.08 0l-6.5 7.5a.75.75 0 00.54 1.28h13a.75.75 0 00.54-1.28l-6.5-7.5zM2.25 15a.75.75 0 000 1.5h19.5a.75.75 0 000-1.5H2.25z" clip-rule="evenodd"></path></svg>`,
    pressure: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-purple-400"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h6a.75.75 0 000-1.5h-5.25V6z" clip-rule="evenodd"></path></svg>`,
};

const defaultData = {
    temp: 0, humidity: 0, pressure: 0, aqi: 0, light_intensity: 0,
    rain_detected: false, co: 0, nh3: 0, co2: 0, alcohol: 0, lpg: 0, ch4: 0,
};

// --- Helper Functions ---
function updateClock(date = null) {
    const now = date ? new Date(date) : new Date();
    document.getElementById('time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getWeatherIconAndCondition(data) {
    const isRain = data.rain_detected;
    const light = data.light_intensity;

    if (isRain) return { icon: icons.rainy, condition: "Rainy" };
    if (light < 50) return { icon: icons.cloudy, condition: "Cloudy" };
    if (light < 400) return { icon: icons.partly_cloudy, condition: "Partly Cloudy" };
    return { icon: icons.sunny, condition: "Sunny" };
}

function updateUIData(data) {
    const { icon, condition } = getWeatherIconAndCondition(data);
    
    document.getElementById('current-temp').textContent = `${data.temp.toFixed(1)}°`;
    document.getElementById('weather-condition').textContent = condition;
    document.getElementById('main-weather-icon').innerHTML = icon;
    document.getElementById('current-humidity').textContent = `${data.humidity.toFixed(1)}%`;
    document.getElementById('current-pressure').textContent = data.pressure.toFixed(0);
    document.getElementById('current-aqi').textContent = data.aqi.toFixed(0);
    document.getElementById('current-co').textContent = data.co.toFixed(1);
    document.getElementById('current-nh3').textContent = data.nh3.toFixed(1);
    document.getElementById('current-co2').textContent = data.co2.toFixed(0);
    document.getElementById('current-alcohol').textContent = data.alcohol.toFixed(2);
    document.getElementById('current-lpg').textContent = data.lpg.toFixed(1);
    document.getElementById('current-ch4').textContent = data.ch4.toFixed(1);
}

function setDefaultValues() {
    updateClock('2000-01-01T00:00:00');
    updateUIData(defaultData);
    document.getElementById('forecast-container').innerHTML = `
        <div id="forecast-placeholder" class="w-full h-full flex items-center justify-center text-center text-gray-400">
            <p>Waiting for enough data to generate forecast...</p>
        </div>`;
}

// --- Chart Functions ---
function initializeChart() {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Forecast',
                data: [],
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointHoverRadius: 7,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    grid: { color: 'rgba(100, 116, 139, 0.2)' },
                    ticks: { color: '#94a3b8', font: { weight: '500' } }
                },
                y: {
                    grid: { color: 'rgba(100, 116, 139, 0.2)' },
                    ticks: { color: '#94a3b8', font: { weight: '500' } },
                    beginAtZero: false,
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#1e293b',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                let unit = '';
                                if (currentChartType === 'temp') unit = '°C';
                                if (currentChartType === 'precipitation') unit = '%';
                                label += `${context.parsed.y.toFixed(1)} ${unit}`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (!forecastChart || !fullForecastData.labels) return;

    const chartConfig = {
        temp: {
            data: fullForecastData.temps,
            label: 'Temperature',
            borderColor: '#f87171',
            gradientColor: 'rgba(248, 113, 113, 0.5)',
            min: -10,
            max: 50
        },
        precipitation: {
            data: fullForecastData.precipitations,
            label: 'Precipitation',
            borderColor: '#60a5fa',
            gradientColor: 'rgba(96, 165, 250, 0.5)',
            min: 0,
            max: 100
        },
        aqi: {
            data: fullForecastData.aqis,
            label: 'AQI',
            borderColor: '#facc15',
            gradientColor: 'rgba(250, 204, 21, 0.5)',
            min: 0,
            max: 500
        }
    };

    const config = chartConfig[currentChartType];
    const ctx = document.getElementById('forecastChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, config.gradientColor);
    gradient.addColorStop(1, 'rgba(30, 41, 59, 0)');

    forecastChart.data.labels = fullForecastData.labels;
    forecastChart.data.datasets[0].data = config.data;
    forecastChart.data.datasets[0].label = config.label;
    forecastChart.data.datasets[0].borderColor = config.borderColor;
    forecastChart.data.datasets[0].backgroundColor = gradient;
    forecastChart.data.datasets[0].pointBorderColor = config.borderColor;
    
    forecastChart.options.scales.y.min = config.min;
    forecastChart.options.scales.y.max = config.max;
    
    forecastChart.update();
}

// --- SocketIO Event Handlers ---
socket.on('connect', () => console.log('Connected to server websocket.'));

socket.on('status', (data) => {
    const statusEl = document.getElementById('status');
    statusEl.textContent = data.msg;
    if (data.msg.includes('Connected') || data.msg.includes('active')) {
        statusEl.className = 'text-sm status-connected';
        updateClock(); // Start live clock
        setInterval(updateClock, 1000);
    } else if (data.msg.includes('not detected')) {
        statusEl.className = 'text-sm status-error';
        setDefaultValues();
    } else {
        statusEl.className = 'text-sm status-predicting';
    }
});

socket.on('current_data', (data) => {
    updateUIData(data);
});

socket.on('new_forecast', (data) => {
    document.getElementById('forecast-placeholder').style.display = 'none';
    
    fullForecastData = {
        labels: data.forecast.map(d => d.time),
        temps: data.forecast.map(d => d.temp),
        precipitations: data.forecast.map(d => d.precipitation),
        aqis: data.forecast.map(d => d.aqi)
    };
    
    updateChart();
});

// --- Initial Page Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    
    document.getElementById('humidity-icon').innerHTML = icons.humidity;
    document.getElementById('pressure-icon').innerHTML = icons.pressure;

    // Set default values for live mode until sensor connects
    setDefaultValues();

    // Add event listeners for chart toggles
    const toggleButtons = document.querySelectorAll('.chart-toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentChartType = button.dataset.type;
            updateChart();
        });
    });
});
