import { Entity, Index } from 'typeorm';

import { TaxonomyEntityBase } from './taxonomy-entity.base';

/** Admin-managed difficulty level. `training_types.difficulty` references `key`. */
@Entity('difficulty_levels')
@Index('idx_difficulty_levels_key', ['key'], { unique: true })
export class DifficultyLevel extends TaxonomyEntityBase {}
