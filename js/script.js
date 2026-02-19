  // ============================================================
  // 🔑 ЗАМІНИ "YOUR_API_KEY" на свій ключ з visualcrossing.com
  // Реєстрація безкоштовна: https://www.visualcrossing.com/sign-up
  // Безкоштовний план: 1000 записів/день
  // ============================================================
  const API_KEY = 'NCSQKWSLH84DQWAUN4L93LD7B';

  // Visual Crossing — один endpoint для всього
  // Документація: https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
  const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';
  // 1. Створюємо змінну мови (глобальну)
  let currentLang = 'uk';

  // ---------- Локалізація ----------
  const ukMonths   = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
  const ukDays     = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
  const ukDaysFull = ['Неділя','Понеділок','Вівторок','Середа','Четвер','Пятниця','Субота'];

  // ---------- Маппінг Visual Crossing icon → Weather Icons (wi-) ----------
  // Повний список іконок VC: https://www.visualcrossing.com/resources/documentation/weather-api/defining-icon-set-icons/
  function vcToWi(icon) {
    const map = {
      'clear-day':           { icon: 'wi-day-sunny',         color: '#f57c00' },
      'clear-night':         { icon: 'wi-night-clear',       color: '#3949ab' },
      'partly-cloudy-day':   { icon: 'wi-day-cloudy',        color: '#78909c' },
      'partly-cloudy-night': { icon: 'wi-night-alt-cloudy',  color: '#546e7a' },
      'cloudy':              { icon: 'wi-cloudy',             color: '#607d8b' },
      'rain':                { icon: 'wi-rain',               color: '#1565c0' },
      'showers-day':         { icon: 'wi-day-showers',        color: '#1976d2' },
      'showers-night':       { icon: 'wi-night-alt-showers',  color: '#1565c0' },
      'thunder-rain':        { icon: 'wi-thunderstorm',       color: '#4a148c' },
      'thunder-showers-day': { icon: 'wi-day-thunderstorm',   color: '#6a1b9a' },
      'thunder-showers-night':{ icon:'wi-night-thunderstorm', color: '#4a148c' },
      'snow':                { icon: 'wi-snow',               color: '#29b6f6' },
      'snow-showers-day':    { icon: 'wi-day-snow',           color: '#4fc3f7' },
      'snow-showers-night':  { icon: 'wi-night-alt-snow',     color: '#29b6f6' },
      'sleet':               { icon: 'wi-sleet',              color: '#4fc3f7' },
      'fog':                 { icon: 'wi-fog',                color: '#90a4ae' },
      'wind':                { icon: 'wi-strong-wind',        color: '#78909c' },
      'hail':                { icon: 'wi-hail',               color: '#4fc3f7' },
    };
    return map[icon] || { icon: 'wi-day-cloudy', color: '#78909c' };
  }

  // Градуси вітру → назва напрямку
  function degToDir(deg) {
    if (deg == null) return '—';
    const dirs = ['Пн','Пн-Сх','Сх','Пд-Сх','Пд','Пд-Зх','Зх','Пн-Зх'];
    return dirs[Math.round(deg / 45) % 8];
  }

  // Тиск мбар (= гПа) → мм рт.ст.
  function mbarToMmHg(mbar) {
    return mbar ? Math.round(mbar * 0.750062) : '—';
  }

  // Форматування часу "HH:MM:SS" → "HH:MM"
  function fmtTime(str) {
    return str ? str.slice(0, 5) : '—';
  }

  // ---------- Стан ----------
  let allDays           = [];
  let activeDay         = 0;
  let currentCityDisplay = 'Київ';

  // ---------- Головна функція: один запит до VC повертає ВСЕ ----------
 async function loadWeather(cityQuery) {
    if (API_KEY === 'YOUR_API_KEY') {
        showError('⚠️ Встав свій API-ключ!');
        return;
    }

    showLoading(true);

    // --- НОВИЙ БЛОК: Перетворення координат у назву міста ---
    let displayCityName = cityQuery;
    
    // Перевіряємо, чи cityQuery схожий на координати (містить коми та цифри)
    if (cityQuery.includes(',')) {
        try {
            const [lat, lon] = cityQuery.split(',');
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${lat},${lon}&format=json&addressdetails=1&accept-language=${currentLang}`);
            const geoData = await geoRes.json();
            
            if (geoData && geoData.length > 0) {
                const addr = geoData[0].address;
                // Намагаємося взяти місто, місто-супутник або село
                displayCityName = addr.city || addr.town || addr.village || addr.municipality || cityQuery;
            }
        } catch (e) {
            console.error("Не вдалося визначити назву міста за координатами", e);
        }
    }
    // -------------------------------------------------------

    try {
        const url = `${BASE_URL}/${encodeURIComponent(cityQuery)}/next15days` +
        `?unitGroup=metric&include=hours,current&lang=${currentLang}&key=${API_KEY}&contentType=json`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Помилка: ${res.status}`);
        const data = await res.json();

        // Тепер використовуємо нашу визначену назву міста замість сирих координат
        currentCityDisplay = displayCityName; 
        updateCityLabel(currentCityDisplay);

        // ... далі твій існуючий код (allDays = data.days.map і так далі)

      // ---------- Обробка днів ----------
      allDays = data.days.slice(0, 10).map((day, idx) => {
        // Дата
        const dateObj = new Date(day.datetime + 'T12:00:00');
        const wi      = vcToWi(day.icon);

        // Поточні дані (тільки для першого дня)
        const cur = idx === 0 ? data.currentConditions : null;
        const feelsLike = cur
          ? Math.round(cur.feelslike)
          : Math.round(day.feelslikemax ?? day.feelslike ?? day.tempmax);

        // Опади
        const precip = (day.precip ?? 0).toFixed(1);

        // Погодинні дані (VC дає масив hours для кожного дня)
        const hours = (day.hours || [])
          .filter((_, i) => i % 3 === 0) // кожні 3 години: 00, 03, 06...
          .map(h => {
            const hw = vcToWi(h.icon);
            return {
              time:      fmtTime(h.datetime),
              icon:      hw.icon,
              color:     hw.color,
              label:     h.conditions || '',
              temp:      Math.round(h.temp),
              feels:     Math.round(h.feelslike),
              pressure:  mbarToMmHg(h.pressure),
              humidity:  Math.round(h.humidity),
              windSpeed: Math.round((h.windspeed || 0) / 3.6), // км/год → м/с
              windDir:   degToDir(h.winddir)
            };
          });

        return {
          date:      dateObj,
          dayName:   ukDays[dateObj.getDay()],
          dayFull:   ukDaysFull[dateObj.getDay()],
          dateStr:   `${dateObj.getDate()} ${ukMonths[dateObj.getMonth()]}`,
          weather:   wi,
          desc:      day.description || day.conditions || '',
          tMax:      Math.round(day.tempmax),
          tMin:      Math.round(day.tempmin),
          feelsLike,
          pressure:  mbarToMmHg(cur ? cur.pressure : day.pressure),
          humidity:  Math.round(cur ? cur.humidity : day.humidity),
          windSpeed: Math.round((cur ? cur.windspeed : day.windspeed || 0) / 3.6), // км/год → м/с
          windDir:   degToDir(cur ? cur.winddir : day.winddir),
          precip,
          sunrise:   fmtTime(day.sunrise),
          sunset:    fmtTime(day.sunset),
          hours
        };
      });

      activeDay = 0;
      renderDayCards();
      renderCentral();
      renderHourly();

    } catch (err) {
      showError(`❌ ${err.message}`);
    } finally {
      showLoading(false);
    }
  }

  // ---------- Рендер карток днів ----------
  function renderDayCards() {
    const row = document.getElementById('daysRow');
    row.innerHTML = '';
    allDays.forEach((d, i) => {
      const card    = document.createElement('div');
      card.className = 'day-card' + (i === activeDay ? ' active' : '');
      const tMaxStr = (d.tMax >= 0 ? '+' : '') + d.tMax + '°';
      const tMinStr = (d.tMin >= 0 ? '+' : '') + d.tMin + '°';
      card.innerHTML = `
        <div class="day-name">${i === 0 ? 'Сьогодні' : i === 1 ? 'Завтра' : d.dayName}</div>
        <div class="day-date">${d.dateStr}</div>
        <div class="day-icon"><i class="wi ${d.weather.icon}" style="color:${d.weather.color}"></i></div>
        <div class="day-temps">
          <span class="t-max">${tMaxStr}</span>
          <span class="t-min">${tMinStr}</span>
        </div>`;
      card.addEventListener('click', () => {
        activeDay = i;
        renderDayCards();
        renderCentral();
        renderHourly();
      });
      row.appendChild(card);
    });
  }

  // ---------- Рендер центрального блоку ----------
  function renderCentral() {
    const d    = allDays[activeDay];
    const sign = n => (n >= 0 ? '+' : '') + n;

    document.getElementById('mainIcon').innerHTML    = `<i class="wi ${d.weather.icon}" style="color:${d.weather.color}"></i>`;
    document.getElementById('mainTemp').textContent  = sign(d.tMax);
    document.getElementById('feelsLike').textContent = sign(d.feelsLike);
    document.getElementById('mainDesc').textContent  = capitalize(d.desc);
    document.getElementById('mainDate').textContent  = `${d.dayFull}, ${d.dateStr}`;
    document.getElementById('descText').textContent  = buildDesc(d);
    document.getElementById('p-pressure').textContent = d.pressure;
    document.getElementById('p-humidity').textContent  = d.humidity;
    document.getElementById('p-wind').textContent      = d.windSpeed;
    document.getElementById('p-precip').textContent    = d.precip;
    document.getElementById('p-sunrise').textContent   = d.sunrise;
    document.getElementById('p-sunset').textContent    = d.sunset;
  }

  // ---------- Рендер погодинної таблиці ----------
  function renderHourly() {
    const hours = allDays[activeDay].hours;
    const tbody = document.getElementById('hourlyBody');
    tbody.innerHTML = '';
    if (!hours.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#999">Немає погодинних даних</td></tr>';
      return;
    }
    const sign = n => (n >= 0 ? '+' : '') + n;
    hours.forEach(h => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${h.time}</td>
        <td><i class="wi ${h.icon}" style="color:${h.color}"></i></td>
        <td class="temp-val">${sign(h.temp)}°</td>
        <td>${sign(h.feels)}°</td>
        <td>${h.pressure}</td>
        <td>${h.humidity}%</td>
        <td>${h.windSpeed}</td>
        <td>${h.windDir}</td>`;
      tbody.appendChild(tr);
    });
  }

  // ---------- Допоміжні ----------
  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function buildDesc(d) {
    const city      = currentCityDisplay;
    const windLabel = d.windSpeed <= 3 ? 'слабкий' : d.windSpeed <= 7 ? 'помірний' : 'сильний';
    const sign      = n => (n >= 0 ? '+' : '') + n;
    // Якщо VC повернув опис дня — показуємо його, інакше генеруємо
    if (d.desc && d.desc.length > 10) return capitalize(d.desc);
    return `У ${city} — ${d.weather.icon.replace(/wi-|-/g, ' ').trim()}. ` +
           `Температура від ${sign(d.tMin)}°C до ${sign(d.tMax)}°C. ` +
           `Відчувається як ${sign(d.feelsLike)}°C. ` +
           `Вітер ${d.windDir}, ${windLabel} — ${d.windSpeed} м/с. ` +
           `Вологість ${d.humidity}%. Тиск ${d.pressure} мм рт.ст.`;
  }

  function updateCityLabel(name) {
    let prep = name;
    if      (name.endsWith('ів'))                      prep = name;
    else if (name.endsWith('а') || name.endsWith('я')) prep = name.slice(0, -1) + 'і';
    else if (name.endsWith('е') || name.endsWith('є')) prep = name.slice(0, -1) + 'і';
    else                                               prep = name + 'і';
    document.getElementById('cityName').textContent        = prep;
    document.getElementById('breadcrumb-city').textContent = name;
  }

  // ---------- UI Helpers ----------
  function showLoading(on) {
    let el = document.getElementById('loadingBar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loadingBar';
      el.style.cssText = `position:fixed;top:0;left:0;width:0;height:3px;
        background:linear-gradient(90deg,#1a73e8,#ff9800);
        z-index:9999;transition:width 0.4s;border-radius:0 2px 2px 0;`;
      document.body.prepend(el);
    }
    el.style.width   = on ? '70%' : '100%';
    el.style.opacity = on ? '1' : '0';
    if (!on) setTimeout(() => { el.style.width = '0'; }, 400);
  }

  function showError(msg) {
    let el = document.getElementById('errorBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'errorBanner';
      el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:#c62828;color:#fff;padding:12px 24px;border-radius:8px;
        font-size:14px;font-family:'Rubik',sans-serif;z-index:9999;
        box-shadow:0 4px 16px rgba(0,0,0,0.25);max-width:90vw;text-align:center;`;
      document.body.appendChild(el);
    }
    el.textContent   = msg;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 6000);
  }

  // ---------- Пошук ----------
