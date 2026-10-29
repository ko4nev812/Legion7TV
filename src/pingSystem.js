import { store } from './store.js';

const KEY = 't7ping';
const PRESETS = new Set(['bell', 'chime', 'pop', 'custom']);
const DEFAULTS = {
    volume: 0.5,
    selectedPreset: 'bell',
    customSound: '',
    aliases: [],
    blacklist: [],
    stopWords: []
};

function readConfig() {
    const saved = store.get(KEY);
    const config = { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
    config.volume = Number.isFinite(config.volume) ? Math.max(0, Math.min(1, config.volume)) : DEFAULTS.volume;
    config.selectedPreset = PRESETS.has(config.selectedPreset) ? config.selectedPreset : DEFAULTS.selectedPreset;
    config.customSound = typeof config.customSound === 'string' && config.customSound.startsWith('data:audio/') ? config.customSound : '';
    for (const key of ['aliases', 'blacklist', 'stopWords']) {
        config[key] = Array.isArray(config[key]) ? normalizeList(config[key].join('\n')) : [];
    }
    return config;
}

function normalizeList(value) {
    return String(value || '').split(/[\n,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class PingSystem {
    constructor() {
        this.config = readConfig();
        this.audioContext = null;
        this.customBuffer = null;
        this.customBufferPromise = null;
    }

    save() {
        store.set(KEY, this.config);
    }

    setList(key, value) {
        if (!['aliases', 'blacklist', 'stopWords'].includes(key)) return;
        this.config[key] = normalizeList(value);
        this.save();
        if (this.onChange) this.onChange();
    }

    setVolume(value) {
        this.config.volume = Math.max(0, Math.min(1, Number(value) || 0));
        this.save();
    }

    setPreset(value) {
        if (!PRESETS.has(value) || (value === 'custom' && !this.config.customSound)) return;
        this.config.selectedPreset = value;
        this.save();
    }

    saveCustomSound(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('audio/')) return reject(new Error('Выберите аудиофайл'));
            if (file.size > 2 * 1024 * 1024) return reject(new Error('Размер файла должен быть не больше 2 МБ'));
            const reader = new FileReader();
            reader.onload = () => {
                this.config.customSound = String(reader.result || '');
                this.config.selectedPreset = 'custom';
                this.customBuffer = null;
                this.customBufferPromise = null;
                this.save();
                resolve();
            };
            reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
            reader.readAsDataURL(file);
        });
    }

    isPinged(messageText, extraAliases = []) {
        const text = String(messageText || '');
        return [...this.config.aliases, ...extraAliases].some((raw) => {
            const alias = String(raw || '').trim().toLowerCase();
            if (!alias) return false;
            const pattern = new RegExp('(^|[^\\p{L}\\p{N}_])' + escapeRegex(alias) + '(?=$|[^\\p{L}\\p{N}_])', 'iu');
            return pattern.test(text);
        });
    }

    filterLabel(sender, messageText) {
        const user = String(sender || '').toLowerCase();
        const text = String(messageText || '').toLowerCase();
        if (this.config.blacklist.includes(user)) return 'В ЧС';
        if (this.config.stopWords.some((word) => text.includes(word))) return 'Фильтр';
        return '';
    }

    shouldIgnore(sender, messageText) {
        return !!this.filterLabel(sender, messageText);
    }

    getAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        this.audioContext ||= new AudioContext();
        return this.audioContext;
    }

    unlockAudio() {
        try {
            const context = this.getAudioContext();
            if (context && context.state === 'suspended') context.resume();
        } catch (error) {
            console.warn('[7TV] не удалось включить аудио', error);
        }
    }

    async loadCustomBuffer(context) {
        if (this.customBuffer) return this.customBuffer;
        if (!this.customBufferPromise) {
            this.customBufferPromise = (async () => {
                const encoded = this.config.customSound.split(',')[1];
                if (!encoded) throw new Error('Некорректный аудиофайл');
                const binary = atob(encoded);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return context.decodeAudioData(bytes.buffer);
            })();
        }
        this.customBuffer = await this.customBufferPromise;
        return this.customBuffer;
    }

    async play() {
        if (this.config.volume <= 0) return;
        const context = this.getAudioContext();
        if (!context) return;
        if (context.state === 'suspended') await context.resume();

        if (this.config.selectedPreset === 'custom' && this.config.customSound) {
            try {
                const source = context.createBufferSource();
                const gain = context.createGain();
                source.buffer = await this.loadCustomBuffer(context);
                gain.gain.value = this.config.volume;
                source.connect(gain);
                gain.connect(context.destination);
                source.start();
            } catch (error) {
                this.customBufferPromise = null;
                console.warn('[7TV] не удалось декодировать пользовательский звук', error);
            }
            return;
        }

        try {
            const now = context.currentTime;
            const tones = {
                bell: [[740, 0, 0.24, 'sine'], [988, 0.08, 0.3, 'sine']],
                chime: [[660, 0, 0.32, 'sine'], [880, 0.12, 0.4, 'sine']],
                pop: [[360, 0, 0.12, 'triangle'], [220, 0.04, 0.16, 'sine']]
            }[this.config.selectedPreset] || [];
            for (const [frequency, offset, duration, type] of tones) {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const start = now + offset;
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, start);
                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(Math.max(0.001, this.config.volume * 0.35), start + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start(start);
                oscillator.stop(start + duration);
            }
        } catch (error) {
            console.warn('[7TV] не удалось воспроизвести звук пинга', error);
        }
    }
}

export const pingSystem = new PingSystem();
