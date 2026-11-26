/*
 * ============================ NỘI DUNG BỆNH MẪU ============================
 * Claude soạn theo OQ-36 (Dương chốt 22/11). CHỈ DÙNG KHI DEV (`npm run seed:dev`),
 * không đưa vào bản demo. Nội dung thật nhập qua feature `catalog` theo nguồn chốt
 * ở OQ-19 (tài liệu Cục BVTV hoặc trung tâm khuyến nông).
 * Văn bản thuần, mỗi ý một dòng; giao diện giữ xuống dòng (disease_library BR-06).
 * ==========================================================================
 */

export interface SampleDiseaseContent {
  cropCode: string;
  name: string;
  /** Đánh dấu nổi bật để thấy thứ tự BR-03 (nổi bật trước). */
  featured: boolean;
  summary: string;
  symptoms: string;
  causes: string;
  prevention: string;
  treatment: string;
}

const lines = (...items: string[]) => items.join('\n');

export const SAMPLE_DISEASE_CONTENT: ReadonlyArray<SampleDiseaseContent> = [
  {
    cropCode: 'TOMATO',
    name: 'Bệnh mốc sương',
    featured: true,
    summary:
      'Bệnh hại nguy hiểm nhất trên cà chua, lan rất nhanh khi trời ẩm, mát và có sương mù. Lá, thân và quả đều có thể bị hại; không phòng trừ kịp thì ruộng có thể tàn lụi chỉ sau vài ngày.',
    symptoms: lines(
      'Trên lá: vết bệnh hình dạng không đều, màu xanh xám như bị nhúng nước, thường bắt đầu từ mép hoặc chóp lá, sau chuyển nâu đen.',
      'Khi trời ẩm, mặt dưới vết bệnh có lớp mốc trắng mịn như sương muối.',
      'Trên thân và cành: vết nâu đen kéo dài, chỗ bị bệnh dễ gãy gục.',
      'Trên quả: vết nâu xám, cứng, bề mặt gồ ghề, thường gặp ở quả còn xanh.',
    ),
    causes: lines(
      'Do nấm noãn Phytophthora infestans gây ra.',
      'Bệnh phát triển mạnh khi nhiệt độ 15–22 °C, độ ẩm trên 90%, có mưa phùn hoặc sương mù kéo dài, thường gặp ở vụ đông xuân.',
      'Mầm bệnh lây qua gió, nước mưa bắn và tàn dư cây bệnh. Trồng dày, bón thừa đạm, ruộng thoát nước kém làm bệnh nặng hơn.',
    ),
    prevention: lines(
      'Chọn giống ít nhiễm bệnh, cây giống khoẻ.',
      'Trồng mật độ vừa phải, làm giàn cho thông thoáng, tỉa bỏ lá già ở gốc.',
      'Lên luống cao, thoát nước tốt; tưới vào gốc, tránh tưới lên lá vào chiều tối.',
      'Bón phân cân đối, không thừa đạm, tăng kali.',
      'Không trồng cà chua gần ruộng khoai tây; luân canh với cây khác họ cà.',
    ),
    treatment: lines(
      'Ngắt bỏ lá, quả bị bệnh, mang ra khỏi ruộng để tiêu huỷ.',
      'Khi thời tiết thuận lợi cho bệnh hoặc mới thấy vết bệnh, phun thuốc có hoạt chất như mancozeb, metalaxyl kết hợp mancozeb, hoặc thuốc gốc đồng. Dùng đúng liều và thời gian cách ly ghi trên nhãn.',
      'Phun kỹ cả mặt dưới lá; nhắc lại sau 7–10 ngày nếu trời vẫn ẩm. Luân phiên các nhóm thuốc để tránh kháng thuốc.',
      'Khi cần, hỏi cán bộ bảo vệ thực vật hoặc khuyến nông địa phương.',
    ),
  },
  {
    cropCode: 'TOMATO',
    name: 'Bệnh đốm vòng (úa sớm)',
    featured: false,
    summary:
      'Bệnh phổ biến trên cà chua, thường xuất hiện ở lá già phía gốc rồi lan dần lên trên. Vết bệnh có các vòng tròn đồng tâm đặc trưng, làm lá vàng úa, rụng sớm và cây giảm năng suất.',
    symptoms: lines(
      'Vết bệnh tròn hoặc hơi góc cạnh, màu nâu sẫm, đường kính vài milimét đến khoảng 1 cm.',
      'Trên vết bệnh có các vòng tròn đồng tâm như hình bia, xung quanh thường có quầng vàng.',
      'Lá bị nhiều vết thì vàng, khô và rụng, bắt đầu từ lá già phía dưới.',
      'Trên thân và cuống quả có vết nâu lõm; quả bị thối ở phần gần cuống.',
    ),
    causes: lines(
      'Do nấm Alternaria solani gây ra.',
      'Bệnh phát triển khi trời ấm (24–29 °C), nắng mưa xen kẽ, độ ẩm cao.',
      'Cây già, thiếu dinh dưỡng, ruộng nhiều tàn dư cây bệnh dễ bị nặng. Nấm tồn tại trong đất, tàn dư và hạt giống.',
    ),
    prevention: lines(
      'Dùng hạt giống, cây giống sạch bệnh.',
      'Thu gom và tiêu huỷ tàn dư sau thu hoạch.',
      'Luân canh với cây khác họ cà ít nhất 2 năm.',
      'Bón phân đầy đủ, cân đối; tỉa lá già, lá sát mặt đất cho thông thoáng.',
    ),
    treatment: lines(
      'Ngắt bỏ lá bệnh ở gốc khi bệnh mới xuất hiện.',
      'Phun thuốc có hoạt chất như mancozeb, chlorothalonil, difenoconazole hoặc azoxystrobin theo hướng dẫn trên nhãn.',
      'Phun nhắc lại sau 7–10 ngày nếu bệnh còn phát triển, luân phiên thuốc khác nhóm.',
    ),
  },
  {
    cropCode: 'POTATO',
    name: 'Bệnh mốc sương',
    featured: false,
    summary:
      'Bệnh hại quan trọng nhất trên khoai tây, có thể làm cháy rụi cả ruộng sau vài ngày mưa phùn, ẩm lạnh. Bệnh hại lá, thân rồi lan xuống củ, làm củ thối khi bảo quản.',
    symptoms: lines(
      'Trên lá: vết xanh xám như nhúng nước ở mép hoặc chóp lá, lan nhanh thành mảng nâu đen; mặt dưới vết bệnh có mốc trắng khi trời ẩm.',
      'Trên thân: vết nâu đen, thân mềm, dễ gãy.',
      'Ruộng bị nặng có mùi hôi đặc trưng, lá khô cháy như bị lửa táp.',
      'Trên củ: vết lõm màu nâu tím trên vỏ, thịt củ bên dưới thâm nâu, dễ thối khi bảo quản.',
    ),
    causes: lines(
      'Do nấm noãn Phytophthora infestans gây ra, cùng tác nhân với bệnh mốc sương cà chua.',
      'Bệnh bùng phát khi trời mát (15–20 °C), độ ẩm cao, mưa phùn hoặc sương mù kéo dài.',
      'Nguồn bệnh từ củ giống nhiễm bệnh, tàn dư cây bệnh và các ruộng cà chua, khoai tây bị bệnh gần đó.',
    ),
    prevention: lines(
      'Dùng củ giống sạch bệnh, không dùng củ có vết thâm.',
      'Vun luống cao để che kín củ; ruộng thoát nước tốt.',
      'Bón phân cân đối, không thừa đạm.',
      'Thăm ruộng thường xuyên khi thời tiết ẩm lạnh để phát hiện sớm.',
      'Luân canh, không trồng gần ruộng cà chua.',
    ),
    treatment: lines(
      'Nhổ bỏ cây bị bệnh nặng, tiêu huỷ xa ruộng.',
      'Phun thuốc ngay khi thời tiết thuận lợi cho bệnh hoặc vừa thấy vết bệnh, dùng hoạt chất như mancozeb, metalaxyl kết hợp mancozeb, cymoxanil kết hợp mancozeb, theo hướng dẫn trên nhãn.',
      'Bệnh nặng gần thu hoạch: cắt bỏ thân lá, chờ khoảng 1–2 tuần rồi mới đào củ để bệnh không lây sang củ.',
      'Loại bỏ củ bị bệnh trước khi bảo quản.',
    ),
  },
  {
    cropCode: 'CORN',
    name: 'Bệnh gỉ sắt',
    featured: false,
    summary:
      'Bệnh nấm thường gặp trên lá ngô, tạo các ổ bột màu nâu đỏ như gỉ sắt. Bệnh nặng làm lá khô sớm, cây giảm khả năng quang hợp, bắp nhỏ và hạt lép.',
    symptoms: lines(
      'Trên cả hai mặt lá có các ổ nổi nhỏ, hình bầu dục hoặc thuôn dài, màu nâu đỏ.',
      'Khi ổ vỡ ra, bên trong có bột màu nâu gỉ sắt, sờ vào dính tay.',
      'Cuối vụ, các ổ chuyển màu nâu đen.',
      'Lá bị nặng vàng, khô từ chóp lá; bệnh có thể lan lên bẹ lá và lá bi.',
    ),
    causes: lines(
      'Do nấm Puccinia sorghi gây ra.',
      'Bệnh phát triển khi trời mát (16–25 °C), độ ẩm cao, có sương đêm.',
      'Bào tử nấm bay rất xa theo gió. Giống nhiễm bệnh, trồng dày, bón thừa đạm làm bệnh nặng hơn.',
    ),
    prevention: lines(
      'Chọn giống ngô kháng hoặc ít nhiễm bệnh gỉ sắt.',
      'Gieo trồng đúng thời vụ, mật độ hợp lý.',
      'Bón phân cân đối, tăng cường kali.',
      'Thu dọn, tiêu huỷ tàn dư cây bệnh sau thu hoạch.',
    ),
    treatment: lines(
      'Thăm đồng thường xuyên, nhất là giai đoạn trước và sau trỗ cờ.',
      'Khi bệnh xuất hiện trên lá giữa và lá trên, phun thuốc có hoạt chất như propiconazole, tebuconazole, hexaconazole hoặc azoxystrobin kết hợp difenoconazole theo hướng dẫn trên nhãn.',
      'Phun nhắc lại sau 7–10 ngày nếu bệnh vẫn lan.',
    ),
  },
  {
    cropCode: 'CHILI',
    name: 'Bệnh đốm lá vi khuẩn',
    featured: false,
    summary:
      'Bệnh do vi khuẩn, gây các đốm nhỏ màu nâu trên lá, thân và quả ớt. Bệnh lan mạnh trong mùa mưa, làm lá vàng rụng hàng loạt, quả bị vết sần và mất giá trị thương phẩm.',
    symptoms: lines(
      'Trên lá: đốm nhỏ, lúc đầu như thấm nước, sau chuyển nâu đen, có quầng vàng; nhiều đốm liên kết thành mảng khô, lá vàng và rụng.',
      'Trên quả: vết nhỏ nổi gồ, sần sùi như vảy, màu nâu.',
      'Trên thân, cành non: vết nứt dài màu nâu.',
    ),
    causes: lines(
      'Do vi khuẩn Xanthomonas spp. gây ra.',
      'Bệnh phát triển khi trời nóng ẩm (24–30 °C), mưa nhiều, mưa kèm gió.',
      'Vi khuẩn lây qua hạt giống, cây giống, nước mưa bắn, nước tưới và vết thương trên cây; tồn tại trong tàn dư cây bệnh.',
    ),
    prevention: lines(
      'Dùng hạt giống sạch bệnh; có thể xử lý hạt bằng nước ấm trước khi gieo.',
      'Luân canh với cây khác họ cà.',
      'Không tưới phun lên lá; tránh chăm sóc khi lá còn ướt để hạn chế lây lan.',
      'Lên luống cao, thoát nước tốt; trồng mật độ vừa phải.',
    ),
    treatment: lines(
      'Ngắt bỏ lá, quả bị bệnh và tiêu huỷ.',
      'Phun thuốc gốc đồng (như đồng hydroxit, đồng oxyclorua) hoặc thuốc trừ vi khuẩn được phép dùng cho ớt, theo hướng dẫn trên nhãn.',
      'Phun khi bệnh mới xuất hiện, nhắc lại sau 7 ngày trong mùa mưa. Thuốc trừ nấm thông thường không có tác dụng với bệnh do vi khuẩn.',
    ),
  },
  {
    cropCode: 'RICE',
    name: 'Bệnh tiêm lửa',
    featured: false,
    summary:
      'Bệnh nấm gây các đốm nâu hình hạt vừng trên lá và hạt lúa, thường gặp ở ruộng đất xấu, thiếu dinh dưỡng. Bệnh nặng làm lá khô, hạt lép và gạo kém chất lượng.',
    symptoms: lines(
      'Trên lá: đốm nhỏ hình bầu dục như hạt vừng, màu nâu, giữa màu xám nhạt, xung quanh có quầng vàng.',
      'Nhiều vết bệnh làm lá khô từ chóp xuống.',
      'Trên vỏ hạt: đốm nâu đen, hạt lép lửng hoặc biến màu.',
    ),
    causes: lines(
      'Do nấm Bipolaris oryzae gây ra.',
      'Bệnh nặng trên đất nghèo dinh dưỡng, thiếu kali, đất chua, ruộng bị hạn hoặc ngộ độc hữu cơ.',
      'Nấm truyền qua hạt giống và rơm rạ; lây lan nhờ gió khi trời ẩm.',
    ),
    prevention: lines(
      'Dùng hạt giống khoẻ, xử lý hạt giống trước khi gieo.',
      'Cải tạo đất: bón vôi cho đất chua, bón phân cân đối, đủ kali.',
      'Giữ đủ nước cho ruộng, tránh để ruộng bị hạn.',
      'Vệ sinh đồng ruộng, xử lý rơm rạ sau thu hoạch.',
    ),
    treatment: lines(
      'Bổ sung dinh dưỡng, nhất là kali, để cây phục hồi.',
      'Khi bệnh lan rộng, phun thuốc có hoạt chất như propiconazole, difenoconazole, hexaconazole hoặc azoxystrobin theo hướng dẫn trên nhãn, ưu tiên giai đoạn trước trỗ để bảo vệ hạt.',
    ),
  },
];

