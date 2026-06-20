import { TrainingTypeForm } from '@/features/training-types/TrainingTypeForm';
import { adminTrainingTypesApi, ApiError } from '@/shared/api';
import { useNavigate } from 'react-router-dom';

export function TrainingTypeNewPage() {
    const navigate = useNavigate();

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Новый тип занятия</h2>
            <TrainingTypeForm
                submitLabel="Создать"
                onSubmit={async (values) => {
                    try {
                        await adminTrainingTypesApi.create({
                            name: values.name,
                            description: values.description || undefined,
                            difficulty: values.difficulty,
                            impactTypes: values.impactTypes,
                            equipment: values.equipment,
                            isActive: values.isActive,
                        });
                        navigate('/training-types', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось создать тип');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/training-types')}
            />
        </div>
    );
}

export default TrainingTypeNewPage;
