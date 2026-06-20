import { ApiProperty } from '@nestjs/swagger';

export class CoachSummaryDto {
    @ApiProperty({ description: 'Coach UUID' })
    id: string;

    @ApiProperty({ description: 'Coach display name' })
    name: string;

    @ApiProperty({ description: 'Coach photo URL', nullable: true })
    photoUrl: string | null;

    @ApiProperty({ description: 'Coach specializations', type: [String] })
    specializations: string[];
}