/*
 * ========================= GỢI Ý CHĂM SÓC MẪU (OQ-41) =========================
 * Claude soạn, Dương chốt 22/11 (mở rộng OQ-36). CHỈ DÙNG KHI DEV. Hiện ở kết quả
 * "Cây khoẻ mạnh" (diagnosis BR-16). Nội dung thật nhập qua feature `catalog`.
 * ============================================================================
 */
export const SAMPLE_CROP_CARE_GUIDES: ReadonlyArray<{
  cropCode: string;
  careGuide: string;
}> = [
  {
    cropCode: 'RICE',
    careGuide: lines(
      'Giữ mực nước ruộng ổn định, không để ruộng khô nứt trong giai đoạn làm đòng và trỗ.',
      'Bón phân cân đối theo từng giai đoạn, không bón thừa đạm; bổ sung kali để cây cứng, ít đổ ngã.',
      'Cấy hoặc sạ với mật độ vừa phải để ruộng thông thoáng.',
      'Thăm đồng mỗi tuần, chú ý mặt lá, bẹ lá và gốc lúa để phát hiện sớm sâu bệnh.',
      'Làm sạch cỏ dại và bờ ruộng; xử lý rơm rạ sau thu hoạch.',
    ),
  },
  {
    cropCode: 'CORN',
    careGuide: lines(
      'Tưới đủ ẩm, nhất là giai đoạn trổ cờ, phun râu và vào chắc hạt; tránh để ruộng úng nước.',
      'Bón lót đầy đủ, bón thúc khi cây 3–5 lá và 7–9 lá; vun gốc sau mỗi lần bón.',
      'Làm cỏ sạch, giữ ruộng thông thoáng.',
      'Kiểm tra mặt dưới lá và nõn ngô mỗi tuần để phát hiện sớm sâu, bệnh.',
      'Luân canh với cây trồng khác họ để giảm nguồn bệnh trong đất.',
    ),
  },
  {
    cropCode: 'TOMATO',
    careGuide: lines(
      'Tưới vào gốc vào buổi sáng, giữ đất đủ ẩm đều; tránh tưới lên lá vào chiều tối.',
      'Làm giàn sớm, tỉa nhánh phụ và lá già ở gốc để cây thông thoáng.',
      'Bón phân cân đối, tăng kali và canxi khi cây ra hoa, đậu quả.',
      'Phủ gốc bằng rơm hoặc màng phủ để hạn chế đất bắn lên lá.',
      'Kiểm tra lá, thân và quả hai lần mỗi tuần, nhất là khi trời ẩm, có sương.',
    ),
  },
  {
    cropCode: 'CHILI',
    careGuide: lines(
      'Lên luống cao, thoát nước tốt; ớt không chịu được úng.',
      'Tưới đều, giữ ẩm vừa phải; tránh để đất lúc quá khô lúc quá ướt làm cây rụng hoa, rụng quả.',
      'Bón phân cân đối, bón thúc định kỳ sau mỗi đợt thu hái.',
      'Tỉa bỏ lá già, cành sát gốc để gốc thông thoáng.',
      'Kiểm tra mặt dưới lá và đọt non mỗi tuần để phát hiện sớm sâu, bệnh.',
    ),
  },
  {
    cropCode: 'POTATO',
    careGuide: lines(
      'Dùng củ giống sạch bệnh, đã nảy mầm đều.',
      'Vun luống cao, vun gốc 2–3 lần để củ không lộ ra ánh sáng và ruộng thoát nước tốt.',
      'Tưới rãnh giữ ẩm đều, không để nước ngập luống; ngừng tưới trước khi thu hoạch khoảng 10 ngày.',
      'Bón phân cân đối, đủ kali để củ chắc.',
      'Không trồng gần ruộng cà chua; kiểm tra lá thường xuyên khi trời âm u, có sương.',
    ),
  },
];

/*
 * ===================== CHU KỲ CHĂM SÓC, NGÀY KIỂM TRA LẠI MẪU (OQ-52) =====================
 * Claude soạn, Dương chốt 23/11. CHỈ DÙNG KHI DEV, để thử gợi ý nhắc (my_plants BR-18,
 * diagnosis BR-26). Giá trị thật: docs/_shared/real_data_needed.md (B4, B7).
 * ===========================================================================================
 */
export const SAMPLE_CROP_INTERVALS: ReadonlyArray<{
  cropCode: string;
  /** null: không gợi ý (lúa là ruộng nước). */
  wateringDays: number | null;
  fertilizingDays: number;
}> = [
  { cropCode: 'RICE', wateringDays: null, fertilizingDays: 20 },
  { cropCode: 'CORN', wateringDays: 3, fertilizingDays: 21 },
  { cropCode: 'TOMATO', wateringDays: 2, fertilizingDays: 14 },
  { cropCode: 'CHILI', wateringDays: 2, fertilizingDays: 14 },
  { cropCode: 'POTATO', wateringDays: 3, fertilizingDays: 14 },
];

/** Số ngày nên kiểm tra lại cho mọi bệnh mẫu. */
export const SAMPLE_RECHECK_DAYS = 7;
