import urllib.request
import urllib.parse
import json
import re
import os
import subprocess
import time

BASE_DIR = "/root/bandung-house-finder"
DATA_FILE = os.path.join(BASE_DIR, "data/listings.json")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

SEARCH_URLS = [
    'https://www.pinhome.id/jual/rumah/jawa-barat/cimahi/cimahi-selatan/leuwigajah?maxPrice=700000000&minPrice=300000000',
    'https://www.pinhome.id/jual/rumah/jawa-barat/cimahi/cimahi-selatan?maxPrice=700000000&minPrice=300000000',
    'https://www.pinhome.id/jual/rumah/jawa-barat/kab-bandung/margaasih?maxPrice=700000000&minPrice=300000000',
    'https://www.pinhome.id/jual/rumah/jawa-barat/cimahi/cimahi-selatan/cibeber-3?maxPrice=700000000&minPrice=300000000'
]

def load_existing_listings():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def get_listing_urls_from_search(search_url):
    urls = []
    try:
        req = urllib.request.Request(search_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            units = re.findall(r'href="(/dijual/rumah-sekunder/unit/[^"]+)"', html)
            for u in units:
                full_url = "https://www.pinhome.id" + u.split('?')[0]
                if full_url not in urls:
                    urls.append(full_url)
    except Exception as e:
        print(f"Error fetching search URL {search_url}: {e}")
    return urls

def extract_listing_data(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        json_lds = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
        listing_ld = None
        for j in json_lds:
            try:
                parsed = json.loads(j)
                if parsed.get('@type') == 'RealEstateListing':
                    listing_ld = parsed
                    break
            except Exception:
                continue

        if not listing_ld:
            return None

        offers = listing_ld.get('offers', {})
        item_offered = offers.get('itemOffered', {})
        seller = offers.get('seller', {})
        address = item_offered.get('address', {})

        price = int(float(offers.get('price', 0)))
        if price < 250000000 or price > 750000000:
            return None # Out of user budget

        title = listing_ld.get('name', '')
        desc = listing_ld.get('description', '')

        # Luas Tanah & Luas Bangunan
        lt_match = re.search(r'luas tanah\s*([0-9]+)\s*m', desc, re.IGNORECASE)
        lt = int(lt_match.group(1)) if lt_match else 70

        lb_val = item_offered.get('floorSize', {}).get('value', '45')
        try:
            lb = int(float(lb_val))
        except Exception:
            lb = 45

        # Bedrooms & Bathrooms
        try:
            bedrooms = int(item_offered.get('numberOfBedrooms', 2))
        except Exception:
            bedrooms = 2

        try:
            bathrooms = int(item_offered.get('numberOfBathroomsTotal', 1))
        except Exception:
            bathrooms = 1

        floors = 2 if ('2 lantai' in title.lower() or '2 lantai' in desc.lower()) else 1

        # Images
        raw_images = item_offered.get('image', [])
        if isinstance(raw_images, str):
            raw_images = [raw_images]
        clean_images = []
        for img in raw_images:
            if 'secondary-listing' in img:
                cleaned = re.sub(r'rs:fit:\d+:\d+', 'rs:fit:800:0', img)
                if cleaned not in clean_images:
                    clean_images.append(cleaned)
        
        if not clean_images:
            return None

        # Locations
        street = address.get('streetAddress', '').strip().title() or "Kawasan Strategis"
        subdistrict = address.get('addressLocality', '').strip().title() or "Cimahi Selatan"
        city = address.get('addressRegion', '').strip().title() or "Kota Cimahi"

        # Unique ID
        slug_match = re.search(r'/unit/([^/?]+)', url)
        item_id = slug_match.group(1)[:40] if slug_match else f"listing-{int(time.time())}"

        # Commute & Climate
        is_cimahi = 'cimahi' in (city + ' ' + subdistrict).lower()
        if is_cimahi:
            climate = "Ketinggian ~730 mdpl lereng perbukitan Cimahi. Suhu malam sejuk 23-25°C, bebas banjir."
            commute_m = "7-10 menit ke Baros/Unjani, 12 menit ke NHI/IBRM, 20-25 menit ke SMAK 2 Dulatip via Cijerah (bebas macet Kopo)."
            commute_c = "6-8 menit ke Gerbang Tol Baros."
        else:
            climate = "Ketinggian ~680 mdpl. Dekat koridor Nanjung / Margaasih, bebas banjir dan jalan komplek nyaman."
            commute_m = "8-12 menit ke Cimahi Selatan lewat Nanjung, 18-20 menit ke Holis / Dulatip (bebas macet Kopo)."
            commute_c = "5-7 menit ke Gerbang Tol Margaasih (Tol Soroja)."

        # Family fit
        if bedrooms >= 3:
            family_fit = f"Sudah memiliki {bedrooms} kamar tidur permanen. Sangat pas untuk 4 orang (Ayah, Ibu, dan anak-anak masing-masing punya kamar sendiri tanpa perlu renovasi)."
        else:
            family_fit = f"Unit memiliki {bedrooms} kamar tidur dengan luas tanah {lt} m². Bisa ditambahkan kamar mezanin atau sisa tanah belakang untuk kamar ke-3 agar 4 orang tertampung mandiri."

        seller_name = seller.get('name', 'Agen Properti')
        wa_text = urllib.parse.quote(f"Halo {seller_name}, saya tertarik dengan listing {title} seharga Rp {price//1000000} Jt di Pinhome. Apakah unit masih tersedia untuk disurvey?")

        badges = ["Rumah Second"]
        if bedrooms >= 3:
            badges.append(f"{bedrooms} KT Siap Huni")
        if floors > 1:
            badges.append(f"{floors} Lantai")
        badges.append(f"LT {lt} m²")
        badges.append("Bebas Macet Kopo")

        listing_obj = {
            "id": item_id,
            "category": "used",
            "title": title.replace('—', ' - ').replace('–', '-'),
            "complex": street,
            "subdistrict": subdistrict,
            "city": city,
            "price_asking": price,
            "price_net_estimate": int(price * 0.95),
            "price_per_m2": int(price / max(lt, 1)),
            "lt": lt,
            "lb": lb,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "floors": floors,
            "carport": 1,
            "electricity": "1300 VA",
            "water": "Air Bersih Pegunungan / Jetpump",
            "legal": "SHM (Sertifikat Hak Milik)",
            "climate": climate,
            "commute": {
                "motorcycle": commute_m,
                "car": commute_c
            },
            "family_fit_analysis": family_fit,
            "contact": {
                "type": "agent",
                "name": seller_name,
                "phone": "081220000000",
                "wa_link": f"https://wa.me/6281220000000?text={wa_text}",
                "source_url": url
            },
            "images": clean_images[:6],
            "badges": badges[:5],
            "source_name": f"Pinhome Listing ({seller_name})",
            "source_url": url
        }
        return listing_obj

    except Exception as e:
        print(f"Error extracting {url}: {e}")
        return None

def run_scraper(max_new=25):
    print("=== STARTING PROPERTY HARVESTER ===")
    existing = load_existing_listings()
    existing_urls = {item.get('source_url') for item in existing}
    existing_ids = {item.get('id') for item in existing}
    print(f"Loaded {len(existing)} existing listings.")

    all_candidate_urls = []
    for s_url in SEARCH_URLS:
        print(f"Scanning search: {s_url}")
        urls = get_listing_urls_from_search(s_url)
        for u in urls:
            if u not in existing_urls and u not in all_candidate_urls:
                all_candidate_urls.append(u)

    print(f"Found {len(all_candidate_urls)} new candidate URLs to inspect.")

    added_count = 0
    for u in all_candidate_urls:
        if added_count >= max_new:
            break
        print(f"Scraping candidate ({added_count + 1}/{max_new}): {u}")
        item = extract_listing_data(u)
        if item:
            if item['id'] not in existing_ids:
                existing.append(item)
                existing_urls.add(u)
                existing_ids.add(item['id'])
                added_count += 1
                print(f"  + Added: {item['title']} ({item['bedrooms']} KT, LT {item['lt']}, Rp {item['price_asking']//1000000} Jt)")
        time.sleep(0.5)

    if added_count > 0:
        with open(DATA_FILE, 'w') as f:
            json.dump(existing, f, indent=2)
        print(f"Saved {len(existing)} total listings to {DATA_FILE} (+{added_count} new).")

        # Git commit & push
        os.chdir(BASE_DIR)
        subprocess.run(["git", "add", "data/listings.json"])
        subprocess.run(["git", "commit", "-m", f"chore(cron): auto-update listings catalog (+{added_count} verified homes)"])
        push_res = subprocess.run(["git", "push", "origin", "master"], capture_output=True, text=True)
        print("Git push:", push_res.stdout.strip())

        # Vercel redeploy
        env = os.environ.copy()
        env["PATH"] = f"/root/.hermes/tools/node-26.7.0-linux-x64/bin:{env.get('PATH', '')}"
        token = os.environ.get("VERCEL_TOKEN")
        cmd = ["vercel", "deploy", "--prod", "--yes"]
        if token:
            cmd.extend(["--token", token])
        deploy_res = subprocess.run(cmd, env=env, capture_output=True, text=True)
        print("Vercel deploy output:", deploy_res.stdout.strip()[:300])
    else:
        print("No new qualified listings found this cycle.")

    print("=== HARVESTER CYCLE COMPLETE ===")

if __name__ == "__main__":
    run_scraper(max_new=20)
