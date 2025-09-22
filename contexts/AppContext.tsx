import * as React from 'react';
import { App } from 'obsidian';

export const AppContext = React.createContext<App | undefined>(undefined);

export const useApp = (): App | undefined => {
    return React.useContext(AppContext);
};
