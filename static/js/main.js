// Weather Dashboard JavaScript
class WeatherDashboard {
    constructor() {
        this.socket = io();
        this.forecastChart = null;
        this.currentChartType = 'temp';
        this.forecastData = [];
        this.currentData = {};
        
        this.initializeSocket();
        this.initializeUI();
        this.initializeChart();
        this.startClock();
        this.initializeLucideIcons();
    }

    initializeLucideIcons() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    initializeSocket() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus('connected', 'Connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('error', 'Disconnected');
        });

        this.socket.on('current_data', (data) => {
            this.currentData = data;
            this.updateCurrentData(data);
        });

        this.socket.on('new_forecast', (data) => {
            this.forecastData = data.forecast || [];
            this.updateForecastChart();
        });

        this.socket.on('status', (data) => {
            this.updateStatus(data.msg);
        });
    }

    initializeUI() {
        // Chart toggle buttons
        document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.currentTarget.dataset.type;
                this.switchChart(chartType);
            });
        });

        // Add hover effects and animations
        this.addInteractiveEffects();
    }

    addInteractiveEffects() {
        // Add smooth counter animations for metrics
        const metrics = document.querySelectorAll('.metric-card');
        metrics.forEach(metric => {
            metric.addEventListener('mouseenter', () => {
                metric.style.transform = 'translateY(-2px) scale(1.02)';
            });
            metric.addEventListener('mouseleave', () => {
                metric.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    updateConnectionStatus(status, text) {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('connection-text');
        
        // Remove all status classes
        statusDot.classList.remove('connected', 'predicting', 'error');
        
        // Add new status class
        statusDot.classList.add(status);
        statusText.textContent = text;

        // Add pulse animation for connecting state
        if (status === 'error') {
            statusDot.classList.add('animate-pulse');
        } else {
            statusDot.classList.remove('animate-pulse');
        }
    }

    updateCurrentData(data) {
        // Animate value changes
        this.animateValueUpdate('current-temp', `${Math.round(data.temp)}°`);
        this.animateValueUpdate('current-humidity', `${Math.round(data.humidity)}%`);
        this.animateValueUpdate('current-pressure', `${Math.round(data.pressure)}`);
        this.animateValueUpdate('current-aqi', Math.round(data.aqi));
        this.animateValueUpdate('current-co', data.co.toFixed(1));
        this.animateValueUpdate('current-nh3', data.nh3.toFixed(1));
        this.animateValueUpdate('current-co2', data.co2.toFixed(1));
        this.animateValueUpdate('current-alcohol', data.alcohol.toFixed(1));
        this.animateValueUpdate('current-lpg', Math.round(data.lpg));
        this.animateValueUpdate('current-ch4', Math.round(data.ch4));
        this.animateValueUpdate('current-light', Math.round(data.light_intensity));

        // Update weather condition
        this.updateWeatherCondition(data);
        
        // Update weather icon based on conditions
        this.updateWeatherIcon(data);
    }

    animateValueUpdate(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentValue = element.textContent;
        if (currentValue !== newValue.toString()) {
            // Add glow effect for updated values
            element.classList.add('animate-glow');
            element.textContent = newValue;
            
            // Remove glow effect after animation
            setTimeout(() => {
                element.classList.remove('animate-glow');
            }, 2000);
        }
    }

    updateWeatherCondition(data) {
        const conditionElement = document.getElementById('weather-condition');
        let condition = 'Clear';
        
        if (data.rain_detected) {
            condition = 'Rainy';
        } else if (data.humidity > 80) {
            condition = 'Humid';
        } else if (data.humidity < 30) {
            condition = 'Dry';
        } else if (data.temp > 30) {
            condition = 'Hot';
        } else if (data.temp < 15) {
            condition = 'Cool';
        }
        
        conditionElement.textContent = condition;
    }

    updateWeatherIcon(data) {
        const iconElement = document.getElementById('main-weather-icon');
        let iconName = 'sun';
        
        if (data.rain_detected) {
            iconName = 'cloud-rain';
        } else if (data.humidity > 80) {
            iconName = 'cloud-drizzle';
        } else if (data.temp > 30) {
            iconName = 'sun';
        } else if (data.temp < 15) {
            iconName = 'cloud-snow';
        } else {
            iconName = 'cloud-sun';
        }
        
        iconElement.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-2xl blur-xl"></div>
            <div class="relative w-full h-full flex items-center justify-center">
                <i data-lucide="${iconName}" class="w-16 h-16 text-accent animate-bounce-slow"></i>
            </div>
        `;
        
        // Re-initialize icons for the new icon
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        
        if (message.includes('Connected')) {
            statusElement.className = 'text-sm font-medium status-connected';
            this.updateConnectionStatus('connected', 'Live Data');
        } else if (message.includes('prediction')) {
            statusElement.className = 'text-sm font-medium status-predicting';
            this.updateConnectionStatus('predicting', 'Forecasting');
        } else if (message.includes('error') || message.includes('not detected')) {
            statusElement.className = 'text-sm font-medium status-error';
            this.updateConnectionStatus('error', 'Sensor Error');
        }
    }

    initializeChart() {
        const ctx = document.getElementById('forecastChart');
        if (!ctx) return;

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');

        this.forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#4f46e5',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#e2e8f0',
                        borderColor: '#6366f1',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return `Time: ${context[0].label}`;
                            },
                            label: function(context) {
                                const type = document.querySelector('.chart-toggle-btn.active').dataset.type;
                                const units = type === 'temp' ? '°C' : type === 'precipitation' ? '%' : '';
                                return `${context.dataset.label}: ${context.parsed.y}${units}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(71, 85, 105, 0.3)',
                            drawBorder: false,
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 12,
                                weight: 500
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(71, 85, 105, 0.3)',
                            drawBorder: false,
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 12,
                                weight: 500
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutCubic'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    switchChart(type) {
        // Update button states
        document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        this.currentChartType = type;
        this.updateForecastChart();
    }

    updateForecastChart() {
        if (!this.forecastChart || this.forecastData.length === 0) return;

        const labels = this.forecastData.map(item => item.time);
        let data, label, color, bgColor;

        switch (this.currentChartType) {
            case 'temp':
                data = this.forecastData.map(item => item.temp);
                label = 'Temperature (°C)';
                color = '#6366f1';
                bgColor = 'rgba(99, 102, 241, 0.1)';
                break;
            case 'precipitation':
                data = this.forecastData.map(item => item.precipitation);
                label = 'Precipitation (%)';
                color = '#06b6d4';
                bgColor = 'rgba(6, 182, 212, 0.1)';
                break;
            case 'aqi':
                data = this.forecastData.map(item => item.aqi);
                label = 'Air Quality Index';
                color = '#10b981';
                bgColor = 'rgba(16, 185, 129, 0.1)';
                break;
        }

        // Create gradient
        const ctx = this.forecastChart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, bgColor.replace('0.1', '0.3'));
        gradient.addColorStop(1, bgColor.replace('0.1', '0.05'));

        this.forecastChart.data.labels = labels;
        this.forecastChart.data.datasets[0] = {
            ...this.forecastChart.data.datasets[0],
            label: label,
            data: data,
            borderColor: color,
            backgroundColor: gradient,
            pointBackgroundColor: color,
            pointHoverBackgroundColor: color,
        };

        // Show chart and hide placeholder
        document.getElementById('forecastChart').style.display = 'block';
        document.getElementById('forecast-placeholder').style.display = 'none';

        this.forecastChart.update('active');
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
            const dateString = now.toLocaleDateString('en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            
            document.getElementById('time').textContent = timeString;
            document.getElementById('date').textContent = dateString;
        };

        updateTime();
        setInterval(updateTime, 1000);
    }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboard();
});
