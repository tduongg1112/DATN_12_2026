import 'reflect-metadata';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { DataSource } from 'typeorm';
import {
  DatabaseEnvironment,
  validateWith,
} from '../../config/env.validation.js';
import { buildDataSourceOptions } from '../typeorm-options.js';
import { runBaseSeed } from './base-seed.js';
import { runDevSampleSeed } from './dev-sample-seed.js';

class SeedEnvironment extends DatabaseEnvironment {
  @IsEmail()
  ADMIN_EMAIL: string;

  @IsString()
  @MinLength(8)
  ADMIN_PASSWORD: string;
}

/**
 * `npm run seed`      : 1 ADMIN + 5 loại cây.
 * `npm run seed:dev`  : như trên + DỮ LIỆU MẪU (6 bệnh, 11 nhãn) từ SQL 04, kèm nội dung
 *                       bệnh mẫu (OQ-36), gợi ý chăm sóc mẫu (OQ-41), chu kỳ tưới/bón và số
 *                       ngày kiểm tra lại mẫu (OQ-52) Claude soạn, chỉ cho dev.
 */
async function main() {
  const withDevSample = process.argv.includes('--dev');
  const env = validateWith(SeedEnvironment, process.env);
  const dataSource = new DataSource(buildDataSourceOptions(env));
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const base = await runBaseSeed(manager, {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      });
      console.log(
        `[seed] ADMIN: ${base.adminCreated ? 'đã tạo' : 'đã có, giữ nguyên'}; loại cây mới: ${base.cropsCreated}`,
      );
      if (withDevSample) {
        const dev = await runDevSampleSeed(manager);
        console.log(
          `[seed:dev] DỮ LIỆU MẪU (chỉ dùng khi dev): bệnh mới ${dev.diseasesCreated}, bệnh được điền nội dung mẫu và công khai ${dev.diseasesFilled}, nhãn mới ${dev.labelsCreated}, loại cây được điền gợi ý chăm sóc mẫu ${dev.careGuidesFilled}, chu kỳ tưới/bón mẫu ${dev.intervalsFilled}, bệnh được điền số ngày kiểm tra lại ${dev.recheckDaysFilled}`,
        );
      }
    });
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error('[seed] Lỗi:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
