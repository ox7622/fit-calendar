import { PartialType } from '@nestjs/mapped-types';

import { CreateTrainingTypeDto } from './create-training-type.dto';

export class UpdateTrainingTypeDto extends PartialType(CreateTrainingTypeDto) {}
