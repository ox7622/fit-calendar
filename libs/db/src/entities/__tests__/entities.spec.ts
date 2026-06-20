import { Customer, Coach, TrainingType, ScheduleEntry, Reminder, ClubInfo, AdminUser, MembershipPlan } from '../index';

describe('Customer Entity', () => {
    it('should create a customer instance', () => {
        const customer = new Customer();
        expect(customer).toBeInstanceOf(Customer);
    });

    it('should allow setting reminderMinutes', () => {
        const customer = new Customer();
        customer.reminderMinutes = 30;
        expect(customer.reminderMinutes).toBe(30);

        customer.reminderMinutes = 60;
        expect(customer.reminderMinutes).toBe(60);
    });

    it('should allow setting all properties including admin-managed fields', () => {
        const customer = new Customer();
        customer.id = '123e4567-e89b-12d3-a456-426614174000';
        customer.firstName = 'John';
        customer.lastName = 'Doe';
        customer.phone = '+74951234567';
        customer.email = 'john@example.com';
        customer.telegramId = 123456789;
        customer.telegramUsername = 'johndoe';
        customer.isActive = true;
        customer.notes = 'VIP member';
        customer.reminderMinutes = 60;

        expect(customer.firstName).toBe('John');
        expect(customer.lastName).toBe('Doe');
        expect(customer.phone).toBe('+74951234567');
        expect(customer.email).toBe('john@example.com');
        expect(customer.telegramId).toBe(123456789);
        expect(customer.telegramUsername).toBe('johndoe');
        expect(customer.isActive).toBe(true);
        expect(customer.notes).toBe('VIP member');
        expect(customer.reminderMinutes).toBe(60);
    });

    it('should allow telegramId to be null (unlinked customer)', () => {
        const customer = new Customer();
        customer.telegramId = null;
        customer.telegramUsername = null;
        expect(customer.telegramId).toBeNull();
        expect(customer.telegramUsername).toBeNull();
    });
});

describe('Coach Entity', () => {
    it('should create a coach instance', () => {
        const coach = new Coach();
        expect(coach).toBeInstanceOf(Coach);
    });

    it('should allow setting all properties', () => {
        const coach = new Coach();
        coach.name = 'Jane Smith';
        coach.bio = 'Certified yoga instructor';
        coach.photoUrl = 'https://example.com/photo.jpg';
        coach.specializations = ['yoga', 'pilates'];
        coach.certifications = ['RYT-200'];
        coach.isActive = true;

        expect(coach.name).toBe('Jane Smith');
        expect(coach.bio).toBe('Certified yoga instructor');
        expect(coach.specializations).toEqual(['yoga', 'pilates']);
        expect(coach.certifications).toEqual(['RYT-200']);
        expect(coach.isActive).toBe(true);
    });
});

describe('TrainingType Entity', () => {
    it('should create a training type instance', () => {
        const trainingType = new TrainingType();
        expect(trainingType).toBeInstanceOf(TrainingType);
    });

    it('should allow setting difficulty levels', () => {
        const trainingType = new TrainingType();
        trainingType.difficulty = 'beginner';
        expect(trainingType.difficulty).toBe('beginner');

        trainingType.difficulty = 'intermediate';
        expect(trainingType.difficulty).toBe('intermediate');

        trainingType.difficulty = 'advanced';
        expect(trainingType.difficulty).toBe('advanced');
    });

    it('should allow setting impact types', () => {
        const trainingType = new TrainingType();
        trainingType.impactTypes = ['cardio', 'strength'];
        expect(trainingType.impactTypes).toEqual(['cardio', 'strength']);
    });

    it('should allow setting equipment list', () => {
        const trainingType = new TrainingType();
        trainingType.equipment = ['dumbbells', 'mat'];
        expect(trainingType.equipment).toEqual(['dumbbells', 'mat']);
    });
});

describe('ScheduleEntry Entity', () => {
    it('should create a schedule entry instance', () => {
        const entry = new ScheduleEntry();
        expect(entry).toBeInstanceOf(ScheduleEntry);
    });

    it('should allow setting status', () => {
        const entry = new ScheduleEntry();
        entry.status = 'scheduled';
        expect(entry.status).toBe('scheduled');

        entry.status = 'cancelled';
        expect(entry.status).toBe('cancelled');
    });

    it('should allow setting time properties', () => {
        const entry = new ScheduleEntry();
        const startTime = new Date('2026-01-15T10:00:00Z');
        entry.startTime = startTime;
        entry.durationMinutes = 60;

        expect(entry.startTime).toEqual(startTime);
        expect(entry.durationMinutes).toBe(60);
    });

    it('should allow setting cancellation reason', () => {
        const entry = new ScheduleEntry();
        entry.status = 'cancelled';
        entry.cancellationReason = 'Coach unavailable';

        expect(entry.cancellationReason).toBe('Coach unavailable');
    });
});

