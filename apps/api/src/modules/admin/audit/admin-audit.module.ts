import { AdminAuditLog } from '@fitcalendar/db';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuditService } from './admin-audit.service';

// Global so feature modules can inject AdminAuditService without each having
// to import TypeOrmModule.forFeature([AdminAuditLog]) themselves. The audit
// surface is small (one service, one entity), so the global trade-off is
// worth it for the call-site ergonomics.
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([AdminAuditLog])],
    providers: [AdminAuditService],
    exports: [AdminAuditService],
})
export class AdminAuditModule {}
