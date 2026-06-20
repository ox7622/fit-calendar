import { Entity, Index } from 'typeorm';

import { TaxonomyEntityBase } from './taxonomy-entity.base';

/** Admin-managed impact (load) type. `training_types.impactTypes` is a text[] of `key` values. */
@Entity('impact_types')
@Index('idx_impact_types_key', ['key'], { unique: true })
export class ImpactType extends TaxonomyEntityBase {}
