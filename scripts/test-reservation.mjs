import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ypdmdfdwzldsifijajrm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZG1kZmR3emxkc2lmaWphanJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTI0NzQsImV4cCI6MjA3ODg2ODQ3NH0._t_GLxY8JHKE-hXganFzq9zztQh2LyqtmB7VqGmU8EE';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkReservationSystem() {
  console.log('=== Checking Reservation System Database & RPCs ===\n');

  // 1. Check Products Table
  console.log('1. Checking products...');
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price_per_unit,
      available_quantity,
      unit,
      farm_id,
      farm: farm_profiles (
        id,
        farm_name,
        farm_location
      )
    `)
    .limit(5);

  if (prodErr) {
    console.error('❌ Error fetching products:', prodErr);
  } else {
    console.log(`✅ Products query OK. Found ${products.length} products:`);
    products.forEach(p => console.log(`   - [${p.id}] ${p.name} (Stock: ${p.available_quantity} ${p.unit}, Price: ${p.price_per_unit} THB, Farm: ${p.farm?.farm_name || 'N/A'})`));
  }

  // 2. Check Reservations Table
  console.log('\n2. Checking reservations table structure & access...');
  const { data: reservations, error: resErr } = await supabase
    .from('reservations')
    .select(`
      id,
      quantity,
      total_price,
      status,
      created_at
    `)
    .limit(5);

  if (resErr) {
    console.error('❌ Error fetching reservations:', resErr);
  } else {
    console.log(`✅ Reservations table accessible! (Found ${reservations.length} records)`);
  }

  // 3. Check Orders Table
  console.log('\n3. Checking orders table...');
  const { data: orders, error: orderErr } = await supabase
    .from('orders')
    .select('id, status, total_price, created_at')
    .limit(5);

  if (orderErr) {
    console.error('❌ Error fetching orders:', orderErr);
  } else {
    console.log(`✅ Orders table accessible! (Found ${orders.length} records)`);
  }

  // 4. Check RPC: reserve_v5 definition presence by calling with dummy UUID without auth
  console.log('\n4. Checking reserve_v5 RPC function...');
  const { data: rpcData, error: rpcErr } = await supabase.rpc('reserve_v5', {
    p_product_id: '00000000-0000-0000-0000-000000000000',
    p_quantity: 1,
    p_use_profile: false
  });

  if (rpcErr) {
    if (rpcErr.message.includes('Not authenticated')) {
      console.log('✅ reserve_v5 RPC exists and correctly rejects unauthenticated calls (Security check passed: "Not authenticated")');
    } else if (rpcErr.message.includes('function') && rpcErr.message.includes('does not exist')) {
      console.error('❌ reserve_v5 RPC DOES NOT EXIST on Supabase! Migration needs to be applied.');
    } else {
      console.log(`ℹ️ reserve_v5 response message: ${rpcErr.message}`);
    }
  } else {
    console.log('✅ reserve_v5 response:', rpcData);
  }

  // 5. Check cancel_reservation RPC
  console.log('\n5. Checking cancel_reservation RPC...');
  const { error: cancelErr } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: '00000000-0000-0000-0000-000000000000',
    p_reason: 'Test'
  });
  if (cancelErr) {
    if (cancelErr.message.includes('Not authenticated') || cancelErr.message.includes('Reservation not found')) {
      console.log(`✅ cancel_reservation RPC exists (Response: "${cancelErr.message}")`);
    } else if (cancelErr.message.includes('does not exist')) {
      console.error('❌ cancel_reservation RPC does not exist!');
    } else {
      console.log(`ℹ️ cancel_reservation response: ${cancelErr.message}`);
    }
  }

  console.log('\n=== Check Complete ===');
}

checkReservationSystem();
