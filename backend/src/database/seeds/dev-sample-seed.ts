import { IsNull, type EntityManager } from 'typeorm';
import { Crop } from '../../modules/catalog/entities/crop.entity.js';
import {
  Disease,
  type PathogenGroup,
  type Severity,
} from '../../modules/catalog/entities/disease.entity.js';
import {
  ModelLabel,
  type LabelType,
} from '../../modules/catalog/entities/model-label.entity.js';
import {
  SAMPLE_CROP_CARE_GUIDES,
  SAMPLE_CROP_INTERVALS,
  SAMPLE_DISEASE_CONTENT,
  SAMPLE_RECHECK_DAYS,
} from './dev-sample-content.js';

/*
 * ================================ DỮ LIỆU MẪU ================================
 * Chép từ phần 2 của `../Phân tích Class và ERD/04_Khoi_tao_CSDL_PostgreSQL.sql`.
 * CHỈ DÙNG KHI DEV. Danh sách bệnh và nhãn thật do nhóm AI cung cấp (ERD 7.2).
 * Mã nhãn theo kiểu PlantVillage, mã của lúa là giả định. Bệnh tạo ở DRAFT, rồi được
 * điền nội dung mẫu (`dev-sample-content.ts`, OQ-36) và chuyển PUBLISHED.
 * ==============================================================================
 */
export const SAMPLE_DISEASES: ReadonlyArray<{
  cropCode: string;
  name: string;
  pathogen: string;
  pathogenGroup: PathogenGroup;
  severity: Severity;
}> = [
  {
    cropCode: 'TOMATO',
    name: 'Bệnh mốc sương',
    pathogen: 'Phytophthora infestans',
    pathogenGroup: 'FUNGUS',
    severity: 'HIGH',
  },
  {
    cropCode: 'TOMATO',
    name: 'Bệnh đốm vòng (úa sớm)',
    pathogen: 'Alternaria solani',
    pathogenGroup: 'FUNGUS',
    severity: 'MEDIUM',
  },
  {
    cropCode: 'POTATO',
    name: 'Bệnh mốc sương',
    pathogen: 'Phytophthora infestans',
    pathogenGroup: 'FUNGUS',
    severity: 'HIGH',
  },
  {
    cropCode: 'CORN',
    name: 'Bệnh gỉ sắt',
    pathogen: 'Puccinia sorghi',
    pathogenGroup: 'FUNGUS',
    severity: 'MEDIUM',
  },
  {
    cropCode: 'CHILI',
    name: 'Bệnh đốm lá vi khuẩn',
    pathogen: 'Xanthomonas spp.',
    pathogenGroup: 'BACTERIA',
    severity: 'MEDIUM',
  },
  {
    cropCode: 'RICE',
    name: 'Bệnh tiêm lửa',
    pathogen: 'Bipolaris oryzae',
    pathogenGroup: 'FUNGUS',
    severity: 'MEDIUM',
  },
];

export const SAMPLE_LABELS: ReadonlyArray<{
  classCode: string;
  labelType: LabelType;
  cropCode: string;
  diseaseName: string | null;
}> = [
  {
    classCode: 'Tomato___healthy',
    labelType: 'HEALTHY',
    cropCode: 'TOMATO',
    diseaseName: null,
  },
  {
    classCode: 'Tomato___Late_blight',
    labelType: 'DISEASE',
    cropCode: 'TOMATO',
    diseaseName: 'Bệnh mốc sương',
  },
  {
    classCode: 'Tomato___Early_blight',
    labelType: 'DISEASE',
    cropCode: 'TOMATO',
    diseaseName: 'Bệnh đốm vòng (úa sớm)',
  },
  {
    classCode: 'Potato___healthy',
    labelType: 'HEALTHY',
    cropCode: 'POTATO',
    diseaseName: null,
  },
  {
    classCode: 'Potato___Late_blight',
    labelType: 'DISEASE',
    cropCode: 'POTATO',
    diseaseName: 'Bệnh mốc sương',
  },
  {
    classCode: 'Corn_(maize)___healthy',
    labelType: 'HEALTHY',
    cropCode: 'CORN',
    diseaseName: null,
  },
  {
    classCode: 'Corn_(maize)___Common_rust_',
    labelType: 'DISEASE',
    cropCode: 'CORN',
    diseaseName: 'Bệnh gỉ sắt',
  },
  {
    classCode: 'Pepper,_bell___healthy',
    labelType: 'HEALTHY',
    cropCode: 'CHILI',
    diseaseName: null,
  },
  {
    classCode: 'Pepper,_bell___Bacterial_spot',
    labelType: 'DISEASE',
    cropCode: 'CHILI',
    diseaseName: 'Bệnh đốm lá vi khuẩn',
  },
  {
    classCode: 'Rice___healthy',
    labelType: 'HEALTHY',
    cropCode: 'RICE',
    diseaseName: null,
  },
  {
    classCode: 'Rice___Brown_spot',
    labelType: 'DISEASE',
    cropCode: 'RICE',
    diseaseName: 'Bệnh tiêm lửa',
  },
];

/**
 * Điền nội dung mẫu (OQ-36) cho bệnh mẫu **chưa có nội dung** (`summary IS NULL`), rồi
 * công khai. Bệnh đã có nội dung (nhập tay hoặc seed lần trước) giữ nguyên, nên chạy lại
 * không đổi gì (database_design_disease_library.md mục 4).
 */
