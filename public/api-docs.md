# API Chuyển đổi Địa chỉ Hành chính Việt Nam

> Base URL: `https://chuyentendonvihanhchinh.com`

API miễn phí, không cần đăng ký, không giới hạn request.

---

## 1. Chuyển đổi địa chỉ

```
GET /api/convert?text=<địa chỉ>&direction=<chiều>
```

### Parameters

| Param     | Bắt buộc | Giá trị                          | Mô tả                                              |
|-----------|----------|----------------------------------|-----------------------------------------------------|
| text      | Có       | string                           | Địa chỉ cần chuyển đổi (hỗ trợ không dấu, viết tắt) |
| direction | Có       | `new_to_old` hoặc `old_to_new`   | Chiều chuyển đổi                                    |

> **Tip**: Nếu chọn sai chiều, API tự động thử chiều ngược lại (auto-fallback).

### Ví dụ

**Mới → Cũ:**
```
GET /api/convert?text=phuong+cam+pha,+quang+ninh&direction=new_to_old
```

**Cũ → Mới:**
```
GET /api/convert?text=phuong+5,+quan+3,+hcm&direction=old_to_new
```

### Response

```json
{
  "input": "phường Cẩm Phả, Quảng Ninh",
  "direction": "new_to_old",
  "detail": null,
  "result": {
    "commune_code": "06793",
    "commune": "Phường Cẩm Trung",
    "district": "Thành phố Cẩm Phả",
    "province": "Tỉnh Quảng Ninh",
    "full_address": "Phường Cẩm Trung, Thành phố Cẩm Phả, Tỉnh Quảng Ninh"
  },
  "original": {
    "commune": "Phường Cẩm Phả",
    "province": "Tỉnh Quảng Ninh"
  },
  "candidates": [...]
}
```

### Các trường response

| Trường       | Kiểu     | Mô tả                                          |
|-------------|----------|-------------------------------------------------|
| input       | string   | Địa chỉ đầu vào gốc                            |
| direction   | string   | Chiều chuyển đổi thực tế (có thể khác nếu auto-fallback) |
| detail      | string?  | Phần chi tiết giữ nguyên (số nhà, thôn, đường)  |
| result      | object?  | Kết quả chuyển đổi (null nếu không tìm thấy)    |
| result.commune_code | string | Mã xã/phường                             |
| result.commune | string | Tên xã/phường                                 |
| result.district | string? | Tên quận/huyện (chỉ có ở hệ cũ 3 cấp)       |
| result.province | string | Tên tỉnh/thành phố                            |
| result.full_address | string | Địa chỉ đầy đủ (bao gồm detail nếu có)   |
| original    | object?  | Thông tin gốc trước chuyển đổi                   |
| candidates  | array?   | Các kết quả gần đúng khác (có score %)           |

---

## 2. Tra cứu theo mã xã

```
GET /api/lookup?code=<mã xã>
```

### Ví dụ

```
GET /api/lookup?code=06793
```

### Response

```json
{
  "commune_code": "06793",
  "old": {
    "commune": "Phường Cẩm Trung",
    "district": "Thành phố Cẩm Phả",
    "province": "Tỉnh Quảng Ninh"
  },
  "new": {
    "commune": "Phường Cẩm Phả",
    "province": "Tỉnh Quảng Ninh"
  }
}
```

---

## 3. Tìm kiếm fuzzy

```
GET /api/search?q=<từ khóa>&limit=<số lượng>
```

| Param | Bắt buộc | Mô tả                           |
|-------|----------|----------------------------------|
| q     | Có       | Từ khóa tìm kiếm                |
| limit | Không    | Số kết quả tối đa (mặc định: 10) |

### Ví dụ

```
GET /api/search?q=Cẩm+Phả&limit=5
```

---

## 4. Danh sách tỉnh

```
GET /api/provinces?system=<hệ thống>
```

| Param  | Giá trị                    | Mô tả                              |
|--------|---------------------------|-------------------------------------|
| system | `new`, `old`, hoặc `both` | new: 34 tỉnh mới, old: 63 tỉnh cũ  |

---

## Tích hợp nhanh

### cURL

```bash
curl "https://chuyentendonvihanhchinh.com/api/convert?text=phuong+cam+pha,+quang+ninh&direction=new_to_old"
```

### JavaScript / TypeScript

```javascript
const res = await fetch(
  'https://chuyentendonvihanhchinh.com/api/convert?' + new URLSearchParams({
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

res = requests.get('https://chuyentendonvihanhchinh.com/api/convert', params={
    'text': 'Phường Cẩm Phả, Quảng Ninh',
    'direction': 'new_to_old',
})
data = res.json()
print(data['result']['full_address'])
```

### PHP

```php
$res = file_get_contents(
    'https://chuyentendonvihanhchinh.com/api/convert?' . http_build_query([
        'text' => 'Phường Cẩm Phả, Quảng Ninh',
        'direction' => 'new_to_old',
    ])
);
$data = json_decode($res, true);
echo $data['result']['full_address'];
```

---

## Tính năng

- Hỗ trợ không dấu, viết tắt (Q., P., TT, HCM, SG, HN...)
- Nhận diện huyện từ input
- Giữ lại chi tiết (số nhà, thôn, đường) trong kết quả
- Auto-fallback khi chọn sai chiều
- Phường số an toàn (Phường 1 không nhầm Phường 10)
- Sửa lỗi chính tả (Levenshtein distance)

---

## Mã nguồn

GitHub: https://github.com/huyennb2-sketch/chuyen_doi_don_vi_hanh_chinh_moi

License: MIT — Tự do sử dụng cho mọi mục đích, kể cả thương mại.
