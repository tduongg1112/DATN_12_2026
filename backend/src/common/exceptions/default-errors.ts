import { HttpStatus } from '@nestjs/common';

/**
 * Câu dự phòng cho lỗi chung, khi feature chưa ném AppException với câu riêng.
 * Đây là câu kỹ thuật do Claude soạn (chưa có trong specs), chờ Dương duyệt.
 * Lỗi nghiệp vụ phải dùng câu đúng specs của feature, không dùng các câu này.
 */
export const DEFAULT_ERRORS: Record<number, { code: string; message: string }> =
  {
    [HttpStatus.BAD_REQUEST]: {
      code: 'BAD_REQUEST',
      message: 'Yêu cầu không hợp lệ',
    },
    [HttpStatus.UNAUTHORIZED]: {
      code: 'UNAUTHORIZED',
      message: 'Vui lòng đăng nhập',
    },
    [HttpStatus.FORBIDDEN]: {
      code: 'FORBIDDEN',
      message: 'Bạn không có quyền thực hiện thao tác này',
    },
    [HttpStatus.NOT_FOUND]: {
      code: 'NOT_FOUND',
      message: 'Không tìm thấy dữ liệu',
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
      code: 'INTERNAL_ERROR',
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    },
  };

export const VALIDATION_ERROR = {
  code: 'VALIDATION_ERROR',
  message: 'Dữ liệu không hợp lệ',
} as const;

export function defaultErrorFor(status: number): {
  code: string;
  message: string;
} {
  return (
    DEFAULT_ERRORS[status] ??
    (status >= 500
      ? DEFAULT_ERRORS[HttpStatus.INTERNAL_SERVER_ERROR]
      : DEFAULT_ERRORS[HttpStatus.BAD_REQUEST])
  );
}
