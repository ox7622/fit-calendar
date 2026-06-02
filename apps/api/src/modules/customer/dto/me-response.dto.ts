import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';

import { CustomerResponseDto } from './customer-response.dto';

export class TelegramIdentityDto {
    @ApiProperty({ example: 'Иван' }) firstName: string;
    @ApiProperty({ nullable: true, required: false, example: 'ivan_petrov' }) username?: string | null;
}

export class MeLinkedDto {
    @ApiProperty({ example: true }) linked: true;
    @ApiProperty({ type: CustomerResponseDto }) customer: CustomerResponseDto;
}

export class MeUnlinkedDto {
    @ApiProperty({ example: false }) linked: false;
    @ApiProperty({ type: TelegramIdentityDto }) telegramIdentity: TelegramIdentityDto;
}

@ApiExtraModels(MeLinkedDto, MeUnlinkedDto)
export class MeResponseDto {
    static readonly schemaRef = {
        oneOf: [{ $ref: getSchemaPath(MeLinkedDto) }, { $ref: getSchemaPath(MeUnlinkedDto) }],
    };
}
