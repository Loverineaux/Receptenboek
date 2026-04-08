const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const images = {
  'efaf63c3-f582-42b4-a98d-4e521a556213': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Solanum_melongena_24_08_2012_%281%29.JPG/330px-Solanum_melongena_24_08_2012_%281%29.JPG',
  '66c68e43-329b-4884-b464-718b7625d972': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Persea_americana_fruit_2.JPG/330px-Persea_americana_fruit_2.JPG',
  'acf3117c-2bc0-4e47-a9b9-3b59a436f0de': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Eguilles_20110828_14.jpg/330px-Eguilles_20110828_14.jpg',
  'de437cea-ec60-432c-b7de-4130eed384b7': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Bananavarieties.jpg/330px-Bananavarieties.jpg',
  '86a02e71-73bd-4071-bb7d-4f6fdd17569c': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Ocimum_basilicum_8zz.jpg/330px-Ocimum_basilicum_8zz.jpg',
  'cb0063f8-3eb6-4ca5-a318-360cad306973': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Allium_schoenoprasum_-_Bombus_lapidarius_-_Tootsi.jpg/330px-Allium_schoenoprasum_-_Bombus_lapidarius_-_Tootsi.jpg',
  '42417525-1221-414d-a6a6-170d3e4ae6da': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Soy_powder.jpg/330px-Soy_powder.jpg',
  'd1e3483d-e90c-4002-a6a5-81407aae80f5': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Chou-fleur_02.jpg/330px-Chou-fleur_02.jpg',
  '8054aa2f-edb0-4e3c-9fea-12614ac54919': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/%C5%A0v%C3%A9dsk%C3%BD_kol%C3%A1%C4%8D_naruby_904_%28cropped%29.JPG/330px-%C5%A0v%C3%A9dsk%C3%BD_kol%C3%A1%C4%8D_naruby_904_%28cropped%29.JPG',
  '62f6177a-7914-4b37-bd55-3e426f3865c8': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Br%C3%BChw%C3%BCrfel-1.jpg/330px-Br%C3%BChw%C3%BCrfel-1.jpg',
  'c9db82d2-ce1f-412d-a267-fd04c5bedf6a': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Broccoli_and_cross_section_edit.jpg/330px-Broccoli_and_cross_section_edit.jpg',
  'fa0a992b-365a-4632-80b4-46fbd8784beb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/330px-Korb_mit_Br%C3%B6tchen.JPG',
  'a0c552d6-7d4f-45e8-a864-a8f3f671e90b': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Cashew_apples.jpg/330px-Cashew_apples.jpg',
  '226b5604-8ed1-475c-a206-ff76c37f2145': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Sparrige_Sch%C3%BCppling_%28Pholiota_squarrosa%29.jpg/330px-Sparrige_Sch%C3%BCppling_%28Pholiota_squarrosa%29.jpg',
  'f479a5f2-ae6f-4b44-9086-e4db00bb1b89': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tomates_cerises_Luc_Viatour.jpg/330px-Tomates_cerises_Luc_Viatour.jpg',
  '0845c760-e2f7-48bf-a869-880e498c4b0f': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Madame_Jeanette_and_other_chillies.jpg/330px-Madame_Jeanette_and_other_chillies.jpg',
  'f60987f0-d5eb-4421-84a9-eac7ed5143df': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/P1030323.JPG/330px-P1030323.JPG',
  '76a088f7-eef1-4fbf-b641-4a4e41d488d0': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/CSA-Striped-Zucchini.jpg/330px-CSA-Striped-Zucchini.jpg',
  'f36650b5-6f9e-4be2-9a5c-494f6c5124ef': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Moroccan_cuscus%2C_from_Casablanca%2C_September_2018.jpg/330px-Moroccan_cuscus%2C_from_Casablanca%2C_September_2018.jpg',
  '72f39d26-4064-4d2c-aefb-1fe3bcae1111': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Huevo_frito.jpg/330px-Huevo_frito.jpg',
  'dccf7fed-0f3b-409c-93b6-0c30ffdb73ab': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Feta_Cheese.jpg/330px-Feta_Cheese.jpg',
  '85b787af-b7ce-4d87-97e6-de10952db1ee': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Raspberry_-_halved_%28Rubus_idaeus%29.jpg/330px-Raspberry_-_halved_%28Rubus_idaeus%29.jpg',
  '66bca61a-cbd0-4c0f-ba00-d1d5d782ab66': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Palaemon_serratus_Croazia.jpg/330px-Palaemon_serratus_Croazia.jpg',
  'f9a94583-a6bf-4fc9-afc7-6b914595d151': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Plateau_3_horizontal.tif/lossy-page1-330px-Plateau_3_horizontal.tif.jpg',
  'bd52248f-e4a7-4a80-ad87-cb16e8b11c75': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Flickr_-_cyclonebill_-_Parmesan.jpg/330px-Flickr_-_cyclonebill_-_Parmesan.jpg',
  '8e12b170-7db4-4b04-8a31-c041ae954364': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Oatmeal.jpg/330px-Oatmeal.jpg',
  '72c471e0-63d6-420a-8bc8-ee557990d72c': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Runny_hunny.jpg/330px-Runny_hunny.jpg',
  '093f140e-8c7c-4ed8-91b9-708526a8e705': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Lebanese_style_hummus.jpg/330px-Lebanese_style_hummus.jpg',
  '0bd8cdd9-f9e9-43ee-8906-b815f7ba6218': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Cinnamomum_verum_spices.jpg/330px-Cinnamomum_verum_spices.jpg',
  '1c77df8f-5a06-49b8-bfd5-a7816f68f843': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/ChampignonMushroom.jpg/330px-ChampignonMushroom.jpg',
  '3897d761-f2d5-4065-aba7-5984b3761d8b': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Red_Rajma_BNC.jpg/330px-Red_Rajma_BNC.jpg',
  'a4cf357e-29b4-4ba0-88b7-9b09b01120ac': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Chickpea_BNC.jpg/330px-Chickpea_BNC.jpg',
  'ebe251e7-564b-4772-9b8e-1118153486ba': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Chickens_in_market.jpg/330px-Chickens_in_market.jpg',
  '20a9e264-2aa3-4a7c-a297-073eac1d7a05': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sausage_making-H-1.jpg/330px-Sausage_making-H-1.jpg',
  '4000811d-840d-45c7-8cbc-31521dd9ce11': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Chickens_in_market.jpg/330px-Chickens_in_market.jpg',
  '1eec0cae-2983-4ff2-8da7-752bb7d1345e': 'https://upload.wikimedia.org/wikipedia/commons/3/39/Allium_sativum_Woodwill_1793.jpg',
  '6b47821e-cfca-48de-9c6a-e7ba368cd4ad': 'https://upload.wikimedia.org/wikipedia/commons/3/39/Allium_sativum_Woodwill_1793.jpg',
  '90588828-c46c-487f-86a6-5ee736c0310a': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Cononut_milk.JPG/330px-Cononut_milk.JPG',
  '94367b03-e425-4c00-99c0-8898d7734ce6': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Cuminum_cyminum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-198.jpg/330px-Cuminum_cyminum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-198.jpg',
  '0665a5b3-89e7-4834-bf5f-3daa5e497cbd': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/ARS_cucumber.jpg/330px-ARS_cucumber.jpg',
  'cacadc6f-f026-4866-ab0a-f7b116ffeddc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Coriandrum_sativum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-193.jpg/330px-Coriandrum_sativum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-193.jpg',
  'a9cd70b8-504a-4a23-bfb0-9b48626c1724': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Turmeric_inflorescence.jpg/330px-Turmeric_inflorescence.jpg',
  '64748767-03e4-4bda-8540-50fea80531b1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Rack_Carr%C3%A9_d%27agneau.JPG/330px-Rack_Carr%C3%A9_d%27agneau.JPG',
  'c0a603ab-de51-48a2-b32a-43f56b1cbf88': 'https://upload.wikimedia.org/wikipedia/commons/2/24/Citrus_%C3%97_aurantiifolia_%28Christm.%29_Swingle_%2851906868474%29.jpg',
  '14ca9f11-d50e-449e-926f-e3eb48806acf': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/3_types_of_lentil.png/330px-3_types_of_lentil.png',
  'f0e0aa94-5cc3-4017-9fad-011625158efd': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Zea_mays_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-283.jpg/330px-Zea_mays_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-283.jpg',
};

(async () => {
  let updated = 0;
  let errors = 0;
  for (const [id, url] of Object.entries(images)) {
    const { error } = await sb.from('generic_ingredients').update({ image_url: url }).eq('id', id);
    if (error) { console.error('ERROR', id, error.message); errors++; }
    else updated++;
  }
  console.log(`Done: ${updated} updated, ${errors} errors`);
})();
