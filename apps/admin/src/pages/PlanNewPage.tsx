import { PlanForm } from '@/features/plans/PlanForm';
import { adminPlansApi } from '@/shared/api';
import { useNavigate } from 'react-router-dom';

export function PlanNewPage() {
    const navigate = useNavigate();

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Новый план</h2>
            <PlanForm
                submitLabel="Создать"
                onSubmit={async (payload) => {
                    await adminPlansApi.create(payload);
                    navigate('/plans', { replace: true });
                }}
                onCancel={() => navigate('/plans')}
            />
        </div>
    );
}

export default PlanNewPage;
