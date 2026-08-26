import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ypdmdfdwzldsifijajrm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZG1kZmR3emxkc2lmaWphanJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTI0NzQsImV4cCI6MjA3ODg2ODQ3NH0._t_GLxY8JHKE-hXganFzq9zztQh2LyqtmB7VqGmU8EE';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testAllRPCs() {
  const dummyParamsAll = {
    p_product_id: '1e7b8ae9-afd2-4909-82a8-e9e62a15669b',
    p_quantity: 1,
    p_note: 'test note',
    p_use_profile: false,
    p_receiver_name: 'Test Name',
    p_receiver_phone: '0812345678',
    p_delivery_address: '123 Test St'
  };

  console.log('Testing reserve_v5 with all 7 params...');
  const res5 = await supabase.rpc('reserve_v5', dummyParamsAll);
  console.log('reserve_v5 result:', res5.error ? res5.error.message : res5.data);

  console.log('Testing confirm_reservation...');
  const resConfirm = await supabase.rpc('confirm_reservation', { p_reservation_id: '00000000-0000-0000-0000-000000000000' });
  console.log('confirm_reservation result:', resConfirm.error ? resConfirm.error.message : resConfirm.data);

  console.log('Testing cancel_reservation...');
  const resCancel = await supabase.rpc('cancel_reservation', { p_reservation_id: '00000000-0000-0000-0000-000000000000', p_reason: 'test' });
  console.log('cancel_reservation result:', resCancel.error ? resCancel.error.message : resCancel.data);
}

testAllRPCs();
