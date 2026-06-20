import { PartialType } from '@nestjs/mapped-types';

import { CreateTaxonomyDto } from './create-taxonomy.dto';

/** All fields optional. `key` is immutable and never accepted here. */
export class UpdateTaxonomyDto extends PartialType(CreateTaxonomyDto) {}
