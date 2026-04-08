const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const wikiMap = {
  'mango': 'mango', 'mascarpone': 'mascarpone', 'melk': 'milk', 'mosterd': 'mustard (condiment)',
  'mozzarella': 'mozzarella', 'munt': 'mentha', 'nectarine': 'nectarine', 'nootmuskaat': 'nutmeg',
  'olijfolie': 'olive oil', 'oregano': 'oregano', 'panko': 'panko', 'paprika': 'bell pepper',
  'paprikapoeder': 'paprika', 'parmezaan': 'parmesan', 'pasta': 'pasta', 'peper': 'black pepper',
  'pesto': 'pesto', 'peterselie': 'parsley', 'pijnboompit': 'pine nut', 'pistachenoot': 'pistachio',
  'pompoen': 'pumpkin', 'prei': 'leek', 'radijs': 'radish', 'ricotta': 'ricotta',
  'rijst': 'rice', 'rode biet': 'beetroot', 'rode ui': 'red onion', 'room': 'cream',
  'rosbief': 'roast beef', 'rozemarijn': 'rosemary', 'rundergehakt': 'ground beef',
  'salami': 'salami', 'selderij': 'celery', 'sesamolie': 'sesame oil', 'sla': 'lettuce',
  'sojasaus': 'soy sauce', 'spekblokjes': 'bacon', 'spinazie': 'spinach', 'spitskool': 'pointed cabbage',
  'suiker': 'sugar', 'tahini': 'tahini', 'tijm': 'thyme', 'tomaat': 'tomato',
  'tomatenpuree': 'tomato paste', 'tonijn': 'tuna', 'tuinerwt': 'pea', 'ui': 'onion',
  'venkel': 'fennel', 'walnoot': 'walnut', 'wortel': 'carrot', 'yoghurt': 'yogurt',
  'zalm': 'salmon', 'zoete aardappel': 'sweet potato', 'zonnebloemolie': 'sunflower oil', 'zout': 'salt',
};