describe('Reminder Entity', () => {
    it('should create a reminder instance', () => {
        const reminder = new Reminder();
        expect(reminder).toBeInstanceOf(Reminder);
    });

    it('should allow setting status', () => {
        const reminder = new Reminder();
        reminder.status = 'pending';
        expect(reminder.status).toBe('pending');

        reminder.status = 'sent';
        expect(reminder.status).toBe('sent');

        reminder.status = 'failed';
        expect(reminder.status).toBe('failed');
    });

    it('should allow setting notification time', () => {
        const reminder = new Reminder();
        const notifyAt = new Date('2026-01-15T09:30:00Z');
        reminder.notifyAt = notifyAt;

        expect(reminder.notifyAt).toEqual(notifyAt);
    });

    it('should track retryCount for delivery attempts (Story 5.3)', () => {
        const reminder = new Reminder();
        reminder.retryCount = 0;
        expect(reminder.retryCount).toBe(0);

        reminder.retryCount = 2;
        expect(reminder.retryCount).toBe(2);
    });
});

describe('ClubInfo Entity', () => {
    it('should create a club info instance', () => {
        const clubInfo = new ClubInfo();
        expect(clubInfo).toBeInstanceOf(ClubInfo);
    });

    it('should allow setting all properties', () => {
        const clubInfo = new ClubInfo();
        clubInfo.name = 'FitCalendar Gym';
        clubInfo.address = '123 Main St';
        clubInfo.phone = '+1234567890';
        clubInfo.workingHours = {
            monday: { open: '09:00', close: '21:00' },
            tuesday: { open: '09:00', close: '21:00' },
        };
        clubInfo.latitude = 55.7558;
        clubInfo.longitude = 37.6173;
        clubInfo.logoUrl = 'https://example.com/logo.png';

        expect(clubInfo.name).toBe('FitCalendar Gym');
        expect(clubInfo.address).toBe('123 Main St');
        expect(clubInfo.phone).toBe('+1234567890');
        expect(clubInfo.workingHours.monday).toEqual({ open: '09:00', close: '21:00' });
        expect(clubInfo.latitude).toBe(55.7558);
        expect(clubInfo.longitude).toBe(37.6173);
    });
});

describe('AdminUser Entity', () => {
    it('should create an admin user instance', () => {
        const admin = new AdminUser();
        expect(admin).toBeInstanceOf(AdminUser);
    });

    it('should allow setting all properties', () => {
        const admin = new AdminUser();
        admin.login = 'admin';
        admin.passwordHash = '$2b$10$hashedpassword';
        admin.name = 'Admin User';
        admin.isActive = true;

        expect(admin.login).toBe('admin');
        expect(admin.passwordHash).toBe('$2b$10$hashedpassword');
        expect(admin.name).toBe('Admin User');
        expect(admin.isActive).toBe(true);
    });

    it('should have lastLoginAt as nullable', () => {
        const admin = new AdminUser();
        expect(admin.lastLoginAt).toBeUndefined();

        admin.lastLoginAt = new Date('2026-01-15T10:00:00Z');
        expect(admin.lastLoginAt).toBeInstanceOf(Date);
    });
});

describe('MembershipPlan Entity', () => {
    it('should create a membership plan instance', () => {
        const plan = new MembershipPlan();
        expect(plan).toBeInstanceOf(MembershipPlan);
    });

    it('should allow setting all properties', () => {
        const plan = new MembershipPlan();
        plan.name = '12-месячный';
        plan.durationValue = 12;
        plan.durationUnit = 'month';
        plan.priceRub = 30000;
        plan.features = ['2 гостевых визита', '1 месяц заморозки'];
        plan.guestVisitsAllowed = 2;
        plan.freezeDaysAllowed = 30;
        plan.isActive = true;

        expect(plan.name).toBe('12-месячный');
        expect(plan.durationValue).toBe(12);
        expect(plan.durationUnit).toBe('month');
        expect(plan.priceRub).toBe(30000);
        expect(plan.features).toEqual(['2 гостевых визита', '1 месяц заморозки']);
        expect(plan.guestVisitsAllowed).toBe(2);
        expect(plan.freezeDaysAllowed).toBe(30);
        expect(plan.isActive).toBe(true);
    });

    it('should accept all valid duration units', () => {
        const plan = new MembershipPlan();
        plan.durationUnit = 'day';
        expect(plan.durationUnit).toBe('day');

        plan.durationUnit = 'week';
        expect(plan.durationUnit).toBe('week');

        plan.durationUnit = 'month';
        expect(plan.durationUnit).toBe('month');
    });
});