async function fillSampleContent(
  manager: EntityManager,
  cropId: (code: string) => number,
): Promise<number> {
  const diseases = manager.getRepository(Disease);
  let filled = 0;
  for (const [index, c] of SAMPLE_DISEASE_CONTENT.entries()) {
    const disease = await diseases.findOneBy({
      cropId: cropId(c.cropCode),
      name: c.name,
      summary: IsNull(),
    });
    if (!disease) continue;
    await diseases.update(disease.id, {
      summary: c.summary,
      symptoms: c.symptoms,
      causes: c.causes,
      prevention: c.prevention,
      treatment: c.treatment,
      isFeatured: c.featured,
      status: 'PUBLISHED',
      // Lệch nhau 1 phút để thứ tự theo `published_at` (BR-03) ổn định.
      publishedAt: disease.publishedAt ?? new Date(Date.now() - index * 60_000),
    });
    filled++;
  }
  return filled;
}

/**
 * Điền gợi ý chăm sóc mẫu (OQ-41) cho loại cây **chưa có** (`care_guide IS NULL`).
 * Loại cây đã có gợi ý giữ nguyên (database_design_diagnosis.md mục 4).
 */
async function fillSampleCareGuides(manager: EntityManager): Promise<number> {
  const crops = manager.getRepository(Crop);
  let filled = 0;
  for (const c of SAMPLE_CROP_CARE_GUIDES) {
    const result = await crops.update(
      { code: c.cropCode, careGuide: IsNull() },
      { careGuide: c.careGuide },
    );
    filled += result.affected ?? 0;
  }
  return filled;
}

/**
 * Điền chu kỳ tưới, bón (OQ-52) cho loại cây **chưa có** cả hai giá trị, và số ngày kiểm tra
 * lại cho bệnh mẫu chưa có. Giá trị đã nhập giữ nguyên.
 */
async function fillSampleIntervals(
  manager: EntityManager,
): Promise<{ crops: number; diseases: number }> {
  const crops = manager.getRepository(Crop);
  let cropsFilled = 0;
  for (const c of SAMPLE_CROP_INTERVALS) {
    const result = await crops.update(
      {
        code: c.cropCode,
        wateringIntervalDays: IsNull(),
        fertilizingIntervalDays: IsNull(),
      },
      {
        wateringIntervalDays: c.wateringDays,
        fertilizingIntervalDays: c.fertilizingDays,
      },
    );
    cropsFilled += result.affected ?? 0;
  }
  let diseasesFilled = 0;
  for (const d of SAMPLE_DISEASES) {
    const crop = await crops.findOneBy({ code: d.cropCode });
    if (!crop) continue;
    const result = await manager
      .getRepository(Disease)
      .update(
        { cropId: crop.id, name: d.name, recheckDays: IsNull() },
        { recheckDays: SAMPLE_RECHECK_DAYS },
      );
    diseasesFilled += result.affected ?? 0;
  }
  return { crops: cropsFilled, diseases: diseasesFilled };
}

/** Cần chạy sau base seed (cần 5 loại cây). Chạy lại không tạo trùng. */
export async function runDevSampleSeed(manager: EntityManager): Promise<{
  diseasesCreated: number;
  diseasesFilled: number;
  labelsCreated: number;
  careGuidesFilled: number;
  intervalsFilled: number;
  recheckDaysFilled: number;
}> {
  const crops = await manager.getRepository(Crop).find();
  const cropId = (code: string) => {
    const crop = crops.find((c) => c.code === code);
    if (!crop)
      throw new Error(`Chưa có loại cây ${code}. Chạy "npm run seed" trước.`);
    return crop.id;
  };

  const diseases = manager.getRepository(Disease);
  let diseasesCreated = 0;
  for (const d of SAMPLE_DISEASES) {
    const where = { cropId: cropId(d.cropCode), name: d.name };
    if (!(await diseases.existsBy(where))) {
      await diseases.insert({
        ...where,
        pathogen: d.pathogen,
        pathogenGroup: d.pathogenGroup,
        severity: d.severity,
        status: 'DRAFT',
      });
      diseasesCreated++;
    }
  }

  const labels = manager.getRepository(ModelLabel);
  let labelsCreated = 0;
  for (const l of SAMPLE_LABELS) {
    if (await labels.existsBy({ classCode: l.classCode })) continue;
    const labelCropId = cropId(l.cropCode);
    const diseaseId = l.diseaseName
      ? (
          await diseases.findOneByOrFail({
            cropId: labelCropId,
            name: l.diseaseName,
          })
        ).id
      : null;
    await labels.insert({
      classCode: l.classCode,
      labelType: l.labelType,
      cropId: labelCropId,
      diseaseId,
    });
    labelsCreated++;
  }
  const diseasesFilled = await fillSampleContent(manager, cropId);
  const careGuidesFilled = await fillSampleCareGuides(manager);
  const intervals = await fillSampleIntervals(manager);
  return {
    diseasesCreated,
    diseasesFilled,
    labelsCreated,
    careGuidesFilled,
    intervalsFilled: intervals.crops,
    recheckDaysFilled: intervals.diseases,
  };
}
