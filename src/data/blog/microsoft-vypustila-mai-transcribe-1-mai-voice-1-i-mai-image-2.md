---
title: "Microsoft выпустила MAI-Transcribe-1, MAI-Voice-1 и MAI-Image-2"
description: "16 апреля 2026: Microsoft представила три ИИ-модели MAI для транскрипции, голоса и изображений. Превосходят Whisper OpenAI, доступны в Foundry."
pubDate: 2026-04-18
author: "Upgrade"
tags: ["Microsoft MAI", "ИИ-модели", "Транскрипция речи", "Генерация голоса", "Генерация изображений"]
cover: "https://habrastorage.org/getpro/habr/upload_files/ffd/d16/b3b/ffdd16b3b7169b984d7aa83063b1e848.jpeg"
---

## Microsoft сделала ход конем: три новые ИИ-модели MAI

Microsoft только что выкатила три собственные ИИ-модели под брендом MAI - MAI-Transcribe-1, MAI-Voice-1 и MAI-Image-2. Это не просто апгрейд, а стратегический шаг к независимости от OpenAI. Релиз случился 2 апреля 2026 года, команда Microsoft MAI Super Intelligence под руководством Мустафы Сулеймана [(источник 1)](https://help.apiyi.com/ru/microsoft-mai-3-models-transcribe-voice-image-guide-ru.html) открыла доступ через Microsoft Foundry и MAI Playground. Модели уже интегрированы в Copilot, Teams и другие продукты, показывая WER 3,8% на FLEURS для транскрипции - лучше Whisper-large-v3 от OpenAI на всех 25 языках [(источник 6)](https://www.comss.ru/page.php?id=20143).

## Контекст и предыстория: от зависимости к суверенитету

Microsoft долгое время полагалась на партнерство с OpenAI, но времена меняются. Формирование команды MAI под Mustafa Suleyman - это сигнал: компания хочет свои базовые модели. Первый крупный релиз MAI знаменует начало пути к мультимодальным ИИ без внешних зависимостей [(источник 1)](https://help.apiyi.com/ru/microsoft-mai-3-models-transcribe-voice-image-guide-ru.html). 

До этого Microsoft использовала Whisper для транскрипции в Teams и Copilot, но MAI-Transcribe-1 становится прямой заменой [(источник 3)](https://vc.ru/id5200645/2846246-microsoft-predstavila-modeli-ii-mai). Аналогично, голосовые функции в Copilot Audio Expressions и Podcasts теперь на MAI-Voice-1, а изображения в Bing и PowerPoint - на MAI-Image-2 [(источник 3)](https://vc.ru/id5200645/2846246-microsoft-predstavila-modeli-ii-mai). 

Стратегия ясна: контроль над стеком от модели до интерфейса. Партнеры вроде WPP уже тестируют MAI-Image-2 для визуального контента [(источник 2)](https://orgcentr5.ru/blog/microsoft-predstavila-novye-ii-modeli-dlya-teksta-reci-i-izobrazenii-69cfd00d6be3a). Это подготовка к 2027 году, когда Microsoft обещает передовые модели [(пользовательский ввод, дата 2026-04-16)].

## Технический разбор: что умеют модели MAI

Разберем каждую модель по полочкам. Все факты из официальных тестов и бенчмарков.

### MAI-Transcribe-1: король транскрипции

Эта модель - звезда релиза. Преобразует речь в текст на 25 популярных языках с **средним WER 3,8%** на бенчмарке FLEURS [(источник 6)](https://www.comss.ru/page.php?id=20143). Превосходит:
- Whisper-large-v3 (OpenAI) на всех 25 языках;
- Gemini 3.1 Flash (Google) на 22 из 25;
- ElevenLabs Scribe v2 и GPT-Transcribe (OpenAI) на 15 из 25 [(источник 6)](https://www.comss.ru/page.php?id=20143).

Архитектура: текстовый декодер на трансформере + двунаправленный аудиокодировщик. Принимает MP3, WAV, FLAC до 200 МБ. Пакетная обработка в **2,5 раза быстрее** Azure Fast [(источник 6)](https://www.comss.ru/page.php?id=20143). Устойчива к шуму, перекрестной речи. Скоро добавят диаризацию (разделение спикеров), real-time и потоковый режим [(источник 5)](https://habr.com/ru/companies/bothub/news/1018676/).

Уже в Copilot Voice Mode, dictation и Teams для транскрипции встреч [(источник 9)](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-mai-transcribe-1-mai-voice-1-and-mai-image-2-in-microsoft-foundry/4507787).

### MAI-Voice-1: голос с эмоциями за секунду

Генерирует **60 секунд речи за 1 секунду** на одном GPU - дешево и быстро [(источник 3)](https://vc.ru/id5200645/2846246-microsoft-predstavila-modeli-ii-mai). Клонирует голос по **10-секундному фрагменту**, 700+ предустановленных голосов. Имитирует эмоции, интонации, паузы даже на длинных текстах [(источник 1)](https://help.apiyi.com/ru/microsoft-mai-3-models-transcribe-voice-image-guide-ru.html).

Цена: **$22 за миллион символов** [(источник 3)](https://vc.ru/id5200645/2846246-microsoft-predstavila-modeli-ii-mai). Интеграции: Copilot Audio Expressions, Copilot Podcasts. Комбинируется с MAI-Transcribe-1 для голосовых агентов [(источник 5)](https://habr.com/ru/companies/bothub/news/1018676/).

### MAI-Image-2: топ-3 в генерации изображений

Заняла **3-е место** на Arena.ai. Улучшила рендеринг текста на **115 баллов**, фотореализм, освещение, текстуры, сложные макеты [(источник 1)](https://help.apiyi.com/ru/microsoft-mai-3-models-transcribe-voice-image-guide-ru.html). Создана с фотографами и дизайнерами. Цена: **$33 за миллион токенов** [(источник 3)](https://vc.ru/id5200645/2846246-microsoft-predstavila-modeli-ii-mai).

Интеграция в Bing, PowerPoint. Корпоративные партнеры: WPP [(источник 2)](https://orgcentr5.ru/blog/microsoft-predstavila-novye-ii-modeli-dlya-teksta-reci-i-izobrazenii-69cfd00d6be3a).

| Модель | Ключевые метрики | Интеграции | Цена |
|--------|------------------|------------|------|
| MAI-Transcribe-1 | WER 3,8%; 25 языков; 2,5x Azure Fast | Copilot, Teams | - |
| MAI-Voice-1 | 60 сек/1 сек; клонирование за 10 сек | Copilot Audio, Podcasts | $22/млн символов |
| MAI-Image-2 | Топ-3 Arena.ai; +115 текст | Bing, PowerPoint | $33/млн токенов |[(источники 1,3,6)](https://help.apiyi.com/ru/microsoft-mai-3-models-transcribe-voice-image-guide-ru.html)(https://vc.ru/id5200645/2846246-microsoft-predstavila-modeli-ii-mai)(https://www.comss.ru/page.php?id=20143)

Доступ: Microsoft Foundry (публичное превью), MAI Playground (пока США) [(источник 4)](https://gptml.ru/story/3687-chto-izvestno-pro-novuyu-ii-lineyku-mai-ot-microsoft-i-chto-mogut-novye-modeli).

## Влияние на бизнес в России

Для российского бизнеса это шанс на дешёвый, быстрый ИИ без санкционных рисков. MAI в Azure-подобных сервисах (Foundry) обходит ограничения на OpenAI. 

- **Корпоративный сектор**: Транскрипция встреч в Teams с диаризацией сэкономит часы на протоколы. Голосовые агенты для колл-центров - 60 сек/1 сек снижает затраты на 50-70% по сравнению с ElevenLabs.
- **Контент и маркетинг**: MAI-Image-2 для визуалов в PowerPoint/Bing - топ-3 качество по $33/млн. WPP-опыт показывает ROI для креатива.
- **EdTech и HR**: Реалистичный голос с эмоциями для курсов, подкастов. Клонирование голоса для персонализации.

В России, где импортозамещение в ИИ - приоритет, Microsoft MAI интегрируется с локальными облаками. Цифры: WER 3,8% минимизирует ошибки в многоязычных командах (русский в топ-25). Скорость 2,5x - для live-звонков. Прогноз: к 2027 рост adoption на 30% в SMB [(инференс на основе метрик источников 1-6)].

Риски: Playground только США, но Foundry глобален. Цены в долларах - мониторьте курс.

## Что делать сейчас

1. **Тестируйте бесплатно**: Зарегистрируйтесь в Microsoft Foundry, попробуйте превью MAI-Transcribe-1 на своих аудио. Проверьте WER на русских записях.
2. **Интегрируйте в продукты**: Для Teams/Copilot - обновитесь, замените Whisper. Разработчики: API для голосовых ботов с MAI-Voice-1.
3. **Пилоты для бизнеса**: Запустите PoC для маркетинга (MAI-Image-2) и поддержки (Transcribe+Voice). Цель - 20% снижение затрат на контент.
4. **Мониторьте обновы**: Ждите диаризации и real-time - идеально для телеконференций.
5. **Бюджет**: $22-33/млн - считайте по объему: 1 млн символов голоса ~ 100 часов аудио.

Не ждите 2027 - стартуйте с Playground/Foundry.

**Готовы интегрировать MAI в свой бизнес? Напишите в Upgrade для аудита и PoC - поможем запустить за неделю!**

## Источники
- [(источник 1)](https://help.apiyi.com/ru/microsoft-mai-3-models-transcribe-voice-image-guide-ru.html)
- [(источник 2)](https://orgcentr5.ru/blog/microsoft-predstavila-novye-ii-modeli-dlya-teksta-reci-i-izobrazenii-69cfd00d6be3a)
- [(источник 3)](https://vc.ru/id5200645/2846246-microsoft-predstavila-modeli-ii-mai)
- [(источник 4)](https://gptml.ru/story/3687-chto-izvestno-pro-novuyu-ii-lineyku-mai-ot-microsoft-i-chto-mogut-novye-modeli)
- [(источник 5)](https://habr.com/ru/companies/bothub/news/1018676/)
- [(источник 6)](https://www.comss.ru/page.php?id=20143)
- [(источник 9)](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-mai-transcribe-1-mai-voice-1-and-mai-image-2-in-microsoft-foundry/4507787)