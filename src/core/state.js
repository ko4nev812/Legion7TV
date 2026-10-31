import { pageChan } from './config.js';

// настройки
export const S = { nick: pageChan, size: 'm', on: true };

// имя эмоута -> { base, f:[файлы], zw, g }
export const EM = {};

// всё, что переприсваивается, лежит в одном объекте
export const st = {
    pos: null,        // позиция окошка {x, y} или null (прилипает к кнопке)
    win: null,        // размер окошка {w, h} или null
    pop: null,        // элемент окошка
    anchor: null,     // кнопка 7TV, от которой открыто окошко
    io: null,         // IntersectionObserver списка
    status: '',
    loadToken: 0,
    hooks: {          // подключаются в main.js (чтобы модули не импортировали друг друга по кругу)
        status() {},
        emotes() {},
        place()  {} 
    }
};