const ingredients = [
  { id: '0e715580-8268-45b8-b8c3-9a9d24664c14', name: 'mango' },
  { id: 'f46ecfb9-76b8-4026-9a4d-2401c8d68770', name: 'mascarpone' },
  { id: '01f2c493-efc8-4ab2-93fb-4e85ae57e86b', name: 'melk' },
  { id: '29830924-62f2-4e89-a95e-a3bc153d9043', name: 'mosterd' },
  { id: 'a5f93c90-4b71-4e47-867b-de29bf3b1717', name: 'mozzarella' },
  { id: 'ded98369-714b-47dc-a038-493223d6325a', name: 'munt' },
  { id: '2e82a88a-8cc3-4972-9b51-9f272140d6f9', name: 'nectarine' },
  { id: '54dff42d-b4e2-461e-b53e-8917250a3232', name: 'nootmuskaat' },
  { id: '9f3d2bed-1ab8-4c51-b422-ddf9e528c55f', name: 'olijfolie' },
  { id: '8c3ad6d1-4a1e-41a0-9c8b-cb43cf1df4e6', name: 'oregano' },
  { id: 'ae7443b8-601e-4837-a9f8-fd4347ea3687', name: 'panko' },
  { id: 'ccdc90d7-fcfc-4d4a-a3da-707b000ad083', name: 'paprika' },
  { id: '5bbf7580-5676-43f8-aac9-fbd00c554a69', name: 'paprikapoeder' },
  { id: '010afdd4-4e61-43df-a43b-259773979635', name: 'parmezaan' },
  { id: '051cce03-4bd5-4d43-932f-846f3a8ac07f', name: 'pasta' },
  { id: '5a535fc7-ef2d-4273-ad42-4ee325516612', name: 'peper' },
  { id: 'ebb2de44-b044-487a-af6a-e9333cd49875', name: 'pesto' },
  { id: '3ffae45e-49ba-4f1e-bc8d-0d7e678df435', name: 'peterselie' },
  { id: '86470317-9b34-42dc-8228-94c9e2e036ed', name: 'pijnboompit' },
  { id: 'fc384ebc-addb-41f1-9008-8a872cd29a67', name: 'pistachenoot' },
  { id: '537ceeb1-4b40-49d3-9247-74b0777ab97b', name: 'pompoen' },
  { id: '015ef654-9bdb-4352-ac3a-d0574cb0c593', name: 'prei' },
  { id: 'aaf5f9ae-5516-4d45-93d1-1bb90002c872', name: 'radijs' },
  { id: '73d0dff5-d299-4861-8bec-9c133bd1f789', name: 'ricotta' },
  { id: 'a338e891-b892-4e37-914b-18ee296cec86', name: 'rijst' },
  { id: '1f9f5a59-39e9-4cd2-bf45-4fccc9ca2de8', name: 'rode biet' },
  { id: '19b99dc9-8ddb-4389-9bb9-d60737c84bdd', name: 'rode ui' },
  { id: '3d97420e-d7b1-4ec6-b593-850faf689955', name: 'room' },
  { id: '7cc0e7ff-56b0-4d32-bad6-a93ae235a4f4', name: 'rosbief' },
  { id: '1ba0bf4b-6c98-4ca3-867b-e4f0c879c896', name: 'rozemarijn' },
  { id: '04fccb16-551d-40a3-9f6f-00aeed333a1c', name: 'rundergehakt' },
  { id: '2424f6ad-fc23-404a-9893-afe70846e5e6', name: 'salami' },
  { id: '2c7e5516-b0df-4bb6-90a6-96f364c9ecfe', name: 'selderij' },
  { id: 'fe5eccca-ed62-4cff-8eb2-0b3251c7840e', name: 'sesamolie' },
  { id: 'db043b36-de9e-4f92-a810-670d1de5de2c', name: 'sla' },
  { id: 'db103648-1093-47a3-bb07-4b105ed54959', name: 'sojasaus' },
  { id: '708db5ab-1f0a-45b5-8f37-20e8570acdda', name: 'spekblokjes' },
  { id: '8287bbf0-960a-466c-80f9-56794bb31a94', name: 'spinazie' },
  { id: 'fbcc05ab-90e7-4951-b059-e797d699c4fa', name: 'spitskool' },
  { id: 'cfe9fb7a-8d7b-4241-b9f4-f8fc33d076b3', name: 'suiker' },
  { id: '3a3b28f1-4b02-4558-83f6-a75791f5c69c', name: 'tahini' },
  { id: 'a414a375-e1d2-46cf-8d7d-2be1beee094d', name: 'tijm' },
  { id: 'e6f6319a-25f5-488c-a700-8e6729e4b6e6', name: 'tomaat' },
  { id: '369b03bb-eca1-48a0-83ee-52c8726660eb', name: 'tomatenpuree' },
  { id: 'f1c25b37-d1bc-4088-abd6-0beef7946c2a', name: 'tonijn' },
  { id: '6c2e179a-4f44-4315-ba06-636496fbf280', name: 'tuinerwt' },
  { id: 'ebf1d2f9-532e-4922-b175-1562a72c0e13', name: 'ui' },
  { id: 'c2106c06-b0f5-4f01-baf3-ba82726170bd', name: 'venkel' },
  { id: 'ea543dc7-6402-460f-a921-c73af2e6594d', name: 'walnoot' },
  { id: '49c6a818-2987-4127-87ed-842b33bcc36b', name: 'wortel' },
  { id: '44b3438e-9171-4797-a7da-04453a2d87d7', name: 'yoghurt' },
  { id: '8d0e62e7-c5bc-4ee7-9162-0040d5b61f32', name: 'zalm' },
  { id: 'ee39fe8f-95d7-4a53-a594-3c42207fa3b0', name: 'zoete aardappel' },
  { id: '732241ad-16b8-4c35-8e87-ad641de3381b', name: 'zonnebloemolie' },
  { id: '3b91c3f5-5362-4b34-bbb6-8a3f34d2da72', name: 'zout' },
];

async function getWikiImage(name) {
  const term = wikiMap[name] || name;
  try {
    const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term));
    const data = await res.json();
    return data.thumbnail?.source || null;
  } catch { return null; }
}

(async () => {
  let updated = 0;
  let failed = [];
  for (const ing of ingredients) {
    const img = await getWikiImage(ing.name);
    if (img) {
      const { error } = await sb.from('generic_ingredients').update({ image_url: img }).eq('id', ing.id);
      if (!error) updated++;
      else console.error('DB ERROR', ing.name, error.message);
    } else {
      failed.push(ing.name);
    }
  }
  console.log(`Updated: ${updated}`);
  if (failed.length) console.log('Failed:', failed.join(', '));
})();
