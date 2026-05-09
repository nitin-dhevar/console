import { createContext } from 'react';
import type { ToastContextValues } from '@console/dynamic-plugin-sdk/src/extensions/console-types';

export default createContext<ToastContextValues>({} as any);
