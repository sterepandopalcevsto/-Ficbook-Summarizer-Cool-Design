// ==UserScript==
// @name         Ficbook Summarizer Cool Design
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Summarizes ficbook chapters using Groq API with a modern glassmorphism design (blur effects), on-page settings menu, chapter summarization button, left panel and progress bar.
// @match        https://ficbook.net/readfic/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.groq.com
// ==/UserScript==

(function() {
    'use strict';

    // Загружаем настройки
    let apiKey = GM_getValue("groq_api_key", "");
    let model = GM_getValue("groq_model", "mixtral-8x7b");

    // Добавляем кастомные стили для панели, модального окна и кнопок
    function addCustomStyles() {
        const style = document.createElement("style");
        style.innerHTML = `
            /* Панель суммаризации (glassmorphism) */
            #summaryPanel {
                position: fixed;
                top: 60px;
                left: 20px;
                width: 320px;
                height: calc(100% - 80px);
                background: rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                padding: 20px;
                backdrop-filter: blur(20px);
                box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
                border: 1px solid rgba(255, 255, 255, 0.18);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                z-index: 9999;
                color: #fff;
            }
            #summaryPanel h2 {
                margin: 0;
                font-size: 20px;
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.3);
                padding-bottom: 8px;
            }
            #summaryContent {
                white-space: pre-wrap;
                font-size: 14px;
                line-height: 1.5;
            }
            /* Прогресс-бар */
            .progress {
                width: 100%;
                height: 4px;
                background: rgba(255,255,255,0.3);
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 15px;
                position: relative;
            }
            .progress::before {
                content: '';
                position: absolute;
                width: 30%;
                height: 100%;
                background: #007BFF;
                border-radius: 2px;
                animation: progressBar 1s infinite;
            }
            @keyframes progressBar {
                0% { left: -30%; }
                50% { left: 100%; }
                100% { left: 100%; }
            }
            /* Модальное окно настроек */
            #groqSettingsModal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                backdrop-filter: blur(10px);
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            #groqSettingsModal .modal-content {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
                border: 1px solid rgba(255, 255, 255, 0.18);
                width: 320px;
                color: #fff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #groqSettingsModal h2 {
                margin: 0 0 15px;
                font-size: 20px;
                text-align: center;
            }
            #groqSettingsModal label {
                font-size: 14px;
            }
            #groqSettingsModal input {
                width: 100%;
                margin-bottom: 10px;
                padding: 8px;
                border: none;
                border-radius: 8px;
                outline: none;
            }
            #groqSettingsModal button {
                padding: 8px 12px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                background: #007BFF;
                color: #fff;
                margin-right: 10px;
            }
            /* Кнопки на странице */
            .custom-button {
                padding: 6px 10px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.3s;
            }
            .settings-button {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #007BFF, #00BFFF);
                color: #fff;
                z-index: 10000;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            .summarize-button {
                background: linear-gradient(45deg, #28a745, #85e085);
                color: #fff;
            }
            .custom-button:hover {
                opacity: 0.9;
            }
        `;
        document.head.appendChild(style);
    }

    // Создание панели суммаризации
    function createSummaryPanel() {
        let panel = document.createElement("div");
        panel.id = "summaryPanel";
        panel.innerHTML = `
            <h2>Суммаризация</h2>
            <div id="summaryProgress" class="progress" style="display: none;"></div>
            <div id="summaryContent">Здесь будет отображаться результат суммаризации.</div>
        `;
        document.body.appendChild(panel);
    }

    // Функция создания модального окна настроек
    function createSettingsModal() {
        let modal = document.createElement("div");
        modal.id = "groqSettingsModal";
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Настройки Groq API</h2>
                <label>API ключ:</label>
                <input type="text" id="groqApiKey" value="${apiKey}" />
                <label>Модель:</label>
                <input type="text" id="groqModel" value="${model}" />
                <div style="text-align: right;">
                    <button id="groqSaveSettings">Сохранить</button>
                    <button id="groqCloseSettings">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById("groqSaveSettings").addEventListener("click", function() {
            let newApiKey = document.getElementById("groqApiKey").value.trim();
            let newModel = document.getElementById("groqModel").value.trim();
            GM_setValue("groq_api_key", newApiKey);
            GM_setValue("groq_model", newModel);
            apiKey = newApiKey;
            model = newModel;
            alert("Настройки сохранены");
            closeSettingsModal();
        });

        document.getElementById("groqCloseSettings").addEventListener("click", closeSettingsModal);
    }

    function closeSettingsModal() {
        let modal = document.getElementById("groqSettingsModal");
        if (modal) {
            modal.remove();
        }
    }

    // Добавляем кнопку настроек в правом верхнем углу
    function addSettingsButton() {
        let settingsBtn = document.createElement("button");
        settingsBtn.innerText = "Настройки Groq";
        settingsBtn.classList.add("custom-button", "settings-button");
        settingsBtn.addEventListener("click", createSettingsModal);
        document.body.appendChild(settingsBtn);
    }

    // Функция для добавления кнопки суммаризации рядом с заголовком главы
    function addSummarizeButtonForCurrentChapter() {
        const titleElem = document.querySelector('h2[itemprop="headline"]');
        if (titleElem) {
            const btn = document.createElement("button");
            btn.innerText = "Суммаризация";
            btn.classList.add("custom-button", "summarize-button");
            btn.addEventListener("click", () => {
                const contentElem = document.getElementById("content");
                if (contentElem) {
                    const chapterText = contentElem.innerText;
                    sendToGroq(chapterText);
                } else {
                    alert("Не найден текст главы.");
                }
            });
            titleElem.parentNode.insertBefore(btn, titleElem.nextSibling);
        }
    }

    // Обновление содержимого панели суммаризации
    function updateSummaryPanel(content) {
        const summaryContent = document.getElementById("summaryContent");
        if (summaryContent) {
            summaryContent.innerText = content;
        }
    }

    // Управление видимостью прогресс-бара
    function setProgressBarVisible(visible) {
        const progressBar = document.getElementById("summaryProgress");
        if (progressBar) {
            progressBar.style.display = visible ? "block" : "none";
        }
    }

    // Отправка текста в Groq API для суммаризации с улучшенной обработкой ответа
    function sendToGroq(text) {
        if (!apiKey) {
            alert("API ключ не задан. Откройте настройки и введите ключ.");
            return;
        }
        updateSummaryPanel("Подождите, идёт суммаризация...");
        setProgressBarVisible(true);
        GM_xmlhttpRequest({
            method: "POST",
            url: "https://api.groq.com/openai/v1/chat/completions",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            data: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: `Суммаризируй данный текст и всё: ${text}` }],
                max_tokens: 200
            }),
            onload: function(response) {
                setProgressBarVisible(false);
                try {
                    console.log("Ответ API:", response.responseText);
                    const data = JSON.parse(response.responseText);
                    if (data.error) {
                        updateSummaryPanel("Ошибка API: " + data.error.message);
                        return;
                    }
                    if (!data.choices || data.choices.length === 0) {
                        updateSummaryPanel("Ошибка: Пустой ответ от API.");
                        return;
                    }
                    const summary = data.choices[0].message.content;
                    updateSummaryPanel(summary);
                } catch (e) {
                    console.error("Ошибка обработки ответа:", e);
                    updateSummaryPanel("Ошибка обработки ответа: " + e.message);
                }
            },
            onerror: function() {
                setProgressBarVisible(false);
                updateSummaryPanel("Ошибка запроса к API.");
            }
        });
    }

    // Опционально: для страниц со списком глав можно добавить кнопки суммаризации рядом с ссылками
    function addSummarizeButtons() {
        document.querySelectorAll(".part__name a").forEach(chapterLink => {
            const button = document.createElement("button");
            button.innerText = "Суммаризация";
            button.classList.add("custom-button", "summarize-button");
            button.onclick = () => {
                fetch(chapterLink.href)
                    .then(response => response.text())
                    .then(html => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, "text/html");
                        const chapterTextContainer = doc.querySelector(".reader-container");
                        if (!chapterTextContainer) {
                            alert("Не удалось найти текст главы.");
                            return;
                        }
                        const chapterText = chapterTextContainer.innerText;
                        sendToGroq(chapterText);
                    })
                    .catch(err => console.error("Ошибка загрузки главы:", err));
            };
            chapterLink.parentElement.appendChild(button);
        });
    }

    // Инициализация скрипта
    function init() {
        addCustomStyles();
        createSummaryPanel();
        addSettingsButton();
        if (document.getElementById("content")) {
            addSummarizeButtonForCurrentChapter();
        } else {
            addSummarizeButtons();
        }
    }

    window.addEventListener("load", init);
})();
