import { useState } from 'react';
import { Film } from 'lucide-react';

import { cn } from '@/lib/utils';

type MoviePosterProps = {
    posterUrl: string | null;
    title: string;
    className?: string;
};

export function MoviePoster({ posterUrl, title, className }: MoviePosterProps) {
    const [ failed, setFailed ] = useState(false);

    if (!posterUrl || failed) {
        return (
            <div
                className={cn(
                    'flex aspect-2/3 w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary via-muted to-background p-4',
                    className,
                )}
            >
                <Film className="size-10 text-muted-foreground/60"/>
                <span className="text-center text-sm font-medium text-muted-foreground">
                    {title}
                </span>
            </div>
        );
    }

    return (
        <img
            src={posterUrl}
            alt={`Постер: ${title}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn('aspect-2/3 w-full object-cover', className)}
        />
    );
}
