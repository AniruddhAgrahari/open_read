import { useHotkeys } from 'react-hotkeys-hook';
import { useTabStore } from '../store/useTabStore';
import { useChatStore } from '../store/useChatStore';

export const useKeyboardShortcuts = (
    onOpenHelp: () => void,
    onNextPage?: () => void,
    onPrevPage?: () => void,
    onToggleFocus?: () => void
) => {
    const {
        viewMode,
        setViewMode,
        toggleEditMode,
        toggleFocusMode,
        isFocusMode,
        activeTabId,
        undo,
        redo
    } = useTabStore();

    const { toggleChat } = useChatStore();

    const options = {
        enableOnFormTags: true, // Allow Alt shortcuts even in inputs
        preventDefault: true,
    };

    // Alt + F → Toggle Focus Mode
    useHotkeys('alt+f', () => {
        if (onToggleFocus) {
            onToggleFocus();
        } else {
            toggleFocusMode();
        }
    }, options);

    // Alt + D → Switch Theme to Dark Mode
    useHotkeys('alt+d', () => {
        setViewMode('dark');
    }, options);

    // Alt + L → Switch Theme to Light Mode
    useHotkeys('alt+l', () => {
        setViewMode('normal');
    }, options);

    // Alt + N → Toggle Eye/Reader Mode
    useHotkeys('alt+n', () => {
        if (viewMode === 'eye-comfort') {
            setViewMode('dark');
        } else {
            setViewMode('eye-comfort');
        }
    }, options);

    // Alt + E → Toggle Editor Toolbar
    useHotkeys('alt+e', () => {
        toggleEditMode();
    }, options);

    // Alt + A → Toggle AI Sidebar
    useHotkeys('alt+a', () => {
        toggleChat();
    }, options);


    // Undo/Redo - These should probably NOT be enabled in form tags by default or should be careful
    useHotkeys(['meta+z', 'ctrl+z'], () => {
        if (activeTabId) undo(activeTabId);
    });

    useHotkeys(['meta+shift+z', 'ctrl+shift+z', 'ctrl+y'], () => {
        if (activeTabId) redo(activeTabId);
    });

    // Page Navigation - Arrow Keys
    useHotkeys('arrowright', () => {
        onNextPage?.();
    });

    useHotkeys('arrowleft', () => {
        onPrevPage?.();
    });

    // Help shortcut (Optional but good)
    useHotkeys(['shift+/', '?'], () => {
        onOpenHelp();
    }, { preventDefault: true });

    // Escape → Exit Focus Mode
    useHotkeys('escape', () => {
        if (isFocusMode) {
            onToggleFocus?.();
        }
    }, { enabled: true });
};
