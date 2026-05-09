import { AppDataSource } from '../data-source';
import { Coach, TrainingType, ScheduleEntry, ClubInfo, AdminUser } from '../entities';

// Pre-computed bcrypt hash for 'admin123' with 10 rounds.
// Generated with: bcrypt.hashSync('admin123', 10)
// Verified: bcrypt.compareSync('admin123', ADMIN_PASSWORD_HASH) === true.
const ADMIN_PASSWORD_HASH = '$2b$10$wLyEbcqjO2XRX43gDQ/xyOKG/RutZ8AODjJ7KfbBDS6PZq6nrOdKO';

async function seed(): Promise<void> {
    await AppDataSource.initialize();
    console.log('Database connected. Starting seed...');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // 1. Seed ClubInfo (singleton)
        const clubInfoRepo = queryRunner.manager.getRepository(ClubInfo);
        const existingClub = await clubInfoRepo.find();
        if (existingClub.length === 0) {
            const clubInfo = clubInfoRepo.create({
                name: 'FitCalendar Gym',
                address: 'ул. Спортивная, 15, Москва, 123456',
                phone: '+7 (495) 123-45-67',
                workingHours: {
                    monday: { open: '07:00', close: '23:00' },
                    tuesday: { open: '07:00', close: '23:00' },
                    wednesday: { open: '07:00', close: '23:00' },
                    thursday: { open: '07:00', close: '23:00' },
                    friday: { open: '07:00', close: '23:00' },
                    saturday: { open: '09:00', close: '21:00' },
                    sunday: { open: '09:00', close: '21:00' },
                },
                latitude: 55.7558,
                longitude: 37.6173,
            });
            await clubInfoRepo.save(clubInfo);
            console.log('ClubInfo seeded');
        }

        // 2. Seed AdminUser (default admin)
        const adminRepo = queryRunner.manager.getRepository(AdminUser);
        const existingAdmin = await adminRepo.findOne({ where: { email: 'admin@fitcalendar.ru' } });
        if (!existingAdmin) {
            const admin = adminRepo.create({
                email: 'admin@fitcalendar.ru',
                passwordHash: ADMIN_PASSWORD_HASH,
                name: 'Admin',
                isActive: true,
            });
            await adminRepo.save(admin);
            console.log('AdminUser seeded');
        }

        // 3. Seed Coaches
        const coachRepo = queryRunner.manager.getRepository(Coach);
        const existingCoaches = await coachRepo.find();
        const coaches: Coach[] = [];
        if (existingCoaches.length === 0) {
            const coachData = [
                {
                    name: 'Мария Иванова',
                    bio: 'Сертифицированный инструктор по йоге с 10-летним опытом',
                    specializations: ['yoga', 'pilates', 'stretching'],
                    certifications: ['RYT-500', 'Pilates Instructor'],
                },
                {
                    name: 'Алексей Петров',
                    bio: 'Мастер спорта по тяжелой атлетике',
                    specializations: ['strength', 'crossfit', 'weightlifting'],
                    certifications: ['NSCA-CPT', 'CrossFit L2'],
                },
                {
                    name: 'Елена Смирнова',
                    bio: 'Фитнес-тренер, специалист по кардио и танцевальным программам',
                    specializations: ['cardio', 'dance', 'aerobics'],
                    certifications: ['ACE Certified', 'Zumba Instructor'],
                },
                {
                    name: 'Дмитрий Козлов',
                    bio: 'Персональный тренер, специалист по функциональному тренингу',
                    specializations: ['functional', 'hiit', 'boxing'],
                    certifications: ['NASM-CPT', 'TRX Certified'],
                },
            ];

            for (const data of coachData) {
                const coach = coachRepo.create({
                    ...data,
                    isActive: true,
                });
                const saved = await coachRepo.save(coach);
                coaches.push(saved);
            }
            console.log(`${coaches.length} Coaches seeded`);
        } else {
            coaches.push(...existingCoaches);
        }

        // 4. Seed TrainingTypes
        const trainingTypeRepo = queryRunner.manager.getRepository(TrainingType);
        const existingTypes = await trainingTypeRepo.find();
        const trainingTypes: TrainingType[] = [];
        if (existingTypes.length === 0) {
            const typeData = [
                {
                    name: 'Йога',
                    description: 'Классическая хатха-йога для всех уровней подготовки',
                    difficulty: 'beginner' as const,
                    impactTypes: ['flexibility', 'balance'] as const,
                    equipment: ['коврик'],
                },
                {
                    name: 'Силовая тренировка',
                    description: 'Тренировка с отягощениями для развития силы',
                    difficulty: 'intermediate' as const,
                    impactTypes: ['strength'] as const,
                    equipment: ['гантели', 'штанга', 'тренажеры'],
                },
                {
                    name: 'HIIT',
                    description: 'Высокоинтенсивная интервальная тренировка',
                    difficulty: 'advanced' as const,
                    impactTypes: ['cardio', 'strength'] as const,
                    equipment: ['гири', 'скакалка'],
                },
                {
                    name: 'Пилатес',
                    description: 'Система упражнений для укрепления мышц кора',
                    difficulty: 'beginner' as const,
                    impactTypes: ['flexibility', 'strength'] as const,
                    equipment: ['коврик', 'мяч'],
                },
                {
                    name: 'Кардио-танцы',
                    description: 'Танцевальная кардио-тренировка',
                    difficulty: 'beginner' as const,
                    impactTypes: ['cardio'] as const,
                    equipment: [],
                },
                {
                    name: 'Функциональный тренинг',
                    description: 'Комплексная тренировка для развития функциональной силы',
                    difficulty: 'intermediate' as const,
                    impactTypes: ['strength', 'cardio', 'balance'] as const,
                    equipment: ['TRX', 'гири', 'медбол'],
                },
            ];

            for (const data of typeData) {
                const type = trainingTypeRepo.create({
                    ...data,
                    impactTypes: [...data.impactTypes],
                    isActive: true,
                });
                const saved = await trainingTypeRepo.save(type);
                trainingTypes.push(saved);
            }
            console.log(`${trainingTypes.length} TrainingTypes seeded`);
        } else {
            trainingTypes.push(...existingTypes);
        }

        // 5. Seed ScheduleEntries (10-15 sample classes)
        const scheduleRepo = queryRunner.manager.getRepository(ScheduleEntry);
        const existingEntries = await scheduleRepo.find();
        if (existingEntries.length === 0 && coaches.length > 0 && trainingTypes.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const scheduleData: Array<{
                trainingTypeId: string;
                coachId: string;
                startTime: Date;
                durationMinutes: number;
                status: 'scheduled';
            }> = [];
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const date = new Date(today);
                date.setDate(date.getDate() + dayOffset);

                const trainingType1 = trainingTypes[dayOffset % trainingTypes.length];
                const coach1 = coaches[dayOffset % coaches.length];
                const trainingType2 = trainingTypes[(dayOffset + 1) % trainingTypes.length];
                const coach2 = coaches[(dayOffset + 1) % coaches.length];
                const trainingType3 = trainingTypes[(dayOffset + 2) % trainingTypes.length];
                const coach3 = coaches[(dayOffset + 2) % coaches.length];

                if (!trainingType1 || !coach1 || !trainingType2 || !coach2) continue;

                // Morning class
                const morning = new Date(date);
                morning.setHours(9, 0, 0, 0);
                scheduleData.push({
                    trainingTypeId: trainingType1.id,
                    coachId: coach1.id,
                    startTime: morning,
                    durationMinutes: 60,
                    status: 'scheduled',
                });

                // Afternoon class
                const afternoon = new Date(date);
                afternoon.setHours(14, 0, 0, 0);
                scheduleData.push({
                    trainingTypeId: trainingType2.id,
                    coachId: coach2.id,
                    startTime: afternoon,
                    durationMinutes: 45,
                    status: 'scheduled',
                });

                // Evening class (not on weekends)
                if (dayOffset < 5 && trainingType3 && coach3) {
                    const evening = new Date(date);
                    evening.setHours(19, 0, 0, 0);
                    scheduleData.push({
                        trainingTypeId: trainingType3.id,
                        coachId: coach3.id,
                        startTime: evening,
                        durationMinutes: 60,
                        status: 'scheduled',
                    });
                }
            }

            for (const data of scheduleData) {
                const entry = scheduleRepo.create(data);
                await scheduleRepo.save(entry);
            }
            console.log(`${scheduleData.length} ScheduleEntries seeded`);
        }

        await queryRunner.commitTransaction();
        console.log('Seed completed successfully!');
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Seed failed:', error);
        throw error;
    } finally {
        await queryRunner.release();
        await AppDataSource.destroy();
    }
}

seed().catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
});
