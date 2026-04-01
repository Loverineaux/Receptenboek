import { readFileSync } from 'fs';

async function test() {
  const file = readFileSync('C:/Users/robin/Downloads/Feestelijke-recepten.pdf');
  const fd = new FormData();
  fd.append('pdf', new File([file], 'Feestelijke-recepten.pdf', { type: 'application/pdf' }));

  const res = await fetch('http://localhost:3000/api/extract/pdf', {
    method: 'POST',
    body: fd,
    signal: AbortSignal.timeout(300000),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let recipes = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === 'done') recipes = ev.recipes;
        if (ev.type === 'batch_done') console.log(`Batch: ${ev.found} recipes`);
        if (ev.type === 'batch_error') console.log(`ERROR: ${ev.error}`);
      } catch {}
    }
  }

  console.log(`\n${recipes.length} recepten\n`);
  for (const r of recipes) {
    const img = r.image_data ? 'IMG' : '---';
    const pn = r.page_number || '?';
    console.log(`${img} p${String(pn).padEnd(3)} ${r.title}`);
  }

  const withImg = recipes.filter(r => r.image_data).length;
  console.log(`\n${withImg}/${recipes.length} met afbeelding`);
}

test();
