import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkInsert() {
  const { data, error } = await supabase.from('product_variants').insert([{
    variantId: crypto.randomUUID(),
    sku: 'TEST-SKU-123',
    variantName: 'Test Product',
    catalogPrice: 100,
    showroomPrice: 90,
    isSellable: true,
    attributes: {
      brand: 'Magnific',
      category: 'Wall Lights',
      media: { images: ['test.jpg'] },
      technicalDetails: {}
    }
  }]).select();
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted Data:', data);
  }
}
checkInsert();
