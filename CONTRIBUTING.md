# Đóng góp cho dự án

Cảm ơn bạn đã quan tâm đến dự án! Mọi đóng góp đều được hoan nghênh.

## Cách đóng góp

### Báo lỗi

1. Kiểm tra [Issues](https://github.com/huyennb2-sketch/diachinh/issues) xem lỗi đã được báo chưa
2. Tạo issue mới với:
   - Địa chỉ đầu vào
   - Kết quả thực tế
   - Kết quả mong đợi
   - Direction (new_to_old hay old_to_new)

### Sửa lỗi / Thêm tính năng

1. Fork repo
2. Tạo branch: `git checkout -b fix/ten-loi` hoặc `git checkout -b feat/ten-tinh-nang`
3. Code và test
4. Commit: `git commit -m "Mô tả thay đổi"`
5. Push: `git push origin fix/ten-loi`
6. Tạo Pull Request

### Cập nhật dữ liệu

Nếu phát hiện dữ liệu mapping sai:

1. Ghi rõ mã xã (`commune_code`) và thông tin đúng
2. Tạo issue hoặc PR sửa script import

### Thêm province alias

Sửa file `src/lib/aliases.ts` — thêm alias mới với mã tỉnh tương ứng.

## Quy ước code

- TypeScript strict mode
- Không thêm dependency nếu không cần thiết
- Test với nhiều trường hợp biên (không dấu, viết tắt, sai chính tả)

## Chạy local

```bash
npm install
node scripts/import-data.mjs  # import dữ liệu (lần đầu)
npm run dev
```
