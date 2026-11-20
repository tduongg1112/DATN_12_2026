# Test plan — <feature>

> **Trạng thái:** DRAFT

1. **Phạm vi:** trong phạm vi (US/BR) · ngoài phạm vi (lý do)
2. **Loại test:** Unit (vitest) · API e2e (vitest + supertest) · UI (thủ công hoặc theo TD-10) · Nghiệm thu với nhóm AI (nếu có)
3. **Môi trường:** URL và cổng · nhánh và commit · CSDL (docker compose) · AI service (mock hoặc phiên bản mô hình)
4. **Dữ liệu test:** tài khoản USER/ADMIN dùng để test, dữ liệu seed, ảnh mẫu (đúng định dạng, sai định dạng, > 10 MB, ảnh không phải lá…)
5. **Tiêu chí:** PASS khi 100% TC pass, không có lỗi mức Chặn · tiêu chí dừng
6. **Rủi ro:** phụ thuộc OQ, TD chưa chốt
7. **Lịch:** ngày dự kiến chạy
