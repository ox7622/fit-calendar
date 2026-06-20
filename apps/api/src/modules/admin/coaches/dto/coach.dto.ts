import { Coach } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

export class CoachDto {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
    @ApiProperty({ nullable: true, type: String }) bio: string | null;
    @ApiProperty({ nullable: true, type: String }) photoUrl: string | null;
    @ApiProperty({ type: [String] }) specializations: string[];
    @ApiProperty({ type: [String] }) certifications: string[];
    @ApiProperty() isActive: boolean;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}

export class CoachOptionDto {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
}

export function toCoachDto(coach: Coach): CoachDto {
    return {
        id: coach.id,
        name: coach.name,
        bio: coach.bio,
        photoUrl: coach.photoUrl,
        specializations: coach.specializations,
        certifications: coach.certifications,
        isActive: coach.isActive,
        createdAt: coach.createdAt,
        updatedAt: coach.updatedAt,
    };
}
