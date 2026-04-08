const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Better curated images from Wikimedia Commons
const fixes = {
  'acf3117c-2bc0-4e47-a9b9-3b59a436f0de': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Essig-1.jpg/330px-Essig-1.jpg', // azijn - fles azijn
  'de437cea-ec60-432c-b7de-4130eed384b7': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Single.jpg/330px-Banana-Single.jpg', // banaan
  'cb0063f8-3eb6-4ca5-a318-360cad306973': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Allium_schoenoprasum_in_NH_01.jpg/330px-Allium_schoenoprasum_in_NH_01.jpg', // bieslook - het kruid
  'fa0a992b-365a-4632-80b4-46fbd8784beb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Bread_Roll_with_mixed_seeds.jpg/330px-Bread_Roll_with_mixed_seeds.jpg', // brood
  'a0c552d6-7d4f-45e8-a864-a8f3f671e90b': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Cashewnuts.jpg/330px-Cashewnuts.jpg', // cashewnoot
  '226b5604-8ed1-475c-a206-ff76c37f2145': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/ChampignonMushroom.jpg/330px-ChampignonMushroom.jpg', // champignon
  'f36650b5-6f9e-4be2-9a5c-494f6c5124ef': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Couscous_of_Fes.JPG/330px-Couscous_of_Fes.JPG', // couscous
  '72f39d26-4064-4d2c-aefb-1fe3bcae1111': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Brown_eggs.jpg/330px-Brown_eggs.jpg', // ei - kippenei
  '85b787af-b7ce-4d87-97e6-de10952db1ee': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Raspberry_-_whole_%28Rubus_idaeus%29.jpg/330px-Raspberry_-_whole_%28Rubus_idaeus%29.jpg', // framboos heel
  '1c77df8f-5a06-49b8-bfd5-a7816f68f843': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Brown_mushroom.jpg/330px-Brown_mushroom.jpg', // kastanjechampignon - bruin
  'a4cf357e-29b4-4ba0-88b7-9b09b01120ac': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chickpeas.jpg/330px-Chickpeas.jpg', // kikkererwt
  'ebe251e7-564b-4772-9b8e-1118153486ba': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Chicken_breast_raw.jpg/330px-Chicken_breast_raw.jpg', // kipfilet
  '20a9e264-2aa3-4a7c-a297-073eac1d7a05': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ground_chicken.jpg/330px-Ground_chicken.jpg', // kipgehakt
  '4000811d-840d-45c7-8cbc-31521dd9ce11': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Chicken_thigh_meat.jpg/330px-Chicken_thigh_meat.jpg', // kippendijfilet
  '1eec0cae-2983-4ff2-8da7-752bb7d1345e': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/GarlicBasket.jpg/330px-GarlicBasket.jpg', // knoflook
  '6b47821e-cfca-48de-9c6a-e7ba368cd4ad': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/GarlicBasket.jpg/330px-GarlicBasket.jpg', // knoflookteen
  '90588828-c46c-487f-86a6-5ee736c0310a': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camille_Flammarion_-_Coconut.jpg/330px-Camille_Flammarion_-_Coconut.jpg', // kokosmelk
  '94367b03-e425-4c00-99c0-8898d7734ce6': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Cumin_seeds.jpg/330px-Cumin_seeds.jpg', // komijn zaadjes
  '0665a5b3-89e7-4834-bf5f-3daa5e497cbd': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/ARS_cucumber.jpg/330px-ARS_cucumber.jpg', // komkommer
  '64748767-03e4-4bda-8540-50fea80531b1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Lamb_meat_%281%29.jpg/330px-Lamb_meat_%281%29.jpg', // lamsrack
  'a9cd70b8-504a-4a23-bfb0-9b48626c1724': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Turmeric_powder.jpg/330px-Turmeric_powder.jpg', // kurkuma poeder
  'f0e0aa94-5cc3-4017-9fad-011625158efd': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Ab_food_06.jpg/330px-Ab_food_06.jpg', // mais - maiskolf
};

(async () => {
  let updated = 0;
  for (const [id, url] of Object.entries(fixes)) {
    const { error } = await sb.from('generic_ingredients').update({ image_url: url }).eq('id', id);
    if (error) console.error('ERROR', id, error.message);
    else updated++;
  }
  console.log(`Done: ${updated} updated`);
})();
