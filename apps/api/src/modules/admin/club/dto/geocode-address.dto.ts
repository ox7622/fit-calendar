import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GeocodeAddressDto {
    @ApiProperty({ description: 'Address to geocode into coordinates' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    address: string;
}
