-- ATELIER.GE — 16 sample products with 3–4 photos each (gallery demo).
-- Run in Supabase Dashboard → SQL Editor. Safe to run again.
-- Adds the products if they are missing; if they exist (004_sample_products.sql),
-- only their photos are replaced. Products you edited keep everything else.
-- Extra photos are similar items from the same category, not the same item.
-- To remove all sample products later:
--   delete from public.products where id like 'prod-sample-%';
insert into public.products (id, title, brand, price, original_price, category, sizes, condition, images, description, color, material, seller_name, in_stock, is_new_arrival, rating, reviews_count)
select id, title, brand, price, original_price, category, sizes, condition, images, description, color, material, seller_name, in_stock, is_new_arrival, rating, reviews_count
from jsonb_populate_recordset(null::public.products, $json$
[
 {
  "id": "prod-sample-01",
  "title": "ქალის კლასიკური ტრენჩკოტი",
  "brand": "ATELIER",
  "price": 420,
  "original_price": null,
  "category": "women",
  "sizes": [
   "XS",
   "S",
   "M",
   "L"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "კლასიკური ტრენჩკოტი ქამრით და ორმაგი ღილებით. იდეალურია შემოდგომისთვის.",
  "color": "ბეჟი",
  "material": "ბამბა / პოლიესტერი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-02",
  "title": "კაშმირის რბილი სვიტერი",
  "brand": "ATELIER",
  "price": 260,
  "original_price": 320,
  "category": "women",
  "sizes": [
   "XS",
   "S",
   "M",
   "L"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "მსუბუქი და თბილი სვიტერი თავისუფალი ჭრით.",
  "color": "კრემისფერი",
  "material": "70% კაშმირი, 30% მატყლი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-03",
  "title": "აბრეშუმის მიდი კაბა",
  "brand": "ATELIER",
  "price": 310,
  "original_price": null,
  "category": "women",
  "sizes": [
   "XS",
   "S",
   "M"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "ელეგანტური მიდი კაბა საღამოსა და განსაკუთრებული შემთხვევებისთვის.",
  "color": "შავი",
  "material": "100% აბრეშუმი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-04",
  "title": "ზაფხულის მსუბუქი კაბა",
  "brand": "ATELIER",
  "price": 145,
  "original_price": 190,
  "category": "women",
  "sizes": [
   "XS",
   "S",
   "M",
   "L"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "ჰაეროვანი ბამბის კაბა ყოველდღიური ტარებისთვის.",
  "color": "თეთრი",
  "material": "100% ბამბა",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": false,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-05",
  "title": "მაღალწელიანი ჯინსი",
  "brand": "ATELIER",
  "price": 165,
  "original_price": null,
  "category": "women",
  "sizes": [
   "XS",
   "S",
   "M",
   "L",
   "XL"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "სწორი ჭრის ჯინსი მაღალი წელით.",
  "color": "ლურჯი",
  "material": "98% ბამბა, 2% ელასტანი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": false,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-06",
  "title": "კლასიკური შალის კოსტიუმი",
  "brand": "ATELIER",
  "price": 780,
  "original_price": 950,
  "category": "men",
  "sizes": [
   "S",
   "M",
   "L",
   "XL"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "ორნაწილიანი კოსტიუმი იტალიური მატყლისგან.",
  "color": "ნაცრისფერი",
  "material": "100% მატყლი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-07",
  "title": "ბამბის საბაზო მაისური",
  "brand": "ATELIER",
  "price": 59,
  "original_price": null,
  "category": "men",
  "sizes": [
   "XS",
   "S",
   "M",
   "L",
   "XL"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "მკვრივი ბამბის მაისური, რომელიც ყველაფერს უხდება.",
  "color": "თეთრი",
  "material": "100% ორგანული ბამბა",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": false,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-08",
  "title": "ოვერსაიზ ჰუდი",
  "brand": "ATELIER",
  "price": 149,
  "original_price": null,
  "category": "men",
  "sizes": [
   "S",
   "M",
   "L",
   "XL"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "რბილი ჰუდი თავისუფალი ჭრით და ჯიბით.",
  "color": "ნაცრისფერი",
  "material": "80% ბამბა, 20% პოლიესტერი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-09",
  "title": "ჯინსის ქურთუკი",
  "brand": "ATELIER",
  "price": 230,
  "original_price": 280,
  "category": "men",
  "sizes": [
   "S",
   "M",
   "L",
   "XL"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "კლასიკური ჯინსის ქურთუკი, რომელიც არასდროს გადის მოდიდან.",
  "color": "ლურჯი",
  "material": "100% ბამბა",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": false,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-10",
  "title": "წითელი სპორტული სნიკერსი",
  "brand": "ATELIER",
  "price": 289,
  "original_price": null,
  "category": "shoes",
  "sizes": [
   "39",
   "40",
   "41",
   "42",
   "43",
   "44"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "მსუბუქი და კომფორტული სნიკერსი ყოველდღიური სიარულისთვის.",
  "color": "წითელი",
  "material": "ტექსტილი / რეზინი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-11",
  "title": "თეთრი ტყავის სნიკერსი",
  "brand": "ATELIER",
  "price": 249,
  "original_price": 299,
  "category": "shoes",
  "sizes": [
   "36",
   "37",
   "38",
   "39",
   "40",
   "41",
   "42",
   "43"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "მინიმალისტური თეთრი სნიკერსი ტყავისგან.",
  "color": "თეთრი",
  "material": "ნატურალური ტყავი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": false,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-12",
  "title": "ქალის ტყავის ლოფერი",
  "brand": "ATELIER",
  "price": 215,
  "original_price": null,
  "category": "shoes",
  "sizes": [
   "36",
   "37",
   "38",
   "39",
   "40"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "კლასიკური ლოფერი რბილი ტყავისგან.",
  "color": "შავი",
  "material": "ნატურალური ტყავი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-13",
  "title": "სირბილის ფეხსაცმელი",
  "brand": "ATELIER",
  "price": 320,
  "original_price": 380,
  "category": "shoes",
  "sizes": [
   "39",
   "40",
   "41",
   "42",
   "43",
   "44",
   "45"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "ამორტიზებული ძირი გრძელი სირბილისთვის.",
  "color": "ნაცრისფერი",
  "material": "ბადისებრი ტექსტილი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": false,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-14",
  "title": "ტყავის ხელჩანთა",
  "brand": "ATELIER",
  "price": 390,
  "original_price": null,
  "category": "accessories",
  "sizes": [
   "ONE SIZE"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "ერთი ზომის ჩანთა ყოველდღიური ტარებისთვის.",
  "color": "ყავისფერი",
  "material": "ნატურალური ტყავი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-15",
  "title": "კლასიკური სათვალე",
  "brand": "ATELIER",
  "price": 120,
  "original_price": 150,
  "category": "accessories",
  "sizes": [
   "ONE SIZE"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "UV400 დაცვის მზის სათვალე.",
  "color": "შავი",
  "material": "აცეტატი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": false,
  "rating": 5,
  "reviews_count": 0
 },
 {
  "id": "prod-sample-16",
  "title": "მინიმალისტური საათი",
  "brand": "ATELIER",
  "price": 340,
  "original_price": null,
  "category": "accessories",
  "sizes": [
   "ONE SIZE"
  ],
  "condition": "ახალი (იარლიყით)",
  "images": [
   "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80",
   "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80"
  ],
  "description": "თხელი კორპუსი და ტყავის სამაჯური.",
  "color": "ვერცხლისფერი",
  "material": "უჟანგავი ფოლადი / ტყავი",
  "seller_name": "ATELIER Official Store",
  "in_stock": true,
  "is_new_arrival": true,
  "rating": 5,
  "reviews_count": 0
 }
]
$json$::jsonb)
on conflict (id) do update set images = excluded.images;
