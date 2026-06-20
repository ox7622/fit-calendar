import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const VALID_DAYS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

function isHhMm(value: unknown): value is string {
    return typeof value === 'string' && HH_MM.test(value);
}

/**
 * Returns the first validation problem with a working-hours map, or null when
 * the map is valid. Pure (no shared state) so it can back both the boolean
 * check and the error message without a class-validator instance-reuse bug.
 */
function findWorkingHoursError(value: unknown): string | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return 'workingHours должен быть объектом';
    }

    for (const [day, entry] of Object.entries(value as Record<string, unknown>)) {
        if (!VALID_DAYS.has(day)) {
            return `${day}: недопустимый день (ожидается monday..sunday)`;
        }

        // null = closed that day, always allowed.
        if (entry === null) continue;

        if (typeof entry !== 'object' || Array.isArray(entry)) {
            return `${day}: ожидается объект { open, close } или null`;
        }

        const { open, close } = entry as Record<string, unknown>;
        if (!isHhMm(open)) return `${day}.open должен быть временем в формате HH:mm`;
        if (!isHhMm(close)) return `${day}.close должен быть временем в формате HH:mm`;
        if (close <= open) return `${day}.close должен быть позже ${day}.open`;
    }

    return null;
}

/**
 * `workingHours` is a dynamic-key map (monday..sunday -> hours | null), not an
 * array of DTOs. class-validator's @ValidateNested({ each }) + @Type only handle
 * arrays / single objects, so a map needs a dedicated constraint that validates
 * each value independently.
 */
@ValidatorConstraint({ name: 'isWorkingHours', async: false })
export class IsWorkingHoursConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        return findWorkingHoursError(value) === null;
    }

    defaultMessage(args: ValidationArguments): string {
        return findWorkingHoursError(args.value) ?? 'workingHours имеет некорректное значение';
    }
}

export function IsWorkingHours(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string): void {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsWorkingHoursConstraint,
        });
    };
}
