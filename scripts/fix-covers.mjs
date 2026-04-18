import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = 'src/data/blog';

// Тематические Unsplash фото (стабильные ID, проверенные)
const coverByKeyword = [
  { match: /agent|агент/i, url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop' },
  { match: /chatgpt|gpt/i, url: 'https://images.unsplash.com/photo-1678483789111-3a04c4628bd6?w=1200&h=630&fit=crop' },
  { match: /gemini|google/i, url: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=1200&h=630&fit=crop' },
  { match: /video|видео/i, url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&h=630&fit=crop' },
  { match: /prodazh|sales|продаж/i, url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop' },
  { match: /marketing|маркетинг/i, url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop' },
  { match: /claude|sravnen|vs/i, url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop' },
  { match: /hr|personal/i, url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=630&fit=crop' },
  { match: /chat-bot|chatbot|чат-бот/i, url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop' },
  { match: /logistik|логист/i, url: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=1200&h=630&fit=crop' },
  { match: /midjourney|flux|izobrazhen|image/i, url: 'https://images.unsplash.com/photo-1686191128892-3e4b00a83d16?w=1200&h=630&fit=crop' },
  { match: /kiberbezopasnost|security|защит/i, url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=630&fit=crop' },
  { match: /analiz-dannykh|data|данн/i, url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop' },
  { match: /bukhgalter|finance|финанс/i, url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=630&fit=crop' },
  { match: /obrazovan|education|обучен/i, url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=630&fit=crop' },
  { match: /voice|голос/i, url: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=1200&h=630&fit=crop' },
  { match: /rag|dokument/i, url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=1200&h=630&fit=crop' },
  { match: /email/i, url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1200&h=630&fit=crop' },
  { match: /yuridich|kontrakt|legal/i, url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=630&fit=crop' },
  { match: /nedvizhim|real-estate/i, url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=630&fit=crop' },
  { match: /multimodal/i, url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1200&h=630&fit=crop' },
  { match: /proekt|project/i, url: 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=1200&h=630&fit=crop' },
  { match: /klientsk|servis|customer/i, url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=630&fit=crop' },
  { match: /trend/i, url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1200&h=630&fit=crop' },
  { match: /proizvodstv|industr/i, url: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1200&h=630&fit=crop' },
  { match: /kopirayting|text|копирай/i, url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&h=630&fit=crop' },
  { match: /low-code|no-code/i, url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=630&fit=crop' },
  { match: /fintekh|fintech|bank/i, url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=630&fit=crop' },
  { match: /meditsin|medic|зdrav/i, url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=630&fit=crop' },
  { match: /open-source|llama|mistral|qwen/i, url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&h=630&fit=crop' },
  { match: /codex|codex-upravlenie/i, url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop' },
  { match: /vnedr|внедр/i, url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop' },
  { match: /instrument|tool/i, url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop' },
];

// Дефолт для ИИ/бизнес
const defaultCover = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop';

function pickCover(filename) {
  for (const entry of coverByKeyword) {
    if (entry.match.test(filename)) return entry.url;
  }
  return defaultCover;
}

const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
let updated = 0;

for (const f of files) {
  const p = join(dir, f);
  const content = readFileSync(p, 'utf-8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;

  const fm = fmMatch[1];
  const coverMatch = fm.match(/cover:\s*"([^"]*)"/);
  if (!coverMatch) continue;

  const currentCover = coverMatch[1];
  // Пропускаем валидные Unsplash и локальные og-default
  if (currentCover.includes('images.unsplash.com')) continue;

  const newCover = pickCover(f);
  const newFm = fm.replace(/cover:\s*"[^"]*"/, `cover: "${newCover}"`);
  const newContent = content.replace(fmMatch[1], newFm);
  writeFileSync(p, newContent, 'utf-8');
  console.log(`${f}: ${currentCover.slice(0, 50)}... -> ${newCover.slice(50, 90)}`);
  updated++;
}

console.log(`\nUpdated: ${updated}/${files.length}`);
