import { useRouter } from '@tanstack/react-router';
import { Bookmark, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { setWatchStatus, type WatchStatusValue } from '@/server/watch';

type WatchButtonsProps = {
    movieId: string;
    current: WatchStatusValue | null;
};

export function WatchButtons({ movieId, current }: WatchButtonsProps) {
    const router = useRouter();

    const toggle = async (status: WatchStatusValue) => {
        const next = current === status ? null : status;
        const result = await setWatchStatus({ data: { movieId, status: next } });
        if (result.ok) {
            await router.invalidate();
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            <Button
                variant={current === 'WATCHLIST' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggle('WATCHLIST')}
            >
                <Bookmark className={current === 'WATCHLIST' ? 'fill-current' : undefined}/>
                {current === 'WATCHLIST' ? 'В списке к просмотру' : 'Буду смотреть'}
            </Button>
            <Button
                variant={current === 'WATCHED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggle('WATCHED')}
            >
                <Check/>
                {current === 'WATCHED' ? 'Просмотрено' : 'Уже смотрел(а)'}
            </Button>
        </div>
    );
}
