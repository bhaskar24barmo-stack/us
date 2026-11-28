import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '@/copy';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Sheet,
  Skeleton,
  applyThemeToDocument,
  resolveThemeMode,
} from '@/design-system';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function mockMatchMedia(prefersLight: boolean, prefersDark = !prefersLight) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches:
        query === '(prefers-color-scheme: light)'
          ? prefersLight
          : query === '(prefers-color-scheme: dark)'
          ? prefersDark
          : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Design System & Theme Parity', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('resolves dark, cream, light, and auto theme modes safely', () => {
    expect(resolveThemeMode('dark')).toBe('dark');
    expect(resolveThemeMode('cream')).toBe('cream');
    expect(resolveThemeMode('light')).toBe('cream');
    expect(resolveThemeMode(undefined)).toBe('dark');

    mockMatchMedia(true, false);
    expect(resolveThemeMode('auto')).toBe('cream');

    mockMatchMedia(false, true);
    expect(resolveThemeMode('auto')).toBe('dark');
  });

  it('applies resolved theme and theme-color meta tag to document', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#0b0614');
    document.head.appendChild(meta);

    mockMatchMedia(true, false);
    const resolvedCream = applyThemeToDocument('auto');
    expect(resolvedCream).toBe('cream');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cream');
    expect(meta.getAttribute('content')).toBe('#faf6f0');

    const resolvedDark = applyThemeToDocument('dark');
    expect(resolvedDark).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(meta.getAttribute('content')).toBe('#0b0614');
  });

  it('renders Button, Card, EmptyState, Skeleton, Sheet, and Input in jsdom', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root.render(
        <div>
          <Card variant="glass">
            <Input label="Pin" placeholder="Choose 6-digit PIN" error="Required" />
            <Button variant="secondary" haptic={false} onClick={onAction}>
              Save
            </Button>
            <Button variant="danger" loading haptic={false}>
              Delete
            </Button>
          </Card>
          <EmptyState
            title="Nothing here"
            description="Start adding moments"
            actionLabel="Add"
            onAction={onAction}
          />
          <Skeleton className="h-6 w-24" />
          <Sheet open onClose={onClose} title="Options">
            <p>Sheet content</p>
          </Sheet>
        </div>
      );
    });

    expect(container.textContent).toContain('Pin');
    expect(container.textContent).toContain('Required');
    expect(container.textContent).toContain('Please wait...');
    expect(container.textContent).toContain('Nothing here');
    expect(container.textContent).toContain('Options');
    expect(container.textContent).toContain('Sheet content');

    const addButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === 'Add'
    );
    expect(addButton).toBeDefined();
    act(() => {
      addButton?.click();
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('exposes accurate 6-digit PIN and outbox microcopy in COPY', () => {
    expect(COPY.more.securityDesc).toContain('6-digit PIN');
    expect(COPY.more.securityDesc).not.toContain('4-digit');
    expect(COPY.outbox.queued).toBe('Queued offline');
    expect(COPY.outbox.sending).toBe('Sending...');
    expect(COPY.outbox.sent).toBe('Sent');
    expect(COPY.outbox.failed.toLowerCase()).toBe('failed, tap to retry');
  });
});
