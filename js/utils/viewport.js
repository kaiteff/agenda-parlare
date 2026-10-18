/**
 * viewport.js
 * Detección de layout compacto (móvil + celular en landscape).
 *
 * Decisión: en teléfono girado **gana la UX móvil**
 * (bottom nav Agenda|Pacientes|Más, header compacto, sidebar angosto).
 *
 * Criterio landscape: el lado corto del viewport ≤ 600px (típicamente ~390–480
 * en Pixel/iPhone). No depende de touch ni de umbrales de altura frágiles.
 */

const MOBILE_WIDTH_MQ = '(max-width: 767px)';
/** Lado corto máximo para considerar «teléfono» (landscape o no). */
const PHONE_SHORT_SIDE_MAX = 600;

export function isPhoneLandscape() {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w <= h) return false;
    return Math.min(w, h) <= PHONE_SHORT_SIDE_MAX;
}

/** Portrait móvil O landscape de teléfono. */
export function isMobileLayout() {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia(MOBILE_WIDTH_MQ).matches) return true;
    if (isPhoneLandscape()) return true;
    // Respaldo: landscape con altura baja aunque el corto esté justo sobre 600
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w > h && h <= 700 && w <= 1200;
}

function _syncBottomNavVisibility(on) {
    const nav = document.getElementById('mainBottomNav');
    const overlay = document.getElementById('mobileMoreOverlay');
    const sheet = document.getElementById('mobileMoreSheet');

    [nav, overlay, sheet].forEach((el) => {
        if (!el) return;
        if (on) el.classList.remove('md:hidden');
        else if (!el.classList.contains('md:hidden')) el.classList.add('md:hidden');
    });
}

export function syncPhoneLandscapeClass() {
    const on = isPhoneLandscape() || (
        typeof window !== 'undefined' &&
        window.innerWidth > window.innerHeight &&
        window.innerHeight <= 700 &&
        window.innerWidth <= 1200
    );
    document.documentElement.classList.toggle('phone-landscape', on);
    _syncBottomNavVisibility(on);
    return on;
}

/**
 * @param {(compact: boolean) => void} [onChange]
 */
export function initPhoneLandscapeWatch(onChange) {
    if (typeof window === 'undefined') return () => {};

    const notify = () => {
        syncPhoneLandscapeClass();
        onChange?.(isMobileLayout());
    };

    notify();

    let resizeTimer = null;
    const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(notify, 100);
    };

    window.addEventListener('orientationchange', notify);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);

    return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener('orientationchange', notify);
        window.removeEventListener('resize', onResize);
        window.visualViewport?.removeEventListener('resize', onResize);
    };
}
