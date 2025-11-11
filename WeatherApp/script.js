// Weather App JavaScript - Modern ES6+ with Async/Await and Error Handling

class WeatherApp {
    constructor() {
        // Your OpenWeatherMap API configuration
        // ⚠️ IMPORTANT: Replace 'YOUR_ACTUAL_API_KEY_HERE' with your real API key
        // The key name is "weather" but you need the actual key string from OpenWeatherMap
        this.apiKey = 'e441dfade9e6d542e26f550fccc7c97c'; 
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.geocodingUrl = 'https://api.openweathermap.org/geo/1.0';
        
        // App state
        this.currentUnits = 'metric';
        this.currentTheme = 'light';
        this.savedCities = [];
        this.currentWeatherData = null;
        
        // DOM elements
        this.elements = this.initializeElements();
        
        // Initialize the app
        this.init();
    }

    initializeElements() {
        return {
            cityInput: document.getElementById('cityInput'),
            searchBtn: document.getElementById('searchBtn'),
            locationBtn: document.getElementById('locationBtn'),
            suggestions: document.getElementById('suggestions'),
            currentWeather: document.getElementById('currentWeather'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            retryBtn: document.getElementById('retryBtn'),
            
            // Current weather elements
            cityName: document.getElementById('cityName'),
            weatherDescription: document.getElementById('weatherDescription'),
            currentTemp: document.getElementById('currentTemp'),
            weatherIcon: document.getElementById('weatherIcon'),
            feelsLike: document.getElementById('feelsLike'),
            humidity: document.getElementById('humidity'),
            windSpeed: document.getElementById('windSpeed'),
            visibility: document.getElementById('visibility'),
            pressure: document.getElementById('pressure'),
            uvIndex: document.getElementById('uvIndex'),
            
            // Forecast elements
            forecastContainer: document.getElementById('forecastContainer'),
            forecastCards: document.getElementById('forecastCards'),
            
            // Saved cities elements
            savedCitiesList: document.getElementById('savedCitiesList'),
            clearCitiesBtn: document.getElementById('clearCitiesBtn'),
            
            // Settings elements
            settingsBtn: document.getElementById('settingsBtn'),
            settingsMenu: document.getElementById('settingsMenu'),
            unitToggle: document.getElementById('unitToggle'),
            themeToggle: document.getElementById('themeToggle')
        };
    }

    init() {
        this.loadSettings();
        this.loadSavedCities();
        this.bindEvents();
        this.updateSavedCitiesDisplay();
        
        // Load weather for last searched city if available
        const lastCity = localStorage.getItem('lastSearchedCity');
        if (lastCity) {
            this.searchWeather(lastCity);
        }
    }

    bindEvents() {
        // Search functionality
        this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
        this.elements.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        // Real-time search suggestions
        this.elements.cityInput.addEventListener('input', (e) => {
            this.debounce(() => this.handleSearchSuggestions(e.target.value), 300)();
        });
        
        // Location-based weather
        this.elements.locationBtn.addEventListener('click', () => this.getCurrentLocationWeather());
        
        // Settings
        this.elements.settingsBtn.addEventListener('click', () => this.toggleSettings());
        this.elements.unitToggle.addEventListener('change', (e) => this.changeUnits(e.target.value));
        this.elements.themeToggle.addEventListener('change', (e) => this.changeTheme(e.target.value));
        
        // Error handling
        this.elements.retryBtn.addEventListener('click', () => this.hideError());
        
        // Clear saved cities
        this.elements.clearCitiesBtn.addEventListener('click', () => this.clearAllCities());
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.cityInput.contains(e.target) && !this.elements.suggestions.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // API Methods
    async fetchWeatherData(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(this.getErrorMessage(response.status, errorData));
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    async searchWeather(cityName) {
        if (!cityName.trim()) {
            this.showError('Please enter a city name.');
            return;
        }

        this.showLoading();
        
        try {
            // Fetch current weather
            const weatherUrl = `${this.baseUrl}/weather?q=${encodeURIComponent(cityName)}&appid=${this.apiKey}&units=${this.currentUnits}`;
            const weatherData = await this.fetchWeatherData(weatherUrl);
            
            // Fetch 5-day forecast
            const forecastUrl = `${this.baseUrl}/forecast?q=${encodeURIComponent(cityName)}&appid=${this.apiKey}&units=${this.currentUnits}`;
            const forecastData = await this.fetchWeatherData(forecastUrl);
            
            // Update UI
            this.currentWeatherData = weatherData;
            this.updateCurrentWeather(weatherData);
            this.updateForecast(forecastData);
            
            // Save to localStorage
            localStorage.setItem('lastSearchedCity', cityName);
            
            // Add to saved cities if not already there
            this.addToSavedCities(weatherData);
            
            this.hideLoading();
            this.hideError();
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
            console.error('Weather search error:', error);
        }
    }

    async getCurrentLocationWeather() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser.');
            return;
        }

        this.showLoading();

        try {
            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;
            
            const weatherUrl = `${this.baseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=${this.currentUnits}`;
            const weatherData = await this.fetchWeatherData(weatherUrl);
            
            const forecastUrl = `${this.baseUrl}/forecast?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=${this.currentUnits}`;
            const forecastData = await this.fetchWeatherData(forecastUrl);
            
            this.currentWeatherData = weatherData;
            this.updateCurrentWeather(weatherData);
            this.updateForecast(forecastData);
            
            this.elements.cityInput.value = weatherData.name;
            
            this.addToSavedCities(weatherData);
            
            this.hideLoading();
            this.hideError();
            
        } catch (error) {
            this.hideLoading();
            if (error.code === error.PERMISSION_DENIED) {
                this.showError('Location access denied. Please enter a city name manually.');
            } else if (error.code === error.TIMEOUT) {
                this.showError('Location request timed out. Please try again.');
            } else {
                this.showError('Unable to get your location. Please enter a city name manually.');
            }
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: true
            });
        });
    }

    async handleSearchSuggestions(query) {
        if (query.length < 3) {
            this.hideSuggestions();
            return;
        }

        try {
            const url = `${this.geocodingUrl}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.apiKey}`;
            const suggestions = await this.fetchWeatherData(url);
            this.displaySuggestions(suggestions);
        } catch (error) {
            this.hideSuggestions();
        }
    }

    // UI Update Methods
    updateCurrentWeather(data) {
        const {
            name,
            sys: { country },
            weather,
            main: { temp, feels_like, humidity, pressure },
            wind: { speed },
            visibility
        } = data;

        this.elements.cityName.textContent = `${name}, ${country}`;
        this.elements.weatherDescription.textContent = weather[0].description;
        this.elements.currentTemp.textContent = Math.round(temp);
        
        // Weather icon
        const iconCode = weather[0].icon;
        this.elements.weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
        this.elements.weatherIcon.alt = weather[0].description;
        
        // Weather details
        this.elements.feelsLike.textContent = `${Math.round(feels_like)}°${this.getUnitSymbol()}`;
        this.elements.humidity.textContent = `${humidity}%`;
        this.elements.windSpeed.textContent = `${speed} ${this.getWindUnit()}`;
        this.elements.visibility.textContent = `${(visibility / 1000).toFixed(1)} km`;
        this.elements.pressure.textContent = `${pressure} hPa`;
        this.elements.uvIndex.textContent = 'N/A'; // UV Index not available in free tier
        
        // Show current weather section
        this.elements.currentWeather.classList.remove('hidden');
        this.elements.currentWeather.classList.add('fade-in');
    }

    updateForecast(data) {
        const dailyForecasts = this.processForecastData(data.list);
        
        this.elements.forecastCards.innerHTML = '';
        
        dailyForecasts.forEach(forecast => {
            const card = this.createForecastCard(forecast);
            this.elements.forecastCards.appendChild(card);
        });
        
        this.elements.forecastContainer.classList.remove('hidden');
        this.elements.forecastContainer.classList.add('fade-in');
    }

    processForecastData(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toDateString();
            
            if (!dailyData[day]) {
                dailyData[day] = {
                    date: date,
                    temps: [],
                    weather: item.weather[0],
                    descriptions: []
                };
            }
            
            dailyData[day].temps.push(item.main.temp);
            dailyData[day].descriptions.push(item.weather[0].description);
        });
        
        return Object.values(dailyData).slice(0, 5).map(day => ({
            date: day.date,
            high: Math.round(Math.max(...day.temps)),
            low: Math.round(Math.min(...day.temps)),
            weather: day.weather,
            description: day.descriptions[0]
        }));
    }

    createForecastCard(forecast) {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        
        const dayName = forecast.date.toLocaleDateString('en-US', { weekday: 'short' });
        const isToday = forecast.date.toDateString() === new Date().toDateString();
        
        card.innerHTML = `
            <div class="forecast-day">${isToday ? 'Today' : dayName}</div>
            <img src="https://openweathermap.org/img/wn/${forecast.weather.icon}@2x.png" 
                 alt="${forecast.description}" class="forecast-icon">
            <div class="forecast-temps">
                <span class="forecast-high">${forecast.high}°</span>
                <span class="forecast-low">${forecast.low}°</span>
            </div>
            <div class="forecast-desc">${forecast.description}</div>
        `;
        
        return card;
    }

    displaySuggestions(suggestions) {
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.elements.suggestions.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = `${suggestion.name}, ${suggestion.state || ''} ${suggestion.country}`.trim();
            
            item.addEventListener('click', () => {
                this.elements.cityInput.value = suggestion.name;
                this.hideSuggestions();
                this.searchWeather(suggestion.name);
            });
            
            this.elements.suggestions.appendChild(item);
        });
        
        this.elements.suggestions.classList.remove('hidden');
    }

    hideSuggestions() {
        this.elements.suggestions.classList.add('hidden');
    }

    // Saved Cities Management
    addToSavedCities(weatherData) {
        const cityKey = `${weatherData.name}, ${weatherData.sys.country}`;
        
        // Check if city already exists
        const existingIndex = this.savedCities.findIndex(city => city.key === cityKey);
        
        const cityData = {
            key: cityKey,
            name: weatherData.name,
            country: weatherData.sys.country,
            temp: Math.round(weatherData.main.temp),
            icon: weatherData.weather[0].icon,
            lastUpdated: Date.now()
        };
        
        if (existingIndex !== -1) {
            // Update existing city
            this.savedCities[existingIndex] = cityData;
        } else {
            // Add new city (limit to 10 cities)
            this.savedCities.unshift(cityData);
            if (this.savedCities.length > 10) {
                this.savedCities = this.savedCities.slice(0, 10);
            }
        }
        
        this.saveCitiesToStorage();
        this.updateSavedCitiesDisplay();
    }

    updateSavedCitiesDisplay() {
        if (this.savedCities.length === 0) {
            this.elements.savedCitiesList.innerHTML = '<p class="no-cities-message">No saved cities yet. Search for a city and it will be automatically saved!</p>';
            this.elements.clearCitiesBtn.classList.add('hidden');
            return;
        }

        this.elements.clearCitiesBtn.classList.remove('hidden');
        this.elements.savedCitiesList.innerHTML = '';
        
        this.savedCities.forEach((city, index) => {
            const card = this.createSavedCityCard(city, index);
            this.elements.savedCitiesList.appendChild(card);
        });
    }

    createSavedCityCard(city, index) {
        const card = document.createElement('div');
        card.className = 'saved-city-card';
        
        card.innerHTML = `
            <div class="saved-city-info">
                <div class="saved-city-name">${city.name}, ${city.country}</div>
                <div class="saved-city-temp">${city.temp}°${this.getUnitSymbol()}</div>
            </div>
            <button class="remove-city-btn" title="Remove city">×</button>
        `;
        
        // Click to load weather
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-city-btn')) {
                this.elements.cityInput.value = city.name;
                this.searchWeather(city.name);
            }
        });
        
        // Remove city
        const removeBtn = card.querySelector('.remove-city-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSavedCity(index);
        });
        
        return card;
    }

    removeSavedCity(index) {
        this.savedCities.splice(index, 1);
        this.saveCitiesToStorage();
        this.updateSavedCitiesDisplay();
    }

    clearAllCities() {
        if (confirm('Are you sure you want to clear all saved cities?')) {
            this.savedCities = [];
            this.saveCitiesToStorage();
            this.updateSavedCitiesDisplay();
        }
    }

    // Settings Management
    changeUnits(units) {
        this.currentUnits = units;
        localStorage.setItem('weatherUnits', units);
        
        // Refresh current weather data with new units
        if (this.currentWeatherData) {
            const cityName = this.elements.cityInput.value;
            if (cityName) {
                this.searchWeather(cityName);
            }
        }
        
        // Update saved cities display
        this.updateSavedCitiesDisplay();
    }

    changeTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('weatherTheme', theme);
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    toggleSettings() {
        this.elements.settingsMenu.classList.toggle('hidden');
    }

    // Storage Methods
    loadSettings() {
        const savedUnits = localStorage.getItem('weatherUnits') || 'metric';
        const savedTheme = localStorage.getItem('weatherTheme') || 'light';
        
        this.currentUnits = savedUnits;
        this.currentTheme = savedTheme;
        
        this.elements.unitToggle.value = savedUnits;
        this.elements.themeToggle.value = savedTheme;
        
        this.changeTheme(savedTheme);
    }

    loadSavedCities() {
        const saved = localStorage.getItem('weatherSavedCities');
        if (saved) {
            try {
                this.savedCities = JSON.parse(saved);
            } catch (error) {
                this.savedCities = [];
            }
        }
    }

    saveCitiesToStorage() {
        localStorage.setItem('weatherSavedCities', JSON.stringify(this.savedCities));
    }

    // Event Handlers
    handleSearch() {
        const cityName = this.elements.cityInput.value.trim();
        if (cityName) {
            this.searchWeather(cityName);
            this.hideSuggestions();
        }
    }

    // UI Helper Methods
    showLoading() {
        this.elements.loadingSpinner.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingSpinner.classList.add('hidden');
    }

    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
    }

    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    // Utility Methods
    getUnitSymbol() {
        return this.currentUnits === 'metric' ? 'C' : 'F';
    }

    getWindUnit() {
        return this.currentUnits === 'metric' ? 'm/s' : 'mph';
    }

    getErrorMessage(status, errorData) {
        switch (status) {
            case 401:
                return 'Invalid API key. Please check your configuration.';
            case 404:
                return 'City not found. Please check the spelling and try again.';
            case 429:
                return 'Too many requests. Please wait a moment and try again.';
            case 500:
                return 'Weather service is temporarily unavailable. Please try again later.';
            default:
                return errorData.message || 'An unexpected error occurred. Please try again.';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show API key setup message
    console.log('🌦️ Weather App loaded successfully!');
    console.log('⚠️ Don\'t forget to replace YOUR_API_KEY with your actual OpenWeatherMap API key in script.js');
    
    // Initialize the weather app
    new WeatherApp();
});

// Handle theme changes based on system preference
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
        const savedTheme = localStorage.getItem('weatherTheme');
        if (savedTheme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    });
}