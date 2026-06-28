import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowDownAZ, ArrowUp, CalendarDays, Clock3, Search, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { MovieSort, MovieSortDir } from '@/lib/movie-data';

type MovieCatalogControlsProps = {
    q?: string;
    sort?: MovieSort;
    dir?: MovieSortDir;
    onQueryChange: (query: string | undefined) => void;
    onSortChange: (sort: MovieSort | undefined) => void;
    onDirChange: (dir: MovieSortDir | undefined) => void;
};

const SORT_LABELS: Record<MovieSort, string> = {
    rating: 'Рейтинг',
    year: 'Год',
    title: 'Название',
    new: 'Новые',
};

const SORT_ICONS: Record<MovieSort, ReactNode> = {
    new: <Clock3/>,
    rating: <Star/>,
    year: <CalendarDays/>,
    title: <ArrowDownAZ/>,
};

export function MovieCatalogControls({ q, sort, dir, onQueryChange, onSortChange, onDirChange }: MovieCatalogControlsProps) {
    const [ query, setQuery ] = useState(q ?? '');
    const currentSort: MovieSort = sort ?? 'new';
    const currentDir: MovieSortDir = dir ?? 'desc';

    useEffect(() => {
        setQuery(q ?? '');
    }, [ q ]);

    useEffect(() => {
        const handle = setTimeout(() => {
            const trimmed = query.trim();
            if (trimmed === (q ?? '')) return;
            onQueryChange(trimmed || undefined);
        }, 300);
        return () => clearTimeout(handle);
    }, [ query, q, onQueryChange ]);

    const setSort = (nextSort: MovieSort) => {
        onSortChange(nextSort === 'new' ? undefined : nextSort);
    };

    const setDir = (nextDir: MovieSortDir) => {
        onDirChange(nextDir === 'desc' ? undefined : nextDir);
    };

    return (
        <>
            <div className="relative min-w-0 flex-1 sm:max-w-52">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск…"
                    className="w-full pl-8"
                    aria-label="Поиск"
                />
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="justify-start px-3 sm:min-w-32"
                        aria-label={`Сортировка: ${SORT_LABELS[currentSort]}, ${currentDir === 'asc' ? 'по возрастанию' : 'по убыванию'}`}
                        title="Сортировка"
                    >
                        {SORT_ICONS[currentSort]}
                        <span className="hidden min-w-0 truncate sm:inline">{SORT_LABELS[currentSort]}</span>
                        {currentDir === 'asc' ? <ArrowUp className="sm:ml-auto"/> : <ArrowDown className="sm:ml-auto"/>}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                    <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Сортировать по
                    </div>
                    <DropdownMenuRadioGroup value={currentSort} onValueChange={(value) => setSort(value as MovieSort)}>
                        <DropdownMenuRadioItem value="rating">Рейтинг</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="year">Год</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="title">Название</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="new">Новые</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator/>
                    <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Порядок
                    </div>
                    <DropdownMenuRadioGroup value={currentDir} onValueChange={(value) => setDir(value as MovieSortDir)}>
                        <DropdownMenuRadioItem value="asc">По возрастанию</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="desc">По убыванию</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
