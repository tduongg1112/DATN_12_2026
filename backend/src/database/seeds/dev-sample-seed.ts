import type { EntityManager } from 'typeorm';
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

/*
 * ================================ DỮ LIỆU MẪU ================================
 * Chép từ phần 2 của `../Phân tích Class và ERD/04_Khoi_tao_CSDL_PostgreSQL.sql`.
 * CHỈ DÙNG KHI DEV. Danh sách bệnh và nhãn thật do nhóm AI cung cấp (ERD 7.2).
 * Mã nhãn theo kiểu PlantVillage, mã của lúa là giả định. Bệnh để DRAFT.
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

/** Cần chạy sau base seed (cần 5 loại cây). Chạy lại không tạo trùng. */
export async function runDevSampleSeed(
  manager: EntityManager,
): Promise<{ diseasesCreated: number; labelsCreated: number }> {
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
  return { diseasesCreated, labelsCreated };
}
