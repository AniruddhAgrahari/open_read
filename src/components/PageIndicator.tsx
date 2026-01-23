import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageIndicatorProps {
    currentPage: number;
    totalPages: number;
    onPageJump: (page: number) => void;
}

export const PageIndicator: React.FC<PageIndicatorProps> = ({ currentPage, totalPages, onPageJump }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(currentPage.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInputValue(currentPage.toString());
    }, [currentPage]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const pageNum = parseInt(inputValue, 10);
        if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
            onPageJump(pageNum);
        } else {
            setInputValue(currentPage.toString());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') {
            setInputValue(currentPage.toString());
            setIsEditing(false);
        }
    };

    return (
        <motion.div
            className="page-indicator-pill"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className="page-indicator-current-container">
                <AnimatePresence mode="wait">
                    {isEditing ? (
                        <motion.form
                            key="input"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onSubmit={handleSubmit}
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                className="page-indicator-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onBlur={() => handleSubmit()}
                                onKeyDown={handleKeyDown}
                            />
                        </motion.form>
                    ) : (
                        <motion.div
                            key="number"
                            className="page-indicator-current-circle"
                            onClick={() => setIsEditing(true)}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {currentPage}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="page-indicator-total">
                {totalPages}
            </div>
        </motion.div>
    );
};
