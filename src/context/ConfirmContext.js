import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTheme } from './ThemeContext';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
    return useContext(ConfirmContext);
};

export const ConfirmProvider = ({ children }) => {
    const { theme } = useTheme();
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        message: '',
        resolve: null,
    });

    const confirm = useCallback((message) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                message,
                resolve,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmState.resolve) {
            confirmState.resolve(true);
        }
        setConfirmState({ isOpen: false, message: '', resolve: null });
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        if (confirmState.resolve) {
            confirmState.resolve(false);
        }
        setConfirmState({ isOpen: false, message: '', resolve: null });
    }, [confirmState]);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            {confirmState.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div 
                        className={`relative w-full max-w-md p-6 rounded-xl shadow-2xl border ${theme.background} ${theme.border} transform transition-all scale-100 opacity-100`}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
                                </div>
                                <h3 className={`text-lg font-semibold ${theme.text}`}>
                                    Confirm Deletion
                                </h3>
                            </div>
                            <button
                                onClick={handleCancel}
                                className={`text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="mt-2 mb-6">
                            <p className={`text-sm ${theme.profileText}`}>
                                {confirmState.message}
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleCancel}
                                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${theme.border} ${theme.text} hover:bg-gray-100 dark:hover:bg-gray-800`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
