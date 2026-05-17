import { CoachForm } from '@/features/coaches/CoachForm';
import { adminCoachesApi, ApiError } from '@/shared/api';
import { useNavigate } from 'react-router-dom';

export function CoachNewPage() {
    const navigate = useNavigate();

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Новый тренер</h2>
            <CoachForm
                submitLabel="Создать"
                onSubmit={async (values) => {
                    try {
                        const created = await adminCoachesApi.create({
                            name: values.name,
                            bio: values.bio || undefined,
                            specializations: values.specializations,
                            certifications: values.certifications,
                            isActive: values.isActive,
                        });
                        navigate(`/coaches/${created.id}`, { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось создать тренера');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/coaches')}
            />
        </div>
    );
}

export default CoachNewPage;