async function handleSearch() {
    const city = document.getElementById('cityInput').value;
    if (!city) return;

    // Використовуємо currentLang у запиті
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}?unitGroup=metric&key=${API_KEY}&contentType=json&lang=${currentLang}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        loadWeather(city); // Твоя функція відмальовки
    } catch (err) {
        console.error("Помилка:", err);
    }
}

  document.getElementById('cityInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
  });
  document.querySelector('.search-wrap button').addEventListener('click', handleSearch);

  // ---------- Вибір мови (UI only) ----------
  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-switch button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ---------- Старт: геолокація → або дефолт Київ ----------
function checkGeolocationPermission() {
    const permission = localStorage.getItem('geoPermission');
    const lastCity = localStorage.getItem('lastCity');
    
    if (permission === 'granted' && lastCity) {
        // Використовуємо збережене місто
        loadWeather(lastCity);
        return true;
    } else if (permission === 'denied') {
        // Користувач відмовився, використовуємо Київ
        loadWeather('Kyiv');
        return true;
    }
    return false;
}

// Оновлена функція init()
function init() {
    if (API_KEY === 'YOUR_API_KEY') {
        showError('⚠️ Встав свій API-ключ Visual Crossing у змінну API_KEY у коді!');
        return;
    }
    
    // Спочатку перевіряємо чи є збережена згода
    if (checkGeolocationPermission()) {
        return;
    }
    
    // Якщо немає збереженої згоди - питаємо
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                // Зберігаємо згоду
                localStorage.setItem('geoPermission', 'granted');
                const { latitude: lat, longitude: lon } = pos.coords;
                const cityCoords = `${lat},${lon}`;
                localStorage.setItem('lastCity', cityCoords);
                loadWeather(cityCoords);
            },
            () => {
                // Користувач відмовився - зберігаємо це
                localStorage.setItem('geoPermission', 'denied');
                localStorage.setItem('lastCity', 'Kyiv');
                loadWeather('Kyiv');
            },
            { timeout: 5000 }
        );
    } else {
        loadWeather('Kyiv');
    }
}

  init();
  




