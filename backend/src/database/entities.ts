import { User } from '../modules/accounts/entities/user.entity.js';
import { Crop } from '../modules/catalog/entities/crop.entity.js';
import { Disease } from '../modules/catalog/entities/disease.entity.js';
import { DiseaseImage } from '../modules/catalog/entities/disease-image.entity.js';
import { ModelLabel } from '../modules/catalog/entities/model-label.entity.js';
import { Diagnosis } from '../modules/diagnosis/entities/diagnosis.entity.js';
import { DiagnosisPrediction } from '../modules/diagnosis/entities/diagnosis-prediction.entity.js';
import { Notification } from '../modules/plants/entities/notification.entity.js';
import { PlantLog } from '../modules/plants/entities/plant-log.entity.js';
import { Plant } from '../modules/plants/entities/plant.entity.js';
import { Reminder } from '../modules/plants/entities/reminder.entity.js';

/** 11 bảng của data_model.md, liệt kê tường minh (không dùng glob để chạy được với ESM). */
export const ENTITIES = [
  User,
  Crop,
  Disease,
  DiseaseImage,
  ModelLabel,
  Plant,
  PlantLog,
  Reminder,
  Notification,
  Diagnosis,
  DiagnosisPrediction,
];
