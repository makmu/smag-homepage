import { Component, input, output, signal, inject, PLATFORM_ID, Inject, ChangeDetectionStrategy, ViewChild, ElementRef, OnDestroy, AfterViewInit, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface Turnstile {
    render(container: HTMLElement | string, options: TurnstileOptions): string;
}

interface TurnstileOptions {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
}

@Component({
    selector: 'app-turnstile',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div #turnstileContainer class="cf-turnstile"></div>
    `,
    standalone: true
})
export class TurnstileComponent implements AfterViewInit, OnDestroy {
    private readonly platformId = inject(PLATFORM_ID);
    private turnstileWidgetId: string | null = null;

    siteKey = input.required<string>();
    tokenChange = output<string>();

    isReady = signal(false);

    @ViewChild('turnstileContainer') turnstileContainer?: ElementRef<HTMLDivElement>;

    private loaded = signal(false);

    constructor() {
        effect(() => {
            const key = this.siteKey();
            if (key && this.loaded() && isPlatformBrowser(this.platformId)) {
                this.render();
            }
        });
    }

    ngAfterViewInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.loadScript();
        }
    }

    ngOnDestroy(): void {
        this.removeWidget();
    }

    private loadScript(): void {
        const win = window as unknown as { turnstile?: Turnstile };
        if (win.turnstile) {
            this.loaded.set(true);
            this.render();
            return;
        }

        if (document.getElementById('turnstile-script')) {
            setTimeout(() => this.render(), 100);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.id = 'turnstile-script';
        script.onload = () => {
            this.loaded.set(true);
            this.render();
        };
        document.head.appendChild(script);
    }

    private render(): void {
        if (this.turnstileWidgetId) {
            return;
        }

        const win = window as unknown as { turnstile?: Turnstile };
        const turnstile = win.turnstile;

        if (!turnstile || !this.turnstileContainer?.nativeElement) {
            setTimeout(() => this.render(), 100);
            return;
        }

        this.turnstileWidgetId = turnstile.render(this.turnstileContainer.nativeElement, {
            sitekey: this.siteKey(),
            callback: (token: string) => {
                this.tokenChange.emit(token);
            },
            'expired-callback': () => {
                this.tokenChange.emit('');
            },
            'error-callback': () => {
                this.tokenChange.emit('');
            }
        });

        this.isReady.set(true);
    }

    private removeWidget(): void {
        if (this.turnstileWidgetId) {
            const win = window as unknown as { turnstile?: { remove?: (id: string) => void } };
            if (win.turnstile?.remove) {
                win.turnstile.remove(this.turnstileWidgetId);
            }
            this.turnstileWidgetId = null;
        }
    }

    reset(): void {
        this.removeWidget();
        if (isPlatformBrowser(this.platformId) && this.loaded()) {
            setTimeout(() => this.render(), 100);
        }
    }
}