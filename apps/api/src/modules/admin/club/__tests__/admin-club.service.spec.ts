import { ClubInfo } from '@fitcalendar/db';
import { BadRequestException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CloudinaryService } from '../../uploads/cloudinary.service';
import { AdminClubService } from '../admin-club.service';

const buildClub = (overrides: Partial<ClubInfo> = {}): ClubInfo =>
    ({
        id: 'club-1',
        name: 'Fit Calendar Club',
        address: 'ул. Тестовая, 1',
        phone: null,
        workingHours: { monday: { open: '09:00', close: '22:00' }, sunday: null },
        latitude: null,
        longitude: null,
        logoUrl: null,
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    } as ClubInfo);

describe('AdminClubService', () => {
    let service: AdminClubService;
    let clubRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
    let cloudinary: jest.Mocked<Pick<CloudinaryService, 'uploadClubLogo'>>;

    beforeEach(async () => {
        clubRepo = {
            findOne: jest.fn(),
            create: jest.fn((dto) => dto as ClubInfo),
            save: jest.fn(async (entity) => entity as ClubInfo),
        };
        cloudinary = { uploadClubLogo: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminClubService,
                { provide: getRepositoryToken(ClubInfo), useValue: clubRepo },
                { provide: CloudinaryService, useValue: cloudinary },
            ],
        }).compile();

        service = module.get(AdminClubService);
    });

    describe('getOrCreate', () => {
        it('returns existing singleton when one exists', async () => {
            clubRepo.findOne.mockResolvedValueOnce(buildClub({ id: 'existing' }));

            const result = await service.getOrCreate();

            expect(result.id).toBe('existing');
            expect(clubRepo.save).not.toHaveBeenCalled();
        });

        it('auto-creates default record when table is empty', async () => {
            clubRepo.findOne.mockResolvedValueOnce(null);
            clubRepo.save.mockResolvedValueOnce(buildClub({ id: 'new', name: 'Fit Calendar Club' }));

            const result = await service.getOrCreate();

            expect(clubRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Fit Calendar Club',
                    workingHours: expect.objectContaining({ monday: expect.any(Object) }),
                }),
            );
            expect(result.id).toBe('new');
        });
    });

    describe('update', () => {
        it('merges and persists fields including null phone', async () => {
            const existing = buildClub();
            clubRepo.findOne.mockResolvedValueOnce(existing);
            clubRepo.save.mockResolvedValueOnce({
                ...existing,
                name: 'Updated Club',
                phone: '+7 999 555-12-34',
            } as ClubInfo);

            const result = await service.update({
                name: 'Updated Club',
                address: 'ул. Новая, 2',
                phone: '+7 999 555-12-34',
                workingHours: { monday: { open: '08:00', close: '23:00' }, sunday: null },
            });

            expect(result.name).toBe('Updated Club');
            expect(existing.address).toBe('ул. Новая, 2');
            expect(existing.phone).toBe('+7 999 555-12-34');
        });

        it('rejects when only latitude is provided (paired guard from AC5)', async () => {
            clubRepo.findOne.mockResolvedValueOnce(buildClub());

            await expect(
                service.update({
                    name: 'X',
                    address: '',
                    workingHours: {},
                    latitude: 55.7,
                }),
            ).rejects.toThrow(BadRequestException);
            expect(clubRepo.save).not.toHaveBeenCalled();
        });

        it('accepts both lat + lon together', async () => {
            const existing = buildClub();
            clubRepo.findOne.mockResolvedValueOnce(existing);

            await service.update({
                name: 'X',
                address: '',
                workingHours: {},
                latitude: 55.7,
                longitude: 37.6,
            });

            expect(existing.latitude).toBe(55.7);
            expect(existing.longitude).toBe(37.6);
        });

        it('persists working hours with closed days as null', async () => {
            const existing = buildClub();
            clubRepo.findOne.mockResolvedValueOnce(existing);

            await service.update({
                name: 'X',
                address: '',
                workingHours: {
                    monday: { open: '09:00', close: '22:00' },
                    sunday: null,
                },
            });

            expect(existing.workingHours.sunday).toBeNull();
            expect(existing.workingHours.monday).toEqual({ open: '09:00', close: '22:00' });
        });
    });

    describe('setLogo', () => {
        it('uploads via Cloudinary, persists URL on the singleton', async () => {
            const existing = buildClub();
            clubRepo.findOne.mockResolvedValueOnce(existing);
            cloudinary.uploadClubLogo.mockResolvedValueOnce('https://cdn.example/club-logo.jpg');

            const result = await service.setLogo(Buffer.from('logo'));

            expect(result.logoUrl).toBe('https://cdn.example/club-logo.jpg');
            expect(existing.logoUrl).toBe('https://cdn.example/club-logo.jpg');
        });

        it('auto-creates singleton if setLogo is the first ever call', async () => {
            clubRepo.findOne.mockResolvedValueOnce(null);
            clubRepo.save.mockImplementationOnce(async (entity) => entity as ClubInfo);
            cloudinary.uploadClubLogo.mockResolvedValueOnce('https://cdn.example/club-logo.jpg');

            const result = await service.setLogo(Buffer.from('logo'));

            expect(clubRepo.create).toHaveBeenCalled();
            expect(result.logoUrl).toBe('https://cdn.example/club-logo.jpg');
        });
    });
});
