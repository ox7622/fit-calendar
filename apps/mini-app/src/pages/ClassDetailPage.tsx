import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * ClassDetailPage - Placeholder page for class detail view
 * Full implementation will be added in a future sprint
 */
export function ClassDetailPage(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Назад"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="heading-2">Детали занятия</h1>
            </div>

            {/* Placeholder content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 text-center">
                <p className="text-body-secondary mb-2">ID занятия: {id}</p>
                <p className="text-caption">Подробная информация будет добавлена в следующем спринте</p>
            </div>
        </div>
    );
}
