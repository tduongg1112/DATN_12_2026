import { Transform } from 'class-transformer';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { isPasswordStrongEnough } from '../password.js';

/** Cắt khoảng trắng hai đầu (chỉ với chuỗi). */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** BR-14: email cắt khoảng trắng và đổi về chữ thường trước khi kiểm tra, lưu. */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** BR-05: ít nhất 8 ký tự, có cả chữ và số. */
export function IsStrongPassword(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isPasswordStrongEnough(value),
      },
    });
}

/** Trường này phải trùng trường `property` (xác nhận mật khẩu, BR-05). */
export function MatchesProperty(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'matchesProperty',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate: (value: unknown, args: ValidationArguments) => {
          const [other] = args.constraints as [string];
          return value === (args.object as Record<string, unknown>)[other];
        },
      },
    });
}
