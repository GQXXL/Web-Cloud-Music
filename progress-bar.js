; // SPDX-FileCopyrightText: 2021 Gary Wang <toblumia@outlook.com>
; // SPDX-License-Identifier: MIT
class ProgressBar extends HTMLElement {

    static get observedAttributes() {
        return ['value', 'buffer', 'data-chapters'];
    }

    constructor() {
        super();
        const shadow = this.attachShadow({mode: 'open'});

        const container = document.createElement('div');
        container.setAttribute('class', 'container');

        const bufferBar = document.createElement('div');
        bufferBar.setAttribute('id', 'bufferbar');

        const timeBar = document.createElement('div');
        timeBar.setAttribute('id', 'timebar');

        const chapterContainer = document.createElement('div');
        chapterContainer.setAttribute('id', 'chapter-container');

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100%;
                cursor: pointer;
            }
            .container {
                position: relative;
                width: 100%;
                height: 8px;
                overflow: hidden;
                border-radius: 8px;
                background-color: #2b2f36;
            }
            .container > div {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
            }
            #timebar {
                z-index: 2;
                background-color: var(--player-accent, #1ed760);
            }
            #bufferbar {
                z-index: 1;
                background-color: #4a515c;
            }
            #chapter-container {
                z-index: 3;
                width: 100%;
                pointer-events: none;
            }
            .chapter {
                position: absolute;
                width: 100%;
                height: 100%;
                border-left: 2px solid rgba(244, 196, 48, .64);
            }
        `;

        shadow.appendChild(container);
        shadow.appendChild(style);
        container.appendChild(bufferBar);
        container.appendChild(timeBar);
        container.appendChild(chapterContainer);
    }

    connectedCallback() {
        spawnChapters(this);
        updateStyle(this);
    };

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "data-chapters") {
            spawnChapters(this);
        }
        updateStyle(this);
    }
}

function spawnChapters(elem) {
    const shadow = elem.shadowRoot;
    let chapterContainer = shadow.querySelector('#chapter-container');
    let chapters = elem.dataset.chapters ? JSON.parse(elem.dataset.chapters) : [];

    if (!Array.isArray(chapters)) return;
    chapterContainer.textContent = '';
    chapters.forEach((chapter) => {
        let chapterElem = document.createElement('div');
        chapterElem.setAttribute('class', 'chapter');
        chapterElem.setAttribute('title', `${chapter.title}`);
        chapterElem.setAttribute('style', `left: ${chapter.start}%`);
        chapterContainer.appendChild(chapterElem);
    });
}

function safePercent(value) {
    value = Number(value);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function updateStyle(elem) {
    const shadow = elem.shadowRoot;
    let timebar = shadow.querySelector('#timebar');
    timebar.setAttribute('style', `width: ${safePercent(elem.getAttribute('value'))}%`);
    let bufferbar = shadow.querySelector('#bufferbar');
    bufferbar.setAttribute('style', `width: ${safePercent(elem.getAttribute('buffer'))}%`);
}

customElements.define('pcm-progress', ProgressBar);
