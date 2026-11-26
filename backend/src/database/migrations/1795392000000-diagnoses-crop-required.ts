import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * OQ-05 (chốt 22/11): chọn loại cây khi chẩn đoán là bắt buộc, nên `diagnoses.crop_id`
 * chuyển NOT NULL (data_model.md; database_design_diagnosis.md mục 4).
 * Còn lượt nào chưa có `crop_id` thì dừng và báo, không tự đoán loại cây.
 */
export class DiagnosesCropRequired1795392000000 implements MigrationInterface {
  name = 'DiagnosesCropRequired1795392000000';

  public async up(q: QueryRunner): Promise<void> {
    const [row] = (await q.query(
      `SELECT COUNT(*)::int AS count FROM diagnoses WHERE crop_id IS NULL`,
    )) as { count: number }[];
    if (row.count > 0) {
      throw new Error(
        `Còn ${row.count} lượt chẩn đoán chưa có crop_id. Cần gán loại cây cho các lượt này trước khi chạy migration (OQ-05).`,
      );
    }
    await q.query(`ALTER TABLE diagnoses ALTER COLUMN crop_id SET NOT NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE diagnoses ALTER COLUMN crop_id DROP NOT NULL`);
  }
}
