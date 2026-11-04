# 🇻🇳 Chuyển đổi Địa chỉ Hành chính Việt Nam

> Công cụ chuyển đổi địa chỉ giữa hệ **2 cấp mới** (34 tỉnh, từ 01/07/2025) và hệ **3 cấp cũ** (63 tỉnh). Giao diện web + **API miễn phí** cho developer.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green)

## Vấn đề

Từ **01/07/2025**, Việt Nam sáp nhập từ 63 tỉnh xuống 34 tỉnh, chuyển từ 3 cấp (Tỉnh → Huyện → Xã) sang 2 cấp (Tỉnh → Xã/Phường).

Tuy nhiên, hầu hết hệ thống vận chuyển và TMĐT (GHTK, GHN, Shopee, TikTok Shop...) vẫn dùng hệ 3 cấp cũ. Khách hàng gửi địa chỉ mới → hệ thống không nhận ra → đơn hàng bị lỗi.

## Giải pháp

Công cụ này chuyển đổi **tự động** giữa 2 hệ thống:

- ✅ **Mới → Cũ**: Phường Cẩm Phả, Quảng Ninh → Phường Cẩm Trung, TP Cẩm Phả, Quảng Ninh
- ✅ **Cũ → Mới**: Xã Ngọc Liên, Cẩm Giàng, Hải Dương → Xã Cẩm Giàng, Hải Phòng
- ✅ **Giữ lại chi tiết**: Số nhà, đường, thôn/ấp được giữ nguyên trong kết quả
- ✅ **Thông minh**: Hiểu viết tắt (Q., P., TT, HCM...), tự sửa lỗi chính tả, nhận diện huyện

## Demo

