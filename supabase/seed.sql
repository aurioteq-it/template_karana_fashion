-- Demo content only. Replace and approve all information before launch.
insert into public.business_settings (brand_name, contact_phone, support_hours, delivery_note, return_policy, privacy_policy, terms)
values (
  'Karana Fashion', '', 'সাপোর্ট সময় প্রকাশের আগে যোগ করুন',
  'ডেলিভারির সময় ও শর্ত প্রকাশের আগে নিশ্চিত করুন।',
  'ডেমো নীতি। ব্যবসার অনুমোদিত রিটার্ন ও রিফান্ড নীতি এখানে প্রকাশ করুন।',
  'ডেমো নীতি। গ্রাহকের তথ্য কীভাবে ব্যবহার ও সংরক্ষণ করা হবে তা ব্যবসার অনুমোদিত নীতিতে লিখুন।',
  'ডেমো শর্তাবলি। ব্যবসার অনুমোদিত বিক্রয় ও ডেলিভারি শর্ত এখানে লিখুন।'
);

with demo as (
  insert into public.products (name, subtitle, description, details, active, is_demo)
  values (
    'এভরিডে টোট ব্যাগ',
    'দৈনন্দিন ব্যবহারের জন্য একটি সহজ, পরিপাটি ডিজাইন',
    'এটি প্রদর্শনের জন্য ডেমো পণ্য। আসল পণ্যের ছবি, উপাদান, মাপ ও বিবরণ প্রকাশের আগে যোগ করুন।',
    array['ডেমো পণ্য — প্রকৃত স্পেসিফিকেশন যোগ করুন','পণ্যের আসল ছবি ও মাপ যোগ করুন','মূল্য ও স্টক প্রকাশের আগে যাচাই করুন'],
    true, true
  ) returning id
)
insert into public.product_variants(product_id,label,sku,price,stock)
select demo.id, v.label, v.sku, 1290, v.stock
from demo cross join (values ('স্যান্ড','DEMO-SAND',12),('অলিভ','DEMO-OLIVE',8),('ব্ল্যাক','DEMO-BLACK',10)) as v(label,sku,stock);

insert into public.delivery_zones(label,fee) values ('ঢাকা শহর',70),('ঢাকার বাইরে',130);
