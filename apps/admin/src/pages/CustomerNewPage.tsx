import { CustomerForm } from '@/features/customers/CustomerForm';
import { adminCustomersApi, ApiError } from '@/shared/api';
import { useNavigate } from 'react-router-dom';

export function CustomerNewPage() {
    const navigate = useNavigate();

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Новый клиент</h2>
            <CustomerForm
                submitLabel="Создать"
                onSubmit={async (payload) => {
                    try {
                        await adminCustomersApi.create(payload);
                        navigate('/customers', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { code?: string; message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось создать клиента');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/customers')}
            />
        </div>
    );
}

export default CustomerNewPage;