🌐 **Live**: [diachinh.vn](https://diachinh.vn) *(coming soon)*

## API

### Chuyển đổi địa chỉ

```
GET /api/convert?text=phuong+5+quan+3+hcm&direction=old_to_new
```

**Response:**
```json
{
  "input": "phuong 5 quan 3 hcm",
  "direction": "old_to_new",
  "detail": null,
  "result": {
    "commune_code": "27193",
    "commune": "Phường Võ Thị Sáu",
    "province": "Thành phố Hồ Chí Minh",
    "full_address": "Phường Võ Thị Sáu, Thành phố Hồ Chí Minh"
  },
  "original": {
    "commune": "Phường 5",
    "district": "Quận 3",
    "province": "Thành phố Hồ Chí Minh"
  },
  "candidates": [...]
}
```

### Với địa chỉ chi tiết (số nhà, thôn/ấp)

```
GET /api/convert?text=thon+Binh+Phien,+xa+Ngoc+Lien,+Cam+Giang,+Hai+Duong&direction=old_to_new
```

```json
{
  "detail": "thon Binh Phien",
  "result": {
    "full_address": "thon Binh Phien, Xã Cẩm Giàng, Thành phố Hải Phòng"
  }
}
```

### Các endpoint khác

| Endpoint | Mô tả |
|----------|--------|
| `GET /api/convert?text=...&direction=new_to_old\|old_to_new` | Chuyển đổi địa chỉ |
| `GET /api/search?q=Cẩm+Phả&limit=10` | Tìm kiếm fuzzy |
| `GET /api/lookup?code=06793` | Tra cứu theo mã xã |
| `GET /api/provinces?system=new\|old\|both` | Danh sách tỉnh |

### Parameters

| Param | Giá trị | Mô tả |
|-------|---------|-------|
| `text` | string | Địa chỉ cần chuyển đổi (hỗ trợ không dấu, viết tắt) |
| `direction` | `new_to_old` hoặc `old_to_new` | Chiều chuyển đổi |

> **Tip**: Nếu chọn sai chiều, API tự động thử chiều ngược lại (auto-fallback).

## Tích hợp nhanh

### cURL

```bash
curl "https://diachinh.vn/api/convert?text=phuong+cam+pha+quang+ninh&direction=new_to_old"
```

### JavaScript / TypeScript

```javascript
const res = await fetch(
  'https://diachinh.vn/api/convert?' + new URLSearchParams({
    text: 'Phường Cẩm Phả, Quảng Ninh',
    direction: 'new_to_old',
  })
);
const data = await res.json();
console.log(data.result.full_address);
// "Phường Cẩm Trung, Thành phố Cẩm Phả, Tỉnh Quảng Ninh"
```

### Python

```python
import requests

res = requests.get('https://diachinh.vn/api/convert', params={
    'text': 'Phường Cẩm Phả, Quảng Ninh',
    'direction': 'new_to_old',
})
data = res.json()
print(data['result']['full_address'])
# Phường Cẩm Trung, Thành phố Cẩm Phả, Tỉnh Quảng Ninh
```

### PHP

```php
$res = file_get_contents(
    'https://diachinh.vn/api/convert?' . http_build_query([
        'text' => 'Phường Cẩm Phả, Quảng Ninh',
        'direction' => 'new_to_old',
    ])
);
$data = json_decode($res, true);
echo $data['result']['full_address'];
```

## Tự host

### Yêu cầu

- Node.js >= 18
- npm hoặc yarn

### Cài đặt

```bash
git clone https://github.com/your-username/diachinh.git
cd diachinh
npm install
```

### Import dữ liệu

```bash
node scripts/import-data.mjs
```

> Script tự động tải dữ liệu từ [CAS AddressKit API](https://api.cas.vn) và tạo database SQLite.

### Chạy

```bash
npm run dev
```

Mở http://localhost:3000

### Build production

```bash
npm run build
npm start
```

## Tính năng parser

| Tính năng | Ví dụ |
|-----------|-------|
| Không dấu | `phuong 5 quan 3 hcm` → Phường 5, Quận 3, HCM |
| Viết tắt | `P.5 Q.3 HCM`, `TT Mộc Châu`, `TX Sa Pa` |
| Alias tỉnh | `hcm`, `hn`, `sg`, `hp`, `dn`... (40+ alias) |
| Nhận diện huyện | `cam giang hai duong` → lọc theo Huyện Cẩm Giàng |
| Sửa lỗi chính tả | Levenshtein distance scoring |
| Số nhà/đường | Giữ nguyên trong `detail` và `full_address` |
| Thôn/ấp/xóm | Giữ nguyên trong `detail` và `full_address` |
| Auto-fallback | Sai chiều → tự thử chiều ngược |
| Phường số | Phường 1 không nhầm Phường 10 |
| Batch | Paste nhiều dòng, xử lý song song |

## Cấu trúc dự án

```
├── data/
│   └── dia-chinh.db          # SQLite database (~2.5MB)
├── scripts/
│   └── import-data.mjs        # Script import từ CAS API
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── convert/       # API chuyển đổi
│   │   │   ├── lookup/        # API tra cứu theo mã
│   │   │   ├── search/        # API tìm kiếm
│   │   │   ├── provinces/     # API danh sách tỉnh
│   │   │   └── stats/         # API thống kê
│   │   ├── page.tsx           # Giao diện chính
│   │   ├── layout.tsx         # SEO metadata
│   │   ├── sitemap.ts         # Sitemap XML
│   │   └── robots.ts          # Robots.txt
│   └── lib/
│       ├── address-parser.ts  # Core parser logic
│       ├── aliases.ts         # Province aliases (40+)
│       ├── db.ts              # Database connection
│       └── normalize.ts       # Text normalization, Levenshtein
├── package.json
└── next.config.ts
```

## Dữ liệu

- Nguồn: [Cục Thống kê Việt Nam](https://danhmuchanhchinh.nso.gov.vn) qua CAS AddressKit API
- Bao gồm: ~11,000 xã/phường, mapping giữa mã cũ và mã mới
- Cập nhật: chạy lại `node scripts/import-data.mjs`

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Xem [CONTRIBUTING.md](CONTRIBUTING.md).

- 🐛 Báo lỗi: [Issues](https://github.com/your-username/diachinh/issues)
- 💡 Đề xuất: [Discussions](https://github.com/your-username/diachinh/discussions)
- 🔀 Pull Request: Fork → Branch → Commit → PR

## License

[MIT](LICENSE) — Tự do sử dụng cho mọi mục đích, kể cả thương mại.

---

⭐ Nếu project hữu ích, hãy cho 1 star để nhiều người biết đến hơn!
