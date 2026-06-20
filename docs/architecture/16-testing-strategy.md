# 16. Testing Strategy

## 16.1 Testing Pyramid

| Level           | Tools                             | Coverage Target |
| --------------- | --------------------------------- | --------------- |
| **Unit**        | Jest (backend), Vitest (frontend) | 80%             |
| **Integration** | Jest + Supertest                  | Key flows       |
| **E2E**         | Playwright                        | Critical paths  |

## 16.2 Backend Testing

```typescript
// Example: schedule.service.spec.ts
describe('ScheduleService', () => {
    let service: ScheduleService;
    let repo: MockRepository<ScheduleEntry>;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [ScheduleService, { provide: getRepositoryToken(ScheduleEntry), useClass: MockRepository }],
        }).compile();

        service = module.get(ScheduleService);
        repo = module.get(getRepositoryToken(ScheduleEntry));
    });

    it('should return today classes sorted by time', async () => {
        const mockClasses = [
            /* ... */
        ];
        repo.find.mockResolvedValue(mockClasses);

        const result = await service.getToday();

        expect(result).toHaveLength(mockClasses.length);
        expect(repo.find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.any(Object),
                order: { startTime: 'ASC' },
            }),
        );
    });
});
```

## 16.3 Frontend Testing

```typescript
// Example: ClassCard.test.tsx
describe('ClassCard', () => {
    it('renders class information correctly', () => {
        const mockClass = {
            id: '1',
            trainingType: { name: 'Yoga', difficulty: 'beginner' },
            coach: { name: 'Maria K.' },
            startTime: new Date('2026-01-09T09:00:00'),
            durationMinutes: 60,
        };

        render(<ClassCard class={mockClass} />);

        expect(screen.getByText('Yoga')).toBeInTheDocument();
        expect(screen.getByText('Maria K.')).toBeInTheDocument();
        expect(screen.getByText('09:00')).toBeInTheDocument();
        expect(screen.getByText('Beginner')).toBeInTheDocument();
    });
});
```

---