//ФУНКЦІЯ ВІДОБРАЖЕННЮ СПИСКУ МІСТ ПРИ ПОШУКУ


const cityInput = document.getElementById('cityInput');
const suggestionsBox = document.getElementById('suggestions');

// Слухаємо введення тексту
cityInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    
    if (query.length < 3) {
        suggestionsBox.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=5&accept-language=uk`);
        const data = await response.json();

        if (data.length > 0) {
            renderSuggestions(data);
        } else {
            suggestionsBox.style.display = 'none';
        }
    } catch (err) {
        console.error("Помилка завантаження міст", err);
    }
}, 300)); // Затримка 300мс, щоб не спамити запитами

function renderSuggestions(towns) {
    suggestionsBox.innerHTML = '';
    suggestionsBox.style.display = 'block';

    towns.forEach(town => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        // Формуємо красиву назву: Населений пункт (Область)
        const name = town.address.city || town.address.town || town.address.village || town.display_name.split(',')[0];
        const region = town.address.state || '';
        
        div.textContent = region ? `${name} (${region})` : name;

        // При кліку на місто зі списку
        div.onclick = () => {
            cityInput.value = name;
            suggestionsBox.style.display = 'none';
            handleSearch(); // Відразу запускаємо пошук погоди
        };
        
        suggestionsBox.appendChild(div);
    });
}

// Закриваємо список, якщо клікнули в іншому місці
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
        suggestionsBox.style.display = 'none';
    }
});

// Функція затримки (Debounce)
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}


// 1. Створюємо змінну мови (глобальну)

// 2. Чекаємо, поки завантажиться весь документ
document.addEventListener('DOMContentLoaded', () => {
    const langButtons = document.querySelectorAll('#langSwitch button');

    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Змінюємо мову
            currentLang = btn.getAttribute('data-lang');
            console.log("Мова змінена на:", currentLang);

            // Візуальне перемикання класів
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Оновлюємо погоду
            const currentCity = document.getElementById('cityInput').value;
            if (currentCity) {
                handleSearch(); // Викликаємо твою функцію пошуку
            } else {
                console.log("Введіть місто, щоб побачити зміну мови");
            }
        });
    });
});


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(() => console.log("Service Worker зареєстрований"))
      .catch(err => console.log("SW помилка:", err));
  });
}
